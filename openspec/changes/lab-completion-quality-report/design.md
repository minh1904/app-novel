## Context

Lab có hai đường ghi số: **sổ đăng ký** (`registry/runs.jsonl`, `measurements.jsonl`, kiểu ở
`src/shared/algorithms/runRegistry.ts`, schema 1) và **thống kê theo chương** trong `lab.json`
(`novel.stats[variant][chapter]`, có `failed` là một con số). `report` đọc bản dịch đã lưu trong thư
viện Lab rồi đếm lệch đoạn, đoạn thiếu, glossary; `pairs` đo xưng hô; `compare` so hai
`VariantSnapshot`; `history` sinh `docs/modules/measurement/history.md`.

Những gì đang thiếu để làm hai trục:

- `translateChapter` (`scripts/lab/cli.ts`) chỉ cộng `result.failed.length`. Kết quả `runBatch`
  (`TranslateBatchResult`) có `failed` và một `error.kind` cho cả lô; lõi dịch biết `refusedIds`,
  `withoutContextIds` nhưng `paragraphTranslation.ts` không trả chúng ra.
- Lỗi cả lô bị ném ở tầng provider (HTTP 4xx) và nội dung bị bộ lọc chặn (finish reason `filter`) cùng
  ra `kind: 'refused'`. Change song song về phân loại lỗi provider sẽ tách lỗi yêu cầu khỏi nội dung
  bị chặn; change này phải chạy được cả trước lẫn sau change đó.
- `report` đo theo **chương** và theo số đoạn, không theo id đoạn, nên không lấy được giao các đoạn.
- `compare.run.ts` (bộ đo cũ, `fixtures/private/runs`) lấy giao chương ở dòng 158.

## Goals / Non-Goals

**Goals:**
- Một bản ghi kết cục theo id đoạn cho mỗi lần dịch, đủ để dựng cả hai trục mà không gọi model.
- Đo lặp dùng lại cơ chế bản sao (`fork`) đã có, không phát minh kho dữ liệu mới.
- Bản ghi schema 1 vẫn đọc được.

**Non-Goals:**
- Không đổi hành vi sản phẩm khi dịch (chỉ thêm trường vào kết quả lô).
- Không hiệu chuẩn T1 hay xây trang chấm mù mới; chỉ gắn lớp cho số đã có.
- Không chọn kiểm định thống kê (bootstrap, t-test): với N nhỏ (2–5) quy tắc khoảng không chồng nhau
  dễ đọc và bảo thủ hơn.

## Decisions

### 1. Kết cục lấy từ lõi dịch, không suy từ bản dịch đã lưu

`TranslateBatchResult` thêm `refused: string[]` (tập con của `failed`, từ `refusedIds` của lõi dịch)
và giữ `error.kind` cho lỗi cả lô. Lab ánh xạ:

| Nguồn | Kết cục |
| --- | --- |
| id trong `written` hoặc `held` | `translated` |
| id trong `refused` | `refused` (lý do: `filter`, hoặc lý do cụ thể khi change phân loại lỗi có) |
| cả lô ném lỗi 4xx không phải auth/quota/rate | `request_error` |
| còn lại trong `failed` | `missing` |
| id thuộc kế hoạch nhưng lô chưa chạy (dừng, hủy, hết ngân sách) | `not_run` |

*Thay vì* đối chiếu bản dịch đã lưu với bản gốc: không phân biệt được bị chặn với thiếu, và bị ghi
đè ở lần chạy sau. Trước khi change phân loại lỗi provider xong, “4xx cả lô” là xấp xỉ của
`request_error`; khi change đó thêm loại lỗi riêng, chỉ bảng ánh xạ này đổi.

### 2. Lưu kết cục cạnh tệp request, trỏ từ sổ

Mỗi lane ghi `runs/<runId>/<ncode>-<variant>.outcomes.jsonl`, một dòng mỗi chương:
`{ chapter, ids: { [paragraphId]: outcome }, reasons?: { [id]: string } }`. `RunRecord` lên
`schema: 2` với `outcomes: { file, counts }` (đếm theo loại để bảng lịch sử không phải đọc tệp) và
`contextHash` (băm glossary + nhân vật + cặp xưng hô thực nạp, mở rộng `GlossaryProvenance.hash`).

*Thay vì* nhét map id vào `runs.jsonl`: 355 đoạn × nhiều lần chạy làm sổ khó đọc bằng mắt và phình.
Id đoạn là id ổn định của thư viện Lab, nên các bản sao từ cùng bản gốc (`fork`/`createCopy`) có
**cùng** id chương nhưng id đoạn phải ánh xạ qua thứ tự đoạn trong bản gốc; khóa so sánh dùng
`(chapter, order)` của bản gốc, không dùng id thô.

### 3. Đo lặp = nhóm bản sao có cùng `repeatOf`

`translate --repeat N` (hoặc `fork --repeat N`) tạo bản sao `label#1…#N` từ cùng bản gốc và cùng
glossary, đánh dấu `repeatOf: label` trong `lab.json`, rồi dịch như mọi biến thể. Báo cáo gom các bản
có cùng `repeatOf` thành một nhóm; trước khi gom, kiểm mọi lần chạy trong nhóm có cùng `contextHash`,
model, thinking, `promptVersion` và tập chương — lệch thì từ chối gộp và in lần lệch.

Ước tính chi phí trước khi chạy: lấy USD/chương trung bình của lần chạy gần nhất cùng model và biến
thể nếu có, nhân số chương × N; không có thì in “chưa có cơ sở ước tính” và yêu cầu `--max-usd`.

### 4. Hai trục trong `report` và `compare`

- `report` xuất phần **Hoàn thành** từ tệp kết cục (toàn tập, không loại) và phần **Chất lượng** từ
  bản dịch đã lưu nhưng chỉ trên tập khóa `(chapter, order)` có `translated` ở mọi biến thể được chọn.
  Các phép đếm hiện tại (lệch đoạn, glossary, tên) chuyển sang đo theo đoạn trong tập đó.
- `MeasurementRecord` thêm `basis: { variants, paragraphs, excluded: { [variant]: { [outcome]: n } } }`
  để biết số chất lượng được đo trên tập nào.
- `compareSnapshots` nhận nhóm lặp: hiện `n`, min, max, trung bình, độ lệch; `better` chỉ khác `null`
  khi cả hai nhóm có `n ≥ 2` và khoảng không chồng nhau, ngược lại ghi “chưa phân biệt được” hoặc
  “chưa đủ lần lặp”.

### 5. Lớp phép kiểm là dữ liệu tĩnh trong mã báo cáo

Một bảng `METRIC_TIERS` gán lớp cho từng chỉ số: cấu trúc (id thiếu/trùng, lệch số đoạn, không parse
được) là `gate`; glossary, tên nhất quán, xưng hô, độ dài, CJK sót là `flag`; T1 là `judge`; T3 là
`human`. Nhãn hiển thị đổi “lỗi” → “cờ” cho lớp `flag`. *Thay vì* cho người chạy tự gán: lớp là quyết
định về độ tin cậy của phép kiểm, không phải tùy chọn từng lần.

### 6. Lịch sử: mục “Lần chạy hỏng”

`historyMarkdown` coi lần chạy là hỏng khi không có lần đo nào trỏ tới nó **và** `httpErrors === calls`,
hoặc `outcomes.counts.request_error / tổng ≥ 0.5`. Lý do lấy từ thông điệp lỗi phổ biến nhất (đã lọc
bí mật bằng `assertNoSecret`). Lần chạy hỏng in ở mục riêng cuối mỗi truyện.

### 7. Bộ đo cũ

`compare.run.ts` tìm `outcomes.json` trong thư mục lần chạy; có ở cả hai thì loại đoạn như trên, thiếu
thì giữ giao chương và in cảnh báo theo spec. Không viết lại runner cũ.

## Risks / Trade-offs

- [Id đoạn khác nhau giữa các bản sao] → so theo `(chapter, order)` của bản gốc; nếu bản gốc của hai
  bản sao khác số đoạn ở một chương thì loại cả chương khỏi phần Chất lượng và ghi lý do.
- [N lần lặp tốn N lần tiền] → ước tính trước, `--max-usd` bắt buộc khi không ước tính được; khuyến
  nghị tập chương nhỏ (5–10) cho lặp.
- [Quy tắc khoảng không chồng nhau quá bảo thủ với N nhỏ] → chấp nhận: thà “chưa phân biệt được” còn
  hơn kết luận sai; số thô vẫn in để người đọc tự đánh giá.
- [Xấp xỉ `request_error` trước change phân loại lỗi] → ghi rõ trong báo cáo “phân loại theo HTTP 4xx
  cả lô” cho tới khi có loại lỗi riêng.
- [Đo chất lượng theo đoạn đổi số so với lịch sử] → lần đo schema 2 mang `basis`; lịch sử hiện cột
  “cơ sở” để không so số đo theo chương cũ với số theo tập đoạn mới.

## Migration Plan

Sổ đăng ký chỉ thêm: bản ghi schema 1 đọc như cũ, không có `outcomes` → nhãn “không có kết cục từng
đoạn”. Không chuyển đổi dữ liệu cũ; muốn có hai trục cho biến thể cũ thì chạy lại. Rollback: bỏ qua
trường mới, schema 1 vẫn hợp lệ.

## Open Questions

- Mặc định N cho `--repeat` là 3 hay để bắt buộc khai báo? Không đổi spec (spec chỉ yêu cầu N ≥ 2).
