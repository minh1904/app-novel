## Why

Màn chương hiện chỉ đọc: người dịch thấy bản gốc theo segment nhưng không sửa được một chữ nào, phải "Thay bản gốc" cả chương để sửa một lỗi chính tả. Mọi bước sau của luồng chính (soát bản dịch, mode Toàn văn, sửa liên kết) đều cần một editor mà **vùng segment sống sót qua chỉnh sửa**, nếu không thì mỗi lần sửa là mất ID segment và liên kết. Đây cũng là chỗ rủi ro lớn nhất của bộ công nghệ đã chọn ([ADR-003](../../../docs/handbook/decisions/0003-technology-stack.md)): CodeMirror 6 chạy trên `contenteditable`, còn Chromium từ bản 149 có lỗi mất lần gõ IME đầu tiên, và dịch giả của Mira gõ tiếng Việt có dấu (Telex/VNI) và Pinyin gần như liên tục. Phải biết điều này đúng trước khi dựng hai mode, nên editor được dựng thật ngay, không phải mã thử bỏ đi.

## What Changes

- Thêm **editor CodeMirror 6** cho văn bản một chương, thay danh sách segment chỉ đọc trên màn chương. Một `EditorState` duy nhất; thành phần không gắn cứng với bản gốc (nhận `side`), nhưng change này chỉ nối bản gốc vào màn chương.
- Thêm **ánh xạ segment qua chỉnh sửa**: mỗi chỉnh sửa dịch chuyển vùng UTF-16 của các segment, giữ nguyên ID, và có quy tắc rõ cho từng ca (gõ giữa segment, ở ranh giới, xóa trùm hai segment, dán nhiều dòng, thay thế vùng chọn). Việc chia lại segment ở vùng đã đổi chạy khi lưu hoặc khi rảnh, **không bao giờ trong lúc đang gõ IME**.
- Thêm **undo/redo một lịch sử duy nhất** gồm cả vùng segment và ID, để hai mode sau này dùng chung.
- Thêm **lưu bằng `text:save` với `expectedRev`**: lưu tay (Ctrl+S) kèm chỉ báo "chưa lưu"; xung đột revision **báo lỗi, giữ nguyên bản đang sửa, không ghi đè**; cảnh báo khi rời màn lúc còn thay đổi chưa lưu.
- Thêm **bảng ca thử IME** (Telex, VNI, Pinyin) do người dùng gõ tay trong Electron 44 và **đo hiệu năng** chương 5.000 segment; kết quả ghi vào tài liệu kiểm chứng. IME hỏng thì sửa tại CodeMirror hoặc đổi phiên bản Electron/Chromium, **không đổi sang `<textarea>`**.
- Hiển thị: số thứ tự segment ở lề từng dòng, ranh giới câu trong dòng nhìn thấy được nhưng nhẹ, phông chữ theo ngôn ngữ nguồn, tự xuống dòng.

Không thuộc change này: job dịch, mode "Từng câu" và mode "Toàn văn" hoàn chỉnh (change này chỉ có một khung soạn thảo toàn văn đủ để sửa bản gốc), xuất tệp, tự lưu định kỳ (`autosave`), đổi kho dữ liệu hay schema, sửa bản dịch trên giao diện (kho đã hỗ trợ, chưa nối giao diện), tách/gộp segment bằng lệnh thủ công.

## Capabilities

### New Capabilities

- `source-editor`: soạn thảo văn bản chương trong CodeMirror 6: hiển thị, lưu và xung đột revision, undo chung, thoát khi còn thay đổi chưa lưu, tương thích IME, hiệu năng, bàn phím.
- `segment-mapping`: quy tắc ánh xạ vùng segment qua chỉnh sửa và chia lại vùng đã đổi; các bất biến của kết quả.

### Modified Capabilities

- `chapter-screen`: yêu cầu "Hiển thị bản gốc theo segment" không còn chỉ đọc mà là editor; yêu cầu "Thay bản gốc" phải xử lý thay đổi chưa lưu. (Spec này đến từ change `chapter-source-import`, chưa archive.)

## Impact

- **Phụ thuộc change khác:** dùng màn chương, `prepareImport`/chia câu (`src/shared/segmenter.ts`) và `text:get`/`text:save` của `chapter-source-import` và `content-backup-provider`. Phải archive `chapter-source-import` trước khi archive change này, vì delta `chapter-screen` sửa spec của nó.
- **Code mới:** `src/renderer/src/features/editor/` (editor, trạng thái, ánh xạ segment: phần thuần đặt ở `src/shared/` để kiểm thử độc lập), thay `SegmentList` trong `ChapterScreen`.
- **Phụ thuộc mới:** `@codemirror/state`, `@codemirror/view`, `@codemirror/commands` (ADR-003 đã chọn).
- **Dữ liệu và IPC:** không đổi schema, không thêm kênh IPC; main process chỉ thêm xử lý hộp xác nhận khi đóng cửa sổ còn thay đổi chưa lưu. Dùng `text:get`/`text:save` có sẵn. Cần kiểm tra khi triển khai việc cắt liên kết của kho khi segment đổi hay biến mất (xem design, câu hỏi mở).
- **Quyết định đổi:** ADR-003 ghi `<textarea>` là điều kiện xem lại nếu IME hỏng trên CM6; chủ sản phẩm đã chốt **không** có đường lùi này. Cập nhật ADR-003 khi triển khai.
- **Tài liệu:** `engineering/current-state.md`, `delivery/roadmap.md` (gỡ điều kiện treo IME khi qua), `delivery/validation.md` (bảng ca IME và số đo), `delivery/backlog.md` (`autosave` nếu chưa có).
