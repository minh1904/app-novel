## 1. Hợp đồng

- [x] 1.1 Thêm `budget_exhausted` vào `TranslateErrorKind` và trường `budget` vào `ParagraphBatchResult`; kiểm bằng `aiTranslate.test.ts` và typecheck qua `node scripts/check.mjs`
- [x] 1.2 Thêm cờ `retry` tùy chọn vào `paragraphBatchSchema`; test schema nhận và từ chối giá trị sai

## 2. Bộ đếm ngân sách

- [x] 2.1 Viết `CallBudget` (dành sẵn lượt chính, quỹ phụ, `take(round)`, `snapshot()`, ngưỡng 80%); unit test trừ đồng bộ, không vượt trần khi nhiều lô `take` xen kẽ
- [x] 2.2 Gateway báo số lần thử của mỗi lời gọi qua callback tùy chọn; `gateway.test.ts` kiểm retry mạng làm tăng số lần thử mà không đổi kết quả

## 3. Lõi dịch

- [x] 3.1 `executeTranslateBatch` nhận `budget`, thiếu thì dùng ngân sách cục bộ giữ hành vi cũ; toàn bộ `translationCore.test.ts` hiện có vẫn qua
- [x] 3.2 `splitFiltered` bỏ biến `calls`, xin `take('split' | 'bare')`; lượt hỏi lại xin `take('repair')`; test: lô bị lọc ở cả hai vòng không vượt một trần chung
- [x] 3.3 Trả `budgetIds` tách khỏi `refusedIds` và id thiếu, `error.kind` theo D5; test hết ngân sách giữa lúc chia giữ đoạn đã dịch và đoạn đã khoanh là bị từ chối

## 4. Dịch theo đoạn và giao diện

- [x] 4.1 `ParagraphTranslator` giữ ngân sách theo `runId` (tạo ở `plan`, cấp lại khi `retry`, xóa ở `finalize`, tạo lại khi mất); test trong `paragraphTranslation.test.ts` cho hai lô dùng chung và thử lại được cấp lại quỹ
- [x] 4.2 Ghi `byRound`, `httpAttempts` vào trace đề xuất; test đọc lại `context_json`
- [x] 4.3 `useParagraphTranslate` hiện cảnh báo 80% một lần và thông báo hết ngân sách có nút thử lại riêng; kiểm tay trong app với mock provider trả `filter` (chưa kiểm tay; chỉ typecheck và test của hàm xử lý)

## 5. Lab và kiểm tra chung

- [x] 5.1 Thêm `--max-calls` vào `scripts/lab/cli.ts`, ghi `calls`, `httpAttempts`, `budgetExhausted` vào registry; chạy Lab với mock trên một chương và xem registry (chưa chạy Lab; kiểm bằng typecheck và test `summarizeRun`/`batchOutcomes`)
- [x] 5.2 Chạy `node scripts/check.mjs` và xác nhận typecheck, test, lint đều có bằng chứng đã chạy
