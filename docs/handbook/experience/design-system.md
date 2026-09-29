# Mira — design system v1

Cập nhật 2026-09-23. Người dùng đã chốt **palette light/dark theo giao diện Solar Icons docs v2** sau khi đối chiếu trực tiếp hai ảnh chụp sáng/tối (`solar-docs-reference-light.png`, `solar-docs-reference-dark.png`). Ảnh/tệp tham khảo cũ đã gỡ khỏi repo ở commit `551727d`; lấy lại bằng `git show 551727d^:docs/assets/<tên-tệp>` nếu cần. Quyết định này thay phần **màu** Atelier đã chốt tạm trước đó. Font, độ bo, cấu trúc component và hướng workspace dưới đây được giữ. Đây là baseline thiết kế cho các màn tiếp theo, chưa phải thư viện component production.

## Nguồn ưu tiên

1. Quyết định mới nhất của người dùng và tài liệu này.
2. Token runtime trong [tokens.css](../../../src/renderer/src/styles/tokens.css) là nguồn màu hiện hành; snapshot `solar-v2-docs-theme.css` và preview HTML cũ chỉ còn trong lịch sử Git.
3. [Quyết định sản phẩm](../product/decisions.md) và [scope v0.1](../product/scope.md) cho bối cảnh sử dụng.


## Foundation

| Phần | Quyết định |
| --- | --- |
| Font | **Google Sans Flex**, đóng gói local cho chrome, control và editor; fallback sans-serif khi thiếu glyph. [Font trong preview](../../../src/renderer/src/assets/GoogleSansFlex.ttf). |
| Theme | **Light và dark**; không dùng màu tím từ lớp token HSL của website Solar cho action trong bản này. Theme mở mặc định của app vẫn chưa chốt. |
| Nền nội dung | Light `hsl(219 36% 99%)` (xấp xỉ `#fcfcfd`); dark `hsl(219 54% 0%)` (`#000000`). Đây là `--background` HSL của website Solar. |
| Sidebar và card | Light `#f1f1f1`; dark `#191919`, theo lớp `--color-fd-card` của website và ảnh chụp. Editor chính là mặt phẳng làm việc, không lồng mọi khối trong card. |
| Chrome, control, selected | Light `#f6f6f7` / `#eeefef` / `#dadada`; dark `#0e0e0e` / `#232323` / `#2f2f2f`. Đây là màu bề mặt đo từ ảnh người dùng gửi để tái hiện phối màu đang hiển thị; không phải tên token được công bố riêng. |
| Chữ và action | Chữ/primary trung tính theo lớp `--color-fd-*`: light foreground `#0a0a0a`, primary `#171717`; dark foreground `#ebebeb`, primary `#fafafa`. Primary chỉ cho action rõ nghĩa. |
| Trạng thái | Info, warning, error, success từ snapshot Solar. Trạng thái luôn có chữ/icon đi kèm, không chỉ mã hóa bằng màu. |
| Radius | **Control 10px · tab 11px · panel/editor 14px**, ước lượng từ ảnh Codex (`codex-radius-reference.png`, đã gỡ khỏi repo) và đã được chọn. Pill khi phù hợp vẫn dùng radius đầy đủ. |
| Icon | **Solar Icons**, cùng một style/size theo nhóm control. |
| Workspace | Pane/tab/sidebar linh hoạt theo tinh thần Obsidian; chrome gọn và AI theo ngữ cảnh theo tinh thần Codex. Không dùng tên/logo hoặc sao chép pixel của sản phẩm tham chiếu. |

Website [Solar Icons docs v2](https://solar-icons.vercel.app/docs/v2) phối **hai lớp token**: nền nội dung từ HSL `--background`, còn bề mặt sidebar/card từ `--color-fd-*`. Giá trị nguồn cùng alias `--background`, `--card`, `--primary`... nay nằm trong tokens.css. Các alias và màu chrome/control/selected là cách áp vào component của dự án này; không nhận là tên token gốc của Solar. Nếu website thay đổi sau này, dự án vẫn dùng snapshot đã chốt cho đến khi có quyết định mới.

## Component làm mốc

- **Button:** anatomy, variant `default`, `outline`, `secondary`, `ghost`, `ghost-muted`, `destructive`, `link` và các chiều cao `18 / 22 / 24 / 28 / 34 / 40px` tham chiếu `D:\personal\point-cloud\packages\ui\src\button.tsx`; radius mặc định của novel là 10px. Focus, hover và disabled phải rõ.
- **Panel và Slider:** cấu trúc tham chiếu point-cloud; panel preview rộng 256px và radius 14px, slider track cao 28px. Đây là mốc component, không khóa bề rộng mọi panel hay dùng lại màu Atelier.
- **Field, tab, mode switch, segment row, prose editor:** đặc tả riêng cho sản phẩm dịch truyện. Preview chỉ quyết định hướng nhìn và token, chưa quyết định toàn bộ hành vi.

## Áp vào sản phẩm

- **Toàn văn:** hai pane văn bản liên tục; bản gốc và bản dịch có thể lệch số dòng. **Từng câu:** các hàng segment đối chiếu. Cả hai mode dùng chung dữ liệu; xem [scope](../product/scope.md) và [alignment flow](alignment.md).
- Chữ, khoảng trắng và đường chia là phân cấp chính. Card dành cho gợi ý hoặc thông tin có ranh giới; tránh lồng card trong vùng đọc dài.
- Focus bàn phím nhìn rõ; trạng thái lưu/offline/cảnh báo/lỗi có chữ hoặc icon. Hỗ trợ zoom, reduced motion, nhập tiếng Việt và IME.
- Tên sản phẩm là **Mira**. “NekoNovel Studio” cùng logo mèo thuộc ảnh tham khảo, không dùng làm nhận diện. Tagline và logo còn mở.

## Còn mở

- Logo/wordmark và tagline chính thức; theme mặc định theo Windows hay ghi nhớ lựa chọn; cách đóng gói font và icon.
- Type scale, chiều cao field/tab và mật độ editor dài; kiểm tra tiếng Việt dài ở cửa sổ Windows hẹp/rộng.
- Implementation của Field, Tabs, SegmentRow, ProseEditor, AI suggestion/diff và trạng thái bàn phím/IME.

## Triển khai trong scaffold

Token runtime ở [tokens.css](../../../src/renderer/src/styles/tokens.css) dùng Tailwind CSS v4 với @theme inline và semantic variable theo light/dark; Button, Tabs và Slider ở [components](../../../src/renderer/src/components) dùng Base UI cho hành vi tương tác, Tailwind cho giao diện; TextField đơn giản dùng native. Font local nằm ở [assets](../../../src/renderer/src/assets/GoogleSansFlex.ttf). Hiện app mở vào thư viện dữ liệu mẫu, có light/dark, chưa phải editor sản phẩm; màn preview component và panel công cụ phát triển đã gỡ ngày 2026-09-29; xem [hiện trạng](../engineering/current-state.md). Mặc định theo theme Windows trong scaffold chỉ là lựa chọn tạm cho preview, chưa khóa hành vi setting P0.

---

[Mục lục handbook](../README.md)
