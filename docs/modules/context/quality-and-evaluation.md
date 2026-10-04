# Chất lượng và kế hoạch kiểm chứng

Cập nhật: 2026-10-04 · Trạng thái: tổng hợp kết quả cũ và đề xuất phép thử; chưa có kết quả mới.
Chủ trì: người đánh giá/QA. Câu hỏi: module có thật sự giúp dịch tốt hơn không?

## Ba loại kết quả không được gộp

| Loại | Chứng minh được | Giới hạn |
| --- | --- | --- |
| Kiểm xác định bằng luật | mục bị cấm lọt ra, thiếu ID, nội dung ngoài quyền gửi, dấu vết dùng mục | khớp chuỗi không chứng minh đúng nghĩa hay đúng vai |
| Chấm AI độc lập | sàng lọc lỗi nghĩa/văn phong có dẫn chứng | có thể sai; không lấy output model làm chuẩn người dịch |
| Người đọc Nhật–Việt chấm mù | xác nhận lỗi, lựa chọn hợp lệ và hiệu ứng ngữ cảnh | cần đủ mẫu, rubric và báo mức đồng thuận |

Theo hướng MQM-lite cũ, mỗi issue nên có loại, mức độ, bằng chứng nguồn–đích, phạm vi và trạng thái xử lý. Phân biệt cờ tự động, lỗi được xác nhận và sở thích biên tập. Không tự chặn save/export hoặc sửa văn bản chỉ vì checker báo.

## Rubric tối thiểu

- Đúng nội dung, không thêm sự kiện không có căn cứ, không mất ý.
- Đúng người nói/người nghe/người được nhắc và quan hệ tại cảnh.
- Tuân lựa chọn hậu tố, tên và glossary đã duyệt; phân biệt sai style với sai nghĩa.
- Giữ chuyển giọng hoặc chuyển cách gọi có chủ ý.
- Tiếng Việt đọc tự nhiên nhưng không dùng “trôi chảy” để bỏ qua sai chủ thể.
- Không rò thông tin tương lai, mục riêng tư hoặc ứng viên chưa duyệt.

Minh thị hóa thông tin bị lược có bằng chứng không tự là bịa; dài hơn nguyên tác không tự là lỗi. Tỷ lệ độ dài thấp chỉ là tín hiệu. CJK còn lại có thể là mục giữ nguyên, ruby hoặc chơi chữ, không được tự “repair” bằng thay chuỗi.

## Bộ thử phải có cả trường hợp đúng dễ bị báo nhầm

| Nhóm | Ca cần có |
| --- | --- |
| Glossary | alias chồng, đồng dạng khác nghĩa, biến thể hợp lệ, đại từ thay tên, dấu/hoa/thường, tên giữ nguyên |
| Xưng hô | thoại không nêu tên, ba người, đổi người nghe, tự xưng/ngôi hai mơ hồ, lời dẫn và thoại khác giọng |
| Kính ngữ | bốn nhóm lựa chọn, chức danh độc lập, bỏ hậu tố có dụng ý, người thứ ba, lời trích lồng |
| Thời gian | hồi tưởng, giả danh, tiết lộ sau, quan hệ đổi giữa chương |
| Dữ liệu | pending/rejected/private không ra ngoài; xóa/sắp lại chương; restore; snapshot cũ còn đọc được |
| Lắp context | cùng input cùng payload; vượt trần báo phần cắt; thiết yếu quá lớn báo lỗi; thứ tự song song không đổi snapshot |

Ca tự soạn dùng kiểm logic phải dán nhãn; corpus phong cách và tập gold không chứa ca tự soạn hoặc AI. Chia mẫu nghiên cứu/chỉnh prompt và mẫu giữ lại đánh giá theo tác phẩm khi có thể; không lấy chính mẫu đã dùng làm ví dụ để chứng minh tổng quát hóa.

## Thí nghiệm ưu tiên

Giữ nguyên nguồn, model/cấu hình và quy trình chấm; mỗi phép chỉ đổi một yếu tố. Số lần lặp, kích thước mẫu, tiêu chí giữ/bỏ và chi phí phải ghi trước khi chạy, không suy ngưỡng đạt từ vài ca đẹp.

| Mã | So sánh | Đo chính |
| --- | --- | --- |
| E1 | Không glossary / glossary đã duyệt và khớp | sai tên/thuật ngữ, lỗi nghĩa, token |
| E2 | Không ma trận / A→B đã duyệt | sai vai và tỷ lệ không đủ căn cứ |
| E3 | Chỉ mặc định / ngoại lệ cảnh | bỏ mất chuyển giọng, cờ drift báo nhầm |
| E4 | Giữ / Việt hóa / kết hợp với cùng nguồn | chức năng quan hệ trước, tuân phong cách sau |
| E5 | Snapshot đúng / cố ý có ứng viên sai hoặc tiết lộ tương lai | lỗi lan truyền và lộ thông tin; chỉ thử trong fixture được kiểm soát |
| E6 | Không mẫu / mẫu người dịch hợp lệ / style note | giọng, nghĩa, công duyệt và nhiễu |
| E7 | Glossary lọc / toàn bộ; không cache / cấu hình cache | chất lượng, usage, cache hit, độ trễ, chi phí |
| E8 | Bộ phát hiện trên ca đúng và lỗi đã xác nhận | precision, recall, báo nhầm, bỏ sót, không đủ căn cứ |

Các mã E ở đây chỉ là mã bảng của module, **không phải** mã quyết định E6 trong implementation harness. Các phép T1–T7 và V1–V6 cũ được ánh xạ tại [bản đồ nguồn](evidence.md).

Không có ca áp dụng thì báo N/A và số mẫu, không cho điểm 100%. Nếu kết quả chưa đủ phân biệt, kết luận “chưa đủ dữ liệu”, không chọn theo cảm giác model trả lời hay hơn.

## Kết quả cũ thực sự cho thấy gì?

[Báo cáo chất lượng](../../handbook/research/translation-quality.md) ghi thí nghiệm B2a trên 5 chương Nhật, mỗi chương 3 lượt: quy ước prompt sửa được trình bày thoại ở 15/15 lượt, nhưng vẫn còn vấn đề tên và quan hệ; báo 14 ID thiếu so với 0 ở baseline, alignment đạt 7/15 so với 11/15, output tăng khoảng 37% và thời gian khoảng 1,6 lần.

Đó là số liệu của báo cáo cũ, chưa tái chạy ở đợt tổ chức tài liệu này. **Thiếu ID không đồng nghĩa đã chứng minh mất 14 câu về nghĩa**: có thể gộp nội dung sang đoạn khác; cần đối chiếu. Mẫu nhỏ và một cấu hình không chứng minh nguyên nhân tổng quát. Bài học đủ chắc để giữ: phải đo đồng thời lợi ích văn phong, bảo toàn nội dung và chi phí.

Không lấy trạng thái file harness đang phát triển làm bằng chứng các phép thử trên đã chạy. Nghiệm thu module cần kết quả test thuần, tích hợp ghi nhận request, và đánh giá bản dịch riêng; mock kiểm nội dung gửi được nhưng không chứng minh chất lượng ngôn ngữ.

Trong lúc tổng hợp, báo cáo nguồn được bổ sung mục **B3 — tắt thinking** bởi công việc khác trong workspace: mục đó báo lỗi cấu trúc tăng và tuân thủ glossary giảm trên tám chương chung. Bộ tài liệu này chưa kiểm artifact chạy, cách ghép đoạn hoặc request thực tế của B3, nên ghi nhận đây là báo cáo cần thẩm định, không tự nâng thành ràng buộc “mọi model luôn phải bật thinking”. Khi dùng để quyết định cấu hình, cần đối chiếu dữ liệu chạy và chấm nghĩa ngoài các chỉ số cấu trúc.

Hợp đồng phép đo, cách vận hành và kết quả đã rà soát nằm tại
[module Bộ đo](../measurement/README.md). Context chỉ khai mục tiêu và oracle đặc thù; Bộ đo sở hữu
cơ chế chạy/chấm, còn quyết định giữ hay bỏ vẫn thuộc người đánh giá.

[Về mục lục](README.md)
