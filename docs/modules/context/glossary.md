# Glossary: tên riêng và thuật ngữ

Cập nhật: 2026-10-04 · Trạng thái: đề xuất tổng hợp từ nghiên cứu.
Chủ trì: sản phẩm/ngôn ngữ. Câu hỏi: giữ nhất quán từ ngữ mà không thay sai ngữ cảnh thế nào?

## Đơn vị quản lý

Một mục đại diện cho **khái niệm hoặc thực thể**, không chỉ một cặp chuỗi tìm–thay. Cần phân biệt:

- Dạng nguồn chính và các alias: tên đầy đủ, tên gọi tắt, biệt danh, dạng chữ khác.
- Cách dịch ưu tiên và biến thể được phép; có thể có điều kiện theo ngữ cảnh.
- Cách dịch không dùng, kèm lý do và gợi ý thay thế nếu có.
- Mục giữ nguyên: tên, ký hiệu hoặc cách viết chủ ý không dịch.
- Ghi chú giải nghĩa, phạm vi hiệu lực, bằng chứng và trạng thái duyệt.

Không gộp “từ cấm” với “không gửi AI”: một cái là quy ước cho bản dịch, một cái là quyền sử dụng dữ liệu. Không mặc định mọi tên xuất hiện đều là thuật ngữ chuyên biệt.

## Những gì học được từ repo

GalTransl, AiNiee và Sakura cho thấy glossary ngắn, có ghi chú, chọn theo văn bản là phương án triển khai thực tế. LinguaGacha/OpenNovel gợi ý quy trình trích xuất rồi sửa/duyệt. Công cụ CAT gợi ý mô hình một khái niệm có nhiều dạng được phép và không được phép. Đây là quan sát về cơ chế, **không phải** bằng chứng chúng dịch Nhật–Việt tốt hơn.

MTLS có khóa glossary và kiểm xưng hô; cách fuzzy/regex không đủ để thay tự động an toàn. API_dich_truyen có hướng thay glossary trước khi gọi model trong miền Trung–Việt; không sao chép cách đó sang Nhật–Việt mà chưa thử mất nghĩa, chơi chữ và biến hình. Danh mục nguồn và giới hạn ở [bằng chứng](evidence.md).

## Khớp nguồn: sinh ứng viên trước, giải nghĩa sau

1. Chỉ xét mục được phép dùng ở phiên bản và mốc đang dịch.
2. Khớp dạng nguồn và alias; ưu tiên cụm dài khi hai mục chồng cùng vị trí.
3. Ghi vị trí khớp và dạng thực tế, không sửa nguyên tác trước khi dịch.
4. Nếu đồng âm/đồng dạng chỉ tới nhiều mục, giữ trạng thái mơ hồ hoặc dùng căn cứ cảnh; không chọn theo thứ tự lưu.
5. Trả lý do mục được chọn hoặc bị bỏ để kiểm tra lại.

Tiếng Nhật/Trung có thể bắt đầu bằng khớp chuỗi, nhưng một ký tự dễ trùng và tên có thể biến thể. Ngưỡng tối thiểu cùng cơ chế ép khớp cần đo. Với chữ Latin cần biên từ phù hợp Unicode; `\b` của regex không phải lời giải phổ quát. Chuẩn hóa Unicode/khoảng trắng cần giữ ánh xạ về vị trí văn bản gốc; không loại ruby hoặc ký hiệu trước khi xác định tác dụng.

Ràng buộc alias duy nhất toàn tác phẩm trong spec cũ quá chặt cho người trùng tên hoặc biệt danh dùng chung. Hướng đề xuất là cảnh báo xung đột và phân phạm vi/định danh, chưa chốt schema.

## Trích xuất và duyệt

Ứng viên có thể đến từ người nhập, tệp bên ngoài hoặc AI. AI cần nêu dạng nguồn, vị trí, nghĩa dự đoán, bản dịch đề xuất và lý do. Một tên chỉ xuất hiện trong output không đủ chứng minh có cặp nguồn–đích tương ứng.

Gộp ứng viên cần giữ bằng chứng và lịch sử, không chỉ giữ bản mới nhất. Tần suất giúp ưu tiên hàng duyệt nhưng không chứng minh đúng. Mục đã loại cần được nhớ để tránh đề xuất lặp lại; bằng chứng mới có thể mở lại với giải thích. Mục chưa duyệt không tự trở thành quy ước cho chương sau.

Nếu nhập CSV/TSV trong tương lai: phải có xem trước, ánh xạ cột, phát hiện trùng/mâu thuẫn và báo dòng lỗi. Chưa chọn định dạng trao đổi chính thức; không dùng import để tự duyệt hàng loạt mà không nói rõ.

## Kiểm bản dịch

Không thấy chuỗi đích ưu tiên là **cờ xem lại**, chưa chắc là bỏ sót: có thể dùng đại từ, biến thể được duyệt, lược tự nhiên hoặc thông tin nằm ở đoạn liền kề. Ngược lại, có đúng chuỗi chưa chắc đúng thực thể.

Soát phải giữ dấu tiếng Việt; quy tắc hoa/thường tùy tên và thuật ngữ. Mục giữ nguyên được miễn phù hợp khỏi cờ “còn chữ Nhật”, không miễn mọi đoạn CJK. Không fuzzy-replace, không tìm–thay toàn truyện khi đổi tên. Chỉ đề xuất các vị trí chịu ảnh hưởng để người dịch kiểm.

## Ca kiểm bắt buộc trước khi làm

- Tên dài chứa tên ngắn; alias chứa ký tự regex; tên một ký tự; hai người cùng tên.
- Giả danh được tiết lộ muộn; tên thật không được đẩy ngược vào chương trước.
- Cùng dạng nguồn nhưng khác nghĩa; một mục có nhiều cách dịch hợp lệ.
- Mục chờ duyệt/bị loại/không gửi không lọt vào prompt qua cả ghi chú hoặc summary.
- Đổi mục đã dùng và thêm mục mới đều tìm được vùng có thể chịu ảnh hưởng.

Nguồn chính: [R01–R06, R09 trong bản đồ nguồn](evidence.md).

[Về mục lục](README.md)
