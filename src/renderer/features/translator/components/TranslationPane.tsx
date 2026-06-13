import { useRef } from 'react';
import { cn } from '@/lib/cn';
import type { TranslationParagraph } from '@/types/translator';

interface TranslationPaneProps {
  paragraphs: TranslationParagraph[];
  isStreaming: boolean;
  onParagraphEdit: (paragraphId: string, text: string) => void;
}

function wordCount(paragraphs: TranslationParagraph[]) {
  return paragraphs.reduce((sum, p) => {
    return sum + (p.translatedText ? p.translatedText.trim().split(/\s+/).filter(Boolean).length : 0);
  }, 0);
}

function ParagraphBlock({
  paragraph,
  isStreaming,
  onEdit,
}: {
  paragraph: TranslationParagraph;
  isStreaming: boolean;
  onEdit: (id: string, text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleBlur() {
    const text = ref.current?.innerText ?? '';
    onEdit(paragraph.id, text);
  }

  return (
    <div
      className={cn(
        'mb-4 last:mb-0',
        paragraph.aiGenerated && !paragraph.reviewed && 'border-l-2 border-foreground/25 pl-3',
      )}
    >
      <div
        ref={ref}
        contentEditable={!isStreaming}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className={cn(
          'min-h-[1.5rem] rounded-sm text-foreground/90 text-sm leading-relaxed outline-none',
          isStreaming ? 'cursor-not-allowed opacity-70' : 'focus:bg-muted/30',
          !paragraph.translatedText && 'text-muted-foreground/50 italic',
        )}
        data-paragraph-id={paragraph.id}
      >
        {paragraph.translatedText || (isStreaming ? '' : 'Click để dịch thủ công...')}
      </div>
    </div>
  );
}

export function TranslationPane({ paragraphs, isStreaming, onParagraphEdit }: TranslationPaneProps) {
  const count = wordCount(paragraphs);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
        <span className="font-mono font-semibold text-muted-foreground text-xs tracking-widest">DỊCH · VI</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
          click vào đoạn để sửa
        </span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{count} chữ</span>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {paragraphs.map((p) => (
          <ParagraphBlock
            key={p.id}
            paragraph={p}
            isStreaming={isStreaming}
            onEdit={onParagraphEdit}
          />
        ))}
      </div>
    </div>
  );
}
