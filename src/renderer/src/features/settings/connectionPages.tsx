import { useState, type JSX } from 'react'
import { KeyIcon } from '@solar-icons/react/linear/key'
import { LinkIcon } from '@solar-icons/react/linear/link'
import { MonitorIcon } from '@solar-icons/react/linear/monitor'
import { CONNECTION_PRESETS, type ConnectionView } from '../../../../shared/contracts/aiConnections'
import {
  connectionSection,
  PROVIDER_CARDS,
  type ProviderCard
} from '../../../../shared/contracts/aiProviders'
import { ActionRow } from '../../components/ui/ActionRow'
import { Badge } from '../../components/ui/Badge'
import { Button, LinkButton } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { ICON } from '../../components/ui/icon'
import { SearchInput } from '../../components/ui/Input'
import { ButtonGroup } from '../../components/ui/ButtonGroup'
import { SettingRow, SettingsSection } from '../../components/ui/Setting'
import { TextField } from '../../components/ui/Field'
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
  description,
  tag,
  right,
  children
}: {
  id: string
  open: boolean
  onToggle(): void
  head: JSX.Element
  description?: JSX.Element
  tag?: JSX.Element
  right?: JSX.Element
  children: JSX.Element
}): JSX.Element {
  return (
    <div
      data-setting-id={id}
      className={cn(
        'rounded-sm transition-colors duration-(--mira-duration-fast)',
        open ? 'bg-muted ring-1 ring-(--mira-border-strong)' : 'hover:bg-hover'
      )}
    >
      <div className="flex min-h-11 items-center gap-2 pr-3">
        <ActionRow
          expanded={open}
          onClick={onToggle}
          className="min-w-0 flex-1"
          title={head}
          description={description}
          tag={tag}
        />
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
      className={cn('size-2 shrink-0 rounded-full', on ? 'bg-inverted' : 'bg-line-strong')}
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

  if (card.support === 'soon')
    return (
      <Badge variant="outline" dot color="neutral">
        Sắp có
      </Badge>
    )

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
      <Button
        variant="ghost"
        onClick={() => setEditing(true)}
        className={cn('w-56 justify-start', keys.length > 0 && 'font-mono')}
      >
        {keys.length > 0
          ? '••••' + keys[0]!.tail + (keys.length > 1 ? '  +' + (keys.length - 1) : '')
          : 'Dán khóa ' + card.label}
      </Button>
    )
  }
  return (
    <div className="flex w-full max-w-(--container-sm) items-start gap-1.5">
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
      <Button variant="solid" loading={saving} disabled={!value.trim()} onClick={() => void save()}>
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
      <p className="m-0 mb-2 text-body-xs text-subtle">
        Dán khóa của nhà cung cấp; Mira tự tạo kết nối. Khóa được mã hóa trên máy và không bao giờ
        hiện lại đầy đủ.
      </p>
      <ActionRow
        className="mb-2"
        onClick={() => openSettings({ group: 'connections', page: 'endpoints' })}
        leading={<LinkIcon size={ICON.sm} aria-hidden="true" />}
        title="Endpoint tùy chỉnh"
        description="Gateway tự dựng hay bất kỳ URL tương thích OpenAI nào."
      />
      <SearchInput
        label="Tìm nhà cung cấp"
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
                  <span className="truncate">{card.label}</span>
                </>
              }
              tag={
                own.length > 1 ? (
                  <Badge variant="outline" dot color="neutral">
                    {own.length} kết nối
                  </Badge>
                ) : undefined
              }
              right={<KeyField card={card} connection={connection} />}
            >
              <div className="flex flex-col">
                <p className="m-0 pt-1 text-body-xs text-subtle">
                  {card.description}{' '}
                  <LinkButton className="h-auto" onClick={() => openLink(card.keyUrl)}>
                    Lấy khóa ↗
                  </LinkButton>
                </p>
                {own.length > 0 ? (
                  own.map((item) => (
                    <div key={item.id} className="flex flex-col">
                      {own.length > 1 && (
                        <span className="pt-3 text-body-xs font-medium text-muted">
                          {item.name}
                        </span>
                      )}
                      <ConnectionDetails connection={item} now={now} showAddress={false} />
                    </div>
                  ))
                ) : (
                  <p className="m-0 py-3 text-body-xs text-muted">
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
        aside={
          <Badge variant="outline" dot color="neutral">
            {endpoints.length}
          </Badge>
        }
      >
        {endpoints.length === 0 && (
          <p className="m-0 py-2 text-body-xs text-subtle">
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
                    <span className="truncate">{connection.name}</span>
                  </>
                }
                description={<span className="font-mono">{connection.baseUrl}</span>}
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
  { value: 'chat_completions', label: 'Chat Completions' },
  { value: 'responses', label: 'Responses' },
  { value: 'anthropic_messages', label: 'Anthropic Messages' }
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
      model: model.trim() || undefined,
      apiMode: mode
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
      providerId: null,
      apiMode: mode
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
        hint="Tự nhận chọn theo địa chỉ (api.anthropic.com hay đường dẫn /anthropic là Anthropic Messages); hầu hết gateway là Chat Completions. Kiểm tra thăm dò đúng route của chế độ đã chọn."
      >
        <ButtonGroup
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
          className={cn(
            'm-0 py-1 text-body-xs',
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
        <Button loading={checking} disabled={!url.trim()} onClick={() => void check()}>
          Kiểm tra
        </Button>
        <Button variant="solid" loading={saving} disabled={!url.trim()} onClick={() => void save()}>
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
      <p className="m-0 mb-2 text-body-xs text-subtle">
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
                  <span className="truncate">{preset.label}</span>
                </>
              }
              description={<span className="font-mono">{preset.baseUrl}</span>}
              right={
                <Button loading={busy === presetId} onClick={() => void check(presetId)}>
                  Kiểm tra
                </Button>
              }
            >
              {connection ? (
                <ConnectionDetails connection={connection} now={now} />
              ) : (
                <p className="m-0 py-2 text-body-xs text-subtle">
                  {preset.hint}{' '}
                  <LinkButton className="h-auto" onClick={() => openLink(LOCAL_LINKS[presetId]!)}>
                    Tải về ↗
                  </LinkButton>
                </p>
              )}
            </ExpandableCard>
          )
        })}
      </div>
    </SettingsSection>
  )
}
