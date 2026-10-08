import { useEffect, useState, type JSX } from 'react'
import { AddIcon } from '@solar-icons/react/linear/add'
import { BookBookmarkIcon } from '@solar-icons/react/linear/book-bookmark'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { CloseCircleIcon } from '@solar-icons/react/linear/close-circle'
import { ImportIcon } from '@solar-icons/react/linear/import'
import { PenNewSquareIcon } from '@solar-icons/react/linear/pen-new-square'
import { TrashBinMinimalisticIcon } from '@solar-icons/react/linear/trash-bin-minimalistic'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import type { ContextEntryItem, ContextStatus } from '../../../../shared/contracts/glossary'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { ButtonGroup } from '../../components/ui/ButtonGroup'
import { CompactButton } from '../../components/ui/CompactButton'
import { ICON } from '../../components/ui/icon'
import { EmptyState } from '../../components/ui/EmptyState'
import { SearchInput } from '../../components/ui/Input'
import { DeleteGlossaryDialog, EditGlossaryDialog, ImportNamesDialog } from './GlossaryDialogs'
import { useGlossary } from './useGlossary'

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'rejected', label: 'Từ chối' }
] as const

export interface GlossaryScreenProps {
  workId: string
}

export function GlossaryScreen({ workId }: GlossaryScreenProps): JSX.Element {
  const {
    entries,
    loading,
    error,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    createEntry,
    updateEntry,
    deleteEntry,
    importNames
  } = useGlossary({ workId })

  const [chapters, setChapters] = useState<ChapterItem[]>([])
  const [editingEntry, setEditingEntry] = useState<ContextEntryItem | null | 'new'>(null)
  const [deletingEntry, setDeletingEntry] = useState<ContextEntryItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    let active = true
    window.mira.chapters.list(workId).then((res) => {
      if (active && res.ok) {
        setChapters(res.value.chapters)
      }
    })
    return () => {
      active = false
    }
  }, [workId])

  const chapterMap = new Map<string, ChapterItem>(chapters.map((c) => [c.id, c]))

  const formatChapterScope = (entry: ContextEntryItem): string => {
    if (!entry.fromChapterId && !entry.toChapterId) return 'Toàn bộ truyện'
    const from = entry.fromChapterId
      ? `C.${chapterMap.get(entry.fromChapterId)?.number ?? '?'}`
      : 'Đầu'
    const to = entry.toChapterId ? `C.${chapterMap.get(entry.toChapterId)?.number ?? '?'}` : 'Cuối'
    return `${from} → ${to}`
  }

  const handleQuickStatus = async (
    entry: ContextEntryItem,
    nextStatus: ContextStatus
  ): Promise<void> => {
    try {
      await updateEntry(entry.id, { status: nextStatus })
    } catch (err) {
      console.error('Không thể cập nhật trạng thái:', err)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            label="Tìm kiếm thuật ngữ"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo từ gốc, bản dịch, alias..."
            className="w-64"
          />

          <ButtonGroup
            label="Lọc theo trạng thái"
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={setStatusFilter}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button leftIcon={<ImportIcon size={ICON.sm} />} onClick={() => setImportOpen(true)}>
            Nhập Names.txt
          </Button>
          <Button
            leftIcon={<AddIcon size={ICON.sm} />}
            variant="solid"
            onClick={() => setEditingEntry('new')}
          >
            Thêm thuật ngữ
          </Button>
        </div>
      </div>

      {error && <div className="rounded-sm bg-error/10 p-3 text-body-xs text-error">{error}</div>}

      {/* Main List */}
      <div className="overflow-hidden rounded-lg border border-default bg-surface">
        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_100px_110px_minmax(0,1.2fr)_100px] items-center border-b border-default bg-subtle px-3 py-2 text-body-xs font-medium text-subtle">
          <span>Từ gốc / Biến thể</span>
          <span>Bản dịch đích</span>
          <span>Trạng thái</span>
          <span>Hiệu lực</span>
          <span>Ghi chú</span>
          <span className="text-right">Thao tác</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-body-xs text-subtle">
            Đang tải danh sách thuật ngữ...
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<BookBookmarkIcon size={24} />}
            title={query ? 'Không tìm thấy thuật ngữ nào' : 'Chưa có thuật ngữ nào'}
            actions={
              !query ? (
                <Button variant="light" onClick={() => setEditingEntry('new')}>
                  Thêm thuật ngữ đầu tiên
                </Button>
              ) : undefined
            }
          >
            {query
              ? 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.'
              : 'Thêm thuật ngữ hoặc nhập từ tệp Names.txt để AI tự động áp dụng khi dịch.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-default">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  'grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_100px_110px_minmax(0,1.2fr)_100px] items-center px-3 py-2.5 text-body-xs transition-colors hover:bg-hover',
                  entry.status === 'pending' && 'bg-warning/5',
                  entry.status === 'rejected' && 'opacity-60'
                )}
              >
                {/* Source & Aliases */}
                <div className="flex flex-col items-start gap-1 pr-2">
                  <span className="font-semibold text-default">{entry.source}</span>
                  {entry.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.aliases.map((alias) => (
                        <span
                          key={alias}
                          className="rounded-sm bg-subtle px-1 py-px text-body-xs text-subtle border border-default"
                        >
                          {alias}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Target & Forbidden */}
                <div className="flex flex-col items-start gap-1 pr-2">
                  <span
                    className={cn(
                      'font-medium',
                      entry.forbidden ? 'text-error line-through' : 'text-default'
                    )}
                  >
                    {entry.target}
                  </span>
                  {entry.forbidden && (
                    <span className="rounded-sm bg-error/10 px-1 py-px text-body-xs font-semibold text-error">
                      Cấm dùng
                    </span>
                  )}
                </div>

                {/* Status */}
                <div>
                  {entry.status === 'approved' && (
                    <Badge variant="outline" dot color="success">
                      Đã duyệt
                    </Badge>
                  )}
                  {entry.status === 'pending' && (
                    <Badge variant="outline" dot color="warning">
                      Chờ duyệt
                    </Badge>
                  )}
                  {entry.status === 'rejected' && (
                    <Badge variant="outline" dot color="neutral">
                      Từ chối
                    </Badge>
                  )}
                </div>

                {/* Scope */}
                <span className="text-body-xs text-subtle">{formatChapterScope(entry)}</span>

                {/* Notes */}
                <span className="truncate pr-2 text-body-xs text-subtle" title={entry.notes ?? ''}>
                  {entry.notes || '—'}
                </span>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  {entry.status === 'pending' && (
                    <>
                      <CompactButton
                        tone="success"
                        icon={<CheckIcon size={ICON.sm} />}
                        aria-label="Duyệt mục này"
                        title="Duyệt mục này"
                        onClick={() => handleQuickStatus(entry, 'approved')}
                      />
                      <CompactButton
                        tone="danger"
                        icon={<CloseCircleIcon size={ICON.sm} />}
                        aria-label="Từ chối mục này"
                        title="Từ chối mục này"
                        onClick={() => handleQuickStatus(entry, 'rejected')}
                      />
                    </>
                  )}
                  {entry.status === 'rejected' && (
                    <CompactButton
                      tone="success"
                      icon={<CheckIcon size={ICON.sm} />}
                      aria-label="Phục hồi (Duyệt lại)"
                      title="Phục hồi (Duyệt lại)"
                      onClick={() => handleQuickStatus(entry, 'approved')}
                    />
                  )}
                  <CompactButton
                    icon={<PenNewSquareIcon size={ICON.sm} />}
                    aria-label="Chỉnh sửa"
                    title="Chỉnh sửa"
                    onClick={() => setEditingEntry(entry)}
                  />
                  <CompactButton
                    tone="danger"
                    icon={<TrashBinMinimalisticIcon size={ICON.sm} />}
                    aria-label="Xóa thuật ngữ"
                    title="Xóa thuật ngữ"
                    onClick={() => setDeletingEntry(entry)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialogs */}
      <EditGlossaryDialog
        open={editingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null)
        }}
        entry={editingEntry === 'new' ? null : editingEntry}
        chapters={chapters}
        onSave={async (data) => {
          if (editingEntry === 'new') {
            await createEntry(data)
          } else if (editingEntry) {
            await updateEntry(editingEntry.id, data)
          }
        }}
      />

      <ImportNamesDialog open={importOpen} onOpenChange={setImportOpen} onImport={importNames} />

      <DeleteGlossaryDialog
        open={deletingEntry !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingEntry(null)
        }}
        entry={deletingEntry}
        onConfirm={async () => {
          if (deletingEntry) {
            await deleteEntry(deletingEntry.id)
          }
        }}
      />
    </div>
  )
}
