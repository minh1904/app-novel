/**
 * The first-connection flow (spec `ai-onboarding`, design D9 of change `hermes-settings-modal`), after
 * Hermes Desktop's onboarding store (apps/desktop/src/store/onboarding.ts). Pure: the component dispatches
 * events and renders the state; nothing here touches IPC.
 *
 * The OAuth states of Hermes (`polling`, `external_pending`) come with change `subscription-providers`.
 */

export type OnboardingForm =
  | { step: 'idle'; showAll: boolean }
  | { step: 'key_form'; providerId: string }
  | { step: 'endpoint_form'; baseUrl: string; label: string }

export type OnboardingState =
  | OnboardingForm
  | { step: 'connecting'; label: string; form: OnboardingForm }
  | { step: 'confirm_model'; connectionId: string }
  | { step: 'error'; label: string; message: string; detail: string | null; form: OnboardingForm }

export type OnboardingEvent =
  | { type: 'toggle_all' }
  | { type: 'pick_key'; providerId: string }
  | { type: 'pick_endpoint'; baseUrl: string; label: string }
  | { type: 'submit'; label: string }
  | { type: 'connected'; connectionId: string }
  | { type: 'failed'; message: string; detail?: string | null }
  | { type: 'retry' }
  | { type: 'back' }

export const INITIAL_ONBOARDING: OnboardingState = { step: 'idle', showAll: false }

function isForm(state: OnboardingState): state is OnboardingForm {
  return state.step === 'idle' || state.step === 'key_form' || state.step === 'endpoint_form'
}

export function onboardingReducer(state: OnboardingState, event: OnboardingEvent): OnboardingState {
  switch (event.type) {
    case 'toggle_all':
      return state.step === 'idle' ? { ...state, showAll: !state.showAll } : state
    case 'pick_key':
      return { step: 'key_form', providerId: event.providerId }
    case 'pick_endpoint':
      return { step: 'endpoint_form', baseUrl: event.baseUrl, label: event.label }
    case 'submit':
      return isForm(state) ? { step: 'connecting', label: event.label, form: state } : state
    case 'connected':
      return state.step === 'connecting'
        ? { step: 'confirm_model', connectionId: event.connectionId }
        : state
    case 'failed':
      return state.step === 'connecting'
        ? {
            step: 'error',
            label: state.label,
            message: event.message,
            detail: event.detail ?? null,
            form: state.form
          }
        : state
    case 'retry':
      // Back to the form that failed, with what was chosen still chosen.
      return state.step === 'error' ? state.form : state
    case 'back':
      return INITIAL_ONBOARDING
    default:
      return state
  }
}
