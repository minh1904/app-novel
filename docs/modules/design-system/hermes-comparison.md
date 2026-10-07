# Design system của Hermes Desktop và cách chuyển sang Mira

Cập nhật: 2026-10-07 · Trạng thái: **Quan sát** (phần 1–3), **Đề xuất** (phần 4–5). Hướng đi đã được
chủ sản phẩm chốt cùng ngày, ghi ở [chương chính](README.md). Chủ trì: chủ sản phẩm.

## Câu hỏi chương này trả lời

Hermes Desktop dựng giao diện bằng những token nào (chữ, màu, nền cửa sổ, bán kính, bóng, component),
và muốn Mira trông "y hệt" thì phải đổi những gì trong `tokens.css`, khung cửa sổ và component dùng chung?

## Nguồn

| Nguồn | Đọc ngày | Ghi chú |
| --- | --- | --- |
| Bản checkout `D:\personal\hermes-agent` commit `bf871a5943`, thư mục `apps/desktop` | 2026-10-07 | Chỉ đọc mã. Chưa cài `node_modules` nên chưa đọc CSS của thư viện phụ thuộc. |
| `apps/desktop/src/styles.css` (3.817 dòng) | 2026-10-07 | Gần như mọi token nằm ở đây. |
| `apps/desktop/src/themes/context.tsx`, `apps/shared/src/theme-presets.ts`, `apps/shared/src/translucency.ts` | 2026-10-07 | Theme áp lúc chạy, bảng màu preset, cấu hình kính. |
| `apps/desktop/DESIGN.md`, `src/components/ui/*` | 2026-10-07 | Quy tắc thiết kế và component nền. |

Đường dẫn Hermes bên dưới tính từ `apps/desktop/` trừ khi ghi khác. Chưa chạy app Hermes để chụp ảnh đối
chiếu; các giá trị màu "đã trộn" ở phần 2 là tính tay, sai số khoảng ±1 bậc hex.

## 1. Nền kỹ thuật (quan sát)

Hermes và Mira gần giống nhau ở tầng kỹ thuật, nên chuyển được bằng cách thay giá trị token chứ không
phải dựng lại:

| | Hermes | Mira |
| --- | --- | --- |
| CSS | Tailwind 4.3.3 CSS-first, `@theme inline`, không có tailwind.config | Như Hermes |
| Primitive | `radix-ui` 1.6.7 kiểu shadcn `new-york`, `cva` + `tailwind-merge` | `@base-ui/react` 1.8.0, helper `cx.ts` |
| Icon | Tabler (mặc định), VS Code Codicons cho icon nhỏ | Solar |
| Theme | class `.dark` trên `<html>`, 12 skin, mặc định skin "nous" | `data-theme` trên `<html>`, một skin |
| Store | nanostores | zustand |

## 2. Token (quan sát)

**Chữ** (`styles.css:476-494, 797-812`):

- Font UI là `'Segoe WPC', 'Segoe UI', …system-ui`; font mono là JetBrains Mono, đóng gói woff2 (400,
  700, 400 nghiêng), fallback Cascadia Code. Wordmark dùng font `Collapse` 700 viết hoa; Mira không cần.
- `html` 16 px; `body` **13 px** (0,8125rem), line-height 1,5, `user-select: none`, antialiased.
- Cửa sổ mặc định **zoom 90 %** (`electron/zoom.ts:18`), nên chữ thân thực tế khoảng 11,7 px.
- Chữ chat nhân thêm `--chat-text-scale`, mặc định **110 %** (≈ 12,9 px sau zoom).
- Cỡ dùng thật: 11 px (nút xs, tooltip, segmented), 12 px (`text-xs`, nút và ô nhập), 13 px (dòng
  sidebar, chữ chat), 14 px (`text-sm`, cỡ lg). Badge 10,4 px và 9,6 px.
- Weight 500 cho nút và nhãn, 600 cho chữ nhấn.

**Màu, skin "nous"** (`apps/shared/src/theme-presets.ts:125-181`), là màu Hermes hiện ra khi mới cài:

| Vai trò | Sáng | Tối |
| --- | --- | --- |
| background | `#ffffff` | `#0d1117` |
| foreground | `#1f2328` | `#e6edf3` |
| card | `#f6f8fa` | `#010409` |
| muted / chữ muted | `#f6f6f6` / `#656d76` | `#1a1e24` / `#7d8590` |
| popover | `#ffffff` | `#161b22` |
| primary (accent) | `#0053fd` | `#4a84fe` |
| border | `#d0d7de` | `#30363d` |
| destructive | `#cf222e` | `#f85149` |
| sidebar | `#f6f8fa` | `#010409` |
| bong bóng tin người dùng | `#dae7fd` | `#07162c` |

Khoảng 11 màu gốc sinh ra mọi token `--ui-*` bằng `color-mix(in srgb, …)` (`styles.css:203-626`):

- **Mặt nền:** chrome, sidebar, editor, elevated là màu gốc trộn với một màu trung tính. Ở theme tối,
  trung tính là `#0d0d0e`, `#0a0a0b`, `#161618`.
- **Lớp phủ:** fill (16/11/8/5/3 %) và stroke (24/16/10/6 %) là accent trộn với chữ nền, phủ trong suốt.
- **Hover và chọn:** hover dòng là accent 4 % cộng chữ 3 %; dòng đang chọn là accent 8 % cộng chữ 5 %.
- **Chữ:** bốn bậc chữ lấy màu chữ nền với độ đục 94 / 74 / 54 / 36 %.

Màu nền lúc khởi động được vẽ trước từ localStorage để không chớp.

**Nền cửa sổ** (`electron/main.ts:1627-1655`, `styles.css:655-712`):

- `titleBarStyle: 'hidden'`, overlay nút cửa sổ trong suốt `rgba(1,0,0,0)`, thanh tiêu đề **34 px**.
- Windows 11 (build 22621 trở lên) có thể bật kính: `backgroundMaterial: 'acrylic'`. Khi bật kính:
  - Sidebar để trong suốt, giữ lại 71 % màu nền (độ đậm kính mặc định 29).
  - Cột nội dung vẫn đặc, tách khỏi sidebar bằng một điểm dừng gradient cứng.
- Không có gradient hay noise ở nền mặc định. Ảnh nền "Backdrop" là tùy chọn và mặc định tắt.
- Menu, select, dialog có nền elevated 96 % đục, `backdrop-filter: blur(0.75rem) saturate(1.08)`.
- Pane chat không focus mờ xuống 62 % (sáng) / 72 % (tối) và giảm bão hòa 20 %.

**Bán kính** (`styles.css:156-163, 496-501`):

- Mọi radius của Tailwind nhân với `--radius-scalar: 0.2`: md 2 px, lg 2,4 px, xl 3,2 px. `rounded-full`
  cũng bị co.
- Nút chữ và ô nhập 2,5 px; nút icon 4 px; badge 3 px; tooltip 4 px.
- `DESIGN.md` ghi nút chữ vuông, chỉ nút icon được bo 4 px.

**Bóng và viền** (`styles.css:174-199`):

| Token | Định nghĩa |
| --- | --- |
| `shadow-sm` | viền 1 px chữ 6 % + bóng 8 px 4 % đen |
| `shadow-md` (menu) | viền 1 px chữ 8 % + 16 px 8 % + 32 px −24 px 18 % |
| `shadow-nous` (dialog) | bốn lớp bóng mềm 6–7 % |
| `--stroke-nous` (viền dialog) | `currentColor` 3 % |

- Viền mặc định: `* { border-color: var(--dt-border) }`.
- Ô nhập: nền trong suốt, viền là màu ring 7 % (14 % khi hover), bóng trong 1 px. Khi focus, viền chuyển
  hẳn sang màu ring.

**Focus:** Hermes **tắt outline và ring ở mọi phần tử** (`styles.css:1317-1325`). Chỉ ô nhập còn đổi
màu viền khi focus.

**Chuyển động:**

- Nút đổi trạng thái trong 100 ms. Hover dòng hiện ngay khi rê vào và mờ dần 100 ms khi rời.
- Ô nhập 200 ms; dialog 200 ms; tooltip trễ 200 ms rồi hiện, không có hiệu ứng vào.
- `prefers-reduced-motion` và `prefers-reduced-transparency` tắt hết hiệu ứng và kính.

**Thanh cuộn:** rộng 8 px, track trong suốt. Thumb ẩn cho tới khi rê chuột vào vùng cuộn, khi đó hiện
18 %, rê vào thumb thì 40 %.

**Thang z-index:** backdrop 120, modal 130, popover trong modal 140, over-modal 200, onboarding 1300,
crash 1500.

## 3. Component và khung (quan sát)

**Button** (`src/components/ui/button.tsx:14-77`):

- Biến thể: `default` (nền primary), `destructive`, `outline` (viền trong 1 px stroke 50 %), `secondary`,
  `ghost`, `link`, `text`, `floating`.
- Cỡ:

  | Cỡ | Kích thước |
  | --- | --- |
  | `default` | `px-3 py-1.5`, 12 px chữ, cao ≈ 28 px |
  | `xs` | 11 px chữ |
  | `sm` | `px-2.5 py-1` |
  | `lg` | 14 px chữ |
  | icon | 36 / 32 / 24 px |

- Prop `loading` giữ nguyên kích thước nút và phủ spinner lên trên.

**Control** (`control.ts`): Input, Textarea và SelectTrigger dùng chung một lớp `desktop-input-chrome`,
cùng bốn cỡ xs/sm/default/lg.

**Menu** (`menu.ts`):

- Bề mặt có padding 4 px, viền stroke-secondary, `shadow-md`, blur.
- Mục menu `px-2 py-1` chữ 12 px, bo 2 px; mục focus tô màu active.

**Các component khác:**

| Component | Đặc điểm |
| --- | --- |
| Dialog | Nền phủ đen 22 % với blur 2 px; khung rộng tối đa 32rem, bo 3,2 px, nền màu bong bóng chat, `shadow-nous` |
| Tooltip | Nền màu chữ, chữ màu nền, 11 px, có mũi tên 10×5 |
| Switch | 36×20 px |
| Tabs | 36 px, nền muted |
| Segmented | Track nền tertiary, mục đang chọn nền background |
| Badge | Nền màu 10 % |

Hermes không có Card: "thẻ" là khối không viền, nền widget.

**Khung:**

| Phần | Kích thước |
| --- | --- |
| Thanh tiêu đề | 34 px, viền dưới stroke-tertiary; nút 24×24, icon 13,9 px |
| Sidebar | Mặc định 237 px, tối đa 360 px; dòng cao 28 px, chữ 13 px weight 500, bo 2 px |
| Status bar | 20 px |
| Lề trang | `clamp(1.25rem, 4vw, 4rem)`; nội dung rộng tối đa 75rem |

## 4. Ánh xạ sang token Mira (đề xuất)

Giữ cấu trúc ba tầng của Mira và tên Tailwind (`bg-canvas`, `text-ink`, `rounded-control`…) để các màn
không phải sửa. Chỉ thay **giá trị** và bổ sung token Mira chưa có.

| Mira | Đổi thành (theo Hermes "nous") |
| --- | --- |
| `--neutral-*`, `--accent` | Bỏ thang trung tính Obsidian. Tầng 1 gồm ~11 màu gốc của skin "nous" cho sáng và tối, cộng ba màu trung tính chrome/sidebar/card |
| `surface-canvas` / `raised` / `sidebar` / `chrome` | Lần lượt là `--ui-bg-editor` / `--ui-bg-elevated` / `--ui-bg-sidebar` / `--ui-bg-chrome`, dẫn xuất bằng `color-mix` như Hermes |
| `surface-hover` / `surface-active` | Hover dòng (accent 4 % + chữ 3 %) / dòng đang chọn (accent 8 % + chữ 5 %) |
| `text-primary/muted/faint` | Chữ nền với độ đục 94 / 74 / 54 %. Thêm bậc 36 % cho chữ trang trí |
| `border-subtle/strong` | Stroke tertiary / secondary |
| `action-primary` | `#0053fd` / `#4a84fe`. Chữ trên nút primary là `#fcfcfc` |
| `status-*` | `--ui-red/orange/green/cyan` của Hermes |
| Chữ UI 12/13/15/20/26 | Thang mới: 11 / 12 / 13 / 14 / 16. Bỏ 15/20/26, trừ tiêu đề màn dùng 16 |
| Bán kính 4/6/12/16 | 2,5 px cho nút chữ và ô nhập, 4 px cho nút icon và tooltip, 3,2 px cho dialog. Badge 3 px |
| `shadow-popover` / `shadow-overlay` | `shadow-md` / `shadow-nous` cộng viền `stroke-nous`. Dialog **có** bóng, thay quyết định cũ |
| `--header-height` 40 px | 34 px. Đồng bộ `TOP_BAR_HEIGHT` trong `titleBar.ts` |
| `--control-height` 30 px | Khoảng 28 px theo padding của Hermes |
| Thời gian chuyển động 140 ms | 100 ms cho control, 200 ms cho ô nhập và dialog |
| Font UI Segoe UI Variable | `'Segoe WPC', 'Segoe UI'`. Code đổi sang JetBrains Mono đóng gói. Editor chương giữ Google Sans Flex: Hermes không có editor văn xuôi để học theo |
| Thanh cuộn hệ thống | Thanh cuộn 8 px kiểu Hermes |
| Không có z-index | Thêm thang z-index của Hermes |

**Khung cửa sổ.** Thêm `backgroundMaterial: 'acrylic'` trên Windows 11 build 22621 trở lên, cùng CSS
kính cho sidebar. Overlay nút cửa sổ để trong suốt. Màu biểu tượng nút cửa sổ lấy theo màu chữ của theme,
nên `CHROME_COLORS` và test đối chiếu trong `titleBar.test.ts` phải đổi theo. Mặc định của Hermes là
**tắt** kính. Câu hỏi bật kính hay không nằm ở phần 5.

**Component.** Viết lại biến thể và cỡ của Button, TextField, TextArea, Select, Menu, Dialog, Switch,
Tabs và Badge theo phần 3, trên `@base-ui/react` như hiện tại (không đổi sang Radix). Thêm hai component
Mira còn thiếu:

- **Tooltip:** đúng khoảng trống đã ghi ở [chương chính](README.md).
- **SegmentedControl.**

Giữ icon Solar: đổi bộ icon là việc riêng và không ảnh hưởng tới cỡ chữ hay màu.

**Giữ của Mira, khác Hermes:**

- **Focus ring.** Hermes tắt hẳn focus. Mira giữ vòng focus 2 px màu accent cho `:focus-visible`, vì người
  dùng bàn phím cần biết mình đang ở đâu (chủ sản phẩm đồng ý ngày 2026-10-07).
- **Lựa chọn chữ.** Hermes đặt `user-select: none` cho cả body. Mira cho chọn chữ trong editor, trong câu
  trả lời AI và trong mọi văn bản truyện.

**Kiểm tra.** `tokens.test.ts` vẫn cấm giá trị tùy ý. Các radius 2,5 px và 3,2 px phải thành token có
tên, không viết `rounded-[2.5px]` trong màn hình.

## 5. Câu hỏi đã chốt và còn mở

Chủ sản phẩm chốt hai câu hỏi ngày 2026-10-08, chọn "như Hermes":

1. **Zoom 90 %:** đặt zoom mặc định của cửa sổ 90 %, dùng nguyên các số 13 / 12 / 11 px. Editor chương
   được nâng `--text-editor` để bù phần bị thu nhỏ.
2. **Kính acrylic:** mặc định **tắt**, bật bằng công tắc trong Cài đặt.

Còn mở:

3. **Nhiều skin.** Có làm nhiều skin (github, catppuccin…) và cho đổi accent không? Đề xuất: lúc đầu chỉ
   làm "nous", nhưng để token ở dạng màu gốc trộn `color-mix` để thêm skin sau mà không sửa màn hình.

---

[Chương chính](README.md) · [Phân tích Obsidian (hướng cũ)](obsidian-comparison.md) ·
[Mục lục module](../README.md)
