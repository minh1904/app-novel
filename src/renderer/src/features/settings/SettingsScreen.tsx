import { useState, type JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { PlugCircleIcon } from '@solar-icons/react/linear/plug-circle'
import { CONNECTION_PRESETS } from '../../../../shared/aiConnections'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { MenuItem, MenuPopup, MenuRoot, MenuTrigger } from '../../components/Menu'
import { Panel } from '../../components/Panel'
import { ConnectionCard } from './ConnectionCard'
import { useConnections, type TestState } from './useConnections'

const emptyTest: TestState = {
  running: false,
  models: [],
  listed: false,
  catalogReadAt: null,
  error: null
}

/**
 * Màn cài đặt “Kết nối AI”.
 *
 * Phương án F đã chốt: **một màn riêng, không thanh bên con** — ba mục cài đặt khác (Giao diện,
 * Lưu trữ, Về Mira) chưa tồn tại nên vẽ ra là hứa thứ chưa có. Nội dung giới hạn 900px giữa vùng
 * làm việc; mỗi kết nối là một `Panel`.
 */
export function SettingsScreen({ onBack }: { onBack(): void }): JSX.Element {
  const connections = useConnections()
  // Một mốc thời gian cho cả màn, để các "còn N phút" không lệch nhau giữa các thẻ.
  const [now] = useState(() => Date.now())

  function addFrom(presetId: string): void {
    const preset = CONNECTION_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    void connections.create({
      name: preset.label,
      baseUrl: preset.baseUrl,
      providerId: preset.providerId
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 py-4">
      <header className="flex flex-wrap items-center gap-2">
        <Button variant="ghost-muted" size="default" onClick={onBack}>
          <AltArrowLeftIcon size={15} />
          Quay lại
        </Button>
        <h1 className="m-0 text-[15px] font-semibold">Kết nối AI</h1>
        <MenuRoot>
          <MenuTrigger
            render={
              <Button size="lg" className="ml-auto">
                + Thêm kết nối
              </Button>
            }
          />
          <MenuPopup>
            {CONNECTION_PRESETS.map((preset) => (
              <MenuItem key={preset.id} onClick={() => addFrom(preset.id)}>
                {preset.label}
              </MenuItem>
            ))}
          </MenuPopup>
        </MenuRoot>
      </header>

      <p className="m-0 max-w-[640px] text-[12px] leading-[1.6] text-ink-muted">
        Mira gọi mọi nhà cung cấp qua một endpoint tương thích OpenAI. Khai địa chỉ của gateway bạn
        tự dựng, hoặc dán API key của Google.
      </p>

      {connections.notice && (
        <Banner tone="error" onDismiss={connections.dismissNotice}>
          {connections.notice}
        </Banner>
      )}

      {connections.load === 'loading' && (
        <Panel aria-label="Đang tải">
          <span className="text-[12px] text-ink-muted">Đang tải cài đặt…</span>
        </Panel>
      )}

      {connections.load === 'failed' && (
        <Banner tone="error" onDismiss={() => void connections.reload()}>
          Không đọc được cài đặt kết nối. {connections.loadError}
        </Banner>
      )}

      {connections.load === 'ready' && connections.connections.length === 0 && (
        <EmptyState
          icon={<PlugCircleIcon size={18} />}
          title="Chưa có kết nối nào"
          actions={
            <MenuRoot>
              <MenuTrigger render={<Button size="lg">+ Thêm kết nối</Button>} />
              <MenuPopup align="center">
                {CONNECTION_PRESETS.map((preset) => (
                  <MenuItem key={preset.id} onClick={() => addFrom(preset.id)}>
                    {preset.label}
                  </MenuItem>
                ))}
              </MenuPopup>
            </MenuRoot>
          }
        >
          Chưa khai kết nối thì phần dịch bằng AI chưa dùng được. Khai một endpoint tương thích
          OpenAI — gateway bạn tự dựng trên máy, hoặc API key của Google.
        </EmptyState>
      )}

      {connections.connections.map((connection) => (
        <ConnectionCard
          key={connection.id}
          connection={connection}
          test={connections.tests[connection.id] ?? emptyTest}
          now={now}
          onPatch={(patch) => void connections.update(connection.id, patch)}
          onDelete={() => void connections.remove(connection.id)}
          onTest={() => void connections.test(connection.id)}
          onAddKey={(secret) => connections.addKey(connection.id, secret)}
          onRemoveKey={(keyId) => void connections.removeKey(connection.id, keyId)}
          onSetModels={(models) => void connections.setModels(connection.id, models)}
        />
      ))}
    </div>
  )
}
