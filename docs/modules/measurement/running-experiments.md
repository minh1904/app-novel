# Vận hành thí nghiệm

Cập nhật: 2026-10-04 · Trạng thái: hướng dẫn developer.

Các lệnh dùng Vitest riêng để tái sử dụng TypeScript của app. Chúng không nằm trong `check.mjs` và
không được gọi nhà cung cấp trong test thường.

```powershell
# Dịch một điều kiện
node_modules/.bin/vitest run --config scripts/bench/vitest.config.mjs scripts/bench/translate.run.ts

# Chấm lại output đã lưu, không gọi mạng
node_modules/.bin/vitest run --config scripts/bench/vitest.config.mjs scripts/bench/rescore.run.ts

# Judge tùy chọn
node_modules/.bin/vitest run --config scripts/bench/vitest.config.mjs scripts/bench/judge.run.ts

# Sinh trang người chấm hoặc nhập kết quả
node_modules/.bin/vitest run --config scripts/bench/vitest.config.mjs scripts/bench/rate.run.ts

# Báo cáo so sánh; mặc định chỉ báo metrics
node_modules/.bin/vitest run --config scripts/bench/vitest.config.mjs scripts/bench/compare.run.ts
```

Trang T3 dùng tên mù dạng `rating-<hash>.html`; tên run/condition chỉ nằm trong tệp key riêng ở
`fixtures/private/runs/`. Runner in tên trang cần mở sau khi sinh xong.

Biến chính: `MIRA_BENCH_MODEL`, `MIRA_BENCH_PROMPT`, `MIRA_BENCH_THINKING`,
`MIRA_BENCH_REPEATS`, `MIRA_BENCH_ONLY`, `MIRA_RUN_A/B`, `MIRA_RUN_BASELINE/CANDIDATE`. Bật
khuyến nghị E6 lịch sử bằng `MIRA_BENCH_DECISION_PROFILE=legacy-e6`; không khai thì báo metrics mà
không tự kết luận giữ/bỏ.

Judge đọc `MIRA_JUDGE_BASE_URL`, `MIRA_JUDGE_KEY`, `MIRA_JUDGE_MODEL`. Khóa chỉ ở biến môi trường
hoặc `.env` bị ignore; mọi output được quét secret trước khi ghi. Bản dịch và report chi tiết ở
`fixtures/private/runs/`; bảng đưa vào tài liệu không được chứa câu truyện.

Một lần chạy có ý nghĩa phải ghi commit, fixture, model, prompt hash, tham số thực gửi, số lần lặp,
usage, lỗi và thời gian. Khi code/fixture/oracle đổi, dùng `rescore` và giữ kết quả cũ thay vì ghi đè.

[Về module Bộ đo](README.md)
