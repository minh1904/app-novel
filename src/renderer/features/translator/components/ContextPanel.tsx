import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from '@tanstack/react-router';
import type { AddressForm, Character, GlossaryTerm } from '@/types/translator';
import { useContextStore } from '@/store/context-store';

interface ContextPanelProps {
  open: boolean;
  novelId: string;
  chapterNumber: number;
  chapterRawContent: string;
  onToggle: () => void;
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function TermCard({ term }: { term: GlossaryTerm }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-foreground/90 text-sm">{term.rawText}</span>
        <span className="shrink-0 text-muted-foreground text-xs">{term.translatedText}</span>
      </div>
      {term.note && <p className="mt-0.5 text-muted-foreground text-xs">{term.note}</p>}
    </div>
  );
}

function CharacterChip({ char }: { char: Character }) {
  const colorClass = 'bg-muted text-foreground/60';

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${colorClass}`}>
        {initials(char.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-foreground text-xs font-medium">{char.name}</p>
        <p className="text-muted-foreground text-[10px]">tự xưng "{char.selfAddress}"</p>
      </div>
    </div>
  );
}

function AddressChip({ form, characters }: { form: AddressForm; characters: Character[] }) {
  const from = characters.find((c) => c.id === form.fromCharacterId);
  const to = characters.find((c) => c.id === form.toCharacterId);
  if (!from || !to) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs">
      <span className="font-medium text-foreground">{from.name}</span>
      <span className="text-muted-foreground">⇄</span>
      <span className="font-medium text-foreground">{to.name}</span>
      <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-[10px]">
        {form.address}
      </span>
    </div>
  );
}

export function ContextPanel({ open, novelId, chapterNumber, chapterRawContent, onToggle }: ContextPanelProps) {
  const { getContext, getChapterTerms, getActiveAddressForms } = useContextStore();
  const navigate = useNavigate();

  const ctx = getContext(novelId);
  const chapterTerms = getChapterTerms(novelId, chapterRawContent);
  const activeForms = getActiveAddressForms(novelId, chapterNumber);
  const displayedChars = ctx.characters.slice(0, 6);
  const extraCount = ctx.characters.length - displayedChars.length;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="context-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="flex flex-col overflow-hidden border-border border-l bg-sidebar"
        >
          <div className="scrollbar-thin flex-1 overflow-y-auto p-3 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
              <span className="font-heading font-semibold text-foreground text-xs uppercase tracking-wider flex-1">
                Ngữ cảnh chương
              </span>
              <button
                type="button"
                onClick={onToggle}
                title="Đóng ngữ cảnh (Ctrl+.)"
                className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon icon="solar:alt-arrow-right-linear" width={14} />
              </button>
            </div>

            {/* Glossary terms */}
            <div>
              <p className="mb-2 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Thuật ngữ trong chương ({chapterTerms.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {chapterTerms.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">Không có thuật ngữ</p>
                ) : (
                  chapterTerms.map((t) => <TermCard key={t.id} term={t} />)
                )}
              </div>
            </div>

            {/* Characters */}
            <div>
              <p className="mb-2 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Nhân vật ({ctx.characters.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {displayedChars.map((c) => <CharacterChip key={c.id} char={c} />)}
                {extraCount > 0 && (
                  <p className="text-center text-muted-foreground text-xs">+{extraCount} nhân vật khác</p>
                )}
              </div>
            </div>

            {/* Address forms */}
            <div>
              <p className="mb-2 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
                Xưng hô @ Chương {chapterNumber}
              </p>
              <div className="flex flex-col gap-1.5">
                {activeForms.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">Chưa có xưng hô</p>
                ) : (
                  activeForms.map((f) => (
                    <AddressChip key={f.id} form={f} characters={ctx.characters} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-border border-t p-3">
            <button
              type="button"
              onClick={() => navigate({ to: '/novel/$novelId', params: { novelId } })}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-muted/60 px-3 py-2 text-foreground/70 text-xs font-medium transition-colors hover:bg-muted hover:text-foreground"
            >
              Quản lý ngữ cảnh
              <Icon icon="solar:alt-arrow-right-linear" width={11} />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
