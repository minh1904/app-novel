## 1. Cỡ gọn cho control dùng trên thanh 42px

- [x] 1.1 `SearchField.tsx`: thêm prop `size` (`sm` cao 28px, icon 13px, padding hẹp hơn; `default` giữ nguyên 34px), không đổi hình các chỗ đang dùng
- [x] 1.2 `Select.tsx`: thêm prop `size` tương tự; popup và item giữ nguyên

## 2. Thư viện — phương án A

- [x] 2.1 `LibraryScreen.tsx` (`PopulatedLibrary`): gom tiêu đề + số đếm + ô tìm + hai bộ lọc + hai nút vào một thanh 42px; bỏ dòng phụ đề của mục (đã có ở nhãn thanh bên)
- [x] 2.2 Màn thành `flex h-full min-h-0 flex-col`; danh sách cuộn bên trong, trang không cuộn; panel "Tiếp tục gần đây" giữ cả hai dạng dải và cột phải (cột phải thêm viền trái và đệm vì giờ nó cao hết màn)
- [x] 2.3 `WorkTable`/`WorkRow`: hàng `px-2.5 py-1.5`, bìa `size="xs"`, tên 12.5px một dòng, dòng phụ 11px gộp ngôn ngữ + tác giả + tên gốc; bỏ thể loại và mô tả khỏi hàng; nút "Mở tác phẩm" → "Mở" cỡ `sm`; hàng tiêu đề cột dính đầu vùng cuộn, 11px
- [x] 2.4 Thu cột lưới cho khớp cỡ chữ mới và vùng thao tác 92px

## 3. Tạo tác phẩm — phương án C

- [x] 3.1 `WorkForm.tsx`: tách các trường thành ba cụm dùng lại được (bìa, bắt buộc, tùy chọn) mà không đổi hình đường không-stepped
- [x] 3.2 `WorkForm.tsx`: thêm prop `stepped` — thanh hai bước, tiêu đề theo bước, footer dính đáy 48px; bước 1 có "Tạo và bỏ qua phần còn lại" và "Tiếp tục", bước 2 có "Quay lại"
- [x] 3.3 `WorkForm.tsx`: "Tiếp tục" kiểm tra tên rỗng trước khi sang bước 2; lỗi lưu thuộc `title`/`sourceLang` đưa về bước 1 (`STEP_ONE_FIELDS`)
- [x] 3.4 `CreateWorkScreen.tsx`: bỏ tiêu đề 24px và khung `max-w-[760px]`, chuyển sang full height và bật `stepped`
- [x] 3.5 Kiểm hộp thoại "Sửa thông tin" không đổi hình (dùng đường không-stepped)

## 4. Chương chưa có bản gốc — phương án B

- [x] 4.1 `ChapterScreen.tsx`: thay header 24px bằng thanh chương 42px giống `ChapterWorkspace`, nút "Về tác phẩm" thành nút icon
- [x] 4.2 `ChapterScreen.tsx`: thay khối rỗng một-khối bằng hai thẻ "Dán văn bản" và "Chọn hoặc kéo tệp vào", mỗi thẻ có mô tả riêng
- [x] 4.3 `ChapterScreen.tsx`: thẻ tệp nhận `dragover`/`dragleave`/`drop`, đổi viền khi đang kéo, thả tệp thì mở hộp thoại ở bước xem trước

## 4b. Sửa lỗi và đồng bộ cỡ nút toàn app

- [x] 4b.1 **Lỗi**: ở bước 1, "Tạo và bỏ qua phần còn lại" là nút submit đầu tiên của form, nên Enter sau khi gõ tên tạo truyện luôn thay vì sang bước 2. Đổi lại: "Tiếp tục" là nút submit (Enter = sang bước 2), "Tạo và bỏ qua" thành nút thường gọi `submit()`; `onSubmit` của form phân nhánh theo bước
- [x] 4b.2 Quét `size="lg"` trên `<Button>` toàn `src/renderer` về cỡ mặc định 28px (43 chỗ, 14 tệp): hộp thoại, khối rỗng, khối lỗi, thanh công cụ, hàng danh sách
- [x] 4b.3 `ChapterPager`: nút trang `size="icon-lg"` (34px) → `size="icon"` (28px)
- [x] 4b.4 Giữ nguyên hero màn chào lần đầu của thư viện (`size="xl"` + `size="lg"`): đó là hành động duy nhất trên một màn trống, thu nhỏ làm màn trông như hỏng
- [x] 4b.5 `size` của `WorkCover` và `LanguageMark` không phải cỡ nút — không đụng

## 5. Kiểm chứng và tài liệu

- [x] 5.1 `pnpm typecheck`, `pnpm lint`, `pnpm test` (514/514 qua)
- [ ] 5.2 Người dùng mở app thật xem ba màn: thư viện có nhiều tác phẩm và thư viện rỗng, tạo tác phẩm cả hai bước (kể cả lối "Tạo và bỏ qua"), chương chưa có bản gốc (bấm nút và kéo thả tệp) — môi trường agent không chạy được Electron
- [ ] 5.3 Chốt hai màn còn lại (Chi tiết tác phẩm, Từng câu) từ [wireframe](../../../docs/handbook/experience/wireframes/README.md), rồi dựng tiếp
- [ ] 5.4 Cập nhật `engineering/current-state.md` và `maintenance/changelog.md` sau khi 5.2 đạt
