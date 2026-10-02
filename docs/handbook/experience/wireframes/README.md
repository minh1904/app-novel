# Wireframe các màn còn lại

Ba phương án bố cục cho mỗi màn chưa chốt, để chọn trước khi dựng code. Màn chương
(mode Toàn văn) **không** nằm ở đây — nó đã dựng theo phương án D, xem
[editor-redesign.md](../editor-redesign.md).

## Chạy

```sh
node docs/handbook/experience/wireframes/serve.mjs
# http://localhost:4174/wireframe.html
```

Mở thẳng bằng `file://` không chạy được: `screens.js` là ES module nên cần HTTP.

## Điều khiển trên thanh trên cùng

| Tham số | Nghĩa |
| --- | --- |
| `man` | Màn: `thu-vien`, `tao-tac-pham`, `chi-tiet`, `chuong-rong`, `tung-cau`, `hoi-ai` |
| `v` | Phương án `a` / `b` / `c` của màn đó (chấm tím = phương án theo nhịp D) |
| `mau` | `mau` bật màu trạng thái thật, `xam` tắt đi để so bố cục thuần |
| `tt` | Trạng thái: `du-lieu`, `dang-tai`, `rong`, `loi`, `dang-gui` (tùy màn). Màn Hỏi AI có bộ riêng: `xong`, `chon-model`, `dang-chay`, `dung-cong-cu`, `dang-soan`, `cong-cu-loi`, `da-dung`, `khong-tra-loi`, `moi`, `ca-bien` |

Ví dụ: `?man=chi-tiet&v=c&mau=mau&tt=rong`

Giàn giáo chỉ chiếm một thanh 48px; bản thiết kế được trọn phần còn lại của màn hình.
Nút **Ưu, nhược** ở cuối thanh mở một lớp phủ nói vì sao có phương án đó, ưu, nhược, hợp
khi nào — lớp phủ đè lên bản thiết kế chứ không đẩy nó xuống, đóng bằng Esc hoặc bấm ra
ngoài, và nhớ trạng thái mở/đóng qua các lần đổi màn.

Các nút "Gợi ý góp ý" trong lớp phủ chép sẵn câu góp ý kèm tên màn và phương án, dán thẳng
vào chat được. Số tròn trên mỗi khối là để góp ý gọi tên ("khối 3" thay vì tả dài).

## Ba phương án mỗi màn

Mỗi màn luôn có **một** phương án theo nhịp D (thanh 42/36px, chữ 12–13px, nút h-7/h-6),
và thường có **một** phương án giữ nguyên bố cục đang chạy để thấy cái giá của việc gọn lại.

| Màn | A | B | C | Đã chốt |
| --- | --- | --- | --- | --- |
| Thư viện | Bảng gọn theo nhịp D | Lưới thẻ bìa | Hàng rộng (đang chạy) | **A** (2026-10-02) |
| Tạo tác phẩm | Một cột gọn theo nhịp D | Hai cột, bìa bên trái (đang chạy) | Hai bước: bắt buộc rồi tùy chọn | **C** (2026-10-02) |
| Chi tiết tác phẩm | Thanh gọn theo nhịp D | Header đầy đủ + tab (đang chạy) | Khu vực thành cột bên trái | chưa chốt |
| Chương chưa có bản gốc | Khối rỗng gọn theo nhịp D | Hai lối đi cạnh nhau | Dán ngay tại chỗ, xem trước bên cạnh | **B** (2026-10-02) |
| Từng câu | Bảng gọn theo nhịp D | Hàng rộng (đang chạy trước 2026-10-02) | Có lọc, và panel phụ dưới hàng | **C** (2026-10-02) |
| Hỏi AI | Cột thứ ba kéo rộng được | Thanh ngang dưới pane dịch | Cột thứ ba, khay đề xuất ghim | chưa chốt |

Màn **Hỏi AI** có thêm hai phương án nội dung **D** (A gọn chữ) và **E** (A bỏ hàng tiêu đề) trên cùng
bố cục A, và mười trạng thái thay cho bốn. Ba nguồn của màn này:

- **Khuôn tin nhắn** từ `references/components/chat.md` của skill `ui-ux`, đổi sang token và nhịp của
  Mira (tin nhắn 13px thay vì 16px).
- **Khuôn ô soạn** theo Cursor và Antigravity (chủ dự án yêu cầu 2026-10-02): chip ngữ cảnh và thanh
  công cụ nằm trong hộp soạn, chọn chế độ và chọn model ngay cạnh nút gửi; panel rộng 420px theo khoảng
  400–520px của Cursor.
- **Hai chế độ Hỏi/Sửa, danh sách model và giá** từ [ai-provider-integration.md](../../research/ai-provider-integration.md).
  Doc đó chốt Mira **không làm chế độ Agent**, và ghi rõ giá phải đọc lại trang chính chủ trước khi vào UI thật —
  số trong wireframe là số mẫu.

Màn này mô tả tính năng **chưa chốt phạm vi** — xem câu hỏi mở #3 trong [editor-redesign.md](../editor-redesign.md).

Ba màn đầu đã chốt được dựng trong change [`screens-rhythm-d`](../../../../openspec/changes/screens-rhythm-d/proposal.md); wireframe giữ lại làm hồ sơ chọn lựa, **không** cập nhật theo code. Từng câu chốt phương án C riêng ngày 2026-10-02 (sau `screens-rhythm-d`): dựng thêm thanh lọc và panel gợi ý ở dạng minh họa, xem `sentence-mode-toolbar`/`sentence-mode-side-panels` trong [backlog](../../delivery/backlog.md). Một màn (Chi tiết tác phẩm) vẫn chưa chốt.

**Một chỗ lệch so với wireframe:** phương án A của Thư viện không vẽ panel "Tiếp tục gần đây", nhưng bản dựng **giữ** panel đó — bỏ nó đi là bỏ một chức năng đang chạy, không phải đổi mật độ bảng.

## Tệp

| Tệp | Việc |
| --- | --- |
| `wireframe.html` | Thanh chọn màn/phương án, khung lý do, và chỗ gắn bản thiết kế |
| `screens.js` | Bố cục của 15 phương án |
| `data.js` | Dữ liệu mẫu dùng chung, có ca biên: tên tràn, chưa có bìa, 0 chương, chương chưa đặt tên, hàng chưa dịch |
| `tokens.css` | Bản sao token của `src/renderer/src/styles/tokens.css` — sửa ở đó thì sửa cả ở đây |
| `chrome.css` | Giàn giáo wireframe, không phải sản phẩm |

Ảnh bìa lấy từ Unsplash làm ảnh mẫu; số liệu trong wireframe đều là dữ liệu giả.

---

[Mục lục handbook](../../README.md)
