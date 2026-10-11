> **Tài liệu lịch sử — superseded ngày 2026-10-11.** Đây là trạng thái checklist 20/22 khi change bị
> rút, không phải danh sách task hiện hành hay bằng chứng nghiệm thu đầy đủ. Xem
> [ghi chú vòng đời](README.md).

## 1. Contract và lưu trữ

- [x] 1.1 Đổi `ChatSendInput` trong `aiChat.ts`:
  - bỏ `mode`, `context`, `range`, `proposalBase`;
  - thêm `location` (D1), kiểm bằng valibot;
  - `ChatTurnView` có `mode: ChatMode | 'chat'`;
  - thêm `ChatChunk` loại `proposal`.

  Kiểm: `aiChat.test.ts` thêm ca hợp lệ, ca đoạn âm và ca vùng chọn ngược bị từ chối; typecheck node và
  web xanh.
- [x] 1.2 Migration work schema:
  - thêm `'chat'` vào CHECK của `ai_turn.action` và cột `location_json`;
  - giữ `proposal.turn_id` qua bảng tạm.

  Kiểm: `workSchema.test.ts` mở một DB ở schema cũ có lượt `edit` kèm đề xuất, sau migration vẫn còn lượt,
  đề xuất và liên kết `turn_id`, và chèn được lượt `chat`.
- [x] 1.3 Lưu và đọc lượt mới (`action = 'chat'`, `location_json`) và danh sách đề xuất theo `turn_id` trong
  `aiHistory`. Kiểm: test lưu rồi đọc một phiên có cả lượt cũ và lượt mới.

## 2. Tool đọc

- [x] 2.1 Mở rộng `ChatToolLibrary` với `readAlignment` và `listContextEntries`, rồi nối ở `createServices`.
  Kiểm: test tích hợp với kho thật trong thư mục tạm.
- [x] 2.2 `get_current_chapter`: trả vị trí của lượt, số đoạn mỗi phía, số đoạn đã dịch; không có văn bản.
  Kiểm: unit test với vị trí có và không có vùng chọn.
- [x] 2.3 `read_segments`:
  - đoạn kèm phía tương ứng theo liên kết;
  - đoạn chưa căn chỉnh ghi rõ;
  - lỗi khi ngoài phạm vi;
  - chịu trần ký tự.

  Kiểm: unit test cho đoạn có liên kết, chưa căn chỉnh, ngoài phạm vi, vượt trần.
- [x] 2.4 `list_glossary` và `list_addressing`: chỉ trả mục đã duyệt, có lọc và có trần số mục. Kiểm: test có
  mục `pending` và `rejected` không bị trả ra.

## 3. Tool ghi

- [x] 3.1 `propose_edit`:
  - đổi khoảng đoạn thành khoảng ký tự bằng `splitParagraphs`;
  - neo revision;
  - gọi `createChatProposalInDb` với `policy: 'review'` và `commandId = turnId:n`.

  Kiểm: test tạo đề xuất cho đoạn 7–9 và áp dụng ra đúng văn bản; test lỗi cho khoảng trống, ngoài phạm
  vi, văn bản trùng; gọi hai lần cùng `commandId` chỉ ra một đề xuất.
- [x] 3.2 Kiểm revision giữa lần đọc và lần ghi: chương đã đổi kể từ lần đọc gần nhất trong lượt thì tool trả
  "đọc lại". Kiểm: unit test đổi `rev` giữa hai lần gọi.
- [x] 3.3 `propose_translation`:
  - dùng đường đề xuất dịch theo đoạn;
  - lỗi khi đoạn gốc đã có bản dịch liên kết;
  - lỗi khi số đoạn trả về lệch số đoạn gốc.

  Kiểm: test ba trường hợp.
- [x] 3.4 `propose_glossary_term`: tạo mục `pending`, nguồn `ai`, không đụng mục đã duyệt. Kiểm: test glossary
  trước và sau.
- [x] 3.5 Trần `MAX_PROPOSALS_PER_TURN = 10`, và ngân sách ký tự tính cả văn bản tool ghi nhận vào. Kiểm: test
  lần gọi thứ 11 không tạo đề xuất và trả thông báo.

## 4. Vòng chat ở main

- [x] 4.1 `chatPrompt.ts`:
  - một system prompt theo D2;
  - vị trí người dùng ở cuối;
  - bỏ `ASK_ONLY`, `EDIT` và việc dựng `<context>`.

  Kiểm: test system prompt giống hệt nhau giữa hai lượt cùng tác phẩm, chỉ khác khối vị trí.
- [x] 4.2 `chatService.ts`:
  - dựng tool với `turnId` và hàm ghi;
  - phát `ChatChunk` `proposal` ngay khi tool ghi tạo xong.

  `createServices.ts`: bỏ `extractFence` và nhánh tạo đề xuất cuối lượt. Kiểm: `chatService.test.ts`
  dùng model giả gọi `propose_edit`, thấy chunk `proposal` đến trước `done`, và không có đề xuất nào sinh
  từ chữ của câu trả lời.
- [x] 4.3 Cập nhật `CHAT_TOOL_DEFINITIONS`:
  - `get_current_chapter` đứng đầu;
  - mô tả tool ghi nói rõ là chỉ tạo đề xuất.

  Kiểm: test định nghĩa tool khớp schema mong đợi.

## 5. Renderer

- [x] 5.1 `AiComposer`: bỏ chọn chế độ và phạm vi. `chatContext.ts` thay bằng `buildLocation()`, lấy chương,
  đoạn con trỏ và vùng chọn từ editor. Kiểm: unit test `buildLocation` với vùng chọn trên nhiều đoạn và
  không có vùng chọn.
- [x] 5.2 `summarizeTools(tools)` và dòng tóm tắt mở rộng được trong `AiTurn`; bỏ nhóm "Đã gửi kèm" cho lượt
  mới. Kiểm: unit test câu tóm tắt cho các tổ hợp đọc, tìm, tra, đề xuất, lỗi.
- [ ] 5.3 (Đã làm phần mã và chạy app với phiên seed: thẻ hiện dưới lượt chat, Chấp nhận đổi đúng đoạn trong
  editor và thẻ chuyển "Đã áp dụng". Còn bước hỏi một model thật, cần khóa của chủ sản phẩm, làm cùng 6.1.)
  Tách thẻ đề xuất từ hàng chờ trong `AiPanel` thành component dùng chung, rồi hiện nó dưới lượt chat theo
  chunk `proposal` và `queue`. Kiểm: chạy app (skill `run`) với fixture: hỏi "sửa đoạn đang chọn cho tự
  nhiên hơn", thấy thẻ đề xuất dưới câu trả lời, chấp nhận thì editor đổi đúng đoạn.
- [x] 5.4 Lượt cũ hiện nhãn chế độ và đề xuất cũ. Kiểm: mở một phiên cũ trong fixture, thấy lượt cũ đầy đủ, hỏi
  tiếp thì không có chế độ.

## 6. Đo, tài liệu và kiểm tra cuối

- [ ] 6.1 (Chưa đo: cần khóa model thật, người dùng chạy. Bảng chờ số đo đã có trong
  `hermes-chat-research.md`.) Chạy 5 câu hỏi mẫu trên fixture với model mặc định của Lab:
  - "chương này nói gì";
  - "đoạn đang chọn xưng hô đúng chưa";
  - "dịch đoạn 3–5";
  - "tìm chỗ dịch 魔王";
  - "thêm thuật ngữ".

  Ghi số vòng tool, ký tự đọc, số đề xuất và việc model có đọc trước khi trả lời hay không vào
  `docs/modules/proposals/hermes-chat-research.md`.
- [x] 6.2 Cập nhật `docs/modules/proposals/README.md` và `decisions.md` (tiếng Việt): chat không chế độ, đề
  xuất chỉ từ tool ghi, cách revert cần bản sao lưu. Kiểm: link tương đối trỏ tới file có thật.
- [x] 6.3 Chạy `node scripts/check.mjs --build`. Kiểm: mọi bước báo ok.
