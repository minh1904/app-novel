import { describe, expect, it } from 'vitest'
import { resolveCompat } from './compat'
import { AnthropicMessagesTransport } from './anthropicTransport'
import { OpenAiChatTransport } from './openAiChatTransport'
import { ResponsesTransport } from './responsesTransport'
import {
  createTransport,
  guessApiMode,
  selectApiMode,
  type TransportTarget
} from './transportFactory'

const target = (patch: Partial<TransportTarget>): TransportTarget => ({
  baseUrl: 'https://openrouter.ai/api/v1',
  providerId: 'openrouter',
  oauthProvider: null,
  apiMode: 'auto',
  ...patch
})

describe('selectApiMode', () => {
  it('sends Codex to Responses and Anthropic to Messages whatever the model', () => {
    expect(selectApiMode(target({ oauthProvider: 'codex' }), 'gpt-4.1')).toBe('responses')
    expect(selectApiMode(target({ providerId: 'anthropic' }), 'gpt-5.5')).toBe('anthropic_messages')
  })

  it('splits Copilot by model: gpt-5 and later to Responses, but not gpt-5-mini', () => {
    const copilot = target({ oauthProvider: 'copilot' })
    expect(selectApiMode(copilot, 'gpt-5.4')).toBe('responses')
    expect(selectApiMode(copilot, 'gpt-6-sol')).toBe('responses')
    expect(selectApiMode(copilot, 'gpt-5-mini')).toBe('chat_completions')
    expect(selectApiMode(copilot, 'gpt-4.1')).toBe('chat_completions')
    expect(selectApiMode(copilot, 'claude-sonnet-4.6')).toBe('chat_completions')
  })

  it('keeps a mode the person chose, and guesses only for auto', () => {
    expect(selectApiMode(target({ apiMode: 'responses' }), 'x')).toBe('responses')
    expect(selectApiMode(target({}), 'x')).toBe('chat_completions')
    expect(guessApiMode('https://api.anthropic.com')).toBe('anthropic_messages')
    expect(guessApiMode('http://127.0.0.1:8317/anthropic')).toBe('anthropic_messages')
    expect(guessApiMode('http://127.0.0.1:8317/anthropic/v1')).toBe('anthropic_messages')
    expect(guessApiMode('http://127.0.0.1:8317/v1')).toBe('chat_completions')
  })
})

describe('createTransport', () => {
  const deps = {
    fetchImpl: fetch,
    now: () => 1,
    compat: resolveCompat(null),
    userAgent: 'Mira/0.1.0'
  }

  it('builds the transport the mode names', () => {
    expect(createTransport(target({ oauthProvider: 'codex' }), 'gpt-5.5', deps)).toBeInstanceOf(
      ResponsesTransport
    )
    expect(createTransport(target({ providerId: 'anthropic' }), 'claude', deps)).toBeInstanceOf(
      AnthropicMessagesTransport
    )
    expect(createTransport(target({}), 'gpt-4o', deps)).toBeInstanceOf(OpenAiChatTransport)
  })

  it('puts Copilot headers on every call, with x-initiator by round', async () => {
    const seen: Array<Record<string, string>> = []
    const transport = createTransport(target({ oauthProvider: 'copilot' }), 'claude-sonnet-4.6', {
      ...deps,
      fetchImpl: (async (_url: string, init: RequestInit) => {
        seen.push(init.headers as Record<string, string>)
        return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
          status: 200
        })
      }) as typeof fetch
    })
    for (const turnRound of [0, 1, 2]) {
      await transport.complete(
        { model: 'claude-sonnet-4.6', messages: [] },
        { apiKey: 't', turnRound }
      )
    }
    expect(seen.map((headers) => headers['x-initiator'])).toEqual(['user', 'agent', 'agent'])
    expect(seen[0]['Copilot-Integration-Id']).toBe('vscode-chat')
    expect(seen[0]['Editor-Version']).toBe('vscode/1.104.1')
    expect(seen[0]['Openai-Intent']).toBe('conversation-edits')
    expect(seen[0]['User-Agent']).toBe('Mira/0.1.0')
  })

  it('names Mira and routes Codex calls by the account', async () => {
    let headers: Record<string, string> = {}
    let url = ''
    const transport = createTransport(target({ oauthProvider: 'codex' }), 'gpt-5.5', {
      ...deps,
      fetchImpl: (async (to: string, init: RequestInit) => {
        url = to
        headers = init.headers as Record<string, string>
        return new Response(
          'data: {"type":"response.completed","response":{"status":"completed"}}\n\n',
          {
            status: 200
          }
        )
      }) as typeof fetch
    })
    await transport.complete(
      { model: 'gpt-5.5', messages: [] },
      {
        apiKey: 't',
        sessionId: 's1',
        credential: {
          kind: 'oauth',
          provider: 'codex',
          accessToken: 't',
          accountId: 'acc',
          residency: 'eu'
        }
      }
    )
    expect(url).toBe('https://chatgpt.com/backend-api/codex/responses')
    expect(headers).toMatchObject({
      authorization: 'Bearer t',
      'ChatGPT-Account-ID': 'acc',
      'x-openai-internal-codex-residency': 'eu',
      originator: 'mira',
      'User-Agent': 'Mira/0.1.0',
      session_id: 's1'
    })
  })
})
