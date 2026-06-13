import { useRef, useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/cn';
import type { Chapter, ChapterStatus } from '@/types/translator';
import { InlineEditInput } from './InlineEditInput';
import { VolumeContextMenu } from './VolumeContextMenu';
import { ChapterItem } from './ChapterItem';

interface VolumeSectionProps {
  volumeTitle: string;
  chapters: Chapter[];
  novelId: string;
  isCollapsed: boolean;
  allVolumes: string[];
  activeChapterId: string | null;
  selectedIds: string[];
  renamingChapterId: string | null;
  isRenamingVolume: boolean;
  isDragging: boolean;
  onToggleCollapse: () => void;
  onStartVolumeRename: () => void;
  onConfirmVolumeRename: (newTitle: string) => void;
  onCancelVolumeRename: () => void;
  onAddChapter: () => void;
  onDeleteVolume: () => void;
  onNavigateChapter: (chapterId: string) => void;
  onSelectChapter: (chapterId: string, mode: 'single' | 'ctrl' | 'shift') => void;
  onStartChapterRename: (chapterId: string) => void;
  onConfirmChapterRename: (chapterId: string, newTitle: string) => void;
  onCancelChapterRename: () => void;
  onDeleteChapter: (chapterId: string) => void;
  onDeleteSelectedChapters: () => void;
  onDuplicateChapter: (chapterId: string) => void;
  onChangeChapterStatus: (chapterId: string, status: ChapterStatus) => void;
  onChangeStatusSelected: (status: ChapterStatus) => void;
  onMoveChapterToVolume: (chapterId: string, volumeTitle: string) => void;
  onAddChapterAfter: (chapterId: string) => void;
}

export function VolumeSection({
  volumeTitle,
  chapters,
  isCollapsed,
  allVolumes,
  activeChapterId,
  selectedIds,
  renamingChapterId,
  isRenamingVolume,
  isDragging,
  onToggleCollapse,
  onStartVolumeRename,
  onConfirmVolumeRename,
  onCancelVolumeRename,
  onAddChapter,
  onDeleteVolume,
  onNavigateChapter,
  onSelectChapter,
  onStartChapterRename,
  onConfirmChapterRename,
  onCancelChapterRename,
  onDeleteChapter,
  onDeleteSelectedChapters,
  onDuplicateChapter,
  onChangeChapterStatus,
  onChangeStatusSelected,
  onMoveChapterToVolume,
  onAddChapterAfter,
}: VolumeSectionProps) {
  const chapterIds = chapters.map((c) => c.id);
  const droppableId = `volume:${volumeTitle}`;
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: droppableId });
  const hasVolumeName = volumeTitle !== '';

  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-expand collapsed volume after 600ms hover during drag
  useEffect(() => {
    if (isDragging && isOver && isCollapsed) {
      expandTimerRef.current = setTimeout(onToggleCollapse, 600);
    }
    return () => {
      if (expandTimerRef.current) {
        clearTimeout(expandTimerRef.current);
        expandTimerRef.current = null;
      }
    };
  }, [isDragging, isOver, isCollapsed, onToggleCollapse]);

  return (
    <div>
      {hasVolumeName && (
        <VolumeContextMenu
          volumeTitle={volumeTitle}
          chapterCount={chapters.length}
          isCollapsed={isCollapsed}
          onRename={onStartVolumeRename}
          onAddChapter={onAddChapter}
          onToggleCollapse={onToggleCollapse}
          onDelete={onDeleteVolume}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1 cursor-pointer select-none hover:bg-sidebar-accent/40"
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
            onDoubleClick={(e) => { e.stopPropagation(); onStartVolumeRename(); }}
          >
            <Icon
              icon="solar:alt-arrow-right-linear"
              width={10}
              className={cn(
                'shrink-0 text-muted-foreground/50 transition-transform duration-150',
                !isCollapsed && 'rotate-90',
              )}
            />
            {isRenamingVolume ? (
              <InlineEditInput
                value={volumeTitle}
                onConfirm={onConfirmVolumeRename}
                onCancel={onCancelVolumeRename}
              />
            ) : (
              <span className="truncate font-medium text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                {volumeTitle}
              </span>
            )}
          </div>
        </VolumeContextMenu>
      )}

      {!isCollapsed && (
        <SortableContext items={chapterIds} strategy={verticalListSortingStrategy}>
          <div
            ref={setDropRef}
            className={cn(
              'min-h-1',
              isDragging && isOver && 'bg-accent/15',
            )}
          >
            {chapters.map((chapter) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                isActive={chapter.id === activeChapterId}
                isSelected={selectedIds.includes(chapter.id)}
                isRenaming={renamingChapterId === chapter.id}
                volumes={allVolumes}
                selectedIds={selectedIds}
                onNavigate={() => onNavigateChapter(chapter.id)}
                onSelect={(mode) => onSelectChapter(chapter.id, mode)}
                onStartRename={() => onStartChapterRename(chapter.id)}
                onConfirmRename={(newTitle) => onConfirmChapterRename(chapter.id, newTitle)}
                onCancelRename={onCancelChapterRename}
                onDelete={() => onDeleteChapter(chapter.id)}
                onDeleteSelected={onDeleteSelectedChapters}
                onDuplicate={() => onDuplicateChapter(chapter.id)}
                onChangeStatus={(status) => onChangeChapterStatus(chapter.id, status)}
                onChangeStatusSelected={onChangeStatusSelected}
                onMoveToVolume={(vol) => onMoveChapterToVolume(chapter.id, vol)}
                onAddChapterBelow={() => onAddChapterAfter(chapter.id)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
