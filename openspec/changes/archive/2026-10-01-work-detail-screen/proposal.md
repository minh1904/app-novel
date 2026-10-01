## Why

Thư viện đã tạo và quản lý được tác phẩm, nhưng "Mở tác phẩm" và "Tiếp tục" vẫn dẫn tới màn thông báo chưa xây, và tác phẩm chưa có chương nào. Không có chương thì không có chỗ để nhập raw, dịch hay soát. Màn chi tiết truyện là bước nối từ thư viện tới chương, và là nơi sửa thông tin tác phẩm sau khi tạo (tác giả, thể loại, mô tả hiện chỉ đặt được lúc tạo, bìa chỉ đổi được qua menu).

## What Changes

- Thêm **màn chi tiết truyện**: đầu trang có bìa, tên, tên gốc, tác giả, thể loại/bối cảnh, mô tả, trạng thái, ngôn ngữ nguồn, số chương, thời điểm sửa; nút chính **Tiếp tục** (hoặc **Thêm chương** khi chưa có chương); menu tác phẩm dùng lại đổi trạng thái và lưu trữ.
- Thêm **sửa thông tin tác phẩm** từ màn này: tên, tên gốc, tác giả, thể loại/bối cảnh, mô tả và ảnh bìa (dùng lại form của màn tạo). Ngôn ngữ nguồn không đổi được.
- Thêm **danh sách chương**: thêm chương, đặt/đổi tên, chuyển vị trí, xóa (có xác nhận), tìm và nhảy tới chương; phân trang 50/100 chương để danh sách vẫn dùng được với hàng nghìn chương.
- Dựng **khung màn**: đầu trang tác phẩm tách khỏi vùng nội dung, vùng nội dung lấy khu vực từ một danh mục đăng ký (hiện chỉ Chương, hiển thị trực tiếp, không vẽ thanh tab một mục). Ngữ cảnh, Nguồn, Tác vụ gắn vào khung này ở các change sau ([work-area-navigation](../../work-area-navigation/proposal.md)).
- Thêm **minh họa chỉ-trên-giao-diện** cho tính năng chưa làm, mỗi mục có nhãn "Sắp có" và một mục trong `delivery/backlog.md`. Bản này minh họa **Nhập chương từ .txt**; không đọc tệp, không ghi dữ liệu.
- Ghi nhớ **chương làm việc gần nhất**: mở một chương thì "Tiếp tục" ở thư viện và ở màn chi tiết đưa về đúng chương đó.
- Nối điều hướng: "Mở tác phẩm", "Tiếp tục", thanh bên "Tác phẩm gần đây" và đường dẫn breadcrumb đều đi tới màn này; mở một chương vẫn tới màn "editor chưa xây" cho đến khi có editor.
- Thêm repository chương trong tệp tác phẩm và các kênh IPC `chapters:*`; cập nhật chỉ mục thư viện (số chương, chương gần nhất) mỗi khi chương đổi.

Không thuộc change này: nội dung chương (văn bản gốc/dịch), nhập raw, editor, trạng thái dịch từng chương, đếm số từ, nhóm chương theo tập, xóa tác phẩm, kéo thả sắp xếp. Nhập nhiều chương từ .txt chỉ có bản minh họa, chưa hoạt động.

## Capabilities

### New Capabilities

- `work-detail`: màn chi tiết một tác phẩm, gồm khung màn (đầu trang + vùng nội dung theo khu vực có danh mục đăng ký), thông tin và sửa thông tin, điều hướng vào/ra, "Tiếp tục"/mở chương, và danh sách chương (thêm, đổi tên, sắp xếp, xóa, tìm, phân trang, chịu tải nhiều chương, giữ bền và giữ chỉ mục đúng). Gộp từ hai spec `work-detail` và `work-chapters` trước đó.

### Modified Capabilities

<!-- Không đổi yêu cầu nào của work-library: bìa, tạo và quản lý tác phẩm giữ nguyên. -->

## Impact

- **Code mới:** `src/main/storage/` (repository chương), `src/main/ipc/` (`chapters:*`), `src/shared/` (kiểu và schema valibot của chương), preload và `desktop-api`; `src/renderer/src/features/work/` (màn chi tiết, danh sách chương, form dùng chung với màn tạo).
- **Dữ liệu:** không đổi schema (bảng `chapter` và cột `work.last_chapter_id` đã có từ v1); không cần migration.
- **Phụ thuộc:** không thêm dependency.
- **Tài liệu:** cập nhật `engineering/current-state.md`, `delivery/roadmap.md`, `experience/first-run.md` (điều hướng mở tác phẩm).
