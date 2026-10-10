## Why

Renderer của Mira đã có lớp `app`, `components/ui` và `features`, nhưng các thư mục cấp feature đang
trộn domain, màn hình và implementation detail. Các vòng phụ thuộc như `library` ↔ `work` và
`models` → `settings` → `onboarding` → `models`, cùng nhiều import tương đối sâu, làm cho việc mở rộng
sản phẩm và xác định ownership ngày càng khó.

Change này chuẩn hóa kiến trúc renderer theo domain ổn định và feature/use case nằm trong domain, trước
khi các module nguồn, workspace, ngữ cảnh và kết nối AI tiếp tục tăng kích thước.

## What Changes

- Định nghĩa `app` là composition root; domain không import ngược từ `app`.
- Tổ chức renderer theo các domain `library`, `workspace`, `ai-connections`, `context` và `sources`;
  feature/use case nằm bên trong domain thay vì đứng ngang hàng với domain.
- Đặt component, hook, model và store tại owner gần nhất; chỉ đưa mã thật sự trung lập và dùng chung vào
  `shared` hoặc `components/ui`.
- Thu hẹp import chéo domain, quy định public surface và thêm kiểm tra dependency direction vào bộ check.
- Làm mỏng `App.tsx` và tách các file điều phối lớn theo trách nhiệm, không thay đổi hành vi hiển thị,
  dữ liệu, IPC hay persistence.
- Di chuyển theo từng domain bằng các commit cơ học nhỏ, giữ test cạnh mã sở hữu và chạy bộ check sau mỗi
  lát cắt.

## Capabilities

### New Capabilities

Không có. Đây là refactor nội bộ và cập nhật tài liệu; không thêm hành vi sản phẩm.

### Modified Capabilities

Không có. Hành vi quan sát được, contract IPC, schema lưu trữ và luồng người dùng phải được giữ nguyên.

## Impact

- **Renderer:** phần lớn `src/renderer/src/app`, `features` và `stores`; đường dẫn import và vị trí test
  thay đổi theo ownership.
- **Tooling:** `biome.json` hoặc `scripts/check.mjs` có thêm kiểm tra ranh giới module mà không thêm runtime
  dependency nếu chưa cần thiết.
- **Tài liệu:** `ARCHITECTURE.md`, mục lục `docs/modules/README.md` và module kiến trúc frontend mới;
  `DESIGN.md` tiếp tục chỉ sở hữu quy tắc UI.
- **Tương thích:** không có breaking change dự kiến; preload API, main process và dữ liệu người dùng không
  đổi.
- **Phối hợp:** tránh di chuyển đồng thời các file đang được sửa bởi change sản phẩm khác; ưu tiên hoàn tất
  hoặc tách sạch change `source-system-foundation` trước khi apply.
