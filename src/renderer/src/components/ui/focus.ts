/**
 * Viền focus bàn phím áp dụng cho các phần tử điều khiển, vẽ dưới dạng outline để không xung
 * đột với viền hoặc bóng của phần tử. `:focus-visible` tránh kích hoạt khi nhấn chuột. Khai báo
 * `outline-solid` rõ ràng vì `outline-none` đặt style về none trong Tailwind.
 */
export const focusRing =
  'outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus'

/** Viền focus tương tự cho khung chứa phần tử được focus (khung nhập liệu, trigger chọn). */
export const focusWithinRing =
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-focus'
