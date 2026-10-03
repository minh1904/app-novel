## Why

Khóa Gemini đã nối được và màn Cài đặt tạo được kết nối thật, nhưng panel "Hỏi AI" vẫn là **vỏ rỗng**: câu hỏi, câu trả lời, ba "bước tool", menu model và ba chip ngữ cảnh đều là hằng số trong `aiChatSample.ts`, mọi nút ghi đều `disabled`, và `contextLabel` là chữ cứng `headingTitle(chapter) + ' · Đoạn văn 2'` — panel **không biết con trỏ đang ở đâu**. Người dịch hiện có đúng một cách dùng AI: hộp thoại "Dịch bằng AI" dịch cả chương theo lô, **không có ô nào để gõ yêu cầu**. Thứ thiếu là chỗ nói "chỗ này dịch cứng quá, viết lại tự nhiên hơn" rồi nhận lại bản sửa — đúng việc mà job dịch theo lô không làm được.

[Nghiên cứu phương thức ngày 2026-10-02](../../../docs/handbook/research/ai-chat-panel.md) đã khảo sát code + tài liệu Gemini/Electron và chủ sản phẩm chốt **tám quyết định Q1–Q8**. Hai trong số đó đổi hướng so với mặc định đề nghị ban đầu, và cả hai đều thuộc kiến trúc: **streaming làm ngay** (nên repo phải mở bề mặt main → renderer đầu tiên), và **"Sửa" được tác động cả pane bản dịch** — nhưng đi **đường editor**, không ghi thẳng xuống kho, vì ghi thẳng sẽ lật toàn bộ căn chỉnh của chương sang `needs_review` và làm mất `provenance` của mọi segment bị dựng lại.

## What Changes

- **Một lời gọi hội thoại trên provider đã có.** Thêm `chat()` vào `OpenAiCompatibleProvider`: cùng `baseUrl`, cùng `KeySource`, cùng `classify()`, cùng `send()`. Khác `translate()` ở chỗ gửi `messages` thật thay vì mảng JSON segment, không đi qua `splitIntoBatches`/`reconcile`, và **trả về theo dòng** (SSE) thay vì một lần. Không thêm SDK nhà cung cấp, không thêm dependency.
- **Bề mặt IPC main → renderer đầu tiên của repo.** Ba kênh: `ai:chat:send` (`invoke`, trả `requestId` **ngay**, không trả nội dung), `ai:chat:cancel` (`invoke`, khóa theo `requestId`), và một kênh sự kiện main → renderer đẩy từng chunk qua `webContents.send`. Mọi chunk mang `requestId`. Preload phơi thêm một hàm đăng ký listener — API đầu tiên theo hướng này, nên nó được khai hẹp: chỉ một kênh, chỉ cho chat.
- **Panel biết con trỏ đang ở đâu.** `TextEditorHandle` phơi thêm phạm vi đang nhắm (vùng bôi chọn, hoặc đoạn chứa con trỏ khi không bôi chọn gì) cùng segment ID giao với phạm vi đó; `ChapterWorkspace` truyền xuống `AiPanel`. Đây là điều kiện tiên quyết: không có nó thì cả chế độ Sửa lẫn ngữ cảnh "mấy câu liền trước" đều không tồn tại.
- **Hai chế độ định nghĩa bằng quyền ghi.** `Hỏi` = câu trả lời không có nút Áp dụng. `Sửa` = model bị buộc trả **đúng một khối văn bản thay thế** cho phạm vi đang nhắm cộng một dòng giải thích; panel hiện **diff trước**, Áp dụng là **một transaction CodeMirror duy nhất** vào pane bản dịch nên `Ctrl+Z` trả lại nguyên trạng.
- **Ngữ cảnh lắp sẵn bằng luật, không tool call.** Hàm thuần `buildChatContext(rows, range, radius)`: phạm vi đang nhắm + N segment liền trước/sau + bản dịch hiện có của chúng + tên chương + cặp ngôn ngữ. Hiện ra trong câu trả lời dưới dạng danh sách gập **"đã gửi kèm"** — dùng nguyên khối UI `ToolSteps` đã dựng, đổi nguồn dữ liệu và đổi nhãn khỏi giọng "đã dùng công cụ", vì Mira quyết định cái gì đi vào prompt, không phải model.
- **Menu model cứng biến mất.** `AI_MODELS` (năm nhóm bịa với giá mẫu) được thay bằng model của kết nối đang chọn; chi phí mỗi lượt hiện bằng `usage` thật + `costEstimate`/`modelCatalog` đã có.
- **Hội thoại giữ trong bộ nhớ phiên.** Nhiều lượt có lịch sử trong một phiên; đóng panel là mất, và panel nói rõ. **Không nâng schema** trong change này.

Không thuộc change này: tool call và Agent mode; lưu hội thoại qua phiên (nâng schema sẽ đi cùng `ai-usage-persisted`); `@codemirror/merge` để nhận/bỏ từng chỗ (Q7 chốt để lại làm đường nâng cấp **có điều kiện**, bật khi đo được tỷ lệ hoàn tác cao); ngữ cảnh thật từ Thuật ngữ · Xưng hô · Văn phong (change `context-core`, chưa triển khai — `buildChatContext` được khai để sau này gọi `buildContext()` mà không đổi tầng provider/IPC); ảnh đính kèm; chat ở mode Từng câu (đang tạm ẩn); trần chi phí riêng cho chế độ hỏi (còn mở, đo trước).

## Capabilities

### New Capabilities

- `ai-chat`: hỏi AI về chỗ đang sửa trên một kết nối đã khai — một lượt hội thoại có lịch sử trong phiên, chữ chảy về theo dòng và hủy được giữa dòng, ngữ cảnh chọn bằng luật và nói rõ đã gửi gì, hai chế độ phân biệt bằng quyền ghi, và đề xuất chỉ vào văn bản sau khi người dùng nhìn thấy diff rồi đồng ý — bằng một thao tác hoàn tác được.

### Modified Capabilities

- `translation-provider`: hiện chỉ khai một lối gọi ra ngoài (`translate()` theo lô, khớp theo segment ID, không streaming). Thêm yêu cầu cho **lối gọi hội thoại**: trả về theo dòng, dùng chung chọn khóa và phân loại lỗi với lối dịch, báo lỗi giữa dòng như một phần của dòng chứ không phải một lời gọi thất bại, và hủy giữa dòng không bị tính là khóa lỗi.

## Impact

- **Code mới:** `src/main/infra/providers/chatStream.ts` (parse SSE), `src/main/services/ai/chatService.ts` (vòng đời một lượt, `AbortController` theo `requestId`), `src/main/ipc/aiChatHandlers.ts`, `src/shared/contracts/aiChat.ts` (kiểu + schema valibot), `src/renderer/src/features/chapter/chatContext.ts` (`buildChatContext`), `src/renderer/src/features/chapter/useAiChat.ts`, `src/renderer/src/features/chapter/ChatDiff.tsx`.
- **Code sửa:** `src/main/infra/providers/openAiCompatible.ts` (thêm `chat()`), `src/shared/contracts/channels.ts`, `src/shared/contracts/desktop-api.ts`, `src/preload/index.ts` (**hàm đăng ký listener đầu tiên**), `src/renderer/src/features/editor/TextEditor.tsx` (`TextEditorHandle` phơi phạm vi đang nhắm + áp dụng một transaction), `ChapterWorkspace.tsx`, `AiPanel.tsx`, `AiComposer.tsx`, `AiTurn.tsx`, và `aiChatSample.ts` **bị xóa phần dữ liệu mẫu đang đóng vai dữ liệu thật**.
- **Dependency:** không thêm gì. `@codemirror/merge` cố ý **không** đưa vào.
- **Dữ liệu:** **không đổi schema.** Không bảng mới, không version mới — đây là lý do change này chạy song song được với `context-core` và `segment-auto-align` (cả hai đều muốn tăng version).
- **Đánh đổi đã nhận, không phải sơ suất:** đoạn do AI viết rồi người dùng Áp dụng đi vào kho **như chữ người dùng** — `provenance` ghi `human`, không ghi `ai`. Nghĩa là không trả lời được "đoạn này do model nào viết" cho sửa đổi qua chat. Giá của phương án khác (`saveRow` theo từng segment để giữ nguồn gốc) là mất khả năng sửa cả đoạn, nên đổi lấy nguồn gốc là lựa chọn có chủ ý. `content-model` **không** đổi yêu cầu nào.
- **Bảo mật:** khóa API vẫn không ra khỏi main — renderer không bao giờ tự `fetch` tới nhà cung cấp. Kênh sự kiện mới chỉ đẩy **chữ của câu trả lời**, không đẩy khóa, không đẩy header.
- **Tài liệu:** `engineering/current-state.md`, `delivery/backlog.md` (`ai-chat-panel`), `product/open-questions.md` (trần chi phí còn mở), `maintenance/changelog.md`. [Nghiên cứu phương thức](../../../docs/handbook/research/ai-chat-panel.md) là căn cứ Q1–Q8; chưa nâng thành ADR — nếu muốn khóa "sửa qua chat đi đường editor, không ghi thẳng xuống kho" ở mức quyết định thì cần ADR-005 riêng.
- **Rủi ro chính:** tầng này **chưa từng gọi nhà cung cấp thật** (mục `ai-provider-live-verification` trong backlog vẫn mở), nên hình dạng chunk, hình dạng lỗi giữa dòng, và việc `usage` có về ở chunk cuối hay không đều là **giả định rút từ tài liệu** cho tới khi gọi thật. Một lượt chat thật bằng `curl` phải là việc đầu tiên, trước khi viết test theo hình dạng tưởng tượng.
