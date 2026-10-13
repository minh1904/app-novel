import type { ChatMessage } from '../../infra/providers/transports/openAiChatTransport'
import type { ModelInfo } from '../../infra/providers/modelCatalog'

/** Context window assumed when the catalog does not know the model. */
const DEFAULT_CONTEXT_TOKENS = 32_000
const DEFAULT_OUTPUT_TOKENS = 8_192
/** Characters per token, low on purpose: CJK raw runs near one token per character. */
const CHARS_PER_TOKEN = 2

/** shortcut: chars-per-token estimate, not a tokenizer; switch once a provider reports real counts. */
export function contextLimitChars(info: ModelInfo | undefined): number {
  const context = info?.contextLimit ?? DEFAULT_CONTEXT_TOKENS
  const output = Math.min(info?.outputLimit ?? DEFAULT_OUTPUT_TOKENS, context / 2)
  return Math.max(0, (context - output) * CHARS_PER_TOKEN)
}

export interface TurnContextInput {
  /** System policy; tool definitions travel beside the messages but count against the window. */
  system: string
  toolChars: number
  /** Earlier turns of the session, oldest first: only the instruction and the final answer. */
  history: Array<{ instruction: string; answer: string }>
  /** The current instruction with its context snapshot, verbatim. */
  current: string
  /** Tool calls and results of the current turn, in order. */
  rounds: ChatMessage[]
  limitChars: number
}

const size = (message: ChatMessage): number =>
  message.content.length + JSON.stringify(message.tool_calls ?? []).length

/**
 * Lays out one model round (design D6). Over the window, the oldest earlier turns go first; the
 * system policy, the current instruction with its snapshot and the current turn's call/result
 * pairs are never dropped, even if they alone overflow.
 */
export function assembleTurnContext(input: TurnContextInput): {
  messages: ChatMessage[]
  droppedTurns: number
} {
  const system: ChatMessage = { role: 'system', content: input.system }
  const current: ChatMessage = { role: 'user', content: input.current }
  const history = input.history.map((turn): [ChatMessage, ChatMessage] => [
    { role: 'user', content: turn.instruction },
    { role: 'assistant', content: turn.answer }
  ])
  let total =
    input.toolChars +
    size(system) +
    size(current) +
    input.rounds.reduce((sum, message) => sum + size(message), 0) +
    history.reduce((sum, [user, answer]) => sum + size(user) + size(answer), 0)

  let droppedTurns = 0
  while (droppedTurns < history.length && total > input.limitChars) {
    const [user, answer] = history[droppedTurns]
    total -= size(user) + size(answer)
    droppedTurns++
  }
  return {
    messages: [system, ...history.slice(droppedTurns).flat(), current, ...input.rounds],
    droppedTurns
  }
}
