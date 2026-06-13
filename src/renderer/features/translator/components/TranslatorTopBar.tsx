import { Icon } from '@iconify/react';
import { cn } from '@/lib/cn';
import type { Chapter } from '@/types/translator';

interface TranslatorTopBarProps {
  chapter: Chapter;
  totalChapters: number;
  contextPanelOpen: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onToggleContext: () => void;
}

export function TranslatorTopBar({
  chapter,
  totalChapters,
  contextPanelOpen,
  onPrevChapter,
  onNextChapter,
  onToggleContext,
}: TranslatorTopBarProps) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-border border-b bg-background px-3">
      {/* Chapter title */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h2 className="truncate font-heading font-semibold text-foreground text-sm">
          {chapter.title}
        </h2>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {chapter.number} / {totalChapters}
        </span>
      </div>

      {/* Nav arrows */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onPrevChapter}
          disabled={chapter.number <= 1}
          title="Chương trước (Alt+←)"
          className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <Icon icon="solar:alt-arrow-left-linear" width={15} />
        </button>
        <button
          type="button"
          onClick={onNextChapter}
          disabled={chapter.number >= totalChapters}
          title="Chương tiếp (Alt+→)"
          className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <Icon icon="solar:alt-arrow-right-linear" width={15} />
        </button>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Preview / Export (stubs) */}
      <button
        type="button"
        disabled
        title="Sắp ra mắt"
        className="flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-muted-foreground/50 text-xs"
      >
        <Icon icon="solar:eye-linear" width={14} />
        Preview
      </button>
      <button
        type="button"
        disabled
        title="Sắp ra mắt"
        className="flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-muted-foreground/50 text-xs"
      >
        <Icon icon="solar:export-linear" width={14} />
        Export
      </button>

      <div className="h-4 w-px bg-border" />

      {/* Context toggle */}
      <button
        type="button"
        onClick={onToggleContext}
        title="Ngữ cảnh (Ctrl+.)"
        className={cn(
          'flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
          contextPanelOpen
            ? 'border-foreground/20 bg-foreground/8 text-foreground'
            : 'border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', contextPanelOpen ? 'bg-foreground' : 'bg-muted-foreground/50')} />
        Ngữ cảnh
      </button>
    </div>
  );
}
