import { useCallback, useEffect, useRef, useState } from 'react';
import type { GlossaryTerm, TranslationParagraph } from '@/types/translator';
import { GlossaryHighlighter } from './GlossaryHighlighter';
import { QuickAddPopover } from './QuickAddPopover';

interface RawPaneProps {
  paragraphs: TranslationParagraph[];
  terms: GlossaryTerm[];
  novelId: string;
}

function charCount(paragraphs: TranslationParagraph[]) {
  return paragraphs.reduce((sum, p) => sum + p.rawText.length, 0);
}

interface PopoverState {
  text: string;
  x: number;
  y: number;
}

export function RawPane({ paragraphs, terms, novelId }: RawPaneProps) {
  const count = charCount(paragraphs);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPopover(null);
      return;
    }

    const text = sel.toString().trim();
    if (text.length === 0 || text.length > 50) {
      setPopover(null);
      return;
    }

    // Check that selection is within this pane
    const container = containerRef.current;
    if (!container) return;
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setPopover(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const PADDING = 8;
    setPopover({
      text,
      x: rect.left + rect.width / 2 - 110,
      y: rect.bottom + PADDING,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  return (
    <div className="flex min-w-0 flex-1 flex-col border-border border-r">
      <div className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
        <span className="font-mono font-semibold text-muted-foreground text-xs tracking-widest">RAW · ZH</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
          bôi đen từ để thêm vào ngữ cảnh
        </span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{count} ký tự</span>
      </div>

      <div ref={containerRef} className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {paragraphs.map((p) => (
          <p key={p.id} className="mb-4 font-sans text-foreground/90 text-sm leading-relaxed last:mb-0">
            <GlossaryHighlighter text={p.rawText} terms={terms} />
          </p>
        ))}
      </div>

      {popover && (
        <QuickAddPopover
          selectedText={popover.text}
          position={{ x: popover.x, y: popover.y }}
          novelId={novelId}
          onClose={() => {
            setPopover(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}
    </div>
  );
}
