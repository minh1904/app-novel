import { useState, type JSX } from 'react'
import { TrashBinTrashIcon } from '@solar-icons/react/linear/trash-bin-trash'
import {
  CONNECTION_PRESETS,
  SHARED_QUOTA_PROVIDERS,
  type ConnectionView
} from '../../../../shared/contracts/aiConnections'
import { Badge } from '../../components/ui/Badge'
import { keyBadge } from './connectionStatus'
import { Button, LinkButton } from '../../components/ui/Button'
import { CompactButton } from '../../components/ui/CompactButton'
import { ConfirmDialog, type ConfirmRequest } from '../../components/ui/ConfirmDialog'
import { SettingRow } from '../../components/ui/Setting'
import { Switch } from '../../components/ui/Switch'
import { TextField } from '../../components/ui/Field'
import { useConnectionStore, emptyTest } from '../../stores/connectionStore'
import { notify } from '../../stores/notificationStore'
import { openModelList } from './openConnectionSettings'

/**
 * Phần thân của một kết nối trong Cài đặt: bật/tắt, tên, địa chỉ, các khóa, lối sang danh sách model, kiểm
 * tra và xóa. Các mục model không nằm ở đây mà ở Model › Danh sách model, như Hermes giữ thẻ provider cho
 * khóa. Thẻ Khóa API dùng bản `compact`; Endpoint tùy chỉnh và Trên máy dùng bản đầy đủ.
 */
export function ConnectionDetails({
  connection,
  now,
  showAddress = true,
  compact = false
}: {
  connection: ConnectionView
  now: number
  /** Thẻ provider đã biết ẩn địa chỉ: người dùng hiếm khi cần đổi nó. */
  showAddress?: boolean
  /**
   * Thẻ Khóa API (như Hermes): ô khóa đã ở hàng đầu thẻ nên không có ô thêm khóa, khóa chỉ được liệt kê khi
   * có từ hai khóa trở lên, và bật/tắt, kiểm tra, xóa gom vào một hàng thay vì ba hàng cài đặt.
   */
  compact?: boolean
}): JSX.Element {
  const store = useConnectionStore()
  const test = store.tests[connection.id] ?? emptyTest
  const [name, setName] = useState(connection.name)
  const [baseUrl, setBaseUrl] = useState(connection.baseUrl)
  const [secret, setSecret] = useState('')
  const [adding, setAdding] = useState(false)
  const [probing, setProbing] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const preset = CONNECTION_PRESETS.find((item) => item.providerId === connection.providerId)
  const sharedQuota =
    connection.providerId !== null && SHARED_QUOTA_PROVIDERS.includes(connection.providerId)
  const local = /^https?:\/\/(127\.0\.0\.1|localhost)/i.test(connection.baseUrl)
  const keyError = test.error?.field === 'key' ? test.error.message : undefined

  function askRemove(): void {
    setConfirm({
      title: 'Xóa ' + connection.name + '?',
      description:
        'Khóa và các mục model của kết nối này bị xóa. Model chính hay dự phòng trỏ tới nó cũng bị gỡ.',
      confirmLabel: 'Xóa kết nối',
      onConfirm: () => void store.remove(connection.id)
    })
  }

  async function submitKey(): Promise<void> {
    const value = secret.trim()
    if (value === '' || adding) return
    setAdding(true)
    const okay = await store.addKey(connection.id, value)
    setAdding(false)
    if (okay) setSecret('')
  }

  /** Kiểm hai bước (design D5); đổi sang base URL đã giải khi khác địa chỉ đang lưu. */
  async function check(): Promise<void> {
    setProbing(true)
    const result = await store.probe({
      baseUrl: connection.baseUrl,
      connectionId: connection.id,
      apiMode: connection.apiMode
    })
    setProbing(false)
    if (!result.ok) {
      notify({ kind: 'error', title: 'Không kiểm tra được', message: result.message })
      return
    }
    const probe = result.value
    if (probe.ok && probe.resolvedBaseUrl && probe.resolvedBaseUrl !== connection.baseUrl) {
      await store.update(connection.id, { baseUrl: probe.resolvedBaseUrl })
      setBaseUrl(probe.resolvedBaseUrl)
    }
    if (probe.ok) {
      notify({ kind: 'success', title: connection.name, message: probe.message })
      await store.test(connection.id)
    } else {
      notify({
        kind: probe.reachable ? 'warning' : 'error',
        title: connection.name,
        message: probe.message
      })
    }
  }

  return (
    <div className="flex flex-col">
      {!compact && (
        <SettingRow title="Bật kết nối" hint="Tắt thì kết nối không xuất hiện trong menu model.">
          <Switch
            checked={connection.enabled}
            onCheckedChange={(checked) => void store.update(connection.id, { enabled: checked })}
            aria-label={connection.enabled ? 'Tắt kết nối' : 'Bật kết nối'}
          />
        </SettingRow>
      )}

      {!compact && (
        <SettingRow title="Tên kết nối">
          <TextField
            label="Tên kết nối"
            className="w-full [&>label]:sr-only"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() =>
              name.trim() !== connection.name &&
              void store.update(connection.id, { name: name.trim() })
            }
          />
        </SettingRow>
      )}

      {showAddress && (
        <SettingRow title="Địa chỉ (URL)" hint={preset?.hint}>
          <TextField
            label="Địa chỉ (URL)"
            className="w-full font-mono [&>label]:sr-only"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            onBlur={() =>
              baseUrl.trim() !== connection.baseUrl &&
              void store.update(connection.id, { baseUrl: baseUrl.trim() })
            }
          />
        </SettingRow>
      )}

      {(!compact || connection.keys.length > 1) && (
        <SettingRow
          wide
          title="Khóa API"
          hint={
            connection.keys.length === 0
              ? local
                ? 'Chưa có khóa nào. Endpoint chạy trên máy bạn thường không cần khóa.'
                : 'Chưa có khóa nào.'
              : connection.keys.length > 1
                ? 'Dùng cạn khóa trên rồi mới sang khóa dưới.' +
                  (sharedQuota
                    ? ' Khóa cùng một project Google dùng chung hạn mức, nên khóa thứ hai nên lấy từ project khác.'
                    : '')
                : undefined
          }
          below={
            <div className="flex flex-col gap-1.5">
              {connection.keys.map((key) => {
                const badge = keyBadge(key, now)
                return (
                  <div
                    key={key.id}
                    className="flex flex-wrap items-center gap-2 rounded-sm bg-muted px-2.5 py-1"
                  >
                    <span className="font-mono text-body-xs">••••{key.tail}</span>
                    <Badge variant="outline" dot color={badge.tone}>
                      {badge.label}
                    </Badge>
                    <CompactButton
                      className="ml-auto"
                      aria-label={'Xóa khóa …' + key.tail}
                      onClick={() =>
                        setConfirm({
                          title: 'Xóa khóa …' + key.tail + '?',
                          description: 'Khóa bị xóa khỏi máy này; muốn dùng lại thì phải dán lại.',
                          confirmLabel: 'Xóa khóa',
                          onConfirm: () => void store.removeKey(connection.id, key.id)
                        })
                      }
                      icon={<TrashBinTrashIcon size={14} />}
                    />
                  </div>
                )
              })}
              {!compact && (
                <div className="flex items-start gap-2">
                  <TextField
                    label="Thêm khóa"
                    type="password"
                    className="min-w-0 flex-1 [&>label]:sr-only"
                    value={secret}
                    error={keyError}
                    placeholder="Dán khóa rồi nhấn Enter"
                    onChange={(event) => setSecret(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void submitKey()
                      }
                    }}
                  />
                  <Button
                    loading={adding}
                    disabled={secret.trim() === ''}
                    onClick={() => void submitKey()}
                  >
                    Thêm
                  </Button>
                </div>
              )}
            </div>
          }
        />
      )}

      <SettingRow
        title="Model"
        hint={
          connection.models.length === 0
            ? 'Chưa có model nào trong menu chọn model.'
            : connection.models.length + ' model trong menu chọn model.'
        }
      >
        <LinkButton className="h-auto" onClick={() => openModelList(connection.id)}>
          Danh sách model ›
        </LinkButton>
      </SettingRow>

      {compact ? (
        <div className="flex flex-wrap items-center gap-xs py-sm">
          <Switch
            checked={connection.enabled}
            onCheckedChange={(checked) => void store.update(connection.id, { enabled: checked })}
            aria-label={connection.enabled ? 'Tắt kết nối' : 'Bật kết nối'}
          />
          <span className="text-body-xs text-subtle">
            {connection.enabled ? 'Đang bật' : 'Đã tắt; không hiện trong menu model'}
          </span>
          <span className="ml-auto flex gap-xs">
            <Button variant="ghost" loading={probing || test.running} onClick={() => void check()}>
              Kiểm tra
            </Button>
            <Button variant="ghost" color="danger" onClick={askRemove}>
              Xóa kết nối
            </Button>
          </span>
        </div>
      ) : (
        <>
          <SettingRow
            title="Kiểm tra kết nối"
            hint={
              connection.checkedAt === null
                ? 'Chưa kiểm tra lần nào.'
                : 'Kiểm tra gần nhất: ' + new Date(connection.checkedAt).toLocaleString('vi-VN')
            }
          >
            <Button loading={probing || test.running} onClick={() => void check()}>
              Kiểm tra
            </Button>
          </SettingRow>

          <SettingRow title="Xóa kết nối" hint="Xóa cả khóa và các mục model của kết nối này.">
            <Button color="danger" variant="solid" onClick={askRemove}>
              Xóa
            </Button>
          </SettingRow>
        </>
      )}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
