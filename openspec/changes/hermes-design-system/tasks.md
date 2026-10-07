## 1. Font và token

- [x] 1.1 Tải JetBrains Mono 2.304 (Regular, Bold, Italic, woff2) cùng `OFL.txt` vào `src/renderer/src/assets/fonts/`, khai báo `@font-face`, đổi `--font-ui` sang `'Segoe WPC', 'Segoe UI'…` và `--font-code` sang JetBrains Mono. Kiểm: trong bản build, DevTools báo khối code dùng JetBrains Mono khi đã ngắt mạng.
- [x] 1.2 Viết lại tầng 1 của `tokens.css`: các màu gốc skin "nous" cho sáng và tối, ba màu trung tính chrome/sidebar/card. Viết lại tầng 2 bằng `color-mix` theo bảng D2, thêm `text-decor`. Kiểm: `tokens.test.ts` còn xanh, không còn `--neutral-*` nào.
- [x] 1.3 Đổi thang chữ, bán kính, bóng, thời gian chuyển động theo D1. Thêm `text-ui-2xs`, `rounded-icon`, `rounded-badge`, `--stroke-nous`, `--surface-backdrop` (đen 22 %). Kiểm: `tokens.test.ts` xanh, và grep không còn `--text-ui-display: 26px`.
- [x] 1.4 Thêm thang z-index (`--z-raised`, `--z-backdrop`, `--z-modal`, `--z-modal-popover`, `--z-over-modal`) và luật cấm `z-\d+` / `z-[…]` trong `tokens.test.ts`. Đổi ba chỗ `z-10`. Kiểm: test mới fail khi thêm tạm một `z-20`, xanh sau khi bỏ.
- [x] 1.5 Thêm vào lớp base:
  - `user-select: none` cho body và lớp `.selectable`;
  - thanh cuộn kiểu Hermes;
  - lớp `.input-chrome`;
  - quy tắc `prefers-reduced-transparency`.

  Kiểm: unit test đọc `tokens.css` thấy các selector này.

## 2. Component dùng chung

- [x] 2.1 Button: đổi giá trị biến thể và cỡ theo D5, giữ tên cũ, thêm biến thể `text` và prop `loading`. Kiểm: test render thấy nút đang loading giữ nguyên lớp kích thước, có spinner và `aria-busy`.
- [x] 2.2 TextField, TextArea, Select, SearchField dùng `.input-chrome`; viền đỏ khi `aria-invalid`. Kiểm: test render thấy lớp `input-chrome` và thuộc tính `aria-invalid` được truyền.
- [x] 2.3 Menu, Select popup: nền popover có blur, `shadow-popover`, z-index qua token, mục 12 px. Kiểm: mở select trong dialog bằng app thật, thấy popup nằm trên dialog.
- [x] 2.4 Dialog: lớp phủ backdrop, khung `rounded-panel`, `shadow-overlay`, viền `stroke-nous`, rộng tối đa 32rem. Cập nhật Switch (36×20), Tabs, Badge, Panel, Banner, EmptyState. Kiểm: `tokens.test.ts` và typecheck web xanh.
- [x] 2.5 Thêm `Tooltip.tsx` (`@base-ui/react/tooltip`, provider ở App, delay 200 ms, `<Tip label>`) và `SegmentedControl.tsx` (`toggle-group`). Kiểm: test render Tooltip hiện nhãn sau khi focus nút. Kết quả: test render chỉ kiểm `Tip` giữ nguyên control và SegmentedControl bấm đúng một lựa chọn; tooltip "Cài đặt" hiện khi Tab tới nút trong app thật.
- [x] 2.6 Mọi component chung dùng `focus-visible:outline-2 outline-focus outline-offset-1`. Kiểm: test quét `src/renderer/src/components/*.tsx` thấy mọi phần tử tương tác có lớp focus-visible; kiểm tay bằng Tab trong dialog.

## 3. Khung cửa sổ và zoom

- [x] 3.1 `titleBar.ts`:
  - overlay nền trong suốt;
  - `symbolColor` lấy theo `--text-muted` hex của mỗi theme;
  - `TOP_BAR_HEIGHT = Math.round(34 * ZOOM) - 1`.

  `titleBar.test.ts` so `symbolColor` với `tokens.css`. Kiểm: test xanh, và fail khi sửa tạm một hex.
- [x] 3.2 `--header-height` đổi thành 34 px. Rà `AppShell.tsx` (logo, tab truyện, slot thanh trên) cho vừa chiều cao mới. Kiểm: chạy app, thấy viền dưới thanh trên không bị ba nút cửa sổ che, kéo được cửa sổ, bấm được tab.
- [x] 3.3 Zoom 0,9 ở main:
  - `setZoomFactor` sau `did-finish-load`, trước khi hiện cửa sổ;
  - chặn `Ctrl` + `=` / `-` / `0`, `Ctrl` + lăn chuột và cử chỉ zoom.

  Kiểm: unit test cho hàm lọc phím; chạy app thấy `Ctrl` + `=` không đổi cỡ.
- [x] 3.4 Nâng `--text-editor` lên 18 px. Kiểm: trong editor chương, chọn chữ, đặt con trỏ và cuộn vẫn đúng vị trí ở zoom 0,9.

## 4. Kính acrylic

- [x] 4.1 Module tùy chọn giao diện ở main:
  - đọc và ghi `appearance.json` trong `userData`, kiểm bằng valibot;
  - tệp hỏng hoặc thiếu thì `glass: false`;
  - `glassSupported` dựa trên `win32` và `os.release()` ≥ 10.0.22621.

  Kiểm: unit test cho tệp thiếu, tệp hỏng, các phiên bản release 10.0.19045, 10.0.22621, 10.0.26200.
- [x] 4.2 `createWindow` áp `backgroundMaterial: 'acrylic'` cùng nền trong suốt khi bật và được hỗ trợ, và thêm `?glass=1` vào URL nạp trang. Script khởi động đặt `html[data-glass]` trước lần vẽ đầu. Kiểm: unit test cho hàm dựng tùy chọn cửa sổ; mở lại app khi kính đang bật thì không chớp nền đặc.
- [x] 4.3 IPC `app:appearance:get` / `app:appearance:set`:
  - contract valibot trong `src/shared/contracts`;
  - preload;
  - `isTrustedSender`;
  - đổi lúc chạy bằng `setBackgroundMaterial` và `setBackgroundColor`.

  Kiểm: test handler từ chối sender lạ và ghi tệp khi hợp lệ.
- [x] 4.4 CSS kính theo D4: sidebar giữ 71 % màu chrome, canvas, editor và panel AI đặc, giảm trong suốt thì trả về nền đặc. Kiểm: chạy app trên Windows 11 ở cả hai theme, bật và tắt công tắc, thấy sidebar có acrylic còn editor đặc.
- [x] 4.5 Cài đặt:
  - thêm nhóm "Giao diện" với `SettingRow` "Hiệu ứng kính (acrylic)", dùng Switch;
  - máy không hỗ trợ thì khóa công tắc và hiện dòng giải thích;
  - sửa chú thích "không thanh bên con" cho đúng thực tế.

  Kiểm: test render cho trạng thái không hỗ trợ; chạy app thấy đổi công tắc áp ngay.

## 5. Rà màn hình

- [x] 5.1 Gắn `.selectable` cho editor CodeMirror, câu trả lời AI (`SafeMarkdown`), nội dung chương và văn bản nguồn. Kiểm: chạy app, kéo chọn và sao chép được ở cả ba chỗ; chữ trên sidebar không chọn được.
- [x] 5.2 Thay `title=` bằng `<Tip>` trên thanh trên và sidebar. Kiểm: grep không còn `title=` trong `AppShell.tsx` và `LibrarySidebar.tsx`.
- [x] 5.3 Rà Thư viện, Tạo tác phẩm, Chi tiết tác phẩm, Chương (kèm panel AI), Cài đặt ở hai theme. Sửa chỗ lệch do thanh trên 34 px và control thấp hơn. Kiểm: chụp ảnh mười màn (5 × 2 theme) bằng skill `run`, đính kèm vào báo cáo cuối. Kết quả 2026-10-08: chụp 9/10 màn (thiếu Chi tiết tác phẩm theme sáng; theme tối đã chụp). Sửa dải tab truyện: bỏ `scrollbar-width` để thanh cuộn 3px không đè chữ.
- [x] 5.4 Đo tương phản chữ chính, muted và faint trên canvas và sidebar ở hai theme. Ghi số vào `docs/modules/design-system/README.md`. Kiểm: muted ≥ 4,5:1; faint chỉ dùng cho chữ ≥ 12 px. Kết quả: muted ≥ 6,3:1; faint chỉ 3,5:1 ở theme sáng nên mô tả và chữ phụ giữ muted (design D8).

## 6. Tài liệu và kiểm tra cuối

- [x] 6.1 Viết lại `docs/modules/design-system/README.md` (tiếng Việt):
  - bảng token đang chạy theo Hermes;
  - phần giữ của Mira;
  - kính và zoom;
  - các giới hạn còn lại;
  - chuyển phần Obsidian thành lịch sử.

  Kiểm: mọi link tương đối trong file trỏ tới file có thật.
- [x] 6.2 Chạy `node scripts/check.mjs --build`. Kiểm: typecheck, test hai pha và lint đều báo đã chạy và xanh.
