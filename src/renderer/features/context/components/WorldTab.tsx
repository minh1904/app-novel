import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useContextStore } from '@/store/context-store';

interface WorldTabProps {
  novelId: string;
}

export function WorldTab({ novelId }: WorldTabProps) {
  const { getContext, updateWorld } = useContextStore();
  const ctx = getContext(novelId);
  const [value, setValue] = useState(ctx.world);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when novelId changes
  useEffect(() => {
    setValue(getContext(novelId).world);
  }, [novelId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(v: string) {
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    setSaved(false);
    timerRef.current = setTimeout(() => {
      updateWorld(novelId, v);
      setSaved(true);
      fadeRef.current = setTimeout(() => setSaved(false), 3000);
    }, 2000);
  }

  return (
    <div className="flex h-full flex-col p-4 gap-2">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="font-medium text-foreground text-sm">Thế giới & Bối cảnh</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            Mô tả hệ thống sức mạnh, địa danh, tổ chức... Được inject vào prompt AI.
          </p>
        </div>
        <span
          className={cn(
            'text-muted-foreground text-xs transition-opacity duration-700',
            saved ? 'opacity-100' : 'opacity-0',
          )}
        >
          Đã lưu ✓
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Ví dụ: Đấu Khí đại lục — hệ thống cấp bậc: Đấu Giả → Đấu Sư → ... → Đấu Đế"
        className="flex-1 min-h-[200px] resize-none rounded-lg border border-input bg-background p-3 text-foreground text-sm leading-relaxed outline-none focus:border-foreground/30 transition-colors placeholder:text-muted-foreground scrollbar-thin"
      />
    </div>
  );
}
