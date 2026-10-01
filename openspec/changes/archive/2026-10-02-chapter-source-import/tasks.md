## 1. Hàm thuần: giải mã, chuẩn hóa, chia câu

- [x] 1.1 `rawText.ts`: `detectEncoding` (BOM → UTF-8 nghiêm ngặt → danh sách theo ngôn ngữ nguồn → ít U+FFFD nhất), `decodeRaw(bytes, encoding)`, danh sách bảng mã hỗ trợ; test bằng byte thật của UTF-8/UTF-16 (BOM và không BOM), GB18030, Big5, Shift_JIS, EUC-JP, Windows-1252, và ca đoán sai có cảnh báo
- [x] 1.2 `normalizeRaw` trả `{ text, changes }` (BOM, xuống dòng CRLF/CR/U+2028/2029, ký tự điều khiển, cắt hai đầu); test từng loại, giữ U+3000/khoảng trắng đầu dòng/dấu câu, không đổi NFC/NFD, và báo cáo "giữ nguyên" khi không đổi gì
- [x] 1.3 `segmenter.ts` + `segmenterData.ts`: tách dòng → `Intl.Segmenter` → sửa dấu mở thoại, gộp sau từ viết tắt (Anh/Việt, danh sách là dữ liệu), cắt khoảng trắng; trả vùng UTF-16; đánh dấu segment dài > 1.000
- [x] 1.4 Bộ hồi quy `segmentation` cho en/zh-Hans/zh-Hant/ja gồm mọi ví dụ trong spec (thoại Nhật, thoại nhiều câu, chấm lửng, số thập phân, Mr./Dr., TP./Th.S., viết tắt cuối dòng, dòng không dấu, tiêu đề Markdown); chạy thêm `sentencex` trên cùng bộ chỉ để so (không thêm vào dependency) và ghi kết quả so sánh vào design
- [x] 1.5 Test bất biến ngẫu nhiên: không mất/lặp chữ không-khoảng-trắng, vùng sắp xếp không chồng, không cắt cặp surrogate, xác định; đo 300.000 ký tự < 500 ms

## 2. Nhập và lưu

- [x] 2.1 Hàm `prepareImport(bytes|text, sourceLang, encoding?)` ghép giải mã → chuẩn hóa → chia câu và trả mọi thứ màn xem trước cần (văn bản, bảng mã, thay đổi, segment, cảnh báo, từ chối: rỗng, > 8 MB, > giới hạn kho, > 50.000 segment); test các từ chối
- [x] 2.2 `useImport`: đọc `text:get` lấy `rev`, `text:save` với `expectedRev`, phân biệt lỗi xung đột/quá dài/ghi lỗi, giữ trạng thái để thử lại; test với kho thật qua handler: lưu rồi đóng mở lại cho cùng văn bản và segment, xung đột revision, quá dài
- [x] 2.3 Test thay bản gốc: chương có bản dịch và liên kết → bản dịch nguyên vẹn, segment nguồn mới, liên kết ở `needs_review`, segment dịch giữ ID

## 3. Màn chương

- [x] 3.1 `ChapterScreen` thay nhánh `chapter` trong `App.tsx`: tiêu đề/số chương, đường dẫn và "Về tác phẩm"; `useChapterScreen` nạp tác phẩm, chương và văn bản nguồn; bỏ `PendingScreen` khỏi nhánh này
- [x] 3.2 Trạng thái chưa có bản gốc: giải thích + hai lối "Dán văn bản" và "Chọn tệp .txt / .md" (kéo thả cũng được)
- [x] 3.3 Hiển thị bản gốc theo segment: số segment/ký tự, hàng có số thứ tự, khoảng cách theo đoạn, phân trang 200 hàng, phông chữ theo `lang`
- [x] 3.4 "Thay bản gốc" với hộp xác nhận nêu hệ quả (bản dịch giữ, liên kết cần kiểm tra, gợi ý sao lưu khi `hasTarget`), nối với sao lưu có sẵn
- [x] 3.5 Sau khi nhập/thay: hiển thị ngay bản mới, làm mới cờ trong thư viện bằng `works:get` + `applyWork`

## 4. Hộp thoại nhập

- [x] 4.1 Hộp thoại ba trạng thái (Nhập → Xem trước → Đang lưu): ô dán, chọn tệp/kéo thả, bảng mã có danh sách chọn lại, thống kê, danh sách chuẩn hóa, mẫu đầu/cuối, cảnh báo U+FFFD và segment dài
- [x] 4.2 Hủy ở mọi bước không đổi dữ liệu; lỗi lưu giữ xem trước để thử lại; từ chối hiện lý do bằng lời dễ hiểu
- [x] 4.3 Xem trước chỉ tính khi bấm "Xem trước" hoặc đổi bảng mã, không tính theo từng phím, nên không cần `useDeferredValue`/`startTransition`; đo trong Electron thật cho thấy 140 ms với 300.000 ký tự (xem design, "Số đo trong Electron thật"). Đã kiểm tra bàn phím, focus, `role` và 940 px

## 5. Kiểm chứng và tài liệu

- [x] 5.1 Chạy trong Electron thật: nhập từ tệp mẫu UTF-8 (BOM và không), UTF-16, GB18030, Big5, Shift_JIS; dán 300.000 ký tự (đo xem trước); chương 5.000 segment (đo mở/cuộn/đổi trang); thay bản gốc khi đã có bản dịch; chụp màn hình các trạng thái chính; ghi số đo vào design
- [x] 5.2 Kiểm tra bằng bàn phím toàn bộ luồng nhập, xem trước, thay, hủy
- [x] 5.3 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; cập nhật `engineering/current-state.md`, `delivery/roadmap.md`, `delivery/backlog.md` (thêm `chapter-title-from-text`, `import-whole-volume`, `segmentation-rules-editor`; `import-txt` nhiều chương vẫn là minh họa), và ghi quy tắc chuẩn hóa vào handbook
