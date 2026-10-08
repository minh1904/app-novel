import { describe, expect, it } from 'vitest'
import {
  CODEX,
  codexAccount,
  parseCodexUsage,
  pollCodex,
  requestCodexCode,
  type DeviceCode
} from './codex'
import {
  exchangeCopilotToken,
  parseCopilotModels,
  pollCopilot,
  requestCopilotCode
} from './copilot'
import { ProviderError } from '../types'

/**
 * The device-code logins against a fake server (change `subscription-providers`, tasks 3.2, 3.4, 3.5, 4.1,
 * 4.4): each answer the provider can give, and what Mira makes of it.
 */

const NOW = 1_800_000_000_000

function server(routes: Record<string, (init: RequestInit) => Response | Promise<Response>>): {
  fetchImpl: typeof fetch
  calls: string[]
} {
  const calls: string[] = []
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    calls.push(url)
    const route = routes[url.split('?')[0]]
    if (!route) throw new Error('no route for ' + url)
    return route(init)
  }) as typeof fetch
  return { fetchImpl, calls }
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status })

describe('Codex device code', () => {
  it('asks for a code, keeps the interval at least 3 s, and gives up after 15 minutes', async () => {
    const { fetchImpl } = server({
      [CODEX.userCodeUrl]: (init) => {
        expect(JSON.parse(String(init.body))).toEqual({ client_id: CODEX.clientId })
        return json({ user_code: 'ABCD-1234', device_auth_id: 'dev-1', interval: '1' })
      }
    })
    const code = await requestCodexCode(fetchImpl, NOW)
    expect(code).toMatchObject({
      userCode: 'ABCD-1234',
      verificationUrl: 'https://auth.openai.com/codex/device',
      intervalMs: 3000,
      expiresAt: NOW + 15 * 60_000
    })
  })

  const code: DeviceCode = {
    userCode: 'ABCD-1234',
    verificationUrl: CODEX.verificationUrl,
    intervalMs: 5000,
    expiresAt: NOW + 60_000,
    handle: { deviceAuthId: 'dev-1', userCode: 'ABCD-1234' }
  }

  it('reads 403 and 404 as "not yet"', async () => {
    for (const status of [403, 404]) {
      const { fetchImpl } = server({ [CODEX.deviceTokenUrl]: () => json({}, status) })
      expect(await pollCodex(fetchImpl, code, NOW)).toEqual({ status: 'pending' })
    }
  })

  it('exchanges the authorization code for tokens once confirmed', async () => {
    const { fetchImpl, calls } = server({
      [CODEX.deviceTokenUrl]: () => json({ authorization_code: 'auth-1', code_verifier: 'ver-1' }),
      [CODEX.tokenUrl]: (init) => {
        const form = new URLSearchParams(String(init.body))
        expect(form.get('grant_type')).toBe('authorization_code')
        expect(form.get('code')).toBe('auth-1')
        expect(form.get('code_verifier')).toBe('ver-1')
        expect(form.get('redirect_uri')).toBe(CODEX.redirectUri)
        return json({ access_token: 'acc', refresh_token: 'ref' })
      }
    })
    expect(await pollCodex(fetchImpl, code, NOW)).toEqual({
      status: 'approved',
      result: { access: 'acc', refresh: 'ref' }
    })
    expect(calls).toEqual([CODEX.deviceTokenUrl, CODEX.tokenUrl])
  })

  it('reads another status as a refusal, an expired code as expired, and a dropped line as network', async () => {
    const refused = server({ [CODEX.deviceTokenUrl]: () => json({}, 400) })
    expect(await pollCodex(refused.fetchImpl, code, NOW)).toMatchObject({ status: 'denied' })
    expect(await pollCodex(refused.fetchImpl, code, NOW + 60_000)).toMatchObject({
      status: 'expired'
    })
    const down = (async () => {
      throw new Error('ECONNRESET')
    }) as typeof fetch
    await expect(pollCodex(down, code, NOW)).rejects.toMatchObject({ kind: 'network' })
  })
})

describe('Codex account facts', () => {
  const token = (claims: Record<string, unknown>): string =>
    'h.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.s'

  it('reads the account id, residency, email and expiry from the access token', () => {
    expect(
      codexAccount(
        token({
          exp: 1_900_000_000,
          'https://api.openai.com/auth': {
            chatgpt_account_id: 'acc',
            chatgpt_compute_residency: 'us'
          },
          'https://api.openai.com/profile': { email: 'a@b.c' }
        })
      )
    ).toEqual({ accountId: 'acc', residency: 'us', email: 'a@b.c', expiresAt: 1_900_000_000_000 })
    expect(codexAccount('not-a-jwt')).toEqual({ expiresAt: null })
  })

  it('names the windows by length and reads both shapes of reset_at', () => {
    const windows = parseCodexUsage(
      {
        rate_limit: {
          primary_window: {
            used_percent: 92,
            limit_window_seconds: 18_000,
            reset_at: 1_900_000_000
          },
          secondary_window: {
            used_percent: 30,
            limit_window_seconds: 604_800,
            reset_at: '2030-03-17T12:00:00Z'
          }
        }
      },
      NOW
    )
    expect(windows).toEqual([
      { kind: 'session', remainingPercent: 8, resetsAt: 1_900_000_000_000 },
      { kind: 'week', remainingPercent: 70, resetsAt: Date.parse('2030-03-17T12:00:00Z') }
    ])
    expect(parseCodexUsage({}, NOW)).toEqual([])
  })
})

describe('Copilot device code', () => {
  it('waits GitHub interval plus 3 s between polls', async () => {
    const { fetchImpl } = server({
      'https://github.com/login/device/code': () =>
        json({
          device_code: 'dc',
          user_code: 'WXYZ-9876',
          verification_uri: 'https://github.com/login/device',
          interval: 5,
          expires_in: 900
        })
    })
    expect(await requestCopilotCode(fetchImpl, NOW)).toMatchObject({
      userCode: 'WXYZ-9876',
      verificationUrl: 'https://github.com/login/device',
      intervalMs: 8000,
      expiresAt: NOW + 900_000
    })
  })

  const code: DeviceCode = {
    userCode: 'WXYZ-9876',
    verificationUrl: 'https://github.com/login/device',
    intervalMs: 8000,
    expiresAt: NOW + 60_000,
    handle: { deviceCode: 'dc' }
  }

  it('reads each answer GitHub gives', async () => {
    const answers: Array<[unknown, unknown]> = [
      [{ error: 'authorization_pending' }, { status: 'pending' }],
      [{ error: 'slow_down' }, { status: 'pending', slowDown: true }],
      [{ error: 'expired_token' }, { status: 'expired', message: 'Mã đã hết hạn.' }],
      [
        { error: 'access_denied' },
        { status: 'denied', message: 'Bạn đã từ chối cho Mira truy cập GitHub.' }
      ],
      [{ access_token: 'ghu_1' }, { status: 'approved', result: { githubToken: 'ghu_1' } }]
    ]
    for (const [body, outcome] of answers) {
      const { fetchImpl } = server({
        'https://github.com/login/oauth/access_token': () => json(body)
      })
      expect(await pollCopilot(fetchImpl, code, NOW)).toEqual(outcome)
    }
  })
})

describe('Copilot token and models', () => {
  it('takes the API base the token names, and defaults the expiry to 30 minutes', async () => {
    const { fetchImpl } = server({
      'https://api.github.com/copilot_internal/v2/token': () => json({ token: 't', endpoints: {} })
    })
    expect(
      await exchangeCopilotToken(
        fetchImpl,
        'ghu',
        () => NOW,
        async () => undefined
      )
    ).toEqual({
      token: 't',
      expiresAt: NOW + 1_800_000,
      apiBase: 'https://api.githubcopilot.com'
    })
  })

  it('says an account without Copilot plainly instead of retrying', async () => {
    let calls = 0
    const fetchImpl = (async () => {
      calls++
      return json({}, 404)
    }) as typeof fetch
    await expect(
      exchangeCopilotToken(
        fetchImpl,
        'ghu',
        () => NOW,
        async () => undefined
      )
    ).rejects.toThrow('không có Copilot')
    expect(calls).toBe(1)
  })

  it('keeps chat models with a supported endpoint and drops those hidden from the picker', () => {
    const models = parseCopilotModels({
      data: [
        {
          id: 'gpt-5.4',
          capabilities: { type: 'chat', supports: { reasoning_effort: ['low', 'high'] } },
          supported_endpoints: ['/responses']
        },
        { id: 'claude-sonnet-4.6', capabilities: { type: 'chat' } },
        { id: 'text-embedding-3', capabilities: { type: 'embeddings' } },
        { id: 'old', capabilities: { type: 'chat' }, model_picker_enabled: false },
        { id: 'audio', capabilities: { type: 'chat' }, supported_endpoints: ['/audio'] }
      ]
    })
    expect(models).toEqual([
      { id: 'gpt-5.4', reasoningLevels: ['low', 'high'] },
      { id: 'claude-sonnet-4.6', reasoningLevels: [] }
    ])
    // When the flag would hide every model, it is ignored.
    expect(
      parseCopilotModels({
        data: [{ id: 'only', capabilities: { type: 'chat' }, model_picker_enabled: false }]
      })
    ).toEqual([{ id: 'only', reasoningLevels: [] }])
  })

  it('treats an unreadable token answer as a broken response', async () => {
    const { fetchImpl } = server({
      'https://api.github.com/copilot_internal/v2/token': () => json({ nope: true })
    })
    await expect(
      exchangeCopilotToken(
        fetchImpl,
        'ghu',
        () => NOW,
        async () => undefined
      )
    ).rejects.toBeInstanceOf(ProviderError)
  })
})
