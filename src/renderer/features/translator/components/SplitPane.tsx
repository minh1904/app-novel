import type { GlossaryTerm, TranslationParagraph } from '@/types/translator';
import { RawPane } from './RawPane';
import { TranslationPane } from './TranslationPane';

interface SplitPaneProps {
  paragraphs: TranslationParagraph[];
  glossaryTerms: GlossaryTerm[];
  translationMd: string;
  onTranslationEdit: (md: string) => void;
}

export function SplitPane({ paragraphs, glossaryTerms, translationMd, onTranslationEdit }: SplitPaneProps) {
  return (
    <div className="flex min-h-0 flex-1">
      <RawPane paragraphs={paragraphs} terms={glossaryTerms} />
      <TranslationPane translationMd={translationMd} onEdit={onTranslationEdit} />
    </div>
  );
}
