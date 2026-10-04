## 1. Mốc L0 · Làm sạch đường đo và runner dịch

- [x] 1.1 Cập nhật `scripts/bench/translate.run.ts` theo đúng API hiện hành (`LibraryStore.create`, `createChapter`, `saveText`, `ChapterTranslator.plan/runBatch` nhận object) và sửa lỗi import module trong `scripts/bench/fixtures.ts`. Kiểm tra bằng lệnh typecheck độc lập cho scripts.
- [x] 1.2 Bổ sung bài kiểm thử chạy runner dịch với mock provider offline, bảo đảm pipeline dịch trong runner hoạt động ổn định và không phụ thuộc mạng hay API key.
- [x] 1.3 Tạo bộ test case cho các hợp đồng đối soát Lõi dịch: ánh xạ ID tạm `[n]`, phản hồi 1–1, thiếu ID, thừa ID, đảo thứ tự ID, và đơn vị rỗng.

## 2. Mốc L1 · Tách một đường dịch (Translation Core)

- [x] 2.1 Xây dựng module `src/main/services/ai/translate/` với các kiểu dữ liệu cốt lõi (`TranslateUnit`, `BatchPlan`, `TranslateResult`, `TranslateCoreOptions`).
- [x] 2.2 Cài đặt bộ phân tích cú pháp khoan dung (`lenientParser`) xử lý codeblock markdown, dấu phẩy thừa, và JSON không chuẩn kèm unit tests.
- [x] 2.3 Cài đặt bộ đối soát ID (`reconciler`) ánh xạ ngược từ ID tạm `[n]` về ID gốc và kiểm tra tính toàn vẹn kèm unit tests.
- [x] 2.4 Cài đặt `planner` chia lô theo trần token và trần số đơn vị, hỗ trợ cắt đoạn quá dài.
- [x] 2.5 Nối `ChapterTranslator` với Lõi dịch thông qua adapter, bảo toàn việc bảo vệ các dòng đã dịch hoặc người dùng đã sửa.

## 3. Mốc L2 · Vòng sửa lỗi và phân định lỗi

- [x] 3.1 Cài đặt cơ chế hỏi lại (repair) đúng các ID bị thiếu hoặc phản hồi lỗi một lần duy nhất, giữ lại kết quả của các ID thành công.
- [x] 3.2 Tách biệt ranh giới xử lý lỗi: lỗi hạ tầng do gateway retry/cooldown, lỗi nội dung do lõi dịch xử lý sửa lỗi.
- [x] 3.3 Viết bài kiểm tra tích hợp với mock provider cho các kịch bản lỗi: thiếu ID một phần, hỏng JSON, timeout, hủy giữa chừng.

## 4. Mốc L3–L6 · Prompt, tham số và nghiệm thu

- [x] 4.1 Cập nhật builder prompt có version/hash, hỗ trợ các tầng ngữ cảnh và chỉ dẫn theo từng ngôn ngữ nguồn.
- [x] 4.2 Ghi nhận tham số thực gửi (thinking, temperature, usage) và bảo vệ secret trong runner.
- [x] 4.3 Kiểm tra toàn bộ dự án bằng `node scripts/check.mjs --build` và cập nhật tài liệu handbook/changelog.
