import { useEffect, useReducer, useState, type JSX } from 'react'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { DangerCircleIcon } from '@solar-icons/react/linear/danger-circle'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { CONNECTION_PRESETS } from '../../../../shared/contracts/aiConnections'
import { PROVIDER_CARDS } from '../../../../shared/contracts/aiProviders'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { focusRing } from '../../components/focusRing'
import { TextField } from '../../components/TextField'
import { emptyTest, useConnectionStore } from '../../stores/connectionStore'
import { useUiStore } from '../../stores/uiStore'
import { ModelSelectionMenu } from '../models/ModelSelectionMenu'
import { thinkingPatch } from '../models/modelSettingsForm'
import { INITIAL_ONBOARDING, onboardingReducer, type OnboardingState } from './onboardingMachine'

const GATEWAY = CONNECTION_PRESETS.find((preset) => preset.id === 'gateway')!
const LOCALS = CONNECTION_PRESETS.filter(
  (preset) => preset.id === 'ollama' || preset.id === 'lmstudio'
)
const READY_CARDS = PROVIDER_CARDS.filter((card) => card.support === 'ready')

function openLink(url: string): void {
  void window.mira.openExternal(url).catch(() => undefined)
}

/** One row of the picker: title, how it connects, and a chevron (Hermes `ProviderRow`). */
function ProviderRow({
  title,
  subtitle,
  tag,
  featured = false,
  disabled = false,
  onClick
}: {
  title: string
  subtitle: string
  tag?: JSX.Element
  featured?: boolean
  disabled?: boolean
  onClick?(): void
}): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'group flex w-full items-center justify-between gap-3 rounded-control px-3 py-2.5 text-left disabled:cursor-default',
        featured
          ? 'bg-primary/6 hover:bg-primary/10'
          : 'hover:bg-control-hover disabled:hover:bg-transparent',
        focusRing
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 text-ui-sm font-semibold">
          {title}
          {tag}
        </span>
        <span className="mt-1 text-ui-xs leading-normal text-ink-muted">{subtitle}</span>
      </span>
      {!disabled && <AltArrowRightIcon size={14} className="shrink-0 text-ink-faint" />}
    </button>
  )
}

function Picker({
  state,
  dispatch,
  onSkip,
  manual
}: {
  state: Extract<OnboardingState, { step: 'idle' }>
  dispatch: React.Dispatch<Parameters<typeof onboardingReducer>[1]>
  onSkip(): void
  manual: boolean
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <ProviderRow
        featured
        title="Gateway tự dựng"
        tag={<Badge tone="success">Khuyên dùng</Badge>}
        subtitle="Gateway chạy trên máy bạn (ví dụ CLIProxyAPI) gom nhiều tài khoản về một địa chỉ tương thích OpenAI."
        onClick={() =>
          dispatch({ type: 'pick_endpoint', baseUrl: GATEWAY.baseUrl, label: GATEWAY.label })
        }
      />
      <button
        type="button"
        aria-expanded={state.showAll}
        onClick={() => dispatch({ type: 'toggle_all' })}
        className={cx(
          'mt-2 flex items-center gap-1 self-start text-ui-xs font-medium text-ink-muted hover:text-ink',
          focusRing
        )}
      >
        Nhà cung cấp khác
        <AltArrowDownIcon
          size={12}
          className={cx('transition-transform', state.showAll && 'rotate-180')}
        />
      </button>
      {state.showAll && (
        <div className="flex flex-col gap-1">
          {READY_CARDS.map((card) => (
            <ProviderRow
              key={card.id}
              title={card.label}
              subtitle="Dán khóa API; Mira kiểm khóa rồi kết nối."
              onClick={() => dispatch({ type: 'pick_key', providerId: card.id })}
            />
          ))}
          {LOCALS.map((preset) => (
            <ProviderRow
              key={preset.id}
              title={preset.label}
              subtitle="Model chạy trên máy này, không cần khóa."
              onClick={() =>
                dispatch({ type: 'pick_endpoint', baseUrl: preset.baseUrl, label: preset.label })
              }
            />
          ))}
          <ProviderRow
            disabled
            title="ChatGPT / Codex · GitHub Copilot"
            subtitle="Đăng nhập bằng gói thuê bao."
            tag={<Badge tone="muted">Sắp có</Badge>}
          />
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-2">
        {manual ? (
          <span />
        ) : (
          <Button variant="text" onClick={onSkip}>
            Để sau
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => dispatch({ type: 'pick_key', providerId: READY_CARDS[0]!.id })}
        >
          Tôi có khóa API
        </Button>
      </div>
    </div>
  )
}

function KeyForm({
  providerId,
  dispatch,
  onConnect
}: {
  providerId: string
  dispatch: React.Dispatch<Parameters<typeof onboardingReducer>[1]>
  onConnect(providerId: string, key: string): void
}): JSX.Element {
  const connections = useConnectionStore((state) => state.connections)
  const [key, setKey] = useState('')
  const card = READY_CARDS.find((item) => item.id === providerId) ?? READY_CARDS[0]!
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {READY_CARDS.map((item) => {
          const selected = item.id === card.id
          const hasKey = connections.some(
            (connection) => connection.providerId === item.id && connection.keys.length > 0
          )
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => dispatch({ type: 'pick_key', providerId: item.id })}
              className={cx(
                'flex items-center justify-between rounded-panel border px-3 py-2 text-left text-ui-sm',
                selected
                  ? 'border-primary bg-primary/6 ring-2 ring-primary/20'
                  : 'border-line hover:bg-hover',
                focusRing
              )}
            >
              {item.label}
              {hasKey && <CheckIcon size={13} className="text-success" />}
            </button>
          )
        })}
      </div>
      <p className="m-0 text-ui-xs leading-normal text-ink-muted">
        {card.description}{' '}
        <Button variant="link" size="xs" className="h-auto" onClick={() => openLink(card.keyUrl)}>
          Lấy khóa ↗
        </Button>
      </p>
      <TextField
        label={'Khóa API ' + card.label}
        type="password"
        autoFocus
        placeholder="Dán khóa API"
        value={key}
        onChange={(event) => setKey(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && key.trim()) {
            event.preventDefault()
            onConnect(card.id, key.trim())
          }
        }}
      />
      <div className="flex justify-between gap-2">
        <Button variant="ghost-muted" onClick={() => dispatch({ type: 'back' })}>
          Quay lại
        </Button>
        <Button disabled={!key.trim()} onClick={() => onConnect(card.id, key.trim())}>
          Kết nối
        </Button>
      </div>
    </div>
  )
}

function EndpointForm({
  baseUrl,
  label,
  dispatch,
  onConnect
}: {
  baseUrl: string
  label: string
  dispatch: React.Dispatch<Parameters<typeof onboardingReducer>[1]>
  onConnect(baseUrl: string, label: string, key: string): void
}): JSX.Element {
  const [url, setUrl] = useState(baseUrl)
  const [key, setKey] = useState('')
  const local = /^https?:\/\/(127\.0\.0\.1|localhost)/i.test(url)
  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="Địa chỉ (URL)"
        className="font-mono"
        value={url}
        hint={CONNECTION_PRESETS.find((preset) => preset.baseUrl === baseUrl)?.hint}
        onChange={(event) => setUrl(event.target.value)}
      />
      <TextField
        label={local ? 'Khóa API (thường không cần)' : 'Khóa API'}
        type="password"
        value={key}
        onChange={(event) => setKey(event.target.value)}
      />
      <div className="flex justify-between gap-2">
        <Button variant="ghost-muted" onClick={() => dispatch({ type: 'back' })}>
          Quay lại
        </Button>
        <Button disabled={!url.trim()} onClick={() => onConnect(url.trim(), label, key.trim())}>
          Kết nối
        </Button>
      </div>
    </div>
  )
}

function ConfirmModel({
  connectionId,
  onBegin
}: {
  connectionId: string
  onBegin(entryId: string): void
}): JSX.Element {
  const connection = useConnectionStore((state) =>
    state.connections.find((item) => item.id === connectionId)
  )
  const test = useConnectionStore((state) => state.tests[connectionId] ?? emptyTest)
  const setThinking = useConnectionStore((state) => state.entries.update)
  const [entryId, setEntryId] = useState<string | null>(null)
  if (!connection) return <p className="m-0 text-ui-sm text-ink-muted">Đang tải…</p>
  const entry =
    connection.models.find((item) => item.id === entryId) ??
    connection.models.find((item) => item.id === connection.defaultEntryId) ??
    connection.models[0]
  const price = entry ? test.models.find((model) => model.id === entry.model) : undefined
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <span className="flex items-center gap-2 text-ui-lg font-semibold">
        <CheckIcon size={18} className="text-success" />
        Đã kết nối {connection.name}
      </span>
      <span className="text-ui-2xs font-medium tracking-wide text-ink-faint uppercase">
        Model mặc định
      </span>
      {entry ? (
        <>
          <span className="font-mono text-ui-md">{entry.name}</span>
          {price?.inputCost !== undefined && price.outputCost !== undefined ? (
            <span className="text-ui-xs text-ink-muted">
              ${price.inputCost} / ${price.outputCost} mỗi triệu token (vào / ra)
            </span>
          ) : (
            <span className="text-ui-xs text-ink-faint">Chưa có giá tham khảo cho model này.</span>
          )}
          <ModelSelectionMenu
            variant="field"
            label="Đổi model"
            connections={[connection]}
            selected={{ connectionId: connection.id, entryId: entry.id }}
            onSelect={(selection) => setEntryId(selection.entryId)}
            onSelectThinking={(selection, choice) => {
              setEntryId(selection.entryId)
              void setThinking(selection.entryId, { settings: thinkingPatch(choice) })
            }}
          />
          <Button size="lg" onClick={() => onBegin(entry.id)}>
            Bắt đầu
          </Button>
        </>
      ) : (
        <p className="m-0 text-ui-xs text-ink-muted">
          Kết nối không liệt kê model nào. Thêm một mục model trong Cài đặt rồi chọn làm model
          chính.
        </p>
      )}
    </div>
  )
}

/**
 * The first-connection card (spec `ai-onboarding`), after Hermes Desktop's onboarding overlay: it opens by
 * itself when the library has no AI connection and "Để sau" was not chosen, or when the model menu asks for a
 * provider.
 */
export function Onboarding(): JSX.Element | null {
  const store = useConnectionStore()
  const manual = useUiStore((state) => state.onboardingOpen)
  const setManual = useUiStore((state) => state.setOnboardingOpen)
  const [dismissed, setDismissed] = useState(false)
  const [state, dispatch] = useReducer(onboardingReducer, INITIAL_ONBOARDING)

  useEffect(() => {
    if (store.load === 'loading') void store.reload()
    if (store.preferences === null) void store.loadPreferences()
  }, [store])

  const auto =
    store.load === 'ready' &&
    store.preferences !== null &&
    !store.preferences.onboardingSkipped &&
    store.connections.length === 0 &&
    !dismissed
  // Once a flow has started it stays until it ends, even though connecting makes the library non-empty.
  if (!manual && !auto && state.step === 'idle') return null

  function close(): void {
    setManual(false)
    setDismissed(true)
    dispatch({ type: 'back' })
  }

  async function finishConnection(connectionId: string, keyTail?: string): Promise<void> {
    await store.test(connectionId)
    const test = useConnectionStore.getState().tests[connectionId]
    if (test?.error) {
      // A key that did not work is taken back out, so "Thử lại" does not pile up dead keys.
      const added = useConnectionStore
        .getState()
        .connections.find((item) => item.id === connectionId)
        ?.keys.findLast((key) => key.tail === keyTail)
      if (added) await store.removeKey(connectionId, added.id)
      dispatch({ type: 'failed', message: test.error.message })
      return
    }
    const connection = useConnectionStore
      .getState()
      .connections.find((item) => item.id === connectionId)
    if (connection && connection.models.length === 0 && test?.models[0]) {
      await store.entries.add(connectionId, [{ model: test.models[0].id }])
    }
    dispatch({ type: 'connected', connectionId })
  }

  async function connectKey(providerId: string, key: string): Promise<void> {
    const card = READY_CARDS.find((item) => item.id === providerId)
    dispatch({ type: 'submit', label: card?.label ?? providerId })
    const result = await store.ensureWithKey(providerId, key)
    if (!result.ok) {
      dispatch({ type: 'failed', message: result.message })
      return
    }
    await finishConnection(result.connection.id, key.slice(-4))
  }

  async function connectEndpoint(baseUrl: string, label: string, key: string): Promise<void> {
    dispatch({ type: 'submit', label })
    const probe = await store.probe({ baseUrl, secret: key || undefined })
    if (!probe.ok) {
      dispatch({ type: 'failed', message: probe.message })
      return
    }
    if (!probe.value.ok) {
      dispatch({ type: 'failed', message: probe.value.message })
      return
    }
    const preset = CONNECTION_PRESETS.find((item) => item.baseUrl === baseUrl)
    const created = await store.create({
      name: preset?.label ?? label,
      baseUrl: probe.value.resolvedBaseUrl ?? baseUrl,
      providerId: preset?.providerId ?? null
    })
    if (!created) {
      dispatch({
        type: 'failed',
        message: useConnectionStore.getState().notice ?? 'Không tạo được kết nối.'
      })
      return
    }
    if (key) await store.addKey(created.id, key)
    if (probe.value.models[0])
      await store.entries.add(created.id, [{ model: probe.value.models[0] }])
    dispatch({ type: 'connected', connectionId: created.id })
  }

  async function begin(entryId: string): Promise<void> {
    if (state.step !== 'confirm_model') return
    await store.setMainModel({ connectionId: state.connectionId, entryId })
    close()
  }

  return (
    <div className="fixed inset-0 z-(--z-over-modal) flex items-center justify-center bg-backdrop p-6 backdrop-blur-[0.125rem]">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Kết nối nhà cung cấp AI"
        className="relative flex max-h-full w-full max-w-[45rem] flex-col gap-4 overflow-y-auto rounded-panel border border-line-strong bg-canvas p-6 text-ink shadow-overlay"
      >
        {(manual || state.step !== 'idle') && (
          <Button
            variant="ghost-muted"
            size="icon"
            aria-label="Đóng"
            className="absolute top-3 right-3"
            onClick={close}
          >
            <CloseIcon size={14} />
          </Button>
        )}
        {state.step !== 'confirm_model' && (
          <header className="flex flex-col gap-1 pr-8">
            <h2 className="m-0 text-ui-lg font-semibold">Kết nối một nhà cung cấp AI</h2>
            <p className="m-0 text-ui-sm text-ink-muted">
              Cần một kết nối để dịch và chat bằng AI. Phần lớn chỉ mất một lần dán khóa.
            </p>
          </header>
        )}
        {state.step === 'idle' && (
          <Picker
            state={state}
            dispatch={dispatch}
            manual={manual}
            onSkip={() => {
              void store.setOnboardingSkipped(true)
              close()
            }}
          />
        )}
        {state.step === 'key_form' && (
          <KeyForm
            providerId={state.providerId}
            dispatch={dispatch}
            onConnect={(id, key) => void connectKey(id, key)}
          />
        )}
        {state.step === 'endpoint_form' && (
          <EndpointForm
            baseUrl={state.baseUrl}
            label={state.label}
            dispatch={dispatch}
            onConnect={(url, label, key) => void connectEndpoint(url, label, key)}
          />
        )}
        {state.step === 'connecting' && (
          <p role="status" className="m-0 flex items-center gap-2 py-6 text-ui-sm text-ink-muted">
            <RefreshIcon size={14} className="animate-spin" />
            Đang kết nối {state.label}…
          </p>
        )}
        {state.step === 'confirm_model' && (
          <ConfirmModel
            connectionId={state.connectionId}
            onBegin={(entryId) => void begin(entryId)}
          />
        )}
        {state.step === 'error' && (
          <div role="alert" className="flex flex-col gap-3">
            <p className="m-0 flex items-start gap-2 text-ui-sm">
              <DangerCircleIcon size={16} className="mt-0.5 shrink-0 text-error" />
              <span>
                Kết nối {state.label} chưa xong. {state.message}
              </span>
            </p>
            {state.detail && (
              <details className="text-ui-xs text-ink-muted">
                <summary className="cursor-pointer">Chi tiết</summary>
                <pre className="selectable mt-1 whitespace-pre-wrap">{state.detail}</pre>
              </details>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost-muted" onClick={() => dispatch({ type: 'back' })}>
                Chọn nhà cung cấp khác
              </Button>
              <Button
                variant="outline"
                onClick={() => dispatch({ type: 'pick_key', providerId: READY_CARDS[0]!.id })}
              >
                Dùng khóa API khác
              </Button>
              <Button onClick={() => dispatch({ type: 'retry' })}>Thử lại</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
