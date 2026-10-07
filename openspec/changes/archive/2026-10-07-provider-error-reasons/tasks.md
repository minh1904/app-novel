## 1. Phân loại lỗi nhà cung cấp

- [x] 1.1 Thêm `invalid_request` vào `ProviderErrorKind` và `RETRYABLE` (`types.ts`), vào `TranslateErrorKind` và `ChatErrorKind`. Xử lý mọi `switch` và `Record` mà typecheck báo; `node scripts/check.mjs` xanh ở bước typecheck.
- [x] 1.2 Đổi `kindForStatus` để 4xx còn lại thành `invalid_request`, thêm `requestProblem: 'too_large'` cho 413 và 400 vượt giới hạn token. Test trong `classifyError.test.ts` cho 400 thường, 400 `API_KEY_INVALID` (vẫn `auth`), 413 và 400 vượt token.
- [x] 1.3 Thêm bảng dấu hiệu chặn an toàn (D2) để nâng 4xx thành `refused` kèm lý do. Mỗi dấu hiệu có một test. Test thêm rằng một thân 400 không có dấu hiệu thì ra `invalid_request`.
- [x] 1.4 Test gateway và keyPool: `invalid_request` không đổi khóa, không đóng băng, không đánh dấu khóa sai, không thử lại (`gateway.test.ts`, `keyPool.test.ts`, `retryPolicy.test.ts`).

## 2. Tham số đã gửi trong thông báo

- [x] 2.1 Thêm `sent` vào `ProviderErrorDetails` và điền từ `Generation` trong `openAiChatTransport.ts`: chỉ tên khóa `extra_body`, không header. Test: lỗi 400 mang `sent` đúng, và chuỗi khóa API không xuất hiện ở đâu.
- [x] 2.2 Viết hàm thuần `describeInvalidRequest` dựng câu thông báo tiếng Việt. Test với mức thinking "off", với `extra_body` và với request quá lớn.

## 3. Lý do lọc theo đoạn

- [x] 3.1 `mapFinishReason` trả nhóm và chuỗi gốc theo bảng D4, cho cả đường thường và đường stream. Test cho `content_filter`, `content_filter: PROHIBITED_CONTENT`, `: SAFETY`, `: RECITATION`, `: SPII`, `: BLOCKLIST` và chuỗi lạ.
- [x] 3.2 `splitFiltered` và `translateCoreBatch` trả `refusals` (id, nhóm, chuỗi gốc); `refusedIds` khớp với `refusals`. Đoạn qua được ở vòng không kèm ngữ cảnh thì không còn lý do. Test trong `translationCore.test.ts` với hai đoạn bị chặn vì hai lý do khác nhau.
- [x] 3.3 Thông báo lô đếm theo nhóm lý do, và `recitation` có câu riêng. Test câu thông báo.
- [x] 3.4 `paragraphTranslation.ts` đưa `refusals` vào kết quả lô và hồ sơ đề xuất. Kiểm rằng hồ sơ cũ không có trường này vẫn đọc được: test đọc một đề xuất fixture cũ.

## 4. Chính sách lỗi theo tác vụ

- [x] 4.1 Viết `src/main/services/ai/errorPolicy.ts` theo bảng D5. Test bảng: mỗi loại lỗi × tác vụ cho ra kết quả mong đợi.
- [x] 4.2 Thêm `haltsRun` vào `TranslateFailure`, do `paragraphTranslation.ts` điền từ chính sách. Test: lô có đoạn bị lọc cho `haltsRun: false`, `invalid_request` cho `true`.
- [x] 4.3 `useParagraphTranslate.ts` bỏ `STOPS` và đọc `haltsRun`. Test hook hoặc test luồng: lô 1 có đoạn bị lọc thì lô 2 vẫn chạy; lô 1 `invalid_request` thì dừng.
- [x] 4.4 `chatService.ts` đặt `retryable` theo chính sách. `useAiChat.ts:387` dùng loại lỗi thật thay vì gán cứng `refused`. Test trong `chatService.test.ts` và `aiChatHandlers.test.ts`.
- [x] 4.5 `connectionService.toStorageError` đổi `invalid_request` thành `validation`, kèm thông điệp nhà cung cấp. Test trong `connectionService.test.ts`.

## 5. Mức thinking hợp lệ

- [x] 5.1 Viết `checkThinkingLevel` trong `modelCapability.ts`, gồm cả `nearest`. Test: `gemini-3.5-flash-lite` + `off` cho ra không hợp lệ, gợi ý `minimal`; `gemini-3.5-flash` + `off` hợp lệ nhờ dòng đo; model ngoài catalog luôn hợp lệ.
- [x] 5.2 `connectionService.updateEntry` từ chối mức không hợp lệ. Test qua `aiConnectionHandlers.test.ts`.
- [x] 5.3 Kiểm mức trước khi gọi ở đường dịch và chat; ném `invalid_request` có `sent` và không gọi mạng. Test bằng transport giả, kiểm rằng không có request nào được gửi.
- [x] 5.4 `scripts/lab/cli.ts` kiểm mức sau `addModels` và dừng biến thể không hợp lệ trước lời gọi đầu tiên, không ghi lần chạy vào registry. Kiểm bằng cách chạy Lab với `gemini-3.5-flash-lite` biến thể `-nothink` ở chế độ mock (hoặc khô), thấy thông báo và không có dòng registry mới.
- [x] 5.5 Form cài đặt model hiện thông báo khi mức đang lưu không còn hợp lệ, nêu mức gợi ý. Test trong `modelSettingsForm.test.ts`.

## 6. Kiểm tổng và tài liệu

- [x] 6.1 Cập nhật `docs/modules/context/content-refusals.md` (mục 3–5: lý do theo đoạn đã triển khai, đoạn bị lọc không dừng lượt, `invalid_request`) và phần trạng thái. Đổi line ending về CRLF.
- [x] 6.2 Chạy `node scripts/check.mjs`: typecheck node và web, test hai pha, lint đều có bằng chứng đã chạy và xanh.
