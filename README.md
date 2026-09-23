# Miyati

Miyati là workspace dịch thuật dành cho Windows. Bản đầu phục vụ dịch giả truyện với editor **Toàn văn** và **Từng câu** trên cùng nội dung, lưu nội bộ và làm việc cốt lõi offline. Sản phẩm được thiết kế để sau này có thể mở rộng sang dịch tài liệu/docs. AI thuộc giai đoạn sau.

Repo đang ở giai đoạn lập roadmap lại từ đầu; prototype cũ đã được bỏ khỏi cây làm việc và còn trong lịch sử Git. Tên thư mục repo `app-novel` không phải tên hiển thị của sản phẩm.

Đọc [mục lục docs](docs/README.md), [quyết định đã chốt](docs/decisions.md) và [câu hỏi còn mở](docs/open-questions.md) trước khi đề xuất tính năng, mô hình dữ liệu, roadmap hoặc UI.

## Quy ước đóng góp

Commit theo [quy tắc của repo](AGENTS.md#commits), tham chiếu từ point-cloud và áp dụng cho Miyati.

## Scaffold ứng dụng

Scaffold dùng template React + TypeScript của `@quick-start/electron`, với Electron main/preload giữ sandbox. React renderer dùng Tailwind CSS v4 + Base UI; màn xem component hỗ trợ light/dark. Chưa có thư viện tác phẩm, editor lưu dữ liệu hoặc AI. Chế độ màu khởi đầu theo Windows trong bản xem này; hành vi mặc định của sản phẩm chưa chốt.

Yêu cầu Node.js từ 22.12 và pnpm 8.9.

    pnpm install
    pnpm dev
    pnpm typecheck
    pnpm lint
    pnpm build
    pnpm preview

Lần chạy `pnpm dev` đầu tiên tải binary Electron qua lệnh `electron --version` nếu máy chưa có; lần tải đó cần mạng, còn app sau khi cài vẫn chạy offline. Nếu terminal đang đặt `NPM_CONFIG_OFFLINE=true`, cần chuyển sang `false` khi cài dependency lần đầu. `pnpm build` tạo bundle trong `out`; `pnpm build:win` tạo bộ cài Windows qua electron-builder, chưa phải bản phát hành chính thức. Token Tailwind CSS-first nằm ở src/renderer/src/styles/tokens.css; component ở src/renderer/src/components; font local ở src/renderer/src/assets. Màn xem trong app dùng cùng baseline với docs/design-system-v1.md.
