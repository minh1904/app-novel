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
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { EmptyState } from '../../components/EmptyState'
import { SearchField } from '../../components/SearchField'
import { DeleteGlossaryDialog, EditGlossaryDialog, ImportNamesDialog } from './GlossaryDialogs'
import { useGlossary } from './useGlossary'

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
    const from = entry.fromChapterId ? `C.${chapterMap.get(entry.fromChapterId)?.number ?? '?'}` : 'Đầu'
    const to = entry.toChapterId ? `C.${chapterMap.get(entry.toChapterId)?.number ?? '?'}` : 'Cuối'
    return `${from} → ${to}`
  }

  const handleQuickStatus = async (entry: ContextEntryItem, nextStatus: ContextStatus): Promise<void> => {
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
          <SearchField
            label="Tìm kiếm thuật ngữ"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo từ gốc, bản dịch, alias..."
            className="w-64"
          />

          <div className="flex items-center rounded-control border border-line bg-canvas p-0.5 text-xs">
            {(
              [
                { value: 'all', label: 'Tất cả' },
                { value: 'approved', label: 'Đã duyệt' },
                { value: 'pending', label: 'Chờ duyệt' },
                { value: 'rejected', label: 'Từ chối' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={cx(
                  'rounded-[5px] px-2.5 py-1 font-medium transition-colors cursor-pointer',
                  statusFilter === tab.value
                    ? 'bg-selected text-ink'
                    : 'text-ink-muted hover:text-ink'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <ImportIcon size={14} />
            Nhập Names.txt
          </Button>
          <Button variant="default" size="sm" onClick={() => setEditingEntry('new')}>
            <AddIcon size={14} />
            Thêm thuật ngữ
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-control bg-danger/10 p-3 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Main List */}
      <div className="overflow-hidden rounded-panel border border-line bg-canvas">
        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_100px_110px_minmax(0,1.2fr)_100px] items-center border-b border-line bg-sidebar px-3 py-2 text-[12px] font-medium text-ink-muted">
          <span>Từ gốc / Biến thể</span>
          <span>Bản dịch đích</span>
          <span>Trạng thái</span>
          <span>Hiệu lực</span>
          <span>Ghi chú</span>
          <span className="text-right">Thao tác</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-ink-muted">
            Đang tải danh sách thuật ngữ...
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<BookBookmarkIcon size={24} />}
            title={query ? 'Không tìm thấy thuật ngữ nào' : 'Chưa có thuật ngữ nào'}
            actions={
              !query ? (
                <Button variant="secondary" size="sm" onClick={() => setEditingEntry('new')}>
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
          <ul className="divide-y divide-line">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cx(
                  'grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_100px_110px_minmax(0,1.2fr)_100px] items-center px-3 py-2.5 text-xs transition-colors hover:bg-control/30',
                  entry.status === 'pending' && 'bg-warning/5',
                  entry.status === 'rejected' && 'opacity-60'
                )}
              >
                {/* Source & Aliases */}
                <div className="flex flex-col items-start gap-1 pr-2">
                  <span className="font-semibold text-ink">{entry.source}</span>
                  {entry.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.aliases.map((alias) => (
                        <span
                          key={alias}
                          className="rounded-[4px] bg-sidebar px-1 py-px text-[10px] text-ink-muted border border-line"
                        >
                          {alias}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Target & Forbidden */}
                <div className="flex flex-col items-start gap-1 pr-2">
                  <span className={cx('font-medium', entry.forbidden ? 'text-danger line-through' : 'text-ink')}>
                    {entry.target}
                  </span>
                  {entry.forbidden && (
                    <span className="rounded-[4px] bg-danger/10 px-1 py-px text-[10px] font-semibold text-danger">
                      Cấm dùng
                    </span>
                  )}
                </div>

                {/* Status */}
                <div>
                  {entry.status === 'approved' && (
                    <Badge tone="success">Đã duyệt</Badge>
                  )}
                  {entry.status === 'pending' && (
                    <Badge tone="warning">Chờ duyệt</Badge>
                  )}
                  {entry.status === 'rejected' && (
                    <Badge tone="muted">Từ chối</Badge>
                  )}
                </div>

                {/* Scope */}
                <span className="text-[11px] text-ink-muted">
                  {formatChapterScope(entry)}
                </span>

                {/* Notes */}
                <span className="truncate pr-2 text-[11px] text-ink-muted" title={entry.notes ?? ''}>
                  {entry.notes || '—'}
                </span>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  {entry.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleQuickStatus(entry, 'approved')}
                        className="rounded p-1 text-success hover:bg-success/15 cursor-pointer"
                        title="Duyệt mục này"
                      >
                        <CheckIcon size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickStatus(entry, 'rejected')}
                        className="rounded p-1 text-danger hover:bg-danger/15 cursor-pointer"
                        title="Từ chối mục này"
                      >
                        <CloseCircleIcon size={14} />
                      </button>
                    </>
                  )}
                  {entry.status === 'rejected' && (
                    <button
                      type="button"
                      onClick={() => handleQuickStatus(entry, 'approved')}
                      className="rounded p-1 text-ink-muted hover:bg-control hover:text-ink cursor-pointer"
                      title="Phục hồi (Duyệt lại)"
                    >
                      <CheckIcon size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingEntry(entry)}
                    className="rounded p-1 text-ink-muted hover:bg-control hover:text-ink cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    <PenNewSquareIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingEntry(entry)}
                    className="rounded p-1 text-ink-muted hover:bg-danger/15 hover:text-danger cursor-pointer"
                    title="Xóa thuật ngữ"
                  >
                    <TrashBinMinimalisticIcon size={14} />
                  </button>
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

      <ImportNamesDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={importNames}
      />

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
