# Hệ thiết kế giao diện Mira

Cập nhật: 2026-10-08 · Trạng thái: **Đã chốt hướng** làm theo Hermes Desktop (skin "nous"); **đã
triển khai** trong working tree (change `hermes-design-system`, chưa commit). Chủ trì: chủ sản phẩm.

## Câu hỏi chương này trả lời

Mira dùng những token, khung cửa sổ và component nào để mọi màn (thư viện, tác phẩm, chương, cài đặt)
cùng một ngôn ngữ thị giác? Số đo của Hermes và lý do của từng lựa chọn nằm ở
[phân tích design system Hermes](hermes-comparison.md).

## Quyết định

**2026-10-07:** chủ sản phẩm yêu cầu Mira học **y hệt** Hermes Desktop: cỡ chữ, font, nền, kiểu cửa sổ,
cả design system. Quyết định này thay hướng Obsidian chốt ngày 2026-10-05. Hướng cũ còn trong
[phân tích Obsidian](obsidian-comparison.md) và trong bản chương này ở commit `f9c101a`; cả hai chỉ còn
giá trị lịch sử.

**2026-10-08:** chọn "như Hermes" cho hai câu hỏi mở: cửa sổ zoom 90 %, kính acrylic mặc định tắt.

**Mira giữ khác Hermes ở bốn điểm:**

- **Vòng focus.** Hermes tắt hẳn focus. Mira giữ vòng focus 2 px màu accent cho bàn phím; ô nhập thì báo
  focus bằng viền chuyển sang accent, như Hermes.
- **Chọn chữ.** Văn bản truyện, câu trả lời AI và phần diff đề xuất chọn được. Chữ của khung thì không,
  như Hermes.
- **Tương phản chữ phụ.** Hermes dùng bậc chữ 54 % cho mô tả; ở theme sáng mức này chỉ 3,5:1. Mira dùng
  bậc muted cho mô tả, đạt ≥ 6,3:1.
- **Icon và font editor.** Icon vẫn là Solar; editor chương vẫn dùng Google Sans Flex.

## Token đang chạy

[`tokens.css`](../../../src/renderer/src/styles/tokens.css) có ba tầng: màu gốc theo theme, vai trò
semantic dẫn xuất bằng `color-mix()` theo công thức của Hermes, và kích thước. Màn hình chỉ dùng tên
Tailwind trong `@theme inline`; tên lớp giữ nguyên từ hướng cũ.

| Nhóm | Giá trị (tối / sáng) | Ghi chú |
| --- | --- | --- |
| Màu gốc | chữ `#e6edf3` / `#1f2328`; accent `#4a84fe` / `#0053fd`; nền `#0d1117` / `#ffffff`; sidebar `#010409` / `#f6f8fa` | Skin "nous" của Hermes |
| Mặt nền | canvas = chrome ≈ `#0d1015` / `#fefefe`; sidebar `#010409` / `#f6f8fa`; raised (card) ≈ `#0e0f12` / `#fbfbfc`; popover là elevated 96 %, có blur | Cột nội dung mặc màu chrome như cột chat của Hermes |
| Hover, chọn | hover = accent 4 % + chữ 3 %; chọn = accent 8 % + chữ 5 %; control = accent 5 % + chữ 4 % | Đều trong suốt |
| Chữ | chính 94 %; muted hex `#aeb4b9` / `#595c60`; faint 54 %; decor 36 % | Faint dùng cho placeholder, phím tắt, số phiên bản; decor chỉ dùng trang trí |
| Viền | `line` = accent 10 % + chữ 5 %; `line-strong` = accent 16 % + chữ 7 % | |
| Trạng thái | error `#e75e78` / `#cf2d56`; warning `#c08532`; success `#55a583` / `#1f8a65`; info `#6f9ba6` / `#4c7f8c` | |
| Chọn chữ | vàng `#ffd24a` 38 % / 55 % | Như Hermes |
| Font | UI `'Segoe WPC', 'Segoe UI'`; code JetBrains Mono 2.304 đóng gói (OFL); editor Google Sans Flex | CSP không cho font từ CDN |
| Cỡ chữ | `text-ui-2xs` 11, `xs` 12, `sm` 13 (thân), `md` 14, `lg` 16, `title` 20; editor 18 | Cỡ trước zoom; sau zoom 90 % thân ≈ 11,7 px |
| Bán kính | `item` 2, `control`/`tab` 2,5, `badge` 3, `panel` 3,2, `icon` 4 px | |
| Bóng | `shadow-popover` (= `shadow-md` của Hermes) cho menu; `shadow-overlay` (= `shadow-nous`) cùng viền `hairline` cho dialog; `shadow-outline` cho nút outline | Dialog có bóng, lớp phủ đen 22 % có blur |
| Kích thước | thanh trên 34 px; control 28 px; sidebar 237 px | |
| Chuyển động | 100 ms cho control, 200 ms cho ô nhập và dialog; tắt khi `prefers-reduced-motion` | Spinner vẫn quay |
| Lớp chồng | `--z-raised` 10, `--z-backdrop` 120, `--z-modal` 130, `--z-modal-popover` 140, `--z-over-modal` 200 | Màn hình không được viết số z-index |
| Thanh cuộn | rộng 8 px, chỉ hiện khi rê vào vùng cuộn | Dải tab truyện cao 3 px |

**Tương phản**, đo ngày 2026-10-08 trên màu đã trộn:

| Theme | Nền | Chữ chính | Muted | Faint | Chữ trên nút primary |
| --- | --- | --- | --- | --- | --- |
| Tối | canvas / sidebar | 14,3 / 15,3 | 9,1 / 9,8 | 5,3 | 5,2 |
| Sáng | canvas / sidebar | 13,1 / 12,5 | 6,7 / 6,3 | 3,5 | 5,7 |

## Cửa sổ

- **Thanh tiêu đề.** Thanh trên của trang là thanh tiêu đề. Ba nút cửa sổ nằm trên overlay nền trong
  suốt; màu biểu tượng là `--text-muted`, chép tay ở [`titleBar.ts`](../../../src/main/electron/titleBar.ts)
  và có test đối chiếu.
- **Zoom.** Cố định 0,9 ([`zoom.ts`](../../../src/main/electron/zoom.ts)). Ctrl + `=` / `-` / `0`,
  Ctrl + lăn chuột và cử chỉ zoom bị chặn, để overlay luôn khớp thanh trên.
- **Kính acrylic.** Bật trong Cài đặt → Giao diện. Tùy chọn lưu ở `appearance.json` trong thư mục dữ
  liệu, được đọc trước khi tạo cửa sổ. Chỉ chạy trên Windows 11 build 22621 trở lên; máy cũ hơn thấy
  công tắc bị khóa kèm lý do. Khi kính bật, sidebar giữ 71 % màu chrome, vùng nội dung vẫn đặc.
  `boot.js` đặt `data-glass` trước lần vẽ đầu, nên mở app không chớp nền đặc.

## Component dùng chung

Ở [`components/`](../../../src/renderer/src/components/), dựng trên `@base-ui/react`:

- **Button:** biến thể default, outline, secondary, ghost, ghost-muted, destructive, link, text; cỡ xxs
  đến xl và hai cỡ icon (24 / 32 px). Prop `loading` giữ nguyên kích thước nút.
- **Ô nhập (TextField, TextArea, SearchField, Select, Slider):** dùng chung lớp `.input-chrome`. Viền mờ
  đậm lên khi hover, chuyển accent khi focus, đỏ khi không hợp lệ.
- **Các component khác:** Menu, Dialog, Switch (36×20), Tabs, Badge, Panel, Banner, EmptyState,
  SettingRow.
- **Mới:** `Tooltip` (`<Tip label>`, trễ 200 ms) và `SegmentedControl`.

Phép kiểm:

- [`tokens.test.ts`](../../../src/renderer/src/styles/tokens.test.ts) fail khi một màn dùng cỡ chữ,
  line-height, tracking, bán kính, bóng hoặc z-index tùy ý, hoặc đọc `var(--…)` chưa định nghĩa.
- [`components.test.ts`](../../../src/renderer/src/components/components.test.ts) fail khi một component
  tương tác thiếu vòng focus.

## Đã kiểm

Ngày 2026-10-08 đã chạy bản build trên Windows 11 với dữ liệu fixture và chụp chín màn: Thư viện, Tạo
tác phẩm, Chương, Cài đặt ở hai theme, cùng Chi tiết tác phẩm theme tối. Đã kiểm thêm:

- tooltip;
- vòng focus khi nhấn Tab;
- select nằm trên dialog;
- chọn chữ trong editor;
- bật/tắt kính.

Việc chạy app tìm ra và sửa hai lỗi:

- `outline-none` làm vòng focus không hiện;
- thanh cuộn mặc định của hệ điều hành đè lên chữ của tab truyện.

## Giới hạn

- **Chưa làm theo Hermes:** màn Cài đặt vẫn là một trang, chưa có điều hướng dọc; onboarding và chọn
  provider thuộc giai đoạn 2 ([Kết nối AI](../ai-connections/README.md)); UI chat thuộc giai đoạn 3
  ([nghiên cứu chat](../proposals/hermes-chat-research.md)).
- **Chỉ một skin**, chưa cho đổi accent.
- **Code còn style cũ:** khoảng 400 kích thước `h-[…]` / `w-[…]` tùy ý; nhiều nút và ô nhập trong màn
  feature vẫn tự style thay vì dùng component chung.
- **Tooltip:** mới thay trên thanh trên.

---

[Mục lục module](../README.md) · [Phân tích Hermes](hermes-comparison.md) ·
[Phân tích Obsidian (lịch sử)](obsidian-comparison.md)
