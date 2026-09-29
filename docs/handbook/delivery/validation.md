# Kế hoạch kiểm chứng sản phẩm

Cập nhật: 2026-09-29 · Trạng thái: **kế hoạch đề xuất; chưa có kết quả benchmark/phỏng vấn**. Chủ trì: research + engineering.

## Kiểm chứng nhu cầu

Đề xuất bắt đầu với 5–8 dịch giả cá nhân: người dịch thủ công, người hậu biên tập và người làm Trung–Việt bằng bộ từ điển. Cần có trải nghiệm Anh/Trung/Nhật, không suy rộng từ một người hoặc một cặp ngôn ngữ. Đây là nghiên cứu định tính, không đại diện thống kê thị trường.

Cho họ kể và làm lại một chương gần nhất: lấy bản gốc từ đâu, viết ở đâu, tra tên thế nào, lưu và xuất thế nào, lỗi gì khiến phải làm lại. Quan sát thao tác trước khi giới thiệu Mira. Hỏi lúc nào cần nhìn toàn chương, lúc nào cần so câu; không hỏi dẫn dắt “bạn có thích hai mode không?”.

Sau demo, dùng cùng bài trên công cụ hiện dùng và Mira theo thứ tự luân phiên: sửa đoạn thoại, đổi tên riêng, phát hiện thiếu ý, đóng/mở, xuất. Ghi thời gian thao tác, lỗi còn lại, công sửa liên kết và lý do chọn công cụ. Với mức sẵn sàng trả tiền, ghi phương án đang trả và lựa chọn cụ thể; chưa lấy lời khen demo làm bằng chứng mua.

## Corpus đề xuất

| Nhóm | Trường hợp bắt buộc |
| --- | --- |
| Ngôn ngữ | EN, ZH-Hans, ZH-Hant, JA nguồn; VI đích; báo kết quả từng nhóm |
| Ranh giới câu | Thoại, ngoặc kép, viết tắt, dấu ba chấm, tên, tiêu đề, đoạn ngắn |
| Quan hệ dịch | 1:1, 1:n, n:1, n:m, bỏ câu, thêm câu, đảo đoạn, viết lại thoát ý |
| Văn bản | Tiếng Việt có dấu, emoji/surrogate, ký tự tổ hợp, newline LF/CRLF, file rỗng |
| Markdown | Heading, emphasis, separator; các cấu trúc ngoài scope phải có xử lý rõ |
| Quy mô | Đề xuất fixture 2k/10k/50k ký tự để đo; điều chỉnh theo chương thật, chưa phải ngưỡng hỗ trợ công bố |

Mỗi fixture ghi nguồn/quyền sử dụng, ngôn ngữ, độ dài, phiên bản, bản gốc/dịch chuẩn, các liên kết mong đợi và ca mơ hồ. Không tải truyện riêng của người tham gia lên repo. Dùng người thứ hai kiểm tra tập mẫu khi có thể; không giả vờ văn học luôn chỉ có một đáp án alignment đúng.

## Bộ bài nghiệm thu

| Test ID / liên quan | Thao tác | Kết quả cần đạt |
| --- | --- | --- |
| V01 / MIR-01,06 | Nhập TXT/MD, preview, lưu, xuất | Nội dung/định dạng trong scope được giữ; chuẩn hóa nếu có phải theo spec |
| V02 / MIR-02 | Sửa toàn văn → sửa segment → quay lại, undo/redo | Không mất/nhân đôi; undo đưa nội dung về phiên bản kỳ vọng |
| V03 / MIR-03,07 | Ghép/gộp/tách/bỏ liên kết, sửa đoạn làm range dịch chuyển | Liên kết còn hợp lệ hoặc được đánh dấu cần review; không tự nhận đã xác nhận |
| V04 / MIR-08 | Sửa nguồn bằng thao tác riêng và hoàn tác | Có lịch sử, bản dịch nguyên vẹn, vùng ảnh hưởng rõ |
| V05 / MIR-05 | Đóng cưỡng bức trước/trong/sau điểm lưu | Khôi phục trạng thái nhất quán cuối đã xác nhận lưu; không báo lưu thành công trước khi bền vững |
| V06 / MIR-05 | Backup → mở trên profile sạch → restore; thử gói lỗi/schema không hỗ trợ | Khôi phục văn bản và metadata; từ chối an toàn, không ghi đè kho đang dùng khi lỗi |
| V07 / MIR-04 | Tên giống nhau ở hai tác phẩm, sửa glossary | Phạm vi đúng; không thay hàng loạt bản dịch âm thầm |
| V08 / P0 | Tắt mạng, chạy toàn vòng sau cài đặt | Đọc/sửa/lưu/nhập/xuất/restore hoạt động; không cần đăng nhập hoặc AI |
| V09 / UX | Nhập tiếng Việt IME, bàn phím, zoom, chương dài | Không mất composition/focus; đo độ trễ và vùng cuộn |
| V10 / brand | Build sạch, kiểm tra title, bridge, installer/profile khi có build phát hành | Mira nhất quán; ghi riêng kết quả nâng cấp bản cũ nếu có |

## Cách đo và quyết định

Không mất nội dung đã xác nhận lưu là điều kiện bắt buộc. So sánh text và metadata version với oracle fixture; không chỉ nhìn screenshot. Ghi mọi khác biệt newline/normalization đã cho phép, không tùy tiện coi mọi byte khác là lỗi hoặc bỏ qua mọi byte khác.

Đối với alignment: đo precision của nhóm tự đề xuất, coverage, số vùng cần sửa, thời gian review và lỗi liên kết chưa bị phát hiện. Precision cao nhưng coverage rất thấp chưa chứng minh hữu ích. Chưa khóa ngưỡng số trước khi có baseline; báo theo ngôn ngữ và dạng quan hệ.

Đối với UX/performance: thời gian hoàn thành vòng, lỗi cần hỗ trợ, thời gian mở/chuyển mode, độ trễ gõ/cuộn, RAM và kích thước installer trên máy ghi cấu hình. Không gộp tiến độ dịch với coverage căn chỉnh.

Mỗi lần chạy ghi build/commit, OS/phần cứng, fixture, điều kiện mạng, bước tái hiện, actual/expected, log và kết luận pass/fail/blocked. Dùng [mẫu kiểm chứng](../maintenance/templates.md). Chỉ mở mốc tiếp khi có bằng chứng; chưa thực thi các bài này trong lần đóng handbook.

---

[Mục lục handbook](../README.md)
