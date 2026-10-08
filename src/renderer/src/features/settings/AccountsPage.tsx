import { useCallback, useReducer, useState, type JSX } from 'react'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { CheckCircleIcon } from '@solar-icons/react/linear/check-circle'
import { DangerCircleIcon } from '@solar-icons/react/linear/danger-circle'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { TrashBinTrashIcon } from '@solar-icons/react/linear/trash-bin-trash'
import { UserCircleIcon } from '@solar-icons/react/linear/user-circle'
import {
  USAGE_WARN_BELOW,
  usageChip,
  type AccountProvider,
  type UsageWindowView
} from '../../../../shared/contracts/aiAccounts'
import type { ConnectionView } from '../../../../shared/contracts/aiConnections'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { Dialog } from '../../components/Dialog'
import { focusRing } from '../../components/focusRing'
import { SettingsSection } from '../../components/Setting'
import { useConnectionStore } from '../../stores/connectionStore'
import { notify } from '../../stores/notificationStore'
import { useUiStore } from '../../stores/uiStore'
import { FlowPanel } from '../onboarding/AccountFlow'
import { useAccountLogin } from '../onboarding/accountLogin'
import { useAccountUsage } from './accountUsage'
import { ConfirmModel } from '../onboarding/Onboarding'
import {
  ACCOUNT_LABELS,
  INITIAL_ONBOARDING,
  onboardingReducer
} from '../onboarding/onboardingMachine'

/**
 * Cài đặt › Kết nối AI › Tài khoản (change `subscription-providers`, spec `subscription-login`): log in with
 * a ChatGPT or Copilot plan by device code, see who is logged in, log in again when a refresh was refused,
 * and disconnect. Claude is not a login here: it leads to the Anthropic key card.
 */

const ACCOUNT_CARDS: ReadonlyArray<{ id: AccountProvider; flow: string }> = [
  {
    id: 'codex',
    flow: 'Mở trang xác minh trên trình duyệt; Mira tự kết nối khi bạn nhập mã.'
  },
  {
    id: 'copilot',
    flow: 'Mở trang xác minh của GitHub; Mira tự kết nối khi bạn nhập mã.'
  }
]

const TERMS_NOTE =
  'Đăng nhập dùng cách giống công cụ chính hãng; nhà cung cấp có thể đổi hoặc chặn cách này.'

function formatReset(at: number | null): string {
  if (at === null) return ''
  return (
    ' · đặt lại ' +
    new Date(at).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    })
  )
}

/** "Còn 8 % · đặt lại …", only below 20 %, in warning colours below 10 %. */
export function UsageChip({ windows }: { windows: UsageWindowView[] }): JSX.Element | null {
  const chip = usageChip(windows)
  if (!chip) return null
  const warn = chip.remainingPercent < USAGE_WARN_BELOW
  return (
    <span
      className={cx(
        'inline-flex h-5 items-center rounded-control px-1.5 text-ui-2xs',
        warn ? 'bg-warning/15 text-warning' : 'bg-control text-ink-muted'
      )}
    >
      {(chip.kind === 'week' ? 'Tuần: ' : chip.kind === 'session' ? 'Phiên: ' : '') +
        'Còn ' +
        Math.round(chip.remainingPercent) +
        ' %' +
        formatReset(chip.resetsAt)}
    </span>
  )
}

/** The chip of an account connection, for the model menu's group header; nothing for other connections. */
export function AccountUsageChip({
  connection
}: {
  connection: ConnectionView | undefined
}): JSX.Element | null {
  const windows = useAccountUsage(connection)
  return <UsageChip windows={windows} />
}

/** An account that is logged in: who, its limits, and the ways to log in again or disconnect. */
export function ConnectedCard({
  provider,
  connection,
  onRelogin
}: {
  provider: AccountProvider
  connection: ConnectionView
  onRelogin(): void
}): JSX.Element {
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const windows = useAccountUsage(connection)
  const label = ACCOUNT_LABELS[provider]
  const relogin = connection.account?.state === 'relogin'

  async function disconnect(): Promise<void> {
    setConfirming(false)
    setRemoving(true)
    const result = await window.mira.ai.accounts.disconnect(connection.id)
    setRemoving(false)
    if (!result.ok) {
      notify({ kind: 'error', title: label, message: result.error.message })
      return
    }
    await useConnectionStore.getState().reload()
    await useConnectionStore.getState().loadPreferences()
    notify({ kind: 'success', title: label, message: 'Đã ngắt kết nối.' })
  }

  return (
    <div
      data-setting-id={'account:' + provider}
      className="flex items-center justify-between gap-3 rounded-control bg-control px-3 py-2.5"
    >
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 text-ui-sm font-semibold">
          {label}
          {relogin ? (
            <span className="inline-flex items-center gap-1 text-ui-xs font-normal text-error">
              <DangerCircleIcon size={12} aria-hidden="true" />
              Cần đăng nhập lại
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-ui-xs font-normal text-success">
              <CheckCircleIcon size={12} aria-hidden="true" />
              Đã kết nối
            </span>
          )}
          <UsageChip windows={windows} />
        </span>
        <span className="mt-1 truncate text-ui-xs text-ink-muted">
          {connection.account?.label ?? 'Tài khoản đã đăng nhập'} · {connection.models.length} model
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {relogin && (
          <Button size="sm" onClick={onRelogin}>
            Đăng nhập lại
          </Button>
        )}
        <Button
          variant="ghost-muted"
          size="icon"
          aria-label={'Ngắt ' + label}
          title={'Ngắt ' + label}
          disabled={removing}
          onClick={() => setConfirming(true)}
        >
          {removing ? (
            <RefreshIcon size={14} className="motion-safe:animate-spin" />
          ) : (
            <TrashBinTrashIcon size={14} />
          )}
        </Button>
      </span>
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title={'Ngắt ' + label + '?'}
        description="Token đăng nhập bị xóa khỏi máy này. Model chính hay dự phòng trỏ tới tài khoản này cũng bị gỡ."
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost-muted" onClick={() => setConfirming(false)}>
            Giữ
          </Button>
          <Button variant="destructive" onClick={() => void disconnect()}>
            Ngắt
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

/** Cài đặt › Kết nối AI › Tài khoản. */
export function AccountsPage(): JSX.Element {
  const openSettings = useUiStore((state) => state.openSettings)
  const connections = useConnectionStore((state) => state.connections)
  const [flow, dispatch] = useReducer(onboardingReducer, INITIAL_ONBOARDING)
  const onConnected = useCallback((connectionId: string) => {
    const name = useConnectionStore
      .getState()
      .connections.find((item) => item.id === connectionId)?.name
    notify({ kind: 'success', title: name ?? 'Tài khoản', message: 'Đã kết nối.' })
  }, [])
  useAccountLogin(flow, dispatch, onConnected)

  const accountOf = (provider: AccountProvider): ConnectionView | undefined =>
    connections.find((item) => item.oauthProvider === provider)
  const connected = ACCOUNT_CARDS.filter((card) => accountOf(card.id))
  const others = ACCOUNT_CARDS.filter((card) => !accountOf(card.id))

  return (
    <SettingsSection
      title="Kết nối tài khoản"
      icon={<UserCircleIcon size={16} />}
      aside={
        <Button
          variant="text"
          size="xs"
          onClick={() => openSettings({ group: 'connections', page: 'keys' })}
        >
          Có khóa API?
        </Button>
      }
    >
      <p className="m-0 mb-2 text-ui-xs text-ink-muted">
        Đăng nhập bằng gói thuê bao, không cần sao chép khóa.
      </p>

      {(flow.step === 'starting' || flow.step === 'polling') && (
        <div className="rounded-panel border border-line-strong p-3">
          <FlowPanel state={flow} onCancel={() => dispatch({ type: 'back' })} />
        </div>
      )}
      {flow.step === 'confirm_model' && (
        <div className="rounded-panel border border-line-strong p-3">
          <ConfirmModel
            connectionId={flow.connectionId}
            onBegin={(entryId) => {
              void useConnectionStore
                .getState()
                .setMainModel({ connectionId: flow.connectionId, entryId })
              dispatch({ type: 'back' })
            }}
          />
        </div>
      )}
      {flow.step === 'error' && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-panel border border-error/40 bg-error/5 p-3"
        >
          <p className="m-0 flex items-start gap-2 text-ui-sm">
            <DangerCircleIcon size={16} className="mt-0.5 shrink-0 text-error" />
            <span>
              {flow.message.startsWith('Đăng nhập')
                ? flow.message
                : 'Đăng nhập ' + flow.label + ' chưa xong. ' + flow.message}
            </span>
          </p>
          {flow.detail && (
            <details className="text-ui-xs text-ink-muted">
              <summary className="cursor-pointer">Chi tiết</summary>
              <pre className="selectable mt-1 whitespace-pre-wrap">{flow.detail}</pre>
            </details>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost-muted" onClick={() => dispatch({ type: 'back' })}>
              Chọn nhà cung cấp khác
            </Button>
            <Button
              variant="outline"
              onClick={() => openSettings({ group: 'connections', page: 'keys' })}
            >
              Dùng khóa API
            </Button>
            <Button onClick={() => dispatch({ type: 'retry' })}>Thử lại</Button>
          </div>
        </div>
      )}

      {connected.length > 0 && (
        <>
          <span className="mt-3 block px-0.5 text-ui-xs font-medium text-ink-faint">
            Đã kết nối
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {connected.map((card) => (
              <ConnectedCard
                key={card.id}
                provider={card.id}
                connection={accountOf(card.id)!}
                onRelogin={() => dispatch({ type: 'pick_account', provider: card.id })}
              />
            ))}
          </div>
        </>
      )}

      <span className="mt-3 block px-0.5 text-ui-xs font-medium text-ink-faint">
        Nhà cung cấp khác
      </span>
      <div className="mt-1 flex flex-col gap-1">
        {others.map((card) => (
          <button
            key={card.id}
            type="button"
            data-setting-id={'account:' + card.id}
            disabled={flow.step === 'starting' || flow.step === 'polling'}
            onClick={() => dispatch({ type: 'pick_account', provider: card.id })}
            className={cx(
              'flex items-center justify-between gap-3 rounded-control px-3 py-2.5 text-left hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50',
              focusRing
            )}
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-ui-sm font-semibold">{ACCOUNT_LABELS[card.id]}</span>
              <span className="mt-1 text-ui-xs text-ink-muted">{card.flow}</span>
              <span className="mt-0.5 text-ui-2xs text-ink-faint">{TERMS_NOTE}</span>
            </span>
            <AltArrowRightIcon size={14} className="shrink-0 text-ink-faint" />
          </button>
        ))}
        <button
          type="button"
          data-setting-id="account:claude"
          onClick={() =>
            openSettings({ group: 'connections', page: 'keys', key: 'provider:anthropic' })
          }
          className={cx(
            'flex items-center justify-between gap-3 rounded-control px-3 py-2.5 text-left hover:bg-hover',
            focusRing
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-ui-sm font-semibold">Claude</span>
            <span className="mt-1 text-ui-xs text-ink-muted">
              Mira không đăng nhập bằng gói Claude Pro/Max. Dùng khóa API Anthropic hoặc gateway tự
              dựng.
            </span>
          </span>
          <AltArrowRightIcon size={14} className="shrink-0 text-ink-faint" />
        </button>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-ui-2xs text-ink-faint">
        <CheckCircleIcon size={12} aria-hidden="true" />
        {TERMS_NOTE}
      </p>
    </SettingsSection>
  )
}
