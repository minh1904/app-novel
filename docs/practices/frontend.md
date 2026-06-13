# Frontend Practices — NovelFlow AI Translation

Stack: **Tailwind v4** · **React 19** · **Base UI** · **CVA** · **Electron**

---

## 1. Tailwind Setup

Dự án dùng `@tailwindcss/vite` (build-time, **không phải** browser runtime).  
Tất cả token nằm trong `src/renderer/index.css`.

| File | Vai trò |
|---|---|
| `index.css :root {}` | Light mode tokens |
| `index.css .dark {}` | Dark mode tokens — **đây là primary**, app luôn dark |
| `index.css @theme inline {}` | Bridge CSS vars → Tailwind class names |

> **Dark mode hardcoded:** `index.tsx` gắn `.dark` lên `<html>`. Không dùng `dark:` prefix trừ khi component thực sự cần hỗ trợ cả hai mode.

---

## 2. Color Tokens — Luôn dùng semantic

### Nguyên tắc
```tsx
// ✅ semantic token
<div className="bg-background text-foreground border border-border" />
<p className="text-muted-foreground" />

// ❌ arbitrary hex
<div className="bg-[#1e1e1e] text-[#dadada]" />

// ❌ raw Tailwind scale
<div className="bg-zinc-900 text-zinc-100" />
```

### Token reference (dark mode — active)

| Class | ~Hex | Dùng cho |
|---|---|---|
| `bg-background` | #1e1e1e | Main editor / content area |
| `bg-card` | #282828 | Floating surfaces, modals, cards |
| `bg-popover` | #282828 | Dropdowns, tooltips, command palette |
| `bg-muted` | #313131 | Hover fill, subtle backgrounds |
| `bg-accent` | #313131 | Generic interactive hover |
| `bg-sidebar` | #252525 | Left panel, file tree |
| `bg-sidebar-accent` | #363636 | Sidebar hover / selected item |
| `bg-primary` | #dadada | Primary action button |
| `bg-destructive` | oklch red | Delete / danger |
| `border-border` | #3c3c3c | Dividers, outlines, separators |
| `border-sidebar-border` | #313131 | Sidebar internal dividers |
| `text-foreground` | #dadada | Body text |
| `text-muted-foreground` | #999999 | Labels, placeholders, hints |
| `text-primary-foreground` | #1e1e1e | Text on primary button |
| `text-destructive` | — | Error messages, danger labels |

### Opacity modifier — OK cho layering
```tsx
<div className="bg-sidebar-accent/60 hover:bg-sidebar-accent" />
<div className="border-border/50" />
<div className="bg-muted/40" />
```

---

## 3. Class Ordering Convention

Viết class theo thứ tự này (dễ scan, IntelliSense friendly):

```
1. Layout      → flex, grid, block, absolute, overflow, z-index
2. Sizing      → w, h, min-w, max-w
3. Spacing     → p, m, gap, space
4. Typography  → font, text-size, leading, tracking, truncate
5. Visual      → bg, border, rounded, shadow, ring, opacity
6. Transition  → transition, duration, ease, animate
7. Interactive → cursor, select, pointer-events
8. State       → hover:, focus:, active:, disabled:, focus-visible:
9. Responsive  → sm:, md:, lg: (mobile-first, ít dùng trong desktop app)
```

**Ví dụ:**
```tsx
<button
  className={cn(
    'flex items-center justify-center',   // layout
    'w-8 h-8',                            // sizing
    'rounded',                            // visual
    'text-muted-foreground',             // typography
    'transition-colors',                  // transition
    'hover:bg-sidebar-accent hover:text-foreground', // state
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', // focus
    'disabled:pointer-events-none disabled:opacity-50', // disabled
    className,                            // caller override — luôn cuối
  )}
/>
```

---

## 4. CVA — Component Variants

Dùng CVA khi component có **từ 2 visual state trở lên**.

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  // base — áp dụng cho TẤT CẢ variants
  'inline-flex items-center justify-center gap-1.5 rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-muted',
        ghost:       'hover:bg-accent hover:text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:     'border border-border hover:bg-muted',
      },
      size: {
        sm:   'h-7 px-2 text-xs',
        md:   'h-8 px-3',
        lg:   'h-9 px-4',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
```

**Rules:**
- Base classes trong arg đầu của `cva()` — không lặp lại trong variant values
- Luôn nhận `className` prop và merge bằng `cn()`
- `CompoundVariants` khi cần kết hợp variant+size đặc biệt

---

## 5. `cn()` — Merge và Conditional Classes

```tsx
import { cn } from '@/lib/cn';

// Conditional
<div className={cn('base', isActive && 'bg-sidebar-accent text-foreground')} />

// Multiple conditions
<div className={cn(
  'flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors',
  isActive   && 'bg-sidebar-accent text-foreground',
  isDisabled && 'pointer-events-none opacity-50',
  className,  // luôn cuối để caller override được
)} />

// Merge (twMerge giải quyết conflict)
// px-2 sẽ bị ghi đè bởi px-4 từ className
<Button className={cn(buttonVariants({ size: 'sm' }), 'px-4')} />
```

**Rule quan trọng:** `className` prop luôn đặt **cuối cùng** trong `cn()`.

---

## 6. Custom Utilities — `@utility`

Tạo khi pattern dùng ở **3+ chỗ**. Thêm vào `src/renderer/index.css`:

```css
@utility app-drag {
  -webkit-app-region: drag;
}

@utility app-no-drag {
  -webkit-app-region: no-drag;
}

@utility scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
```

Dùng như class Tailwind thông thường:
```tsx
<div className="app-drag flex h-(--titlebar-h) items-center" />
<button className="app-no-drag" />  {/* bên trong vùng drag */}
<div className="overflow-y-auto scrollbar-thin" />
```

**Không tạo `@utility` cho one-off style** — dùng arbitrary value hoặc inline style.

---

## 7. Arbitrary Values — Khi nào dùng được

```tsx
// ✅ Layout dimensions từ CSS vars (app shell) — dùng v4 shorthand
<div className="h-(--titlebar-h)" />   // 36px
<div className="w-(--actbar-w)" />     // 44px
<div className="w-(--sidebar-w)" />    // 260px

// ✅ One-off sizing không có trong scale
<div className="max-w-[640px] min-h-[200px]" />

// ✅ CSS custom property với calc() — [var()] vẫn cần khi có biểu thức
<span
  className="translate-y-[calc(var(--i)*4px)] opacity-80"
  style={{ '--i': index } as React.CSSProperties}
/>

// ❌ KHÔNG dùng hex thay thế token
<div className="bg-[#1e1e1e]" />    // → bg-background
<div className="text-[#999]" />     // → text-muted-foreground
```

---

## 8. Dynamic Classes — Luôn dùng map tĩnh

Tailwind chỉ detect class names tĩnh trong source. Dynamic interpolation gây missing styles.

```tsx
// ❌ Tailwind không detect được 'bg-red-500' hay 'bg-green-500'
const cls = `bg-${status}-500`;

// ✅ Map tĩnh — Tailwind thấy đủ class names
const statusClass = {
  pending:    'bg-muted text-muted-foreground',
  processing: 'bg-blue-500/20 text-blue-400',
  done:       'bg-green-500/20 text-green-400',
  error:      'bg-destructive/20 text-destructive',
} satisfies Record<Status, string>;

<span className={statusClass[status]} />
```

---

## 9. App-Shell Dimensions

CSS vars định nghĩa trong `:root`, dùng làm arbitrary value — **không hardcode số**:

```tsx
// ✅
<header className="h-(--titlebar-h) flex items-center" />
<nav className="w-(--actbar-w)" />
<aside className="w-(--sidebar-w)" />

// ❌ hardcode
<header className="h-9" />   // sẽ lệch nếu --titlebar-h thay đổi
```

---

## 10. Typography Scale

```tsx
// Page / section title
<h1 className="text-lg font-semibold tracking-tight text-foreground" />

// Sidebar section header
<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground" />

// List item / nav item
<span className="text-sm text-foreground" />

// Metadata (date, count, path)
<span className="text-xs text-muted-foreground" />

// Code / filename / path
<code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded" />
```

Scale thực dùng trong app này:
- `text-xs` (12px) — metadata, timestamps, badges, counts
- `text-sm` (14px) — sidebar items, labels, UI controls, body
- `text-base` (16px) — primary reading pane (novel text)
- `text-lg` / `text-xl` — section headings
- `text-2xl`+ — page titles, empty states only

---

## 11. Anti-Patterns

| ❌ | ✅ |
|---|---|
| `bg-[#1e1e1e]` | `bg-background` |
| `text-gray-400` | `text-muted-foreground` |
| `style={{ background: 'var(--background)' }}` | `className="bg-background"` |
| `` `bg-${color}-500` `` | Map tĩnh `{ red: 'bg-red-500' }[color]` |
| `dark:` prefix cho base styles | App luôn dark — không cần |
| Class rỗng trong CVA chỉ có 1 variant | Dùng plain `cn()` |
| `!bg-background` (important modifier) | Sửa specificity |
| Duplicate base class trong variant value | Chỉ để base trong arg đầu `cva()` |
| `style={{ padding: '12px' }}` | `className="p-3"` |

---

## 12. IPC trong Feature Components

Không gọi `window.electronAPI.*` trực tiếp trong component. Bọc qua service layer:

```tsx
// src/renderer/features/translation/services/translationIpc.ts
export const translationIpc = {
  translateChapter: (chapterId: string) =>
    window.electronAPI.invoke('translation:translate', chapterId),
};

// Trong component
const handleTranslate = async () => {
  const result = await translationIpc.translateChapter(id);
  if (!result.success) showError(result.error);
};
```

IPC listener trong `useEffect` — luôn return cleanup:
```tsx
useEffect(() => {
  return window.electronAPI.onTranslationProgress((progress) => {
    setProgress(progress);
  });
}, []);
```
