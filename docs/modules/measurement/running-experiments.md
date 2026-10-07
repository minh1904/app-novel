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

Biến chính: `MIRA_BENCH_MODEL`, `MIRA_BENCH_PROMPT`, `MIRA_BENCH_THINKING` (từ 2026-10-06 không còn
`MIRA_BENCH_PROMPT_VERSION`: chỉ còn một [prompt dịch](../context/prompt-system.md)),
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
(`meta.json` + `plain/*.txt`) thành các **bản** theo nhãn biến thể tự đặt (mặc định `base`; thêm mức
thinking sau dấu `-`, ví dụ `base-nothink`) trong một thư viện riêng ở
`fixtures/private/lab/data`, với cùng bản gốc và cùng glossary lấy từ
`fixtures/private/lab/glossary/<ncode>.json`. Lệnh dịch đi qua đúng đường của UI
(`ParagraphTranslator`, chính sách tự áp dụng), nên `open` in lệnh mở thư viện lab bằng app
(`MIRA_DATA_DIR`) để đọc kết quả trong editor.

| Lệnh | Việc |
| --- | --- |
| `import <thư mục…>` | nạp các bản theo biến thể và glossary |
| `glossary [ncode…]` | nạp lại glossary, nhân vật, cặp xưng hô sau khi sửa tệp |
| `prompt <ncode> --chapter N --batch K` | in prompt sẽ gửi, không gọi mạng |
| `translate [ncode…] --chapters 1-3 [--note "…"]` | dịch thật; request ghi vào `runs/`, mỗi truyện × biến thể thêm một dòng vào sổ |
| `report [ncode…] [--glossary-file <tên>]` | số đoạn, tuân thủ glossary và tên nhất quán (mọi bản đo trên cùng glossary tham chiếu), token, chi phí, từng đoạn cạnh nhau; ghi lần đo vào sổ |
| `pairs <ncode> --labels <biến thể>` | câu thoại lệch cặp xưng hô đã chốt; ghi lần đo vào sổ |
| `extract <ncode> [--chapters 1-30] [--out <ncode>.ai]` | AI trích xuất thuật ngữ và nhân vật vào tệp glossary riêng `origin: ai` ([thiết kế](../context/glossary-extraction.md)) |
| `analyze [ncode…] [--glossary-file <tên>] [--apply]` | AI đề xuất giới tính, ngôi ba, cặp xưng hô kèm bằng chứng; `--apply` ghi vào đúng tệp đó |
| `fork <ncode> --variants … [--from <bản>] [--glossary <tên>\|none]` | tạo bản mới bằng cách chép bản gốc từ bản có sẵn, gán glossary riêng hoặc không glossary |
| `gaps`, `cost`, `export`, `pdf`, `list`, `open` | ô trống xưng hô, chi phí, xuất txt/PDF, tình trạng, mở bằng app |
| `runs`, `compare`, `history`, `backfill` | sổ đăng ký lần chạy, xem mục dưới |

**Nguồn gốc glossary.** Glossary, nhân vật và cặp xưng hô của năm truyện hiện có là **nháp Claude soạn
tay** trong phiên làm việc (2026-10-05/06), không đi qua lệnh AI nào của Lab; lệnh `glossary` vẫn gắn
`origin: ai` cho mục khi nạp vào DB, nên nhãn trong DB không phản ánh nguồn thật. Số đo trên các tệp này
không nói về luồng thật của sản phẩm, vì bỏ qua bước trích xuất. **Quyết định của chủ sản phẩm
(2026-10-06):** dữ liệu ngữ cảnh cho thí nghiệm phải do luồng AI của Mira/Lab tạo ra, không soạn hộ;
tệp ghi `origin` (`ai`, `human`, `claude-draft`) và sổ đăng ký chép nguồn gốc đó vào mỗi lần chạy.

Mỗi bản có thể dùng tệp glossary riêng (`lab.json` → `glossaries[nhãn]`, gán khi `fork`); vắng thì dùng
tệp chung `<ncode>.json`, `none` là chạy không glossary, nhân vật hay cặp xưng hô nào. `extract` không
bao giờ ghi đè tệp chung.

Khóa API chỉ nằm trong DB lab dưới dạng mã hóa bằng khóa ngẫu nhiên của tiến trình, và kết nối bị xóa
khi lệnh kết thúc.

## Sổ đăng ký lần chạy

Thêm 2026-10-06. Trước đó Lab không ghi prompt, hash hay commit; `lab.json` chỉ giữ thống kê mới nhất
của mỗi biến thể và chương, và số chấm xưng hô chỉ in ra console.

`fixtures/private/lab/registry/` giữ hai tệp JSONL **chỉ thêm**:

| Tệp | Một dòng là | Ghi bởi |
| --- | --- | --- |
| `runs.jsonl` | một lần chạy của một biến thể trên một truyện: model, thinking, `promptVersion`, băm system prompt, commit (`+` nếu `src/` còn thay đổi chưa commit), nguồn gốc và băm glossary, chương, lời gọi, lỗi HTTP, token, USD, ghi chú | `translate`; `backfill` cho lần chạy cũ |
| `measurements.jsonl` | một lần đo trạng thái bản dịch: chương đo, các lần chạy đã sinh ra chúng, cấu trúc, glossary, xưng hô lệch, commit lúc đo | `report`, `pairs` |

Hai loại tách nhau vì lần chạy sau ghi đè bản dịch của biến thể: lần đo chụp chất lượng tại lúc đo và
trỏ về lần chạy theo `lab.json`. Logic nằm ở
[`runRegistry.ts`](../../../src/shared/algorithms/runRegistry.ts).

| Lệnh | Việc |
| --- | --- |
| `runs [ncode…] [--variants …] [--limit 30]` | liệt kê lần chạy, mới nhất trước |
| `compare <ncode> <A> <B>` | so hai biến thể theo lần đo gần nhất của từng chỉ số và cấu hình; cảnh báo khi khác chương hoặc khác nhãn người nói |
| `history` | sinh lại [lịch sử đo](history.md); `translate`, `report`, `pairs` tự làm |
| `backfill` | nhập lần chạy cũ từ `runs/`; commit đoán theo thời điểm (`~`), prompt `legacy`, glossary `claude-draft` |

**Ngữ cảnh theo chương (thêm 2026-10-07).** Mỗi lượt dịch chương dùng một bản chụp ngữ cảnh bất biến
(xem [hệ thống prompt](../context/prompt-system.md#bản-chụp-ngữ-cảnh-theo-lượt-dịch-đã-triển-khai-2026-10-07)).
`translate` ghi hash bản chụp vào `lab.json` (`contextHash` của chương) và vào bản ghi lần chạy
(`contexts`: số chương → hash), và lưu nội dung bản chụp thành `context-<ncode>-<biến thể>-<chương>.json`
trong thư mục lần chạy. `compare` cảnh báo các chương mà lần chạy mới nhất của hai biến thể dùng ngữ cảnh
khác hash. Lần chạy trước ngày này không có hash, nên không so được.

**Kết cục từng đoạn và đo lặp (thêm 2026-10-08).** `translate` ghi
`runs/<runId>/<ncode>-<biến thể>.outcomes.jsonl` (mỗi dòng một chương: id đoạn → kết cục, kèm lý do bị
chặn); bản ghi lần chạy lên schema 2 với `outcomes { file, counts }` và `contextHash` (băm gộp các hash
bản chụp theo chương). `report` dựng hai trục Hoàn thành và Chất lượng từ các tệp này (xem
[phép đo và chấm](metrics-and-judging.md)).

`translate --repeat N` (hoặc `fork --repeat N`) tạo N bản lặp `label#1…#N` từ cùng bản gốc và cùng
glossary, ghi `repeatOf` trong `lab.json`, in ước tính chi phí N lần trước lời gọi đầu tiên (từ USD/chương
của các chương đã dịch); chưa có cơ sở ước tính thì bắt buộc `--max-usd`. `compare` gom các bản lặp thành
nhóm; lần lặp lệch ngữ cảnh, model, thinking, prompt hay tập chương bị loại khỏi nhóm và được nêu tên.
Nên lặp trên tập chương nhỏ (5–10) vì N lần tốn N lần tiền.

Giới hạn: lần đo cũ không dựng lại được vì bản dịch đã bị ghi đè — lịch sử chỉ bắt đầu từ lần `report`/
`pairs` đầu tiên sau khi có sổ. Lần chạy cũ không còn model trong `lab.json` thì không tính được chi phí.
Bench (`fixtures/private/runs/`) chưa nối vào sổ.

[Về module Bộ đo](README.md)
