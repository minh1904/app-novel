import type { ModelCapabilityView } from '../../../../shared/contracts/modelSettings'

/**
 * How the model is asked to shape its answer (change `translate-structured-output-trial`).
 *
 * `array` is the old contract, a bare JSON array, and the product default. `object` wraps it as
 * `{"items":[…]}` and sends a JSON schema with the request; only the Lab turns it on, until a repeated
 * measurement shows it helps. A schema keeps the syntax, not the meaning: ids are still reconciled in code.
 */
export type OutputMode = 'array' | 'object'

/** Why a run asked for `object` and still went `array`. */
export type OutputModeReason = 'unsupported' | 'user_response_format'

/** What a batch actually used: `object→fallback` is a schema the provider rejected, sent again without. */
export type UsedOutputMode = OutputMode | 'object→fallback'

/**
 * The response schema (D1). Root is an object because OpenAI's structured output requires one. No `enum`
 * of the batch's ids and no item counts: both would make the schema change per batch and grow with it,
 * the kind of schema Google warns may be rejected. Only `type`, `properties`, `items` and `required` are
 * used, all in Google's supported subset.
 */
export const TRANSLATE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          speaker_to_listener: { type: 'string' },
          self_ref: { type: 'string' },
          addr_ref: { type: 'string' },
          dst: { type: 'string' }
        },
        required: ['id', 'dst']
      }
    }
  },
  required: ['items']
} as const

/**
 * The `response_format` field in OpenAI's shape. `strict: false` because the addressing keys are optional;
 * a strict variant would have to make them required (D1, open question).
 */
export const TRANSLATE_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: { name: 'translation', schema: TRANSLATE_RESPONSE_SCHEMA, strict: false }
} as const

/**
 * Which mode a run uses (D5). Called once per run; a batch that falls back moves the rest of the run to
 * `array` on its own.
 */
export function chooseOutputMode(input: {
  requested: boolean
  capability: Pick<ModelCapabilityView, 'structuredOutput'>
  extraBody?: Record<string, unknown>
}): { mode: OutputMode; reason?: OutputModeReason } {
  if (!input.requested) return { mode: 'array' }
  if (!input.capability.structuredOutput) return { mode: 'array', reason: 'unsupported' }
  // The person set their own response_format: theirs is sent, and Mira does not add a second one.
  if (input.extraBody?.response_format !== undefined) {
    return { mode: 'array', reason: 'user_response_format' }
  }
  return { mode: 'object' }
}
