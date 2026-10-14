## Context

Động cơ của change: xem `proposal.md`, mục Why. Hiện trạng trong mã:

- **Prompt.** `translatePrompt.ts` có khối `<output>` trong system prompt yêu cầu "đúng một mảng JSON
  các đối tượng {"id","dst"}", với các khóa xưng gọi viết trước `dst`. `TRANSLATE_PROMPT_VERSION` là
  `translate-v5`; `systemHash` băm system prompt.
- **Gọi model.** `TranslationModelCaller.complete(messages, { signal })` không có tham số định dạng.
  `OpenAiCompatibleProvider.complete` dựng `ChatRequest` từ `model`, `messages` và `generation`, rồi
  `buildChatBody` trải `extraBody` lên sau cùng. `FORBIDDEN_BODY_FIELDS` không có `response_format`,
  nên người dùng đặt được trường này qua `extraBody`.
- **Parser.** `lenientParser.parseTranslationResponse` cắt từ dấu `[` đầu tiên tới dấu `]` cuối cùng
  rồi `JSON.parse`; hỏng thì quét regex. Với `{"items":[…]}`, phần cắt đó thường trùng mảng `items`.
  Đây là trùng hợp, không phải hợp đồng: một `[` trong lời dẫn đứng trước object sẽ làm lệch phần cắt.
- **Đối soát.** `reconcileTempItems` đã bỏ id lạ (`extraneous`), giữ bản đầu khi id lặp (không đếm),
  và tách `missing`/`empty`. `executeTranslateBatch` hỏi lại id thiếu một lần, và chia đôi lô qua
  `splitFiltered` khi `finishReason === 'filter'`.
- **Khả năng model.** Catalog (`modelCatalog.json`, lấy từ models.dev) đã có `structuredOutput: true`
  cho nhiều model Gemini. `ModelCapabilityView` hiện chỉ có `thinkingLevels` và `temperature`.
- **Lỗi.** `classifyError.kindForStatus` gán mọi 4xx chưa phân loại là `refused`. Change
  `provider-error-reasons` tách lỗi cấu hình hay request không hợp lệ ra khỏi `refused`.

Ràng buộc từ nhà cung cấp (tài liệu Google, đọc 2026-10-07):

- Endpoint tương thích OpenAI hỗ trợ structured output, nhưng vẫn ở bản beta.
- Schema chỉ hỗ trợ một tập con của JSON Schema; "very large or deeply nested schemas may be rejected".
- JSON đúng cú pháp không bảo đảm giá trị đúng ("always validate values in your application").

## Goals / Non-Goals

**Goals:**

- Có một đường thử structured output trên transport hiện tại mà đo được trong Lab, bật và tắt được theo
  từng biến thể.
- Không làm hỏng đường mặc định: chế độ tắt thì request và prompt giữ nguyên tới từng byte.
- Lỗi do schema không bao giờ bị hiện ra thành "nội dung bị từ chối".

**Non-Goals:**

- **Adapter Gemini gốc (`generateContent`).** Chỉ làm khi cần chỉnh `safetySettings` cho văn bản hoặc
  cần đọc `promptFeedback`/`blockReason`. Không chép adapter của Hermes
  (`agent/gemini_native_adapter.py`): nó không gửi `safetySettings`, và gộp `SAFETY` lẫn `RECITATION`
  thành `content_filter`. Đó chính là thông tin Mira cần giữ tách riêng.
- Structured output cho chat, trích xuất glossary hay trau chuốt. Mỗi đường có hợp đồng riêng và cần đo
  riêng.
- Ép thứ tự khóa bằng `propertyOrdering`. Thứ tự "khóa xưng gọi trước `dst`" là để model suy nghĩ theo
  trình tự; có giữ được dưới schema hay không là câu hỏi đo, không phải giả định.

## Decisions

### D1. Root là object `{"items": [...]}`, không phải mảng

Structured output của OpenAI yêu cầu root là object, và lựa chọn an toàn trên endpoint tương thích cũng
là object. Schema dự kiến:

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "speaker_to_listener": { "type": "string" },
          "self_ref": { "type": "string" },
          "addr_ref": { "type": "string" },
          "dst": { "type": "string" }
        },
        "required": ["id", "dst"]
      }
    }
  },
  "required": ["items"]
}
```

- Không dùng `enum` cho `id` (liệt kê các id của lô). Cách đó trông chặt hơn, nhưng làm schema đổi theo
  từng lô và phình theo kích thước lô, đúng loại schema Google cảnh báo có thể bị từ chối. Đối soát id
  bằng code đã bắt được id lạ.
- Không dùng `minItems`/`maxItems` bằng số đoạn. Lý do tương tự, và đếm đủ cũng không chứng minh được
  không có gộp đoạn.
- `strict: true` (khi dùng định dạng OpenAI) yêu cầu mọi khóa nằm trong `required` và có
  `additionalProperties: false`. Vì khóa xưng gọi là tùy chọn, bản đầu dùng `strict: false`. Nếu Lab cho
  thấy endpoint bỏ qua schema khi không strict, biến thể thứ hai sẽ khai khóa xưng gọi là bắt buộc,
  dùng `"?"` cho lời kể, và có chỉ dẫn tương ứng.

### D2. Chỉ dẫn `<output>` theo chế độ, cùng một bộ dựng

`systemPrompt(context)` nhận thêm `outputMode: 'array' | 'object'`, mặc định `'array'`. Ở `'object'`,
chỉ câu đầu và ví dụ hình dạng đổi sang `{"items":[…]}`; mọi luật khác giữ nguyên. Hệ quả:

- Chế độ tắt cho đúng system prompt cũ, nên hash không đổi và cache cũ vẫn trúng.
- Chế độ bật cho `systemHash` khác, nên trace phân biệt được hai chế độ.
- `TRANSLATE_PROMPT_VERSION` giữ là `translate-v5`. Chế độ được ghi ở trường riêng, không tách thành
  một thế hệ prompt mới, vì repo đã gỡ việc chọn theo phiên bản prompt.

Phương án đã cân nhắc: gửi schema mà giữ nguyên chỉ dẫn "trả mảng". Bị loại vì chỉ dẫn mâu thuẫn với
schema, và kết quả đo sẽ lẫn tác dụng của schema với tác dụng của mâu thuẫn đó.

### D3. Truyền định dạng qua `complete`, không qua `generation`

`TranslationModelCaller.complete` nhận thêm `options.responseFormat?: unknown`.
`OpenAiCompatibleProvider.complete` đặt nó vào `ChatRequest.responseFormat`, và `buildChatBody` ghi
thành `response_format`.

- Không đặt trong `generation`/`ModelSettings`, vì `generation` là của model entry, áp cho cả chat và
  trau chuốt. Định dạng là của tác vụ dịch, và đổi theo từng lời gọi (lượt rơi về không có schema).
- Thứ tự trộn: `response_format` của Mira ghi trước, `extraBody` trải sau, giữ đúng quy tắc "tham số
  người dùng chọn không bị bỏ". Lớp trên (D5) đã không bật schema khi `extraBody` có `response_format`,
  nên hai giá trị không bao giờ cùng xuất hiện.
- Không thêm `response_format` vào `FORBIDDEN_BODY_FIELDS`. Thêm vào thì cài đặt người dùng đã lưu sẽ
  bị từ chối khi mở lại, trong khi đây mới là thử nghiệm.

### D4. Parser nhận object trước, mảng sau

`parseTranslationResponse`:

1. Bỏ fence.
2. Thử `JSON.parse` cả chuỗi đã làm sạch. Nếu kết quả là object có `items` là mảng thì dùng mảng đó;
   nếu là mảng thì dùng luôn.
3. Không được thì làm như cũ: cắt `[`…`]`, làm sạch, parse, rồi tới regex.

Bước 2 đứng trước để object không phụ thuộc vào việc cắt `[`…`]` trùng hợp đúng. Phản hồi mảng cũ vẫn
cho cùng kết quả: một mảng hợp lệ parse được ở bước 2, mảng có lời dẫn thì rơi xuống bước 3.

`reconcileTempItems` thêm bộ đếm `duplicate`. Hành vi giữ bản đầu không đổi; chỉ thêm số đếm để Lab báo
cáo lỗi cấu trúc. Trường mới là tùy chọn trong `ReconciliationResult`.

### D5. Ai quyết định bật

`ModelCapabilityView` thêm `structuredOutput: boolean`, đọc từ `ModelInfo.structuredOutput` của
catalog. `MODEL_CAPABILITY_OVERRIDES` thêm được `structuredOutput` theo đúng quy tắc hiện có: chỉ thêm,
có ngày đo và bản ghi `__fixtures__/live`.

Hàm thuần `chooseOutputMode({ requested, capability, extraBody })` trả về
`{ mode: 'object' | 'array', reason? }`:

- chưa yêu cầu → `array`, không có lý do;
- model không hỗ trợ → `array`, lý do `unsupported`;
- `extraBody` đã có `response_format` → `array`, lý do `user_response_format`;
- còn lại → `object`.

`paragraphTranslation.runBatch` và Lab gọi hàm này một lần cho mỗi lượt dịch. Sản phẩm chưa có công tắc
trên giao diện; `requested` đến từ một cờ trong cấu hình dịch, mặc định `false`, và chỉ Lab đặt nó.

### D6. Rơi về khi schema bị từ chối

Trong `executeTranslateBatch`, nếu lượt chính ở chế độ `object` ném `ProviderError` có kind là lỗi cấu
hình hay request không hợp lệ (kind do `provider-error-reasons` định nghĩa), lô được gửi lại **một lần**
bằng `buildTranslateRequest` ở chế độ `array`, không có `responseFormat`. Kết quả lô có
`outputMode: 'object→fallback'`, và nơi gọi nhận cờ để chuyển các lô sau sang `array`.

- Chỉ rơi về với lỗi cấu hình. `refused` của bộ lọc nội dung (`finishReason === 'filter'`) đi theo
  luồng chia đôi; schema không phải nguyên nhân, và gửi lại không schema chỉ tốn thêm lời gọi.
- Lời gọi rơi về được tính vào ngân sách lời gọi của chương (change `translation-call-budget`, nếu đã
  có).
- Lượt hỏi lại và các lượt chia đôi dùng chế độ của lô sau khi đã rơi về (nếu có).

Phương án đã cân nhắc: cache theo model để nhớ "model X từ chối schema" giữa các phiên. Để sau; một lượt
dịch rơi về một lần là đủ rẻ, và cache sẽ che mất việc nhà cung cấp sửa lỗi.

### D7. Dấu vết

- `TranslateCoreBatchOutcome.request` thêm `outputMode` và `outputModeReason?`.
- Trace đề xuất và bản ghi lần chạy Lab (`runs.jsonl`) ghi hai trường này cùng số lô đã rơi về.
- Báo cáo Lab thêm cột "chế độ đầu ra" và các chỉ số cấu trúc: thiếu, thừa, lặp, số đoạn phải hỏi lại.
  Cách so và mẫu số theo change `lab-completion-quality-report`.

## Risks / Trade-offs

- [Schema làm giảm chất lượng xưng hô vì model không còn viết khóa xưng gọi trước `dst`] → Đo tuân thủ
  xưng hô cùng điều kiện. Đây là một trong các điều kiện của cổng quyết định.
- [Endpoint beta đổi hành vi, hoặc lặng lẽ bỏ qua schema] → Lab ghi chế độ trên từng lần chạy và kiểm
  phản hồi có đúng hình object không. Đếm số phản hồi ở chế độ `object` mà không phải object; số này lớn
  thì kết luận endpoint không áp schema.
- [400 do schema bị xếp nhầm thành `refused` nếu triển khai trước `provider-error-reasons`] → Task 1 kiểm
  điều kiện phụ thuộc; không ghép nhánh này khi change kia chưa có.
- [Thử thêm một chế độ là thêm một nhánh phải bảo trì] → Mặc định tắt, chỉ Lab bật. Nếu cổng quyết định
  không qua, gỡ nhánh và ghi lại kết quả, không để chế độ treo vô thời hạn.
- [Catalog cộng đồng khai sai `structuredOutput`] → Cách rơi về ở D6 xử lý khi khai sai; ghi đè bằng đo
  thật theo quy tắc của bảng sửa tay.

## Migration Plan

Không có dữ liệu cần chuyển. Chế độ mặc định tắt, nên bản phát hành chứa change này cư xử như cũ. Gỡ
change là xóa cờ, nhánh `object` của prompt và trường `responseFormat`. Parser nhận object nên giữ lại:
nó vô hại và giúp đọc lại các lần chạy Lab đã có.

## Open Questions

- Dùng định dạng `response_format: { type: "json_schema", json_schema: { name, schema, strict } }` của
  OpenAI hay khai thêm qua `extra_body.google`? Bản đầu dùng định dạng OpenAI, vì tài liệu tương thích
  ghi nhận định dạng đó. Câu trả lời không đổi spec hay task.
- Có cần biến thể `strict: true` không (xem D1)? Quyết định sau lần đo đầu.

## Ghi chú khi triển khai (2026-10-08)

Chỗ khác với các quyết định trên, và lý do:

- **`outputMode` nằm trong `TranslatePromptContext`**, không là tham số riêng của `systemPrompt` hay
  `buildTranslateRequest`. Lõi dịch truyền cùng một ngữ cảnh cho lượt chính, chia đôi, gửi lại không ngữ
  cảnh và hỏi lại, nên đặt chế độ trong ngữ cảnh là cách duy nhất để mọi lượt phụ giữ chế độ của lô mà không
  thêm tham số ở từng chỗ. Vắng hoặc `array` cho system prompt cũ tới từng byte (test so hash lấy trước khi
  sửa).
- **Lời gọi rơi về có vòng ngân sách riêng `fallback`** (`BudgetRound`), không lẫn với `repair`, để
  trace và Lab đếm được số lần schema bị từ chối.
- **`request.outputMode` của lõi dịch** là chế độ của câu trả lời được dùng (`object→fallback` khi gửi
  lại), và `request` là request gửi lại; trace ghi `systemHash` của request đó. `rebuildTranslateRequest`
  đọc `outputMode` của trace để dựng lại đúng chế độ.
- **Lý do `run_fell_back`** thêm vào `outputModeReason` cho các lô sau của một lượt đã có lô rơi về.
- **Cờ bật là tùy chọn `outputSchema` của `ParagraphTranslator`**, không phải cấu hình dịch lưu trong kho.
  `createServices` không đặt nó, nên sản phẩm không bao giờ gửi schema; Lab dựng một bộ dịch riêng khi chạy
  `translate --schema` (cờ cho cả lần chạy, không phải hậu tố nhãn: nhãn đã mang mức thinking và số lặp).
- **Lỗi cấu trúc** (mục lạ, mục lặp, số đoạn phải hỏi lại) lấy từ câu trả lời lượt chính của mỗi lô, trả ra
  ở `TranslateCoreBatchOutcome.structure`, `ParagraphBatchResult.output.structure` và trace; Lab cộng thành
  `output` của bản ghi lần chạy.
- **Chưa làm**: bản ghi sống `__fixtures__/live` (task 1.2) và lần đo quyết định (9.3), vì cần gọi API thật.
  Change chưa archive cho tới khi hai việc này xong.
