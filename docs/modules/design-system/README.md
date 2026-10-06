# Hệ thiết kế giao diện Mira

Cập nhật: 2026-10-05 · Trạng thái: **Đã chốt hướng** theo yêu cầu dùng hệ token gần Obsidian;
**đã triển khai** token ba tầng, control dùng chung, khung app và các màn trong working tree. Chủ trì:
chủ sản phẩm.

## Câu hỏi chương này trả lời

Mira dùng những token nào để các màn thư viện, tác phẩm, chương và cài đặt cùng một ngôn ngữ thị giác?
Ảnh Obsidian do chủ sản phẩm gửi là **tham chiếu thị giác**, không phải đặc tả hành vi hay tài nguyên
để sao chép. Mira giữ tên, biểu tượng và tác vụ dịch truyện của mình.

## Quan sát từ tài liệu Obsidian

Đọc ngày 2026-10-05. [Bảng màu chính thức](https://docs.obsidian.md/Reference/CSS%20variables/Foundations/Colors)
công bố thang trung tính `--color-base-*` cho sáng/tối và các tên ngữ nghĩa như
`--background-primary`, `--background-secondary`, `--interactive-normal`, `--interactive-accent`,
`--text-normal`, `--text-muted`. Accent của Obsidian cho phép người dùng đổi; hue mặc định là 258.
Lưới khoảng cách 4 px, cỡ chữ UI 12 / 13 / 15 / 20 px, editor 16 px, line-height 1,5 và 1,3.
Giá trị đo trực tiếp từ bản 1.13.7, phép ánh xạ semantic của Obsidian và so sánh từng nhóm với Mira
nằm ở [phân tích design system Obsidian](obsidian-comparison.md).

## Quyết định áp vào Mira

**2026-10-05, lần hai:** chủ sản phẩm yêu cầu triển khai đề xuất trong bản phân tích, rồi trả lời năm
câu hỏi mở của bản đó: gộp thanh trên vào màu sidebar, chữ phụ như Obsidian, hạ bán kính control,
**có** status bar cho editor chương, và gom accent về một biến. Cột "Lựa chọn" bên dưới là kết quả.

**Ba tầng token** trong [`tokens.css`](../../../src/renderer/src/styles/tokens.css): (1) thang
`--neutral-*` và `--accent`, là màu thô duy nhất; (2) vai trò semantic chỉ trỏ về tầng 1; (3) kích
thước component (`--header-height`, `--control-height`). Màn hình dùng tầng 2–3 qua tên Tailwind
trong `@theme inline`, không dùng giá trị thô.

| Nhóm | Token (tối / sáng) | Lựa chọn |
| --- | --- | --- |
| Khung | canvas `#1c1c1c` / `#ffffff`; sidebar **và** thanh trên `#282828` / `#f6f6f6`; raised `#232323` / `#fafafa` | Thanh trên cùng màu sidebar như Obsidian; editor là mặt phẳng duy nhất khác màu. |
| Control | control `#2e2e2e` / `#efefef`, hover của control `#3f3f3f` / `#e4e4e4` | Nút và ô có nền; hover đổi bậc màu. |
| Hover, đang chọn | `bg-hover` = lớp phủ `--mono-100` 6,7 %; `bg-active` = accent 15 % | Một hover cho mọi thứ trong suốt (nút ghost, mục menu, dòng danh sách); mục đang mở ở sidebar và dòng chương tô accent. |
| Chữ | `ink` `#dadada` / `#222222`; `ink-muted` **`#b3b3b3`** / `#5c5c5c`; `ink-faint` `#666666` / `#707070` | Muted theo Obsidian. Faint chỉ cho chữ trang trí (gợi ý phím tắt) vì ở theme tối chỉ ≈ 3:1. |
| Accent | `#9973eb` / `#7041b9`, hover dẫn xuất bằng `color-mix` | Giữ giá trị Mira vì accent mặc định của Obsidian với chữ trắng chỉ ≈ 4,3:1. Accent gom về một biến `--accent` để sau này có thể cho đổi. |
| Trạng thái | `info`, `warning`, `error`, `success` | `danger` không còn; mọi nơi dùng `error`. |
| Chữ UI | `text-ui-xs` 12, `text-ui-sm` 13, `text-ui-md` 15, `text-ui-lg` 20, `text-ui-title` 26; editor 16 | Bỏ 11 px và các cỡ lẻ; tiêu đề panel không viết hoa, không giãn chữ. |
| Line-height, tracking | `leading-normal` 1,5, `leading-tight` 1,3; `tracking-heading` −0,015em | |
| Bán kính | `rounded-item` 4, `rounded-control` / `rounded-tab` 6, `rounded-panel` 12 | Hạ control từ 8 xuống 6 px; mục danh sách, menu 4 px. |
| Kích thước | thanh trên 40 px, control 30 px, mục menu 28 px, tab truyện 34 px | |
| Nổi | `shadow-popover` cho menu/select; dialog không shadow, viền `line-strong`, nền phủ `bg-backdrop` | |
| Status bar | Dải 24 px dưới hai pane của màn chương, nền sidebar, chữ 12 px muted, số tabular | Số chữ và ký tự của bản dịch (cập nhật khi gõ, không tính xuống dòng), trạng thái lưu gộp của hai bên, số đề xuất AI chờ duyệt (bấm để mở panel AI). |
| Chuyển động | `--duration-fast` 140 ms; transition tắt khi `prefers-reduced-motion` | Spinner vẫn quay vì nó báo việc đang chạy. |

UI dùng Segoe UI Variable/Segoe UI trên Windows; editor dùng Google Sans Flex đóng gói kèm fallback.
Icon tiếp tục dùng Solar Icons. Màu ba nút cửa sổ được sao tay ở
[`titleBar.ts`](../../../src/main/electron/titleBar.ts) vì Electron vẽ overlay ngoài CSS; test đối
chiếu hai nơi. Component dùng chung ở [`components/`](../../../src/renderer/src/components/), gồm
`SettingRow` (tên 13 px, mô tả 12 px muted, control bên phải) chuyển từ màn model sang.

## Phạm vi đã triển khai

Token, component dùng chung, khung app (thanh trên, tab truyện, sidebar) và các màn feature đã chuyển
sang tên token: hơn 300 cỡ chữ, 70 line-height, 20 bán kính tùy ý và 30 hover tự đặt đã thay.
Bìa truyện (`WorkCover`, `LanguageMark`) giữ cỡ chữ theo khung vì đó là hình minh họa.
[`tokens.test.ts`](../../../src/renderer/src/styles/tokens.test.ts) fail khi một màn dùng lại cỡ
chữ, line-height, tracking, radius, shadow tùy ý, hoặc đọc `var(--…)` mà `tokens.css` không định
nghĩa. Đã chụp bản build ở theme sáng và tối (thư viện, màn chương, Cài đặt) trên Windows 11. Không
đổi luồng lưu, dịch, xuất hay vòng đời tab.

## Giới hạn và bước kiểm tiếp

- Chưa có: Tooltip dùng chung (vẫn dùng `title=`), màn Cài đặt dạng nav dọc và
  nhóm thẻ, tùy chọn đổi accent/font, ribbon (không định làm, xem bản phân tích).
- Còn khoảng 400 kích thước tùy ý (`h-[…]`, `w-[…]`, `min-w-[…]`) và một số mức alpha tint; chưa có
  thang z-index.
- 34 nút và 17 ô nhập trong màn feature vẫn tự style thay vì dùng component chung.
- Chưa đo tương phản bằng công cụ trên mọi màn; mới tính tay cho chữ, accent và faint.

---

[Mục lục module](../README.md) · [Quyết định hiện hành](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/product/decisions.md)
