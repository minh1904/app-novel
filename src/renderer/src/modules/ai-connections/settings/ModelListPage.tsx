import { useState, type JSX } from 'react'
import { ChecklistMinimalisticIcon } from '@solar-icons/react/linear/checklist-minimalistic'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import { connectionSection } from '../../../../../shared/contracts/aiProviders'
import { Badge } from '../../../components/ui/Badge'
import { Button, LinkButton } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SectionHeading } from '../../../components/ui/Setting'
import { cn } from '../../../lib/cn'
import { emptyTest, useConnectionStore } from '../store/connectionStore'
import { useAiOverlayStore } from '../store/overlayStore'
import { ModelEntries } from '../model-selection/ModelEntries'
import { connectionLive } from './connectionStatus'
import { openConnectionSettings } from './openConnectionSettings'
import { useConnections } from './useConnections'

const SECTION_ORDER = ['accounts', 'keys', 'endpoints', 'local'] as const

/** Accounts first, then keys, endpoints and local models: the order of the Kết nối AI pages. */
function ordered(connections: readonly ConnectionView[]): ConnectionView[] {
  return [...connections].sort(
    (a, b) =>
      SECTION_ORDER.indexOf(connectionSection(a)) - SECTION_ORDER.indexOf(connectionSection(b))
  )
}

function ConnectionModels({
  connection,
  now
}: {
  connection: ConnectionView
  now: number
}): JSX.Element {
  const store = useConnectionStore()
  const test = store.tests[connection.id] ?? emptyTest
  return (
    <section data-setting-id={'models:' + connection.id} className="mb-xl">
      <SectionHeading
        icon={
          <span
            aria-hidden="true"
            className={cn(
              'size-2 rounded-full',
              connectionLive(connection, now) ? 'bg-inverted' : 'bg-line-strong'
            )}
          />
        }
        aside={
          <>
            {!connection.enabled && (
              <Badge variant="outline" dot color="neutral">
                Đã tắt
              </Badge>
            )}
            <LinkButton className="h-auto" onClick={() => openConnectionSettings(connection.id)}>
              Kết nối ›
            </LinkButton>
          </>
        }
      >
        {connection.name}
      </SectionHeading>
      <ModelEntries
        connection={connection}
        test={test}
        actions={store.entries}
        onFetchModels={() => void store.test(connection.id)}
        heading={false}
      />
    </section>
  )
}

/**
 * Cài đặt › Model › Danh sách model: the entries of every connection, which the model menu lists. Hermes
 * keeps models out of the provider cards ("Edit models…"); the cards only hold keys.
 */
export function ModelListPage(): JSX.Element {
  const { connections } = useConnections()
  const setOnboardingOpen = useAiOverlayStore((state) => state.setOnboardingOpen)
  const [now] = useState(() => Date.now())

  return (
    <>
      <SectionHeading icon={<ChecklistMinimalisticIcon size={16} />}>
        Danh sách model
      </SectionHeading>
      <p className="m-0 mb-md text-body-xs text-subtle">
        Các model hiện trong menu chọn model, theo từng kết nối. Mỗi mục giữ mức suy luận, giới hạn
        của tác vụ dịch và tham số riêng.
      </p>
      {connections.length === 0 ? (
        <EmptyState
          title="Chưa có kết nối nào"
          actions={
            <Button variant="solid" onClick={() => setOnboardingOpen(true)}>
              Kết nối nhà cung cấp
            </Button>
          }
        >
          Kết nối một nhà cung cấp AI trước, rồi chọn model ở đây.
        </EmptyState>
      ) : (
        ordered(connections).map((connection) => (
          <ConnectionModels key={connection.id} connection={connection} now={now} />
        ))
      )}
    </>
  )
}
