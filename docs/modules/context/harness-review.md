# Đối chiếu harness của Hermes Agent

Cập nhật: 2026-10-07 · Trạng thái: **quan sát** (đọc mã Hermes và Mira, tài liệu Google), kèm thứ tự ưu
tiên **đề xuất**. Chưa chạy benchmark hay gọi model cho tài liệu này.
Chủ trì: kỹ thuật (lõi dịch, provider, Lab). Câu hỏi: Mira học được gì từ một agent harness trưởng thành,
và điều gì trong đó không áp dụng nguyên xi?

Nguồn: bản checkout `D:\personal\hermes-agent` (commit `1ab7983641`), đọc 2026-10-07. Đường dẫn Hermes dưới
đây tính từ gốc repo đó.

## 1. Harness của Hermes gồm những gì (quan sát)

| Lớp | Hermes làm gì | Ở đâu |
| --- | --- | --- |
| Vòng lặp | Ghép request → nén trước khi gọi → gọi API có retry → chuẩn hóa → chạy tool hoặc kết thúc; stop gate chặn câu trả lời “xong” chưa kiểm | `agent/conversation_loop.py`, `agent/turn_stop_gates.py` |
| Lỗi | ~30 lý do (`FailoverReason`), mỗi lý do mang cờ `retryable`, `should_compress`, `should_rotate_credential`, `should_fallback` | `agent/error_classifier.py:34-84` |
| Prompt | Ba tầng ổn định → ngữ cảnh → hay đổi; dựng một lần mỗi phiên; ngày không kèm giờ; chèn giữa lượt vào tool result mới nhất để giữ cache | `agent/system_prompt.py`, `agent/prompt_caching.py` |
| Tool | Schema + `check_fn` + trần kết quả; kết quả quá dài ghi ra file kèm đoạn xem trước; dữ liệu web/MCP bọc `untrusted_tool_result`; ẩn tool ít dùng sau `tool_search` | `tools/registry.py`, `tools/tool_result_storage.py`, `tools/tool_search.py` |
| Ngữ cảnh | Nén giữ đầu và đuôi, tóm tắt phần giữa kèm danh sách định danh chính xác và tool `session_search` để tra lịch sử gốc | `agent/context_compressor.py` |
| Bộ nhớ | Hai tệp nhỏ chụp lúc mở phiên; ghi giữa phiên không đổi prompt; review nền theo chu kỳ (mặc định 10 lượt) đề xuất lưu memory hoặc skill | `tools/memory_tool_store.py`, `agent/background_review.py`, `agent/agent_init.py:1301` |
| Eval | A/B hai bản checkout cố định, chấm bằng code, lần chạy lỗi tính 0 và vẫn ở mẫu số; scorecard ghi nhiễu đo | `evals/core_tool_deferral/`, `evals/compaction/` |

## 2. Những điểm dễ hiểu sai (đã kiểm lại)

- **Adapter Gemini gốc của Hermes không giải quyết chuyện bộ lọc.** `agent/gemini_native_adapter.py` gọi
  `generateContent` và chuyển schema, nhưng không gửi `safetySettings`, không đọc `promptFeedback`, và dòng
  84 gộp `SAFETY` lẫn `RECITATION` thành `content_filter`. Mira không nên chép nguyên adapter đó.
- **Stop gate không chỉ nhắc một lần.** Verify-on-stop mặc định `max_attempts=2`
  (`agent/verification_stop.py:161`); hook `pre_verify` mặc định 3 (`agent/verify_hooks.py:16`).
- **±3,3 điểm là nhiễu của một bài kiểm cụ thể** (nhớ sau nén, 15 câu hỏi;
  `evals/compaction/results/SCORECARD-2026-09-19-jev.md:59`), không phải biên dao động chung. Mira phải tự
  đo nhiễu của mình.
- **Review nền chạy theo chu kỳ, không sau mọi lượt.**
- **“Dữ kiện bị mất nằm trong lời assistant”** là kết luận trên tập transcript Hermes đã đo, không phải
  luật chung cho mọi tool output.

## 3. Mira đang ở đâu (quan sát trong mã, 2026-10-07)

| Chủ đề | Hiện trạng | Hệ quả |
| --- | --- | --- |
| Ngữ cảnh lô dịch | [`runBatch`](../../../src/main/services/ai/paragraphTranslation.ts) đọc lại glossary, xưng hô, nhân vật cho **mỗi lô** | Sửa ngữ cảnh giữa lúc chạy làm các lô trong một chương dùng phiên bản khác nhau; trace chỉ có hash, không tái dựng được request |
| Phân loại lỗi | [`kindForStatus`](../../../src/main/infra/providers/classifyError.ts) gán `refused` cho mọi 4xx không phải 401/402/403/429 (trừ sai key) | Lỗi cấu hình (mức thinking không hợp lệ, schema bị từ chối, tham số sai, request quá dài) hiện thành “nhà cung cấp từ chối” — xem [đoạn bị từ chối](content-refusals.md). **Đã sửa 2026-10-07** (`invalid_request`) |
| Dừng cả chương | Lô có đoạn bị lọc trả `kind: 'refused'`, mà [`useParagraphTranslate.ts`](../../../src/renderer/src/features/chapter/useParagraphTranslate.ts) xếp `refused` vào `STOPS` | Vài đoạn bị chặn làm các lô còn lại của chương không được dịch. **Đã sửa 2026-10-07** (`haltsRun` do main quyết) |
| Mức thinking | UI lọc mức theo catalog, nhưng main không kiểm lại; Lab ghi thẳng mức thinking | Lần chạy `v5-nothink+lite35` đi qua đúng lỗ này. **Đã sửa 2026-10-07** (`checkThinkingLevel` ở main và Lab) |
| Số lời gọi | `MAX_FILTER_SPLIT_CALLS = 16` đếm riêng mỗi lần gọi `splitFiltered`; vòng gửi lại không ngữ cảnh gọi lại nó | Một lô tối đa 1 + 16 + 16 + 1 = **34** lời gọi model; gateway thử lại tới 2 lần mỗi lời gọi. **Đã sửa 2026-10-08** (ngân sách chung theo lượt, `callBudget.ts`) |
| Kiểm rồi hỏi lại | [`translationCore.ts`](../../../src/main/services/ai/translate/translationCore.ts) đối soát id và hỏi lại đúng id thiếu/rỗng **một lần** | Đã có phần “kiểm bằng code rồi sửa”; chưa mở rộng sang glossary/xưng hô |
| Tool chat | Hai tool chỉ đọc; `read_chapter` cắt ở 20.000 ký tự, không đọc tiếp được; chưa có tìm kiếm | Model không tự tra được “chương trước dịch 魔王 là gì”. **Đã sửa 2026-10-08** (đọc theo trang, `search_work`) |
| Lịch sử chat | Giữ các lượt gần nhất trong 24.000 ký tự, báo số lượt bị bỏ | Đúng nguyên tắc D10; chưa có tóm tắt |
| So sánh Lab | [`compare.run.ts`](../../../scripts/bench/compare.run.ts) lấy giao các chương | Chưa loại đoạn bị từ chối, chưa báo riêng khả năng hoàn thành; [lịch sử đo](../measurement/history.md) để lần chạy hỏng ngang hàng lần chạy hợp lệ |

Tài liệu Google (đọc 2026-10-07) bổ sung ba điều:

- Endpoint tương thích OpenAI **hỗ trợ structured output** qua `response_format` (beta). Schema chỉ bảo
  đảm JSON đúng cú pháp: *“always validate values in your application”*; schema lớn hoặc lồng sâu có thể
  bị từ chối ([structured output](https://ai.google.dev/gemini-api/docs/structured-output)).
- `reasoning_effort: "none"` theo tài liệu chỉ dùng được với model 2.5
  ([OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)). Tài liệu không khớp hết thực
  tế: bản ghi probe [`probe-gemini-3.5-flash-effort-none.json`](../../../src/main/infra/providers/__fixtures__/live/probe-gemini-3.5-flash-effort-none.json)
  cho thấy `gemini-3.5-flash` vẫn nhận `none`, còn `gemini-3.5-flash-lite` trả 400. Mức hợp lệ phải lấy
  từ catalog và probe theo từng model, không suy từ thế hệ model.
- Trong cùng trang, `safety_settings` qua `extra_body` chỉ được liệt kê cho sinh ảnh — khớp với lần thử
  2026-10-06 bị 400 khi gửi cho văn bản.

## 4. Thứ tự ưu tiên (đề xuất, chủ sản phẩm duyệt 2026-10-07)

| # | Việc | Change OpenSpec |
| --- | --- | --- |
| 1 | Chụp ngữ cảnh một lần cho mỗi lượt dịch chương; trace tái dựng được request | `translation-context-snapshot` |
| 1 | Báo cáo Lab hai trục (hoàn thành / chất lượng trên phần so được), đo lặp, phân lớp phép kiểm | `lab-completion-quality-report` |
| 2 | Tách lỗi cấu hình khỏi nội dung bị chặn, giữ lý do chặn, bảng mức thinking theo model | `provider-error-reasons` |
| 2 | Ngân sách lời gọi chung cho một lượt dịch chương | `translation-call-budget` |
| 3 | `read_chapter` phân trang và tool `search_work` | `chat-tools-paging-search` |
| 4 | Thử structured output trên đường hiện tại; adapter Gemini gốc chỉ làm khi cần chỉnh ngưỡng an toàn hoặc đọc `promptFeedback` | `translate-structured-output-trial` — mã đã có 2026-10-08, mặc định tắt, chỉ Lab bật (`--schema`); chưa đo |
| 5 | Sửa có chủ đích cho lỗi glossary/xưng hô, **sau khi** đo tỷ lệ checker báo nhầm | chưa lập, xem [kiểm và tự sửa](post-editing.md) |
| 6 | Học từ bản người sửa (kích hoạt khi duyệt xong chương, giữ đoạn bằng chứng và phạm vi); tóm tắt lịch sử chat (đo trước, phân biệt lời AI đề xuất với lựa chọn người dịch đã chốt) | chưa lập |

Thứ tự trong nhóm 2 có ràng buộc: phải tách lỗi cấu hình trước khi thử structured output (nhóm 4), nếu
không schema bị từ chối sẽ bị ghi thành tỷ lệ nội dung bị chặn.

## 5. Không học theo

- Stop gate và review nền chạy tự động sau mọi lượt: với Mira, mỗi vòng thêm là chi phí của người dùng;
  chỉ thêm khi đo thấy có lợi.
- Ẩn tool sau `tool_search`: Mira chỉ có vài tool; lợi ích của Hermes đến từ 27 tool.
- Coi mọi lần chạy lỗi là 0 điểm chất lượng: hoàn thành và chất lượng là hai trục khác nhau.

[Về module Ngữ cảnh](README.md)
