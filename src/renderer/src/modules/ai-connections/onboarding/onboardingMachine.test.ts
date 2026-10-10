import { describe, expect, it } from 'vitest'
import {
  INITIAL_ONBOARDING,
  onboardingReducer,
  type OnboardingEvent,
  type OnboardingState
} from './onboardingMachine'

const run = (
  events: OnboardingEvent[],
  from: OnboardingState = INITIAL_ONBOARDING
): OnboardingState => events.reduce(onboardingReducer, from)

describe('onboarding flow', () => {
  it('goes from a key to the model confirmation', () => {
    expect(
      run([
        { type: 'pick_key', providerId: 'google' },
        { type: 'submit', label: 'Google Gemini' },
        { type: 'connected', connectionId: 'c1' }
      ])
    ).toEqual({ step: 'confirm_model', connectionId: 'c1' })
  })

  it('keeps the chosen provider when "Thử lại" follows a failure', () => {
    const failed = run([
      { type: 'pick_key', providerId: 'openrouter' },
      { type: 'submit', label: 'OpenRouter' },
      { type: 'failed', message: 'Khóa bị từ chối', detail: 'HTTP 401' }
    ])
    expect(failed).toMatchObject({ step: 'error', label: 'OpenRouter', detail: 'HTTP 401' })
    expect(onboardingReducer(failed, { type: 'retry' })).toEqual({
      step: 'key_form',
      providerId: 'openrouter'
    })
  })

  it('ignores a late answer once the flow moved on', () => {
    expect(run([{ type: 'connected', connectionId: 'c1' }])).toEqual(INITIAL_ONBOARDING)
    expect(
      run([
        { type: 'pick_key', providerId: 'google' },
        { type: 'failed', message: 'x' }
      ])
    ).toEqual({ step: 'key_form', providerId: 'google' })
  })

  it('opens and closes the other providers, and starts over on back', () => {
    expect(run([{ type: 'toggle_all' }])).toEqual({ step: 'idle', showAll: true })
    expect(
      run([{ type: 'pick_endpoint', baseUrl: 'http://x/v1', label: 'Gateway' }, { type: 'back' }])
    ).toEqual(INITIAL_ONBOARDING)
  })
})

describe('account login (subscription-providers)', () => {
  const login = {
    sessionId: 's1',
    userCode: 'ABCD-1234',
    verificationUrl: 'https://auth.openai.com/codex/device',
    expiresAt: 1
  }

  it('asks for a code, shows it, then confirms the model', () => {
    expect(run([{ type: 'pick_account', provider: 'codex' }])).toEqual({
      step: 'starting',
      provider: 'codex'
    })
    expect(
      run([
        { type: 'pick_account', provider: 'codex' },
        { type: 'started', login }
      ])
    ).toEqual({ step: 'polling', provider: 'codex', login })
    expect(
      run([
        { type: 'pick_account', provider: 'codex' },
        { type: 'started', login },
        { type: 'connected', connectionId: 'c1' }
      ])
    ).toEqual({ step: 'confirm_model', connectionId: 'c1' })
  })

  it('names the account in a failure, and "Thử lại" starts the same login again', () => {
    const failed = run([
      { type: 'pick_account', provider: 'copilot' },
      { type: 'started', login },
      { type: 'failed', message: 'Mã đã hết hạn trước khi bạn xác nhận.', detail: null }
    ])
    expect(failed).toMatchObject({
      step: 'error',
      label: 'GitHub Copilot',
      form: { step: 'account', provider: 'copilot' }
    })
    expect(onboardingReducer(failed, { type: 'retry' })).toEqual({
      step: 'starting',
      provider: 'copilot'
    })
  })

  it('ignores a code that arrives after Hủy', () => {
    expect(
      run([
        { type: 'pick_account', provider: 'codex' },
        { type: 'back' },
        { type: 'started', login }
      ])
    ).toEqual(INITIAL_ONBOARDING)
  })
})
