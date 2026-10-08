import { StorageError } from './errors'
import type { Db } from './sqlite'

/**
 * Account tokens in `library.db` (change `subscription-providers`, design D7). Like API keys, they are stored
 * only as `safeStorage` ciphertext and never leave the main process; this file never sees a token in clear,
 * only the sealed bytes and the facts that may be shown (the account's label, when it expires, whether a
 * refresh was refused for good).
 */

export type TokenState = 'ok' | 'relogin'

export interface StoredToken {
  connectionId: string
  cipher: Uint8Array
  expiresAt: number | null
  accountLabel: string | null
  state: TokenState
  updatedAt: number
}

interface TokenRow {
  connection_id: string
  secret: Uint8Array
  expires_at: number | null
  account_label: string | null
  state: string
  updated_at: number
}

export function readToken(db: Db, connectionId: string): StoredToken | null {
  const row = db
    .prepare('SELECT * FROM ai_oauth_token WHERE connection_id = ?')
    .get<TokenRow>(connectionId)
  if (!row) return null
  return {
    connectionId: row.connection_id,
    cipher: row.secret,
    expiresAt: row.expires_at,
    accountLabel: row.account_label,
    state: row.state === 'relogin' ? 'relogin' : 'ok',
    updatedAt: row.updated_at
  }
}

/** Writes the sealed token of a connection, replacing the old one; a fresh token is always `ok`. */
export function writeToken(
  db: Db,
  input: {
    connectionId: string
    cipher: Uint8Array
    expiresAt: number | null
    accountLabel: string | null
    now: number
  }
): void {
  const connection = db
    .prepare("SELECT 1 AS found FROM ai_connection WHERE id = ? AND auth_kind = 'oauth'")
    .get(input.connectionId)
  if (!connection) throw new StorageError('not_found', 'Không có kết nối tài khoản này.')
  db.prepare(
    `INSERT INTO ai_oauth_token (connection_id, secret, expires_at, account_label, state, updated_at)
    VALUES (?, ?, ?, ?, 'ok', ?)
    ON CONFLICT (connection_id) DO UPDATE SET secret = excluded.secret, expires_at = excluded.expires_at,
      account_label = COALESCE(excluded.account_label, ai_oauth_token.account_label), state = 'ok',
      updated_at = excluded.updated_at`
  ).run(input.connectionId, input.cipher, input.expiresAt, input.accountLabel, input.now)
}

/** Marks a login as refused for good: the card says "Cần đăng nhập lại" until the person logs in again. */
export function setTokenState(db: Db, connectionId: string, state: TokenState, now: number): void {
  db.prepare('UPDATE ai_oauth_token SET state = ?, updated_at = ? WHERE connection_id = ?').run(
    state,
    now,
    connectionId
  )
}

/** The account connection of a provider, if there is one. */
export function findAccountConnection(db: Db, provider: 'codex' | 'copilot'): string | null {
  const row = db
    .prepare('SELECT id FROM ai_connection WHERE oauth_provider = ?')
    .get<{ id: string }>(provider)
  return row?.id ?? null
}
