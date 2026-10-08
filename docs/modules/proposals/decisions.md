# Quyết định hiện hành — Đề xuất và phiên AI

Ngày: 2026-10-05, bổ sung 2026-10-08 · Trạng thái: **Đã chốt về hành vi sản phẩm**, đang triển
khai; xem [tiến độ](README.md).
Người quyết định: chủ sản phẩm, qua trao đổi ngày 2026-10-04–05 và 2026-10-08.
Câu hỏi: AI được ghi chữ khi nào, người dùng duyệt theo phạm vi nào và hội thoại sống bao lâu?

## Quyết định

1. **Mọi kết quả AI có thể thay đổi bản dịch đều đi qua hồ sơ đề xuất**, kể cả khi pane bản dịch
   trống. Mặc định là **Duyệt trước**: chữ không đổi trước Accept. Người dùng có thể chọn rõ
   **Áp dụng thẳng** cho một lượt chat có yêu cầu viết hoặc một lượt dịch: hệ thống tạo đề xuất/snapshot rồi tự
   Accept qua cùng phép kiểm xung đột và giao dịch ghi. Nếu đích hoặc nguồn đã đổi, neo không chắc
   chắn hay có chữ chưa lưu, kết quả ở lại chờ duyệt; không ghi đè ngầm. Chế độ này áp dụng cả pane
   trống lẫn vùng đã có chữ khi người dùng chọn đúng đích. Quyết định ngày 2026-10-05 thay luật
   “mọi kết quả chờ duyệt” ngày 2026-10-04; cả hai cùng thay **ngoại lệ pane trống tự ghi không cần
   lựa chọn** ở mục 5 của [ADR-005](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/decisions/0005-ai-first-proposals-no-sentence-mode.md).
   Phần còn lại của ADR-005 giữ nguyên.
2. Người dịch xem diff ngay tại editor rồi **Accept** hoặc **Deny** từng phần. **Accept all** tại
   chương chỉ nhận các đề xuất còn chờ của chương đang mở, hiển thị chương và số lượng trước khi
   thực hiện. Đề xuất bị xung đột không được ghi đè; kết quả hàng loạt báo rõ đã nhận và cần xem lại.
3. Khi có tác vụ dịch nhiều chương ở Module 7, cung cấp **hành động riêng** để duyệt tất cả đề xuất
   còn chờ của một lượt dịch; giao diện phải ghi rõ phạm vi và số chương. Không biến nút Accept all
   của chương thành lệnh duyệt ngầm toàn tác phẩm.
4. Panel AI và lịch sử phiên thuộc **tác phẩm**, không bị ràng vào chương đang mở. Ẩn panel không
   kết thúc phiên. Hội thoại, đề xuất và quyết định duyệt còn sau khi tắt/mở app. Người dùng có thể
   mở phiên cũ để tiếp tục hội thoại; việc này mở một lượt AI mới, không đòi giữ runtime provider.
5. Tiến độ dịch nhiều chương, retry và phục hồi sau khi app tắt thuộc **Module 7 Tác vụ**; đề xuất
   và lịch sử phiên phải lưu bền từ Module 5 để Module 7 có thể gắn kết quả đúng chương.
6. Chat không bắt người dùng duy trì mode Hỏi/Sửa. Mỗi lần gửi có ba hành động rõ nghĩa:
   **Chỉ hỏi trong chat** (không ghi), **Tạo đề xuất** để sửa rồi duyệt và **Áp dụng thẳng** để sửa
   rồi tự nhận phần an toàn. Hành động viết hiển thị đích sửa trước khi gửi; lựa chọn được lưu cùng
   lượt và không đổi khi người dùng chọn hành động khác cho lượt sau. Luồng
   dịch chương có cùng lựa chọn Duyệt trước/Áp dụng thẳng; Module 7 kế thừa lựa chọn cho một tác vụ
   nhiều chương và hiển thị rõ phạm vi trước khi chạy.
7. **Gửi trong composer mặc định là Tạo đề xuất** (quyết định ngày 2026-10-05, thay mặc định “Gửi để
   trò chuyện” của mục 6). Enter và nút chính **Viết** tạo đề xuất rồi mở ngay tại editor để
   Accept/Deny; câu trả lời không quay lại chat thành một đoạn dịch, chat chỉ giữ lời giải thích,
   số dòng đổi và nút **Xem trong bản dịch**. Chỉ hỏi trong chat và Áp dụng thẳng nằm trong menu
   cạnh nút Viết. Mặc định vẫn là Duyệt trước: chữ không đổi trước Accept.
8. Composer **không hiển thị nội dung ngữ cảnh gửi kèm và không có nút thêm nguồn từ chương khác**
   (quyết định ngày 2026-10-05, bỏ mục 2–3 trong đề xuất của
   [nghiên cứu panel](chat-panel-research.md)). Ngữ cảnh tự động vẫn được gửi như cũ; lượt đã gửi
   vẫn liệt kê nhãn các khối ở “Đã gửi kèm”. Khi một khối bị cắt theo giới hạn ký tự, composer nói
   rõ và chặn gửi cho tới khi người dùng đồng ý, vì giờ không còn chỗ để xem phần bị cắt.

9. **Chat không có chế độ, đề xuất chỉ sinh từ tool ghi** (quyết định ngày 2026-10-08, xem
   [nghiên cứu Hermes](hermes-chat-research.md#quyết-định-2026-10-08-chat-thường-ai-tự-gọi-tool);
   thay mục 6–8 **cho panel chat**). Ô soạn chỉ còn ô nhập, menu model và nút gửi/dừng. Lượt gửi
   không kèm văn bản chương mà kèm vị trí người dùng (chương đang mở, đoạn con trỏ mỗi phía, khoảng
   đoạn đang chọn). Model tự đọc bằng tool đọc và chỉ đổi được bản dịch qua tool ghi
   (`propose_edit`, `propose_translation`, `propose_glossary_term`). Đề xuất từ chat **luôn ở chế độ
   Duyệt trước**: chat không còn Áp dụng thẳng, và chữ trong câu trả lời, kể cả khối rào, không bao
   giờ thành đề xuất. Mỗi lượt tạo tối đa 10 đề xuất, tính cả thuật ngữ. Thuật ngữ do AI đề xuất là
   mục glossary ở trạng thái chờ duyệt, nguồn `ai`. Hộp thoại dịch chương vẫn giữ Duyệt trước / Áp
   dụng thẳng như mục 1 và 6.

## Vì sao đổi

Quy tắc pane trống của ADR-005 tự ghi mà không hỏi chính sách làm người dùng khó biết chữ đã vào
bản dịch hay chưa. Hồ sơ đề xuất là một đường ghi chung; người muốn soát chọn Duyệt trước, người
muốn đi hết luồng chọn Áp dụng thẳng. Cả hai giữ nguồn gốc, checkpoint và chặn xung đột.

## Hệ quả và giới hạn

- Tiến độ **dịch** là số đoạn/lô AI đã xử lý; tiến độ **duyệt** là số đề xuất đã quyết định. Không
  báo “đã ghi bản dịch” ngay sau khi model trả kết quả.
- Dấu AI chỉ được tạo khi phần chữ AI được Accept thủ công **hoặc tự Accept theo mode đã chọn**, cùng
  transaction lưu chữ/snapshot khi cơ chế `ai_mark` có mặt. Đề xuất chờ không mang nghĩa chữ đã nằm
  trong bản dịch.
- Mã MVP còn các đường cũ dùng hàng/segment để tương thích nội bộ, dù giao diện dịch chương đang
  chuyển sang đường đề xuất. OpenSpec, roadmap và tài liệu cũ phải phân biệt baseline và hành vi mới;
  tài liệu này không tự chứng minh một task đã nghiệm thu.
- Từ mục 9, tác phẩm lưu lượt chat mới với `action = 'chat'` (schema tác phẩm v10). Bản app cũ đọc
  lượt đó sẽ báo lỗi. Muốn quay về bản cũ thì phải khôi phục bản sao lưu tác phẩm có từ trước khi
  nâng cấp, không chỉ cài lại app.
- Schema và cơ chế neo đang được kiểm qua [OpenSpec](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/proposals/tasks.md);
  retention, đặt vị trí và UX diff còn mở. Xem [bằng chứng và câu hỏi mở](evidence.md).

[Luồng duyệt](review-flow.md) · [Phiên và nhiều chương](sessions-and-jobs.md) · [Về mục lục](README.md)
