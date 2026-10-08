import {
  codexAccount,
  pollCodex,
  requestCodexCode,
  type CodexTokens,
  type DeviceCode,
  type PollOutcome
} from '../../infra/providers/accounts/codex'
import { pollCopilot, requestCopilotCode } from '../../infra/providers/accounts/copilot'
import { ProviderError } from '../../infra/providers/types'
import { insertConnection, type OAuthProvider } from '../../infra/storage/connections'
import { StorageError } from '../../infra/storage/errors'
import { findAccountConnection, writeToken } from '../../infra/storage/oauthTokens'
import type { SecretStore } from '../../infra/storage/secretStore'
import type { Db } from '../../infra/storage/sqlite'
import type { LoginStart, LoginStatus } from '../../../shared/contracts/aiAccounts'
import { ACCOUNT_NAMES, type AccountCredentials, type AccountSecret } from './accountCredentials'
import { redactSecrets } from '../../infra/providers/redact'

/**
 * Logging in to an account with a device code, run in the main process (change `subscription-providers`,
 * design D8). The renderer starts a login, then reads its status every two seconds; the polling of the
 * provider, the tokens and the storing of them all stay here.
 *
 * Cancel and store are tied together: a login cancelled while its tokens are being sealed stores nothing,
 * because the check happens again inside the transaction that writes them.
 */

/** Hosts a login may open in the browser. Nothing else, whatever a provider answers. */
export const LOGIN_HOSTS = ['auth.openai.com', 'github.com']

export function isLoginUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && LOGIN_HOSTS.includes(parsed.host)
  } catch {
    return false
  }
}

/** Network errors in a row that are retried without a word before the login is said to have failed. */
export const QUIET_RETRIES = 6

const ACCOUNT_BASES: Record<OAuthProvider, { baseUrl: string; providerId: string | null }> = {
  codex: { baseUrl: 'https://chatgpt.com/backend-api/codex', providerId: 'openai' },
  copilot: { baseUrl: 'https://api.githubcopilot.com', providerId: null }
}

interface Session {
  id: string
  provider: OAuthProvider
  code: DeviceCode
  status: LoginStatus
  cancelled: boolean
  intervalMs: number
}

export interface AccountLoginsOptions {
  db: Db
  secrets: SecretStore
  accounts: AccountCredentials
  fetchImpl: typeof fetch
  now: () => number
  newId: () => string
  /** Opens the verification page; main passes Electron's `shell.openExternal`. */
  openExternal?: (url: string) => Promise<void>
  sleep?: (ms: number) => Promise<void>
  /** After tokens are stored: the account's models are listed and added as entries. */
  onConnected?: (connectionId: string) => Promise<void>
}

/** The message of an error, with whatever token it might carry taken out. */
function scrub(error: unknown, secrets: string[]): string {
  return redactSecrets(error instanceof Error ? error.message : String(error), secrets)
}

export class AccountLogins {
  private readonly sessions = new Map<string, Session>()

  constructor(private readonly options: AccountLoginsOptions) {}

  async start(provider: OAuthProvider): Promise<LoginStart> {
    const { fetchImpl, now, newId } = this.options
    this.sweep()
    // One login per provider at a time: a new start replaces an old one still waiting.
    for (const session of this.sessions.values()) {
      if (session.provider === provider && session.status.state === 'pending')
        this.cancel(session.id)
    }
    const code =
      provider === 'codex'
        ? await requestCodexCode(fetchImpl, now())
        : await requestCopilotCode(fetchImpl, now())
    if (!isLoginUrl(code.verificationUrl)) {
      throw new StorageError(
        'validation',
        'Trang xác minh không thuộc nhà cung cấp: ' + code.verificationUrl
      )
    }
    const session: Session = {
      id: newId(),
      provider,
      code,
      status: { state: 'pending' },
      cancelled: false,
      intervalMs: code.intervalMs
    }
    this.sessions.set(session.id, session)
    void this.options.openExternal?.(code.verificationUrl).catch(() => undefined)
    void this.run(session)
    return {
      sessionId: session.id,
      userCode: code.userCode,
      verificationUrl: code.verificationUrl,
      expiresAt: code.expiresAt
    }
  }

  poll(sessionId: string): LoginStatus {
    const session = this.sessions.get(sessionId)
    if (!session) return { state: 'error', message: 'Phiên đăng nhập không còn.' }
    return session.status
  }

  cancel(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    session.cancelled = true
    if (session.status.state === 'pending') session.status = { state: 'cancelled' }
  }

  /** Opens the verification page again (the "Mở lại trang xác minh" link). */
  async reopen(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session && isLoginUrl(session.code.verificationUrl)) {
      await this.options.openExternal?.(session.code.verificationUrl)
    }
  }

  /** Sessions past their code's lifetime are dropped when a new login starts. */
  private sweep(): void {
    const now = this.options.now()
    for (const [id, session] of this.sessions) {
      if (session.status.state !== 'pending' || now >= session.code.expiresAt)
        this.sessions.delete(id)
    }
  }

  private async run(session: Session): Promise<void> {
    const sleep =
      this.options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
    let failures = 0
    while (!session.cancelled) {
      await sleep(session.intervalMs)
      if (session.cancelled) return
      let outcome: PollOutcome<CodexTokens | { githubToken: string }>
      try {
        outcome =
          session.provider === 'codex'
            ? await pollCodex(this.options.fetchImpl, session.code, this.options.now())
            : await pollCopilot(this.options.fetchImpl, session.code, this.options.now())
        failures = 0
      } catch (error) {
        if (
          error instanceof ProviderError &&
          error.kind === 'network' &&
          ++failures < QUIET_RETRIES
        ) {
          continue
        }
        this.finish(session, {
          state: 'error',
          message:
            'Đăng nhập ' +
            ACCOUNT_NAMES[session.provider] +
            ' chưa xong: không nối được tới nhà cung cấp.',
          detail: scrub(error, [])
        })
        return
      }
      if (outcome.status === 'pending') {
        if (outcome.slowDown) session.intervalMs += 5_000
        continue
      }
      if (outcome.status !== 'approved') {
        this.finish(session, {
          state: outcome.status,
          message:
            outcome.status === 'expired'
              ? 'Mã đã hết hạn trước khi bạn xác nhận.'
              : 'Đăng nhập ' + ACCOUNT_NAMES[session.provider] + ' chưa xong: ' + outcome.message
        })
        return
      }
      await this.store(session, outcome.result)
      return
    }
  }

  private finish(session: Session, status: LoginStatus): void {
    if (!session.cancelled) session.status = status
  }

  /** Seals the tokens, then writes them and the connection in one transaction, unless the login was cancelled. */
  private async store(
    session: Session,
    result: CodexTokens | { githubToken: string }
  ): Promise<void> {
    const { db, secrets, accounts, now, newId, fetchImpl } = this.options
    const secret: AccountSecret = result
    const tokens = Object.values(secret).filter(
      (value): value is string => typeof value === 'string'
    )
    try {
      let label: string | null = null
      let expiresAt: number | null = null
      if ('access' in result) {
        const account = codexAccount(result.access)
        label = account.email ?? null
        expiresAt = account.expiresAt
      } else {
        label = await githubLogin(fetchImpl, result.githubToken)
      }
      const sealed = await secrets.seal(JSON.stringify(secret))
      if (session.cancelled) return
      const connectionId = db.transaction(() => {
        if (session.cancelled) return null
        const existing = findAccountConnection(db, session.provider)
        const id =
          existing ??
          insertConnection(
            db,
            newId(),
            {
              name: ACCOUNT_NAMES[session.provider],
              ...ACCOUNT_BASES[session.provider],
              authKind: 'oauth',
              oauthProvider: session.provider
            },
            now()
          ).id
        writeToken(db, {
          connectionId: id,
          cipher: sealed.cipher,
          expiresAt,
          accountLabel: label,
          now: now()
        })
        return id
      })
      if (connectionId === null) return
      accounts.forget(connectionId)
      await this.options.onConnected?.(connectionId).catch(() => undefined)
      this.finish(session, { state: 'approved', connectionId })
    } catch (error) {
      this.finish(session, {
        state: 'error',
        message:
          'Đăng nhập ' + ACCOUNT_NAMES[session.provider] + ' chưa xong: không lưu được token.',
        detail: scrub(error, tokens)
      })
    }
  }
}

/** The GitHub login of a token, for the card; `null` when GitHub does not say. */
async function githubLogin(fetchImpl: typeof fetch, token: string): Promise<string | null> {
  try {
    const response = await fetchImpl('https://api.github.com/user', {
      headers: { authorization: 'token ' + token, accept: 'application/json' }
    })
    if (!response.ok) return null
    const body = (await response.json()) as { login?: unknown }
    return typeof body.login === 'string' ? body.login : null
  } catch {
    return null
  }
}
