import { Icon } from '@iconify/react';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { NovelFormSheet } from '@/features/library/NovelFormSheet';
import { useNovelStore } from '@/store/novel-store';
import type { Novel, NovelGenre } from '@/types/novel';

export const Route = createFileRoute('/novel/$novelId')({
  component: NovelPage,
});

const STATUS_CONFIG: Record<Novel['status'], { label: string; dot: string; badge: string }> = {
  active: {
    label: 'Đang dịch',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  done: {
    label: 'Hoàn thành',
    dot: 'bg-sky-400',
    badge: 'bg-sky-400/10 text-sky-600 dark:text-sky-400',
  },
  paused: {
    label: 'Tạm dừng',
    dot: 'bg-amber-400',
    badge: 'bg-amber-400/10 text-amber-600 dark:text-amber-400',
  },
};

const PROGRESS_COLOR: Record<Novel['status'], string> = {
  active: 'bg-emerald-500',
  done: 'bg-sky-400',
  paused: 'bg-amber-400',
};

const GENRE_LABEL: Record<NovelGenre, string> = {
  xianxia: 'Tiên Hiệp',
  'manhwa-action': 'Manhwa Action',
  isekai: 'Isekai',
  romance: 'Romance',
  historical: 'Lịch Sử',
};


function MetaRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 border-b border-border/50 py-2.5 last:border-0">
      <Icon icon={icon} width={14} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        {children}
      </div>
    </div>
  );
}

function NovelPage() {
  const { novelId } = Route.useParams();
  const novels = useNovelStore((state) => state.novels);
  const updateNovel = useNovelStore((state) => state.updateNovel);
  const novel = novels.find((n) => n.id === novelId);
  const [editOpen, setEditOpen] = useState(false);

  if (!novel) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">Truyện không tồn tại hoặc đã bị xóa</p>
      </div>
    );
  }

  const pct =
    novel.totalChapters > 0
      ? Math.round((novel.doneChapters / novel.totalChapters) * 100)
      : 0;
  const status = STATUS_CONFIG[novel.status];

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="flex gap-5 p-5 pb-4">
          <div className="h-52 w-36 shrink-0 overflow-hidden rounded-md border border-border bg-muted shadow-sm">
            {novel.coverImage ? (
              <img
                src={novel.coverImage}
                alt={novel.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-sans font-thin text-5xl text-muted-foreground/30">
                {novel.originalTitle?.[0] ?? novel.title[0]}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <div>
              <h1 className="font-heading font-bold text-xl text-foreground leading-tight">
                {novel.title}
              </h1>
              {novel.originalTitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">{novel.originalTitle}</p>
              )}
            </div>

            <p className="flex items-center gap-1.5 text-sm text-foreground/80">
              <Icon icon="solar:pen-linear" width={13} className="shrink-0 text-muted-foreground" />
              {novel.author}
            </p>

            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  status.badge,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                {status.label}
              </span>
              {novel.genre && (
                <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground/70">
                  {GENRE_LABEL[novel.genre]}
                </span>
              )}
              {novel.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground/70"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {novel.doneChapters.toLocaleString('vi-VN')} /{' '}
                  {novel.totalChapters.toLocaleString('vi-VN')} chương
                </span>
                <span className="font-medium tabular-nums text-foreground">{pct}%</span>
              </div>
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', PROGRESS_COLOR[novel.status])}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-4">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Icon icon="solar:play-linear" width={14} />
            {novel.resumeChapter ? `Tiếp tục chương ${novel.resumeChapter}` : 'Bắt đầu đọc'}
          </button>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Icon icon="solar:pen-2-linear" width={14} />
            Chỉnh sửa
          </button>
        </div>

        <div className="border-t border-border" />

        {/* Description */}
        {novel.description && (
          <div className="px-5 py-4">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Giới thiệu
            </p>
            <p className="text-sm leading-relaxed text-foreground/80">{novel.description}</p>
          </div>
        )}

        {novel.description && <div className="border-t border-border" />}

        {/* Meta info */}
        <div className="px-5 py-4">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Thông tin thêm
          </p>

          {novel.alternativeTitles && novel.alternativeTitles.length > 0 && (
            <MetaRow icon="solar:translation-linear" label="Tên khác">
              <div className="flex flex-col gap-0.5">
                {novel.alternativeTitles.map((name) => (
                  <span key={name} className="text-sm leading-snug text-foreground">
                    {name}
                  </span>
                ))}
              </div>
            </MetaRow>
          )}

{novel.translator && (
            <MetaRow icon="solar:user-speak-linear" label="Người dịch">
              <p className="text-sm text-foreground">{novel.translator}</p>
            </MetaRow>
          )}

          {novel.sources && novel.sources.length > 0 && (
            <MetaRow icon="solar:link-linear" label="Nguồn raw">
              <div className="flex flex-col gap-1">
                {novel.sources.map((src) => (
                  <span
                    key={src}
                    className="break-all font-mono text-sm leading-snug text-foreground/80"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </MetaRow>
          )}

          {novel.updatedAt && (
            <MetaRow icon="solar:calendar-linear" label="Cập nhật lần cuối">
              <p className="text-sm text-foreground">
                {new Intl.DateTimeFormat('vi-VN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date(novel.updatedAt))}
              </p>
            </MetaRow>
          )}
        </div>
      </div>

      <NovelFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        initialData={novel}
        onSubmit={(data) => {
          updateNovel(novel.id, data);
        }}
      />
    </div>
  );
}
