## 1. Điều kiện phụ thuộc

- [ ] 1.1 Xác nhận change `provider-error-reasons` đã có kind cho lỗi cấu hình hay request không hợp lệ,
  tách khỏi `refused`. Có test trong `classifyError.test.ts` cho thấy một 400 "Invalid JSON schema" hay
  "Unknown name response_format" không ra `refused`. Chưa có thì dừng change này lại.
- [ ] 1.2 Ghi một bản ghi sống (`__fixtures__/live`) cho một lời gọi `gemini-2.5-flash` có
  `response_format` `json_schema` theo D1, trả HTTP 200 với `{"items":[…]}`, và một bản ghi cho schema bị
  400 nếu tái hiện được. Kiểm bằng cách mở tệp và thấy status cùng thân phản hồi.

## 2. Khả năng model

- [ ] 2.1 Thêm `structuredOutput` vào `ModelCapabilityView` và `capabilityFromCatalog` (đọc
  `ModelInfo.structuredOutput`, mặc định `false`); cho phép bảng `MODEL_CAPABILITY_OVERRIDES` thêm cờ
  này. Kiểm bằng test trong `modelCapability.test.ts`: model có cờ, model không có cờ, model không có
  trong catalog.
- [ ] 2.2 Viết hàm thuần `chooseOutputMode` theo D5. Kiểm bằng test cho bốn nhánh: chưa yêu cầu, không
  hỗ trợ, `extraBody` có `response_format`, bật.

## 3. Prompt và schema

- [ ] 3.1 Thêm `outputMode` cho `systemPrompt` và `buildTranslateRequest`/`buildRepairRequest`, mặc
  định `'array'`. Kiểm bằng test: chế độ `'array'` cho system prompt và `systemHash` trùng từng byte với
  bản trước; `'object'` cho hash khác và ví dụ hình dạng `{"items":[…]}`.
- [ ] 3.2 Xuất hằng schema `TRANSLATE_RESPONSE_SCHEMA` theo D1. Kiểm bằng test: schema chỉ dùng kiểu và
  từ khóa trong danh sách hỗ trợ của Google, và một phản hồi mẫu đúng hình dạng thỏa schema (kiểm bằng
  một bộ duyệt nhỏ trong test, không thêm phụ thuộc).

## 4. Transport

- [ ] 4.1 Thêm `responseFormat` vào `ChatRequest` và `buildChatBody` (ghi `response_format`, trước khi
  trải `extraBody`). Kiểm bằng test trong `openAiChatTransport.test.ts`: có thì xuất hiện trong body,
  không có thì body giữ nguyên như trước.
- [ ] 4.2 Thêm `options.responseFormat` cho `TranslationModelCaller.complete` và
  `OpenAiCompatibleProvider.complete`. Kiểm bằng test của provider với transport giả: giá trị đi tới body.

## 5. Parser và đối soát

- [ ] 5.1 Cho `parseTranslationResponse` nhận object `{"items":[…]}` trước, rồi mới tới đường mảng cũ
  (D4). Kiểm bằng test: object, object trong fence, object có lời dẫn, mảng cũ (kết quả không đổi), và
  toàn bộ test hiện có của `lenientParser` vẫn qua.
- [ ] 5.2 Thêm bộ đếm `duplicate` (tùy chọn) vào `ReconciliationResult`, giữ hành vi giữ bản đầu. Kiểm
  bằng test của `translateReconcile`: hai mục cùng id cho `duplicate` bằng 1 và `matched` lấy bản đầu.

## 6. Lõi dịch

- [ ] 6.1 Cho `executeTranslateBatch` nhận `outputMode`, gửi `responseFormat` khi là `'object'`, và trả
  `outputMode`/`outputModeReason` trong `request`. Kiểm bằng test của `translationCore` với caller giả:
  chế độ tắt thì không có `responseFormat` trong lời gọi nào.
- [ ] 6.2 Cài đặt cách rơi về theo D6: lỗi cấu hình ở lượt chính thì gửi lại một lần ở chế độ `'array'`,
  kết quả ghi `'object→fallback'`. Kiểm bằng test: 400 cấu hình thì có đúng một lời gọi thêm không schema;
  `finishReason: 'filter'` thì không rơi về mà đi vào chia đôi; lỗi `refused` không xuất hiện trên kết quả
  của trường hợp 400 cấu hình.
- [ ] 6.3 Kiểm hỏi lại và chia đôi ở chế độ schema. Kiểm bằng test: phản hồi đúng schema mà thiếu một id
  thì có một lượt hỏi lại mang `responseFormat`; lượt chia đôi giữ chế độ của lô.

## 7. Nơi gọi và dấu vết

- [ ] 7.1 Nối `chooseOutputMode` vào `paragraphTranslation.runBatch` (cờ cấu hình mặc định `false`) và
  chuyển các lô sau sang `'array'` khi một lô đã rơi về. Kiểm bằng test của `paragraphTranslation`: mặc
  định không lô nào có schema; một lô rơi về thì các lô sau không gửi schema.
- [ ] 7.2 Ghi `outputMode`, `outputModeReason` và số lô đã rơi về vào trace đề xuất. Kiểm bằng test của
  proposal trace: trường có mặt và đúng giá trị.

## 8. Lab

- [ ] 8.1 Thêm cách bật chế độ schema cho một biến thể trong `scripts/lab/cli.ts` (cờ `--schema` hoặc
  hậu tố nhãn) và ghi chế độ vào `runs.jsonl`. Kiểm bằng cách chạy lệnh dịch với `MockProvider` (không
  tốn phí) và thấy trường mới trong bản ghi.
- [ ] 8.2 Thêm cột chế độ đầu ra và các chỉ số cấu trúc (thiếu, thừa, lặp, số đoạn phải hỏi lại) vào báo
  cáo và `history.md` sinh tự động. Kiểm bằng cách sinh lại `history.md` từ registry và thấy cột mới; các
  lần chạy cũ hiện `text`.

## 9. Kiểm toàn bộ và tài liệu

- [ ] 9.1 Chạy `node scripts/check.mjs` và thấy typecheck, test và lint đều có bằng chứng đã chạy và đều
  qua.
- [ ] 9.2 Cập nhật `docs/modules/context/prompt-system.md` (mục "Còn để sau": structured output đang thử,
  mặc định tắt) và ghi kế hoạch đo vào `docs/modules/measurement/running-experiments.md`. Kiểm bằng cách
  đọc lại hai trang và thấy trạng thái ghi đúng là "đề xuất / đang thử", không phải "đã triển khai mặc
  định".
- [ ] 9.3 (Sau khi có báo cáo đo lặp của `lab-completion-quality-report`) Chạy thử nghiệm so `schema` với
  `text` trên tập chương cố định, ghi kết quả và quyết định của cổng vào tài liệu module. Kiểm bằng một
  mục lịch sử đo có cả hai biến thể và một dòng quyết định có số đo dẫn kèm.
