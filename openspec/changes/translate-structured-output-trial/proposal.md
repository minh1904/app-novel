## Why

Lõi dịch nhận một mảng JSON `{id, dst}` mà model tự viết theo chỉ dẫn trong prompt, rồi dựa vào parser
khoan dung (bỏ fence, sửa dấu phẩy thừa, quét regex) và đối soát id để cứu phản hồi lệch. Lab đã thấy
model gộp đoạn làm thiếu id (chương 10, `gemini-3.5-flash-lite`, 2026-10-07) và từng gộp/tách dòng
khi dịch cả chương một lô. Gemini nhận structured output qua chính endpoint tương thích OpenAI Mira
đang dùng (`response_format` với `json_schema`, bản beta), nên có thể **thử** ràng buộc định dạng mà
không cần adapter mới. Chưa có số đo nào cho thấy cách này giảm lỗi cấu trúc trên dữ liệu của Mira, vì
vậy change này chỉ dựng đường thử và cổng quyết định, không đổi mặc định của sản phẩm.

## What Changes

- Thêm chế độ đầu ra có schema cho lượt dịch chính, lượt chia lô khi bị lọc và lượt hỏi lại: request
  mang `response_format` kiểu `json_schema`, phản hồi là object `{"items":[{"id","dst",…}]}` vì root
  của schema phải là object. Khóa xưng gọi (`speaker_to_listener`, `self_ref`, `addr_ref`) là tùy chọn.
- Chế độ này **mặc định tắt** trong sản phẩm. Nó chỉ bật khi model được ghi nhận là hỗ trợ structured
  output và cấu hình model không tự đặt `response_format` trong `extraBody`. Lab có biến thể riêng để
  bật nó.
- Parser nhận cả hai dạng: object `{"items":[…]}` và mảng cũ. Lần chạy cũ và model không hỗ trợ schema
  vẫn đọc được như trước.
- Giữ nguyên đối soát tập id, lượt hỏi lại đúng id thiếu hoặc rỗng, và chia đôi lô khi bị bộ lọc chặn.
  Schema không thay cho bất kỳ bước nào trong số đó.
- Nhà cung cấp từ chối schema (HTTP 400 vì schema hoặc tham số) thì lô đó gửi lại **một lần** không có
  schema. Lần rơi về được ghi vào trace và báo cáo Lab; nó không được báo thành "nhà cung cấp từ chối
  nội dung".
- Trace đề xuất và bản ghi Lab ghi chế độ đầu ra đã dùng (`schema`, `schema→fallback`, `text`) để so
  sánh được giữa các lần chạy.
- Không làm adapter Gemini gốc (`generateContent`) trong change này.

## Capabilities

### New Capabilities

- `translation-structured-output`: chế độ đầu ra có schema của lõi dịch. Gồm điều kiện bật, hình dạng
  phản hồi, quan hệ với đối soát id và hỏi lại, cách rơi về khi schema bị từ chối, và dấu vết chế độ đã
  dùng trên trace và Lab.

### Modified Capabilities

(Không có. Thư mục `openspec/specs/` chưa có spec chính nào để sửa; hành vi của lõi dịch khi chế độ tắt
không đổi.)

## Impact

- Mã nguồn:
  - `src/main/services/ai/translate/translatePrompt.ts`: thêm schema, và chỉ dẫn `<output>` theo chế độ.
  - `src/main/services/ai/translate/translationCore.ts`: thêm tùy chọn chế độ, cách rơi về, và ghi chế độ
    vào kết quả.
  - `src/shared/algorithms/lenientParser.ts`: nhận dạng object.
  - `src/shared/contracts/translateCore.ts`: thêm tùy chọn `responseFormat` cho `complete`.
  - `src/main/infra/providers/openAiCompatible.ts`, `openAiChatTransport.ts`: đưa `response_format` vào
    body.
  - `src/main/infra/providers/modelCapability.ts`, `src/shared/contracts/modelSettings.ts`: thêm cờ
    `structuredOutput`.
  - `src/main/services/ai/paragraphTranslation.ts`, `scripts/lab/cli.ts`: chọn chế độ, thêm biến thể Lab.
- Phụ thuộc:
  - Change `provider-error-reasons` phải có trước, để 400 do schema được phân loại là lỗi cấu hình. Hiện
    `classifyError.ts` gán mọi 4xx chưa phân loại là `refused`.
  - Quyết định bật mặc định dùng báo cáo hai trục và đo lặp của change `lab-completion-quality-report`.
- Không đổi schema SQLite và không đổi IPC hiện có. `promptVersion` và hash hệ thống thay đổi khi chế độ
  schema bật, vì chỉ dẫn `<output>` khác đi.
