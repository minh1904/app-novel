/**
 * Chuẩn hóa địa chỉ endpoint URL về dạng base URL.
 *
 * Người dùng thường dán toàn bộ URL (`https://api.example.com/v1/chat/completions`) thay vì base URL.
 * Việc nối thêm `/chat/completions` vào URL đó sẽ gây trùng lặp đường dẫn và lỗi 404.
 * Hàm này loại bỏ phần đuôi `/chat/completions` và các dấu gạch chéo ở cuối.
 */
export function normalizeBaseUrl(url: string): string {
  return url
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/+$/, '')
}
