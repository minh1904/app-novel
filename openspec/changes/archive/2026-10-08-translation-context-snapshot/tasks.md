## 1. Lưu trữ

- [x] 1.1 Thêm migration v9 tạo bảng `translate_run_context` trong `workSchema.ts`, thêm `__fixtures__/work-v9.schema.sql`; kiểm bằng `workSchema.test.ts`, `schemaSnapshot.test.ts` và test migrate từ tệp v8
- [x] 1.2 Viết module storage `translateRunContext.ts` (tạo, đọc theo `run_key`, dọn mồ côi quá 30 ngày không có proposal); test tạo/đọc/cascade khi xóa chương/dọn mồ côi

## 2. Chụp và dựng prompt

- [x] 2.1 Viết hàm chụp ngữ cảnh (glossary hiệu lực đã duyệt, cặp và nhân vật lọc theo cả chương, register) với JSON chuẩn hóa và hash; test cùng dữ liệu cho cùng hash, mục chờ duyệt không vào bản chụp, sửa nhân vật không xuất hiện trong chương không đổi hash
- [x] 2.2 `ParagraphTranslator.plan()` tạo bản chụp và trả `plan.context` (hash, số mục); cập nhật `ParagraphTranslationPlan` trong `aiTranslateProposals.ts`; test plan
- [x] 2.3 `runBatch()` dựng `TranslatePromptContext` từ bản chụp thay vì đọc kho; không có bản chụp thì trả `conflict` và không gọi model; test với provider ghi lại request: sửa glossary giữa hai lô thì lô sau vẫn gửi mục cũ
- [x] 2.4 `runBatch()` so bản chụp sống với bản chụp và trả `contextChanged`; test có đổi/không đổi

## 3. Trace và tái dựng

- [x] 3.1 Mở rộng trace lô (`snapshot`, `characters`, `previous`, `register`), giữ khóa cũ; test đề xuất cũ vẫn đọc và duyệt được
- [x] 3.2 Viết `rebuildTranslateRequest(trace, snapshot, units)` và test hash request dựng lại trùng `contextHash` đã ghi, gồm lô có glossary, xưng hô, nhân vật và đoạn liền trước

## 4. Giao diện

- [x] 4.1 `useParagraphTranslate.ts` hiện thông báo khi lô trả `contextChanged` (dùng ngữ cảnh lúc bắt đầu, lập kế hoạch lại để áp dụng); hộp kế hoạch hiện số mục bản chụp; kiểm bằng test hook/component hiện có và chạy app thử một lượt

## 5. Lab

- [x] 5.1 `scripts/lab/cli.ts` ghi `contextHash` theo chương vào bản ghi lần chạy và `context-<chapter>.json` vào thư mục lần chạy; báo cáo so sánh nêu chương có hash khác; kiểm bằng một lần chạy mock của Lab

## 6. Hoàn tất

- [x] 6.1 Cập nhật `docs/modules/context/prompt-system.md` và `docs/modules/measurement/running-experiments.md` mô tả bản chụp và trace (tiếng Việt, đánh dấu đã triển khai)
- [x] 6.2 Chạy `node scripts/check.mjs` và xác nhận typecheck, test hai pha và lint đều có bằng chứng đã chạy
