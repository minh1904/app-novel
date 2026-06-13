import { cn } from '@/lib/cn';
import type { Novel } from '@/types/novel';

interface NovelCardProps {
  novel: Novel;
  onClick: () => void;
}

const STATUS_LABEL: Record<Novel['status'], string> = {
  active: 'Đang dịch',
  done: 'Hoàn thành',
  paused: 'Tạm dừng',
};

const STATUS_DOT_COLOR: Record<Novel['status'], string> = {
  active: 'bg-emerald-500',
  done: 'bg-sky-400',
  paused: 'bg-amber-400',
};

const PROGRESS_COLOR: Record<Novel['status'], string> = {
  active: 'bg-emerald-500',
  done: 'bg-sky-400',
  paused: 'bg-amber-400',
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function coverChar(novel: Novel): string {
  return (novel.originalTitle?.[0] ?? novel.title[0]) as string;
}

export function NovelCard({ novel, onClick }: NovelCardProps) {
  const pct =
    novel.totalChapters > 0 ? Math.round((novel.doneChapters / novel.totalChapters) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-sm border border-border bg-card text-left transition-all hover:scale-[1.015] hover:shadow-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/50">
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-full bg-background/75 px-2 py-[3px] backdrop-blur-sm">
          <span
            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT_COLOR[novel.status])}
          />
          <span className="font-medium text-[10px] text-foreground/75 leading-none">
            {STATUS_LABEL[novel.status]}
          </span>
        </div>

        {novel.coverImage ? (
          <img
            src={novel.coverImage}
            alt={novel.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="select-none font-sans font-thin text-5xl text-muted-foreground/25">
              {coverChar(novel)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 px-3 py-2.5">
        <div>
          <p className="truncate font-semibold text-foreground text-sm leading-snug">
            {novel.title}
          </p>
          {novel.updatedAt && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatDate(novel.updatedAt)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {novel.doneChapters.toLocaleString('vi-VN')} /{' '}
              {novel.totalChapters.toLocaleString('vi-VN')} chương
            </span>
            <span className="font-medium tabular-nums">{pct}%</span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full transition-all', PROGRESS_COLOR[novel.status])}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

interface AddNovelCardProps {
  onClick: () => void;
}

export function AddNovelCard({ onClick }: AddNovelCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-sm border border-border border-dashed bg-card text-left transition-all hover:border-foreground/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="relative flex aspect-4/3 w-full items-center justify-center bg-muted/20 transition-colors group-hover:bg-muted/35">
        <div
          className="flex items-center justify-center rounded-sm border border-border/60 border-dashed bg-card/50 transition-colors group-hover:border-foreground/15"
          style={{ aspectRatio: '2/3', height: '48%' }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors group-hover:border-foreground/20 group-hover:text-foreground/60">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p className="font-semibold text-foreground text-sm leading-snug">Thêm truyện mới</p>
        <p className="text-[11px] text-muted-foreground">Bắt đầu hành trình dịch thuật</p>
      </div>
    </button>
  );
}
