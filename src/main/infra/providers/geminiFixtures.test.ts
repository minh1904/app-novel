import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveCompat } from './compat'
import { KeyScheduler, type KeyRecord, type Lease } from './gateway/keyScheduler'
import type { KeyExhausted, KeyLease, KeyOutcome, KeySource } from './gateway/keys'
import {
  OpenAiChatTransport,
  buildChatBody,
  type ChatMessage,
  type ChatStreamEvent
} from './openAiChatTransport'
import { OpenAiCompatibleProvider } from './openAiCompatible'
import { ProviderError } from './types'

/**
 * The layer, run against what Gemini's OpenAI-compatible endpoint **really answered** on 2026-10-03
 * (gemini-2.5-flash, captured by `scripts/capture-provider-fixtures.mjs`, key scrubbed).
 *
 * Until these existed every shape in the provider layer was read out of documentation. Two of them were
 * wrong, and these recordings are how that was found: a wrong key is HTTP 400 with an array body, not
 * 401; and `usage` leaves the thinking tokens out of `completion_tokens`.
 *
 * Not recorded, still an assumption: the body of a 429 (the capture run did not provoke one; run the script
 * with `--burst 30` to get it) and anything about a Gemini 3 model.
 */

interface Recording {
  scenario: string
  model: string
  request: { body?: Record<string, unknown> }
  response: { status: number; headers: Record<string, string>; bodyText: string }
}

function load(name: string): Recording {
  const url = new URL('./__fixtures__/live/' + name + '.json', import.meta.url)
  return JSON.parse(readFileSync(url, 'utf-8')) as Recording
}

/** A `fetch` that answers with a recording, byte for byte, minus the headers that describe the wire encoding. */
function replay(name: string): typeof fetch & { calls: Array<{ url: string; body: unknown }> } {
  const recording = load(name)
  const calls: Array<{ url: string; body: unknown }> = []
  const fake = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body))
    })
    const { status, headers, bodyText } = recording.response
    const kept: Record<string, string> = {}
    for (const [key, value] of Object.entries(headers)) {
      if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key))
        kept[key] = value
    }
    return new Response(bodyText, { status, headers: kept })
  }) as typeof fetch & { calls: typeof calls }
  fake.calls = calls
  return fake
}

const GEMINI = resolveCompat('google')
const KEY = 'recorded-test-key'

function transport(fetchImpl: typeof fetch): OpenAiChatTransport {
  return new OpenAiChatTransport({
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    compat: GEMINI,
    fetchImpl,
    now: () => 1_700_000_000_000
  })
}

/** The messages the recordings were made with, so a request built now can be compared to the recorded one. */
function askedIn(name: string): { model: string; messages: ChatMessage[] } {
  const body = load(name).request.body as { model: string; messages: ChatMessage[] }
  return { model: body.model, messages: body.messages }
}

describe('the requests we build are the ones Gemini accepted', () => {
  it('a plain call', () => {
    const asked = askedIn('chat-complete')
    expect(buildChatBody(asked, GEMINI, false)).toEqual(load('chat-complete').request.body)
  })

  it('a streamed call asks for usage the way the accepted one did', () => {
    const asked = askedIn('chat-stream')
    expect(buildChatBody(asked, GEMINI, true)).toEqual(load('chat-stream').request.body)
  })

  it('an output cap goes in max_tokens, which Gemini accepted (it accepted max_completion_tokens too)', () => {
    const asked = askedIn('max-tokens')
    expect(buildChatBody({ ...asked, maxTokens: 5 }, GEMINI, false)).toEqual(
      load('max-tokens').request.body
    )
    expect(load('max-completion-tokens').response.status).toBe(200)
    expect(load('max-tokens').response.status).toBe(200)
  })

  it('reasoning effort goes in reasoning_effort', () => {
    const asked = askedIn('reasoning-none')
    expect(buildChatBody({ ...asked, reasoningEffort: 'none' }, GEMINI, false)).toEqual(
      load('reasoning-none').request.body
    )
  })
})

describe('reading what Gemini really sent back', () => {
  it('a plain answer: the text, why it ended, and usage that counts the hidden thinking', async () => {
    const result = await transport(replay('chat-complete')).complete(askedIn('chat-complete'), {
      apiKey: KEY
    })
    expect(result.text).toBe('Chào bạn, thế giới. Hôm nay thời tiết rất đẹp.')
    expect(result.finishReason).toBe('stop')
    // 21 in, 13 visible out, total 125: the other 91 were thinking, and they are billed as output.
    expect(result.usage).toEqual({ inputTokens: 21, outputTokens: 13 + 91, reasoningTokens: 91 })
  })

  it('a streamed answer arrives as one frame that already carries finish_reason and usage', async () => {
    const events: ChatStreamEvent[] = []
    for await (const event of transport(replay('chat-stream')).stream(askedIn('chat-stream'), {
      apiKey: KEY
    })) {
      events.push(event)
    }
    expect(events).toEqual([
      { kind: 'delta', text: 'Chào bạn, thế giới. Hôm nay thời tiết rất đẹp.' },
      {
        kind: 'done',
        finishReason: 'stop',
        usage: { inputTokens: 21, outputTokens: 13 + 177, reasoningTokens: 177 }
      }
    ])
  })

  it('without stream_options there is no usage at all, which is why it is asked for', async () => {
    const events: ChatStreamEvent[] = []
    for await (const event of transport(replay('chat-stream-default')).stream(
      askedIn('chat-stream-default'),
      {
        apiKey: KEY
      }
    )) {
      events.push(event)
    }
    expect(events.at(-1)).toEqual({ kind: 'done', finishReason: 'stop', usage: null })
  })

  it('an answer cut by the output cap says so, with one token of text', async () => {
    for (const scenario of ['max-tokens', 'max-completion-tokens']) {
      const result = await transport(replay(scenario)).complete(askedIn(scenario), { apiKey: KEY })
      expect(result.finishReason).toBe('length')
      expect(result.usage).toMatchObject({ outputTokens: 1 })
    }
  })

  it('reasoning_effort "none" removes the thinking: total adds up, nothing hidden', async () => {
    const result = await transport(replay('reasoning-none')).complete(askedIn('reasoning-none'), {
      apiKey: KEY
    })
    expect(result.usage).toEqual({ inputTokens: 21, outputTokens: 12 })
  })

  it('the model list, without the `models/` prefix Google puts on every id', async () => {
    const ids = await transport(replay('models')).listModels({ apiKey: KEY })
    expect(ids.length).toBeGreaterThan(20)
    expect(ids).toContain('gemini-2.5-flash')
    expect(ids).toContain('gemini-flash-latest')
    expect(ids.every((id) => !id.startsWith('models/'))).toBe(true)
  })

  it('a missing key on /models is a 404, the quirk that once passed for "no model listing"', async () => {
    const error = await transport(replay('models-no-key'))
      .listModels({ apiKey: null })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ProviderError)
    expect(error).toMatchObject({ kind: 'refused', status: 404 })
  })
})

describe('a wrong key (measured: HTTP 400 with an array body, not 401)', () => {
  it('is read as a wrong key, not as a request nothing can fix', async () => {
    const error = await transport(replay('bad-key'))
      .complete(askedIn('bad-key'), { apiKey: KEY })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ProviderError)
    expect(error).toMatchObject({ kind: 'auth', status: 400 })
    expect((error as ProviderError).message).toBe('Please pass a valid API key')
  })

  it('retires that key and finishes the call on the next one, through the whole stack', async () => {
    const rows: KeyRecord[] = ['bad', 'good'].map((id) => ({
      id,
      state: 'ok',
      frozenUntil: null,
      frozenScope: null,
      freezeStrikes: 0
    }))
    const scheduler = new KeyScheduler(() => 1_700_000_000_000)
    const issued = new WeakMap<KeyLease, Lease>()
    const reports: Array<{ key: string; outcome: KeyOutcome }> = []
    const keys: KeySource = {
      async acquire(): Promise<KeyLease | KeyExhausted> {
        const pick = scheduler.pick(rows)
        if ('exhausted' in pick) return { exhausted: true, recoverAt: pick.recoverAt }
        const lease: KeyLease = { id: pick.lease.keyId, secret: 'secret-of-' + pick.lease.keyId }
        issued.set(lease, pick.lease)
        return lease
      },
      async report(lease, outcome) {
        reports.push({ key: lease.id as string, outcome })
        const effect = scheduler.settle(
          issued.get(lease) as Lease,
          outcome,
          rows.find((r) => r.id === lease.id)
        )
        const row = rows.find((r) => r.id === lease.id)
        if (effect.kind === 'invalid' && row) row.state = 'invalid'
      }
    }

    const bad = replay('bad-key')
    const good = replay('chat-stream')
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get('authorization')
      return authorization === 'Bearer secret-of-bad' ? bad(input, init) : good(input, init)
    }) as typeof fetch

    const provider = new OpenAiCompatibleProvider({
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-2.5-flash',
      keys,
      compat: GEMINI,
      fetchImpl,
      sleep: async () => {},
      now: () => 1_700_000_000_000
    })

    const events: ChatStreamEvent[] = []
    for await (const event of provider.chat(askedIn('chat-stream').messages)) events.push(event)

    expect(events.at(0)).toEqual({
      kind: 'delta',
      text: 'Chào bạn, thế giới. Hôm nay thời tiết rất đẹp.'
    })
    expect(rows.find((r) => r.id === 'bad')!.state).toBe('invalid')
    expect(rows.find((r) => r.id === 'good')!.state).toBe('ok')
    expect(reports.map((r) => r.key)).toEqual(['bad', 'good'])
    expect(reports[1]!.outcome).toBe('ok')
  })
})
