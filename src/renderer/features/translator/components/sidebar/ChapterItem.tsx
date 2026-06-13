import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/cn';
import type { Chapter, ChapterStatus } from '@/types/translator';
import { InlineEditInput } from './InlineEditInput';
import { ChapterContextMenu } from './ChapterContextMenu';

const STATUS_ICON: Record<ChapterStatus, { icon: string; color: string }> = {
  todo: { icon: 'solar:circle-linear', color: 'text-muted-foreground/50' },
  active: { icon: 'solar:circle-half-linear', color: 'text-foreground' },
  review: { icon: 'solar:danger-triangle-linear', color: 'text-amber-400' },
  done: { icon: 'solar:check-circle-linear', color: 'text-emerald-400' },
};

interface ChapterItemProps {
  chapter: Chapter;
  isActive: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  volumes: string[];
  selectedIds: string[];
  onNavigate: () => void;
  onSelect: (mode: 'single' | 'ctrl' | 'shift') => void;
  onStartRename: () => void;
  onConfirmRename: (newTitle: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onDeleteSelected: () => void;
  onDuplicate: () => void;
  onChangeStatus: (status: ChapterStatus) => void;
  onChangeStatusSelected: (status: ChapterStatus) => void;
  onMoveToVolume: (volumeTitle: string) => void;
  onAddChapterBelow: () => void;
}

export function ChapterItem({
  chapter,
  isActive,
  isSelected,
  isRenaming,
  volumes,
  selectedIds,
  onNavigate,
  onSelect,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onDelete,
  onDeleteSelected,
  onDuplicate,
  onChangeStatus,
  onChangeStatusSelected,
  onMoveToVolume,
  onAddChapterBelow,
}: ChapterItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { icon, color } = STATUS_ICON[chapter.status];

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      onSelect('ctrl');
    } else if (e.shiftKey) {
      onSelect('shift');
    } else {
      onSelect('single');
      onNavigate();
    }
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onStartRename();
  }

  return (
    <ChapterContextMenu
      chapter={chapter}
      volumes={volumes}
      selectedIds={selectedIds}
      onRename={onStartRename}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onDeleteSelected={onDeleteSelected}
      onChangeStatus={onChangeStatus}
      onChangeStatusSelected={onChangeStatusSelected}
      onMoveToVolume={onMoveToVolume}
      onAddChapterBelow={onAddChapterBelow}
    >
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1.5 transition-colors select-none cursor-default',
          isActive && 'bg-foreground/10 text-foreground',
          isSelected && !isActive && 'bg-accent/30 text-foreground',
          !isActive && !isSelected && 'text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground',
          isDragging && 'opacity-30',
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <button
          type="button"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          className="shrink-0 cursor-grab touch-none text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
        >
          <Icon icon="solar:hamburger-menu-linear" width={11} />
        </button>

        <Icon icon={icon} width={13} className={cn('shrink-0', color)} />

        <span className="w-7 shrink-0 font-mono text-muted-foreground text-[10px] tabular-nums">
          {String(chapter.number).padStart(3, '0')}
        </span>

        {isRenaming ? (
          <InlineEditInput
            value={chapter.title}
            onConfirm={onConfirmRename}
            onCancel={onCancelRename}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate text-xs">{chapter.title}</span>
        )}
      </div>
    </ChapterContextMenu>
  );
}
