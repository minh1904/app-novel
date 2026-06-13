import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import type { TranslationParagraph } from '@/types/translator';
import { CmEditor } from './CmEditor';

interface MdParagraphBlockProps {
  paragraph: TranslationParagraph;
  isStreaming: boolean;
  onEdit: (id: string, text: string) => void;
}

export function MdParagraphBlock({ paragraph, isStreaming, onEdit }: MdParagraphBlockProps) {
  const [localText, setLocalText] = useState(paragraph.translatedText);

  // Sync streaming updates from outside
  useEffect(() => {
    setLocalText(paragraph.translatedText);
  }, [paragraph.translatedText]);

  function handleChange(value: string) {
    setLocalText(value);
    onEdit(paragraph.id, value);
  }

  return (
    <div
      className={cn(
        'mb-4 min-h-[1.5rem] min-w-0 last:mb-0',
        paragraph.aiGenerated && !paragraph.reviewed && 'border-foreground/25 border-l-2 pl-3',
      )}
    >
      <CmEditor
        value={localText}
        onChange={handleChange}
        disabled={isStreaming}
        placeholder="Chưa dịch..."
        className="w-full min-w-0"
      />
    </div>
  );
}
