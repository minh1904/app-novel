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

Biến chính: `MIRA_BENCH_MODEL`, `MIRA_BENCH_PROMPT`, `MIRA_BENCH_PROMPT_VERSION` (`v1` mặc định,
`v2` theo [hệ thống prompt](../context/prompt-system.md)), `MIRA_BENCH_THINKING`,
`MIRA_BENCH_REPEATS`, `MIRA_BENCH_ONLY`, `MIRA_RUN_A/B`, `MIRA_RUN_BASELINE/CANDIDATE`. Từ
2026-10-05, `config.json` ghi `promptVersion` và hash của các system prompt **đã gửi thật**, đọc từ
request; các lần chạy trước ghi hash của prompt MVP, không khớp thứ đã chạy. Bật
khuyến nghị E6 lịch sử bằng `MIRA_BENCH_DECISION_PROFILE=legacy-e6`; không khai thì báo metrics mà
không tự kết luận giữ/bỏ.

Judge đọc `MIRA_JUDGE_BASE_URL`, `MIRA_JUDGE_KEY`, `MIRA_JUDGE_MODEL`. Khóa chỉ ở biến môi trường
hoặc `.env` bị ignore; mọi output được quét secret trước khi ghi. Bản dịch và report chi tiết ở
`fixtures/private/runs/`; bảng đưa vào tài liệu không được chứa câu truyện.

Một lần chạy có ý nghĩa phải ghi commit, fixture, model, prompt hash, tham số thực gửi, số lần lặp,
usage, lỗi và thời gian. Khi code/fixture/oracle đổi, dùng `rescore` và giữ kết quả cũ thay vì ghi đè.

## Mira Lab: thử prompt trên truyện thật

`node scripts/lab/mira-lab.mjs help` (2026-10-05). CLI nạp truyện xuất từ syosetsu-downloader
(`meta.json` + `plain/*.txt`) thành **hai bản** `[v1]` và `[v2]` trong một thư viện riêng ở
`fixtures/private/lab/data`, với cùng bản gốc và cùng glossary lấy từ
`fixtures/private/lab/glossary/<ncode>.json`. Lệnh dịch đi qua đúng đường của UI
(`ParagraphTranslator`, chính sách tự áp dụng), nên `open` in lệnh mở thư viện lab bằng app
(`MIRA_DATA_DIR`) để đọc kết quả trong editor.

| Lệnh | Việc |
| --- | --- |
| `import <thư mục…>` | nạp hai bản và glossary |
| `glossary [ncode…]` | nạp lại glossary sau khi sửa tệp |
| `prompt <ncode> --chapter N --batch K` | in prompt sẽ gửi, không gọi mạng |
| `translate [ncode…] --chapters 1-3` | dịch thật; mỗi request ghi vào `fixtures/private/lab/runs/` |
| `report [ncode…]` | so số đoạn, tuân thủ glossary, token và cache, từng đoạn cạnh nhau |

Glossary của ba truyện thử là **nháp do AI soạn**, ghi `origin: ai` nhưng đánh dấu đã duyệt để đi vào
prompt; người dịch cần xác minh trước khi coi điểm tuân thủ là thước đo. Khóa API chỉ nằm trong DB lab
dưới dạng mã hóa bằng khóa ngẫu nhiên của tiến trình, và kết nối bị xóa khi lệnh kết thúc.

[Về module Bộ đo](README.md)
