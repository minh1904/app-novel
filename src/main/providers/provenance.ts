import type { ProvenanceRecord } from '../storage/linkFile'
import { MOCK_PROVIDER_ID } from './mockProvider'
import type { TranslateResponse } from './types'

/**
 * Where a translated segment came from. The mock provider is recorded as `mock`, never as `ai`, so
 * its output cannot be counted or exported as a real machine translation.
 */
export function provenanceFor(
  segmentId: string,
  response: Pick<TranslateResponse, 'provider' | 'model'>,
  at: number
): ProvenanceRecord {
  const isMock = response.provider === MOCK_PROVIDER_ID
  return {
    segmentId,
    origin: isMock ? 'mock' : 'ai',
    provider: response.provider,
    model: response.model,
    at
  }
}
