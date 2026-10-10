# Nguồn và cập nhật

Cập nhật: 2026-10-10 · Trạng thái: **Đã triển khai nền tảng (folder/file, registry, bindings, catalog diff, manual sync, feed Cập nhật); adapter mạng website là follow-up** · Chủ trì: chủ sản phẩm.

Module này quản lý nguồn raw của tác phẩm (thư mục, tệp đơn, website/API tương lai), theo dõi danh mục chương, phát hiện chương mới hoặc raw thay đổi, và điều hướng các sự kiện cập nhật trên trang **Cập nhật** và chi tiết tác phẩm.

## Hiện trạng triển khai

- **Nền tảng hệ thống nguồn (Source System Foundation) đã hoàn thành:**
  - **Source Registry & Builtin Adapters:** Hỗ trợ nguồn thư mục cục bộ (`mira.folder`) và tệp văn bản đơn (`mira.single-file`), chuẩn hóa tên chương, trật tự, hash sha-256 (`contentHash`, `payloadHash`) và đường dẫn an toàn (chống path traversal và chặn symlink trỏ ra ngoài).
  - **Storage & Schema:** Migration v8 cho thư viện (bảng `source_adapter_install`, `source_auth_profile`) và v12 cho tác phẩm (bảng `source_binding`, `source_catalog_item`, `source_sync_run`, `source_update_event`), bảo đảm toàn vẹn dữ liệu và phân biệt binding theo ID độc lập.
  - **Catalog Diff & Đồng bộ an toàn:** Thuật toán so khớp danh mục xác định chính xác 5 loại sự kiện (`chapter_added`, `raw_changed`, `chapter_removed`, `access_changed`, `order_changed`). Sự kiện `chapter_added` và `raw_changed` chỉ ghi nhận thông báo, tuyệt đối không tự động ghi đè bản dịch hay nội dung chương hiện có.
  - **IPC & Bảo mật:** Toàn bộ kênh IPC nguồn được xác thực người gửi tin cậy (`guardHandlers`), mật khẩu/token xác thực được mã hóa an toàn qua `SecretCrypto` và không bao giờ lộ ra renderer.
  - **UI Nguồn & Bản raw:**
    - Màn hình **Nguồn nội dung** cấp app (`SourcesScreen`) với các tab Khám phá / Đã kết nối / Tình trạng, hỗ trợ lọc theo quốc gia Trung Quốc (CN) / Nhật Bản (JP) / Hàn Quốc (KR) / Khác và tìm kiếm.
    - Khu vực **Bản raw** thật trong chi tiết tác phẩm (`SourcesArea`) hiển thị từng binding, vai trò (chính / đối chiếu), tiến độ ghép chương và nút kiểm tra cập nhật thủ công. Wizard thêm bản raw (`AddRawDialog`) cho phép chọn tệp/thư mục, xem trước ghép nối trước khi xác nhận.
    - Màn hình **Cập nhật** thật (`UpdatesScreen`) hiển thị feed sự kiện theo thời gian, lọc theo loại biến động, đánh dấu đã đọc và xem trước diff trước khi áp dụng.

- **Nguyên tắc kiểm tra cập nhật:**
  - Mira **không chạy crawler ngầm tự động**, không hẹn giờ khi app đóng, không cloud polling.
  - Việc kiểm tra cập nhật chỉ diễn ra khi người dùng chủ động nhấn nút "Kiểm tra cập nhật" trên giao diện khi ứng dụng đang chạy.

- **Giai đoạn tiếp theo (Follow-up):**
  - Triển khai các adapter kết nối mạng cho các nền tảng web novel ưu tiên (Syosetu, Kakuyomu, Novelpia, Qidian...).

## Tài liệu chi tiết

- [Cập nhật chương mới: đối thủ làm gì, Mira nên làm gì](updates-research.md): Nghiên cứu so sánh Mihon, Legado, LNReader, Kotatsu, FanFicFare, Readwise; phân tích rủi ro pháp lý; thiết kế feed Cập nhật.
- [Repo crawler novel Nhật, Hàn và Trung: cơ chế thực tế](repository-survey.md): Khảo sát cơ chế của Narou/Syosetu, Kakuyomu, Alphapolis, Novelpia, Joara, Qidian, JJWXC, Fanqie, Ciweimao; xử lý rate limit, session và bảo mật.
- [Thiết kế hệ thống nguồn đa quốc gia](system-design.md): Kiến trúc kỹ thuật, schema cơ sở dữ liệu, hợp đồng adapter, IPC contract, catalog diff và UX.

---

[Mục lục module](../README.md)
