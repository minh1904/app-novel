import { CmEditor } from './CmEditor';

interface TranslationPaneProps {
  translationMd: string;
  onEdit: (md: string) => void;
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function TranslationPane({ translationMd, onEdit }: TranslationPaneProps) {
  const count = wordCount(translationMd);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
        <span className="font-mono font-semibold text-xs tracking-widest text-muted-foreground">
          DỊCH · VI
        </span>
        <span className="min-w-0 flex-1" />
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{count} chữ</span>
      </div>

      <CmEditor
        value={translationMd}
        onChange={onEdit}
        placeholder="Bắt đầu dịch..."
        scrollable
        className="scrollbar-thin min-h-0 flex-1 overflow-hidden"
      />
    </div>
  );
}
