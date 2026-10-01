## Why

Màn chương đã dựng theo phương án **D · B gọn chữ** (change `editor-redesign`): thanh 42px và 36px, chữ 12–13px, nút cao 28px. Các màn còn lại vẫn ở nhịp cũ — tiêu đề 24px, nút cao 34px, header chiếm 260px — nên đi từ thư viện vào chương là thấy hai nhịp khác nhau, như hai ứng dụng ghép lại.

Ba phương án bố cục cho mỗi màn đã dựng thành wireframe bấm được ([wireframes](../../../docs/handbook/experience/wireframes/README.md)) và người dùng chốt ngày 2026-10-02: **Thư viện phương án A**, **Tạo tác phẩm phương án C**, **Chương chưa có bản gốc phương án B**. Hai màn còn lại (Chi tiết tác phẩm, Từng câu) chưa chốt nên không nằm trong change này.

## What Changes

- **Thư viện**: một thanh 42px gom tiêu đề, số đếm, ô tìm, hai bộ lọc và hai nút; danh sách chiếm phần còn lại của màn và tự cuộn. Hàng tác phẩm cao ~48px với bìa cỡ `xs`, tên 12.5px, dòng phụ 11px; tác giả, thể loại và mô tả rời khỏi hàng. Panel "Tiếp tục gần đây" giữ nguyên.
- **Tạo tác phẩm**: chia hai bước. Bước 1 chỉ **Tên tác phẩm** và **Ngôn ngữ gốc**, tạo được ngay bằng "Tạo và bỏ qua phần còn lại". Bước 2 là ảnh bìa, tên gốc, tác giả, thể loại, mô tả — bỏ qua được. Lỗi thuộc bước 1 đưa người dùng về bước 1.
- **Chương chưa có bản gốc**: dùng lại thanh chương 42px của màn chương; giữa màn là hai thẻ ngang nhau "Dán văn bản" và "Chọn hoặc kéo tệp vào", mỗi thẻ nói rõ lối đó hợp khi nào. Thẻ tệp nhận kéo-thả.
- `SearchField` và `Select` thêm `size="sm"` (cao 28px) cho thanh 42px; cỡ mặc định không đổi, nên các chỗ đang dùng giữ nguyên hình.
- `WorkForm` thêm prop `stepped`; đường không-stepped (hộp thoại Sửa thông tin) giữ nguyên.
- **Đồng bộ cỡ nút toàn app**: mọi `<Button size="lg">` (34px) về cỡ mặc định **28px**, nút trang của `ChapterPager` từ 34px về 28px. Việc này chạm cả hai màn chưa chốt phương án (Chi tiết tác phẩm, Từng câu) — nhưng chỉ đổi **cỡ nút**, không đổi bố cục, nên không chặn việc chọn phương án cho hai màn đó. Ngoại lệ duy nhất: hero của màn thư viện lần đầu giữ cỡ lớn.

## Non-goals

- Màn **Chi tiết tác phẩm** và mode **Từng câu**: wireframe đã có ba phương án nhưng chưa chọn, nên không đụng tới trong change này.
- Không đổi dữ liệu, IPC hay luật kiểm tra của bất kỳ màn nào — chỉ đổi bố cục và kích thước.

## Capabilities

### Modified Capabilities

- `work-library`: bố cục màn thư viện và luồng tạo tác phẩm hai bước.
- `chapter-screen`: bố cục chương khi chưa có bản gốc.
