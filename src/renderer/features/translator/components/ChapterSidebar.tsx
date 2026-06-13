import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Icon } from '@iconify/react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import type { Chapter, ChapterStatus } from '@/types/translator';
import { useChapterStore } from '@/store/chapter-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VolumeSection } from './sidebar/VolumeSection';

export interface ChapterSidebarRef {
  focusFilter: () => void;
}

interface ChapterSidebarProps {
  novelId: string;
  chapters: Chapter[];
  activeChapterId: string | null;
  resumeChapter?: Chapter | undefined;
  novelTitle: string;
  doneCount: number;
  totalCount: number;
}

const STATUS_ICON: Record<ChapterStatus, { icon: string; color: string }> = {
  todo: { icon: 'solar:circle-linear', color: 'text-muted-foreground/50' },
  active: { icon: 'solar:circle-half-linear', color: 'text-foreground' },
  review: { icon: 'solar:danger-triangle-linear', color: 'text-amber-400' },
  done: { icon: 'solar:check-circle-linear', color: 'text-emerald-400' },
};

function ChapterGhostItem({ chapter }: { chapter: Chapter }) {
  const { icon, color } = STATUS_ICON[chapter.status];
  return (
    <div className="flex w-64 items-center gap-1.5 rounded border border-border bg-popover px-2 py-1.5 text-foreground/70 opacity-90 shadow-lg">
      <Icon icon="solar:hamburger-menu-linear" width={11} className="shrink-0 text-muted-foreground/30" />
      <Icon icon={icon} width={13} className={cn('shrink-0', color)} />
      <span className="w-7 shrink-0 font-mono text-muted-foreground text-[10px] tabular-nums">
        {String(chapter.number).padStart(3, '0')}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs">{chapter.title}</span>
    </div>
  );
}

export const ChapterSidebar = forwardRef<ChapterSidebarRef, ChapterSidebarProps>(
  ({ novelId, chapters, activeChapterId, resumeChapter, novelTitle, doneCount, totalCount }, ref) => {
    const [filter, setFilter] = useState('');
    const filterRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const {
      collapsedVolumes,
      selectedChapterIds,
      toggleVolume,
      expandVolume,
      selectChapter,
      clearSelection,
      reorderChapter,
      moveChapterToVolume,
      renameChapter,
      renameVolume,
      deleteChapters,
      duplicateChapter,
      changeChapterStatus,
      addChapterAfter,
    } = useChapterStore();

    const [renamingChapterId, setRenamingChapterId] = useState<string | null>(null);
    const [renamingVolume, setRenamingVolume] = useState<string | null>(null);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const isDragging = activeDragId !== null;

    useImperativeHandle(ref, () => ({
      focusFilter: () => filterRef.current?.focus(),
    }));

    // Group chapters by volume, respecting filter
    const volumeGroups = useMemo<[string, Chapter[]][]>(() => {
      const filterLow = filter.toLowerCase();
      const filtered = filter
        ? chapters.filter(
            (c) =>
              c.title.toLowerCase().includes(filterLow) ||
              String(c.number).includes(filter),
          )
        : chapters;

      const map = new Map<string, Chapter[]>();
      for (const ch of filtered) {
        const vol = ch.volumeTitle ?? '';
        if (!map.has(vol)) map.set(vol, []);
        map.get(vol)!.push(ch);
      }
      return Array.from(map.entries());
    }, [chapters, filter]);

    const allVolumes = useMemo(
      () => Array.from(new Set(chapters.map((c) => c.volumeTitle ?? ''))),
      [chapters],
    );

    // Auto-expand volume containing the active chapter
    useEffect(() => {
      const active = chapters.find((c) => c.id === activeChapterId);
      if (active?.volumeTitle && collapsedVolumes.has(active.volumeTitle)) {
        expandVolume(active.volumeTitle);
      }
    }, [activeChapterId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Escape key clears selection
    useEffect(() => {
      function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') clearSelection();
      }
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [clearSelection]);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function handleDragStart(event: DragStartEvent) {
      setActiveDragId(String(event.active.id));
    }

    function handleDragEnd(event: DragEndEvent) {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const overId = String(over.id);
      if (overId.startsWith('volume:')) {
        const targetVolume = overId.slice(7);
        moveChapterToVolume(novelId, String(active.id), targetVolume);
      } else {
        reorderChapter(novelId, String(active.id), overId);
      }
    }

    function openChapter(chapterId: string) {
      navigate({
        to: '/novel/$novelId/translate',
        params: { novelId },
        search: { chapter: chapterId } as never,
      });
    }

    function handleFilterKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key !== 'Enter') return;
      const num = parseInt(filter, 10);
      if (!isNaN(num)) {
        const target = chapters.find((c) => c.number === num);
        if (target) openChapter(target.id);
      }
    }

    const draggingChapter = chapters.find((c) => c.id === activeDragId);
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
      <div
        className="flex w-64 shrink-0 flex-col border-border border-r bg-sidebar"
        onClick={() => clearSelection()}
      >
        {/* Header */}
        <div className="shrink-0 border-border border-b px-3 py-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate({ to: '/novel/$novelId', params: { novelId } });
            }}
            className="mb-2 flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          >
            <Icon icon="solar:alt-arrow-left-linear" width={12} />
            Thư viện
          </button>
          <p
            className="mb-1 truncate font-heading font-semibold text-foreground text-sm"
            title={novelTitle}
          >
            {novelTitle}
          </p>
          <div className="flex items-center gap-1.5">
            <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground/40" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-muted-foreground text-[10px] tabular-nums">
              {doneCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Resume chip */}
        {resumeChapter && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openChapter(resumeChapter.id);
            }}
            className="mx-3 mt-2 shrink-0 rounded-md bg-muted px-2.5 py-1.5 text-left transition-colors hover:bg-muted/70"
          >
            <div className="flex items-center gap-1.5 text-foreground text-xs">
              <Icon icon="solar:play-linear" width={11} />
              <span className="truncate font-medium">
                Tiếp tục · Ch. {resumeChapter.number} — {resumeChapter.title}
              </span>
            </div>
          </button>
        )}

        {/* Filter */}
        <div className="shrink-0 px-3 py-2">
          <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5">
            <Icon
              icon="solar:magnifer-linear"
              width={13}
              className="shrink-0 text-muted-foreground"
            />
            <input
              ref={filterRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={handleFilterKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Lọc / nhảy chương..."
              className="min-w-0 flex-1 bg-transparent text-foreground text-xs outline-none placeholder:text-muted-foreground"
            />
            <span className="shrink-0 text-muted-foreground/50 text-[10px]">Ctrl+G</span>
          </div>
        </div>

        {/* Chapter list with DnD */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            {volumeGroups.map(([vol, chs]) => (
              <VolumeSection
                key={vol || '__no_volume__'}
                volumeTitle={vol}
                chapters={chs}
                novelId={novelId}
                isCollapsed={collapsedVolumes.has(vol)}
                allVolumes={allVolumes}
                activeChapterId={activeChapterId}
                selectedIds={selectedChapterIds}
                renamingChapterId={renamingChapterId}
                isRenamingVolume={renamingVolume === vol}
                isDragging={isDragging}
                onToggleCollapse={() => toggleVolume(vol)}
                onStartVolumeRename={() => setRenamingVolume(vol)}
                onConfirmVolumeRename={(newTitle) => {
                  renameVolume(novelId, vol, newTitle);
                  setRenamingVolume(null);
                }}
                onCancelVolumeRename={() => setRenamingVolume(null)}
                onAddChapter={() => addChapterAfter(novelId, null, vol)}
                onDeleteVolume={() => {
                  // Only allowed for empty volumes (enforced in context menu)
                }}
                onNavigateChapter={openChapter}
                onSelectChapter={(chapterId, mode) => selectChapter(novelId, chapterId, mode)}
                onStartChapterRename={(chapterId) => setRenamingChapterId(chapterId)}
                onConfirmChapterRename={(chapterId, newTitle) => {
                  renameChapter(novelId, chapterId, newTitle);
                  setRenamingChapterId(null);
                }}
                onCancelChapterRename={() => setRenamingChapterId(null)}
                onDeleteChapter={(chapterId) => setPendingDeleteIds([chapterId])}
                onDeleteSelectedChapters={() => setPendingDeleteIds([...selectedChapterIds])}
                onDuplicateChapter={(chapterId) => duplicateChapter(novelId, chapterId)}
                onChangeChapterStatus={(chapterId, status) =>
                  changeChapterStatus(novelId, [chapterId], status)
                }
                onChangeStatusSelected={(status) =>
                  changeChapterStatus(novelId, selectedChapterIds, status)
                }
                onMoveChapterToVolume={(chapterId, targetVol) =>
                  moveChapterToVolume(novelId, chapterId, targetVol)
                }
                onAddChapterAfter={(chapterId) => addChapterAfter(novelId, chapterId, vol)}
              />
            ))}

            <DragOverlay>
              {draggingChapter && <ChapterGhostItem chapter={draggingChapter} />}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Delete confirmation dialog */}
        <Dialog
          open={pendingDeleteIds !== null}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteIds(null);
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                {pendingDeleteIds && pendingDeleteIds.length === 1
                  ? 'Bạn có chắc muốn xóa chương này? Hành động này không thể hoàn tác.'
                  : `Bạn có chắc muốn xóa ${pendingDeleteIds?.length ?? 0} chương đã chọn?`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pendingDeleteIds) deleteChapters(novelId, pendingDeleteIds);
                  setPendingDeleteIds(null);
                }}
              >
                Xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  },
);

ChapterSidebar.displayName = 'ChapterSidebar';
