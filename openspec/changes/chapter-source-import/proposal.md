## Why

Kho đã lưu được văn bản và segment của chương (change `content-backup-provider`), nhưng không có đường nào đưa văn bản vào: chương mở ra vẫn là màn giữ chỗ. Luồng chính của Mira là "nhập raw → chia segment → AI dịch → soát"; không có bước đầu thì các bước sau (job dịch, hai mode soát) không có gì để làm. Đây là lát cắt nhỏ nhất của mốc M1 (S1.1 và S1.2 trong [scope](../../../docs/handbook/product/scope.md)) và là thứ đầu tiên người dịch phải làm với một chương.

## What Changes

- Thêm **nhập bản gốc cho một chương**: dán văn bản hoặc chọn tệp `.txt`/`.md`; tự nhận bảng mã (BOM, UTF-8, rồi các bảng mã cũ theo ngôn ngữ nguồn) và cho đổi tay; chuẩn hóa tối thiểu (xuống dòng, ký tự điều khiển) và **báo lại đã đổi gì**; xem trước trước khi lưu.
- Thêm **chia segment**: tách câu theo ngôn ngữ nguồn, giữ ranh giới đoạn và thoại (dấu mở thoại dính câu sau, dấu đóng dính câu trước), không tách sau từ viết tắt (Mr., Dr., TP., Th.S.…). Hành vi được mô tả bằng ví dụ và bộ hồi quy.
- Thêm **màn chương** thay màn giữ chỗ: chưa có bản gốc thì hiện hai lối nhập; đã có thì hiện bản gốc theo segment (chỉ đọc), số segment, và lối "Thay bản gốc" có xác nhận khi sẽ ảnh hưởng bản dịch hoặc liên kết.
- Không thêm kênh IPC: nhập dùng `text:get` và `text:save` đã có; việc giải mã, chuẩn hóa và chia câu là hàm thuần dùng chung, kiểm thử độc lập.

Không thuộc change này: nhập nhiều chương từ một tệp (`import-txt` trong [backlog](../../../docs/handbook/delivery/backlog.md) vẫn là minh họa), EPUB, người dùng chỉnh quy tắc tách, sửa văn bản (editor, S1.4–S1.6), job dịch, tự đặt tên chương từ dòng đầu.

## Capabilities

### New Capabilities

- `raw-import`: đưa văn bản bản gốc vào một chương — nguồn nhập, bảng mã, chuẩn hóa, xem trước, thay thế bản đã có, giới hạn.
- `segmentation`: chia văn bản thành segment theo ngôn ngữ nguồn, bất biến của kết quả, bộ hồi quy.
- `chapter-screen`: màn của một chương — trạng thái chưa có bản gốc, hiển thị bản gốc theo segment, đường quay về.

### Modified Capabilities

- `work-detail`: yêu cầu "Mở một chương" không còn là màn giữ chỗ mà là màn chương.

## Impact

- **Phụ thuộc change khác:** dùng bảng, `text:get`/`text:save` và `expectedRev` của `content-backup-provider`; cần archive change đó trước khi archive change này.
- **Code mới:** `src/shared/` (giải mã, chuẩn hóa, chia câu: hàm thuần), `src/renderer/src/features/chapter/` (màn chương, hộp thoại nhập), thay nhánh `chapter` của `App.tsx`.
- **Dữ liệu:** không đổi schema; ghi vào `chapter_text` và `segment` qua kênh có sẵn.
- **Phụ thuộc:** dự kiến không thêm dependency (xem design D4 về `sentencex`).
- **Tài liệu:** cập nhật `engineering/current-state.md`, `delivery/roadmap.md`, `delivery/backlog.md` và ghi quyết định chuẩn hóa vào handbook.
