# Fixture và quyền sử dụng

Cập nhật: 2026-10-04 · Trạng thái: hợp đồng đang dùng bởi Bộ đo.

## Hai vùng dữ liệu

- `fixtures/public/`: chỉ chứa văn bản có căn cứ quyền sử dụng và metadata nguồn.
- `fixtures/private/`: raw có bản quyền và mọi output chi tiết; bị Git bỏ qua. Thiếu thư mục này
  không làm các phép kiểm công khai thất bại.

Mỗi tác phẩm có metadata, glossary oracle, ma trận xưng hô oracle và các chương. Mỗi chương có nguồn,
metadata, assertion và có thể có bản tham chiếu. “Oracle” nghĩa là dữ liệu phục vụ một phép đo cụ
thể; nó **không phải** schema database của module Context.

## Trạng thái và provenance

Glossary, ma trận xưng hô, assertion và reference phải nói rõ ai tạo, đã được duyệt tới đâu và dùng
được cho phép đo nào. Output AI không trở thành reference người dịch. Credit không tự chứng minh
bản dịch đúng hoặc cấp quyền phát hành lại.

Các mục nháp có thể dùng để thăm dò nhưng báo cáo phải gắn nhãn; không dùng tỷ lệ glossary từ bảng
nháp như cổng quyết định sản phẩm. Khi Context có schema thật, Bộ đo nhận dữ liệu qua adapter hoặc
snapshot xuất ra, không bắt sản phẩm lưu theo `glossary.json`/`pronouns.json`.

## Định nghĩa đoạn

Đoạn nguồn là mỗi dòng không trống sau khi chuẩn hóa CR/LF; dòng chỉ có khoảng trắng hoặc U+3000 là
trống. V14 đã kiểm trên 507 đoạn thuộc 8 chương; xem [kết quả](results.md#v14--định-nghĩa-đoạn).

Ghép Gale–Church kèm điểm neo chỉ phục hồi quan hệ để chấm khi output gộp/tách dòng. Kết quả ghép
không được ghi ngược vào tác phẩm và không khôi phục mô hình sentence/segment bền vững.

## Quy tắc bổ sung fixture

1. Ghi nguồn, revision/ngày lấy và quyền sử dụng.
2. Neo assertion bằng nội dung đủ duy nhất, không dựa vào số dòng dễ trượt.
3. Đánh dấu trường hợp giữ CJK có chủ ý và các cách dịch hợp lệ.
4. Có cả ca đúng dễ bị báo nhầm, không chỉ ca lỗi.
5. Không dùng cùng tác phẩm để vừa chỉnh prompt vừa tuyên bố kết quả giữ lại nếu chưa tách tập.

[Về module Bộ đo](README.md)
