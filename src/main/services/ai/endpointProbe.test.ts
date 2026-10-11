import { describe, expect, it } from 'vitest'
import { alternateBase, probeEndpoint } from './endpointProbe'

type Route = (init: RequestInit | undefined) => Response | Promise<Response>

/** Giả lập fetch phản hồi theo URL; trả về 404 cho URL không khai báo. 'network' giả lập lỗi socket/kết nối mạng. */
function fakeFetch(routes: Record<string, Route | 'network'>): {
  fetch: typeof fetch
  calls: string[]
} {
  const calls: string[] = []
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    calls.push((init?.method ?? 'GET') + ' ' + url)
    const route = routes[url]
    if (route === 'network') throw new TypeError('fetch failed')
    if (!route) return new Response('not found', { status: 404 })
    return route(init)
  }) as typeof fetch
  return { fetch: fetchImpl, calls }
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('alternate base', () => {
  it('adds /v1 to a bare host and removes it from one that has it', () => {
    expect(alternateBase('http://127.0.0.1:8317')).toBe('http://127.0.0.1:8317/v1')
    expect(alternateBase('http://127.0.0.1:8317/v1/')).toBe('http://127.0.0.1:8317')
  })
})

describe('endpoint probe', () => {
  it('finds the list under /v1 when the address was typed without it, and keeps that base', async () => {
    const { fetch } = fakeFetch({
      'http://127.0.0.1:8317/v1/models': () => json({ data: [{ id: 'gemini-2.5-flash' }] }),
      'http://127.0.0.1:8317/v1/chat/completions': () => json({ error: 'bad model' }, 400)
    })
    const result = await probeEndpoint({ baseUrl: 'http://127.0.0.1:8317', fetchImpl: fetch })
    expect(result).toMatchObject({
      ok: true,
      resolvedBaseUrl: 'http://127.0.0.1:8317/v1',
      models: ['gemini-2.5-flash'],
      routeChecked: true
    })
  })

  it('reports a web page as a wrong address', async () => {
    const page = (): Response =>
      new Response('<!doctype html><html></html>', { headers: { 'content-type': 'text/html' } })
    const { fetch } = fakeFetch({
      'https://example.com/models': page,
      'https://example.com/v1/models': page
    })
    const result = await probeEndpoint({ baseUrl: 'https://example.com', fetchImpl: fetch })
    expect(result.ok).toBe(false)
    expect(result.reachable).toBe(true)
    expect(result.message).toContain('trang web')
  })

  it('stops at a rejected key without trying anything else', async () => {
    const { fetch, calls } = fakeFetch({
      'https://api.example.com/v1/models': () => json({ error: 'no' }, 401)
    })
    const result = await probeEndpoint({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-bad',
      fetchImpl: fetch
    })
    expect(result).toMatchObject({ ok: false, keyRejected: true })
    expect(calls).toEqual(['GET https://api.example.com/v1/models'])
  })

  it('says the chat route is missing only on 404, 405 or 501', async () => {
    const { fetch } = fakeFetch({
      'https://api.example.com/v1/models': () => json({ data: [{ id: 'm' }] })
    })
    const result = await probeEndpoint({ baseUrl: 'https://api.example.com/v1', fetchImpl: fetch })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('/chat/completions')
  })

  it('sends the key and a one-token request to the route', async () => {
    let body: unknown = null
    let auth: string | null = null
    const { fetch } = fakeFetch({
      'https://api.example.com/v1/models': () => json({ data: [{ id: 'm1' }, { id: 'm2' }] }),
      'https://api.example.com/v1/chat/completions': (init) => {
        body = JSON.parse(String(init?.body))
        auth = new Headers(init?.headers).get('authorization')
        return json({ choices: [] })
      }
    })
    const result = await probeEndpoint({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-ok',
      model: 'm2',
      fetchImpl: fetch
    })
    expect(result.ok).toBe(true)
    expect(body).toMatchObject({ model: 'm2', max_tokens: 1 })
    expect(auth).toBe('Bearer sk-ok')
  })

  it('cannot reach anything: unreachable, so the caller can still save with a warning', async () => {
    const { fetch } = fakeFetch({
      'http://127.0.0.1:11434/v1/models': 'network',
      'http://127.0.0.1:11434/models': 'network'
    })
    const result = await probeEndpoint({ baseUrl: 'http://127.0.0.1:11434/v1', fetchImpl: fetch })
    expect(result).toMatchObject({ ok: false, reachable: false })
    expect(result.message).toContain('Không kết nối được')
  })

  it('reads model names from an Ollama-style or a Gemini-style list too', async () => {
    const { fetch } = fakeFetch({
      'https://g.example.com/v1beta/openai/models': () =>
        json({ data: [{ id: 'models/gemini-2.5-pro' }] }),
      'https://g.example.com/v1beta/openai/chat/completions': () => json({})
    })
    const result = await probeEndpoint({
      baseUrl: 'https://g.example.com/v1beta/openai/',
      fetchImpl: fetch
    })
    expect(result.models).toEqual(['gemini-2.5-pro'])
  })
})

describe('endpoint probe theo chế độ API', () => {
  it('checks /responses for a gateway set to Responses', async () => {
    const { fetch, calls } = fakeFetch({
      'http://127.0.0.1:8317/v1/models': () => json({ data: [{ id: 'gpt-5.5' }] }),
      'http://127.0.0.1:8317/v1/responses': (init) => {
        expect(JSON.parse(String(init?.body))).toMatchObject({ model: 'gpt-5.5', input: 'ping' })
        return json({ error: { message: 'bad request' } }, 400)
      }
    })
    const result = await probeEndpoint({
      baseUrl: 'http://127.0.0.1:8317/v1',
      apiMode: 'responses',
      fetchImpl: fetch
    })
    expect(result).toMatchObject({ ok: true, routeChecked: true })
    expect(calls).toContain('POST http://127.0.0.1:8317/v1/responses')
  })

  it('says a gateway that does not serve /responses does not', async () => {
    const { fetch } = fakeFetch({
      'http://127.0.0.1:8317/v1/models': () => json({ data: [{ id: 'gpt-5.5' }] })
    })
    const result = await probeEndpoint({
      baseUrl: 'http://127.0.0.1:8317/v1',
      apiMode: 'responses',
      fetchImpl: fetch
    })
    expect(result).toMatchObject({ ok: false, routeChecked: true })
    expect(result.message).toContain('/responses (HTTP 404)')
  })

  it('checks /v1/messages with Anthropic headers, and never doubles /v1', async () => {
    const seen: Array<Record<string, string>> = []
    const { fetch, calls } = fakeFetch({
      'https://api.anthropic.com/v1/models': (init) => {
        seen.push(init?.headers as Record<string, string>)
        return json({ data: [{ id: 'claude-sonnet-4-6' }] })
      },
      'https://api.anthropic.com/v1/messages': () => json({ id: 'msg' })
    })
    const result = await probeEndpoint({
      baseUrl: 'https://api.anthropic.com/v1',
      apiKey: 'sk-ant-api03-x',
      fetchImpl: fetch
    })
    expect(result).toMatchObject({ ok: true, resolvedBaseUrl: 'https://api.anthropic.com' })
    expect(calls).toEqual([
      'GET https://api.anthropic.com/v1/models',
      'POST https://api.anthropic.com/v1/messages'
    ])
    expect(seen[0]).toMatchObject({
      'x-api-key': 'sk-ant-api03-x',
      'anthropic-version': '2023-06-01'
    })
  })
})
