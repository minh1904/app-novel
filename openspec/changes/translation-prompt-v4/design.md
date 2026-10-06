## Context

Người dùng yêu cầu chạy và cải thiện phiên bản mới sau khi đọc các lỗi xưng hô. Cặp đã duyệt có ưu tiên cao hơn bộ mặc định; không bổ sung ngoại lệ chỉ để hợp thức hóa lỗi model.

## Decisions

- v4 kế thừa v3, thêm `xung` và `goi` trước `dst`; đây là giá trị chuẩn bị cho câu dịch, không phải lời thoại phải chèn vào mọi câu. Giữ `noi` để hỗ trợ chấm.
- `goi` ưu tiên đại từ ngôi hai riêng nếu cặp có khai; tên và kính ngữ theo cách gọi đã duyệt. Không rõ vai thì dùng `?`, không đoán chỉ để đủ trường.
- Chỉ thay prompt thử nghiệm. Các trường phụ không được ghi vào bản dịch cuối.
- Đối chứng `v3-nothink+t1-full` và `v4-nothink` dùng gemini-3.1-flash-lite, thinking tắt, inputTokenLimit 16000, cùng chương 1–10 và ngữ cảnh. Giữ bản cũ.
- `pairs` là cờ kiểm tra, có nhiễu từ đại từ phản thân/ngôi ba và nhãn model. Đọc tay các câu lỗi đã xác nhận; công bố giới hạn, không gọi tỷ lệ cờ là tỷ lệ lỗi thật.

## Risks

Thêm trường làm tăng token ra và chưa bảo đảm model dùng đúng. Một lần chạy mỗi điều kiện chỉ là kết quả sơ bộ; không tự đổi mặc định sản phẩm.
