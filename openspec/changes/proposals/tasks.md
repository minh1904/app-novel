## 1. Kho và hợp đồng dữ liệu

- [x] 1.1 Thêm migration schema tác phẩm v7 cho phiên, lượt, đề xuất, phần đề xuất và checkpoint; kiểm bằng fixture v6/v5, schema snapshot và test migration giữ nguyên chữ/segment/link/provenance.
- [x] 1.2 Thêm contract/validation IPC cho ID, trạng thái, kích thước, quyền tác phẩm/chương và lỗi; kiểm bằng test input sai kiểu, sai tác phẩm, quá giới hạn và chapter đã xóa.
- [x] 1.3 Làm repository phiên và lượt có lưu snapshot ngữ cảnh, model/usage, trạng thái stream; kiểm test tạo/mở lại phiên, phân trang, `interrupted` sau restart và lỗi ghi không báo bền giả.
- [x] 1.4 Làm repository đề xuất/phần/checkpoint và query đếm hàng chờ theo chương; kiểm test lưu/đọc từng phần, liên kết phiên, idempotency kết quả lô và backup/restore.

## 2. Quy tắc duyệt và giao dịch ghi

- [x] 2.1 Tạo planner thuần kiểm base revision, neo nội dung/vùng và source snapshot; kiểm V12 bằng ca dời duy nhất, sửa, xóa, tách/gộp và hai đoạn giống nhau.
- [x] 2.2 Tạo planner chung cho nhiều phần cùng base, pane trống và phần chồng lấn; kiểm test hai phần không xung đột giả, hai run tranh chấp và phần `needs-placement` bị bỏ qua.
- [x] 2.3 Tạo service Accept/Deny với checkpoint, cập nhật text/revision/trạng thái trong một transaction và ID lệnh idempotent; kiểm test retry IPC và kill process giữa transaction.
- [x] 2.4 Tạo Accept all chỉ theo chương đang mở, trả số nhận/bỏ qua/xung đột; kiểm V11 bằng hai chương có đề xuất và một chương có phần hợp lệ lẫn xung đột.
- [ ] 2.4a Nối mode Áp dụng thẳng vào cùng service Accept sau khi lưu đề xuất, ghi tác nhân `auto` và giữ phần xung đột chờ duyệt; kiểm test pane trống, vùng đã có chữ, source/target đổi và retry idempotent.
- [ ] 2.5 Thêm Hoàn tác lần Accept gần nhất dựa trên checkpoint và revision sau Accept; kiểm test phục hồi chữ/trạng thái và từ chối khi có chỉnh sửa mới.
- [ ] 2.6 Nối trạng thái draft chưa lưu của editor với thao tác duyệt: yêu cầu lưu hoặc hủy trước khi ghi; kiểm thử chữ draft không mất và không bị áp vào revision kho cũ.

## 3. Nguồn kết quả AI

- [ ] 3.1 Chuyển chat Sửa sang chụp base lúc gửi và tạo đề xuất chỉ khi answer/fence/finishReason hoàn chỉnh; bỏ đường auto-apply ngầm theo pane trống; kiểm test pane trống, hủy, thiếu fence và output bị cắt.
- [ ] 3.1a Đổi composer thành hành động Gửi/Tạo đề xuất/Áp dụng thẳng theo lượt; lưu lựa chọn và tự Accept kết quả hợp lệ qua service chung; kiểm test chọn hành động khác giữa stream không đổi lượt, xung đột vẫn pending và Gửi thường không ghi.
- [x] 3.2 Chuyển dịch một chương sang đoạn không trống và lưu kết quả từng lô dưới nhóm đề xuất; kiểm test thứ tự đoạn, cancel/retry phần lỗi, không nhân đôi phần thành công và bản dịch chưa đổi.
- [ ] 3.2a Thêm lựa chọn Duyệt trước/Áp dụng thẳng cho lượt dịch chương và báo phần đã tự ghi/cần duyệt; kiểm mode mặc định và chỉ phần neo chắc chắn được tự Accept.
- [x] 3.3 Gắn provider/model/usage/contextHash cùng danh sách mục ngữ cảnh thực gửi vào đề xuất và lượt; kiểm test mục glossary/xưng hô chưa duyệt không ra payload và hash tương ứng dữ liệu đã gửi.

## 4. Panel và transcript

- [ ] 4.1 Dời controller phiên lên phạm vi tác phẩm và tải lịch sử từ kho; kiểm thao tác ẩn/mở panel, chuyển chương, restart rồi tiếp tục phiên cũ.
- [x] 4.2 Làm composer hiển thị riêng nguồn đọc và đích sửa, một picker thêm nguồn và preview từ cùng snapshot dùng để gửi; kiểm ca con trỏ dời, thêm chương khác, nguồn quá dài và payload khớp preview.
- [ ] 4.3 Render Markdown an toàn cho lời giải thích và giữ bản thay thế nguyên dạng riêng; kiểm tiêu đề/danh sách/link/fence, HTML/script/ảnh ngoài bị chặn và sao chép từng phần.
- [ ] 4.4 Hoàn thiện trạng thái từng lượt: streaming, hủy, lỗi, giới hạn output, lịch sử bị lược và nguồn tool đọc; kiểm test không tạo đề xuất từ lượt dở và transcript phân biệt hai nguồn.

## 5. Review trong editor và điều hướng

- [ ] 5.1 Dựng lớp diff không làm đổi canonical doc trước Accept, với điều khiển Accept/Deny từng phần; kiểm chữ/revision giữ nguyên khi chỉ mở hoặc đóng review.
- [ ] 5.2 Nối review tới service ghi, đồng bộ editor sau phản hồi và phục hồi quyết định từng phần; kiểm Accept/Deny rồi restart, nút Hoàn tác và lỗi IPC không hiện đã nhận giả.
- [ ] 5.3 Làm hàng chờ/badge theo chương, lọc theo phiên và điều hướng từ panel tới đúng chương/đề xuất; kiểm khi đang mở chương 12 mà kết quả chương 3 đến thì chương 12 không đổi.
- [ ] 5.4 Thêm Accept all có tên chương/số phần trước thao tác và báo cáo sau thao tác; kiểm bàn phím, focus, xung đột và không xuất hiện hành động duyệt toàn tác phẩm ở Module 5.

## 6. Nghiệm thu và tài liệu

- [ ] 6.1 Chạy V11–V12, ca IME, chương dài, crash/backup/restore trong Electron thật; lưu kết quả và giới hạn vào tài liệu module.
- [ ] 6.2 Cập nhật tài liệu Module Đề xuất, roadmap/current-state và hợp đồng cũ về pane trống/segment; kiểm trạng thái “đã chốt” và “đã triển khai” có bằng chứng đúng, local links hợp lệ.
- [ ] 6.3 Chạy `node scripts/check.mjs` trước commit và `node scripts/check.mjs --build` trước push; lưu bằng chứng từng bước typecheck, test, lint và build theo AGENTS.md.
