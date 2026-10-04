import { useEffect, useState, type JSX } from 'react'
import { AddIcon } from '@solar-icons/react/linear/add'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { CloseCircleIcon } from '@solar-icons/react/linear/close-circle'
import { PenNewSquareIcon } from '@solar-icons/react/linear/pen-new-square'
import { TrashBinMinimalisticIcon } from '@solar-icons/react/linear/trash-bin-minimalistic'
import { UsersGroupRoundedIcon } from '@solar-icons/react/linear/users-group-rounded'
import { UserRoundedIcon } from '@solar-icons/react/linear/user-rounded'
import type { ChapterItem } from '../../../../shared/contracts/chapters'
import type {
  AddressingDyadItem,
  CharacterItem
} from '../../../../shared/contracts/addressing'
import type { ContextStatus } from '../../../../shared/contracts/glossary'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { EmptyState } from '../../components/EmptyState'
import { SearchField } from '../../components/SearchField'
import { Select } from '../../components/Select'
import {
  DeleteCharacterDialog,
  DeleteDyadDialog,
  EditCharacterDialog,
  EditDyadDialog
} from './AddressingDialogs'
import { useAddressing } from './useAddressing'

export interface AddressingScreenProps {
  workId: string
}

export function AddressingScreen({ workId }: AddressingScreenProps): JSX.Element {
  const {
    characters,
    dyads,
    loading,
    error,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    chapterFilter,
    setChapterFilter,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    setDyad,
    deleteDyad
  } = useAddressing({ workId })

  const [activeTab, setActiveTab] = useState<'dyads' | 'characters'>('dyads')
  const [chapters, setChapters] = useState<ChapterItem[]>([])

  // Dialog states
  const [editingCharacter, setEditingCharacter] = useState<CharacterItem | null | 'new'>(null)
  const [deletingCharacter, setDeletingCharacter] = useState<CharacterItem | null>(null)
  const [editingDyad, setEditingDyad] = useState<AddressingDyadItem | null | 'new'>(null)
  const [deletingDyad, setDeletingDyad] = useState<AddressingDyadItem | null>(null)

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
  const charMap = new Map<string, CharacterItem>(characters.map((c) => [c.id, c]))

  const formatChapterScope = (dyad: AddressingDyadItem): string => {
    if (!dyad.fromChapterId && !dyad.toChapterId) return 'Toàn bộ truyện'
    const from = dyad.fromChapterId ? `C.${chapterMap.get(dyad.fromChapterId)?.number ?? '?'}` : 'Đầu'
    const to = dyad.toChapterId ? `C.${chapterMap.get(dyad.toChapterId)?.number ?? '?'}` : 'Cuối'
    return `${from} → ${to}`
  }

  const handleQuickDyadStatus = async (dyad: AddressingDyadItem, nextStatus: ContextStatus): Promise<void> => {
    try {
      await setDyad({
        dyadId: dyad.id,
        sourceCharacterId: dyad.sourceCharacterId,
        targetCharacterId: dyad.targetCharacterId,
        speakerPronoun: dyad.speakerPronoun,
        recipientPronoun: dyad.recipientPronoun,
        formality: dyad.formality,
        fromChapterId: dyad.fromChapterId,
        toChapterId: dyad.toChapterId,
        notes: dyad.notes,
        status: nextStatus
      })
    } catch (err) {
      console.error('Không thể cập nhật trạng thái dyad:', err)
    }
  }

  const chapterOptions = [
    { value: 'all', label: 'Tất cả chương' },
    ...chapters.map((c) => ({
      value: c.id,
      label: `Chương ${c.number}: ${c.title || 'Không tiêu đề'}`
    }))
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            label="Tìm kiếm xưng hô hoặc nhân vật"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên nhân vật, đại từ..."
            className="w-60"
          />

          <div className="w-48">
            <Select
              label="Lọc theo chương"
              value={chapterFilter}
              options={chapterOptions}
              onChange={setChapterFilter}
            />
          </div>

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingCharacter('new')}
          >
            <AddIcon size={14} />
            Thêm nhân vật
          </Button>

          <Button
            size="sm"
            onClick={() => setEditingDyad('new')}
            disabled={characters.length < 2}
            title={characters.length < 2 ? 'Cần ít nhất 2 nhân vật để tạo cặp xưng hô' : undefined}
          >
            <AddIcon size={14} />
            Thêm xưng hô
          </Button>
        </div>
      </div>

      {/* Subtab selection */}
      <div className="flex items-center border-b border-line gap-6 text-[13px]">
        <button
          type="button"
          onClick={() => setActiveTab('dyads')}
          className={cx(
            'pb-2 font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-1.5',
            activeTab === 'dyads'
              ? 'border-accent text-ink font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <UsersGroupRoundedIcon size={16} />
          Quan hệ xưng hô ({dyads.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('characters')}
          className={cx(
            'pb-2 font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-1.5',
            activeTab === 'characters'
              ? 'border-accent text-ink font-semibold'
              : 'border-transparent text-ink-muted hover:text-ink'
          )}
        >
          <UserRoundedIcon size={16} />
          Dàn nhân vật ({characters.length})
        </button>
      </div>

      {error && (
        <div className="rounded-control border border-error/30 bg-error/10 p-3 text-xs text-error">
          {error}
        </div>
      )}

      {/* Dyads Tab Content */}
      {activeTab === 'dyads' && (
        <div className="overflow-hidden rounded-panel border border-line bg-canvas">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_110px_90px] items-center border-b border-line bg-sidebar px-3.5 py-2.5 text-[12px] font-medium text-ink-muted">
            <span>Người nói → Người nghe</span>
            <span>Từ xưng hô (Tự xưng – Gọi đối phương)</span>
            <span>Phạm vi hiệu lực</span>
            <span>Trạng thái</span>
            <span className="text-right">Thao tác</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-ink-muted">Đang tải ma trận xưng hô...</div>
          ) : dyads.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<UsersGroupRoundedIcon size={20} />}
                title="Chưa có quy ước xưng hô nào"
                actions={
                  characters.length >= 2 ? (
                    <Button size="sm" onClick={() => setEditingDyad('new')}>
                      <AddIcon size={14} />
                      Thêm quan hệ xưng hô đầu tiên
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setEditingCharacter('new')}>
                      <AddIcon size={14} />
                      Thêm nhân vật trước
                    </Button>
                  )
                }
              >
                {characters.length < 2
                  ? 'Hãy thêm ít nhất 2 nhân vật để bắt đầu thiết lập ma trận xưng hô có chiều cho bản dịch.'
                  : 'Thiết lập cách một nhân vật tự xưng và gọi đối phương để AI dịch đối thoại tự nhiên, chính xác.'}
              </EmptyState>
            </div>
          ) : (
            <ul>
              {dyads.map((dyad) => {
                const srcChar = charMap.get(dyad.sourceCharacterId)
                const tgtChar = charMap.get(dyad.targetCharacterId)

                return (
                  <li
                    key={dyad.id}
                    className={cx(
                      'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_110px_90px] items-center border-b border-line px-3.5 py-3 text-[13px] last:border-b-0 hover:bg-canvas/50 transition-colors',
                      dyad.status === 'pending' && 'bg-warning/5',
                      dyad.status === 'rejected' && 'opacity-60 bg-line/10'
                    )}
                  >
                    {/* Speaker -> Recipient */}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-ink flex items-center gap-1.5">
                        <span>{srcChar?.target ?? '?'}</span>
                        <span className="text-ink-muted text-xs">→</span>
                        <span>{tgtChar?.target ?? '?'}</span>
                      </span>
                      <span className="text-[11px] text-ink-muted truncate">
                        {srcChar?.source ?? '?'} → {tgtChar?.source ?? '?'}
                      </span>
                    </div>

                    {/* Pronouns */}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-ink">
                        &ldquo;{dyad.speakerPronoun}&rdquo; &ndash; &ldquo;{dyad.recipientPronoun}&rdquo;
                      </span>
                      {dyad.formality && (
                        <span className="text-[11px] text-ink-muted">
                          Sắc thái: {dyad.formality}
                        </span>
                      )}
                      {dyad.notes && (
                        <span className="text-[11px] text-ink-muted truncate italic">
                          {dyad.notes}
                        </span>
                      )}
                    </div>

                    {/* Scope */}
                    <span className="text-xs text-ink-muted">
                      {formatChapterScope(dyad)}
                    </span>

                    {/* Status */}
                    <div>
                      {dyad.status === 'approved' && <Badge tone="success">Đã duyệt</Badge>}
                      {dyad.status === 'pending' && <Badge tone="warning">Chờ duyệt</Badge>}
                      {dyad.status === 'rejected' && <Badge tone="error">Từ chối</Badge>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      {dyad.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleQuickDyadStatus(dyad, 'approved')}
                            title="Duyệt quy ước"
                            className="rounded p-1 text-ink-muted hover:bg-control hover:text-success transition-colors cursor-pointer"
                          >
                            <CheckIcon size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleQuickDyadStatus(dyad, 'rejected')}
                            title="Từ chối quy ước"
                            className="rounded p-1 text-ink-muted hover:bg-control hover:text-error transition-colors cursor-pointer"
                          >
                            <CloseCircleIcon size={15} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingDyad(dyad)}
                        title="Chỉnh sửa quy ước"
                        className="rounded p-1 text-ink-muted hover:bg-control hover:text-ink transition-colors cursor-pointer"
                      >
                        <PenNewSquareIcon size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingDyad(dyad)}
                        title="Xóa quy ước"
                        className="rounded p-1 text-ink-muted hover:bg-control hover:text-error transition-colors cursor-pointer"
                      >
                        <TrashBinMinimalisticIcon size={15} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Characters Tab Content */}
      {activeTab === 'characters' && (
        <div className="overflow-hidden rounded-panel border border-line bg-canvas">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_90px_minmax(0,1.2fr)_110px_90px] items-center border-b border-line bg-sidebar px-3.5 py-2.5 text-[12px] font-medium text-ink-muted">
            <span>Tên tiếng Việt</span>
            <span>Tên gốc / Bí danh</span>
            <span>Giới tính</span>
            <span>Vai vế / Ghi chú</span>
            <span>Trạng thái</span>
            <span className="text-right">Thao tác</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-ink-muted">Đang tải danh sách nhân vật...</div>
          ) : characters.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<UserRoundedIcon size={20} />}
                title="Chưa có nhân vật nào"
                actions={
                  <Button size="sm" onClick={() => setEditingCharacter('new')}>
                    <AddIcon size={14} />
                    Thêm nhân vật đầu tiên
                  </Button>
                }
              >
                Thêm nhân vật và bí danh để quản lý vai vế và cách xưng hô đối thoại trong tác phẩm.
              </EmptyState>
            </div>
          ) : (
            <ul>
              {characters.map((char) => (
                <li
                  key={char.id}
                  className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_90px_minmax(0,1.2fr)_110px_90px] items-center border-b border-line px-3.5 py-3 text-[13px] last:border-b-0 hover:bg-canvas/50 transition-colors"
                >
                  <span className="font-semibold text-ink">{char.target}</span>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-ink">{char.source}</span>
                    {char.aliases.length > 0 && (
                      <span className="text-[11px] text-ink-muted truncate">
                        Bí danh: {char.aliases.join(', ')}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-ink-muted">
                    {char.gender === 'male'
                      ? 'Nam'
                      : char.gender === 'female'
                        ? 'Nữ'
                        : char.gender === 'other'
                          ? 'Khác'
                          : 'Chưa rõ'}
                  </span>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-ink">{char.role || '—'}</span>
                    {char.notes && (
                      <span className="text-[11px] text-ink-muted truncate italic">
                        {char.notes}
                      </span>
                    )}
                  </div>

                  <div>
                    {char.status === 'approved' && <Badge tone="success">Đã duyệt</Badge>}
                    {char.status === 'pending' && <Badge tone="warning">Chờ duyệt</Badge>}
                    {char.status === 'rejected' && <Badge tone="error">Từ chối</Badge>}
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingCharacter(char)}
                      title="Chỉnh sửa nhân vật"
                      className="rounded p-1 text-ink-muted hover:bg-control hover:text-ink transition-colors cursor-pointer"
                    >
                      <PenNewSquareIcon size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCharacter(char)}
                      title="Xóa nhân vật"
                      className="rounded p-1 text-ink-muted hover:bg-control hover:text-error transition-colors cursor-pointer"
                    >
                      <TrashBinMinimalisticIcon size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Character Dialogs */}
      <EditCharacterDialog
        open={editingCharacter !== null}
        onOpenChange={(open) => !open && setEditingCharacter(null)}
        character={editingCharacter === 'new' ? null : editingCharacter}
        onSave={async (data) => {
          if (editingCharacter === 'new') {
            await createCharacter(data)
          } else if (editingCharacter) {
            await updateCharacter(editingCharacter.id, data)
          }
        }}
      />

      <DeleteCharacterDialog
        open={deletingCharacter !== null}
        onOpenChange={(open) => !open && setDeletingCharacter(null)}
        character={deletingCharacter}
        onConfirm={async () => {
          if (deletingCharacter) {
            await deleteCharacter(deletingCharacter.id)
          }
        }}
      />

      {/* Dyad Dialogs */}
      <EditDyadDialog
        open={editingDyad !== null}
        onOpenChange={(open) => !open && setEditingDyad(null)}
        dyad={editingDyad === 'new' ? null : editingDyad}
        characters={characters}
        chapters={chapters}
        onSave={async (data) => {
          await setDyad(data)
        }}
      />

      <DeleteDyadDialog
        open={deletingDyad !== null}
        onOpenChange={(open) => !open && setDeletingDyad(null)}
        dyad={deletingDyad}
        characters={characters}
        onConfirm={async () => {
          if (deletingDyad) {
            await deleteDyad(deletingDyad.id)
          }
        }}
      />
    </div>
  )
}
