import type { ReactNode } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface VolumeContextMenuProps {
  volumeTitle: string;
  chapterCount: number;
  isCollapsed: boolean;
  onRename: () => void;
  onAddChapter: () => void;
  onToggleCollapse: () => void;
  onDelete: () => void;
  children: ReactNode;
}

export function VolumeContextMenu({
  chapterCount,
  isCollapsed,
  onRename,
  onAddChapter,
  onToggleCollapse,
  onDelete,
  children,
}: VolumeContextMenuProps) {
  const canDelete = chapterCount === 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onRename}>Đổi tên quyển</ContextMenuItem>
        <ContextMenuItem onSelect={onAddChapter}>Thêm chương</ContextMenuItem>
        <ContextMenuItem onSelect={onToggleCollapse}>
          {isCollapsed ? 'Mở rộng' : 'Thu gọn'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {canDelete ? (
          <ContextMenuItem onSelect={onDelete} className="text-red-400 focus:text-red-400">
            Xóa quyển
          </ContextMenuItem>
        ) : (
          <ContextMenuItem disabled className="opacity-40">
            Xóa quyển
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
