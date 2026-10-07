## Why

Mira đang gán `refused` cho mọi lỗi 4xx chưa phân loại. Vì vậy một yêu cầu sai cấu hình cũng hiện ra là "nhà cung cấp từ chối", giống như nội dung bị bộ lọc chặn. Ví dụ: `reasoning_effort: "none"` gửi tới `gemini-3.5-flash-lite` (ghi ở `docs/modules/context/content-refusals.md`, 2026-10-07), schema bị từ chối, tham số sai, request quá dài. Hệ quả có hai:

- Người dịch và Lab đọc sai nguyên nhân. Tỷ lệ "từ chối nội dung" trong số đo bị lẫn lỗi cấu hình.
- Lý do chặn cụ thể (`PROHIBITED_CONTENT`, `SAFETY`, `RECITATION`) bị gộp làm một. Do đó chưa làm được bảng xử lý theo lý do ở mục 5 của tài liệu trên.

Đợt rà này còn thấy một lỗi hành vi: lõi dịch trả `kind: 'refused'` khi chỉ vài đoạn bị lọc, mà renderer coi `refused` là lỗi dừng cả lượt. Kết quả là vài câu bị lọc làm dừng toàn bộ phần còn lại của chương. Việc này phải sửa trước khi thử structured output, vì schema bị từ chối cũng sẽ rơi vào nhánh `refused`.

## What Changes

- Thêm loại lỗi **yêu cầu không hợp lệ** (`invalid_request`) cho các 4xx không phải xác thực, hạn mức hay nội dung bị chặn. Loại lỗi này không thử lại, không đổi khóa, không đóng băng khóa. Thông báo nêu thông điệp của nhà cung cấp và các tham số Mira đã gửi (mức thinking, khóa `extra_body`, `response_format`), để người dùng sửa cấu hình.
- `refused` ở cấp HTTP chỉ dùng khi thân lỗi có bằng chứng là nội dung bị chặn. Không có bằng chứng thì là `invalid_request`.
- Giữ **lý do chặn** trên từng đoạn bị bộ lọc từ chối: `prohibited`, `safety`, `recitation`, `other`, kèm chuỗi gốc của nhà cung cấp. Thông báo cho người dịch nói theo lý do. `recitation` không được gọi là vấn đề nội dung.
- Tách **phân loại** (nhà cung cấp báo gì) khỏi **chính sách theo tác vụ** (dịch, chat, kiểm tra kết nối). Main quyết định một lỗi có dừng lượt dịch hay không và có thử lại được không. Renderer đọc quyết định đó thay vì tự suy từ `kind`.
- **Sửa hành vi:** đoạn bị bộ lọc từ chối không làm dừng các lô còn lại của chương. Lỗi cấu hình, xác thực và hạn mức vẫn dừng như cũ.
- Mức thinking chỉ được gửi khi model hỗ trợ. Main kiểm khi lưu cài đặt và trước khi gửi với model có trong catalog. Mức không hợp lệ bị chặn trước khi gọi, kèm danh sách mức hợp lệ. Lab dùng chung phép kiểm này.
- **BREAKING (hợp đồng IPC nội bộ):** `TranslateErrorKind`, `ChatErrorKind` và `ProviderErrorKind` có thêm `invalid_request`. `TranslateFailure` có thêm cờ dừng lượt, và kết quả lô có thêm lý do từ chối theo đoạn.

## Capabilities

### New Capabilities
- `provider-error-reasons`: phân loại lỗi nhà cung cấp (yêu cầu không hợp lệ, nội dung bị chặn và lý do chặn), chính sách xử lý theo tác vụ, cách báo cho người dùng.
- `model-thinking-levels`: mức thinking hợp lệ theo model, được kiểm khi lưu, khi gửi và trong Lab.

### Modified Capabilities
<!-- Repo chưa có openspec/specs/ (các change cũ đã archive nhưng chưa đồng bộ spec chính), nên các yêu cầu sửa ở translation-core, ai-gateway, ai-model-settings được viết thành yêu cầu mới trong hai capability trên. -->

## Impact

- **Provider:**
  - `src/main/infra/providers/classifyError.ts`: bảng status → loại lỗi, bằng chứng nội dung bị chặn.
  - `types.ts`: thêm `ProviderErrorKind` mới và bảng `RETRYABLE`.
  - `openAiChatTransport.ts`: `mapFinishReason` trả thêm lý do lọc.
  - `generation.ts`: ghi lại các tham số đã gửi.
  - `modelCapability.ts`: kiểm mức thinking.
- **Gateway:** `gateway/*` (keyScheduler, retryPolicy) không coi `invalid_request` là lỗi của khóa.
- **Lõi dịch:** `src/main/services/ai/translate/translationCore.ts` trả lý do theo đoạn. `paragraphTranslation.ts` gắn cờ dừng lượt.
- **Chat và kết nối:** `chatService.ts` và `connectionService.ts` dùng chính sách mới.
- **Hợp đồng:** `src/shared/contracts/aiTranslate.ts`, `aiChat.ts`.
- **Renderer:**
  - `useParagraphTranslate.ts`: bỏ tập `STOPS` tự suy.
  - `useAiChat.ts`: không gán cứng `refused` cho lỗi khởi động.
  - Màn cài đặt model: đã lọc mức theo khả năng, chỉ cần thêm thông báo mới.
- **Lab:** `scripts/lab/cli.ts` kiểm mức thinking trước khi chạy. Báo cáo Lab tách được lỗi cấu hình khỏi đoạn bị từ chối.
- Không đổi schema SQLite. Không đổi nội dung hay chỉ dẫn gửi tới model. Không thêm đường lách bộ lọc.
