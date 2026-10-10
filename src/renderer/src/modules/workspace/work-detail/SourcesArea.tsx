import { useEffect, useState, type JSX } from 'react'
import { ImportIcon } from '@solar-icons/react/linear/import'
import { StarIcon } from '@solar-icons/react/linear/star'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { TrashBinTrashIcon } from '@solar-icons/react/linear/trash-bin-trash'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { ConfirmDialog, type ConfirmRequest } from '../../../components/ui/ConfirmDialog'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { ICON } from '../../../components/ui/icon'
import { cn } from '../../../lib/cn'
import { LanguageMark } from '../../library/public'
import type { SourceLanguage } from '../../library/public'
import type { SourceBinding } from '../../../../../shared/contracts/sources'
import { AddRawDialog } from './AddRawDialog'

export interface SourcesAreaProps {
  workId: string
  initialBindings?: SourceBinding[]
}

const ADAPTER_NAMES: Record<string, string> = {
  'mira.folder': 'Thư mục tệp',
  'builtin.folder': 'Thư mục tệp',
  'mira.single-file': 'Tệp văn bản',
  'builtin.single-file': 'Tệp văn bản'
}

export function SourcesArea({ workId, initialBindings }: SourcesAreaProps): JSX.Element {
  const [bindings, setBindings] = useState<SourceBinding[]>(initialBindings ?? [])
  const [loading, setLoading] = useState(!initialBindings)
  const [addRawOpen, setAddRawOpen] = useState(false)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)

  // Sync state
  const [activeSync, setActiveSync] = useState<{
    bindingId: string
    runId: string
    phase: string
    processed: number
    total: number
  } | null>(null)

  const reloadBindings = async (): Promise<void> => {
    if (initialBindings) return
    setLoading(true)
    try {
      if (typeof window !== 'undefined' && window.mira?.sources?.bindings) {
        const res = await window.mira.sources.bindings.list({ workId })
        if (res.ok) {
          setBindings(res.value)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialBindings) {
      void reloadBindings()
    }
  }, [workId, initialBindings])

  // Listen to sync progress
  useEffect(() => {
    if (typeof window !== 'undefined' && window.mira?.sources?.sync?.onProgress) {
      const unsubscribe = window.mira.sources.sync.onProgress((progress) => {
        if (progress.bindingId) {
          setActiveSync({
            bindingId: progress.bindingId,
            runId: progress.runId,
            phase: progress.phase,
            processed: progress.processedCount,
            total: progress.totalCount ?? 0
          })
          if (progress.phase === 'done') {
            setTimeout(() => {
              setActiveSync(null)
              void reloadBindings()
            }, 1000)
          }
        }
      })
      return () => unsubscribe()
    }
    return undefined
  }, [workId])

  // Set primary
  const handleSetPrimary = async (bindingId: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.mira?.sources?.bindings) {
      const res = await window.mira.sources.bindings.update({
        workId,
        bindingId,
        patch: { role: 'primary' }
      })
      if (res.ok) {
        setBindings((prev) =>
          prev.map((b) => ({
            ...b,
            role: b.id === bindingId ? 'primary' : 'reference'
          }))
        )
      }
    } else {
      setBindings((prev) =>
        prev.map((b) => ({
          ...b,
          role: b.id === bindingId ? 'primary' : 'reference'
        }))
      )
    }
  }

  // Trigger manual sync
  const handleStartSync = async (bindingId: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.mira?.sources?.sync) {
      setActiveSync({
        bindingId,
        runId: 'running',
        phase: 'catalog',
        processed: 0,
        total: 100
      })
      try {
        const res = await window.mira.sources.sync.start({ workId, bindingId })
        if (res.ok) {
          void reloadBindings()
        }
      } finally {
        setTimeout(() => setActiveSync(null), 800)
      }
    }
  }

  // Cancel running sync
  const handleCancelSync = async (runId: string): Promise<void> => {
    if (typeof window !== 'undefined' && window.mira?.sources?.sync) {
      await window.mira.sources.sync.cancel({ runId })
      setActiveSync(null)
    }
  }

  // Unlink binding
  const handleUnlink = (binding: SourceBinding): void => {
    setConfirmRequest({
      title: `Gỡ Bản raw "${binding.label}"?`,
      description:
        'Thao tác này sẽ tách nguồn raw khỏi tác phẩm. Các chương, bản dịch và nội dung đã có trong tác phẩm sẽ được giữ nguyên 100%.',
      confirmLabel: 'Gỡ Bản raw',
      onConfirm: async () => {
        if (typeof window !== 'undefined' && window.mira?.sources?.bindings) {
          const res = await window.mira.sources.bindings.delete({
            workId,
            bindingId: binding.id,
            confirmed: true
          })
          if (res.ok) {
            setBindings((prev) => prev.filter((b) => b.id !== binding.id))
          }
        } else {
          setBindings((prev) => prev.filter((b) => b.id !== binding.id))
        }
      }
    })
  }

  return (
    <section
      aria-labelledby="sources-heading"
      className="flex flex-col gap-lg rounded-lg border border-default p-lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="flex flex-col gap-2xs">
          <h2 id="sources-heading" className="m-0 text-heading">
            Bản raw
          </h2>
          <p className="m-0 max-w-(--container-md) text-body-sm text-subtle">
            Quản lý các bản raw của tác phẩm và chọn bản chính để dịch; các bản còn lại dùng để đối
            chiếu song song.
          </p>
        </div>
        <div className="flex items-center gap-xs">
          {bindings.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                const primary = bindings.find((b) => b.role === 'primary') ?? bindings[0]
                if (primary) void handleStartSync(primary.id)
              }}
              leftIcon={<RefreshIcon size={ICON.sm} />}
            >
              Kiểm tra cập nhật
            </Button>
          )}
          <Button
            variant="solid"
            onClick={() => setAddRawOpen(true)}
            leftIcon={<ImportIcon size={ICON.sm} />}
          >
            Thêm Bản raw
          </Button>
        </div>
      </div>

      {/* Sync active notice */}
      {activeSync && (
        <div className="flex flex-col gap-xs rounded-md border border-info bg-info/10 p-md">
          <div className="flex items-center justify-between text-body-sm">
            <span className="font-medium text-default">
              Đang kiểm tra cập nhật nguồn: {activeSync.phase}...
            </span>
            <Button variant="ghost" onClick={() => void handleCancelSync(activeSync.runId)}>
              Hủy
            </Button>
          </div>
          <ProgressBar
            label="Tiến độ kiểm tra"
            value={activeSync.total > 0 ? (activeSync.processed / activeSync.total) * 100 : 50}
          />
        </div>
      )}

      {/* List of raw bindings */}
      {loading ? (
        <p role="status" className="py-xl text-center text-body-sm text-subtle">
          Đang tải danh sách Bản raw…
        </p>
      ) : bindings.length === 0 ? (
        <EmptyState
          icon={<ImportIcon size={ICON.md} />}
          title="Chưa có Bản raw nào"
          actions={
            <Button variant="light" onClick={() => setAddRawOpen(true)}>
              Thêm Bản raw ngay
            </Button>
          }
        >
          Gắn thư mục chương hoặc tệp văn bản để theo dõi tiến độ và đối chiếu nội dung khi dịch.
        </EmptyState>
      ) : (
        <ul className="m-0 grid list-none gap-md p-0 @min-[640px]:grid-cols-2">
          {bindings.map((binding) => {
            const isPrimary = binding.role === 'primary'
            const adapterTitle = ADAPTER_NAMES[binding.sourceId] ?? binding.sourceId
            const totalCount = binding.checkpoint ? 1 : 0
            const lastSync = binding.updatedAt
              ? new Date(binding.updatedAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Chưa kiểm tra'

            return (
              <li
                key={binding.id}
                data-slot="raw-binding-card"
                className={cn(
                  'flex flex-col justify-between gap-md rounded-md border p-md transition-colors',
                  isPrimary ? 'border-strong bg-muted/30' : 'border-default bg-surface'
                )}
              >
                <div className="flex flex-col gap-sm">
                  {/* Title & language */}
                  <div className="flex items-start justify-between gap-xs">
                    <div className="flex items-center gap-xs">
                      <LanguageMark language={binding.languageTag as SourceLanguage} />
                      <div className="min-w-0 flex-1">
                        <h3 className="m-0 truncate text-label-md font-semibold text-default">
                          {binding.label}
                        </h3>
                        <p className="m-0 text-body-xs text-subtle">
                          {adapterTitle} · {lastSync}
                        </p>
                      </div>
                    </div>
                    {isPrimary ? (
                      <Badge color="accent" dot>
                        <span className="inline-flex items-center gap-3xs">
                          <StarIcon size={12} />
                          Bản chính
                        </span>
                      </Badge>
                    ) : (
                      <Badge color="neutral">Đối chiếu</Badge>
                    )}
                  </div>

                  {/* Matching progress bar */}
                  <div className="flex flex-col gap-2xs">
                    <div className="flex items-center justify-between text-body-xs text-subtle">
                      <span>Độ phủ nội dung</span>
                      <span>{totalCount > 0 ? 'Có dữ liệu' : 'Chưa có dữ liệu'}</span>
                    </div>
                    <ProgressBar label="Độ phủ nội dung" value={totalCount > 0 ? 100 : 0} />
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex items-center justify-between gap-xs border-t border-subtle pt-xs">
                  <div className="flex items-center gap-2xs">
                    {!isPrimary && (
                      <Button variant="outline" onClick={() => void handleSetPrimary(binding.id)}>
                        Đặt làm bản chính
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => void handleStartSync(binding.id)}
                      leftIcon={<RefreshIcon size={ICON.xs} />}
                    >
                      Kiểm tra
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => handleUnlink(binding)}
                    aria-label={`Gỡ ${binding.label}`}
                    leftIcon={<TrashBinTrashIcon size={ICON.xs} />}
                  >
                    Gỡ
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="m-0 text-body-xs text-subtle">
        Chỉ kiểm tra khi ứng dụng đang mở và người dùng yêu cầu. Không tự động chạy nền khi tắt app.
      </p>

      {/* Add Raw Wizard Dialog */}
      <AddRawDialog
        open={addRawOpen}
        onOpenChange={setAddRawOpen}
        workId={workId}
        onBindingCreated={(newBinding) => {
          setBindings((prev) => [...prev, newBinding])
        }}
      />

      {/* Unlink Confirmation */}
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </section>
  )
}
