import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createTempDirs } from '../../testing/testing'
import { CODEX } from '../../infra/providers/accounts/codex'
import { listConnections } from '../../infra/storage/connections'
import { librarySchema } from '../../infra/storage/librarySchema'
import { migrate } from '../../infra/storage/migrate'
import { readToken } from '../../infra/storage/oauthTokens'
import { SecretStore, type SecretCrypto } from '../../infra/storage/secretStore'
import { openDatabase, type Db } from '../../infra/storage/sqlite'
import { AccountCredentials } from './accountCredentials'
import { AccountLogins, isLoginUrl, QUIET_RETRIES } from './accountLogins'

/**
 * Logging in with a device code in main (change `subscription-providers`, task 6.1). Polling is driven by a
 * sleep the test controls, so each round happens when the test says.
 */

const tempDir = createTempDirs()
const opened: Db[] = []
afterEach(() => {
  for (const db of opened.splice(0)) db.close()
})

const NOW = 1_800_000_000_000
const ACCESS =
  'h.' +
  Buffer.from(
    JSON.stringify({
      exp: NOW / 1000 + 3600,
      'https://api.openai.com/auth': { chatgpt_account_id: 'acc' },
      'https://api.openai.com/profile': { email: 'minh@example.com' }
    })
  ).toString('base64url') +
  '.s'

/** A sleep that resolves only when the test lets the next round run. */
function rounds(): { sleep: () => Promise<void>; next(): Promise<void> } {
  const waiting: Array<() => void> = []
  return {
    sleep: () => new Promise<void>((resolve) => waiting.push(resolve)),
    async next() {
      for (let i = 0; i < 20 && waiting.length === 0; i++)
        await new Promise((r) => setTimeout(r, 1))
      waiting.shift()?.()
      await new Promise((r) => setTimeout(r, 5))
    }
  }
}

function setup(options: { poll: Array<() => Response>; crypto?: SecretCrypto }): {
  db: Db
  logins: AccountLogins
  clock: ReturnType<typeof rounds>
  opened: string[]
  connected: string[]
} {
  const db = openDatabase(join(tempDir(), 'library.db'))
  opened.push(db)
  migrate(db, librarySchema)
  const answers = [...options.poll]
  const fetchImpl = (async (url: string) => {
    if (url === CODEX.userCodeUrl) {
      return new Response(
        JSON.stringify({ user_code: 'ABCD-1234', device_auth_id: 'dev', interval: 3 })
      )
    }
    if (url === CODEX.deviceTokenUrl) {
      const next = answers.shift()
      if (!next) throw new Error('no more answers')
      return next()
    }
    if (url === CODEX.tokenUrl) {
      return new Response(JSON.stringify({ access_token: ACCESS, refresh_token: 'ref' }))
    }
    throw new Error('unexpected ' + url)
  }) as typeof fetch
  const crypto: SecretCrypto = options.crypto ?? {
    isEncryptionAvailable: () => true,
    encrypt: async (plain) => new Uint8Array(Buffer.from(plain).map((b) => b ^ 1)),
    decrypt: async (cipher) => ({
      value: Buffer.from(cipher.map((b) => b ^ 1)).toString(),
      shouldReEncrypt: false
    })
  }
  const secrets = new SecretStore(crypto)
  const clock = rounds()
  const openedUrls: string[] = []
  const connected: string[] = []
  let id = 0
  const logins = new AccountLogins({
    db,
    secrets,
    accounts: new AccountCredentials({ db, secrets, fetchImpl, now: () => NOW }),
    fetchImpl,
    now: () => NOW,
    newId: () => '00000000-0000-4000-8000-00000000000' + id++,
    openExternal: async (url) => {
      openedUrls.push(url)
    },
    sleep: clock.sleep,
    onConnected: async (connectionId) => {
      connected.push(connectionId)
    }
  })
  return { db, logins, clock, opened: openedUrls, connected }
}

const pending = (): Response => new Response('{}', { status: 403 })
const approved = (): Response =>
  new Response(JSON.stringify({ authorization_code: 'code', code_verifier: 'ver' }))
const dropped = (): Response => {
  throw new Error('ECONNRESET')
}

describe('AccountLogins', () => {
  it('shows the code, opens the page, and stores the account once confirmed', async () => {
    const { db, logins, clock, opened: urls, connected } = setup({ poll: [pending, approved] })
    const start = await logins.start('codex')
    expect(start).toMatchObject({ userCode: 'ABCD-1234', verificationUrl: CODEX.verificationUrl })
    expect(urls).toEqual([CODEX.verificationUrl])
    await clock.next()
    expect(logins.poll(start.sessionId)).toEqual({ state: 'pending' })
    await clock.next()
    const status = logins.poll(start.sessionId)
    expect(status.state).toBe('approved')
    const connection = listConnections(db)[0]
    expect(connection).toMatchObject({
      name: 'ChatGPT / Codex',
      authKind: 'oauth',
      oauthProvider: 'codex',
      account: { label: 'minh@example.com', state: 'ok' }
    })
    expect(readToken(db, connection.id)).not.toBeNull()
    expect(connected).toEqual([connection.id])
  })

  it('stores nothing when cancelled while the tokens are being sealed', async () => {
    let release: () => void = () => undefined
    const slow: SecretCrypto = {
      isEncryptionAvailable: () => true,
      encrypt: (plain) =>
        new Promise((resolve) => {
          release = () => resolve(new Uint8Array(Buffer.from(plain)))
        }),
      decrypt: async (cipher) => ({ value: Buffer.from(cipher).toString(), shouldReEncrypt: false })
    }
    const { db, logins, clock } = setup({ poll: [approved], crypto: slow })
    const start = await logins.start('codex')
    await clock.next()
    logins.cancel(start.sessionId)
    release()
    await new Promise((r) => setTimeout(r, 10))
    expect(logins.poll(start.sessionId)).toEqual({ state: 'cancelled' })
    expect(listConnections(db)).toEqual([])
  })

  it('rides out a few dropped polls without a word', async () => {
    const { logins, clock } = setup({ poll: [dropped, dropped, approved] })
    const start = await logins.start('codex')
    for (let i = 0; i < 3; i++) await clock.next()
    expect(logins.poll(start.sessionId).state).toBe('approved')
  })

  it('says the login failed after too many dropped polls in a row', async () => {
    const { logins, clock } = setup({ poll: Array.from({ length: QUIET_RETRIES }, () => dropped) })
    const start = await logins.start('codex')
    for (let i = 0; i < QUIET_RETRIES; i++) await clock.next()
    expect(logins.poll(start.sessionId)).toMatchObject({
      state: 'error',
      message: 'Đăng nhập ChatGPT / Codex chưa xong: không nối được tới nhà cung cấp.'
    })
  })

  it('opens only the providers own login pages', () => {
    expect(isLoginUrl('https://auth.openai.com/codex/device')).toBe(true)
    expect(isLoginUrl('https://github.com/login/device')).toBe(true)
    expect(isLoginUrl('http://github.com/login/device')).toBe(false)
    expect(isLoginUrl('https://evil.example/login')).toBe(false)
  })
})
