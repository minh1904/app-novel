import { useState, type JSX } from 'react'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { TrashBinTrashIcon } from '@solar-icons/react/linear/trash-bin-trash'
import {
  CONNECTION_PRESETS,
  SHARED_QUOTA_PROVIDERS,
  type ConnectionKeyView,
  type ConnectionView
} from '../../../../shared/contracts/aiConnections'
import { Badge, type BadgeTone } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Panel } from '../../components/Panel'
import { Switch } from '../../components/Switch'
import { TextField } from '../../components/TextField'
import type { ModelEntryActions } from '../models/modelEntryActions'
import { ModelEntries } from '../models/ModelEntries'
import type { TestState } from './useConnections'

/** Khoảng thời gian còn lại, nói bằng chữ người đọc được chứ không phải một mốc epoch. */
function remaining(until: number, now: number): string {
  const minutes = Math.max(0, Math.round((until - now) / 60_000))
  if (minutes < 1) return 'dưới một phút'
  if (minutes < 60) return minutes + ' phút'
  const hours = Math.round(minutes / 60)
  return hours + ' giờ'
}

function keyBadge(key: ConnectionKeyView, now: number): { tone: BadgeTone; label: string } {
  if (key.state === 'invalid') return { tone: 'error', label: 'Khóa sai' }
  if (key.frozenUntil !== null && key.frozenUntil > now) {
    const scope = key.frozenScope === 'day' ? 'Hết hạn mức hôm nay' : 'Hết hạn mức'
    return { tone: 'warning', label: scope + ' · còn ' + remaining(key.frozenUntil, now) }
  }
  return { tone: 'success', label: 'Dùng được' }
}

/** Trạng thái của cả kết nối, suy từ trạng thái các khóa và lần kiểm tra gần nhất. */
function connectionBadge(
  connection: ConnectionView,
  test: TestState,
  now: number
): { tone: BadgeTone; label: string } {
  if (!connection.enabled) return { tone: 'muted', label: 'Đã tắt' }
  if (test.running) return { tone: 'muted', label: 'Đang kiểm tra…' }
  if (test.error) return { tone: 'error', label: 'Không nối được' }

  const live = connection.keys.filter(
    (key) => key.state === 'ok' && (key.frozenUntil === null || key.frozenUntil <= now)
  )
  if (connection.keys.length > 0 && live.length === 0) {
    return { tone: 'error', label: 'Hết hạn mức' }
  }
  if (live.length < connection.keys.length) {
    return { tone: 'warning', label: 'Một khóa hết hạn mức' }
  }
  if (connection.checkedAt === null) return { tone: 'muted', label: 'Chưa kiểm tra' }
  return { tone: 'success', label: 'Đang chạy' }
}

export interface ConnectionCardProps {
  connection: ConnectionView
  test: TestState
  now: number
  onPatch(patch: { name?: string; baseUrl?: string; enabled?: boolean }): void
  onDelete(): void
  onTest(): void
  onAddKey(secret: string): Promise<boolean>
  onRemoveKey(keyId: string): void
  entries: ModelEntryActions
}

export function ConnectionCard({
  connection,
  test,
  now,
  onPatch,
  onDelete,
  onTest,
  onAddKey,
  onRemoveKey,
  entries
}: ConnectionCardProps): JSX.Element {
  const [name, setName] = useState(connection.name)
  const [baseUrl, setBaseUrl] = useState(connection.baseUrl)
  const [secret, setSecret] = useState('')
  const [adding, setAdding] = useState(false)

  const status = connectionBadge(connection, test, now)
  const preset = CONNECTION_PRESETS.find((item) => item.providerId === connection.providerId)
  const sharedQuota =
    connection.providerId !== null && SHARED_QUOTA_PROVIDERS.includes(connection.providerId)
  const local = /^https?:\/\/(127\.0\.0\.1|localhost)/i.test(connection.baseUrl)

  const urlError = test.error?.field === 'url' ? test.error.message : undefined
  const keyError = test.error?.field === 'key' ? test.error.message : undefined
  const formError = test.error?.field === 'form' ? test.error.message : undefined

  async function submitKey(): Promise<void> {
    const value = secret.trim()
    if (value === '' || adding) return
    setAdding(true)
    const okay = await onAddKey(value)
    setAdding(false)
    if (okay) setSecret('')
  }

  return (
    <Panel aria-label={connection.name}>
      <div className="flex flex-wrap items-center gap-2">
        <Switch
          checked={connection.enabled}
          onCheckedChange={(checked) => onPatch({ enabled: checked })}
          aria-label={connection.enabled ? 'Tắt kết nối' : 'Bật kết nối'}
        />
        <h3 className="m-0 min-w-0 flex-1 text-ui-sm font-semibold">{connection.name}</h3>
        <Badge tone={status.tone}>{status.label}</Badge>
        <Button variant="ghost-muted" size="icon" aria-label="Xóa kết nối" onClick={onDelete}>
          <TrashBinTrashIcon size={15} />
        </Button>
      </div>

      {formError && (
        <p role="alert" className="m-0 text-ui-xs text-error">
          {formError}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <TextField
          label="Tên kết nối"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => name.trim() !== connection.name && onPatch({ name: name.trim() })}
        />
        <TextField
          label="Địa chỉ (URL)"
          value={baseUrl}
          className="font-mono"
          error={urlError}
          hint={preset?.hint}
          onChange={(event) => setBaseUrl(event.target.value)}
          onBlur={() =>
            baseUrl.trim() !== connection.baseUrl && onPatch({ baseUrl: baseUrl.trim() })
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="m-0 text-ui-xs font-semibold">
          Khóa API{' '}
          <span className="font-normal text-ink-muted">— để trống nếu endpoint không cần</span>
        </p>
        {connection.keys.length === 0 && (
          <p className="m-0 text-ui-xs text-ink-muted">
            {local
              ? 'Chưa có khóa nào. Endpoint chạy trên máy bạn thường không cần khóa.'
              : 'Chưa có khóa nào.'}
          </p>
        )}
        {connection.keys.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {connection.keys.map((key) => {
              const badge = keyBadge(key, now)
              return (
                <li
                  key={key.id}
                  className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-canvas px-2.5 py-1.5"
                >
                  <span className="font-mono text-ui-xs">…{key.tail}</span>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  <Button
                    variant="ghost-muted"
                    size="xs"
                    className="ml-auto"
                    aria-label={'Xóa khóa …' + key.tail}
                    onClick={() => onRemoveKey(key.id)}
                  >
                    Xóa
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <TextField
            label="Thêm khóa"
            type="password"
            className="min-w-[240px] flex-1"
            value={secret}
            error={keyError}
            placeholder="Dán khóa rồi bấm Thêm"
            onChange={(event) => setSecret(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void submitKey()
              }
            }}
          />
          <Button
            variant="outline"
            size="lg"
            disabled={secret.trim() === '' || adding}
            onClick={() => void submitKey()}
          >
            Thêm
          </Button>
        </div>
        {connection.keys.length >= 1 && sharedQuota && (
          <p className="m-0 text-ui-xs text-ink-muted">
            Khóa cùng một project Google có thể dùng chung hạn mức, nên khóa thứ hai nên lấy từ
            project khác.
          </p>
        )}
        {connection.keys.length > 1 && (
          <p className="m-0 text-ui-xs text-ink-muted">
            Dùng cạn khóa trên rồi mới sang khóa dưới.
          </p>
        )}
      </div>

      <ModelEntries connection={connection} test={test} actions={entries} onFetchModels={onTest} />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <span className="w-full basis-full text-ui-xs text-ink-muted">
          {connection.checkedAt === null
            ? 'Chưa kiểm tra lần nào'
            : 'Kiểm tra gần nhất: ' + new Date(connection.checkedAt).toLocaleString('vi-VN')}
        </span>
        <Button variant="outline" size="lg" disabled={test.running} onClick={onTest}>
          {test.running && <RefreshIcon size={14} className="animate-spin" />}
          {test.running ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
        </Button>
      </div>
    </Panel>
  )
}
