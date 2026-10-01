## 1. Một trình soạn thảo cho cả hai bên

- [x] 1.1 Đổi `SourceEditor` thành `TextEditor` (cập nhật import và tên trong `ChapterScreen`): bỏ thanh trạng thái, nút Lưu và nghe Ctrl+S khỏi component; thêm `onStatusChange`, `emptyHint`, `getText()` vào handle; thân editor cao 100% khung chứa với `.cm-scroller` cuộn riêng; banner xung đột/lỗi giữ trong component
- [x] 1.2 `readOnly` đổi được lúc chạy bằng `Compartment` (`EditorState.readOnly` và `aria-readonly`), không dựng lại editor; kiểm tra trong Electron: khóa thì gõ, xóa, dán, kéo thả bị chặn nhưng chọn, sao chép, di chuyển con trỏ và cuộn vẫn được; mở khóa rồi khóa lại giữ nguyên văn bản, lịch sử, vị trí và trạng thái chưa lưu
- [x] 1.3 Gợi ý khi trống là lớp phủ ngoài DOM của CodeMirror (`doc.length === 0` qua `updateListener`, `pointer-events: none`, `aria-describedby`), không dùng `placeholder()` hay widget; biến mất khi có chữ
- [x] 1.4 `ReadingView`: mỗi dòng không trống một đoạn `<p lang>` `white-space: pre-wrap`, dòng trống liền nhau thành một khoảng cách, 15 px giãn dòng 1,9, cuộn riêng, `role="region"` có tên và `tabindex=0`; test thuần cho phần tách đoạn (nhiều dòng trống liền, khoảng trắng đầu dòng, không có Markdown)

## 2. Nạp và lưu bản dịch

- [x] 2.1 `useChapterScreen`: nạp `text:get(..., 'target')` song song với bản gốc, trả `target`, thêm `noteTargetSaved(record)` cập nhật `target`, cờ `hasTarget` của chương và làm mới tác phẩm; test hành vi bằng kho thật qua handler (bản dịch lưu lần đầu với revision 0 rồi danh sách chương báo `hasTarget`)
- [x] 2.2 Bản dịch dùng `segment(text, 'vi')`/`applyEdits`/`resegment` qua `EditorSession` với `lang = 'vi'`; test với kho thật: lưu bản dịch lần đầu, sửa rồi lưu giữ ID các segment không đụng tới, xung đột chỉ ảnh hưởng bên dịch, bản gốc không bị ghi khi chỉ sửa bản dịch

## 3. Màn hai pane

- [x] 3.1 `EditorPane`: tiêu đề nêu bên và ngôn ngữ, trạng thái lưu bằng chữ (`role="status"`), banner của đúng bên; pane gốc có nút "Sửa bản gốc"/"Khóa lại", dòng "Đã khóa, chỉ đọc" và dòng nhắc khi mở khóa; pane dịch có điều khiển "Soạn thảo"/"Đọc"
- [x] 3.2 `ChapterWorkspace`: hàng đầu (tên chương, số segment/ký tự từng bên, `Tabs` chọn mode với "Từng câu" tắt kèm "Sắp có", "Thay bản gốc", "Tập trung"/"Hiện điều hướng", "Lưu", "Về tác phẩm"), hai pane `grid-cols-2` cao bằng vùng làm việc, mỗi pane cuộn riêng, không đường nối; hàng đầu xuống dòng khi hẹp
- [x] 3.3 Chuyển "Đọc": editor dịch ở lại trong DOM (ẩn), Reading view lấy `getText()` một lần; quay lại giữ văn bản, hoàn tác, con trỏ và phiên lưu
- [x] 3.4 Lưu hai bên: nút "Lưu" và Ctrl+S một chỗ (workspace) chạy `save()` song song cho các pane đang dirty, nút tắt khi cả hai đã lưu; một bên lỗi không đổi bên kia
- [x] 3.5 Guard chặn rời đăng ký một guard cho cả màn (dirty là hoặc; lưu cả hai và chỉ tiếp tục khi không bên nào lỗi; bỏ thay đổi cho cả hai bên); "Thay bản gốc" qua cùng guard; test cho các ca "chỉ bản dịch chưa lưu" và "một bên lưu lỗi"
- [x] 3.6 `ChapterScreen` dùng workspace khi chương có bản gốc (trạng thái chưa có bản gốc, hộp thoại nhập và "Thay bản gốc" giữ nguyên); `App.tsx` truyền `sidebarOpen` và `onToggleSidebar` cho nút tập trung (dùng chung trạng thái, không thêm state)

## 4. Kiểm chứng

- [x] 4.1 Chạy trong Electron thật: mở chương chưa dịch (gợi ý, gõ, lưu, danh sách chương báo đã dịch), dán bản dịch có sẵn, khóa/mở khóa/sửa/lưu bản gốc, lưu hai bên một lần, xung đột một bên, chặn rời, Reading view với chữ chưa lưu rồi hoàn tác, tập trung giữ chữ chưa lưu; chụp màn hình sáng/tối ở 1280 và 940 px, kiểm tra không cuộn ngang
- [ ] 4.2 Bảng ca IME cho pane dịch (`imeCases.md`): người dùng gõ tay Telex, VNI, Pinyin trên bản hoàn chỉnh, thêm ca bản dịch trống đang hiện gợi ý và ca chuyển qua lại giữa hai pane; ghi kết quả; một ca hỏng chặn việc coi change là xong
- [x] 4.3 Đo trong Electron thật với chương mà mỗi bên 5.000 segment (~200.000 ký tự): mở, xử lý mỗi phím ở mỗi bên (p95), cuộn, lưu cả hai bên và thời gian giao diện đứng; so với ngân sách spec và ghi vào design và `delivery/validation.md`
- [ ] 4.4 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; cập nhật `engineering/current-state.md`, `delivery/roadmap.md`, `delivery/backlog.md` (`translation-editor` đã triển khai; thêm `sentence-mode`, `reading-view-markdown`), `product/decisions.md` (cách thể hiện bản gốc chỉ đọc), `maintenance/changelog.md`
