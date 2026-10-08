## Why

Chủ sản phẩm quyết định ngày 2026-10-07 rằng Mira học **y hệt** giao diện Hermes Desktop: cỡ chữ, font,
nền, kiểu cửa sổ và cả design system. Quyết định này thay hướng Obsidian chốt ngày 2026-10-05
(`docs/modules/design-system/README.md`). Hai giai đoạn sau, kết nối AI và chat, sẽ dựng trên component
dùng chung. Vì vậy token và component phải chuyển trước, để không phải style lại hai lần.

## What Changes

**Token** (`src/renderer/src/styles/tokens.css`):

- Thay thang trung tính Obsidian bằng ~11 màu gốc của skin "nous" của Hermes, cho cả theme sáng và tối.
- Các mặt nền, lớp phủ hover/chọn, bốn bậc chữ và bốn bậc viền được dẫn xuất bằng `color-mix` như
  Hermes. Accent đổi từ tím sang xanh dương: `#0053fd` (sáng), `#4a84fe` (tối).
- Thang chữ UI đổi thành 11 / 12 / 13 / 14 / 16 px, chữ thân 13 px.
- Font UI đổi sang `'Segoe WPC', 'Segoe UI'`. Font code đổi sang JetBrains Mono, đóng gói woff2.
- Bán kính:

  | Phần tử | Bán kính |
  | --- | --- |
  | Nút chữ, ô nhập | 2,5 px |
  | Badge | 3 px |
  | Dialog | 3,2 px |
  | Nút icon, tooltip | 4 px |

- Bóng: `shadow-md` cho menu và popover; `shadow-nous` cùng viền `stroke-nous` cho dialog. Dialog có bóng,
  khác quyết định cũ.
- Popover và menu có nền mờ (blur).
- Chuyển động: 100 ms cho control, 200 ms cho ô nhập và dialog.
- Thêm thanh cuộn kiểu Hermes và thang z-index.
- **BREAKING**, chỉ về thị giác: mọi màn đổi màu, cỡ chữ và bán kính. Tên lớp Tailwind giữ nguyên, nên
  màn hình không phải sửa tên lớp. Riêng các tên cỡ chữ và bán kính sẽ ánh xạ lại; xem design.md.

**Khung cửa sổ:**

- Thanh trên cao 34 px thay vì 40 px. Overlay nút cửa sổ lấy màu theo theme mới.
- Cửa sổ có zoom mặc định 90 %.
- Thêm kính acrylic cho sidebar trên Windows 11 (build 22621 trở lên), **mặc định tắt**.

**Cài đặt:** thêm nhóm "Giao diện" với công tắc "Hiệu ứng kính (acrylic)". Lựa chọn được ghi nhớ giữa các
lần mở app.

**Component dùng chung:**

- Viết lại biến thể và cỡ của Button, TextField, TextArea, Select, Menu, Dialog, Switch, Tabs, Badge,
  SearchField, Panel, Banner theo Hermes, vẫn trên `@base-ui/react`.
- Thêm `Tooltip` và `SegmentedControl`.

**Giữ của Mira:**

- Vòng focus `:focus-visible` (Hermes tắt hẳn focus).
- Cho chọn chữ trong văn bản truyện và câu trả lời AI.
- Icon Solar.
- Font editor chương Google Sans Flex.
- Cấu trúc ba tầng token và tên lớp Tailwind.

**Ngoài phạm vi:**

- Màn onboarding và kết nối AI theo Hermes (giai đoạn 2).
- UI chat theo Hermes (giai đoạn 3).
- Nhiều skin và cho đổi accent.
- Bộ icon Tabler.

## Capabilities

### New Capabilities
- `design-system`: Token màu, chữ, bán kính, bóng, chuyển động, thanh cuộn, z-index và bộ component dùng
  chung mà mọi màn renderer phải dùng; quy tắc focus và chọn chữ; phép kiểm chặn giá trị tùy ý.
- `window-chrome`: Thanh tiêu đề và overlay nút cửa sổ, zoom mặc định, kính acrylic có công tắc trong
  Cài đặt.

### Modified Capabilities
<!-- openspec/specs/ đang trống; chưa có capability nào để sửa. -->

## Impact

**Renderer:**

- `src/renderer/src/styles/tokens.css` và `tokens.test.ts`.
- Mọi file trong `src/renderer/src/components/`, thêm `Tooltip.tsx` và `SegmentedControl.tsx`.
- `src/renderer/src/app/AppShell.tsx`.
- `src/renderer/src/features/settings/SettingsScreen.tsx`.
- Các màn còn tự style nút hoặc ô nhập sẽ chuyển sang component chung khi bị ảnh hưởng.
- Asset mới: JetBrains Mono woff2 (giấy phép SIL OFL).

**Main:**

- `src/main/index.ts`: `setZoomFactor` và `backgroundMaterial`.
- `src/main/electron/titleBar.ts` và test của nó.
- Một tệp tùy chọn giao diện nhỏ trong `userData`.

**IPC:**

- Kênh mới để đọc và ghi tùy chọn kính.
- `app:chrome-theme` giữ nguyên.

**Không đổi:** dữ liệu tác phẩm, luồng dịch, đề xuất, xuất file. Không thêm dependency npm.

**Tài liệu:** `docs/modules/design-system/README.md` mô tả token mới khi xong;
`docs/modules/design-system/hermes-comparison.md` là nguồn số đo.
