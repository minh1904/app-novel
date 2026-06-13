import { Icon } from '@iconify/react';
import { cn } from '@/lib/cn';
import type { StreamingStatus } from '@/types/translator';

interface TranslateButtonProps {
  status: StreamingStatus;
  nextChapterNumber?: number | undefined;
  onTranslateNext: () => void;
  onStop: () => void;
  onDone: () => void;
  onRetry: () => void;
  onTranslateAll: () => void;
}

const FIXED_W = 'w-48';

export function TranslateButton({
  status,
  nextChapterNumber,
  onTranslateNext,
  onStop,
  onDone,
  onRetry,
  onTranslateAll,
}: TranslateButtonProps) {
  return (
    <div className="flex items-center gap-2">
      {status === 'idle' && (
        <button
          type="button"
          onClick={onTranslateNext}
          className={cn(
            FIXED_W,
            'flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 font-medium text-sm text-background transition-colors hover:bg-foreground/85 active:scale-[0.98]',
          )}
        >
          <Icon icon="solar:play-linear" width={14} />
          Dịch tiếp
        </button>
      )}

      {status === 'paused' && (
        <button
          type="button"
          onClick={onTranslateNext}
          className={cn(
            FIXED_W,
            'flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 font-medium text-sm text-background transition-colors hover:bg-foreground/85 active:scale-[0.98]',
          )}
        >
          <Icon icon="solar:play-linear" width={14} />
          Dịch tiếp (từ chỗ dừng)
        </button>
      )}

      {status === 'streaming' && (
        <button
          type="button"
          onClick={onStop}
          className={cn(
            FIXED_W,
            'flex items-center justify-center gap-2 rounded-md border border-border bg-muted px-4 py-2 font-medium text-sm text-foreground transition-colors hover:bg-muted/80 active:scale-[0.98]',
          )}
        >
          <Icon icon="solar:stop-linear" width={14} />
          Dừng
        </button>
      )}

      {status === 'done' && (
        <button
          type="button"
          onClick={onDone}
          className={cn(
            FIXED_W,
            'flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 font-medium text-sm text-background transition-colors hover:bg-foreground/85 active:scale-[0.98]',
          )}
        >
          <Icon icon="solar:check-circle-linear" width={14} />
          {nextChapterNumber ? `Xong — Ch. ${nextChapterNumber} →` : 'Xong'}
        </button>
      )}

      {status === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            FIXED_W,
            'flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 font-medium text-sm text-background transition-colors hover:bg-foreground/85 active:scale-[0.98]',
          )}
        >
          <Icon icon="solar:refresh-linear" width={14} />
          Thử lại
        </button>
      )}

      <button
        type="button"
        disabled={status === 'streaming'}
        onClick={onTranslateAll}
        className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-foreground/80 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon icon="solar:bolt-linear" width={14} />
        Dịch cả chương
      </button>
    </div>
  );
}
