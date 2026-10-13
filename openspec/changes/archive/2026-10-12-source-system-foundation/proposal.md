## Why

Mira hiện chỉ nhập raw thủ công theo chương; chưa có định danh nguồn, catalog từ xa, lịch sử revision,
trạng thái truy cập hay cách biểu diễn nhiều bản raw của cùng tác phẩm. Chủ sản phẩm đã chốt hệ thống đa
nguồn, lọc rõ nền tảng Trung–Nhật–Hàn và kiểm cập nhật thủ công ở phiên bản đầu, nên cần dựng nền dữ liệu,
adapter và UI chung trước khi thêm từng website.

## What Changes

- Thêm registry adapter do Mira phát hành, manifest typed và metadata tách `countryCode` khỏi
  `languageTags`; chưa cho cài adapter cộng đồng.
- Mở ngôn ngữ nguồn để có `ko` và lưu BCP-47 mà không khóa file format vào một enum SQL đóng.
- Thêm **Nguồn nội dung** cấp ứng dụng để tìm, lọc theo Trung Quốc/Nhật Bản/Hàn Quốc/Khác, ngôn ngữ,
  capability và health.
- Đổi khu vực tác phẩm từ “Nguồn raw” thành **Bản raw**; một tác phẩm có nhiều bản raw cùng ngôn ngữ,
  một bản chính và override theo chương.
- Thêm source binding, catalog item, content revision, update event và sync run vào `.mira`; thêm adapter
  install, nhiều auth profile và job index cấp ứng dụng vào `library.db`.
- Thêm contract adapter hẹp, registry, catalog diff không phá hủy và adapter builtin cho tệp/thư mục.
- Thêm IPC typed và luồng kiểm tra thủ công. Khi phát hiện chương mới Mira chỉ thông báo; không tự tải raw,
  không tự dịch và không chạy lịch nền.
- Raw đã dịch bị sửa chỉ tạo cờ; chương chỉ được xác nhận mất sau ba catalog đầy đủ, hợp lệ liên tiếp;
  dữ liệu địa phương không bị xóa.
- Định nghĩa ranh giới network broker, opaque auth handle và browser tương tác để các change adapter mạng
  dùng sau; change này không triển khai crawler cho Syosetu, Kakuyomu, Novelpia, Qidian hay Fanqie.

## Capabilities

### New Capabilities

- `source-registry`: registry/manifest adapter, tìm kiếm, lọc quốc gia-ngôn ngữ-capability và health.
- `source-storage`: ngôn ngữ BCP-47 và phân vùng dữ liệu nguồn giữa `library.db` với file `.mira`.
- `raw-source-bindings`: nhiều bản raw, nguồn chính, ghép catalog từ xa với chương Mira và nhiều tài khoản.
- `source-sync`: kiểm thủ công, catalog diff, revision nội dung, update event và quy tắc đồng bộ không phá
  hủy.
- `source-adapter-runtime`: contract adapter builtin, capability boundary, adapter tệp/thư mục và ranh giới
  network/auth/browser cho adapter mạng sau này.

### Modified Capabilities

Không có. Các capability storage/work-detail lịch sử chưa tồn tại trong `openspec/specs`; hành vi mới
được đặc tả trọn vẹn trong các capability ở trên thay vì tạo delta vào spec đã archive nhưng chưa có
main spec.

## Impact

- **Shared contracts:** thêm `src/shared/contracts/sources.ts`; đổi contract ngôn ngữ nguồn và
  `DesktopApi`.
- **Storage:** migration tiếp theo của `workSchema` và `librarySchema`; cập nhật schema snapshot và fixture
  migration.
- **Main:** thêm `src/main/sources/`, source services, adapter registry/runtime, catalog diff và job thủ
  công; nối qua `createServices()` và IPC handler.
- **Preload/IPC:** các nhóm `sources:catalog:*`, `sources:bindings:*`, `sources:sync:*` và
  `sources:updates:*`; không phơi secret hay primitive gọi adapter tổng quát.
- **Renderer:** màn Nguồn nội dung, wizard Thêm bản raw, danh sách Bản raw, preview diff và feed Cập nhật.
- **Tài liệu:** `docs/modules/sources/` và `docs/modules/workspace/app-level-features.md`.
- **Follow-up:** mỗi adapter mạng ưu tiên (Syosetu/Kakuyomu, Novelpia, Qidian/Fanqie) cần spike và OpenSpec
  riêng sau khi foundation này hoàn thành.
