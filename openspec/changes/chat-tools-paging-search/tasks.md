## 1. Tách đoạn và con trỏ

- [ ] 1.1 Thêm hàm tách văn bản thành đoạn kèm offset (dòng không trống, như `paragraphUnits`) dùng chung cho `read_chapter` và `search_work`; kiểm bằng unit test với CRLF, dòng trống liên tiếp và văn bản rỗng
- [ ] 1.2 Thêm mã hóa/giải mã con trỏ (chương, phía, đoạn, offset trong đoạn, rev) và kiểm hợp lệ; unit test cho con trỏ đúng, sai cú pháp, khác chương, đoạn ngoài phạm vi

## 2. `read_chapter` phân trang

- [ ] 2.1 Mở rộng định nghĩa tool với `from_paragraph` và `cursor` (loại trừ nhau) và cập nhật mô tả; test định nghĩa tool khớp schema mong đợi
- [ ] 2.2 Đọc theo trang với trần mỗi lần đọc, header một dòng (đoạn từ–đến/tổng, ký tự, rev, còn tiếp, con trỏ); test chương ngắn, chương dài đọc nối ba lần không lặp không sót (ghép lại bằng đúng `content`)
- [ ] 2.3 Xử lý đoạn đơn lẻ dài hơn trần bằng offset trong đoạn; test đoạn dài gấp đôi trần đọc hai lần ra đúng đoạn
- [ ] 2.4 Con trỏ của revision cũ: đọc từ đầu đoạn kèm cảnh báo rev cũ/mới; test bằng thư viện giả đổi `rev` giữa hai lần gọi
- [ ] 2.5 Lỗi rõ ràng cho đoạn ngoài phạm vi và con trỏ hỏng; test nội dung lỗi nêu tổng số đoạn

## 3. `search_work`

- [ ] 3.1 Thêm định nghĩa tool `search_work(query, side)` và kiểm tham số (1–100 ký tự sau trim); test chuỗi rỗng, chỉ khoảng trắng, quá dài
- [ ] 3.2 Quét các chương phía được chọn với chuẩn hóa NFC và không phân biệt hoa thường cho chữ Latin; trả tổng chỗ khớp, số chương khớp, tối đa 20 kết quả có số chương, tên, số đoạn, đoạn trích; test CJK hai chữ (`魔王`), Latin khác hoa thường, không có chỗ khớp, quá 20 chỗ khớp
- [ ] 3.3 Thêm hàm đọc liên kết của chương vào `ChatToolLibrary` và nối ở nơi dựng `ChatService`; test kiểu và test tích hợp với kho thật trong thư mục tạm
- [ ] 3.4 Gắn phía tương ứng từ liên kết (dùng `buildRows`): có liên kết, chưa căn chỉnh, liên kết `needs_review`/`broken`, segment lỗi thời; test từng trường hợp và test khẳng định không dùng đoạn cùng số thứ tự khi thiếu liên kết

## 4. Giới hạn mỗi lượt và panel

- [ ] 4.1 Nâng `MAX_TOOL_ROUNDS` lên 6 và thêm ngân sách 80.000 ký tự tool trả mỗi lượt, đếm trong `chatService` và truyền phần còn lại cho runner; test trong `chatService.test.ts` rằng khi hết ngân sách tool trả thông báo và lượt vẫn kết thúc bằng câu trả lời
- [ ] 4.2 Test vòng cuối không kèm danh sách tool với 6 vòng
- [ ] 4.3 Cập nhật `detail` cho từng loại kết quả (trang, tìm, lỗi, hết ngân sách); test chuỗi `detail` và kiểm trên panel bằng chạy app (skill `run`) rằng nhóm "AI đã đọc" hiện đúng từng dòng
- [ ] 4.4 Đo thời gian `search_work` trên tác phẩm fixture lớn nhất trong Lab (ghi số chương, tổng ký tự, ms) và ghi kết quả vào design.md; nếu vượt 200 ms thì thêm trần ký tự quét mỗi lần gọi kèm báo "đã tìm N/M chương"

## 5. Tài liệu và kiểm

- [ ] 5.1 Cập nhật `docs/modules/proposals/chat-panel-research.md` phần quan sát hiện trạng tool chat (tiếng Việt), ghi hành vi đã triển khai
- [ ] 5.2 Chạy `node scripts/check.mjs` và xác nhận typecheck, test, lint đều có bằng chứng đã chạy và đạt
