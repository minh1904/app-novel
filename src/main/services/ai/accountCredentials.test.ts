import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { insertConnection, listConnections } from '../../infra/storage/connections'
import { librarySchema } from '../../infra/storage/librarySchema'
import { migrate } from '../../infra/storage/migrate'
import { readToken } from '../../infra/storage/oauthTokens'
import { SecretStore, type SecretCrypto } from '../../infra/storage/secretStore'
import { openDatabase, type Db } from '../../infra/storage/sqlite'
import { ProviderError } from '../../infra/providers/types'
import { AccountCredentials } from './accountCredentials'

/**
 * Account tokens (change `subscription-providers`, tasks 3.1, 3.3, 4.2): sealed or not stored at all, used
 * fresh, refreshed once at a time, and marked "Cần đăng nhập lại" when a refresh is refused for good.
 */

const tempDir = createTempDirs()
const opened: Db[] = []
afterEach(() => {
  for (const db of opened.splice(0)) db.close()
})

function open(path: string): Db {
  const db = openDatabase(path)
  opened.push(db)
  return db
}

function crypto(available = true): SecretCrypto {
  const flip = (bytes: Uint8Array): Uint8Array => new Uint8Array([...bytes].map((b) => b ^ 0x5a))
  return {
    isEncryptionAvailable: () => available,
    encrypt: async (plain) => flip(Buffer.from(plain, 'utf-8')),
    decrypt: async (cipher) => ({
      value: Buffer.from(flip(cipher)).toString('utf-8'),
      shouldReEncrypt: false
    })
  }
}

function jwt(claims: Record<string, unknown>): string {
  const part = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url')
  return part({ alg: 'none' }) + '.' + part(claims) + '.sig'
}

const NOW = 1_800_000_000_000
const ACCOUNT_CLAIMS = {
  'https://api.openai.com/auth': { chatgpt_account_id: 'acc-1', chatgpt_data_residency: 'eu' },
  'https://api.openai.com/profile': { email: 'minh@example.com' }
}

function setup(options: { available?: boolean; fetchImpl?: typeof fetch } = {}): {
  db: Db
  accounts: AccountCredentials
  codexId: string
  copilotId: string
} {
  const db = open(join(tempDir(), 'library.db'))
  migrate(db, librarySchema)
  const codex = insertConnection(
    db,
    'c-codex',
    {
      name: 'ChatGPT / Codex',
      baseUrl: 'https://chatgpt.com/backend-api/codex',
      authKind: 'oauth',
      oauthProvider: 'codex'
    },
    NOW
  )
  const copilot = insertConnection(
    db,
    'c-copilot',
    {
      name: 'GitHub Copilot',
      baseUrl: 'https://api.githubcopilot.com',
      authKind: 'oauth',
      oauthProvider: 'copilot'
    },
    NOW
  )
  const accounts = new AccountCredentials({
    db,
    secrets: new SecretStore(crypto(options.available)),
    fetchImpl:
      options.fetchImpl ?? ((async () => new Response('{}', { status: 500 })) as typeof fetch),
    now: () => NOW,
    sleep: async () => undefined
  })
  return { db, accounts, codexId: codex.id, copilotId: copilot.id }
}

describe('library schema v7', () => {
  it('keeps old connections on API keys and Chat Completions, and allows one account per provider', () => {
    const db = open(join(tempDir(), 'old.db'))
    migrate(db, { ...librarySchema, migrations: librarySchema.migrations.slice(0, 6) })
    insertConnectionV6(db)
    migrate(db, librarySchema)
    expect(listConnections(db)[0]).toMatchObject({
      authKind: 'api_key',
      oauthProvider: null,
      apiMode: 'auto',
      account: null
    })
    insertConnection(
      db,
      'a',
      { name: 'A', baseUrl: 'https://x', authKind: 'oauth', oauthProvider: 'codex' },
      1
    )
    expect(() =>
      insertConnection(
        db,
        'b',
        { name: 'B', baseUrl: 'https://x', authKind: 'oauth', oauthProvider: 'codex' },
        1
      )
    ).toThrow()
  })
})

function insertConnectionV6(db: Db): void {
  db.exec(`INSERT INTO ai_connection (id, name, base_url, enabled, provider_id, default_model, checked_at, ord, created_at, updated_at)
    VALUES ('old', 'Gateway', 'http://127.0.0.1:8317/v1', 1, NULL, NULL, NULL, 0, 1, 1)`)
}

describe('storing tokens', () => {
  it('stores only ciphertext and shows the account, never the token', async () => {
    const { db, accounts, codexId } = setup()
    const access = jwt({ ...ACCOUNT_CLAIMS, exp: NOW / 1000 + 3600 })
    await accounts.save(
      codexId,
      { access, refresh: 'r1' },
      { expiresAt: NOW + 3_600_000, accountLabel: 'minh@example.com' }
    )
    const stored = readToken(db, codexId)!
    expect(Buffer.from(stored.cipher).toString('utf-8')).not.toContain('r1')
    expect(listConnections(db).find((c) => c.id === codexId)?.account).toEqual({
      label: 'minh@example.com',
      state: 'ok',
      expiresAt: NOW + 3_600_000
    })
  })

  it('refuses to store when the OS cannot encrypt', async () => {
    const { db, accounts, codexId } = setup({ available: false })
    await expect(
      accounts.save(codexId, { access: 'a', refresh: 'r' }, { expiresAt: null, accountLabel: null })
    ).rejects.toThrow('kho khóa an toàn')
    expect(readToken(db, codexId)).toBeNull()
  })
})

describe('Codex credentials', () => {
  it('uses a token with time left as it is, with the account id and residency', async () => {
    const { accounts, codexId } = setup()
    const access = jwt({ ...ACCOUNT_CLAIMS, exp: NOW / 1000 + 3600 })
    await accounts.save(codexId, { access, refresh: 'r1' }, { expiresAt: null, accountLabel: null })
    expect(await accounts.credential({ id: codexId, oauthProvider: 'codex' })).toEqual({
      kind: 'oauth',
      provider: 'codex',
      accessToken: access,
      accountId: 'acc-1',
      residency: 'eu'
    })
  })

  it('refreshes a token with 60 s left once, even for two calls at the same time, and keeps the new refresh token', async () => {
    let refreshes = 0
    const fresh = jwt({ ...ACCOUNT_CLAIMS, exp: NOW / 1000 + 3600 })
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      refreshes++
      expect(String(init.body)).toContain('grant_type=refresh_token')
      expect(String(init.body)).toContain('refresh_token=r1')
      await new Promise((resolve) => setTimeout(resolve, 5))
      return new Response(JSON.stringify({ access_token: fresh, refresh_token: 'r2' }), {
        status: 200
      })
    }) as typeof fetch
    const { accounts, codexId } = setup({ fetchImpl })
    await accounts.save(
      codexId,
      { access: jwt({ ...ACCOUNT_CLAIMS, exp: NOW / 1000 + 60 }), refresh: 'r1' },
      { expiresAt: null, accountLabel: null }
    )
    const account = { id: codexId, oauthProvider: 'codex' as const }
    const [a, b] = await Promise.all([accounts.credential(account), accounts.credential(account)])
    expect(refreshes).toBe(1)
    expect(a).toEqual(b)
    expect(await accounts.read(codexId)).toEqual({ access: fresh, refresh: 'r2' })
  })

  it('marks the login "relogin" when the refresh token was already used, and fails at once after', async () => {
    let calls = 0
    const fetchImpl = (async () => {
      calls++
      return new Response(JSON.stringify({ error: 'refresh_token_reused' }), { status: 400 })
    }) as typeof fetch
    const { db, accounts, codexId } = setup({ fetchImpl })
    await accounts.save(
      codexId,
      { access: jwt({ ...ACCOUNT_CLAIMS, exp: NOW / 1000 + 10 }), refresh: 'r1' },
      { expiresAt: null, accountLabel: null }
    )
    const account = { id: codexId, oauthProvider: 'codex' as const }
    const error = await accounts.credential(account).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ProviderError)
    expect(error).toMatchObject({ kind: 'auth', account: 'codex' })
    expect((error as Error).message).toContain('Cần đăng nhập lại ChatGPT / Codex')
    expect(readToken(db, codexId)?.state).toBe('relogin')
    await accounts.credential(account).catch(() => undefined)
    expect(calls).toBe(1)
  })

  it('treats a rate-limited refresh as a rate limit, not a relogin', async () => {
    const fetchImpl = (async () => new Response('{}', { status: 429 })) as typeof fetch
    const { db, accounts, codexId } = setup({ fetchImpl })
    await accounts.save(
      codexId,
      { access: jwt({ ...ACCOUNT_CLAIMS, exp: NOW / 1000 + 10 }), refresh: 'r1' },
      { expiresAt: null, accountLabel: null }
    )
    const error = await accounts
      .credential({ id: codexId, oauthProvider: 'codex' })
      .catch((caught: unknown) => caught)
    expect(error).toMatchObject({ kind: 'rate_limited' })
    expect(readToken(db, codexId)?.state).toBe('ok')
  })

  it('says the ChatGPT account has no Codex when the token carries no account id', async () => {
    const { accounts, codexId } = setup()
    await accounts.save(
      codexId,
      { access: jwt({ exp: NOW / 1000 + 3600 }), refresh: 'r' },
      { expiresAt: null, accountLabel: null }
    )
    await expect(accounts.credential({ id: codexId, oauthProvider: 'codex' })).rejects.toThrow(
      'Tài khoản ChatGPT chưa có quyền dùng Codex.'
    )
  })
})

describe('Copilot credentials', () => {
  it('exchanges the GitHub token once and reuses the Copilot token until 120 s before it runs out', async () => {
    let exchanges = 0
    const fetchImpl = (async (url: string, init: RequestInit) => {
      exchanges++
      expect(url).toBe('https://api.github.com/copilot_internal/v2/token')
      expect((init.headers as Record<string, string>).authorization).toBe('token ghu_1')
      return new Response(
        JSON.stringify({
          token: 'cop-1',
          expires_at: NOW / 1000 + 1800,
          endpoints: { api: 'https://api.individual.githubcopilot.com' }
        }),
        { status: 200 }
      )
    }) as typeof fetch
    const { accounts, copilotId } = setup({ fetchImpl })
    await accounts.save(
      copilotId,
      { githubToken: 'ghu_1' },
      { expiresAt: null, accountLabel: 'minh' }
    )
    const account = { id: copilotId, oauthProvider: 'copilot' as const }
    expect(await accounts.credential(account)).toEqual({
      kind: 'oauth',
      provider: 'copilot',
      accessToken: 'cop-1',
      apiBase: 'https://api.individual.githubcopilot.com'
    })
    await accounts.credential(account)
    expect(exchanges).toBe(1)
    await accounts.credential(account, true)
    expect(exchanges).toBe(2)
  })

  it('tries a failing exchange three times, and stops at once on 401', async () => {
    let calls = 0
    const flaky = (async () => {
      calls++
      return new Response('{}', { status: 502 })
    }) as typeof fetch
    const first = setup({ fetchImpl: flaky })
    await first.accounts.save(
      first.copilotId,
      { githubToken: 'ghu_1' },
      { expiresAt: null, accountLabel: null }
    )
    await expect(
      first.accounts.credential({ id: first.copilotId, oauthProvider: 'copilot' })
    ).rejects.toBeInstanceOf(ProviderError)
    expect(calls).toBe(3)

    calls = 0
    const revoked = (async () => {
      calls++
      return new Response('{}', { status: 401 })
    }) as typeof fetch
    const second = setup({ fetchImpl: revoked })
    await second.accounts.save(
      second.copilotId,
      { githubToken: 'ghu_1' },
      { expiresAt: null, accountLabel: null }
    )
    await expect(
      second.accounts.credential({ id: second.copilotId, oauthProvider: 'copilot' })
    ).rejects.toMatchObject({
      kind: 'auth',
      account: 'copilot'
    })
    expect(calls).toBe(1)
    expect(readToken(second.db, second.copilotId)?.state).toBe('relogin')
  })
})

describe('the key source of an account', () => {
  it('hands out one credential with a refresh, and cools down after a rate limit', async () => {
    const { accounts, codexId } = setup()
    const access = jwt({ ...ACCOUNT_CLAIMS, exp: NOW / 1000 + 3600 })
    await accounts.save(codexId, { access, refresh: 'r1' }, { expiresAt: null, accountLabel: null })
    const keys = accounts.keySource({ id: codexId, oauthProvider: 'codex' })
    const lease = await keys.acquire()
    expect(lease).toMatchObject({ id: codexId, secret: access, credential: { accountId: 'acc-1' } })
    expect('refresh' in lease && typeof lease.refresh).toBe('function')
    if ('exhausted' in lease) throw new Error('unexpected')
    await keys.report(lease, {
      kind: 'rate_limited',
      message: 'x',
      retryAfterMs: 30_000,
      receivedAt: NOW
    })
    expect(await keys.acquire()).toEqual({ exhausted: true, recoverAt: NOW + 30_000 })
  })
})
