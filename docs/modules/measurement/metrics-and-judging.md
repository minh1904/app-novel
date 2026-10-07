# Phép đo và chấm

Cập nhật: 2026-10-08 · Trạng thái: T0/T3 đã có công cụ; T1 có khung nhưng chưa hiệu chuẩn A/A bằng
judge ngoài họ Gemini. Hai trục báo cáo, đo lặp và lớp phép kiểm của Mira Lab **đã triển khai**
(mục cuối).

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

## Hai trục báo cáo, đo lặp và lớp phép kiểm (đã triển khai 2026-10-08)

Change OpenSpec `lab-completion-quality-report`; lý do ở
[đối chiếu harness](../context/harness-review.md). Logic thuần ở
[`labOutcomes.ts`](../../../src/shared/algorithms/labOutcomes.ts).

**Kết cục từng đoạn.** Mỗi lần dịch của Lab ghi cho từng đoạn định dịch đúng một kết cục:
`translated`, `refused` (kèm chữ gốc của nhà cung cấp, ví dụ `PROHIBITED_CONTENT`), `missing` (thiếu
sau khi hỏi lại, lỗi mạng hay hạn mức), `request_error` (lô bị từ chối vì `invalid_request`, tức cấu
hình hay tham số) và `not_run` (lô sau một lỗi dừng lượt, hoặc chương không tới được vì chạm ngân sách).

**Hoàn thành** tính trên toàn tập định dịch, không loại đoạn nào: số và tỷ lệ từng kết cục, lý do bị
chặn, token, USD, giây. Lần chạy ghi trước khi có kết cục được nhãn “không có kết cục từng đoạn”, không
coi là hoàn thành 100%.

**Chất lượng** chỉ tính trên các đoạn `translated` ở **mọi** biến thể đem so (khóa chương + id đoạn).
Báo cáo in “Chất lượng đo trên X/Y đoạn; loại N đoạn: A refused 1, …”; giao rỗng thì không đưa chỉ số
chất lượng. Đoạn không hoàn thành chỉ xuất hiện ở phần Hoàn thành, không bị tính 0 điểm. Lần đo ghi
`basis` (biến thể, số đoạn so được, số bị loại theo biến thể và kết cục). Khi có biến thể chưa có kết cục
(lần chạy cũ), phần Chất lượng đo theo chương như trước và nói rõ điều đó.

**Lớp phép kiểm** (`METRIC_TIERS`): `gate` là lỗi chứng minh được bằng code (chương lệch số đoạn,
đoạn thiếu) và là lớp duy nhất dùng để kết luận một cấu hình hỏng; `flag` là heuristic có thể báo nhầm
(glossary, tên, xưng hô, độ dài, CJK sót), hiện là “cờ” chứ không phải “lỗi”; `judge` là T1, `human`
là T3.

**Quy tắc kết luận.** `compare` chỉ đánh dấu một chỉ số “khác biệt” khi cả hai bên có ít nhất 2 lần lặp
và khoảng [min, max] không chồng nhau; ngược lại ghi “chưa đủ lần lặp” hoặc “chưa phân biệt được”, kèm
số thô (n, min–max, trung bình ± độ lệch chuẩn mẫu). Không có ngưỡng nhiễu cố định. Với một lần chạy mỗi
bên, mọi chỉ số đều là “chưa đủ lần lặp”.

**Lần chạy hỏng.** Lịch sử tách vào mục “Lần chạy hỏng” những lần chạy không có lần đo nào và mọi lời gọi
lỗi HTTP (như `v5-nothink+lite35`, 400 do mức thinking), hoặc có `request_error` từ một nửa số đoạn trở
lên; biến thể chỉ có lần chạy hỏng không vào bảng so sánh chính. Bảng lần đo có cột “Cơ sở” (số đoạn so
được, hoặc “theo chương”).

**Bộ đo cũ** (`scripts/bench/compare.run.ts`) chỉ có số T0 theo chương: khi cả hai lần chạy có
`outcomes.json` thì loại cả chương có đoạn không dịch được ở một bên; thiếu thì giữ giao chương và in
“Chỉ lấy giao chương, chưa loại đoạn bị từ chối” ở đầu phần T0.

[Về module Bộ đo](README.md)
