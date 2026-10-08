import { useState, type JSX } from 'react'
import { KeyIcon } from '@solar-icons/react/linear/key'
import { TrashBinTrashIcon } from '@solar-icons/react/linear/trash-bin-trash'
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
import { Input, SearchInput } from '../../components/ui/Input'
import { CompactButton } from '../../components/ui/CompactButton'
import { ConfirmDialog, type ConfirmRequest } from '../../components/ui/ConfirmDialog'
import { ButtonGroup } from '../../components/ui/ButtonGroup'
import { SettingsSection } from '../../components/ui/Setting'
import { TextField } from '../../components/ui/Field'
import { Switch } from '../../components/ui/Switch'
import { useConnectionStore } from '../../stores/connectionStore'
import { notify } from '../../stores/notificationStore'
import { useUiStore } from '../../stores/uiStore'
import { useConnections } from './useConnections'
import { ConnectionDetails } from './ConnectionDetails'
import { openModelList } from './openConnectionSettings'
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

// A resting key field reads as plain text: the frame keeps its size so nothing shifts when it gains
// its chrome on focus or when the card opens.
const KEY_BARE = 'border-transparent! bg-transparent! shadow-none! cursor-pointer text-muted'

/**
 * Ô khóa của thẻ provider, như `KeyField` của Hermes: khóa đã có hiện `••••` trong một ô chỉ đọc, bấm vào
 * là sửa tại chỗ. Lưu chỉ hiện khi đã gõ, thùng rác khi có khóa; Enter lưu, Esc hủy mà không đóng Cài đặt.
 * Khóa mới được thêm vào nhóm khóa của kết nối, không thay khóa cũ.
 */
function KeyField({
  card,
  connection,
  expanded,
  onExpand
}: {
  card: ProviderCard
  connection: ConnectionView | undefined
  expanded: boolean
  onExpand(): void
}): JSX.Element {
  const connectKey = useConnectionStore((state) => state.connectKey)
  const removeKey = useConnectionStore((state) => state.removeKey)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  if (card.support === 'soon')
    return (
      <Badge variant="outline" dot color="neutral">
        Sắp có
      </Badge>
    )

  const keys = connection?.keys ?? []
  const shown = keys[0]
  const dirty = value.trim() !== ''

  function startEdit(): void {
    setEditing(true)
    if (!expanded) onExpand()
  }

  function cancel(): void {
    setEditing(false)
    setValue('')
    setError(undefined)
  }

  async function save(): Promise<void> {
    if (!dirty || saving) return
    setSaving(true)
    const result = await connectKey(card.id, value.trim())
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    cancel()
    const model = result.connection.models[0]?.name
    notify(
      result.warning
        ? {
            kind: 'warning',
            title: card.label,
            message: 'Đã lưu khóa, nhưng chưa kiểm được: ' + result.warning
          }
        : {
            kind: 'success',
            title: card.label,
            message: model ? 'Đã kết nối; dùng được ' + model + '.' : 'Đã kết nối.'
          }
    )
  }

  const confirmDialog = <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />

  if (shown && !editing) {
    return (
      <>
        <Input
          aria-label={'Khóa ' + card.label}
          readOnly
          className={cn(!expanded && KEY_BARE)}
          inputClassName="cursor-pointer font-mono"
          value={'••••' + shown.tail + (keys.length > 1 ? '  +' + (keys.length - 1) : '')}
          onFocus={startEdit}
        />
        {confirmDialog}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3xs">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-xs">
        <Input
          aria-label={'Khóa ' + card.label}
          aria-invalid={error ? true : undefined}
          type="password"
          autoFocus={editing}
          className={cn(!editing && !expanded && KEY_BARE)}
          placeholder={(shown ? 'Dán thêm khóa ' : 'Dán khóa ') + card.label}
          value={value}
          onFocus={() => !editing && startEdit()}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && dirty) {
              event.preventDefault()
              void save()
            } else if (event.key === 'Escape' && editing) {
              event.preventDefault()
              event.stopPropagation()
              cancel()
            }
          }}
        />
        {editing && (shown || dirty) && (
          <div className="flex items-center gap-3xs">
            {shown && (
              <CompactButton
                aria-label={'Xóa khóa …' + shown.tail}
                disabled={saving}
                onClick={() => {
                  cancel()
                  setConfirm({
                    title: 'Xóa khóa …' + shown.tail + '?',
                    description: 'Khóa bị xóa khỏi máy này; muốn dùng lại thì phải dán lại.',
                    confirmLabel: 'Xóa khóa',
                    onConfirm: () => void removeKey(connection!.id, shown.id)
                  })
                }}
                icon={<TrashBinTrashIcon size={14} />}
              />
            )}
            {dirty && (
              <Button variant="solid" loading={saving} onClick={() => void save()}>
                Lưu
              </Button>
            )}
          </div>
        )}
      </div>
      {error && (
        <span role="alert" className="text-body-xs text-error">
          {error}
        </span>
      )}
      {confirmDialog}
    </div>
  )
}

/**
 * Thẻ provider như `ProviderKeyRows` của Hermes: một lưới hai cột (tên | ô khóa) khớp cột control của các
 * hàng cài đặt; bấm vào thẻ là mở, phần mở ra trải hết hai cột.
 */
function ProviderKeyCard({
  id,
  open,
  onToggle,
  head,
  tag,
  keyField,
  children
}: {
  id: string
  open: boolean
  onToggle(): void
  head: JSX.Element
  tag?: JSX.Element
  keyField: JSX.Element
  children: JSX.Element
}): JSX.Element {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: the name button is the keyboard path; the card only widens the mouse target
    <div
      data-setting-id={id}
      onClick={onToggle}
      className={cn(
        '@container cursor-pointer rounded-sm p-3 transition-colors duration-(--mira-duration-fast)',
        open ? 'bg-muted ring-1 ring-(--mira-border-strong)' : 'hover:bg-hover'
      )}
    >
      <div className="grid grid-cols-1 items-start gap-x-3 gap-y-1.5 @2xl:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] @2xl:gap-y-3">
        <ActionRow
          expanded={open}
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          className="h-8 min-w-0 px-0 py-0 hover:bg-transparent"
          title={head}
          tag={tag}
        />
        {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: stops a click in the field from toggling the card */}
        <div className="min-w-0" onClick={(event) => event.stopPropagation()}>
          {keyField}
        </div>
        {open && (
          // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: stops a click in the body from closing the card
          <div
            className="min-w-0 cursor-auto @2xl:col-span-2"
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        )}
      </div>
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
            <ProviderKeyCard
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
              keyField={
                <KeyField
                  card={card}
                  connection={connection}
                  expanded={open === id}
                  onExpand={() => toggle(id)}
                />
              }
            >
              <div className="flex flex-col gap-3">
                <p className="m-0 text-body-xs text-subtle">
                  {card.description}{' '}
                  {card.support === 'soon' &&
                    'Cần transport riêng; sẽ có trong bản cập nhật kế tiếp.'}
                </p>
                <LinkButton className="h-auto w-fit" onClick={() => openLink(card.keyUrl)}>
                  Lấy khóa ↗
                </LinkButton>
                {own.map((item) => (
                  <div key={item.id} className="flex flex-col border-t border-subtle pt-1">
                    {own.length > 1 && (
                      <span className="pt-2 text-body-xs font-medium text-muted">{item.name}</span>
                    )}
                    <ConnectionDetails connection={item} now={now} showAddress={false} compact />
                  </div>
                ))}
              </div>
            </ProviderKeyCard>
          )
        })}
      </div>
    </SettingsSection>
  )
}

/** Cài đặt › Kết nối AI › Endpoint tùy chỉnh: a short list as in Hermes; a row loads into the form below. */
export function EndpointsPage(): JSX.Element {
  const { connections } = useConnections()
  const store = useConnectionStore()
  const now = useNow()
  const [selected, select] = useOpenCard('endpoint:')
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const endpoints = connections.filter((item) => connectionSection(item) === 'endpoints')
  const editing = endpoints.find((item) => 'endpoint:' + item.id === selected) ?? null

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
        {endpoints.length === 0 ? (
          <p className="m-0 py-2 text-body-xs text-subtle">
            Chưa có endpoint nào. Thêm một endpoint tương thích OpenAI ở dưới.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-subtle rounded-sm border border-subtle p-0">
            {endpoints.map((connection) => (
              <li
                key={connection.id}
                data-setting-id={'endpoint:' + connection.id}
                className={cn(
                  'flex items-center gap-xs py-xs pr-xs',
                  editing?.id === connection.id && 'bg-muted'
                )}
              >
                <ActionRow
                  noChevron
                  className="min-w-0 flex-1"
                  onClick={() => select('endpoint:' + connection.id)}
                  title={
                    <>
                      <StatusDot on={connectionLive(connection, now)} />
                      <span className="truncate">{connection.name}</span>
                    </>
                  }
                  tag={
                    connection.enabled ? undefined : (
                      <Badge variant="outline" dot color="neutral">
                        Đã tắt
                      </Badge>
                    )
                  }
                  description={
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-mono">{connection.baseUrl}</span>
                      <span>
                        {connection.models.length} model
                        {connection.keys[0] ? ' · ••••' + connection.keys[0].tail : ''}
                      </span>
                    </span>
                  }
                />
                <Switch
                  checked={connection.enabled}
                  onCheckedChange={(checked) =>
                    void store.update(connection.id, { enabled: checked })
                  }
                  aria-label={(connection.enabled ? 'Tắt ' : 'Bật ') + connection.name}
                />
                <CompactButton
                  aria-label={'Xóa ' + connection.name}
                  icon={<TrashBinTrashIcon size={14} />}
                  onClick={() =>
                    setConfirm({
                      title: 'Xóa ' + connection.name + '?',
                      description:
                        'Khóa và các mục model của endpoint này bị xóa. Model chính hay dự phòng trỏ tới nó cũng bị gỡ.',
                      confirmLabel: 'Xóa endpoint',
                      onConfirm: () => void store.remove(connection.id)
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
      <EndpointForm
        key={editing?.id ?? 'new'}
        editing={editing}
        onNew={() => editing && select('endpoint:' + editing.id)}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}

const API_MODES = [
  { value: 'auto', label: 'Tự nhận' },
  { value: 'chat_completions', label: 'Chat Completions' },
  { value: 'responses', label: 'Responses' },
  { value: 'anthropic_messages', label: 'Anthropic Messages' }
] as const

/**
 * The endpoint form, as Hermes': empty to add one, filled with a listed endpoint to edit it (the API mode
 * too). Kiểm tra probes `/models` and the chat route, then fills the model and the resolved base URL.
 */
function EndpointForm({
  editing,
  onNew
}: {
  editing: ConnectionView | null
  /** Leave the endpoint being edited for an empty form. */
  onNew(): void
}): JSX.Element {
  const store = useConnectionStore()
  const [name, setName] = useState(editing?.name ?? '')
  const [url, setUrl] = useState(editing?.baseUrl ?? '')
  const [mode, setMode] = useState<ConnectionView['apiMode']>(editing?.apiMode ?? 'auto')
  const [model, setModel] = useState('')
  const [secret, setSecret] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(
    null
  )
  // Hermes asks for a model before saving a new endpoint: one without an entry never shows in the menu.
  const canSave = url.trim() !== '' && (editing !== null || model.trim() !== '')

  async function check(): Promise<boolean> {
    if (!url.trim()) return false
    setChecking(true)
    const result = await store.probe({
      baseUrl: url.trim(),
      secret: secret.trim() || undefined,
      ...(editing && !secret.trim() ? { connectionId: editing.id } : {}),
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
    if (!editing && !model.trim() && probe.models[0]) setModel(probe.models[0])
    setMessage({ tone: probe.ok ? 'ok' : probe.reachable ? 'warn' : 'error', text: probe.message })
    return probe.ok
  }

  async function save(): Promise<void> {
    if (!canSave) return
    setSaving(true)
    if (editing) {
      const label = name.trim() || editing.name
      await store.update(editing.id, { name: label, baseUrl: url.trim(), apiMode: mode })
      if (secret.trim()) await store.addKey(editing.id, secret.trim())
      setSecret('')
      notify({ kind: 'success', title: 'Đã lưu endpoint', message: label })
      setSaving(false)
      return
    }
    const created = await store.create({
      name: name.trim() || new URL(url.trim()).host,
      baseUrl: url.trim(),
      providerId: null,
      apiMode: mode
    })
    if (created) {
      if (secret.trim()) await store.addKey(created.id, secret.trim())
      await store.entries.add(created.id, [{ model: model.trim() }])
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

  const currentKey = editing?.keys[0]

  return (
    // Hermes' form: one bordered box of stacked, labelled fields, not setting rows; the mode switch
    // needs the whole width for four options.
    <SettingsSection title={editing ? 'Sửa ' + editing.name : 'Thêm endpoint'}>
      <div className="@container grid gap-3 rounded-sm border border-subtle p-3">
        <div className="grid gap-3 @lg:grid-cols-2">
          <TextField
            label="Tên"
            placeholder="Gateway của tôi"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Địa chỉ (URL)"
            inputClassName="font-mono"
            placeholder="http://127.0.0.1:8317/v1"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>
        <fieldset className="m-0 flex min-w-0 flex-col gap-xs border-0 p-0">
          <legend className="mb-xs p-0 text-label-sm text-default">Chế độ API</legend>
          <ButtonGroup
            label="Chế độ API"
            className="w-full overflow-x-auto [&>*]:flex-1"
            value={mode}
            options={API_MODES}
            onChange={(value) => setMode(value)}
          />
          <span className="text-body-xs text-muted">
            Tự nhận chọn theo địa chỉ; hầu hết gateway là Chat Completions.
          </span>
        </fieldset>
        {editing ? (
          <p className="m-0 text-body-xs text-subtle">
            {editing.models.length} model trong menu chọn model.{' '}
            <LinkButton className="h-auto" onClick={() => openModelList(editing.id)}>
              Danh sách model ›
            </LinkButton>
          </p>
        ) : (
          <>
            <TextField
              label="Model mặc định"
              hint={
                models.length > 0
                  ? 'Dò được ' + models.length + ' model.'
                  : 'Bấm Kiểm tra để dò, hoặc gõ tay.'
              }
              inputClassName="font-mono"
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
          </>
        )}
        <TextField
          label="Khóa API"
          type="password"
          hint={
            currentKey
              ? 'Đang có khóa ••••' + currentKey.tail + '. Dán khóa mới để thêm vào nhóm khóa.'
              : undefined
          }
          placeholder={
            currentKey ? 'Để trống để giữ khóa hiện tại' : 'Để trống nếu endpoint không cần khóa'
          }
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
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
        <div className="flex flex-wrap gap-2">
          <Button loading={checking} disabled={!url.trim()} onClick={() => void check()}>
            Kiểm tra
          </Button>
          <Button variant="solid" loading={saving} disabled={!canSave} onClick={() => void save()}>
            Lưu
          </Button>
          {editing && (
            <Button variant="ghost" onClick={onNew}>
              Endpoint mới
            </Button>
          )}
        </div>
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
              // Once connected, the card's own "Kiểm tra kết nối" checks it; this one only finds and adds it.
              right={
                connection ? undefined : (
                  <Button loading={busy === presetId} onClick={() => void check(presetId)}>
                    Tìm trên máy
                  </Button>
                )
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
