import type { GlossaryTerm, TranslationParagraph } from '@/types/translator';
import { RawPane } from './RawPane';
import { TranslationPane } from './TranslationPane';

interface SplitPaneProps {
  paragraphs: TranslationParagraph[];
  glossaryTerms: GlossaryTerm[];
  isStreaming: boolean;
  onParagraphEdit: (paragraphId: string, text: string) => void;
}

export function SplitPane({ paragraphs, glossaryTerms, isStreaming, onParagraphEdit }: SplitPaneProps) {
  return (
    <div className="flex min-h-0 flex-1">
      <RawPane paragraphs={paragraphs} terms={glossaryTerms} />
      <TranslationPane
        paragraphs={paragraphs}
        isStreaming={isStreaming}
        onParagraphEdit={onParagraphEdit}
      />
    </div>
  );
}
