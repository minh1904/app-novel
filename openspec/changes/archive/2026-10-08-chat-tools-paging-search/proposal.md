## Why

Panel chat chỉ có hai tool `list_chapters` và `read_chapter`. `read_chapter` trả tối đa 20.000 ký tự
đầu chương rồi báo "đã cắt" mà không có cách đọc tiếp, nên với chương dài model chỉ thấy nửa đầu.
Không có tool tìm kiếm, nên câu hỏi kiểu "chương trước dịch 魔王 là gì?" buộc model đọc nguyên chương
(tốn token, thường không thấy chỗ cần) hoặc đoán. Đợt rà Hermes (2026-10-07) xếp hai việc này vào nhóm
làm sớm vì chúng cải thiện tính nhất quán của câu trả lời mà không phá nguyên tắc tool chỉ đọc.

## What Changes

- `read_chapter` đọc theo trang: nhận vị trí bắt đầu (đoạn) hoặc con trỏ đọc tiếp; mỗi lần trả vị trí
  đã đọc (đoạn từ–đến trên tổng), cờ còn tiếp, con trỏ cho lần sau và revision văn bản. Giữ trần dung
  lượng mỗi lần đọc, kể cả khi một đoạn đơn lẻ dài hơn trần. Không bao giờ cắt im lặng.
- Con trỏ của một revision cũ vẫn dùng được nhưng kết quả báo rõ văn bản đã đổi kể từ lần đọc trước.
- Tool mới `search_work(query, side)`, chỉ đọc, phạm vi buộc vào tác phẩm đang mở như hai tool hiện có.
  Kết quả gồm chương, số đoạn, đoạn trích quanh chỗ khớp, và **đoạn tương ứng ở phía kia** lấy từ liên
  kết căn chỉnh; không có liên kết thì nói rõ là chưa căn chỉnh, không đoán theo số thứ tự đoạn. Giới
  hạn số kết quả trả về và báo tổng số chỗ khớp.
- Tìm bằng so khớp chuỗi con trên văn bản đã lưu; chỉ mục FTS5 (bigram CJK) là lựa chọn triển khai về
  sau, không chặn change này.
- Nâng số vòng gọi tool mỗi lượt chat và thêm ngân sách tổng ký tự tool trả về mỗi lượt, để phân trang
  không biến thành đọc cả tác phẩm.
- Dòng "AI đã đọc" trên panel mô tả đúng từng lần gọi: trang nào, còn tiếp không, tìm gì, bao nhiêu chỗ
  khớp.

## Capabilities

### New Capabilities
- `ai-chat-tools`: Các tool chỉ đọc mà model trong panel chat được tự gọi trong tác phẩm đang mở: liệt
  kê chương, đọc chương theo trang, tìm trong tác phẩm; giới hạn vòng gọi và dung lượng mỗi lượt; cách
  mỗi lần gọi hiện trên panel.

### Modified Capabilities

(không có — chưa có spec chính nào trong `openspec/specs/` mô tả tool chat)

## Impact

- Mã: `src/main/services/ai/chatTools.ts` (định nghĩa và runner tool), `src/main/services/ai/chatService.ts`
  (`MAX_TOOL_ROUNDS`, ngân sách ký tự mỗi lượt), giao diện `ChatToolLibrary` thêm hàm đọc liên kết của
  chương (dùng lại `listLinks`/`buildRows` trong `src/main/infra/storage/`), và nơi dựng `library` cho
  `ChatService`.
- Không đổi schema SQLite, không thêm IPC; tool chạy trong main như hiện nay.
- Hợp đồng `ChatEmit` kind `tool` giữ nguyên dạng `{ name, detail }`; chỉ nội dung `detail` giàu hơn.
- Prompt chat: mô tả tool đổi; system prompt chat không đổi nên cache không bị ảnh hưởng ngoài phần
  danh sách tool.
- Liên quan tài liệu: `docs/modules/proposals/chat-panel-research.md` (phân biệt "Đã gửi kèm" với "AI
  đã đọc").
