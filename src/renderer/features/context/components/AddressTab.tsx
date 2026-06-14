import { Icon } from '@iconify/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import { useContextStore } from '@/store/context-store';
import type { AddressFormFull, AddressKind, AddressPhase } from '@/types/translator';

interface AddressTabProps {
  novelId: string;
  currentChapter?: number;
}

type ViewMode = 'table' | 'graph' | 'timeline';

const KIND_COLORS: Record<AddressKind, string> = {
  'gia tộc': 'text-amber-400 bg-amber-400/10',
  'sư môn': 'text-violet-400 bg-violet-400/10',
  'tình cảm': 'text-rose-400 bg-rose-400/10',
  'bằng hữu': 'text-emerald-400 bg-emerald-400/10',
  địch: 'text-red-400 bg-red-400/10',
  'thế lực': 'text-sky-400 bg-sky-400/10',
};

const KIND_EDGE_COLOR: Record<AddressKind, string> = {
  'gia tộc': '#f59e0b',
  'sư môn': '#a78bfa',
  'tình cảm': '#fb7185',
  'bằng hữu': '#34d399',
  địch: '#f87171',
  'thế lực': '#38bdf8',
};

const ALL_KINDS: AddressKind[] = ['gia tộc', 'sư môn', 'tình cảm', 'bằng hữu', 'địch', 'thế lực'];

// ─── Table View ────────────────────────────────────────────────────────────────

function TableView({ novelId, currentChapter }: { novelId: string; currentChapter: number }) {
  const { getContext, addForm, updateForm, deleteForm } = useContextStore();
  const ctx = getContext(novelId);
  const [editTarget, setEditTarget] = useState<AddressFormFull | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  function activePhaseLabel(form: AddressFormFull) {
    const active = [...form.phases]
      .filter((p) => p.from <= currentChapter)
      .sort((a, b) => b.from - a.from)[0];
    return active?.rel ?? '—';
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          {ctx.addressFormsFull.length} quan hệ
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 font-medium text-foreground text-xs transition-colors hover:bg-muted"
        >
          <Icon icon="solar:add-circle-linear" width={13} />
          Thêm quan hệ
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b bg-muted/30">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
                Nhân vật A
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
                Nhân vật B
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
                Loại
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
                Quan hệ hiện tại
              </th>
              <th className="w-16 px-3 py-2 text-center font-medium text-muted-foreground text-xs">
                Giai đoạn
              </th>
              <th className="w-16 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {ctx.addressFormsFull.map((form, i) => {
              const charA = ctx.characters.find((c) => c.id === form.a);
              const charB = ctx.characters.find((c) => c.id === form.b);
              return (
                <tr
                  key={form.id}
                  className={cn(
                    'transition-colors hover:bg-muted/20',
                    i < ctx.addressFormsFull.length - 1 && 'border-border border-b',
                  )}
                >
                  <td className="px-3 py-2 font-medium text-foreground text-sm">
                    {charA?.name ?? form.a}
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground text-sm">
                    {charB?.name ?? form.b}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 font-medium text-[10px]',
                        KIND_COLORS[form.kind],
                      )}
                    >
                      {form.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-foreground/80 text-sm">{activePhaseLabel(form)}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground text-xs tabular-nums">
                    {form.phases.length}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditTarget(form)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Icon icon="solar:pen-2-linear" width={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteForm(novelId, form.id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Icon icon="solar:trash-bin-minimalistic-linear" width={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {ctx.addressFormsFull.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-muted-foreground text-sm italic"
                >
                  Chưa có quan hệ xưng hô nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <AddressDialog
          open
          title="Chỉnh sửa quan hệ"
          initial={editTarget}
          characters={ctx.characters}
          onSave={(patch) => updateForm(novelId, editTarget.id, patch)}
          onClose={() => setEditTarget(null)}
        />
      )}
      <AddressDialog
        open={addOpen}
        title="Thêm quan hệ"
        initial={null}
        characters={ctx.characters}
        onSave={(data) => addForm(novelId, data as Omit<AddressFormFull, 'id'>)}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}

// ─── Address Dialog ────────────────────────────────────────────────────────────

function AddressDialog({
  open,
  title,
  initial,
  characters,
  onSave,
  onClose,
}: {
  open: boolean;
  title: string;
  initial: AddressFormFull | null;
  characters: { id: string; name: string }[];
  onSave: (data: Partial<AddressFormFull>) => void;
  onClose: () => void;
}) {
  const [a, setA] = useState(initial?.a ?? '');
  const [b, setB] = useState(initial?.b ?? '');
  const [kind, setKind] = useState<AddressKind>(initial?.kind ?? 'bằng hữu');
  const [phases, setPhases] = useState<AddressPhase[]>(
    initial?.phases ?? [
      { from: 1, rel: '', aToB: { call: '', self: '' }, bToA: { call: '', self: '' } },
    ],
  );

  function addPhase() {
    setPhases((ps) => [
      ...ps,
      { from: 1, rel: '', aToB: { call: '', self: '' }, bToA: { call: '', self: '' } },
    ]);
  }

  function updatePhase(i: number, patch: Partial<AddressPhase>) {
    setPhases((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function removePhase(i: number) {
    setPhases((ps) => ps.filter((_, idx) => idx !== i));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-muted-foreground text-xs">Nhân vật A</label>
              <select
                value={a}
                onChange={(e) => setA(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-2 text-foreground text-sm outline-none"
              >
                <option value="">-- Chọn --</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-muted-foreground text-xs">Nhân vật B</label>
              <select
                value={b}
                onChange={(e) => setB(e.target.value)}
                className="rounded-md border border-input bg-background px-2.5 py-2 text-foreground text-sm outline-none"
              >
                <option value="">-- Chọn --</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium text-muted-foreground text-xs">Loại quan hệ</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AddressKind)}
              className="rounded-md border border-input bg-background px-2.5 py-2 text-foreground text-sm outline-none"
            >
              {ALL_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Giai đoạn
              </label>
              <button
                type="button"
                onClick={addPhase}
                className="flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
              >
                <Icon icon="solar:add-circle-linear" width={12} />
                Thêm giai đoạn
              </button>
            </div>
            {phases.map((phase, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 flex-col gap-0.5">
                    <label className="text-[10px] text-muted-foreground">Từ chương</label>
                    <input
                      type="number"
                      min={1}
                      value={phase.from}
                      onChange={(e) => updatePhase(i, { from: Number(e.target.value) })}
                      className="w-20 rounded border border-input bg-background px-2 py-1 text-foreground text-sm outline-none"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <label className="text-[10px] text-muted-foreground">Nhãn quan hệ</label>
                    <input
                      value={phase.rel}
                      onChange={(e) => updatePhase(i, { rel: e.target.value })}
                      placeholder="Đệ tử – Sư phụ"
                      className="rounded border border-input bg-background px-2 py-1 text-foreground text-sm outline-none"
                    />
                  </div>
                  {phases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhase(i)}
                      className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-red-500"
                    >
                      <Icon icon="solar:close-circle-linear" width={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[10px] text-muted-foreground">
                      A → B: gọi
                    </span>
                    <input
                      value={phase.aToB.call}
                      onChange={(e) =>
                        updatePhase(i, { aToB: { ...phase.aToB, call: e.target.value } })
                      }
                      placeholder="Sư phụ"
                      className="rounded border border-input bg-background px-2 py-1 text-foreground text-xs outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[10px] text-muted-foreground">A tự xưng</span>
                    <input
                      value={phase.aToB.self}
                      onChange={(e) =>
                        updatePhase(i, { aToB: { ...phase.aToB, self: e.target.value } })
                      }
                      placeholder="đệ tử"
                      className="rounded border border-input bg-background px-2 py-1 text-foreground text-xs outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[10px] text-muted-foreground">
                      B → A: gọi
                    </span>
                    <input
                      value={phase.bToA.call}
                      onChange={(e) =>
                        updatePhase(i, { bToA: { ...phase.bToA, call: e.target.value } })
                      }
                      placeholder="Tiêu Viêm"
                      className="rounded border border-input bg-background px-2 py-1 text-foreground text-xs outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-[10px] text-muted-foreground">B tự xưng</span>
                    <input
                      value={phase.bToA.self}
                      onChange={(e) =>
                        updatePhase(i, { bToA: { ...phase.bToA, self: e.target.value } })
                      }
                      placeholder="lão phu"
                      className="rounded border border-input bg-background px-2 py-1 text-foreground text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() => {
              onSave({ a, b, kind, phases });
              onClose();
            }}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Graph View ────────────────────────────────────────────────────────────────

function GraphView({ novelId }: { novelId: string }) {
  const { getContext } = useContextStore();
  const ctx = getContext(novelId);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  const MAX_NODES = 15;
  const chars = ctx.characters.slice(0, MAX_NODES);
  const WIDTH = 500;
  const HEIGHT = 400;
  const CX = WIDTH / 2;
  const CY = HEIGHT / 2;
  const R = Math.min(CX, CY) - 50;

  const nodePositions = chars.map((_, i) => {
    const angle = (2 * Math.PI * i) / chars.length - Math.PI / 2;
    return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });

  const charIndexById = new Map(chars.map((c, i) => [c.id, i]));

  return (
    <div className="flex flex-col items-center gap-2">
      {ctx.characters.length > MAX_NODES && (
        <p className="text-muted-foreground text-xs">
          Hiển thị {MAX_NODES}/{ctx.characters.length} nhân vật đầu
        </p>
      )}
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="max-w-full">
        <title>Lược đồ quan hệ nhân vật</title>
        {/* Edges */}
        {ctx.addressFormsFull.map((form) => {
          const ai = charIndexById.get(form.a);
          const bi = charIndexById.get(form.b);
          if (ai === undefined || bi === undefined) return null;
          const posA = nodePositions[ai];
          const posB = nodePositions[bi];
          if (!posA || !posB) return null;
          const isHovered = hoveredEdge === form.id;
          const isHighlighted =
            highlightedNode === null || highlightedNode === form.a || highlightedNode === form.b;
          const color = KIND_EDGE_COLOR[form.kind];
          const activePhase = [...form.phases]
            .filter((p) => p.from <= 1)
            .sort((a, b) => b.from - a.from)[0];

          return (
            <g key={form.id}>
              <line
                x1={posA.x}
                y1={posA.y}
                x2={posB.x}
                y2={posB.y}
                stroke={color}
                strokeWidth={isHovered ? 2.5 : 1.5}
                strokeOpacity={isHighlighted ? (isHovered ? 1 : 0.6) : 0.15}
                style={{ cursor: 'pointer', transition: 'stroke-opacity 0.15s' }}
                onMouseEnter={() => setHoveredEdge(form.id)}
                onMouseLeave={() => setHoveredEdge(null)}
              >
                <title>
                  {`${ctx.characters.find((c) => c.id === form.a)?.name ?? form.a} ↔ ${ctx.characters.find((c) => c.id === form.b)?.name ?? form.b}\n${form.kind}${activePhase ? ` · ${activePhase.rel}` : ''}`}
                </title>
              </line>
              {isHovered && activePhase && (
                <text
                  x={(posA.x + posB.x) / 2}
                  y={(posA.y + posB.y) / 2 - 6}
                  fill={color}
                  fontSize={10}
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {activePhase.rel}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {chars.map((char, i) => {
          const pos = nodePositions[i];
          if (!pos) return null;
          const isHighlighted = highlightedNode === null || highlightedNode === char.id;
          const label = char.name.split(' ').slice(-1)[0] ?? char.name;
          return (
            <g
              key={char.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHighlightedNode(char.id)}
              onMouseLeave={() => setHighlightedNode(null)}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={20}
                fill="var(--muted)"
                stroke="var(--border)"
                strokeWidth={highlightedNode === char.id ? 2 : 1}
                opacity={isHighlighted ? 1 : 0.4}
              />
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize={10}
                fontWeight="600"
                opacity={isHighlighted ? 1 : 0.4}
              >
                {label.slice(0, 4)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-2">
        {ALL_KINDS.map((k) => (
          <span
            key={k}
            className={cn('rounded px-1.5 py-0.5 font-medium text-[10px]', KIND_COLORS[k])}
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────

function TimelineView({ novelId, currentChapter }: { novelId: string; currentChapter: number }) {
  const { getContext } = useContextStore();
  const ctx = getContext(novelId);

  return (
    <div className="flex flex-col gap-4">
      {ctx.addressFormsFull.length === 0 && (
        <p className="py-12 text-center text-muted-foreground text-sm italic">
          Chưa có quan hệ xưng hô.
        </p>
      )}
      {ctx.addressFormsFull.map((form) => {
        const charA = ctx.characters.find((c) => c.id === form.a);
        const charB = ctx.characters.find((c) => c.id === form.b);
        return (
          <div key={form.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">{charA?.name ?? form.a}</span>
              <span className="text-muted-foreground text-xs">⇄</span>
              <span className="font-semibold text-foreground text-sm">{charB?.name ?? form.b}</span>
              <span
                className={cn(
                  'ml-auto rounded px-1.5 py-0.5 font-medium text-[10px]',
                  KIND_COLORS[form.kind],
                )}
              >
                {form.kind}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 border-border border-l-2 pl-2">
              {[...form.phases]
                .sort((a, b) => a.from - b.from)
                .map((phase, i) => {
                  const nextPhase = form.phases[i + 1];
                  const isActive =
                    phase.from <= currentChapter &&
                    (i === form.phases.length - 1 ||
                      (nextPhase !== undefined && nextPhase.from > currentChapter));
                  return (
                    <div
                      key={i}
                      className={cn(
                        'rounded-md px-2 py-1.5 text-xs',
                        isActive ? 'border border-foreground/20 bg-foreground/10' : 'bg-muted/30',
                      )}
                    >
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-muted-foreground tabular-nums">Ch. {phase.from}</span>
                        <span className="font-medium text-foreground">{phase.rel}</span>
                        {isActive && (
                          <span className="ml-auto rounded-full bg-foreground/20 px-1.5 py-0.5 font-medium text-[9px] text-foreground">
                            hiện tại
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 text-[10px] text-muted-foreground">
                        <span>
                          {charA?.name}: gọi "{phase.aToB.call}", xưng "{phase.aToB.self}"
                        </span>
                        <span>
                          {charB?.name}: gọi "{phase.bToA.call}", xưng "{phase.bToA.self}"
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AddressTab Main ──────────────────────────────────────────────────────────

export function AddressTab({ novelId, currentChapter = 1 }: AddressTabProps) {
  const [view, setView] = useState<ViewMode>('table');

  const VIEWS: { id: ViewMode; label: string }[] = [
    { id: 'table', label: 'Bảng' },
    { id: 'graph', label: 'Lược đồ' },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* View switcher */}
      <div className="flex w-fit rounded-md border border-border bg-muted/30 p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={cn(
              'rounded px-3 py-1 font-medium text-xs transition-colors',
              view === v.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'table' && <TableView novelId={novelId} currentChapter={currentChapter} />}
      {view === 'graph' && <GraphView novelId={novelId} />}
      {view === 'timeline' && <TimelineView novelId={novelId} currentChapter={currentChapter} />}
    </div>
  );
}
