import {
  CODEX,
  codexAccount,
  parseCodexUsage,
  refreshCodex,
  ReloginError,
  type CodexTokens,
  type UsageWindow
} from '../../infra/providers/accounts/codex'
import {
  COPILOT,
  exchangeCopilotToken,
  NoCopilotError,
  type CopilotToken
} from '../../infra/providers/accounts/copilot'
import type { KeyExhausted, KeyLease, KeySource } from '../../infra/providers/gateway/keys'
import type { Credential } from '../../infra/providers/transportShared'
import { ProviderError } from '../../infra/providers/types'
import type { OAuthProvider } from '../../infra/storage/connections'
import { StorageError } from '../../infra/storage/errors'
import { readToken, setTokenState, writeToken } from '../../infra/storage/oauthTokens'
import type { SecretStore } from '../../infra/storage/secretStore'
import type { Db } from '../../infra/storage/sqlite'

/**
 * The tokens of account connections, from the sealed store to a credential a call can use (change
 * `subscription-providers`, design D3–D5).
 *
 * Three rules this class exists for:
 *  - a token is used fresh: Codex refreshes 120 s before `exp`, Copilot exchanges its short token again
 *    120 s before it runs out;
 *  - **one refresh at a time per account**: a refresh token is good once, so a second refresh racing the
 *    first would spend it and break the login; later callers wait for the refresh already running;
 *  - a refresh refused for good (`invalid_grant`, `refresh_token_reused`, 401/403) marks the connection
 *    "Cần đăng nhập lại", and every call after it fails at once with that, instead of trying again.
 */

/** What is sealed for an account. Codex keeps its OAuth pair; Copilot keeps the GitHub token. */
export interface AccountSecret {
  access?: string
  refresh?: string
  githubToken?: string
}

export const ACCOUNT_NAMES: Record<OAuthProvider, string> = {
  codex: 'ChatGPT / Codex',
  copilot: 'GitHub Copilot'
}

export interface AccountRef {
  id: string
  oauthProvider: OAuthProvider
}

/** The error a call gets once a login needs to be done again; `account` lets the panel offer the card. */
export function reloginError(provider: OAuthProvider): ProviderError {
  return new ProviderError(
    'auth',
    'Cần đăng nhập lại ' + ACCOUNT_NAMES[provider] + ' ở Cài đặt › Kết nối AI › Tài khoản.',
    { account: provider }
  )
}

export interface AccountCredentialsOptions {
  db: Db
  secrets: SecretStore
  fetchImpl: typeof fetch
  now: () => number
  sleep?: (ms: number) => Promise<void>
}

export class AccountCredentials {
  private readonly refreshing = new Map<string, Promise<Credential>>()
  private readonly copilotTokens = new Map<string, CopilotToken>()
  private readonly frozenUntil = new Map<string, number>()
  private readonly usage = new Map<string, { at: number; windows: UsageWindow[] }>()

  constructor(private readonly options: AccountCredentialsOptions) {}

  /** The sealed secret of an account, opened; `null` when none is stored. */
  async read(connectionId: string): Promise<AccountSecret | null> {
    const stored = readToken(this.options.db, connectionId)
    if (!stored) return null
    const opened = await this.options.secrets.open(stored.cipher)
    try {
      return JSON.parse(opened.value) as AccountSecret
    } catch {
      return null
    }
  }

  /** Seals and stores an account's secret. Refuses (via `SecretStore`) when the OS cannot encrypt. */
  async save(
    connectionId: string,
    secret: AccountSecret,
    facts: { expiresAt: number | null; accountLabel: string | null }
  ): Promise<void> {
    const sealed = await this.options.secrets.seal(JSON.stringify(secret))
    writeToken(this.options.db, {
      connectionId,
      cipher: sealed.cipher,
      expiresAt: facts.expiresAt,
      accountLabel: facts.accountLabel,
      now: this.options.now()
    })
    this.copilotTokens.delete(connectionId)
    this.frozenUntil.delete(connectionId)
    this.usage.delete(connectionId)
  }

  /** Drops what is kept in memory for a connection that is gone. */
  forget(connectionId: string): void {
    this.copilotTokens.delete(connectionId)
    this.frozenUntil.delete(connectionId)
    this.usage.delete(connectionId)
    this.refreshing.delete(connectionId)
  }

  /**
   * A credential that is good now. `force` refreshes even a token that has not run out: that is what a 401
   * asks for.
   */
  credential(account: AccountRef, force = false): Promise<Credential> {
    const running = this.refreshing.get(account.id)
    if (running) return running
    const work = this.resolve(account, force).finally(() => {
      if (this.refreshing.get(account.id) === work) this.refreshing.delete(account.id)
    })
    this.refreshing.set(account.id, work)
    return work
  }

  private async resolve(account: AccountRef, force: boolean): Promise<Credential> {
    const { db, now } = this.options
    const stored = readToken(db, account.id)
    if (!stored) {
      throw new ProviderError(
        'auth',
        'Chưa đăng nhập ' + ACCOUNT_NAMES[account.oauthProvider] + '.',
        { account: account.oauthProvider }
      )
    }
    if (stored.state === 'relogin') throw reloginError(account.oauthProvider)
    const secret = await this.read(account.id)
    if (!secret) throw reloginError(account.oauthProvider)
    try {
      return account.oauthProvider === 'codex'
        ? await this.codexCredential(account.id, secret, force)
        : await this.copilotCredential(account.id, secret, force)
    } catch (error) {
      if (error instanceof ReloginError) {
        setTokenState(db, account.id, 'relogin', now())
        throw reloginError(account.oauthProvider)
      }
      if (error instanceof NoCopilotError) {
        setTokenState(db, account.id, 'relogin', now())
        throw new ProviderError('auth', error.message, { account: 'copilot' })
      }
      throw error
    }
  }

  private async codexCredential(
    connectionId: string,
    secret: AccountSecret,
    force: boolean
  ): Promise<Credential> {
    const { fetchImpl, now } = this.options
    let tokens: CodexTokens | null =
      secret.access && secret.refresh ? { access: secret.access, refresh: secret.refresh } : null
    if (!tokens) throw new ReloginError()
    const expiresAt = codexAccount(tokens.access).expiresAt
    if (force || expiresAt === null || expiresAt - now() < CODEX.refreshSkewMs) {
      tokens = await refreshCodex(fetchImpl, tokens.refresh)
      const account = codexAccount(tokens.access)
      // The new refresh token is written at once, with the access token, before anything can use it.
      await this.save(connectionId, tokens, {
        expiresAt: account.expiresAt,
        accountLabel: account.email ?? null
      })
    }
    const account = codexAccount(tokens.access)
    if (!account.accountId) {
      throw new ProviderError('auth', 'Tài khoản ChatGPT chưa có quyền dùng Codex.', {
        account: 'codex'
      })
    }
    return {
      kind: 'oauth',
      provider: 'codex',
      accessToken: tokens.access,
      accountId: account.accountId,
      ...(account.residency ? { residency: account.residency } : {})
    }
  }

  private async copilotCredential(
    connectionId: string,
    secret: AccountSecret,
    force: boolean
  ): Promise<Credential> {
    const { fetchImpl, now } = this.options
    if (!secret.githubToken) throw new ReloginError()
    let token = this.copilotTokens.get(connectionId)
    if (force || !token || token.expiresAt - now() < COPILOT.refreshSkewMs) {
      token = await exchangeCopilotToken(fetchImpl, secret.githubToken, now, this.options.sleep)
      this.copilotTokens.set(connectionId, token)
    }
    return { kind: 'oauth', provider: 'copilot', accessToken: token.token, apiBase: token.apiBase }
  }

  /**
   * The key source of an account connection: one credential, refreshed on demand, and a cooldown after a
   * rate limit the way a single key would get one.
   */
  keySource(account: AccountRef): KeySource {
    return {
      acquire: async (): Promise<KeyLease | KeyExhausted> => {
        const until = this.frozenUntil.get(account.id) ?? 0
        if (until > this.options.now()) return { exhausted: true, recoverAt: until }
        const credential = await this.credential(account)
        return {
          id: account.id,
          secret: credential.kind === 'oauth' ? credential.accessToken : credential.key,
          credential,
          refresh: () => this.credential(account, true)
        }
      },
      report: async (_lease, outcome): Promise<void> => {
        if (outcome === 'ok' || outcome === 'neutral') {
          this.frozenUntil.delete(account.id)
          return
        }
        if (outcome.kind === 'rate_limited' || outcome.kind === 'quota') {
          const wait = outcome.retryAfterMs ?? 60_000
          this.frozenUntil.set(account.id, (outcome.receivedAt ?? this.options.now()) + wait)
        }
      }
    }
  }

  /** The Codex account's limits, read at most once every 5 minutes. */
  async codexUsage(account: AccountRef): Promise<UsageWindow[]> {
    const { fetchImpl, now } = this.options
    const cached = this.usage.get(account.id)
    if (cached && now() - cached.at < 5 * 60_000) return cached.windows
    const credential = await this.credential(account)
    if (credential.kind !== 'oauth') return []
    const response = await fetchImpl(CODEX.usageUrl, {
      headers: {
        authorization: 'Bearer ' + credential.accessToken,
        accept: 'application/json',
        ...(credential.accountId ? { 'ChatGPT-Account-ID': credential.accountId } : {})
      }
    })
    if (!response.ok) {
      throw new StorageError('io', 'Không đọc được hạn mức ChatGPT (HTTP ' + response.status + ').')
    }
    const windows = parseCodexUsage(await response.json(), now())
    this.usage.set(account.id, { at: now(), windows })
    return windows
  }
}
