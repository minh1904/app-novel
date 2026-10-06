# Dữ liệu đề xuất và điều kiện ghi

Cập nhật: 2026-10-04 · Trạng thái: ràng buộc đã chốt và mô hình lưu đề xuất.
Chủ trì: kỹ thuật. Câu hỏi: lưu gì để xem lại và không ghi đè sai chỗ?

## Quy tắc dữ liệu

SQLite `.mira` là nguồn sự thật; không dựa vào state React hoặc HTML diff để phục hồi đề xuất.
Module 5 cần lưu đủ để mở lại một đề xuất sau khi panel, chương hoặc app đã đóng. Bảng dưới là
**trường khái niệm đề xuất**, không phải schema SQL đã duyệt.

| Nhóm | Trường cần biểu diễn |
| --- | --- |
| Danh tính | `proposalId`, `workId`, `chapterId`, bên đích, `sessionId`, `requestId`, `jobId` nếu có |
| Nội dung | `proposedText`, vùng/đoạn nguồn, `sourceSnapshot` hoặc hash, `targetBaseText`, `targetBaseRevision`/hash |
| Trạng thái | `pending`, `applied`, `rejected`, `stale`/`conflict`; ai/quyết định lúc nào, từng khối nếu hỗ trợ |
| Nguồn AI | chat hay tác vụ, provider/model/cấu hình, usage khi có, mốc tạo |
| Ngữ cảnh | `contextHash`, phiên bản thuật toán/hash, ID + revision các mục glossary/xưng hô thực sự gửi |

`targetBaseText` là **ảnh chụp chữ đích để so xung đột** lúc đề xuất được sinh. Bảng
`text_snapshot` trong ADR-005 có vai trò khác: **checkpoint văn bản chương trước khi áp dụng/khôi
phục** để phục hồi và kiểm toán. Không dùng cùng một tên mơ hồ cho hai loại snapshot. Nếu lưu toàn
bộ văn bản đích làm base của một đề xuất, phải cân nhắc kích thước; nếu chỉ lưu vùng, cần thêm neo và
revision đủ để tránh trúng một đoạn giống chữ ở nơi khác.

## Điều kiện ghi

1. Khi AI trả kết quả, xác định chương đích và lưu đề xuất cùng base của văn bản đích. Pane trống
   cũng đi qua đường này. Mode Duyệt trước để phần ở trạng thái pending; mode Áp dụng thẳng tự Accept
   qua cùng điều kiện ghi nếu an toàn, nếu không giữ pending/conflict. Nếu người dùng sửa trước khi
   kết quả về, đề xuất phải giữ base đúng lúc sinh và báo xung đột khi cần.
2. Khi Accept, kiểm `chapterId`, revision/nội dung đích và neo của vùng; nếu chỉ lệch vị trí, có
   thể tìm lại theo nội dung **khớp duy nhất**. Không đoán theo số dòng. Nếu chữ bị sửa/tách/gộp/xóa,
   chuyển sang conflict/stale.
3. Khi Accept, ghi văn bản, snapshot và trạng thái đề xuất trong một transaction; khi cơ chế
   `ai_mark` có mặt, dấu AI chỉ tạo cho vùng vừa được chấp nhận trong cùng transaction đó. Deny chỉ
   đổi trạng thái. Accept all dùng cùng phép kiểm cho từng mục và báo các mục không áp dụng được.
4. Thao tác từ chat, dịch chương và tác vụ sau này đi qua **cùng một API duyệt**; không tạo đường
   tắt từ renderer để ghi đè mà không có so sánh base.

Khi nhiều đề xuất cùng được tạo từ một revision của pane trống, Accept all phải kiểm trên cùng
ảnh chụp đầu và ghép các vùng không chồng lấn một cách nhất quán. Không được áp từng đề xuất rồi coi
revision do chính mục trước vừa tăng là xung đột giả của mục sau; cách transaction cụ thể chốt ở
OpenSpec.

V12 hiện đề nghị tìm lại chữ gốc theo nội dung khi revision đổi. Với nhiều đoạn giống nhau, cần
thêm điều kiện duy nhất và bằng chứng chương/vùng để tránh gắn sai. Quy tắc này phải được test bằng
ca chữ dời, chữ sửa, chữ trùng, nguồn đổi và app chết giữa transaction.

## `contextHash` và quyền riêng tư

Hash chỉ có nghĩa khi ghi rõ **phạm vi payload và phiên bản chuẩn hóa**. Lưu danh sách mục ngữ cảnh
thực sự đã gửi, gồm ID/revision; không lấy mọi mục đang có trong kho làm danh sách “đã dùng”.
Hash không thay thế nội dung snapshot, không chứng minh model sẽ sinh lại cùng bản dịch và không
phải điều kiện chống ghi đè. Việc chống ghi đè dựa trên base của văn bản đích.

Chỉ mục glossary/xưng hô đã duyệt và đúng phạm vi mới được gửi AI theo module Ngữ cảnh; mục
`pending`/`rejected` không rời máy. Nội dung truyện và hội thoại có thể nhạy cảm: không chép vào log
công khai hoặc telemetry mặc định; backup/restore phải mang theo lịch sử theo chính sách cần chốt.

`paragraphId` ổn định qua sửa/tách/gộp **chưa có trong mã**. OpenSpec cần chọn cơ chế định danh hoặc
neo theo nội dung + revision, và định nghĩa lại khi cấu trúc đoạn đổi. Đơn vị đoạn không đồng nghĩa
với bảng segment/câu vĩnh viễn.

Nguồn: [quyết định module](decisions.md),
[V11–V12](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/delivery/validation.md),
[dữ liệu ngữ cảnh](../context/data-lifecycle.md).

[Về mục lục](README.md)
