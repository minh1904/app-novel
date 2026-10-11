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
import type { Credential } from '../../infra/providers/transports/transportShared'
import { ProviderError } from '../../infra/providers/types'
import type { OAuthProvider } from '../../infra/storage/connections'
import { StorageError } from '../../infra/storage/errors'
import { readToken, setTokenState, writeToken } from '../../infra/storage/oauthTokens'
import type { SecretStore } from '../../infra/storage/secretStore'
import type { Db } from '../../infra/storage/sqlite'

/**
 * Quản lý token xác thực của các kết nối tài khoản thuê bao, chuyển từ kho lưu trữ mã hóa thành chứng thực có thể gọi API.
 *
 * Các nguyên tắc chính:
 *  - Đảm bảo token luôn mới: Codex làm mới trước 120 giây so với `exp`, Copilot đổi token ngắn hạn mới trước khi hết hạn 120 giây;
 *  - Mỗi tài khoản chỉ thực hiện một tác vụ làm mới tại một thời điểm: refresh token chỉ có giá trị dùng một lần,
 *    nếu nhiều yêu cầu tranh chấp sẽ làm hỏng phiên đăng nhập; các yêu cầu sau sẽ chờ tác vụ đang chạy;
 *  - Nếu làm mới bị từ chối dứt điểm (`invalid_grant`, `refresh_token_reused`, 401/403), kết nối sẽ được đánh dấu
 *    "Cần đăng nhập lại" và các lệnh gọi tiếp theo sẽ báo lỗi ngay lập tức thay vì thử lại.
 */

/** Dữ liệu bí mật được mã hóa của tài khoản: Codex lưu cặp OAuth; Copilot lưu GitHub token. */
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

/** Lỗi trả về khi tài khoản cần đăng nhập lại để tiếp tục sử dụng. */
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

  /** Giải mã và đọc thông tin bí mật đã lưu của tài khoản; trả về `null` nếu không có. */
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

  /** Mã hóa và lưu trữ thông tin bí mật của tài khoản. */
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

  /** Xóa thông tin lưu trong bộ nhớ tạm khi một kết nối bị xóa. */
  forget(connectionId: string): void {
    this.copilotTokens.delete(connectionId)
    this.frozenUntil.delete(connectionId)
    this.usage.delete(connectionId)
    this.refreshing.delete(connectionId)
  }

  /**
   * Lấy chứng thực hợp lệ hiện tại. Cờ `force` kích hoạt làm mới ngay cả khi token chưa hết hạn (dùng khi gặp lỗi 401).
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
      // Ghi ngay refresh token mới cùng access token vào kho lưu trữ trước khi sử dụng.
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
   * Nguồn cấp khóa API cho kết nối tài khoản: cung cấp một chứng thực được làm mới theo yêu cầu,
   * và áp dụng thời gian chờ làm nguội khi bị giới hạn tốc độ tương tự như một API key riêng lẻ.
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

  /** Đọc thông tin hạn mức tài khoản Codex, lưu đệm tối đa 5 phút giữa các lần đọc. */
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
