import { Icon } from '@iconify/react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { useContextStore } from '@/store/context-store';
import type { Character } from '@/types/translator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CharactersTabProps {
  novelId: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const a = parts[parts.length - 2]?.[0] ?? '';
    const b = parts[parts.length - 1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-violet-500/20 text-violet-400',
  'bg-sky-500/20 text-sky-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
  'bg-rose-500/20 text-rose-400',
  'bg-indigo-500/20 text-indigo-400',
];

function avatarColor(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface CharFormState {
  name: string;
  rawName: string;
  role: string;
  selfAddress: string;
}

function CharDialog({
  open,
  title,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  title: string;
  initial: CharFormState;
  onSave: (data: CharFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CharFormState>(initial);
  const field = (key: keyof CharFormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  // Reset form when dialog opens
  useState(() => { setForm(initial); });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {(
            [
              { key: 'name' as const, label: 'Tên (Hán Việt)', placeholder: 'Tiêu Viêm' },
              { key: 'rawName' as const, label: 'Tên gốc (Hán tự)', placeholder: '萧炎' },
              { key: 'role' as const, label: 'Vai trò', placeholder: 'Nhân vật chính' },
              { key: 'selfAddress' as const, label: 'Tự xưng', placeholder: 'ta' },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs font-medium">{label}</label>
              <input
                {...field(key)}
                placeholder={placeholder}
                className="rounded-md border border-input bg-background px-3 py-2 text-foreground text-sm outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => { onSave(form); onClose(); }}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CharactersTab({ novelId }: CharactersTabProps) {
  const { getContext, addCharacter, updateCharacter, deleteCharacter } = useContextStore();
  const ctx = getContext(novelId);

  const [editTarget, setEditTarget] = useState<Character | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);

  const EMPTY_FORM: CharFormState = { name: '', rawName: '', role: '', selfAddress: 'ta' };

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {ctx.characters.length} nhân vật
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-foreground text-xs font-medium hover:bg-muted transition-colors"
        >
          <Icon icon="solar:add-circle-linear" width={13} />
          Thêm nhân vật
        </button>
      </div>

      {ctx.characters.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground text-sm italic">
          Chưa có nhân vật nào.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {ctx.characters.map((char) => (
            <div
              key={char.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:border-border/80 transition-colors"
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  avatarColor(char.id),
                )}
              >
                {initials(char.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground text-sm">{char.name}</p>
                {char.rawName && (
                  <p className="text-muted-foreground text-xs font-mono">{char.rawName}</p>
                )}
                {char.role && (
                  <p className="mt-0.5 text-muted-foreground text-xs">{char.role}</p>
                )}
                <p className="mt-0.5 text-muted-foreground text-xs">
                  tự xưng: <span className="text-foreground/70">"{char.selfAddress}"</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setEditTarget(char)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Chỉnh sửa"
                >
                  <Icon icon="solar:pen-2-linear" width={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(char)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  title="Xóa"
                >
                  <Icon icon="solar:trash-bin-minimalistic-linear" width={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editTarget && (
        <CharDialog
          open
          title="Chỉnh sửa nhân vật"
          initial={{
            name: editTarget.name,
            rawName: editTarget.rawName,
            role: editTarget.role ?? '',
            selfAddress: editTarget.selfAddress,
          }}
          onSave={(data) => {
            const patch: Parameters<typeof updateCharacter>[2] = {
              name: data.name,
              rawName: data.rawName,
              selfAddress: data.selfAddress,
            };
            if (data.role) patch.role = data.role;
            updateCharacter(novelId, editTarget.id, patch);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Add dialog */}
      <CharDialog
        open={addOpen}
        title="Thêm nhân vật"
        initial={EMPTY_FORM}
        onSave={(data) => {
          const char: Parameters<typeof addCharacter>[1] = {
            name: data.name,
            rawName: data.rawName,
            selfAddress: data.selfAddress || 'ta',
          };
          if (data.role) char.role = data.role;
          addCharacter(novelId, char);
        }}
        onClose={() => setAddOpen(false)}
      />

      {/* Delete confirm dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Xóa nhân vật</DialogTitle>
          </DialogHeader>
          <p className="text-foreground/80 text-sm">
            Xóa nhân vật <strong>{deleteTarget?.name}</strong>? Hành động này không thể hoàn tác.
          </p>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteCharacter(novelId, deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
