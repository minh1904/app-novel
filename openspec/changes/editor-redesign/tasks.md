## 1. Sidebar danh sách chương

- [x] 1.1 `ChapterNavSidebar.tsx`: tên tác phẩm + nút quay lại, danh sách chương qua `useChapters`, chấm trạng thái theo `hasSource`/`hasTarget`, chương đang mở đánh dấu bằng `aria-current`; xác nhận bằng `pnpm typecheck`/`pnpm lint`
- [x] 1.2 `App.tsx`: thêm biến `sidebar` (mặc định `LibrarySidebar`, gán `ChapterNavSidebar` trong nhánh `case 'chapter'`), truyền `onOpenChapter`/`onBackToWork`/`onWorkChanged`; xác nhận bằng cách lái Electron thật (Playwright `_electron`) — mở một chương, sidebar đổi đúng, bấm chương khác chuyển màn, bấm quay lại trở về điều hướng thư viện

## 2. Live Preview nhẹ cho bản dịch

- [x] 2.1 `livePreviewDecorations.ts`: `ViewPlugin` + `RangeSetBuilder` theo khuôn `segmentDecorations` — mark decoration cho tiền tố `#`/`##`/`###` (mờ) và phần chữ còn lại (cỡ lớn/đậm theo cấp), và cho từng cặp `**` (mờ) với chữ ở giữa (đậm); giữ nguyên khi IME đang compose; chỉ quét `visibleRanges`
- [x] 2.2 `TextEditor.tsx`: thêm prop `livePreview` (mặc định `false`), thêm extension khi `true`, đọc một lần lúc mount theo đúng quy ước của component
- [x] 2.3 `ChapterWorkspace.tsx`: bật `livePreview` cho `TextEditor` của bên dịch, không bật cho bên gốc; xác nhận bằng ảnh chụp Electron thật — gõ `# Tieu de` và `**chu dam**` hiện đúng định dạng ngay khi gõ, bản gốc không đổi
- [ ] 2.4 Bảng ca IME: người dùng gõ tay Telex/VNI thật (không phải gõ máy qua automation) vào một dòng tiêu đề và một đoạn có `**...**`, xác nhận không mất hay sai ký tự khi decoration dựng lại ngay sau khi gõ xong một từ

## 3. Xem trước Ngữ cảnh trong màn chương

- [x] 3.1 `ChapterWorkspace.tsx`: thêm hàng nhãn tĩnh "Thuật ngữ"/"Xưng hô"/"Văn phong" cạnh tab mode, mỗi nhãn kèm badge `SOON_LABEL` (dùng lại, không thêm mục `mockFeatures`), không bấm được, không điều hướng; xác nhận bằng ảnh chụp Electron thật cạnh wireframe D

## 4. Panel "Hỏi AI" minh họa

- [x] 4.1 Thêm `aiPanel` vào `MOCK_FEATURES` (`id: 'ai-chat-panel'`) và dòng tương ứng trong `delivery/backlog.md` (trạng thái "Chỉ minh họa"); xác nhận bằng `mockFeatures.test.ts`
- [x] 4.2 `AiPanel.tsx`: thẻ ngữ cảnh (chương + câu trích mẫu), bốn nút nhanh, một lượt hỏi/đáp mẫu, ô nhập — toàn bộ nội dung cố định, mọi nút hành động `disabled`, nhãn "Sắp có" nhìn thấy, dòng chú thích dữ liệu mẫu ở cuối
- [x] 4.3 `ChapterWorkspace.tsx`: state `aiOpen`, nút "Hỏi AI" ở header (chỉ hiện mode Toàn văn), phím tắt Ctrl+K/Cmd+K mở/đóng, Esc đóng, đóng khi chuyển sang mode Từng câu; khung hai pane đổi `grid-cols-2` → `grid-cols-[1fr_1fr_320px]` và chèn `AiPanel` làm cột thứ ba khi mở
- [x] 4.4 Xác nhận bằng ảnh chụp Electron thật: mở panel bằng nút, hai pane co lại đúng, đóng bằng Esc, hai pane trở lại độ rộng ban đầu, chữ đang gõ trong bản dịch không mất

## 4b. Dựng chrome gọn theo phương án D

- [x] 4b.1 `ChapterWorkspace.tsx`: thay khối tiêu đề nhiều dòng bằng thanh chương 42px (tên chương 12.5px + số liệu ở màu phụ + nút dồn phải) và thanh mode 36px (tab `size="sm"` + nhãn Ngữ cảnh cùng hàng); "Thay bản gốc" và "Về tác phẩm" chuyển vào menu tràn
- [x] 4b.2 `Tabs.tsx`: thêm prop `size` (`sm` cho thanh 36px, `default` giữ nguyên cho các màn tác phẩm), không đổi hình các chỗ đang dùng
- [x] 4b.3 `EditorPane.tsx`: pane thành khối có viền `rounded-panel bg-sidebar p-3`; gộp tên pane, số liệu và trạng thái lưu vào một hàng
- [x] 4b.4 `TextEditor.tsx`: bỏ viền riêng của CodeMirror (pane đã là khung), vòng focus đổi sang `inset` để không tràn ra ngoài pane
- [x] 4b.5 `AppShell.tsx`: header và đầu sidebar 52px → 44px cho khớp nhịp của D
- [ ] 4b.6 Người dùng mở app thật xem lại bố cục D ở một chương có bản dịch và một chương chưa có bản dịch (môi trường agent không chạy được Electron)

## 5. Kiểm chứng và tài liệu

- [x] 5.1 Chạy `pnpm typecheck`, `pnpm lint` (không phát sinh lỗi mới ngoài cảnh báo CRLF có sẵn toàn repo), `pnpm build`, `pnpm vitest run` (513/514 qua; ca đo hiệu năng không liên quan trong `rows.test.ts` chập chờn theo máy, chạy lại riêng thì qua)
- [x] 5.2 Lái thử bản build thật bằng Playwright `_electron` (tạo tác phẩm/chương mẫu qua `window.mira`, không qua form): chụp ảnh xác nhận cả bốn thay đổi ở mục 1–4, không có lỗi console
- [x] 5.3 Cập nhật `docs/handbook`: `product/decisions.md` ("Nội dung chung" — Live Preview nhẹ), `product/open-questions.md`, `delivery/backlog.md` (`ai-chat-panel` → Chỉ minh họa, `rendered-direct-edit-view` → Đã triển khai, `work-area-nav-v2` → Không làm hiện tại), `engineering/current-state.md`, `maintenance/changelog.md`
- [ ] 5.4 Sau khi archive change này: chạy lại bảng ca IME thật (việc 2.4) nếu chưa làm, trước khi coi Live Preview là đã nghiệm thu đầy đủ theo tiêu chuẩn IME của dự án
