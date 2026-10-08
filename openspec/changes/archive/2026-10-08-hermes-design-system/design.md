## Context

Lý do làm change này xem `proposal.md`. Số đo từ Hermes nằm ở
`docs/modules/design-system/hermes-comparison.md`.

**Mira hiện tại:**

- **Token:** ba tầng token trong `src/renderer/src/styles/tokens.css`, gồm thang `--neutral-*` cùng
  `--accent`, vai trò semantic, và kích thước. Màn hình dùng chúng qua tên Tailwind trong `@theme inline`.
- **Theme:** chuyển bằng `html[data-theme]`. `uiStore` báo theme cho main qua `app:chrome-theme` để tô ba
  nút cửa sổ.
- **Màu nút cửa sổ:** `src/main/electron/titleBar.ts` giữ bản chép tay của `--surface-chrome` và
  `--text-muted`. `titleBar.test.ts` đọc `tokens.css` để so hai nơi.
- **Phép kiểm token:** `tokens.test.ts` cấm cỡ chữ, line-height, tracking, radius, shadow tùy ý, và cấm
  đọc `var(--x)` chưa định nghĩa.
- **Mức dùng hiện nay**, đếm bằng grep ngày 2026-10-07:

  | Tên | Số chỗ dùng |
  | --- | --- |
  | `text-ui-xs` | 260 |
  | `text-ui-sm` | 78 |
  | `text-ui-md` | 9 |
  | `text-ui-lg` | 5 |
  | `text-ui-title` | 3 |
  | `rounded-control` | 93 |
  | `rounded-panel` | 32 |
  | `rounded-item` | 22 |
  | Button `outline` | 51 |
  | Button `ghost-muted` | 32 |
  | Button `secondary` | 30 |

- **Cửa sổ:** `src/main/index.ts` tạo cửa sổ với `titleBarStyle: 'hidden'` và overlay 39 px. Chưa có zoom,
  chưa có `backgroundMaterial`. Mira chưa có tệp tùy chọn ứng dụng nào ngoài workspace.
- **Cài đặt:** chỉ có màn "Kết nối AI". Chú thích trong mã ghi rõ không vẽ mục cài đặt chưa tồn tại.
- **CSP:** `font-src 'self'`, nên font phải đóng gói trong app.

## Goals / Non-Goals

**Goals:**

- Đổi giá trị token và component để Mira nhìn như Hermes, mà gần như không phải sửa tên lớp trong màn
  hình.
- Giữ phép kiểm token làm hàng rào và mở rộng nó cho z-index.

**Non-Goals:**

- Không chép runtime theme của Hermes (`applyTheme`, 12 skin, nhập theme VS Code).
- Không đổi sang Radix hay Tabler.
- Không dọn hết khoảng 400 kích thước `h-[…]` / `w-[…]` tùy ý. Chỉ sửa chỗ bị lệch do thanh trên và cỡ
  control đổi.

## Decisions

### D1. Giữ tên Tailwind, đổi giá trị; chỉ thêm tên mới khi Hermes có bậc Mira chưa có

Màn hình tiếp tục viết `bg-canvas`, `text-ink-muted`, `rounded-control`. Đổi ở tầng token là đủ cho
khoảng 90 % chỗ dùng.

*Phương án loại:* chép nguyên tên token `--ui-*` / `--dt-*` của Hermes. Cách này buộc sửa hơn 600 chỗ
trong màn hình, trong khi kết quả hiển thị như nhau.

**Thang chữ:**

| Tên | Cũ | Mới | Lý do |
| --- | --- | --- | --- |
| `text-ui-2xs` (mới) | — | 11 px | Nút xs, tooltip, segmented |
| `text-ui-xs` | 12 | 12 | Chữ của control |
| `text-ui-sm` | 13 | 13 | Chữ thân, dòng sidebar |
| `text-ui-md` | 15 | 14 | `text-sm` của Hermes |
| `text-ui-lg` | 20 | 16 | Tiêu đề khối |
| `text-ui-title` | 26 | 20 | Tiêu đề trang Thư viện, Chi tiết tác phẩm |

`text-ui-title` không có trong Hermes. Hermes không có màn thư viện, nên Mira giữ một bậc tiêu đề và hạ
nó cho cân với chữ 13 px.

**Bán kính:**

| Tên | Cũ | Mới | Dùng cho |
| --- | --- | --- | --- |
| `rounded-control` | 6 | 2,5 | Nút chữ, ô nhập |
| `rounded-item` | 4 | 2 | Mục menu, dòng sidebar (`rounded-md` của Hermes) |
| `rounded-tab` | 6 | 2,5 | |
| `rounded-panel` | 12 | 3,2 | Dialog, panel |
| `rounded-icon` (mới) | — | 4 | Nút icon, tooltip |
| `rounded-badge` (mới) | — | 3 | Badge |

**Bóng:** `shadow-popover` lấy giá trị `shadow-md` của Hermes; `shadow-overlay` lấy `shadow-nous`. Thêm
`--stroke-nous` cho viền dialog.

**Chuyển động:** `--duration-fast` 100 ms, `--duration-moderate` 200 ms.

### D2. Màu: màu gốc tĩnh trong CSS, dẫn xuất bằng `color-mix`

Tầng 1 là các màu gốc của skin "nous" cho mỗi theme, trong khối `html[data-theme='dark']` / `'light'`,
cộng ba màu trung tính chrome/sidebar/card của Hermes. Tầng 2 dẫn xuất bằng đúng công thức `color-mix` ở
`styles.css:203-626` của Hermes:

| Mira | Hermes |
| --- | --- |
| `surface-canvas` | `--ui-bg-editor` |
| `surface-raised` | `--ui-bg-elevated` |
| `surface-sidebar` | `--ui-bg-sidebar` |
| `surface-chrome` | `--ui-bg-chrome` |
| `surface-control` / `surface-control-hover` | `--ui-bg-quaternary` / `--ui-control-hover-background` |
| `surface-hover` / `surface-active` | `--ui-row-hover-background` / `--ui-row-active-background` |
| `surface-popover` | `color-mix(elevated 96 %, transparent)` |
| `text-primary` / `muted` / `faint` | Chữ nền ở độ đục 94 / 74 / 54 % |
| `text-decor` (mới) | Chữ nền ở độ đục 36 % |
| `border-subtle` / `border-strong` | Stroke tertiary / secondary |
| `status-*` | `--ui-red/yellow/green/cyan` |

Hermes còn có một `applyTheme()` chạy bằng JS. Mira bỏ phần này: chỉ có một skin, nên CSS tĩnh đủ dùng,
và không có khung hình nào bị sai màu trước khi JS chạy.

**Màu nút cửa sổ.** Overlay nút cửa sổ dùng nền **trong suốt**, như Hermes (`rgba(1,0,0,0)`), nên chỉ còn
màu biểu tượng phải chép tay. Màu đó là `--text-muted` của mỗi theme. Màu này phải là hex tĩnh, vì main
process không đọc được `color-mix`. `titleBar.test.ts` chuyển sang so `symbolColor` với hai giá trị hex đó.

*Phương án loại:* chép hex của nền chrome như hiện nay. Chrome trộn bằng `color-mix`, nên hex chép tay sẽ
lệch khi đổi tỉ lệ trộn.

### D3. Zoom cố định 0,9 ở main process

- **Đặt zoom:** `webContents.setZoomFactor(0.9)` sau `did-finish-load`.
- **Chặn zoom tay:** `setVisualZoomLevelLimits(1, 1)` chặn zoom bằng cử chỉ. Bắt `before-input-event` để
  chặn `Ctrl` + `=` / `-` / `0` và `Ctrl` + lăn chuột. Như vậy overlay luôn cao `round(34 × 0,9) = 31` px.
- **Hằng số:** `TOP_BAR_HEIGHT` thành `Math.round(34 * ZOOM) - 1`, giữ lại hàng viền dưới như chú thích
  hiện nay.
- **Editor chương:** `--text-editor` nâng từ 16 lên 18 px, hiển thị 16,2 px sau zoom, để văn bản truyện
  không nhỏ đi.

*Phương án loại:*

- Chia mọi token cho 0,9. Số sẽ lẻ và không còn khớp số đo của Hermes.
- Cho người dùng tự zoom như Hermes. Khi đó overlay phải theo dõi `zoom-changed`. Việc này để sau.

### D4. Tùy chọn kính: tệp `appearance.json` trong `userData`, đọc đồng bộ trước khi tạo cửa sổ

Tùy chọn kính khác workspace (`workspace:load/save`) ở hai điểm: main cần biết nó **trước** khi tạo
`BrowserWindow`, và nó không gắn với tác phẩm nào.

- **Lưu và đọc:** tệp `appearance.json` dạng `{ "glass": false }`, kiểm bằng valibot. Tệp hỏng hoặc thiếu
  thì coi như tắt.
- **Hỗ trợ:** `os.release()` ≥ `10.0.22621` và `process.platform === 'win32'`. Tính một lần lúc khởi động.
- **Lúc tạo cửa sổ:** nếu bật và được hỗ trợ thì truyền `backgroundMaterial: 'acrylic'` và
  `backgroundColor: '#00000000'`. Ngược lại giữ `backgroundColor` đặc như hiện nay.
- **Lúc đổi:** dùng `setBackgroundMaterial('acrylic' | 'none')` cùng `setBackgroundColor(...)`, không tải
  lại trang.
- **Renderer biết kính đang bật:** main thêm query `?glass=1` vào URL lúc nạp trang. Script khởi động đặt
  `html[data-glass]` trước lần vẽ đầu tiên, nên không có khung hình nền đặc rồi mới chuyển sang kính.
  Sau đó IPC đổi thuộc tính này.
- **IPC mới:** `app:appearance:get` trả `{ glass, glassSupported }`; `app:appearance:set` nhận
  `{ glass }`, ghi tệp rồi áp ngay. Cả hai chỉ nhận lệnh từ khung trên cùng của cửa sổ Mira
  (`isTrustedSender`).
- **CSS kính:** chép mẫu "sidebar scope" của Hermes (`styles.css:655-712`). Khi `html[data-glass]`:
  - `html` và `body` trong suốt;
  - nền sidebar là `color-mix(chrome 71 %, transparent)`, với 71 = 100 − độ đậm 29 mặc định của Hermes;
  - canvas, editor và panel AI giữ nền đặc.
- **Giảm trong suốt:** `@media (prefers-reduced-transparency: reduce)` trả mọi mặt nền về đặc.

*Phương án loại:*

- Lưu tùy chọn kính trong SQLite thư viện: thư viện mở sau cửa sổ, và tùy chọn này không thuộc dữ liệu
  dịch.
- `transparent: true`: làm mất resize và bóng cửa sổ trên Windows; Hermes cũng tránh.

### D5. Component trên `@base-ui/react`, giữ API hiện có

- **API hiện có giữ nguyên:** tên biến thể của Button (thêm `text`, giữ `ghost-muted`) và tên cỡ
  (`xxs` … `xl`, `icon`, `icon-lg`), để không phải sửa hơn 130 chỗ gọi.
- **Giá trị đổi theo Hermes:**

  | Cỡ / phần | Hermes |
  | --- | --- |
  | `default` | Chữ 12 px, `px-3 py-1.5`, cao ≈ 28 px |
  | `lg` | Chữ 14 px |
  | Cỡ icon | 24 / 32 px |
  | `outline` | Viền trong 1 px bằng `shadow-[inset…]` qua token, không dùng `border` |

- **`loading`:** prop mới của Button. Chữ ẩn bằng `invisible`, spinner nằm chồng lên giữa.
- **Ô nhập:** TextField, TextArea và Select dùng chung lớp `.input-chrome` trong `tokens.css`, tương ứng
  `.desktop-input-chrome` của Hermes.
- **Tooltip:** dùng `@base-ui/react/tooltip`. Có một `TooltipProvider` ở App, delay 200 ms. Bọc qua
  `<Tip label>` để thay dần các `title=`; đợt này thay `title=` trên thanh trên và sidebar.
- **SegmentedControl:** dùng `@base-ui/react/toggle-group`.
- **Menu:** padding 4 px, mục `px-2 py-1` chữ 12 px. Mục focus tô `bg-active`.
- **Dialog:** lớp phủ `bg-black/22 backdrop-blur` qua token `--surface-backdrop`.

### D6. Focus, chọn chữ, thanh cuộn, z-index

- **Focus:** mọi component chung dùng `focus-visible:outline-2 outline-focus outline-offset-1`.
  `--focus-ring` là accent. Không dùng `ring` vì nút `outline` đã dùng `box-shadow` làm viền.
- **Chọn chữ:** `body` đặt `user-select: none` như Hermes. Lớp `.selectable` đặt `user-select: text`, gắn
  vào editor CodeMirror, câu trả lời AI, nội dung chương và ô nhập (ô nhập vốn đã chọn được).
- **Thanh cuộn:** CSS `::-webkit-scrollbar` áp toàn cục, chép `styles.css:1479-1503` của Hermes.
- **Thang z-index:**

  | Token | Giá trị |
  | --- | --- |
  | `--z-backdrop` | 120 |
  | `--z-modal` | 130 |
  | `--z-modal-popover` | 140 |
  | `--z-over-modal` | 200 |

  Popup của base-ui được đặt z-index qua token. `tokens.test.ts` thêm luật cấm `z-\d+` và `z-[…]` trong
  màn hình. Ba chỗ `z-10` hiện có đổi sang token `--z-raised` (10).

### D7. JetBrains Mono đóng gói

Tải `JetBrainsMono-Regular/Bold/Italic.woff2` (bản 2.304, giấy phép OFL 1.1) từ bản phát hành chính thức
trên GitHub vào `src/renderer/src/assets/fonts/`, kèm tệp `OFL.txt`. Khai báo `@font-face` với
`font-display: swap`. Không thêm dependency npm.

## Risks / Trade-offs

- **[Chữ nhỏ]** 12 px ở zoom 0,9 chỉ còn khoảng 10,8 px; người dịch ngồi lâu có thể mỏi mắt. → Đúng với yêu
  cầu "y hệt Hermes". Editor được bù lên 18 px. Nếu sau khi dùng thật thấy khó đọc, thì chỉ cần đổi một
  hằng `ZOOM`.
- **[Tương phản]** Chữ faint 54 % trên nền tối có thể dưới 4,5:1. → Chỉ dùng cho chữ phụ cỡ ≥ 12 px. Bậc
  36 % (`text-decor`) chỉ dùng cho trang trí. Đo bằng công cụ trên ba màn chính trước khi đóng change.
- **[Bố cục lệch]** Thanh trên giảm 6 px và control thấp hơn, nên các `h-[…]` tùy ý được tính theo 40 px
  có thể lệch. → Rà các màn Thư viện, Chi tiết, Chương, Cài đặt ở cả hai theme và sửa chỗ lệch. Không dọn
  phần còn lại.
- **[Acrylic]** Kính có thể nặng GPU trên máy yếu, và một số driver vẽ nền đen. → Mặc định tắt; tắt công
  tắc là áp ngay.
- **[Đo layout CodeMirror]** CodeMirror đo layout bằng tọa độ đã zoom. → Zoom được đặt trước khi editor
  mount (sau `did-finish-load`, trước `ready-to-show`). Kiểm tra chọn chữ, con trỏ và cuộn trong editor
  chương.
- **[`user-select: none`]** Có thể chặn chọn chữ ở chỗ người dùng cần mà chưa gắn `.selectable`. → Danh
  sách chỗ cần chọn được ở D6. Có kịch bản kiểm thử trong spec.

## Migration Plan

Change này chỉ đổi giao diện; không có dữ liệu cần chuyển. `appearance.json` được tạo lần đầu khi người
dùng bật công tắc. Muốn quay lại thì revert các commit của change này. Tệp `appearance.json` còn sót lại
cũng vô hại, vì mã cũ không đọc nó.

## Open Questions

- Độ đậm kính 29 của Hermes có cần thanh trượt trong Cài đặt không? Hermes có thanh này. Đợt này chỉ có
  công tắc; thêm thanh trượt sau không đổi spec.
