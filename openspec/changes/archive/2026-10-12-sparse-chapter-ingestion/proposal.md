## Why

Khi người dùng nhập hoặc tải chương từ nguồn raw (như Kakuyomu hoặc thư mục cục bộ), họ thường chỉ tải một số chương chọn lọc (ví dụ: chương 1, chương 5, chương 10) hoặc tải các chương không theo thứ tự thời gian (chương 10 tải trước, chương 1 tải sau).

Hiện tại, hệ thống gặp các hạn chế và xung đột kiến trúc:
1. **Lệch thứ tự khi nạp thưa:** Luồng tải chương (`sources:catalog:download`) luôn chèn chương mới vào cuối bảng `chapter` (`position = count(*)`), khiến việc tải chương 1 sau chương 10 làm đảo lộn thứ tự đọc/dịch.
2. **Mâu thuẫn giữa vị trí danh sách (`position`) và số hiệu tác phẩm:** Mira gán nhãn `chapter.number = position + 1` cho mọi hiển thị, dẫn tới việc tải lẻ chương 10 thì bị gọi thành "Chương 1", tải thêm chương 5 thì chương 10 bị đổi tên thành "Chương 2".
3. **Thuật toán so khớp thô sơ:** `matching.ts` sử dụng `chapter.number` để match với số trích xuất từ tiêu đề, gây ra hiện tượng ghép nhầm bản raw khi tác phẩm có khoảng khuyết (gaps). Đồng thời regex trích xuất chưa chuẩn hóa số full-width tiếng Nhật (`１０`) và dễ bắt nhầm số ngẫu nhiên trong tiêu đề.
4. **Tải lẻ tẻ và phụ thuộc DOM phân trang:** Giao diện danh mục chỉ hỗ trợ bấm lẻ từng chương một và phân trang 50 mục/trang, gây bất tiện lớn khi muốn tải một tập (arc) 30–50 chương.

Thay đổi này thiết lập cơ chế nạp chương thưa (sparse ingestion) toàn diện: bảo toàn trật tự tương đối hai chiều (predecessor/successor), tải hàng loạt/theo dải qua job nền, so khớp bền vững và hiển thị khoảng khuyết trực quan.

## What Changes

- **Chèn chương tương đối hai chiều (`targetPosition`):** Xác định vị trí chèn chính xác dựa trên cả tiền nhiệm $P$ (`ordinal_key < X`) và kế nhiệm $S$ (`ordinal_key > X`) đã nạp trước đó, bảo vệ các chương dẫn nhập thủ công không bị đè vị trí.
- **Tải chọn lọc & Tải theo dải qua backend:** Hỗ trợ nhập dải chương (ví dụ `1, 5, 10-25`) xử lý trực tiếp trên database `source_catalog_item` ở Main process, tải tuần tự tuân thủ network policy (1 req/giây) và báo cáo tiến độ về Renderer qua IPC event.
- **So khớp đa nguồn bền vững (`matching.ts`):** 
  - Chuẩn hóa chữ số full-width tiếng Nhật sang half-width (`１` -> `1`).
  - Siết chặt regex trích xuất số chương (bắt buộc tiền tố hoặc neo đầu chuỗi) tránh bắt nhầm năm/số lượng.
  - Bổ sung tầng fallback theo thứ tự tương đối khi tiêu đề không chứa số.
- **Hiển thị khoảng khuyết & Làm sạch số chương:**
  - Ẩn tiền tố số `{chapter.number}.` khi tiêu đề đã tự định danh số chương rõ ràng trên Sidebar và màn hình chi tiết.
  - Hỗ trợ nhảy chương (Jump) linh hoạt theo cả số thứ tự danh sách lẫn số chương thực tế trong tiêu đề.
  - Hiển thị dải phân cách chỉ báo khoảng khuyết (Gap Indicator) trực quan giữa các chương cách nhau.
- **Điều hướng thông minh trong Editor:** Thêm phím tắt chuyển chương kế tiếp / trước đó (`Alt+Down` / `Alt+Up`). Khi phát hiện có khoảng khuyết mà nguồn raw có chương liền kề chưa tải, hiển thị lựa chọn cho người dùng tải & mở chương liền kề hoặc bỏ qua để nhảy tới chương có sẵn tiếp theo.

## Capabilities

### New Capabilities
- `sparse-chapter-ingestion`: Quản lý nạp chương thưa từ catalog raw, chèn tương đối hai chiều, hỗ trợ tải theo dải qua job nền, so khớp bền vững và điều hướng qua khoảng khuyết.

### Modified Capabilities
*(Không có spec hiện hữu nào bị thay đổi yêu cầu).*

## Impact

- **Backend & Storage:**
  - `src/main/infra/storage/chapterFile.ts`: Bổ sung `insertChapterAt(db, id, position, title, now)`.
  - `src/main/services/library/library.ts`: Bổ sung `createChapterAt(workId, position, title)`.
  - `src/main/ipc/handlers/sources.ts`: Cập nhật `sources:catalog:download` tính toán `targetPosition` hai chiều. Thêm handler `sources:catalog:download-range` / `download-bulk` báo cáo tiến độ qua sink/event.
  - `src/main/sources/matching.ts`: Chuẩn hóa số full-width, siết chặt regex số chương và bổ sung fallback an toàn.
  - `src/main/sources/kakuyomu/parser.ts`: Chuẩn hóa chỉ số `order` 1-based đồng nhất.
- **Renderer & UI:**
  - `SourcesArea.tsx`: Thêm ô nhập dải chương, nút tải hàng loạt và thanh tiến độ tải nền.
  - `ChapterNavSidebar.tsx` & `ChaptersArea.tsx`: Làm sạch tiền tố số lặp, hỗ trợ jump số thông minh, hiển thị Gap Indicator.
  - `ChapterWorkspace.tsx`: Hỗ trợ phím tắt chuyển chương kèm hộp thoại xác nhận khi gặp khoảng khuyết.
