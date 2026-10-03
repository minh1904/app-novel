## 1. Editor tối thiểu và cổng IME (làm trước, dừng lại nếu hỏng)

- [x] 1.1 Thêm `@codemirror/state`, `@codemirror/view`, `@codemirror/commands` vào `package.json`; kiểm tra bản build và CSP (`script-src 'self'`, `style-src` có `'unsafe-inline'`) không bị chặn, và không thêm gì ngoài ba gói này
- [x] 1.2 `SourceEditor` tối thiểu trong `src/renderer/src/features/editor/`: hiển thị `record.content`, xuống dòng tự động, phông chữ theo `lang`, lịch sử chuẩn, `contentAttributes` (nhãn đọc được, nhiều dòng), keymap chỉ gồm lịch sử/chọn tất cả/di chuyển, Tab rời focus, không tự đóng ngoặc/thụt dòng; chưa có segment
- [x] 1.3 Nối vào `ChapterScreen` thay `SegmentList` (hiển thị và sửa được, chưa lưu được); giữ `SegmentList` cho tới khi 5.3 xác nhận không còn nơi dùng
- [x] 1.4 Viết `src/renderer/src/features/editor/imeCases.md` từ bảng ca của spec `source-editor` (9 ca × Telex/VNI/Pinyin), có cột kết quả để điền
- [x] 1.5 **Cổng IME:** chạy bảng ca trên Electron 44 thật với bản tối thiểu này (người dùng gõ tay), ghi kết quả vào `imeCases.md`. Mọi ca đạt thì sang nhóm 2. Có ca hỏng thì dừng, làm theo D8 (phân định nguồn bằng trang CodeMirror trần cùng Chromium, sửa tại mã ta, nâng CM6, hoặc nâng Electron) và chạy lại bảng ca; **không** chuyển sang `<textarea>`
- [x] 1.6 Sửa [ADR-003](../../../docs/handbook/decisions/0003-technology-stack.md): bỏ điều kiện xem lại "qua trên `<textarea>`", thay bằng các bước xử lý của D8

## 2. Lõi thuần ánh xạ và chia lại segment

- [x] 2.1 `src/shared/algorithms/segmentMap.ts`: kiểu `Seg` (`id: string | null`, `from`, `to`, `edited`) và `applyEdits(segments, edits)`: dịch chuyển vùng, giữ ID segment không bị chạm, sửa bên trong giữ ID, chèn ở ranh giới thuộc segment bên trái (kể cả ca xuống dòng và đầu segment), xóa trùm (nối vào bên trái, bỏ trọn segment, phần đầu của segment sau); không đụng tới văn bản
- [x] 2.2 `resegment(content, segments, lang)`: xác định cửa sổ bẩn (dòng chứa segment `edited` hoặc chữ không thuộc segment), chạy `segment()` của `segmenter.ts` trên cửa sổ, gán ID theo quy tắc trùng nhiều nhất (đồng hạng thì đứng trước), ghép với phần ngoài cửa sổ giữ nguyên, trả tập đã kiểm bất biến
- [x] 2.3 Kiểm bất biến `checkSegments(content, segments)` dùng chung cho test và trước khi lưu: đúng thứ tự, không chồng, trong văn bản, không cắt cặp surrogate, mỗi ký tự không phải khoảng trắng thuộc đúng một segment, không vắt qua dòng, ID duy nhất
- [x] 2.4 Test ca cụ thể cho từng scenario của `segment-mapping` (gõ giữa câu, thay vùng chọn, Enter cuối câu, gõ trước câu, gõ vào dòng trống, xóa trùm hai nửa, xóa trọn một câu, dán ba dòng, dán 40 dòng vào dòng trống, ký tự ngoài mặt phẳng cơ bản)
- [x] 2.5 Kiểm thử ngẫu nhiên (hạt giống cố định): chuỗi dài chỉnh sửa ngẫu nhiên (chèn, xóa, thay, dán nhiều dòng, ký tự U+1F600 và chữ Hán hiếm) trên chương mẫu en/zh-Hans/ja; sau `resegment` mọi bất biến đúng, không mất hay lặp chữ không phải khoảng trắng ngoài phần có chủ đích, kết quả xác định (hai lần chạy cho cùng vùng và cùng việc giữ ID); đo `applyEdits` với 5.000 segment

## 3. Tích hợp CodeMirror: trạng thái, hoàn tác, hiển thị

- [x] 3.1 `editorState.ts`: `StateField` `segments` cập nhật bằng `applyEdits` từ `ChangeSet`; hiệu ứng `setSegments`; `invertedEffects` để hoàn tác/làm lại khôi phục cả ID; giao dịch chia lại không có `changes` và `addToHistory: false`
- [x] 3.2 Test trong môi trường DOM (jsdom hoặc tương đương): xóa trùm hai segment rồi hoàn tác và làm lại khôi phục đúng ID và vùng; chỉnh sửa rồi chia lại rồi hoàn tác ra trạng thái trước chỉnh sửa bằng đúng một bước; hoàn tác sau khi lưu
- [x] 3.3 Chia lại khi rảnh (800 ms không gõ) và khi lưu, chỉ chạy khi `view.composing` và `view.compositionStarted` đều sai, hẹn lại nếu đang soạn; test mô phỏng `compositionstart`/`compositionend` khẳng định không có giao dịch đổi văn bản hay đổi cấu trúc segment phát ra trong lúc soạn
- [x] 3.4 `segmentDecorations.ts`: lề `gutter()` hiện số dòng bình thường, cùng cỡ chữ với văn bản (đã đổi từ số segment vì một dòng nhiều câu làm số nhảy), nền xen kẽ rất nhẹ giữa các câu trong dòng và gạch dưới chấm cho segment đã sửa bằng `Decoration.mark` chỉ trong viewport; **không** dùng widget hay phần tử chèn vào dòng; màu lấy từ token của dự án, sáng và tối
- [x] 3.5 Dán: CRLF/CR đổi thành LF. CodeMirror đã tách dòng khi nhận văn bản nên không cần bộ lọc riêng; có test ở `editorState.test.ts`

## 4. Lưu, xung đột, chặn rời

- [x] 4.1 `useSourceEditor`: lưu bằng Ctrl+S và nút "Lưu": đợi hết soạn IME, chia lại, kiểm bất biến và giới hạn kho trước khi gửi, chụp `content`/segments (`id` hoặc không có)/`expectedRev`, gọi `text:save`; thành công thì cập nhật `rev`, gán ID kho cấp cho segment chưa có ID (ghép theo thứ tự rồi dịch qua thay đổi xen giữa), bỏ cờ `edited`, **không thay văn bản và không đổi con trỏ/vị trí cuộn**; lưu khi không có thay đổi thì không gọi kho
- [x] 4.2 Hàng đợi lưu một chỗ (bấm lưu lần hai trong lúc đang lưu thì lưu lại một lần sau đó với `rev` mới); chỉ báo "đã lưu"/"chưa lưu"/"đang lưu" bằng chữ và `role="status"`
- [x] 4.3 Lỗi: văn bản quá dài/ghi lỗi hiện thông báo bằng lời dễ hiểu (`role="alert"`), giữ văn bản và trạng thái chưa lưu, cho thử lại; `conflict` hiện banner với "Sao chép văn bản của tôi" và "Tải lại bản đã lưu" (có xác nhận, đặt lại `EditorState` và xóa lịch sử); không tự gộp
- [x] 4.4 Test hook với kho thật qua handler (như `importFlow.test.ts`): sửa rồi lưu rồi mở lại cho đúng văn bản và segment, segment không đụng giữ ID; xung đột giữ nguyên bản trong kho và bản đang sửa; gõ trong lúc đang lưu; xóa trùm segment vừa lưu; quá dài
- [x] 4.5 `useLeaveGuard` trong `App.tsx`: mọi chuyển màn (về tác phẩm, mở chương khác) đi qua một hàm hỏi ba lựa chọn khi guard bật; "Thay bản gốc" dùng cùng hàm; không hỏi khi không có thay đổi chưa lưu
- [x] 4.6 Đóng cửa sổ khi còn thay đổi chưa lưu: `beforeunload` ở renderer và xử lý `will-prevent-unload` ở main với hộp hai lựa chọn "Ở lại"/"Đóng và bỏ thay đổi"; không thêm kênh IPC; kiểm tra trong Electron thật (ở lại thì cửa sổ và editor còn nguyên)

## 5. Màn chương

- [x] 5.1 `ChapterScreen`: số segment và số ký tự cập nhật sau mỗi lần lưu, trạng thái lưu cạnh tiêu đề, nút "Lưu", nút "Về tác phẩm" và "Thay bản gốc" qua guard; sau thay bản gốc thành công nạp lại editor với lịch sử trống và trạng thái "đã lưu"
- [x] 5.2 Bố cục ở 940 px không cuộn ngang trang, focus nhìn thấy, mọi hành động dùng được bằng bàn phím, Tab rời editor không chèn ký tự; sáng và tối
- [x] 5.3 Gỡ `SegmentList` nếu không còn nơi dùng (kèm test), giữ `ChapterPager` nếu danh sách chương còn dùng

## 6. Kiểm chứng và tài liệu

- [ ] 6.1 Chạy lại bảng ca IME trên bản hoàn chỉnh (không chỉ bản tối thiểu của 1.5), ghi kết quả; mọi ca đạt thì mới coi change xong
- [x] 6.2 Đo trong Electron thật với chương 5.000 segment (~200.000 ký tự): mở, gõ (phân vị 95 mỗi phím), cuộn từ đầu tới cuối, thời gian lưu và thời gian giao diện đứng khi lưu; so với ngân sách của spec; ghi số đo vào design và `delivery/validation.md`
- [x] 6.3 Kiểm tra bằng bàn phím cả luồng (sửa, lưu, xung đột, tải lại, rời, thay bản gốc) và chụp màn hình các trạng thái chính
- [ ] 6.4 Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; cập nhật `engineering/current-state.md`, `delivery/roadmap.md` (gỡ điều kiện treo IME), `delivery/validation.md`, `delivery/backlog.md` (thêm `autosave` và `edited-segment-link-review`), `maintenance/changelog.md`
