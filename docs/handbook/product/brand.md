# Brand Mira

Cập nhật: 2026-09-29 · Tên: **đã chốt theo yêu cầu người dùng**. Nhận diện khác còn mở.

Tên hiển thị chuẩn là **Mira**; định danh kỹ thuật dùng `mira`. Thư mục repository vẫn là `app-novel`. Không suy diễn ý nghĩa tên hoặc tagline chính thức từ lần đổi này.

| Bề mặt | Giá trị |
| --- | --- |
| Handbook, cửa sổ, sidebar, preview | Mira |
| Package nội bộ | `mira` |
| Electron app ID | `app.mira.desktop` |
| Executable, shortcut, tên gỡ cài đặt | `Mira` |
| Installer | `mira-setup.exe` |
| Bridge renderer/preload | `window.mira` |

Tên cũ **Miyati** chỉ dùng giải thích lịch sử. Mockup cũ giữ nguyên để bảo toàn nguồn; tên/logo trong ảnh không phải brand hiện hành. Palette, font và component baseline giữ theo [design system](../experience/design-system.md).

## Ảnh hưởng kỹ thuật

Đổi package name có thể đổi thư mục `userData` mặc định của Electron; app ID ảnh hưởng định danh bản cài. Repo chưa có kho bản dịch bền vững nên lần đổi này **không triển khai migration dữ liệu hoặc nâng cấp installer cũ**. Nếu có máy đã cài bản thử tên cũ, kiểm tra profile và quy trình nâng cấp trước phát hành; không tự xóa thư mục cũ. Xem [ADR-001](../decisions/0001-mira-brand.md).

Logo/wordmark, tagline, domain và tên store còn mở. Chưa kiểm tra khả dụng thương mại của tên Mira; đây là đầu việc phát hành riêng.

---

[Mục lục handbook](../README.md)
