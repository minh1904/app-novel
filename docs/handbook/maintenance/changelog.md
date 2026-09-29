# Nhật ký handbook

## 0.2 — 2026-09-29

- ADR-002: AI dịch từ raw thành luồng chính của bản đầu; thêm nhiều nguồn raw, văn phong từ bản dịch cũ, ma trận xưng hô; chốt kiểu kết nối model (API key, OpenRouter, tương thích OpenAI; không OAuth thuê bao Claude/Antigravity). Tài khoản và đồng bộ để sau.
- Thêm nghiên cứu công cụ dịch AI (GalTransl, AiNiee, LinguaGacha, auto-novel, Sakura, OpenNovel), nhiều nguồn, văn phong và OpenRouter PKCE.
- Thêm nghiên cứu hệ sinh thái dịch truyện Việt/nhà cung cấp AI và khả thi kỹ thuật (liên kết qua chỉnh sửa, `node:sqlite`, căn chỉnh bậc thang, đo thử embedding).
- Viết lại roadmap theo quy trình đã chốt: giao diện sớm trên dữ liệu thật mỏng, provider giả lập, một chương xuyên suốt trước.
- Cập nhật decisions, open-questions, scope (đánh dấu phần bị thay), mapping MIR-09 và thêm MIR-13 đến MIR-15.

## 0.1 — 2026-09-29

- Đổi brand sang Mira theo yêu cầu người dùng; ghi ADR-001 và phạm vi đổi định danh ứng dụng.
- Tổ chức lại tám tài liệu chủ đề cũ vào handbook; giữ trang chuyển hướng và tài sản tham khảo.
- Khảo sát 11 sản phẩm/dự án nguồn đóng/thương mại và nguồn mở; ghi riêng giới hạn phân loại QuickTranslator.
- Thêm mapping MIR-01 đến MIR-12, roadmap theo điều kiện hoàn thành và kế hoạch kiểm chứng.
- Đối chiếu hiện trạng scaffold, sửa mô tả cũ về màn khởi động/thư viện.
- Áp dụng cấu trúc tài liệu sống dựa trên tham khảo Diátaxis, GitLab Handbook và ADR; thêm mẫu bổ sung.

Đây là phiên bản tài liệu trong working tree, chưa là Git tag hay release ứng dụng. Các nghiên cứu kế thừa giữ ngày nguồn ban đầu; kết quả benchmark/phỏng vấn chưa có.

Kiểm tra thay đổi ngày 2026-09-29: `pnpm typecheck`, `pnpm lint` và `pnpm build` thành công; kiểm tra đích liên kết Markdown nội bộ và `git diff --check` không phát hiện lỗi. Build cần chạy ngoài sandbox vì esbuild bị chặn tạo tiến trình con. Chưa chạy ứng dụng để nghiệm thu UI hoặc tạo/kiểm thử installer; các bài V01–V09 vẫn là kế hoạch.

---

[Mục lục handbook](../README.md)
