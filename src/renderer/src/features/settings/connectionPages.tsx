import { useState, type JSX } from 'react'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { CheckCircleIcon } from '@solar-icons/react/linear/check-circle'
import { KeyIcon } from '@solar-icons/react/linear/key'
import { LinkIcon } from '@solar-icons/react/linear/link'
import { MonitorIcon } from '@solar-icons/react/linear/monitor'
import { UserCircleIcon } from '@solar-icons/react/linear/user-circle'
import { CONNECTION_PRESETS, type ConnectionView } from '../../../../shared/contracts/aiConnections'
import {
  connectionSection,
  PROVIDER_CARDS,
  type ProviderCard
} from '../../../../shared/contracts/aiProviders'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { focusRing } from '../../components/focusRing'
import { SearchField } from '../../components/SearchField'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SettingRow, SettingsSection } from '../../components/Setting'
import { TextField } from '../../components/TextField'
import { useConnectionStore } from '../../stores/connectionStore'
import { notify } from '../../stores/notificationStore'
import { useUiStore } from '../../stores/uiStore'
import { useConnections } from './useConnections'
import { ConnectionDetails } from './ConnectionDetails'
import { connectionLive } from './connectionStatus'

function useNow(): number {
  const [now] = useState(() => Date.now())
  return now
}

function openLink(url: string): void {
  void window.mira.openExternal(url).catch(() => undefined)
}

/** Một dòng mở ra được, như thẻ provider của Hermes: đóng là một hàng, mở ra là toàn bộ phần thân. */
function ExpandableCard({
  id,
  open,
  onToggle,
  head,
  right,
  children
}: {
  id: string
  open: boolean
  onToggle(): void
  head: JSX.Element
  right?: JSX.Element
  children: JSX.Element
}): JSX.Element {
  return (
    <div
      data-setting-id={id}
      className={cx(
        'rounded-control transition-colors duration-(--duration-fast)',
        open ? 'bg-control ring-1 ring-line-strong' : 'hover:bg-hover'
      )}
    >
      <div className="flex min-h-11 items-center gap-2 px-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className={cx('flex min-w-0 flex-1 items-center gap-2 py-2 text-left', focusRing)}
        >
          {head}
          <AltArrowDownIcon
            size={12}
            className={cx(
              'shrink-0 text-ink-faint transition-transform duration-(--duration-fast)',
              open && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
        {right}
      </div>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

function StatusDot({ on }: { on: boolean }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cx('size-2 shrink-0 rounded-full', on ? 'bg-primary' : 'bg-line-strong')}
    />
  )
}

/** Ô khóa trên thẻ đóng: hiện `••••` như chữ thường, bấm thì thành ô dán; Enter lưu, Esc hủy. */
function KeyField({
  card,
  connection
}: {
  card: ProviderCard
  connection: ConnectionView | undefined
}): JSX.Element {
  const ensureWithKey = useConnectionStore((state) => state.ensureWithKey)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()

  if (card.support === 'soon') return <Badge tone="muted">Sắp có</Badge>

  async function save(): Promise<void> {
    if (!value.trim() || saving) return
    setSaving(true)
    const result = await ensureWithKey(card.id, value.trim())
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setValue('')
    setEditing(false)
    setError(undefined)
    notify({ kind: 'success', title: card.label, message: 'Đã lưu khóa.' })
  }

  const keys = connection?.keys ?? []
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cx(
          'flex h-(--control-height) w-56 items-center rounded-control px-2.5 text-left text-ui-xs',
          keys.length > 0 ? 'font-mono text-ink' : 'text-ink-faint',
          'hover:bg-control-hover',
          focusRing
        )}
      >
        {keys.length > 0
          ? '••••' + keys[0]!.tail + (keys.length > 1 ? '  +' + (keys.length - 1) : '')
          : 'Dán khóa ' + card.label}
      </button>
    )
  }
  return (
    <div className="flex w-full max-w-sm items-start gap-1.5">
      <TextField
        label={'Khóa ' + card.label}
        type="password"
        autoFocus
        className="min-w-0 flex-1 [&>label]:sr-only"
        placeholder={'Dán khóa ' + card.label}
        value={value}
        error={error}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void save()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setEditing(false)
            setValue('')
            setError(undefined)
          }
        }}
      />
      <Button loading={saving} disabled={!value.trim()} onClick={() => void save()}>
        Lưu
      </Button>
    </div>
  )
}

/** Which card is open: the one a deep link points at, until the person opens or closes another. */
function useOpenCard(prefix: string): [string | null, (id: string) => void] {
  const key = useUiStore((state) => state.settings?.key)
  const [open, setOpen] = useState<string | null>(key?.startsWith(prefix) ? key : null)
  // A new deep link opens its card; React's "adjust state while rendering" pattern, not an effect.
  const [seenKey, setSeenKey] = useState(key)
  if (key !== seenKey) {
    setSeenKey(key)
    if (key?.startsWith(prefix)) setOpen(key)
  }
  return [open, (id) => setOpen((current) => (current === id ? null : id))]
}

/** Cài đặt › Kết nối AI › Khóa API. */
export function KeysPage(): JSX.Element {
  const { connections } = useConnections()
  const openSettings = useUiStore((state) => state.openSettings)
  const now = useNow()
  const [query, setQuery] = useState('')
  const [open, toggle] = useOpenCard('provider:')
  const cards = PROVIDER_CARDS.filter((card) =>
    card.label.toLowerCase().includes(query.trim().toLowerCase())
  )

  return (
    <SettingsSection title="Khóa API" icon={<KeyIcon size={16} />}>
      <p className="m-0 mb-2 text-ui-xs text-ink-muted">
        Dán khóa của nhà cung cấp; Mira tự tạo kết nối. Khóa được mã hóa trên máy và không bao giờ
        hiện lại đầy đủ.
      </p>
      <button
        type="button"
        onClick={() => openSettings({ group: 'connections', page: 'endpoints' })}
        className={cx(
          'mb-2 flex w-full items-center gap-2 rounded-control px-3 py-2.5 text-left hover:bg-hover',
          focusRing
        )}
      >
        <LinkIcon size={16} className="shrink-0 text-ink-muted" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-ui-sm font-medium">Endpoint tùy chỉnh</span>
          <span className="text-ui-xs text-ink-muted">
            Gateway tự dựng hay bất kỳ URL tương thích OpenAI nào.
          </span>
        </span>
        <AltArrowRightIcon size={14} className="text-ink-faint" />
      </button>
      <SearchField
        label="Tìm nhà cung cấp"
        size="sm"
        placeholder="Tìm nhà cung cấp…"
        className="mb-2"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="flex flex-col gap-1">
        {cards.map((card) => {
          // A provider can have more than one connection (two Gemini projects, say); the card shows them all
          // and the key field adds to the first.
          const own = connections.filter((item) => item.providerId === card.id)
          const connection = own[0]
          const id = 'provider:' + card.id
          return (
            <ExpandableCard
              key={card.id}
              id={id}
              open={open === id}
              onToggle={() => toggle(id)}
              head={
                <>
                  <StatusDot on={own.some((item) => connectionLive(item, now))} />
                  <span className="truncate text-ui-sm font-medium">{card.label}</span>
                  {own.length > 1 && <Badge tone="muted">{own.length} kết nối</Badge>}
                </>
              }
              right={<KeyField card={card} connection={connection} />}
            >
              <div className="flex flex-col">
                <p className="m-0 pt-1 text-ui-xs text-ink-muted">
                  {card.description}{' '}
                  <Button
                    variant="link"
                    size="xs"
                    className="h-auto"
                    onClick={() => openLink(card.keyUrl)}
                  >
                    Lấy khóa ↗
                  </Button>
                </p>
                {own.length > 0 ? (
                  own.map((item) => (
                    <div key={item.id} className="flex flex-col">
                      {own.length > 1 && (
                        <span className="pt-3 text-ui-xs font-medium text-ink-faint">
                          {item.name}
                        </span>
                      )}
                      <ConnectionDetails connection={item} now={now} showAddress={false} />
                    </div>
                  ))
                ) : (
                  <p className="m-0 py-3 text-ui-xs text-ink-faint">
                    {card.support === 'soon'
                      ? 'Cần transport riêng; sẽ có trong bản cập nhật kế tiếp.'
                      : 'Chưa có kết nối. Dán khóa ở ô bên phải để tạo.'}
                  </p>
                )}
              </div>
            </ExpandableCard>
          )
        })}
      </div>
    </SettingsSection>
  )
}

/** Cài đặt › Kết nối AI › Endpoint tùy chỉnh. */
export function EndpointsPage(): JSX.Element {
  const { connections } = useConnections()
  const now = useNow()
  const [open, toggle] = useOpenCard('endpoint:')
  const endpoints = connections.filter((item) => connectionSection(item) === 'endpoints')

  return (
    <>
      <SettingsSection
        title="Endpoint tùy chỉnh"
        icon={<LinkIcon size={16} />}
        aside={<Badge tone="muted">{endpoints.length}</Badge>}
      >
        {endpoints.length === 0 && (
          <p className="m-0 py-2 text-ui-xs text-ink-muted">
            Chưa có endpoint nào. Thêm một endpoint tương thích OpenAI ở dưới.
          </p>
        )}
        <div className="flex flex-col gap-1">
          {endpoints.map((connection) => {
            const id = 'endpoint:' + connection.id
            return (
              <ExpandableCard
                key={connection.id}
                id={id}
                open={open === id}
                onToggle={() => toggle(id)}
                head={
                  <>
                    <StatusDot on={connectionLive(connection, now)} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-ui-sm font-medium">{connection.name}</span>
                      <span className="truncate font-mono text-ui-2xs text-ink-faint">
                        {connection.baseUrl}
                      </span>
                    </span>
                  </>
                }
              >
                <ConnectionDetails connection={connection} now={now} />
              </ExpandableCard>
            )
          })}
        </div>
      </SettingsSection>
      <AddEndpointForm />
    </>
  )
}

const API_MODES = [
  { value: 'auto', label: 'Tự nhận' },
  { value: 'chat_completions', label: 'Chat Completions' }
] as const

/** Form thêm endpoint: Kiểm tra dò `/models` và route chat, tự điền model và base URL đã giải. */
function AddEndpointForm(): JSX.Element {
  const store = useConnectionStore()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<(typeof API_MODES)[number]['value']>('auto')
  const [model, setModel] = useState('')
  const [secret, setSecret] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(
    null
  )

  async function check(): Promise<boolean> {
    if (!url.trim()) return false
    setChecking(true)
    const result = await store.probe({
      baseUrl: url.trim(),
      secret: secret.trim() || undefined,
      model: model.trim() || undefined
    })
    setChecking(false)
    if (!result.ok) {
      setMessage({ tone: 'error', text: result.message })
      return false
    }
    const probe = result.value
    setModels(probe.models)
    if (probe.resolvedBaseUrl) setUrl(probe.resolvedBaseUrl)
    if (!model.trim() && probe.models[0]) setModel(probe.models[0])
    setMessage({ tone: probe.ok ? 'ok' : probe.reachable ? 'warn' : 'error', text: probe.message })
    return probe.ok
  }

  async function save(): Promise<void> {
    if (!url.trim()) return
    setSaving(true)
    const created = await store.create({
      name: name.trim() || new URL(url.trim()).host,
      baseUrl: url.trim(),
      providerId: null
    })
    if (created) {
      if (secret.trim()) await store.addKey(created.id, secret.trim())
      if (model.trim()) await store.entries.add(created.id, [{ model: model.trim() }])
      notify({ kind: 'success', title: 'Đã thêm endpoint', message: created.name })
      setName('')
      setUrl('')
      setModel('')
      setSecret('')
      setModels([])
      setMessage(null)
    }
    setSaving(false)
  }

  return (
    <SettingsSection title="Thêm endpoint">
      <div className="grid gap-x-3 @2xl:grid-cols-2">
        <SettingRow title="Tên">
          <TextField
            label="Tên endpoint"
            className="w-full [&>label]:sr-only"
            placeholder="Gateway của tôi"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </SettingRow>
        <SettingRow title="Địa chỉ (URL)" hint="Ví dụ http://127.0.0.1:8317/v1">
          <TextField
            label="Địa chỉ endpoint"
            className="w-full font-mono [&>label]:sr-only"
            placeholder="http://127.0.0.1:8317/v1"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </SettingRow>
      </div>
      <SettingRow
        title="Chế độ API"
        hint="Tự nhận chọn theo địa chỉ; hầu hết gateway là Chat Completions."
      >
        <SegmentedControl
          label="Chế độ API"
          value={mode}
          options={API_MODES}
          onChange={(value) => setMode(value)}
        />
      </SettingRow>
      <SettingRow
        title="Model mặc định"
        hint={
          models.length > 0
            ? 'Dò được ' + models.length + ' model.'
            : 'Bấm Kiểm tra để dò, hoặc gõ tay.'
        }
      >
        <TextField
          label="Model mặc định"
          className="w-full font-mono [&>label]:sr-only"
          list="endpoint-models"
          placeholder="gemini-2.5-flash"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        />
        <datalist id="endpoint-models">
          {models.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
      </SettingRow>
      <SettingRow title="Khóa API" hint="Để trống nếu endpoint không cần khóa.">
        <TextField
          label="Khóa API của endpoint"
          type="password"
          className="w-full [&>label]:sr-only"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
      </SettingRow>
      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={cx(
            'm-0 py-1 text-ui-xs',
            message.tone === 'ok'
              ? 'text-success'
              : message.tone === 'warn'
                ? 'text-warning'
                : 'text-error'
          )}
        >
          {message.text}
        </p>
      )}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          loading={checking}
          disabled={!url.trim()}
          onClick={() => void check()}
        >
          Kiểm tra
        </Button>
        <Button loading={saving} disabled={!url.trim()} onClick={() => void save()}>
          Lưu
        </Button>
      </div>
    </SettingsSection>
  )
}

const LOCAL_LINKS: Record<string, string> = {
  ollama: 'https://ollama.com',
  lmstudio: 'https://lmstudio.ai'
}

/** Cài đặt › Kết nối AI › Trên máy: Ollama và LM Studio, không cần khóa. */
export function LocalPage(): JSX.Element {
  const { connections } = useConnections()
  const store = useConnectionStore()
  const now = useNow()
  const [open, toggle] = useOpenCard('local:')
  const [busy, setBusy] = useState<string | null>(null)

  async function check(presetId: string): Promise<void> {
    const preset = CONNECTION_PRESETS.find((item) => item.id === presetId)!
    setBusy(presetId)
    const result = await store.probe({ baseUrl: preset.baseUrl })
    setBusy(null)
    const host = new URL(preset.baseUrl).host
    if (!result.ok || !result.value.reachable) {
      notify({
        kind: 'error',
        title: preset.label,
        message:
          'Không kết nối được tới ' +
          preset.label.replace(/ \(.*\)$/, '') +
          ' ở ' +
          host +
          '; hãy mở nó rồi thử lại.'
      })
      return
    }
    notify({
      kind: result.value.ok ? 'success' : 'warning',
      title: preset.label,
      message: result.value.message
    })
    if (result.value.ok && !connections.some((item) => item.providerId === preset.providerId)) {
      const created = await store.create({
        name: preset.label,
        baseUrl: preset.baseUrl,
        providerId: preset.providerId
      })
      if (created && result.value.models[0]) {
        await store.entries.add(created.id, [{ model: result.value.models[0] }])
      }
    }
  }

  return (
    <SettingsSection title="Trên máy" icon={<MonitorIcon size={16} />}>
      <p className="m-0 mb-2 text-ui-xs text-ink-muted">
        Model chạy ngay trên máy bạn; không cần khóa và không gửi gì ra ngoài.
      </p>
      <div className="flex flex-col gap-1">
        {(['ollama', 'lmstudio'] as const).map((presetId) => {
          const preset = CONNECTION_PRESETS.find((item) => item.id === presetId)!
          const connection = connections.find((item) => item.providerId === preset.providerId)
          const id = 'local:' + presetId
          return (
            <ExpandableCard
              key={presetId}
              id={id}
              open={open === id}
              onToggle={() => toggle(id)}
              head={
                <>
                  <StatusDot on={connection ? connectionLive(connection, now) : false} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-ui-sm font-medium">{preset.label}</span>
                    <span className="truncate font-mono text-ui-2xs text-ink-faint">
                      {preset.baseUrl}
                    </span>
                  </span>
                </>
              }
              right={
                <Button
                  variant="outline"
                  size="sm"
                  loading={busy === presetId}
                  onClick={() => void check(presetId)}
                >
                  Kiểm tra
                </Button>
              }
            >
              {connection ? (
                <ConnectionDetails connection={connection} now={now} />
              ) : (
                <p className="m-0 py-2 text-ui-xs text-ink-muted">
                  {preset.hint}{' '}
                  <Button
                    variant="link"
                    size="xs"
                    className="h-auto"
                    onClick={() => openLink(LOCAL_LINKS[presetId]!)}
                  >
                    Tải về ↗
                  </Button>
                </p>
              )}
            </ExpandableCard>
          )
        })}
      </div>
    </SettingsSection>
  )
}

const ACCOUNT_CARDS = [
  {
    id: 'codex',
    label: 'ChatGPT / Codex',
    flow: 'Mở trang xác minh trên trình duyệt; Mira tự kết nối khi bạn nhập mã.'
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    flow: 'Mở trang xác minh của GitHub; Mira tự kết nối khi bạn nhập mã.'
  }
] as const

/** Cài đặt › Kết nối AI › Tài khoản. Đăng nhập thật đến cùng change `subscription-providers`. */
export function AccountsPage(): JSX.Element {
  const openSettings = useUiStore((state) => state.openSettings)
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
      <span className="mt-3 block px-0.5 text-ui-xs font-medium text-ink-faint">
        Nhà cung cấp khác
      </span>
      <div className="mt-1 flex flex-col gap-1">
        {ACCOUNT_CARDS.map((card) => (
          <div
            key={card.id}
            data-setting-id={'account:' + card.id}
            className="flex items-center justify-between gap-3 rounded-control px-3 py-2.5"
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-ui-sm font-semibold">{card.label}</span>
              <span className="mt-1 text-ui-xs text-ink-muted">{card.flow}</span>
            </span>
            <Badge tone="muted">Sắp có</Badge>
          </div>
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
        Đăng nhập dùng cách giống công cụ chính hãng; nhà cung cấp có thể đổi hoặc chặn cách này.
      </p>
    </SettingsSection>
  )
}
