# Kết quả và quyết định

Cập nhật: 2026-10-04 · Trạng thái: kết quả lịch sử của fixture hiện có; không phải ngưỡng vĩnh viễn.

## V14 — định nghĩa đoạn

Baseline B1 chạy 8 chương, 4 tác phẩm, 507 đoạn nguồn và 3 lần/chương. Có 20/24 lần khớp đúng số
đoạn. Bốn lần lệch ở tiếng Nhật đến từ output model tự gộp/tách dòng; định nghĩa cũ theo cụm dòng
trống sẽ gộp mất 95 dòng trong 5 chương Nhật.

Quyết định: giữ định nghĩa ADR-005 “mỗi dòng không trống”. Phép ghép của Bộ đo xử lý lệch để chấm;
không thay đổi nội dung hay đơn vị lưu của sản phẩm.

## B2a — thêm quy ước tiếng Việt vào prompt

Trên 5 chương Nhật × 3 lượt, báo cáo lịch sử ghi trình bày thoại tốt hơn nhưng cấu trúc/alignment
xấu hơn baseline. Thiếu ID không tự chứng minh mất đúng từng ấy câu về nghĩa vì model có thể gộp
nội dung; cần đọc cặp và chấm nghĩa. Kết quả đủ để bác việc giữ prompt B2a nguyên dạng, không bác
mọi quy ước tiếng Việt.

## B3 — tắt thinking

So với B1 trên 8 chương chung, báo cáo T0 lịch sử ghi lỗi cấu trúc tăng từ 6 lên 1.010 và tuân thủ
glossary chặt giảm từ 69,3% xuống 26,4%. Theo policy `legacy-e6`, đây là `no-keep`.

Giới hạn: một model/cấu hình, ba lượt mỗi chương, chưa có T1/T3 hiệu chuẩn. Quyết định đúng phạm vi
là **không tắt thinking cho cấu hình Gemini 2.5 Flash đã thử**; không suy thành “mọi model luôn phải
bật thinking”.

## Chưa hoàn thành về mặt nghiên cứu

- Chưa chạy A/A bằng judge thuộc họ ngoài Gemini.
- Chưa có ít nhất 50 mẫu chung để đặt ngưỡng tin judge–người.
- Glossary/xưng hô fixture chưa phải corpus người dịch đã xác minh đầy đủ.
- Chưa có kết quả cho Context foundation; Bộ đo chỉ cung cấp hạ tầng để chạy phép đó.

[Về module Bộ đo](README.md)
