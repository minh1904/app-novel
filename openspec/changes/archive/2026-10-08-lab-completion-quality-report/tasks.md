## 1. Kết cục từng đoạn từ lô dịch

- [x] 1.1 Thêm `refused: string[]` vào `TranslateBatchResult` (`src/shared/contracts/aiTranslate.ts`) và trả `refusedIds` của lõi dịch qua `paragraphTranslation.ts`; kiểm bằng test `paragraphTranslation.test.ts` cho lô có đoạn bị lọc (id nằm trong cả `failed` và `refused`)
  - Lệch: không thêm `refused`; `ParagraphBatchResult.refusals` (từ `provider-error-reasons`) đã có id và lý do.
- [x] 1.2 Viết hàm thuần `batchOutcomes(plannedIds, result)` trong `src/shared/algorithms/` theo bảng ánh xạ của design (translated/refused/request_error/missing/not_run); test phủ đủ năm loại và lỗi 4xx cả lô
- [x] 1.3 `translateChapter` trong `scripts/lab/cli.ts` gom kết cục theo chương (kể cả `not_run` khi lane dừng giữa chừng) và ghi `runs/<runId>/<ncode>-<variant>.outcomes.jsonl`; kiểm bằng chạy Lab với provider mock và đọc tệp sinh ra
  - Chưa chạy Lab mock (ghi vào dữ liệu Lab thật); kiểm bằng unit test `batchOutcomes`/`notRunChapter` và typecheck.

## 2. Sổ đăng ký schema 2

- [x] 2.1 Nâng `REGISTRY_SCHEMA` lên 2: `RunRecord` thêm `outcomes { file, counts }` và `contextHash`; `MeasurementRecord` thêm `basis`; test `runRegistry.test.ts` đọc lẫn bản ghi schema 1 và 2
- [x] 2.2 `summarizeRun` nhận counts kết cục và `contextHash` (băm glossary + nhân vật + cặp xưng hô thực nạp); test băm ổn định khi thứ tự mục đổi
  - `contextHash` băm gộp các hash bản chụp theo chương (`contexts`), không băm lại glossary.

## 3. Hai trục trong report

- [x] 3.1 Hàm thuần `comparableKeys(outcomesByVariant)` trả tập khóa `(chapter, order)` có `translated` ở mọi biến thể cùng bảng loại trừ theo biến thể và loại kết cục; test có đoạn bị chặn ở một bản và trường hợp giao rỗng
- [x] 3.2 `report` in phần Hoàn thành (toàn tập: số/tỷ lệ từng loại, USD, token, giây) và phần Chất lượng chỉ trên `comparableKeys`, kèm dòng “loại N đoạn: …”; kiểm bằng snapshot test đầu ra Markdown trên dữ liệu mock
  - Kiểm bằng test các hàm dựng bảng (`completionCells`, `exclusionLine`) thay cho snapshot cả lệnh `report`.
- [x] 3.3 Lần chạy không có tệp kết cục được nhãn “không có kết cục từng đoạn” và không tính là hoàn thành 100%; test với bản ghi schema 1

## 4. Đo lặp

- [x] 4.1 `translate --repeat N` / `fork --repeat N` tạo bản sao `label#1…#N` với `repeatOf` trong `lab.json`; kiểm bằng test của hàm tạo nhãn và chạy mock 2 lần lặp
  - Chưa chạy mock 2 lần lặp; kiểm bằng test `repeatLabels`/`repeatBase` và typecheck.
- [x] 4.2 Ước tính chi phí N lần trước lời gọi đầu tiên; thiếu cơ sở ước tính thì bắt buộc `--max-usd`; test hàm ước tính và thông báo lỗi
- [x] 4.3 Hàm thuần `groupRepeats(runs)` gom theo `repeatOf`, từ chối gộp khi `contextHash`/model/thinking/promptVersion/tập chương lệch và nêu lần lệch; test cả hai nhánh
- [x] 4.4 Hàm thuần `spread(values)` trả n, min, max, trung bình, độ lệch chuẩn; test với n=1, n=2, n=5

## 5. So sánh và phân lớp

- [x] 5.1 Bảng `METRIC_TIERS` gán `gate`/`flag`/`judge`/`human` cho mọi chỉ số; báo cáo hiện lớp và đổi nhãn “lỗi” thành “cờ” cho lớp `flag`; test mọi chỉ số đều có lớp
- [x] 5.2 `compareSnapshots` nhận nhóm lặp: `better` chỉ khác `null` khi hai bên có n ≥ 2 và khoảng không chồng nhau, ngược lại “chưa đủ lần lặp”/“chưa phân biệt được”; test ba trường hợp trong spec

## 6. Lịch sử và bộ đo cũ

- [x] 6.1 `historyMarkdown` tách mục “Lần chạy hỏng” (không có lần đo và mọi lời gọi lỗi, hoặc `request_error` ≥ 50%) kèm lý do đã lọc bí mật, và cột “cơ sở” cho lần đo; test với bản ghi kiểu `v5-nothink+lite35`
- [x] 6.2 `scripts/bench/compare.run.ts` loại đoạn theo `outcomes.json` khi cả hai lần chạy có, ngược lại in cảnh báo “chỉ lấy giao chương”; kiểm bằng chạy comparator trên fixture có và không có tệp kết cục
  - Bộ đo cũ chỉ có số theo chương: loại cả chương có đoạn không dịch được (`benchChapters`, có test); chưa chạy trên fixture thật.

## 7. Tài liệu và kiểm tổng

- [x] 7.1 Cập nhật `docs/modules/measurement/metrics-and-judging.md` (hai trục, lớp phép kiểm, quy tắc kết luận) và `running-experiments.md` (`--repeat`, tệp kết cục); sinh lại `history.md` bằng `node scripts/lab/mira-lab.mjs history`
  - `history.md` chưa sinh lại: tệp đang có thay đổi chưa commit của phiên khác.
- [x] 7.2 Chạy `node scripts/check.mjs` và xác nhận typecheck, test hai pha và lint đều có bằng chứng đã chạy và đạt
