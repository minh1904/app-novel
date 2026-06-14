import { Icon } from '@iconify/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { useContextStore } from '@/store/context-store';

interface QuickAddPopoverProps {
  selectedText: string;
  position: { x: number; y: number };
  novelId: string;
  onClose: () => void;
}

type Mode = 'menu' | 'term' | 'character';

interface Toast {
  id: number;
  message: string;
}

let toastCounter = 0;

export function QuickAddPopover({ selectedText, position, novelId, onClose }: QuickAddPopoverProps) {
  const [mode, setMode] = useState<Mode>('menu');
  const [termTrans, setTermTrans] = useState('');
  const [termNote, setTermNote] = useState('');
  const [charRole, setCharRole] = useState('');
  const [charSelf, setCharSelf] = useState('ta');
  const [termError, setTermError] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const transRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { addTerm, addCharacter } = useContextStore();

  // Focus first input when mode changes
  useEffect(() => {
    if (mode === 'term') setTimeout(() => transRef.current?.focus(), 0);
    if (mode === 'character') setTimeout(() => roleRef.current?.focus(), 0);
  }, [mode]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on mousedown outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [onClose]);

  function showToast(message: string) {
    const id = ++toastCounter;
    setToast({ id, message });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2600);
  }

  function handleSaveTerm() {
    if (!termTrans.trim()) {
      setTermError(true);
      transRef.current?.focus();
      return;
    }
    const termData: Parameters<typeof addTerm>[1] = { rawText: selectedText, translatedText: termTrans.trim() };
    if (termNote.trim()) termData.note = termNote.trim();
    addTerm(novelId, termData);
    showToast('Đã thêm thuật ngữ');
    setTimeout(onClose, 400);
  }

  function handleSaveCharacter() {
    const charData: Parameters<typeof addCharacter>[1] = {
      name: selectedText,
      rawName: selectedText,
      selfAddress: charSelf.trim() || 'ta',
    };
    if (charRole.trim()) charData.role = charRole.trim();
    addCharacter(novelId, charData);
    showToast('Đã thêm nhân vật');
    setTimeout(onClose, 400);
  }

  function handleAddressHo() {
    navigate({ to: '/novel/$novelId/context', params: { novelId }, search: { tab: 'address' } as never });
    onClose();
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-md bg-foreground px-4 py-2 text-background text-sm shadow-lg"
          style={{ pointerEvents: 'none' }}
        >
          {toast.message}
        </div>
      )}

      <div
        ref={containerRef}
        className="fixed z-[150] rounded-lg border border-border bg-popover shadow-xl"
        style={{ top: position.y, left: position.x, minWidth: 220 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {mode === 'menu' && (
          <div className="flex flex-col py-1">
            <button
              type="button"
              onClick={() => setMode('term')}
              className="flex items-center gap-2.5 px-3 py-2 text-left text-foreground text-sm hover:bg-muted transition-colors"
            >
              <Icon icon="solar:book-linear" width={14} className="shrink-0 text-muted-foreground" />
              <span>Thuật ngữ</span>
              <span className="ml-auto text-muted-foreground text-xs truncate max-w-[80px]">"{selectedText}"</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('character')}
              className="flex items-center gap-2.5 px-3 py-2 text-left text-foreground text-sm hover:bg-muted transition-colors"
            >
              <Icon icon="solar:user-linear" width={14} className="shrink-0 text-muted-foreground" />
              <span>Nhân vật</span>
            </button>
            <button
              type="button"
              onClick={handleAddressHo}
              className="flex items-center gap-2.5 px-3 py-2 text-left text-foreground text-sm hover:bg-muted transition-colors"
            >
              <Icon icon="solar:transfer-horizontal-linear" width={14} className="shrink-0 text-muted-foreground" />
              <span>Xưng hô</span>
              <Icon icon="solar:alt-arrow-right-linear" width={11} className="ml-auto text-muted-foreground" />
            </button>
          </div>
        )}

        {mode === 'term' && (
          <div className="p-3 flex flex-col gap-2" style={{ minWidth: 260 }}>
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon icon="solar:alt-arrow-left-linear" width={12} />
              </button>
              <span className="font-medium text-foreground text-xs">Thêm thuật ngữ</span>
            </div>
            <div className="rounded-md bg-muted/50 px-2 py-1.5">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Từ gốc</p>
              <p className="font-mono text-foreground text-sm">{selectedText}</p>
            </div>
            <input
              ref={transRef}
              value={termTrans}
              onChange={(e) => { setTermTrans(e.target.value); setTermError(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTerm(); }}
              placeholder="Dịch nghĩa *"
              className={cn(
                'rounded-md border bg-background px-2.5 py-1.5 text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground',
                termError ? 'border-red-500' : 'border-input focus:border-foreground/40',
              )}
            />
            <input
              value={termNote}
              onChange={(e) => setTermNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTerm(); }}
              placeholder="Ghi chú (tùy chọn)"
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-foreground text-sm outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleSaveTerm}
              className="rounded-md bg-foreground px-3 py-1.5 text-background text-sm font-medium hover:bg-foreground/85 transition-colors"
            >
              Lưu
            </button>
          </div>
        )}

        {mode === 'character' && (
          <div className="p-3 flex flex-col gap-2" style={{ minWidth: 260 }}>
            <div className="flex items-center gap-2 mb-1">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon icon="solar:alt-arrow-left-linear" width={12} />
              </button>
              <span className="font-medium text-foreground text-xs">Thêm nhân vật</span>
            </div>
            <div className="rounded-md bg-muted/50 px-2 py-1.5">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-0.5">Tên</p>
              <p className="font-mono text-foreground text-sm">{selectedText}</p>
            </div>
            <input
              ref={roleRef}
              value={charRole}
              onChange={(e) => setCharRole(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCharacter(); }}
              placeholder="Vai trò (tùy chọn)"
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-foreground text-sm outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground"
            />
            <input
              value={charSelf}
              onChange={(e) => setCharSelf(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCharacter(); }}
              placeholder="Tự xưng"
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-foreground text-sm outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleSaveCharacter}
              className="rounded-md bg-foreground px-3 py-1.5 text-background text-sm font-medium hover:bg-foreground/85 transition-colors"
            >
              Lưu
            </button>
          </div>
        )}
      </div>
    </>
  );
}
