import type { AccountProvider, LoginStart } from '../../../../shared/contracts/aiAccounts'

/**
 * The first-connection flow (spec `ai-onboarding`, design D9 of change `hermes-settings-modal`), after
 * Hermes Desktop's onboarding store (apps/desktop/src/store/onboarding.ts). Pure: the component dispatches
 * events and renders the state; nothing here touches IPC.
 *
 * Account logins (change `subscription-providers`) add `starting` (asking for a device code) and `polling`
 * (the code is shown, waiting for the person to confirm it in the browser). A failed login comes back to an
 * `error` whose form is the account, so "Thử lại" starts the same login again.
 */

export type OnboardingForm =
  | { step: 'idle'; showAll: boolean }
  | { step: 'key_form'; providerId: string }
  | { step: 'endpoint_form'; baseUrl: string; label: string }
  /** Not shown by itself: where "Thử lại" goes back to after a failed login. */
  | { step: 'account'; provider: AccountProvider }

export type OnboardingState =
  | OnboardingForm
  | { step: 'connecting'; label: string; form: OnboardingForm }
  | { step: 'starting'; provider: AccountProvider }
  | { step: 'polling'; provider: AccountProvider; login: LoginStart }
  | { step: 'confirm_model'; connectionId: string }
  | { step: 'error'; label: string; message: string; detail: string | null; form: OnboardingForm }

export type OnboardingEvent =
  | { type: 'toggle_all' }
  | { type: 'pick_key'; providerId: string }
  | { type: 'pick_endpoint'; baseUrl: string; label: string }
  | { type: 'pick_account'; provider: AccountProvider }
  | { type: 'started'; login: LoginStart }
  | { type: 'submit'; label: string }
  | { type: 'connected'; connectionId: string }
  | { type: 'failed'; message: string; detail?: string | null }
  | { type: 'retry' }
  | { type: 'back' }

export const INITIAL_ONBOARDING: OnboardingState = { step: 'idle', showAll: false }

export const ACCOUNT_LABELS: Record<AccountProvider, string> = {
  codex: 'ChatGPT / Codex',
  copilot: 'GitHub Copilot'
}

function isForm(state: OnboardingState): state is OnboardingForm {
  return (
    state.step === 'idle' ||
    state.step === 'key_form' ||
    state.step === 'endpoint_form' ||
    state.step === 'account'
  )
}

export function onboardingReducer(state: OnboardingState, event: OnboardingEvent): OnboardingState {
  switch (event.type) {
    case 'toggle_all':
      return state.step === 'idle' ? { ...state, showAll: !state.showAll } : state
    case 'pick_key':
      return { step: 'key_form', providerId: event.providerId }
    case 'pick_endpoint':
      return { step: 'endpoint_form', baseUrl: event.baseUrl, label: event.label }
    case 'pick_account':
      return { step: 'starting', provider: event.provider }
    case 'started':
      return state.step === 'starting'
        ? { step: 'polling', provider: state.provider, login: event.login }
        : state
    case 'submit':
      return isForm(state) ? { step: 'connecting', label: event.label, form: state } : state
    case 'connected':
      return state.step === 'connecting' || state.step === 'polling' || state.step === 'starting'
        ? { step: 'confirm_model', connectionId: event.connectionId }
        : state
    case 'failed':
      if (state.step === 'connecting') {
        return {
          step: 'error',
          label: state.label,
          message: event.message,
          detail: event.detail ?? null,
          form: state.form
        }
      }
      if (state.step === 'starting' || state.step === 'polling') {
        return {
          step: 'error',
          label: ACCOUNT_LABELS[state.provider],
          message: event.message,
          detail: event.detail ?? null,
          form: { step: 'account', provider: state.provider }
        }
      }
      return state
    case 'retry':
      if (state.step !== 'error') return state
      // A login starts again; a form comes back with what was chosen still chosen.
      return state.form.step === 'account'
        ? { step: 'starting', provider: state.form.provider }
        : state.form
    case 'back':
      return INITIAL_ONBOARDING
    default:
      return state
  }
}
