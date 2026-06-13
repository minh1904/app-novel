import { Link, useRouterState } from '@tanstack/react-router';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const DEMO_TREE = [
  {
    id: 'novel-1',
    name: 'Nghệ Thuật Hắc Hóa Dành Cho Dũng...',
    chapters: [
      '000 Giới thiệu',
      '001 Tôi muốn đánh bại Dũng Sĩ.',
      '002 Dẫu vậy.',
      '003 Khởi điểm.',
      '004 Ma Vương Mergidos.',
      '005 Thăm cảnh tâm lý là gì',
      '006 Dũng Sĩ và cậu thiếu niên.',
      '007 Văn vẹo.',
      '008 Mầm móng.',
      '009 Bước Ra Khỏi Ánh Sáng',
      '010 Ta Nhìn Thấy Rồi.',
      '011 Yếu ớt.',
      '012 Dị Vật Của Hắc Vực.',
      '013 Biến Chất Của Ánh Sáng.',
    ],
  },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['novel-1']));
  const [activeChapter, setActiveChapter] = useState('007 Văn vẹo.');

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (pathname === '/search') {
    return (
      <aside className="flex w-(--sidebar-w) shrink-0 flex-col overflow-hidden border-border border-r bg-sidebar">
        <SidebarHeader label="Tìm kiếm" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-xs">Sắp ra mắt</p>
        </div>
      </aside>
    );
  }

  if (pathname === '/bookmarks') {
    return (
      <aside className="flex w-(--sidebar-w) shrink-0 flex-col overflow-hidden border-border border-r bg-sidebar">
        <SidebarHeader label="Đánh dấu" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-xs">Sắp ra mắt</p>
        </div>
      </aside>
    );
  }

  if (pathname === '/settings') {
    return (
      <aside className="flex w-(--sidebar-w) shrink-0 flex-col overflow-hidden border-border border-r bg-sidebar">
        <SidebarHeader label="Cài đặt" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-xs">Sắp ra mắt</p>
        </div>
      </aside>
    );
  }

  if (pathname === '/') {
    return null;
  }

  return (
    <aside className="flex w-(--sidebar-w) shrink-0 flex-col overflow-hidden border-border border-r bg-sidebar">
      <SidebarHeader label="Thư viện" />
      <div className="flex-1 overflow-y-auto py-1">
        {DEMO_TREE.map((novel) => (
          <div key={novel.id}>
            <button
              type="button"
              onClick={() => toggle(novel.id)}
              className="flex w-full items-center gap-1 px-2 py-0.5 text-foreground text-xs transition-colors hover:bg-sidebar-accent"
            >
              {expanded.has(novel.id) ? (
                <Icon icon="solar:alt-arrow-down-linear" width={12} className="shrink-0 text-muted-foreground" />
              ) : (
                <Icon icon="solar:alt-arrow-right-linear" width={12} className="shrink-0 text-muted-foreground" />
              )}
              <Icon icon="solar:folder-linear" width={13} className="shrink-0 text-muted-foreground" />
              <span className="truncate">{novel.name}</span>
            </button>

            {expanded.has(novel.id) && (
              <div className="pl-4">
                {novel.chapters.map((ch) => (
                  <button
                    type="button"
                    key={ch}
                    onClick={() => setActiveChapter(ch)}
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left text-xs transition-colors',
                      activeChapter === ch
                        ? 'bg-sidebar-accent text-foreground'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                    )}
                  >
                    <Icon icon="solar:file-text-linear" width={12} className="shrink-0 opacity-50" />
                    <span className="truncate">{ch}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

function SidebarHeader({ label }: { label: string }) {
  return (
    <div className="flex h-8 shrink-0 items-center border-border border-b px-3">
      <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
    </div>
  );
}
