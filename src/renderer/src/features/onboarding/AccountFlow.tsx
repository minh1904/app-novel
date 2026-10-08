import { useEffect, useState, type JSX } from 'react'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { focusRing } from '../../components/focusRing'
import { ACCOUNT_LABELS, type OnboardingState } from './onboardingMachine'

/**
 * Logging in to an account with a device code (change `subscription-providers`, spec `subscription-login`):
 * the panel that shows the code. The driver that talks to main is `useAccountLogin` (`accountLogin.ts`); the
 * onboarding dialog and Settings › Tài khoản use both over the same state machine.
 */

/** The device code as OTP boxes; a click copies it and flashes the accent for 1.5 s. */
export function OtpCode({ code }: { code: string }): JSX.Element {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <button
      type="button"
      aria-label={'Mã ' + code + ', bấm để sao chép'}
      title="Bấm để sao chép"
      onClick={() => {
        void navigator.clipboard.writeText(code).then(() => setCopied(true))
      }}
      className={cx(
        'flex flex-wrap items-center gap-1.5 self-start rounded-control p-1',
        focusRing
      )}
    >
      {[...code].map((char, index) =>
        char === '-' ? (
          <span key={index} aria-hidden="true" className="px-0.5 text-ui-lg text-ink-faint">
            –
          </span>
        ) : (
          <span
            key={index}
            aria-hidden="true"
            className={cx(
              'flex size-9 items-center justify-center rounded-control border font-mono text-ui-lg font-semibold transition-colors duration-(--duration-fast)',
              copied
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-line-strong bg-control text-ink'
            )}
          >
            {char}
          </span>
        )
      )}
      <span className="ml-2 text-ui-xs text-ink-muted" role="status">
        {copied ? 'Đã chép' : ''}
      </span>
    </button>
  )
}

/** The `starting` and `polling` steps of a login. */
export function FlowPanel({
  state,
  onCancel
}: {
  state: Extract<OnboardingState, { step: 'starting' | 'polling' }>
  onCancel(): void
}): JSX.Element {
  const label = ACCOUNT_LABELS[state.provider]
  if (state.step === 'starting') {
    return (
      <div className="flex flex-col gap-3 py-2">
        <p role="status" className="m-0 flex items-center gap-2 text-ui-sm text-ink-muted">
          <RefreshIcon size={14} className="motion-safe:animate-spin" />
          Đang xin mã đăng nhập {label}…
        </p>
        <Button variant="ghost-muted" className="self-start" onClick={onCancel}>
          Hủy
        </Button>
      </div>
    )
  }
  const { login } = state
  return (
    <div className="flex flex-col gap-3 py-2">
      <p className="m-0 text-ui-sm">
        Nhập mã này ở trang xác minh của {label} vừa mở trong trình duyệt:
      </p>
      <OtpCode code={login.userCode} />
      <Button
        variant="link"
        size="xs"
        className="h-auto self-start"
        onClick={() => void window.mira.ai.accounts.reopen(login.sessionId)}
      >
        Mở lại trang xác minh ↗
      </Button>
      <p role="status" className="m-0 flex items-center gap-2 text-ui-xs text-ink-muted">
        <RefreshIcon size={13} className="motion-safe:animate-spin" />
        Đang chờ bạn xác nhận…
      </p>
      <Button variant="ghost-muted" className="self-start" onClick={onCancel}>
        Hủy
      </Button>
    </div>
  )
}
