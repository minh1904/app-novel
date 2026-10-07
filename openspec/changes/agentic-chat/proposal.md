## Why

Ngày 2026-10-08 chủ sản phẩm quyết định panel AI chat như Hermes Desktop: người dùng chỉ gõ câu hỏi, còn
model tự gọi tool để lấy chương, tìm, đọc thuật ngữ, rồi đề xuất thay đổi. Nguồn:
`docs/modules/proposals/hermes-chat-research.md`, mục "Quyết định 2026-10-08".

Hiện nay ô soạn bắt người dùng chọn chế độ (Hỏi / Sửa / Áp dụng) và phạm vi (cả chương hay đoạn đang
sửa). Renderer dựng sẵn ngữ cảnh và gửi kèm. Chế độ Sửa đòi model đặt bản thay thế trong một khối rào ở
cuối câu trả lời. Ba lựa chọn này bắt người dùng nghĩ thay model, và model chỉ sửa được một khoảng đã
chọn trước. Nền tool đọc đã có (`list_chapters`, `read_chapter` theo trang, `search_work`), nên bước còn
thiếu là để model tự quyết và cho nó tool ghi an toàn.

## What Changes

**Ô soạn.**

- **BREAKING:** bỏ chọn chế độ và chọn phạm vi. Chỉ còn ô nhập, menu model và nút gửi.
- Bỏ khối "Đã gửi kèm".
- Lượt chat không còn mang `mode`, `context` hay `range`.

**Ngữ cảnh.**

- Không tự gửi kèm ngữ cảnh. Thay vào đó, system prompt có một dòng mô tả **nơi người dùng đang đứng**:
  tác phẩm, chương đang mở, đoạn con trỏ đang ở và đoạn đang chọn nếu có.
- Dòng này chỉ là con trỏ để model biết "chương này", "đoạn này" là gì. Nội dung thì model phải gọi tool
  để đọc.

**Tool đọc mới:**

- `get_current_chapter`: thông tin chương đang mở và vị trí con trỏ hoặc vùng chọn.
- `read_segments`: đoạn gốc và đoạn dịch tương ứng theo liên kết căn chỉnh, cho một khoảng đoạn.
- `list_glossary`: thuật ngữ đã duyệt, có lọc theo chuỗi.
- `list_addressing`: cách xưng hô đã duyệt giữa các cặp nhân vật.

`list_chapters`, `read_chapter` và `search_work` giữ nguyên.

**Tool ghi.** Tool ghi chỉ tạo **đề xuất**, không ghi thẳng:

- `propose_edit`: thay một khoảng đoạn của bản dịch.
- `propose_translation`: dịch một khoảng đoạn còn trống.
- `propose_glossary_term`: thêm một thuật ngữ ở trạng thái chờ duyệt, nguồn `ai`.

Đề xuất từ chat luôn ở chế độ duyệt trước; không tự áp dụng.

**Bỏ cơ chế khối rào.** Bỏ chế độ Sửa và việc tách khối rào ở cuối câu trả lời. Đề xuất chỉ sinh ra từ
tool ghi.

**Hiển thị lượt gọi tool như Hermes.**

- Các lượt gọi liên tiếp gộp thành một dòng tóm tắt, ví dụ "Đã đọc 3 chương, tìm 2 lần, đề xuất 1 sửa".
- Bấm vào thì mở danh sách từng lượt gọi kèm trạng thái.
- Đề xuất do tool tạo hiện ngay dưới lượt chat, có Chấp nhận và Bỏ.

**Giới hạn mỗi lượt.** Trần vòng gọi tool và ngân sách ký tự vẫn giữ. Thêm trần **số đề xuất mỗi lượt**.

## Capabilities

### New Capabilities

- `agentic-chat`: cách một lượt chat được gửi và trả lời khi không có chế độ hay phạm vi. Bao gồm:
  - vị trí người dùng đi trong system prompt;
  - vòng gọi tool;
  - đề xuất sinh từ tool ghi và cách chúng hiện trong panel;
  - dòng tóm tắt các lượt gọi tool;
  - phiên cũ có chế độ vẫn đọc được.

### Modified Capabilities

- `ai-chat-tools`:
  - "Tool chỉ đọc và buộc vào tác phẩm đang mở" đổi thành "tool đọc không đổi dữ liệu; tool ghi chỉ tạo
    đề xuất hoặc mục chờ duyệt".
  - "Mỗi lần gọi tool hiện trên panel" đổi sang dòng gộp mở rộng được.
  - "Giới hạn mỗi lượt chat" thêm trần số đề xuất.

## Impact

**Contract:** `src/shared/contracts/aiChat.ts`.

- `ChatSendInput` bỏ `mode` và `context`; thêm vị trí người dùng (chương, đoạn con trỏ, vùng chọn).
- `ChatTurn` và `aiHistory` thêm danh sách đề xuất của lượt.
- `CHAT_MODES` chỉ còn dùng để đọc phiên cũ.

**Main.**

- `src/main/services/ai/chatPrompt.ts`: một system prompt, không còn `ASK_ONLY` / `EDIT`.
- `chatTools.ts`: thêm tool mới và thư viện đọc glossary, xưng hô, liên kết.
- `chatService.ts`: tool ghi gọi dịch vụ đề xuất ngay trong lượt.
- `createServices.ts`: bỏ `extractFence` và nhánh tạo đề xuất cuối lượt.
- `services/proposals/chatProposalService.ts`: nhận đề xuất theo khoảng đoạn.

**Renderer.**

- `AiComposer.tsx`: bỏ chọn chế độ và phạm vi.
- `chatContext.ts`: thay bằng hàm dựng vị trí người dùng.
- `AiTurn.tsx`: dòng tóm tắt tool và thẻ đề xuất.
- `useAiChat.ts`, `aiChatStore.ts`.

**Lưu trữ:** lượt cũ trong DB tác phẩm có cột `action` và `range`; vẫn đọc được. Lượt mới ghi `action =
'chat'`. Không đổi schema nếu cột chấp nhận giá trị mới; nếu không thì thêm migration nhỏ (xem design).

**Tài liệu:** `docs/modules/proposals/` (README, `decisions.md`, `hermes-chat-research.md`).

**Không đổi:** hộp thoại dịch chương, hàng chờ dịch theo đoạn, cách đề xuất được duyệt và áp dụng.
