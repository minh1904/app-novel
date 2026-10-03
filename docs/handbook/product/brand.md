# Brand Mira

Cập nhật: 2026-10-03 · Tên và mẫu linh vật: **đã chốt theo yêu cầu người dùng**. Wordmark và tagline còn mở.

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

## Linh vật đã chốt — 2026-10-03

Chủ sản phẩm chọn [ảnh mẫu gốc](../../../assets/mascot/00-approved-reference.png) và yêu cầu giữ nguyên phong cách khi tạo từng thành phần riêng. Ảnh này là chuẩn đối chiếu: manga mực đen trắng tương phản mạnh, tóc bob đen có mái lệch, kính gọng đen lớn đeo thấp, ánh mắt điềm tĩnh, áo khoác đen có sọc trắng, áo trong trắng, quần short đen, tất đen và sneaker. Chibi giữ cùng nhận diện với tỷ lệ đầu lớn, thân nhỏ.

[Bộ tài nguyên](../../../assets/mascot/README.md) có 21 PNG riêng: avatar, icon, ba góc toàn thân, bốn biểu cảm, ba chi tiết mặt, bốn chibi và năm phụ kiện. Các ảnh được tạo bằng công cụ imagegen tích hợp theo mẫu; đây là bản vẽ tái tạo, không phải cắt nguyên điểm ảnh nên nét và tỷ lệ có thể khác mẫu. Khi có khác biệt, ưu tiên ảnh mẫu gốc. Icon có góc ngoài trong suốt; các ảnh còn lại dùng nền trắng.

**Đã có tài nguyên, chưa tích hợp vào ứng dụng:** chưa thay icon Electron/installer, chưa tạo bộ ICO hoặc các cỡ icon nhỏ và chưa nghiệm thu độ rõ ở kích thước nhỏ. Quyết định chọn linh vật không đồng nghĩa đã chốt wordmark, tagline hay toàn bộ vị trí sử dụng trên giao diện.

## Ảnh hưởng kỹ thuật

Đổi package name có thể đổi thư mục `userData` mặc định của Electron; app ID ảnh hưởng định danh bản cài. Repo chưa có kho bản dịch bền vững nên lần đổi này **không triển khai migration dữ liệu hoặc nâng cấp installer cũ**. Nếu có máy đã cài bản thử tên cũ, kiểm tra profile và quy trình nâng cấp trước phát hành; không tự xóa thư mục cũ. Xem [ADR-001](../decisions/0001-mira-brand.md).

Logo/wordmark, tagline, domain và tên store còn mở. Chưa kiểm tra khả dụng thương mại của tên Mira; đây là đầu việc phát hành riêng.

---

[Mục lục handbook](../README.md)
