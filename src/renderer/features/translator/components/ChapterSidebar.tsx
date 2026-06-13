import { Icon } from '@iconify/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import type { Chapter, ChapterStatus } from '@/types/translator';

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

interface FlatItem {
  type: 'header' | 'chapter';
  label?: string;
  chapter?: Chapter;
}

function buildFlatList(chapters: Chapter[], filter: string): FlatItem[] {
  const filterLow = filter.toLowerCase();
  const filtered = filter
    ? chapters.filter(
        (c) =>
          c.title.toLowerCase().includes(filterLow) ||
          String(c.number).includes(filter),
      )
    : chapters;

  const items: FlatItem[] = [];
  let lastVolume = '';

  for (const chapter of filtered) {
    const vol = chapter.volumeTitle ?? '';
    if (vol && vol !== lastVolume) {
      items.push({ type: 'header', label: vol });
      lastVolume = vol;
    }
    items.push({ type: 'chapter', chapter });
  }

  return items;
}

export const ChapterSidebar = forwardRef<ChapterSidebarRef, ChapterSidebarProps>(
  ({ novelId, chapters, activeChapterId, resumeChapter, novelTitle, doneCount, totalCount }, ref) => {
    const [filter, setFilter] = useState('');
    const filterRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useImperativeHandle(ref, () => ({
      focusFilter: () => filterRef.current?.focus(),
    }));

    const flatItems = useMemo(() => buildFlatList(chapters, filter), [chapters, filter]);

    const virtualizer = useVirtualizer({
      count: flatItems.length,
      getScrollElement: () => scrollRef.current,
      estimateSize: (i) => (flatItems[i]?.type === 'header' ? 28 : 36),
      overscan: 5,
    });

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key !== 'Enter') return;
      const num = parseInt(filter, 10);
      if (!isNaN(num)) {
        const target = chapters.find((c) => c.number === num);
        if (target) navigate({ to: '/novel/$novelId/translate', params: { novelId }, search: { chapter: target.id } as never });
      }
    }

    function openChapter(chapterId: string) {
      navigate({ to: '/novel/$novelId/translate', params: { novelId }, search: { chapter: chapterId } as never });
    }

    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
      <div className="flex w-64 shrink-0 flex-col border-border border-r bg-sidebar">
        {/* Header */}
        <div className="shrink-0 border-border border-b px-3 py-2.5">
          <button
            type="button"
            onClick={() => navigate({ to: '/novel/$novelId', params: { novelId } })}
            className="mb-2 flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          >
            <Icon icon="solar:alt-arrow-left-linear" width={12} />
            Thư viện
          </button>
          <p className="mb-1 truncate font-heading font-semibold text-foreground text-sm" title={novelTitle}>
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
            onClick={() => openChapter(resumeChapter.id)}
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
        <div className="px-3 py-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5">
            <Icon icon="solar:magnifer-linear" width={13} className="shrink-0 text-muted-foreground" />
            <input
              ref={filterRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Lọc / nhảy chương..."
              className="min-w-0 flex-1 bg-transparent text-foreground text-xs outline-none placeholder:text-muted-foreground"
            />
            <span className="shrink-0 text-muted-foreground/50 text-[10px]">Ctrl+G</span>
          </div>
        </div>

        {/* Virtualized chapter list */}
        <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const item = flatItems[virtualItem.index];
              if (!item) return null;

              if (item.type === 'header') {
                return (
                  <div
                    key={virtualItem.key}
                    style={{ position: 'absolute', top: virtualItem.start, left: 0, right: 0, height: virtualItem.size }}
                    className="flex items-end px-3 pb-1"
                  >
                    <span className="truncate font-medium text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                );
              }

              const chapter = item.chapter!;
              const isActive = chapter.id === activeChapterId;
              const { icon, color } = STATUS_ICON[chapter.status];

              return (
                <div
                  key={virtualItem.key}
                  style={{ position: 'absolute', top: virtualItem.start, left: 0, right: 0, height: virtualItem.size }}
                >
                  <button
                    type="button"
                    onClick={() => openChapter(chapter.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors',
                      isActive
                        ? 'bg-foreground/10 text-foreground'
                        : 'text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground',
                    )}
                  >
                    <Icon icon={icon} width={13} className={cn('shrink-0', color)} />
                    <span className="w-7 shrink-0 font-mono text-muted-foreground text-[10px] tabular-nums">
                      {String(chapter.number).padStart(3, '0')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs">{chapter.title}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

ChapterSidebar.displayName = 'ChapterSidebar';
