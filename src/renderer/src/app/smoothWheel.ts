/**
 * Cuộn mượt cho con lăn chuột có khấc. Chromium trên Windows di chuyển vùng cuộn ~100px mỗi khấc gần như ngay lập tức,
 * tạo cảm giác bị giật khung hình trong văn bản dài; hàm này trượt êm quãng đường đó qua nhiều khung hình animation.
 *
 * Chỉ áp dụng cho con lăn chuột rời: bàn di chuột (touchpad) đã có quán tính tự nhiên riêng nên không can thiệp.
 * Bỏ qua khi người dùng chọn giảm chuyển động, nhấn giữ Ctrl (thu phóng) hoặc cuộn ngang.
 */

/** Tỷ lệ quãng đường còn lại di chuyển ở mỗi khung hình: 0.2 dừng hẳn sau khoảng 250ms ở 60fps. */
const EASE = 0.2

/** Mỗi khấc lăn chuột trả về giá trị là bội số của 120 trong thuộc tính cũ wheelDelta. */
export function isMouseWheel(
  event: Pick<WheelEvent, 'deltaMode' | 'deltaY'> & { wheelDeltaY?: number }
): boolean {
  if (event.deltaMode !== 0) return true
  const legacy = event.wheelDeltaY
  if (legacy === undefined || legacy === 0) return false
  return legacy % 120 === 0
}

/** Quy đổi delta theo đơn vị dòng hoặc trang sang pixel tương tự cơ chế cuộn của Chromium. */
export function deltaPixels(
  event: Pick<WheelEvent, 'deltaMode' | 'deltaY'>,
  pageHeight: number
): number {
  if (event.deltaMode === 1) return event.deltaY * 40
  if (event.deltaMode === 2) return event.deltaY * pageHeight
  return event.deltaY
}

interface Scrollable {
  scrollTop: number
  readonly scrollHeight: number
  readonly clientHeight: number
}

/** Kiểm tra xem `element` có thể tiếp tục cuộn theo hướng của `delta` hay không. */
export function canScroll(element: Scrollable, delta: number): boolean {
  const max = element.scrollHeight - element.clientHeight
  if (max <= 1) return false
  return delta < 0 ? element.scrollTop > 0 : element.scrollTop < max - 1
}

function scrollParent(start: EventTarget | null, delta: number): HTMLElement | null {
  let node = start instanceof Element ? start : null
  while (node) {
    if (node instanceof HTMLElement) {
      const overflow = getComputedStyle(node).overflowY
      if ((overflow === 'auto' || overflow === 'scroll') && canScroll(node, delta)) return node
    }
    node = node.parentElement
  }
  return null
}

interface Glide {
  element: HTMLElement
  target: number
  /** Vị trí cuộn được thiết lập ở khung hình trước; nếu khác biệt nghĩa là người dùng đã cuộn bằng cách khác. */
  last: number
  frame: number
}

/** Đăng ký trình lắng nghe sự kiện lăn chuột mượt trên `doc`; trả về hàm hủy đăng ký. */
export function installSmoothWheel(doc: Document = document): () => void {
  const view = doc.defaultView
  if (!view) return () => undefined
  const reduce = view.matchMedia('(prefers-reduced-motion: reduce)')
  let glide: Glide | null = null

  function stop(): void {
    if (glide) view?.cancelAnimationFrame(glide.frame)
    glide = null
  }

  function step(): void {
    if (!glide) return
    const { element } = glide
    if (Math.abs(element.scrollTop - glide.last) > 1) {
      stop()
      return
    }
    const remaining = glide.target - element.scrollTop
    const next = Math.abs(remaining) < 0.5 ? glide.target : element.scrollTop + remaining * EASE
    element.scrollTop = next
    glide.last = element.scrollTop
    // Đã chạm mép biên cuộn trước khi tới đích; kết thúc quá trình trượt.
    if (next === glide.target || Math.abs(element.scrollTop - next) > 1) {
      stop()
      return
    }
    glide.frame = view!.requestAnimationFrame(step)
  }

  function onWheel(event: WheelEvent): void {
    if (event.defaultPrevented || event.ctrlKey || reduce.matches) return
    if (event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
    if (!isMouseWheel(event as WheelEvent & { wheelDeltaY?: number })) return
    const delta = deltaPixels(event, view!.innerHeight)
    const element = scrollParent(event.target, delta)
    if (!element) return
    event.preventDefault()

    const max = element.scrollHeight - element.clientHeight
    const from = glide && glide.element === element ? glide.target : element.scrollTop
    const target = Math.min(max, Math.max(0, from + delta))
    if (glide && glide.element === element) {
      glide.target = target
      return
    }
    stop()
    glide = { element, target, last: element.scrollTop, frame: 0 }
    glide.frame = view!.requestAnimationFrame(step)
  }

  doc.addEventListener('wheel', onWheel, { passive: false, capture: true })
  return () => {
    stop()
    doc.removeEventListener('wheel', onWheel, { capture: true })
  }
}
