# Dữ liệu, duyệt và truy vết

Cập nhật: 2026-10-04 · Trạng thái: mô hình khái niệm đề xuất, không phải migration.
Chủ trì: kỹ thuật/sản phẩm. Câu hỏi: làm sao sửa ngữ cảnh mà vẫn biết lần dịch cũ đã dùng gì?

## Thông tin tối thiểu của một mục

| Nhóm | Nội dung cần diễn đạt |
| --- | --- |
| Danh tính | ID ổn định trong tác phẩm, loại mục, đối tượng được mô tả |
| Nội dung | dữ liệu chuyên biệt: glossary, nhân vật, quan hệ, style hoặc sự kiện |
| Phạm vi | tác phẩm/chương/cảnh, mốc hiệu lực và giới hạn tri thức khi cần |
| Nguồn | nhập tay, nhập ngoài, AI đề xuất; bằng chứng, model nếu có |
| Duyệt | chờ duyệt/đã duyệt/đã loại; người quyết định và lý do |
| Phiên bản | revision, nội dung trước và sau, quan hệ thay thế nếu cần |
| Gửi AI | cho phép hay không, điều kiện chọn; độc lập với trạng thái duyệt |

Sáu kiểu chung trong context-core là cách tổ chức logic hữu ích. Dùng một bảng nhiều cột nullable hay bảng chuyên biệt vẫn là quyết định kỹ thuật cần xem lại; tài liệu này không khóa schema.

## Vòng đời đề xuất

Ứng viên → kiểm bằng chứng và xung đột → duyệt hoặc loại → được xét vào snapshot khi đủ điều kiện. Chỉ “đã duyệt” chưa đủ: mục còn phải đúng phạm vi và được phép gửi. AI trích đúng nguyên văn cũng không mặc nhiên được auto-approve; chính sách đó còn mở.

Sửa một mục đang được dùng cần tạo phiên bản để lần chạy cũ còn truy ra nội dung. Không ghi đè lịch sử khiến snapshot cũ mang nghĩa mới. Các thao tác gộp alias, đổi danh tính hoặc đổi phạm vi phải báo tác động trước khi áp dụng.

## Snapshot một lần gọi

Đề xuất ghi: phiên bản nguồn/bản dịch liên quan, các mục và phiên bản đã dùng, lý do chọn, quy ước dịch, phiên bản template/thuật toán, khối gửi thực tế, phần bị cắt, provider/model/cấu hình và thông tin usage khi có. Không ghi khóa API.

Phân biệt hai dấu vết:

- **Dấu vết phụ thuộc ngữ cảnh:** mục nào ảnh hưởng lần dịch; hữu ích để tìm chỗ cần xem lại.
- **Dấu vết payload thực tế:** toàn bộ nội dung thực sự gửi, gồm nguồn, phần lân cận và lịch sử có dùng; hữu ích để kiểm tra/tái dựng request.

Hash không chứa dữ liệu gốc và không đủ tái dựng prompt. Hash cũ chỉ tính A/B/glossary, bỏ raw và đoạn trước, không thể đồng thời cam kết “cùng hash là cùng toàn bộ request”. Cần đặt tên/phạm vi hash rõ và giữ snapshot hoặc dữ liệu phiên bản tương ứng. Tái dựng cùng request cũng không bảo đảm model sinh lại cùng output.

Snapshot có thể chứa truyện riêng tư: lưu trong dữ liệu tác phẩm theo chính sách cần chốt, không đưa mặc định vào telemetry, log công khai hay repo nghiên cứu. Cần quyết định thời hạn lưu và xuất/xóa lịch sử.

## Đổi mục thì đánh dấu gì?

Với mục từng được dùng, tra ledger theo ID + phiên bản và kiểm phạm vi hiện tại. Với **mục mới hoặc alias mới**, ledger cũ chưa có ID đó: phải khớp lại nguồn liên quan hoặc có chỉ mục đủ để phát hiện ảnh hưởng. Chỉ so danh sách ID cũ sẽ bỏ sót trường hợp này.

Đổi thứ tự chương, mốc hiệu lực, quyền gửi hoặc chính sách chọn cũng có thể đổi ngữ cảnh dù nội dung mục không đổi. Cache cần gắn với revision tương ứng, không chỉ `entriesRev` nếu thuật toán hoặc cấu trúc chương đã đổi.

Kết quả là danh sách cần xem lại, không lệnh dịch lại hay sửa chữ. Độ mịn theo lô/vùng/đoạn và liên kết tới bản dịch đã được người dùng chỉnh phải thống nhất với module editor/đề xuất. Không khôi phục ID câu vĩnh viễn để giải quyết vấn đề này.

## Xóa, sắp lại và phục hồi

- Xóa nhân vật: báo các cặp và bằng chứng phụ thuộc; xóa/lưu trữ chúng trong thao tác nhất quán, không để tham chiếu hỏng. Cách bảo toàn lịch sử cần chốt trước khi dùng cascade.
- Xóa chương làm mốc: không biến `NULL` thành “từ đầu/đến vô hạn” một cách âm thầm. Đề xuất đánh dấu mốc mất, yêu cầu chọn lại hoặc vô hiệu hóa mục liên quan cho tới khi rõ.
- Sắp lại chương: tính lại phạm vi theo thứ tự mới, cảnh báo mâu thuẫn; không suy toàn bộ thời gian truyện từ thứ tự chương.
- Backup/restore: mang đủ mục, alias, bằng chứng, revision và snapshot theo chính sách; thử phục hồi trên tác phẩm có đổi quan hệ giữa truyện.
- Tác phẩm cũ: mở được với ngữ cảnh rỗng; migration không được tự suy dữ liệu hoặc thay bản dịch.

Renderer chỉ đi qua API có kiểu ở main; truy vấn/lưu và transaction thuộc tầng storage. Hàm chọn/khớp/lắp thuần không đọc DB hay mạng. Mọi mutation cần validation và kết quả lỗi rõ, phù hợp ranh giới kiến trúc hiện hành.

Nguồn: [R02, R09–R10](evidence.md). Đây là phần rà soát bổ sung các rủi ro của thiết kế cũ, chưa sửa OpenSpec hoặc database.

[Về mục lục](README.md)
