# Motion (Framer Motion v11+) Best Practices

Stack: **motion@12** · **React 19** · **Electron**

---

## Import

```ts
import {
  motion, AnimatePresence,
  useMotionValue, useTransform, useSpring,
  useAnimate, useInView, useReducedMotion,
} from 'motion/react'
```

> Luôn dùng `motion/react` (v11+), không dùng `framer-motion`.

---

## Core Primitives

### motion component

```tsx
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.15, ease: 'easeOut' }}
/>
```

Bất kỳ HTML/SVG element nào: `motion.div`, `motion.button`, `motion.ul`, `motion.path`...

### Variants — ưu tiên cho state phức tạp

```tsx
const panel = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { staggerChildren: 0.05 } },
  exit:    { opacity: 0, x: -8 },
}
const item = {
  hidden:  { opacity: 0, x: -4 },
  visible: { opacity: 1, x: 0 },
}

<motion.ul variants={panel} initial="hidden" animate="visible" exit="exit">
  {items.map(i => <motion.li key={i.id} variants={item} />)}
</motion.ul>
```

Children kế thừa variant name từ parent — không cần repeat `initial`/`animate` trên từng child.

### AnimatePresence — bắt buộc cho exit animation

```tsx
<AnimatePresence initial={false}>
  {show && (
    <motion.div
      key="panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>
```

| Prop | Dùng khi |
|------|----------|
| `initial={false}` | Skip mount animation lần đầu (tốt cho shell layout) |
| `mode="wait"` | Chờ exit xong mới enter (page transitions) |
| `mode="popLayout"` | Pop element ra khỏi flow mượt (lists) |

---

## Transition Types

```tsx
// Tween (default)
transition={{ duration: 0.15, ease: 'easeOut' }}

// Spring — tự nhiên, không cần duration
transition={{ type: 'spring', stiffness: 400, damping: 30 }}

// Spring shorthand (v11)
transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.2 }}
```

**Spring presets:**

| Feel    | stiffness | damping |
|---------|-----------|---------|
| Snappy  | 400       | 30      |
| Default | 200       | 20      |
| Gentle  | 100       | 20      |
| Bouncy  | 200       | 10      |

**Easing strings:** `'easeOut'` `'easeInOut'` `'circOut'` `[0.16, 1, 0.3, 1]`

---

## Sidebar / Panel Slide Pattern

```tsx
<AnimatePresence initial={false}>
  {sidebarOpen && (
    <motion.div
      key="sidebar"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 'var(--sidebar-w)', opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeInOut' }}
      style={{ overflow: 'hidden', flexShrink: 0, display: 'flex' }}
    >
      <Sidebar />
    </motion.div>
  )}
</AnimatePresence>
```

> `display: 'flex'` để inner component stretch full height trong flex row.  
> `overflow: 'hidden'` để content không tràn khi width đang animate về 0.

---

## Layout Animations

```tsx
<motion.div layout />              // position + size
<motion.div layout="position" />   // chỉ position (rẻ hơn)
<motion.div layout="size" />       // chỉ size

// Shared element transition
<motion.div layoutId="tab-indicator" />  // cùng layoutId = morph giữa 2 element
```

**Dùng cho:** reorder list, expand card, tab underline, grid relayout.  
**Cost:** layout animations trigger paint — dùng `layout="position"` thay vì `layout` khi size ổn định.

---

## Gesture Props

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  whileFocus={{ outline: '2px solid var(--ring)' }}
/>
```

Transition trong gesture object = chỉ áp dụng cho lúc enter, outer transition cho lúc exit:

```tsx
whileHover={{ scale: 1.05, transition: { duration: 0.1 } }}
transition={{ duration: 0.2 }}  // exit back to rest
```

---

## useMotionValue + useTransform

```tsx
const x = useMotionValue(0)
const opacity = useTransform(x, [-100, 0, 100], [0, 1, 0])

<motion.div drag="x" style={{ x, opacity }} />
```

Dùng cho scroll-linked hoặc drag-linked animations — không gây re-render, chạy trên compositor thread.

### useSpring

```tsx
const x = useSpring(mouseX, { stiffness: 300, damping: 30 })
// x theo mouseX với spring physics — cursor follower, parallax
```

---

## Stagger Lists

```tsx
const list = {
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const item = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
}

<motion.ul initial="hidden" animate="visible" variants={list}>
  {items.map(i => <motion.li key={i.id} variants={item} />)}
</motion.ul>
```

Exit stagger ngược:
```tsx
exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } }
```

---

## useAnimate — Imperative Sequences

```tsx
const [scope, animate] = useAnimate()

const runSequence = async () => {
  await animate(scope.current, { opacity: 1 })
  await animate('li', { x: 0, opacity: 1 }, { delay: stagger(0.05) })
}
```

Tốt cho multi-step sequences, triggered animations (on click, on data load).

---

## Scroll Animations

```tsx
// Trigger khi vào viewport
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.6 }}
  transition={{ duration: 0.4 }}
/>

// Scroll-linked value
const { scrollY } = useScroll()
const headerOpacity = useTransform(scrollY, [0, 80], [1, 0])
```

---

## Drag

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: -200, right: 0 }}
  dragElastic={0.1}
  whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
  onDragEnd={(_, info) => {
    if (info.offset.x < -80) dismiss()
  }}
/>
```

---

## Performance Rules

| ✅ Dùng | ❌ Tránh |
|---------|---------|
| `x`, `y`, `scale`, `rotate`, `opacity` | `left`, `top`, `width`, `height` |
| `layout="position"` khi size ổn định | `layout` trên mọi list item |
| `useMotionValue` cho scroll/drag links | `useState` + `onScroll` cho cùng việc |
| Wrap chỉ phần cần animate | Wrap cả page tree trong `motion.div` |

Transform properties (`x/y/scale/rotate`) chạy trên compositor — không tốn layout/paint.

---

## Accessibility

```tsx
const reduced = useReducedMotion()

<motion.div
  animate={{ opacity: 1, y: reduced ? 0 : -8 }}
  transition={{ duration: reduced ? 0 : 0.2 }}
/>
```

---

## Electron Notes

- Motion chạy trong renderer process — không cần setup đặc biệt
- Tránh animate `width`/`height` trên component trigger IPC (resize spam main process)
- `initial={false}` trên `AnimatePresence` tránh flash-of-animation khi app boot
- Spring animations an toàn trên máy yếu — Electron's GPU process xử lý compositor animations hiệu quả

---

## Common Pitfalls

| Lỗi | Fix |
|-----|-----|
| `exit` không chạy | Bọc `<AnimatePresence>` |
| List item không animate out riêng lẻ | Thêm `key` unique cho từng child |
| `whileHover` transition quá chậm | Đặt `transition` bên trong `whileHover: { ..., transition: { duration: 0.1 } }` |
| Sidebar bị layout shift | Thêm `overflow: hidden` + `display: flex` lên motion wrapper |
| Spring không dừng | Tăng `damping` (thử 25–40) |
| `layoutId` bị flicker | Đảm bảo chỉ 1 instance mounted tại 1 thời điểm |
