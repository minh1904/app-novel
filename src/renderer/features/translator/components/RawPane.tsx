import type { GlossaryTerm, TranslationParagraph } from '@/types/translator';
import { GlossaryHighlighter } from './GlossaryHighlighter';

interface RawPaneProps {
  paragraphs: TranslationParagraph[];
  terms: GlossaryTerm[];
}

function charCount(paragraphs: TranslationParagraph[]) {
  return paragraphs.reduce((sum, p) => sum + p.rawText.length, 0);
}

export function RawPane({ paragraphs, terms }: RawPaneProps) {
  const count = charCount(paragraphs);

  return (
    <div className="flex min-w-0 flex-1 flex-col border-border border-r">
      <div className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
        <span className="font-mono font-semibold text-muted-foreground text-xs tracking-widest">RAW · ZH</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">
          bôi đen từ để thêm vào ngữ cảnh
        </span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{count} ký tự</span>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {paragraphs.map((p) => (
          <p key={p.id} className="mb-4 font-sans text-foreground/90 text-sm leading-relaxed last:mb-0">
            <GlossaryHighlighter text={p.rawText} terms={terms} />
          </p>
        ))}
      </div>
    </div>
  );
}
