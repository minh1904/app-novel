# Mira

Mira là workspace dịch thuật cho Windows, dành trước tiên cho dịch giả truyện nhiều chương từ Anh, Trung giản thể/phồn thể và Nhật sang Việt. Mục tiêu lõi: **Toàn văn / Từng câu trên cùng nội dung**, làm việc offline và giữ dữ liệu an toàn. AI và dịch tài liệu là hướng mở rộng sau P0.

**Bắt đầu tại [Mira Handbook](docs/handbook/README.md).** Bộ tài liệu nối nghiên cứu thị trường → mục tiêu → phạm vi → trải nghiệm → kỹ thuật → kiểm chứng.

| Bạn cần | Đọc |
| --- | --- |
| Hiểu sản phẩm | [Định hướng](docs/handbook/product/vision.md), [quyết định](docs/handbook/product/decisions.md) |
| Hiểu đối thủ | [Thị trường](docs/handbook/research/market-landscape.md), [mapping với Mira](docs/handbook/research/feature-map.md) |
| Tiếp tục phát triển | [Hiện trạng](docs/handbook/engineering/current-state.md), [roadmap](docs/handbook/delivery/roadmap.md) |
| Bổ sung handbook | [Cách vận hành](docs/handbook/maintenance/handbook-guide.md), [mẫu tài liệu](docs/handbook/maintenance/templates.md) |

## Chạy scaffold

Yêu cầu Node.js >=22.12 và pnpm 8.9.0 theo package.json.

```powershell
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
```

Hiện có Electron + React + TypeScript, Tailwind CSS v4, Base UI, thư viện với dữ liệu mẫu trong bộ nhớ và màn xem component. **Chưa có editor, lưu tác phẩm bền vững, import/export hoặc backup.** Không dùng scaffold để giữ bản dịch thật.

Lần cài/chạy đầu có thể cần tải Electron qua mạng. `pnpm build` tạo bundle trong `out`; `pnpm build:win` tạo installer Windows bằng electron-builder, chưa phải quy trình phát hành chính thức. Nếu terminal đặt `NPM_CONFIG_OFFLINE=true`, chuyển sang `false` khi cài dependency cần mạng.

Brand đổi từ Miyati sang **Mira** ngày 2026-09-29. Thư mục repo `app-novel` giữ nguyên. Xem [brand](docs/handbook/product/brand.md) về định danh bản cài và giới hạn migration.

Commit theo [quy tắc repository](AGENTS.md#commits). Handbook viết bằng tiếng Việt; commit message viết bằng tiếng Anh.
