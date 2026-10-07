import { useEffect, useState, type JSX } from 'react'
import { AddCircleIcon } from '@solar-icons/react/linear/add-circle'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { CpuIcon } from '@solar-icons/react/linear/cpu'
import { RestartIcon } from '@solar-icons/react/linear/restart'
import type { ConnectionView } from '../../../../shared/contracts/aiConnections'
import { connectionSection } from '../../../../shared/contracts/aiProviders'
import { MAX_FALLBACKS, type ModelRef } from '../../../../shared/contracts/aiPreferences'
import { Button } from '../../components/Button'
import { Select } from '../../components/Select'
import { SettingRow, SettingsSection } from '../../components/Setting'
import { TextField } from '../../components/TextField'
import { useConnectionStore } from '../../stores/connectionStore'
import { notify } from '../../stores/notificationStore'
import { useUiStore } from '../../stores/uiStore'
import { resolveModelChoice } from '../models/modelChoice'
import {
  DEFAULT_THINKING_LABEL,
  thinkingChoiceOf,
  thinkingOptions,
  thinkingPatch,
  type ThinkingChoice
} from '../models/modelSettingsForm'
import { connectionLive } from './connectionStatus'
import { useConnections } from './useConnections'

const usable = (connections: readonly ConnectionView[]): ConnectionView[] =>
  connections.filter((connection) => connection.enabled && connection.models.length > 0)

function usePreferences(): void {
  const loaded = useConnectionStore((state) => state.preferences !== null)
  const load = useConnectionStore((state) => state.loadPreferences)
  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])
}

/** Cài đặt › Model › Model chính. */
export function MainModelPage(): JSX.Element {
  usePreferences()
  const { connections } = useConnections()
  const store = useConnectionStore()
  const openSettings = useUiStore((state) => state.openSettings)
  const main = store.preferences?.main ?? null
  const live = usable(connections)
  const current = resolveModelChoice(connections, { connectionId: null, entryId: null }, main)

  // What the person picked here; until then the saved choice shows, also once it finishes loading.
  const [picked, setPicked] = useState<{ connectionId: string; entryId: string | null } | null>(
    null
  )
  const connectionId = picked?.connectionId ?? current?.connectionId ?? null
  const entryId = picked ? picked.entryId : (current?.entryId ?? null)
  const [now] = useState(() => Date.now())
  const [applying, setApplying] = useState(false)
  const [key, setKey] = useState('')
  const [activating, setActivating] = useState(false)

  const connection = live.find((item) => item.id === connectionId) ?? null
  const entry =
    connection?.models.find((item) => item.id === entryId) ?? connection?.models[0] ?? null
  const changed =
    connection !== null &&
    entry !== null &&
    (main?.connectionId !== connection.id || main?.entryId !== entry.id)
  const needsKey =
    connection !== null &&
    connectionSection(connection) === 'keys' &&
    !connectionLive(connection, now)

  async function apply(): Promise<void> {
    if (!connection || !entry) return
    setApplying(true)
    const ok = await store.setMainModel({ connectionId: connection.id, entryId: entry.id })
    setApplying(false)
    if (ok) {
      notify({
        kind: 'success',
        title: 'Đã đổi model chính',
        message: 'Chat mới và hộp thoại dịch sẽ dùng ' + connection.name + ' · ' + entry.name + '.'
      })
    }
  }

  async function activate(): Promise<void> {
    if (!connection || !key.trim()) return
    setActivating(true)
    const ok = await store.addKey(connection.id, key.trim())
    setActivating(false)
    if (ok) setKey('')
  }

  async function setThinking(choice: ThinkingChoice): Promise<void> {
    if (!entry) return
    const outcome = await store.entries.update(entry.id, { settings: thinkingPatch(choice) })
    if (!outcome.ok)
      notify({ kind: 'error', title: 'Không đổi được mức suy luận', message: outcome.message })
  }

  if (live.length === 0) {
    return (
      <SettingsSection title="Model chính" icon={<CpuIcon size={16} />}>
        <SettingRow
          id="main-model"
          title="Chưa có model nào"
          hint="Thêm một kết nối và ít nhất một mục model trước, rồi chọn model chính ở đây."
        >
          <Button onClick={() => openSettings({ group: 'connections', page: 'keys' })}>
            Thêm kết nối
          </Button>
        </SettingRow>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection title="Model chính" icon={<CpuIcon size={16} />}>
      <SettingRow
        id="main-model"
        wide
        title="Model chính"
        hint="Dùng cho chat mới, hộp thoại dịch và hàng chờ dịch khi chưa chọn model khác. Đổi model trong ô chat chỉ áp cho phiên đó."
        below={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              label="Kết nối"
              value={connection?.id ?? ''}
              options={live.map((item) => ({ value: item.id, label: item.name }))}
              onChange={(value) => {
                const next = live.find((item) => item.id === value)
                setPicked({
                  connectionId: value,
                  entryId:
                    next?.models.find((item) => item.id === next.defaultEntryId)?.id ??
                    next?.models[0]?.id ??
                    null
                })
              }}
              className="min-w-40"
            />
            <Select
              label="Mục model"
              value={entry?.id ?? ''}
              options={(connection?.models ?? []).map((item) => ({
                value: item.id,
                label: item.name
              }))}
              onChange={(value) =>
                connection && setPicked({ connectionId: connection.id, entryId: value })
              }
              className="min-w-60"
            />
            <Button loading={applying} disabled={!changed} onClick={() => void apply()}>
              Áp dụng
            </Button>
            {current?.source === 'default' && !main && (
              <span className="text-ui-xs text-ink-muted">
                Chưa đặt; đang dùng mặc định của{' '}
                {connections.find((item) => item.id === current.connectionId)?.name}.
              </span>
            )}
          </div>
        }
      />
      {needsKey && connection && (
        <SettingRow
          title={'Kích hoạt ' + connection.name}
          hint="Kết nối này chưa có khóa dùng được."
        >
          <TextField
            label={'Khóa ' + connection.name}
            type="password"
            className="min-w-0 flex-1 [&>label]:sr-only"
            placeholder={'Dán khóa ' + connection.name}
            value={key}
            onChange={(event) => setKey(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void activate()
              }
            }}
          />
          <Button loading={activating} disabled={!key.trim()} onClick={() => void activate()}>
            Kích hoạt
          </Button>
        </SettingRow>
      )}
      {entry && (
        <SettingRow
          id="main-thinking"
          title="Mức suy luận"
          hint={
            entry.capability.thinkingLevels.length === 0
              ? 'Chưa biết model này hỗ trợ mức nào, nên chỉ có Mặc định (không gửi gì).'
              : 'Ghi vào mục model, nên menu model trong chat cũng thấy mức này.'
          }
        >
          <Select
            label="Mức suy luận"
            value={thinkingChoiceOf(entry.settings)}
            options={thinkingOptions(entry.capability, entry.settings.thinking).map((option) => ({
              value: option.value,
              label: option.value === 'default' ? DEFAULT_THINKING_LABEL : option.label
            }))}
            onChange={(value) => void setThinking(value as ThinkingChoice)}
          />
        </SettingRow>
      )}
    </SettingsSection>
  )
}

/** Cài đặt › Model › Dự phòng: danh sách có thứ tự, tự lưu sau mỗi thay đổi. */
export function FallbacksPage(): JSX.Element {
  usePreferences()
  const { connections } = useConnections()
  const store = useConnectionStore()
  const saved = store.preferences?.fallbacks ?? []
  // The list being saved shows at once; the saved one takes over when the save is back.
  const [draft, setDraft] = useState<ModelRef[] | null>(null)
  const list = draft ?? saved
  const live = usable(connections)

  async function commit(next: ModelRef[]): Promise<void> {
    setDraft(next)
    await store.setFallbacks(next)
    setDraft(null)
  }

  function entriesOf(connectionId: string): ConnectionView['models'] {
    return live.find((item) => item.id === connectionId)?.models ?? []
  }

  return (
    <SettingsSection title="Model dự phòng" icon={<RestartIcon size={16} />}>
      <SettingRow
        id="fallbacks"
        wide
        title="Thử theo thứ tự khi model chính không dùng được"
        hint="Chỉ khi hết hạn mức, model không tồn tại, hoặc máy chủ lỗi kéo dài. Lỗi do nội dung bị chặn hay request sai không chuyển dự phòng. Chat tự chuyển và ghi lại trên lượt. Dịch chương thì dừng và hỏi “Dịch tiếp bằng …” cho các đoạn còn lại, để một chương không tự đổi giọng văn."
        below={
          <div className="flex flex-col gap-1.5">
            {list.length === 0 && (
              <p className="m-0 text-ui-xs text-ink-muted">
                Chưa có model dự phòng; khi model chính lỗi, Mira dừng và báo lỗi.
              </p>
            )}
            {list.map((ref, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <span className="w-5 text-right font-mono text-ui-2xs text-ink-faint">
                  {index + 1}
                </span>
                <Select
                  label={'Kết nối dự phòng ' + (index + 1)}
                  size="sm"
                  value={ref.connectionId}
                  options={live.map((item) => ({ value: item.id, label: item.name }))}
                  onChange={(connectionId) => {
                    const first = entriesOf(connectionId)[0]
                    if (!first) return
                    void commit(
                      list.map((item, at) =>
                        at === index ? { connectionId, entryId: first.id } : item
                      )
                    )
                  }}
                  className="min-w-36"
                />
                <Select
                  label={'Model dự phòng ' + (index + 1)}
                  size="sm"
                  value={ref.entryId}
                  options={entriesOf(ref.connectionId).map((item) => ({
                    value: item.id,
                    label: item.name
                  }))}
                  onChange={(entryId) =>
                    void commit(
                      list.map((item, at) => (at === index ? { ...item, entryId } : item))
                    )
                  }
                  className="min-w-52 flex-1"
                />
                <Button
                  variant="ghost-muted"
                  size="icon"
                  aria-label={'Bỏ dự phòng ' + (index + 1)}
                  onClick={() => void commit(list.filter((_, at) => at !== index))}
                >
                  <CloseIcon size={12} />
                </Button>
              </div>
            ))}
            {list.length < MAX_FALLBACKS && live.length > 0 && (
              <Button
                variant="ghost-muted"
                size="sm"
                className="self-start"
                onClick={() => {
                  const first = live[0]!
                  void commit([...list, { connectionId: first.id, entryId: first.models[0]!.id }])
                }}
              >
                <AddCircleIcon size={13} />
                Thêm dự phòng
              </Button>
            )}
          </div>
        }
      />
    </SettingsSection>
  )
}
