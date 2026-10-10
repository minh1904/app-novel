## 1. Baseline và kiểm tra ranh giới

- [ ] 1.1 Bắt đầu trên worktree không còn thay đổi chồng lấn với `source-system-foundation`, chạy
  `node scripts/check.mjs` và lưu kết quả baseline thành công trong ghi chú triển khai của change.
- [ ] 1.2 Thêm convention alias cho import qua boundary và test xác nhận `@renderer/*` resolve được trong
  typecheck web.
- [ ] 1.3 Thêm checker dùng TypeScript parser để phát hiện module import từ `app`, deep import liên module
  và chu trình module; kiểm bằng fixture hợp lệ/lỗi cho relative, alias, type-only import và re-export.
- [ ] 1.4 Nối boundary checker vào `node scripts/check.mjs` ở chế độ cho phép cây cũ có danh sách ngoại lệ
  tạm thời, rồi xác nhận toàn bộ check hiện tại vẫn qua.

## 2. Module thư viện

- [ ] 2.1 Tạo `modules/library` với các khu vực catalog, work form, cover, model, hooks và `public.ts` hẹp;
  xác nhận cây mới không có folder rỗng hoặc export chưa dùng.
- [ ] 2.2 Di chuyển source và test từ `features/library` cùng phần form tác phẩm đang thuộc `features/work`
  về owner thư viện, sửa import mà không đổi logic và chạy các test library/work form liên quan.
- [ ] 2.3 Di chuyển `libraryStore` về `modules/library/store`, giữ nguyên state transition và chạy test store
  cùng `node scripts/check.mjs`.

## 3. Module kết nối AI

- [ ] 3.1 Tạo `modules/ai-connections` cho settings, account login và model selection; di chuyển source/test
  từ `settings`, `models`, `onboarding` và xác nhận không còn vòng import giữa ba khu vực.
- [ ] 3.2 Di chuyển `connectionStore` về owner mới, giữ nguyên preference và connection lifecycle, rồi chạy
  test connection, settings, model selection và onboarding.
- [ ] 3.3 Tạo public surface tối thiểu cho model picker và hành động mở cài đặt; chuyển consumer sang
  `@renderer/modules/ai-connections/public` và xác nhận boundary checker không có deep import.

## 4. Module ngữ cảnh

- [ ] 4.1 Tạo `modules/context` và di chuyển glossary, addressing, shared glossary, style profile cùng test về
  các use case con; chạy test glossary và addressing.
- [ ] 4.2 Thay composition nội bộ của work detail bằng public surface của context hoặc app composition, rồi
  xác nhận module context không import workspace và boundary checker qua.

## 5. Module nguồn và export

- [ ] 5.1 Sau khi `source-system-foundation` ổn định, di chuyển `sources` và `updates` vào
  `modules/sources`, giữ nguyên contract `window.mira` và chạy test source/update renderer.
- [ ] 5.2 Di chuyển export scope/dialog vào `modules/export`, tạo public surface hẹp và chạy test export scope
  cùng các test màn gọi export.
- [ ] 5.3 Loại deep import từ sources/export sang module khác bằng shared contract, callback hoặc public
  surface một chiều; xác nhận graph module không có chu trình.

## 6. Module workspace

- [ ] 6.1 Tạo skeleton `modules/workspace` cho work detail, chapter navigation, chapter editor, assistant,
  translation và store; xác nhận mapping file được ghi trong ghi chú triển khai trước khi di chuyển.
- [ ] 6.2 Di chuyển `features/editor` vào chapter editor, giữ test cạnh model/editor extension và chạy toàn bộ
  test editor.
- [ ] 6.3 Di chuyển `features/chapter` vào các use case workspace, sửa import sang ai-connections/export qua
  public surface và chạy test chapter, chat, translation.
- [ ] 6.4 Di chuyển phần còn lại của `features/work` vào work detail/chapter navigation, loại phụ thuộc ngược
  với library bằng shared contract hoặc callback và chạy test work.
- [ ] 6.5 Di chuyển `chapterStore`, `aiChatStore` và `paneLayoutStore` vào workspace store, giữ nguyên listener
  và state transition rồi chạy test store và flow editor.
- [ ] 6.6 Tách `ChapterWorkspace`, `ChaptersArea` và các file trên 500 dòng theo responsibility đã có test;
  xác nhận UI contract qua test hiện hữu và `node scripts/check.mjs`.

## 7. App composition và state cấp app

- [ ] 7.1 Chuyển Home cùng placeholder chưa có domain model vào `app/screens`, xác nhận chúng chỉ compose
  public surface và không sở hữu business state mới.
- [ ] 7.2 Tách `App.tsx` thành lifecycle hook có nghĩa, điều hướng/content và workspace tabs; chạy test
  `AppShell`, autosave, leave guard và workspace restore.
- [ ] 7.3 Tách `uiStore` theo owner app/workspace/ai-connections bằng characterization test, giữ nguyên view,
  tab, theme, sidebar và settings behavior.
- [ ] 7.4 Chuyển notification state về hạ tầng app, cập nhật consumer và chạy test notification/toast.

## 8. Cưỡng chế kiến trúc và hoàn tất

- [ ] 8.1 Xóa toàn bộ ngoại lệ tạm của boundary checker, bật lỗi bắt buộc và xác nhận không còn deep import,
  import ngược hoặc chu trình giữa module.
- [ ] 8.2 Xóa `features` và `stores` cũ sau khi `rg` xác nhận không còn import; chạy
  `node scripts/check.mjs`.
- [ ] 8.3 Cập nhật `DESIGN.md` và tài liệu module từ trạng thái mục tiêu sang đã triển khai, ghi lại sai khác
  có chủ ý và xác nhận mọi link tài liệu còn hợp lệ.
- [ ] 8.4 Chạy `node scripts/check.mjs --build`, smoke test các màn Library, Work, Chapter, Settings,
  Sources và Updates ở bản build, rồi ghi bằng chứng hoàn tất trước khi push.
