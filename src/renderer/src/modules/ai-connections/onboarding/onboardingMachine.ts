import type { AccountProvider, LoginStart } from '../../../../../shared/contracts/aiAccounts'

/**
 * Máy trạng thái quản lý quy trình kết nối AI ban đầu.
 * Hàm reducer thuần túy: component gửi sự kiện và hiển thị theo trạng thái nhận được, không gọi trực tiếp IPC.
 *
 * Hỗ trợ các trạng thái đăng nhập tài khoản: `starting` (yêu cầu mã thiết bị) và `polling`
 * (hiển thị mã chờ người dùng xác nhận trên trình duyệt). Khi gặp lỗi, lưu lại form để nút "Thử lại"
 * có thể thực hiện lại đúng quy trình trước đó.
 */

export type OnboardingForm =
  | { step: 'idle'; showAll: boolean }
  | { step: 'key_form'; providerId: string }
  | { step: 'endpoint_form'; baseUrl: string; label: string }
  /** Trạng thái nội bộ để nút "Thử lại" quay lại sau khi đăng nhập tài khoản thất bại. */
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
      // Đăng nhập lại từ đầu; với form nhập thì giữ nguyên thông tin đã chọn trước đó.
      return state.form.step === 'account'
        ? { step: 'starting', provider: state.form.provider }
        : state.form
    case 'back':
      return INITIAL_ONBOARDING
    default:
      return state
  }
}
