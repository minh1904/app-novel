import { Icon } from '@iconify/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useContextStore } from '@/store/context-store';
import type { GlossaryTerm } from '@/types/translator';
import { nanoid } from 'nanoid';

interface GlossaryTabProps {
  novelId: string;
}

interface EditingCell {
  id: string;
  field: 'rawText' | 'translatedText' | 'note';
}

function InlineCell({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setEditing(false); setDraft(value); }
        }}
        className="w-full rounded border border-foreground/20 bg-background px-1.5 py-0.5 text-foreground text-sm outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn(
        'w-full rounded px-1 py-0.5 text-left text-sm transition-colors hover:bg-muted/60',
        value ? 'text-foreground' : 'text-muted-foreground/50 italic',
      )}
    >
      {value || placeholder}
    </button>
  );
}

export function GlossaryTab({ novelId }: GlossaryTabProps) {
  const { getContext, addTerm, updateTerm, deleteTerm } = useContextStore();
  const ctx = getContext(novelId);
  const [newRowId, setNewRowId] = useState<string | null>(null);
  const firstCellRef = useRef<HTMLInputElement>(null);

  function handleAddRow() {
    const tempId = nanoid();
    addTerm(novelId, { rawText: '', translatedText: '' });
    setNewRowId(tempId);
    setTimeout(() => firstCellRef.current?.focus(), 50);
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {ctx.glossary.length} thuật ngữ
        </p>
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-foreground text-xs font-medium hover:bg-muted transition-colors"
        >
          <Icon icon="solar:add-circle-linear" width={13} />
          Thêm thuật ngữ
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b bg-muted/30">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Từ gốc</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Dịch nghĩa</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Ghi chú</th>
              <th className="w-16 px-3 py-2 text-center font-medium text-muted-foreground text-xs">AI</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {ctx.glossary.map((term, i) => (
              <tr
                key={term.id}
                className={cn('border-border transition-colors hover:bg-muted/20', i < ctx.glossary.length - 1 && 'border-b')}
              >
                <td className="px-3 py-1.5">
                  <InlineCell
                    value={term.rawText}
                    placeholder="从原文..."
                    onSave={(v) => updateTerm(novelId, term.id, { rawText: v })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <InlineCell
                    value={term.translatedText}
                    placeholder="Dịch nghĩa..."
                    onSave={(v) => updateTerm(novelId, term.id, { translatedText: v })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <InlineCell
                    value={term.note ?? ''}
                    placeholder="Ghi chú..."
                    onSave={(v) => {
                    if (v) updateTerm(novelId, term.id, { note: v });
                    else updateTerm(novelId, term.id, { note: '' });
                  }}
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => updateTerm(novelId, term.id, { aiEnabled: !(term.aiEnabled ?? true) })}
                    title={term.aiEnabled === false ? 'Bật inject AI' : 'Tắt inject AI'}
                    className={cn(
                      'inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      term.aiEnabled === false ? 'bg-muted' : 'bg-foreground/40',
                    )}
                  >
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full bg-background transition-transform',
                        term.aiEnabled === false ? 'translate-x-0.5' : 'translate-x-4',
                      )}
                    />
                  </button>
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => deleteTerm(novelId, term.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    title="Xóa thuật ngữ"
                  >
                    <Icon icon="solar:trash-bin-minimalistic-linear" width={13} />
                  </button>
                </td>
              </tr>
            ))}
            {ctx.glossary.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground text-sm italic">
                  Chưa có thuật ngữ nào. Bấm "Thêm thuật ngữ" hoặc bôi đen trong pane RAW.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
