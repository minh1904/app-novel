# Hệ thiết kế giao diện Mira

Cập nhật: 2026-10-05 · Trạng thái: **Đã chốt hướng** theo yêu cầu dùng hệ token gần Obsidian;
**đã triển khai** phần nền, control dùng chung, tab và editor trong working tree. Chủ trì: chủ sản phẩm.

## Câu hỏi chương này trả lời

Mira dùng những token nào để các màn thư viện, tác phẩm, chương và cài đặt cùng một ngôn ngữ thị giác?
Ảnh Obsidian do chủ sản phẩm gửi là **tham chiếu thị giác**, không phải đặc tả hành vi hay tài nguyên
để sao chép. Mira giữ tên, biểu tượng và tác vụ dịch truyện của mình.

## Quan sát từ tài liệu Obsidian

Đọc ngày 2026-10-05. [Bảng màu chính thức](https://docs.obsidian.md/Reference/CSS%20variables/Foundations/Colors)
công bố thang trung tính `--color-base-*` cho sáng/tối và các tên ngữ nghĩa như
`--background-primary`, `--background-secondary`, `--interactive-normal`, `--interactive-accent`,
`--text-normal`, `--text-muted`. Bảng này **không ấn định** mỗi vùng sản phẩm Mira phải dùng mức nào.
Accent của Obsidian cho phép người dùng đổi; hue mặc định là 258. Mira hiện dùng một accent tím cố
định, chưa có tùy chọn đổi accent.

[Khoảng cách](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Reference/CSS%20variables/Foundations/Spacing.md)
dùng lưới 4 px; [bán kính](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Reference/CSS%20variables/Foundations/Radiuses.md)
có mức 4 / 8 / 12 / 16 px. [Cỡ chữ UI](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Reference/CSS%20variables/Foundations/Typography.md)
có 12 / 13 / 15 / 20 px, editor mặc định 16 px, line-height thường 1,5. Tài liệu
[tab](https://docs.obsidian.md/Reference/CSS%20variables/Components/Tabs) phân biệt nền tab đang
mở, nền dải tab, đường chia và màu chữ. Đây là **quan sát về token**, còn cấu trúc tab theo truyện
của Mira nằm tại [module Phiên làm việc](../workspace/README.md).

## Quyết định áp vào Mira

| Nhóm | Token hiện hành | Cách dùng |
| --- | --- | --- |
| Nền tối | `#1c1c1c` canvas, `#282828` sidebar, `#333333` chrome, `#2e2e2e` control, `#3f3f3f` selected | Giữ editor như mặt phẳng đọc; pane và thanh trên có phân tầng nhẹ. Các giá trị thuộc thang Obsidian; **phép gán semantic là của Mira**. |
| Nền sáng | `#ffffff` canvas, `#f6f6f6` sidebar/chrome, `#efefef` control, `#e4e4e4` selected | Dùng cùng cấu trúc phân tầng. |
| Chữ | Tối `#dadada` / `#999999`; sáng `#222222` / `#5c5c5c` | Chữ chính và chữ phụ; trạng thái lỗi/cảnh báo vẫn có nhãn. |
| Accent | Tối `#9973eb`, sáng `#7041b9` | Action chính, focus và tab khu vực đang chọn. Đây là giá trị Mira chọn từ hướng tím của ảnh và hue mặc định; không nhận là token accent mặc định chính xác của Obsidian. |
| Không gian | 4 / 8 / 12 / 16 / 20 / 24 px | Bước 4 px cho control, menu, panel; 2 px chỉ dùng khi cần chỉnh mật độ nhỏ. |
| Bán kính | 4 / 8 / 12 / 16 px | Control và tab 8 px; panel 12 px. Pane editor sát nhau, không bo riêng. |
| Chữ | UI 12 / 13 / 15 / 20 px; editor 16 px | UI dùng Segoe UI Variable/Segoe UI trên Windows; editor dùng Google Sans Flex đóng gói kèm fallback. Cỡ và font editor tách khỏi UI. |

Icon tiếp tục dùng Solar Icons theo bộ hiện có. Token sáng/tối ở
[`tokens.css`](../../../src/renderer/src/styles/tokens.css); Tailwind `@theme inline` ánh xạ semantic
cho component. Màu ba nút cửa sổ được sao tay ở
[`titleBar.ts`](../../../src/main/electron/titleBar.ts) vì Electron vẽ overlay ngoài CSS; test đối
chiếu hai nơi. Component dùng chung ở [`components/`](../../../src/renderer/src/components/).

## Phạm vi đã triển khai

Thang màu, semantic surfaces, action/focus, font và bán kính chạy qua cả hai theme. Button, field,
select, tab khu vực, panel, empty state và dialog nhận token mới. Thanh tab truyện gắn với mép vùng
nội dung; màn chi tiết truyện gọn hơn; editor chương dùng cỡ 16 px và line-height 1,5. Trạng thái
hover/focus/disabled vẫn được giữ. Đây là thay đổi giao diện; không đổi luồng lưu, dịch, xuất hay
vòng đời tab.

## Giới hạn và bước kiểm tiếp

Obsidian không công bố một phép ánh xạ đầy đủ từ từng base color sang mọi vùng trong ảnh chụp;
những ánh xạ ở bảng trên là quyết định của Mira. Chưa có tùy chỉnh accent/font, ribbon icon,
split pane kiểu vault, hoặc bản sao giao diện Obsidian. Kiểm tra độ tương phản và mật độ tại các
kích thước cửa sổ Windows thực tế, rồi điều chỉnh token semantic tại một nơi thay vì thêm màu cứng
trong từng màn.

---

[Mục lục module](../README.md) · [Quyết định hiện hành](../../handbook/product/decisions.md)
