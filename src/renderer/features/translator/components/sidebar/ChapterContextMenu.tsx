import type { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Chapter, ChapterStatus } from '@/types/translator';

interface ChapterContextMenuProps {
  chapter: Chapter;
  volumes: string[];
  selectedIds: string[];
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDeleteSelected: () => void;
  onChangeStatus: (status: ChapterStatus) => void;
  onChangeStatusSelected: (status: ChapterStatus) => void;
  onMoveToVolume: (volumeTitle: string) => void;
  onAddChapterBelow: () => void;
  children: ReactNode;
}

const STATUS_LABELS: Record<ChapterStatus, string> = {
  todo: 'Chưa dịch',
  active: 'Đang dịch',
  review: 'Cần review',
  done: 'Hoàn thành',
};

export function ChapterContextMenu({
  chapter,
  volumes,
  selectedIds,
  onRename,
  onDuplicate,
  onDelete,
  onDeleteSelected,
  onChangeStatus,
  onChangeStatusSelected,
  onMoveToVolume,
  onAddChapterBelow,
  children,
}: ChapterContextMenuProps) {
  const isBatchContext = selectedIds.length > 1 && selectedIds.includes(chapter.id);
  const n = selectedIds.length;
  const otherVolumes = volumes.filter((v) => v !== (chapter.volumeTitle ?? ''));

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {isBatchContext ? (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Đổi trạng thái ({n} chương)</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {(['todo', 'active', 'review', 'done'] as ChapterStatus[]).map((s) => (
                  <ContextMenuItem key={s} onSelect={() => onChangeStatusSelected(s)}>
                    {STATUS_LABELS[s]}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={onDeleteSelected}
              className="text-red-400 focus:text-red-400"
            >
              Xóa {n} chương đã chọn
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onSelect={onRename}>Đổi tên</ContextMenuItem>
            <ContextMenuItem onSelect={onDuplicate}>Nhân đôi</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>Đổi trạng thái</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {(['todo', 'active', 'review', 'done'] as ChapterStatus[]).map((s) => (
                  <ContextMenuItem key={s} onSelect={() => onChangeStatus(s)}>
                    {STATUS_LABELS[s]}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={onAddChapterBelow}>Thêm chương bên dưới</ContextMenuItem>
            {otherVolumes.length > 0 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>Chuyển sang quyển</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {otherVolumes.map((v) => (
                    <ContextMenuItem key={v} onSelect={() => onMoveToVolume(v)}>
                      {v || '(Không có quyển)'}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={onDelete}
              className="text-red-400 focus:text-red-400"
            >
              Xóa chương
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
