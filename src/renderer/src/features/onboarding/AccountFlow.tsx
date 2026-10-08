import { useEffect, useState, type JSX } from 'react'
import { CopyIcon } from '@solar-icons/react/linear/copy'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { Button, LinkButton } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { ACCOUNT_LABELS, type OnboardingState } from './onboardingMachine'

/**
 * Logging in to an account with a device code (change `subscription-providers`, spec `subscription-login`):
 * the panel that shows the code. The driver that talks to main is `useAccountLogin` (`accountLogin.ts`); the
 * onboarding dialog and Settings › Tài khoản use both over the same state machine.
 */

/** The device code as OTP boxes, and a button that copies it and marks the boxes for 1.5 s. */
export function OtpCode({ code }: { code: string }): JSX.Element {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <div className="flex flex-wrap items-center gap-sm">
      <span className="selectable flex flex-wrap items-center gap-1.5" aria-label={'Mã ' + code}>
        {[...code].map((char, index) =>
          char === '-' ? (
            <span key={index} aria-hidden="true" className="px-0.5 text-body-lg text-muted">
              –
            </span>
          ) : (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                'flex size-9 items-center justify-center rounded-sm border font-mono text-body-lg font-semibold transition-colors duration-(--mira-duration-fast)',
                copied
                  ? 'border-strong bg-selected text-link'
                  : 'border-strong bg-muted text-default'
              )}
            >
              {char}
            </span>
          )
        )}
      </span>
      <Button
        variant="ghost"
        leftIcon={<CopyIcon size={16} />}
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => setCopied(true))
        }}
      >
        {copied ? 'Đã chép' : 'Sao chép mã'}
      </Button>
    </div>
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
        <p role="status" className="m-0 flex items-center gap-2 text-body-sm text-subtle">
          <RefreshIcon size={14} className="motion-safe:animate-spin" />
          Đang xin mã đăng nhập {label}…
        </p>
        <Button variant="ghost" className="self-start" onClick={onCancel}>
          Hủy
        </Button>
      </div>
    )
  }
  const { login } = state
  return (
    <div className="flex flex-col gap-3 py-2">
      <p className="m-0 text-body-sm">
        Nhập mã này ở trang xác minh của {label} vừa mở trong trình duyệt:
      </p>
      <OtpCode code={login.userCode} />
      <LinkButton
        className="h-auto self-start"
        onClick={() => void window.mira.ai.accounts.reopen(login.sessionId)}
      >
        Mở lại trang xác minh ↗
      </LinkButton>
      <p role="status" className="m-0 flex items-center gap-2 text-body-xs text-subtle">
        <RefreshIcon size={14} className="motion-safe:animate-spin" />
        Đang chờ bạn xác nhận…
      </p>
      <Button variant="ghost" className="self-start" onClick={onCancel}>
        Hủy
      </Button>
    </div>
  )
}
