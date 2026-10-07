import { describe, expect, it } from 'vitest'
import {
  OpenAiCompatibleProvider,
  joinUrl,
  parseItems,
  splitIntoBatches,
  type KeyExhausted,
  type KeyLease,
  type KeyOutcome,
  type KeySource
} from './openAiCompatible'
import { ProviderError, type TranslateRequest } from './types'

const NOW = 1_700_000_000_000

const request = (count: number, size = 10): TranslateRequest => ({
  sourceLang: 'zh-Hans',
  targetLang: 'vi',
  segments: Array.from({ length: count }, (_, i) => ({
    id: 's' + i,
    text: '文'.repeat(size)
  }))
})

/** Nguồn khóa giả, ghi lại mọi lần báo kết quả để test xem adapter có báo đúng không. */
function keySource(
  leases: Array<KeyLease | KeyExhausted> = [{ id: 'k1', secret: 'SECRET' }]
): KeySource & { reports: Array<{ keyId: string; outcome: KeyOutcome }> } {
  const queue = [...leases]
  const reports: Array<{ keyId: string; outcome: KeyOutcome }> = []
  return {
    reports,
    async acquire() {
      return queue.length > 1 ? (queue.shift() as KeyLease) : queue[0]
    },
    async report(lease, outcome) {
      reports.push({ keyId: lease.id as string, outcome })
    }
  }
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  })
}

/** Phản hồi chat hợp lệ cho đúng các segment được hỏi. */
function completionFor(ids: string[], prefix = 'VI:'): Response {
  return jsonResponse({
    choices: [{ message: { content: JSON.stringify(ids.map((id) => ({ id, dst: prefix + id }))) } }]
  })
}

function idsOf(init: RequestInit | undefined): string[] {
  const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> }
  const payload = JSON.parse(body.messages[1].content) as Array<{ id: string }>
  return payload.map((entry) => entry.id)
}

function provider(fetchImpl: typeof fetch, keys = keySource()): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    baseUrl: 'http://127.0.0.1:8317/v1',
    model: 'gemini-flash-latest',
    keys,
    fetchImpl,
    // Một lần thử lại có chờ; test không cần chờ thật.
    sleep: async () => {},
    now: () => NOW
  })
}

describe('joinUrl', () => {
  it('works whether or not the user typed a trailing slash', () => {
    expect(joinUrl('http://x/v1', 'models')).toBe('http://x/v1/models')
    expect(joinUrl('http://x/v1/', '/models')).toBe('http://x/v1/models')
  })

  it('does not double the endpoint when a connection saved the full path', () => {
    expect(joinUrl('http://x/v1/chat/completions', 'chat/completions')).toBe(
      'http://x/v1/chat/completions'
    )
    expect(joinUrl('http://x/v1/chat/completions/', 'models')).toBe('http://x/v1/models')
  })
})

describe('splitIntoBatches', () => {
  it('never splits a segment across two batches', () => {
    const segments = request(40, 200).segments
    const batches = splitIntoBatches(segments)
    expect(batches.flat().map((s) => s.id)).toEqual(segments.map((s) => s.id))
    expect(batches.length).toBeGreaterThan(1)
  })

  it('gives a segment larger than a whole batch its own batch rather than cutting it', () => {
    const segments = [
      { id: 'a', text: 'x' },
      { id: 'huge', text: 'y'.repeat(100_000) },
      { id: 'b', text: 'z' }
    ]
    const batches = splitIntoBatches(segments)
    expect(batches.some((batch) => batch.length === 1 && batch[0].id === 'huge')).toBe(true)
    expect(batches.flat()).toHaveLength(3)
  })

  it('returns nothing for nothing', () => {
    expect(splitIntoBatches([])).toEqual([])
  })
})

describe('parseItems', () => {
  it('reads a plain array', () => {
    expect(parseItems('[{"id":"a","dst":"A"}]')).toEqual([{ id: 'a', text: 'A' }])
  })

  it('survives a code fence and chatter around the array', () => {
    const content = 'Đây là kết quả:\n```json\n[{"id":"a","dst":"A"}]\n```\nHết.'
    expect(parseItems(content)).toEqual([{ id: 'a', text: 'A' }])
  })

  it('drops entries that are not a string id with a string translation', () => {
    expect(parseItems('[{"id":"a","dst":"A"},{"id":1,"dst":"B"},{"id":"c"}]')).toEqual([
      { id: 'a', text: 'A' }
    ])
  })

  it('reports an unusable answer rather than guessing', () => {
    expect(() => parseItems('xin chào')).toThrow(ProviderError)
    expect(() => parseItems('[{"id":')).toThrow(/JSON/)
    expect(() => parseItems('{"id":"a"}')).toThrow(/mảng/)
  })
})

describe('translate', () => {
  it('pairs answers by id even when the provider reorders them', async () => {
    const fetchImpl = (async (_url, init) => {
      const ids = idsOf(init as RequestInit)
      return completionFor([...ids].reverse())
    }) as typeof fetch

    const result = await provider(fetchImpl).translate(request(3))
    expect(result.items).toEqual([
      { id: 's0', text: 'VI:s0' },
      { id: 's1', text: 'VI:s1' },
      { id: 's2', text: 'VI:s2' }
    ])
    expect(result).toMatchObject({ provider: 'openai-compatible', model: 'gemini-flash-latest' })
  })

  it('asks again for only the ids that came back missing', async () => {
    const asked: string[][] = []
    const fetchImpl = (async (_url, init) => {
      const ids = idsOf(init as RequestInit)
      asked.push(ids)
      // First answer drops the last segment; the retry must carry only that one.
      return completionFor(asked.length === 1 ? ids.slice(0, -1) : ids)
    }) as typeof fetch

    const result = await provider(fetchImpl).translate(request(3))
    expect(asked).toEqual([['s0', 's1', 's2'], ['s2']])
    expect(result.items.map((item) => item.id).sort()).toEqual(['s0', 's1', 's2'])
  })

  it('ignores ids nobody asked for, and keeps the first of a repeated id', async () => {
    const fetchImpl = (async (_url, init) => {
      const ids = idsOf(init as RequestInit)
      return jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify([
                ...ids.map((id) => ({ id, dst: 'VI:' + id })),
                { id: ids[0], dst: 'BẢN TRÙNG' },
                { id: 'khong-ai-hoi', dst: 'THỪA' }
              ])
            }
          }
        ]
      })
    }) as typeof fetch

    const result = await provider(fetchImpl).translate(request(2))
    expect(result.items).toEqual([
      { id: 's0', text: 'VI:s0' },
      { id: 's1', text: 'VI:s1' }
    ])
  })

  it('keeps the segments it did get when one stays missing after every try', async () => {
    let calls = 0
    const fetchImpl = (async (_url, init) => {
      calls++
      const ids = idsOf(init as RequestInit)
      // The last segment never comes back, however many times it is asked for.
      return completionFor(ids.filter((id) => id !== 's2'))
    }) as typeof fetch

    const result = await provider(fetchImpl).translate(request(3))
    expect(calls).toBe(3)
    // Throwing here would throw away two good translations the user already paid for.
    expect(result.items.map((item) => item.id)).toEqual(['s0', 's1'])
  })

  it('gives up on a batch after a bounded number of tries instead of looping', async () => {
    let calls = 0
    const fetchImpl = (async () => {
      calls++
      return jsonResponse({ choices: [{ message: { content: '[]' } }] })
    }) as typeof fetch

    await expect(provider(fetchImpl).translate(request(1))).rejects.toThrow(ProviderError)
    expect(calls).toBe(3)
  })

  it('sends the key as a bearer token, and sends none when there is no key', async () => {
    const seen: Array<string | null> = []
    const fetchImpl = (async (_url, init) => {
      const headers = new Headers((init as RequestInit).headers)
      seen.push(headers.get('authorization'))
      return completionFor(idsOf(init as RequestInit))
    }) as typeof fetch

    await provider(fetchImpl).translate(request(1))
    await provider(fetchImpl, keySource([{ id: null, secret: null }])).translate(request(1))
    expect(seen).toEqual(['Bearer SECRET', null])
  })

  it('reports a good call so the key stops being counted as failing', async () => {
    const keys = keySource()
    const fetchImpl = (async (_url, init) =>
      completionFor(idsOf(init as RequestInit))) as typeof fetch
    await provider(fetchImpl, keys).translate(request(1))
    expect(keys.reports).toEqual([{ keyId: 'k1', outcome: 'ok' }])
  })

  it('reports a classified failure, with the delay read from the body', async () => {
    const keys = keySource()
    const body = {
      error: {
        message: 'Resource has been exhausted',
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '30s' }]
      }
    }
    const fetchImpl = (async () => jsonResponse(body, 429)) as typeof fetch

    await expect(provider(fetchImpl, keys).translate(request(1))).rejects.toMatchObject({
      kind: 'rate_limited'
    })
    expect(keys.reports[0]).toMatchObject({
      keyId: 'k1',
      outcome: { kind: 'rate_limited', retryAfterMs: 30_000, quotaScope: 'minute' }
    })
  })

  it('stops with a clear error when every key is frozen', async () => {
    const keys = keySource([{ exhausted: true, recoverAt: NOW + 5_000 }])
    const fetchImpl = (async () => completionFor(['s0'])) as typeof fetch
    await expect(provider(fetchImpl, keys).translate(request(1))).rejects.toMatchObject({
      kind: 'rate_limited',
      retryAfterMs: 5_000
    })
  })

  it('does not retry a request the provider rejects', async () => {
    let calls = 0
    const fetchImpl = (async () => {
      calls++
      return jsonResponse({ error: { message: 'Nội dung bị từ chối' } }, 400)
    }) as typeof fetch

    await expect(provider(fetchImpl).translate(request(1))).rejects.toMatchObject({
      kind: 'invalid_request'
    })
    expect(calls).toBe(1)
  })

  it('does not retry a block the provider says was a safety filter', async () => {
    let calls = 0
    const fetchImpl = (async () => {
      calls++
      return jsonResponse({ error: { message: 'blocked', blockReason: 'PROHIBITED_CONTENT' } }, 400)
    }) as typeof fetch

    await expect(provider(fetchImpl).translate(request(1))).rejects.toMatchObject({
      kind: 'refused',
      filter: { group: 'prohibited', raw: 'PROHIBITED_CONTENT' }
    })
    expect(calls).toBe(1)
  })

  it('turns a transport failure into a network error, not a crash', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof fetch
    await expect(provider(fetchImpl).translate(request(1))).rejects.toMatchObject({
      kind: 'network'
    })
  })

  describe('who retries what (change `ai-gateway`)', () => {
    it('counts a retry for a network failure apart from the retries for missing ids', async () => {
      // One network failure, then three answers that each miss an id, then the full answer. Under one shared
      // budget of three the batch would have run out of tries before the full answer; with two separate
      // counters the network failure costs the content budget nothing.
      const replies: Array<() => Response> = [
        () => {
          throw new TypeError('fetch failed')
        },
        () => completionFor(['s0']),
        () => completionFor(['s1']),
        () => completionFor(['s2'])
      ]
      let calls = 0
      const fetchImpl = (async () =>
        replies[Math.min(calls++, replies.length - 1)]!()) as typeof fetch

      const result = await provider(fetchImpl).translate(request(3))
      expect(result.items.map((item) => item.id).sort()).toEqual(['s0', 's1', 's2'])
      expect(calls).toBe(4)
    })

    it('does not retry content when the failure is the network: the gateway already did, then it stopped', async () => {
      let calls = 0
      const fetchImpl = (async () => {
        calls++
        throw new TypeError('fetch failed')
      }) as typeof fetch
      await expect(provider(fetchImpl).translate(request(1))).rejects.toMatchObject({
        kind: 'network'
      })
      // The first try and the gateway's two retries. Not 3 x 3: the content loop does not retry the wire.
      expect(calls).toBe(3)
    })

    it('says the answer was cut off, and why that matters, when the endpoint ran out of room', async () => {
      const fetchImpl = (async () =>
        jsonResponse({
          choices: [{ message: { content: '[{"id":"s0","dst":"VI' }, finish_reason: 'length' }]
        })) as typeof fetch
      const error = await provider(fetchImpl)
        .translate(request(1))
        .catch((e: unknown) => e)
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).kind).toBe('invalid_response')
      expect((error as ProviderError).message).toContain('bị cắt')
    })

    it('counts a cut-off answer as a good use of the key: the key worked, the answer was too long', async () => {
      const keys = keySource()
      const fetchImpl = (async () =>
        jsonResponse({
          choices: [{ message: { content: '[{"id"' }, finish_reason: 'length' }]
        })) as typeof fetch
      await provider(fetchImpl, keys)
        .translate(request(1))
        .catch(() => undefined)
      expect(keys.reports.every((report) => report.outcome === 'ok')).toBe(true)
    })

    it('moves to the next key inside one call, so the batch is asked for once, not twice', async () => {
      const keys = keySource([
        { id: 'k1', secret: 'KEY-ONE' },
        { id: 'k2', secret: 'KEY-TWO' }
      ])
      const seen: Array<string | null> = []
      const fetchImpl = (async (_url: string, init?: RequestInit) => {
        const authorization = new Headers(init?.headers).get('authorization')
        seen.push(authorization)
        if (authorization === 'Bearer KEY-ONE')
          return jsonResponse({ error: { message: 'slow down' } }, 429)
        return completionFor(idsOf(init))
      }) as typeof fetch

      // The fake key source hands out its leases in order and never freezes anything, so the second acquire
      // is KEY-TWO. What this pins down: one `translate` call, one answer, and the missing-id counter untouched.
      const result = await provider(fetchImpl, keys).translate(request(2))
      expect(result.items).toHaveLength(2)
      expect(seen).toEqual(['Bearer KEY-ONE', 'Bearer KEY-TWO'])
    })
  })

  it('reports a cancelled request as cancelled', async () => {
    const controller = new AbortController()
    const fetchImpl = (async () => {
      controller.abort()
      throw new DOMException('aborted', 'AbortError')
    }) as typeof fetch
    await expect(
      provider(fetchImpl).translate(request(1), { signal: controller.signal })
    ).rejects.toMatchObject({ kind: 'cancelled' })
  })
})

describe('listModels', () => {
  it('lists models and strips the models/ prefix', async () => {
    const fetchImpl = (async () =>
      jsonResponse({
        data: [{ id: 'models/gemini-flash-latest' }, { id: 'gpt-x' }]
      })) as typeof fetch
    await expect(provider(fetchImpl).listModels()).resolves.toEqual({
      models: ['gemini-flash-latest', 'gpt-x'],
      listed: true
    })
  })

  it('treats a missing /models endpoint as connected but not listable', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ error: { message: 'no such route' } }, 404)) as typeof fetch
    await expect(provider(fetchImpl).listModels()).resolves.toEqual({ models: [], listed: false })
  })

  it('still fails loudly on a bad key', async () => {
    const fetchImpl = (async () =>
      jsonResponse({ error: { message: 'API key not valid' } }, 401)) as typeof fetch
    await expect(provider(fetchImpl).listModels()).rejects.toMatchObject({ kind: 'auth' })
  })

  it('still fails loudly when nothing answers at the address', async () => {
    const fetchImpl = (async () => jsonResponse({}, 503)) as typeof fetch
    await expect(provider(fetchImpl).listModels()).rejects.toMatchObject({ kind: 'network' })
  })

  /**
   * Regression, 2026-10-02. Listing used to go out with **no `Authorization` header**, and the
   * symptom was not an auth error: Gemini answers an unauthenticated `GET /v1beta/openai/models`
   * with **404 "Requested entity was not found."**, which classifies as `refused` and so landed in
   * the "connected but not listable" branch above. The settings screen then showed a healthy
   * connection with no models at all.
   *
   * Every test in this block asserted the return value and none asserted the request, which is why
   * the suite was green while the feature was broken.
   */
  it('sends the key, like every other call', async () => {
    let sent: Record<string, string> = {}
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      sent = (init?.headers ?? {}) as Record<string, string>
      return jsonResponse({ data: [{ id: 'gemini-flash-latest' }] })
    }) as typeof fetch

    await provider(fetchImpl).listModels()
    expect(sent.authorization).toBe('Bearer SECRET')
  })

  it('sends no key when the connection has none, so a local gateway still works', async () => {
    let sent: Record<string, string> = {}
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      sent = (init?.headers ?? {}) as Record<string, string>
      return jsonResponse({ data: [] })
    }) as typeof fetch

    const keys = keySource([{ id: null, secret: null }])
    await provider(fetchImpl, keys).listModels()
    expect(sent.authorization).toBeUndefined()
    expect(keys.reports).toEqual([])
  })

  it('records a successful listing as a good use of the key', async () => {
    const keys = keySource()
    const fetchImpl = (async () => jsonResponse({ data: [{ id: 'x' }] })) as typeof fetch
    await provider(fetchImpl, keys).listModels()
    expect(keys.reports).toEqual([{ keyId: 'k1', outcome: 'ok' }])
  })

  // An endpoint that genuinely has no /models must not cost the key anything: `decideFreeze` leaves
  // everything but `auth` and `rate_limited` alone, and this is what hands it that decision.
  it('reports a missing /models endpoint without blaming the key', async () => {
    const keys = keySource()
    const fetchImpl = (async () =>
      jsonResponse({ error: { message: 'no such route' } }, 404)) as typeof fetch

    await provider(fetchImpl, keys).listModels()
    expect(keys.reports[0]?.outcome).toMatchObject({ kind: 'invalid_request' })
  })
})

describe('settings of a model entry', () => {
  /** A provider built the way `ConnectionService` builds one for an entry. */
  function entryProvider(
    fetchImpl: typeof fetch,
    over: Partial<ConstructorParameters<typeof OpenAiCompatibleProvider>[0]> = {}
  ): OpenAiCompatibleProvider {
    return new OpenAiCompatibleProvider({
      baseUrl: 'http://127.0.0.1:8317/v1',
      model: 'gemini-2.5-flash',
      keys: keySource(),
      fetchImpl,
      sleep: async () => {},
      now: () => NOW,
      ...over
    })
  }

  /** Records every body that was sent, and answers a translation of whatever ids it was asked about. */
  function recording(): { fetchImpl: typeof fetch; bodies: Array<Record<string, unknown>> } {
    const bodies: Array<Record<string, unknown>> = []
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return completionFor(idsOf(init))
    }) as typeof fetch
    return { fetchImpl, bodies }
  }

  describe('complete', () => {
    it('sends the response format of the call, and none when the call has none', async () => {
      const { fetchImpl, bodies } = recording()
      const provider = entryProvider(fetchImpl, { generation: { temperature: 0.3 } })
      const messages = [
        { role: 'system' as const, content: 'x' },
        { role: 'user' as const, content: '[{"id":"[1]","src":"a"}]' }
      ]
      await provider.complete(messages, { responseFormat: { type: 'json_object' } })
      await provider.complete(messages)
      expect(bodies[0]).toMatchObject({
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
      expect(bodies[1]).not.toHaveProperty('response_format')
    })
  })

  describe('translate', () => {
    it('sends the request it always sent when the entry has no settings', async () => {
      const { fetchImpl, bodies } = recording()
      await entryProvider(fetchImpl, { generation: {} }).translate(request(2))
      expect(Object.keys(bodies[0]!).sort()).toEqual(['messages', 'model'])
    })

    it('sends the generation parameters of the entry with every batch', async () => {
      const { fetchImpl, bodies } = recording()
      // Big enough for several batches at the default size, so "every batch" is a real claim.
      await entryProvider(fetchImpl, {
        generation: { temperature: 0.3, topP: 0.9, reasoningEffort: 'none', maxTokens: 4000 }
      }).translate(request(40, 200))
      expect(bodies.length).toBeGreaterThan(1)
      for (const body of bodies) {
        expect(body).toMatchObject({
          temperature: 0.3,
          top_p: 0.9,
          reasoning_effort: 'none',
          max_completion_tokens: 4000
        })
      }
    })

    it('cuts the work into more batches when the input limit is smaller', async () => {
      const a = recording()
      await entryProvider(a.fetchImpl).translate(request(40, 200))
      const b = recording()
      await entryProvider(b.fetchImpl, { inputTokenLimit: 400 }).translate(request(40, 200))
      expect(b.bodies.length).toBeGreaterThan(a.bodies.length)
    })

    it('cuts the work into fewer batches when the input limit is larger', async () => {
      const a = recording()
      await entryProvider(a.fetchImpl).translate(request(40, 200))
      const b = recording()
      await entryProvider(b.fetchImpl, { inputTokenLimit: 6000 }).translate(request(40, 200))
      expect(b.bodies.length).toBeLessThan(a.bodies.length)
    })

    it('treats an input limit of 0 as the default size', async () => {
      const a = recording()
      await entryProvider(a.fetchImpl).translate(request(40, 200))
      const b = recording()
      await entryProvider(b.fetchImpl, { inputTokenLimit: 0 }).translate(request(40, 200))
      expect(b.bodies.length).toBe(a.bodies.length)
    })

    it('cuts a batch the plan made with the same limit exactly as the plan did', async () => {
      // A batch the planner cut at 800 must go out as one call: if the provider cut it again at the default
      // size, one planned batch would become two requests.
      const planned = splitIntoBatches(request(40, 200).segments, 3000)
      const { fetchImpl, bodies } = recording()
      const entry = entryProvider(fetchImpl, { inputTokenLimit: 3000 })
      for (const batch of planned) await entry.translate({ ...request(0), segments: batch })
      expect(bodies).toHaveLength(planned.length)
    })
  })

  describe('chat', () => {
    it('sends the generation parameters of the entry', async () => {
      const bodies: Array<Record<string, unknown>> = []
      const fetchImpl = (async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        return new Response('data: [DONE]\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' }
        })
      }) as typeof fetch
      const chat = entryProvider(fetchImpl, {
        generation: { temperature: 0.3, reasoningEffort: 'low', extraBody: { top_k: 5 } }
      }).chat([{ role: 'user', content: 'xin chào' }])
      for await (const event of chat) void event
      expect(bodies[0]).toMatchObject({ temperature: 0.3, reasoning_effort: 'low', top_k: 5 })
    })
  })

  describe('probe', () => {
    it('sends one small request with exactly the entry settings, and reports time and tokens', async () => {
      const bodies: Array<Record<string, unknown>> = []
      let clock = NOW
      const fetchImpl = (async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        clock += 420
        return jsonResponse({
          choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 12, completion_tokens: 2, total_tokens: 14 }
        })
      }) as typeof fetch
      const result = await entryProvider(fetchImpl, {
        now: () => clock,
        generation: { temperature: 0.3, reasoningEffort: 'none' }
      }).probe()

      expect(bodies).toHaveLength(1)
      expect(bodies[0]).toMatchObject({
        model: 'gemini-2.5-flash',
        temperature: 0.3,
        reasoning_effort: 'none'
      })
      expect(result.ms).toBe(420)
      expect(result.usage).toMatchObject({ inputTokens: 12, outputTokens: 2 })
    })

    it('sends nothing extra for an entry with no settings', async () => {
      const bodies: Array<Record<string, unknown>> = []
      const fetchImpl = (async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        return jsonResponse({ choices: [{ message: { content: 'OK' } }] })
      }) as typeof fetch
      await entryProvider(fetchImpl).probe()
      expect(Object.keys(bodies[0]!).sort()).toEqual(['messages', 'model'])
    })

    it('throws what the provider said, and asks once, when a setting is refused', async () => {
      let calls = 0
      const keys = keySource()
      const fetchImpl = (async () => {
        calls++
        return jsonResponse(
          { error: { code: 400, message: 'Unsupported value: temperature does not support 0.3' } },
          400
        )
      }) as typeof fetch
      const error = await entryProvider(fetchImpl, {
        keys,
        generation: { temperature: 0.3 }
      })
        .probe()
        .catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).kind).toBe('invalid_request')
      expect((error as ProviderError).message).toContain('temperature does not support 0.3')
      // Not tried again without the setting, and not tried again at all: a 400 about the request does not
      // improve by repeating it, and dropping the setting is the person's decision.
      expect(calls).toBe(1)
    })

    it('does not blame the key for a setting the provider refused', async () => {
      const keys = keySource()
      const fetchImpl = (async () =>
        jsonResponse(
          { error: { code: 400, message: 'Unsupported parameter' } },
          400
        )) as typeof fetch
      await entryProvider(fetchImpl, { keys, generation: { temperature: 0.3 } })
        .probe()
        .catch(() => undefined)
      // `invalid_request` leaves the key alone; the same 400 for a bad key is `auth`, and Gemini says that
      // differently.
      expect(keys.reports[0]?.outcome).toMatchObject({ kind: 'invalid_request' })
    })

    it('stops at once when cancelled, without sending anything', async () => {
      let calls = 0
      const fetchImpl = (async () => {
        calls++
        return jsonResponse({ choices: [{ message: { content: 'OK' } }] })
      }) as typeof fetch
      const controller = new AbortController()
      controller.abort()
      const error = await entryProvider(fetchImpl)
        .probe(controller.signal)
        .catch((caught: unknown) => caught)
      expect((error as ProviderError).kind).toBe('cancelled')
      expect(calls).toBe(0)
    })
  })
})
