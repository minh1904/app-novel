# Phép đo và chấm

Cập nhật: 2026-10-04 · Trạng thái: T0/T3 đã có công cụ; T1 có khung nhưng chưa hiệu chuẩn A/A bằng
judge ngoài họ Gemini.

## T0 — phép kiểm tất định

T0 ghép nguồn–đích rồi báo sót, dư, gộp, tách, chữ nguồn còn lại, ngoặc thoại, kiểu thoại, độ dài,
lặp, glossary và assertion viết tay. Đây là tín hiệu có thể tái hiện, không phải phán quyết về toàn
bộ chất lượng.

- Khớp glossary chặt đo đúng chuỗi ưu tiên.
- Khớp chấp nhận được tính cả biến thể đã duyệt; phù hợp hơn khi đánh giá sản phẩm.
- Độ dài bất thường và CJK còn sót chỉ là cờ xem lại.
- Xưng hô cần biết vai người nói/người nghe; regex đại từ không đủ xác nhận lỗi.

Module QA có thể gọi cùng analyzer nhưng tự phân severity, giải thích và quyền bỏ qua. Bộ đo không
được dùng việc “mã dùng chung” để sở hữu UX QA.

## T1 — judge LLM tùy chọn

Judge so cặp mù A/B theo đoạn, nhận cả ngữ cảnh chương, đổi vị trí A/B và chỉ tính thắng khi hai
chiều nhất quán. Model judge phải khác họ model dịch, trừ khi người chạy bỏ qua tường minh và báo
cáo ghi lại.

T1 không chấm glossary bằng chuỗi; việc đó thuộc T0. Một phản hồi không đọc được được thử lại một
lần rồi ghi “không chấm được”, không đổi thành hòa. Kết quả T1 chỉ đáng dùng sau khi đo A/A và đối
chiếu với người chấm; thiếu bước này phải ghi là chưa hiệu chuẩn.

## T3 — người chấm mù

Trang offline ẩn điều kiện/model/prompt và xáo A/B cho từng mẫu. Mẫu phải phân tầng theo chương và,
khi dữ liệu cho phép, theo ca thường, glossary, xưng hô và ca bị công cụ gắn cờ. Báo cáo giữ kết quả
từng tầng; không loại im lặng ca khó khỏi tỷ lệ tổng.

Kappa và tỷ lệ đồng ý chỉ mô tả quan hệ giữa judge và người trên mẫu đã chấm. Dưới 50 mẫu chung,
báo số thật kèm nhãn chưa đủ đặt ngưỡng; 50 không phải luật đảm bảo độ tin cậy cho mọi corpus.

## So sánh và quyết định

Lệnh so luôn xuất metrics thô trên các chương chung. Policy `legacy-e6` có thể sinh khuyến nghị
`keep/no-keep/insufficient` cho thí nghiệm bảo toàn cấu trúc cũ, nhưng không là cổng chung.

Mỗi experiment phải khai trước mục tiêu chính:

| Loại thay đổi | Chỉ số chính |
| --- | --- |
| Prompt/chia lô | bảo toàn nội dung, lỗi cấu trúc, nghĩa |
| Glossary | tuân thủ chấp nhận được, sai nghĩa và báo nhầm |
| Xưng hô | đúng vai/người nghe do người chấm xác nhận |
| Văn phong | chấm mù của người, cùng kiểm soát lỗi nghĩa |
| Thinking/model | nghĩa, sót nội dung, chi phí và độ trễ |

Quyết định cuối thuộc chủ sản phẩm/người đánh giá và phải nêu trade-off, không chỉ chép nhãn của
một hàm.

[Về module Bộ đo](README.md)
