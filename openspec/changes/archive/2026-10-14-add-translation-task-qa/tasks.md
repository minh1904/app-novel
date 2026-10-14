## 1. Evaluator

- [x] 1.1 Viết hàm thuần `evaluateTaskItem(snapshot, segments)` gọi `evaluateGlossaryCompliance`, `evaluateAddressingCompliance`, `checkResidualSourceChars`, `checkLengthOutliers`, `checkRepetitions`, `checkUnbalancedQuotes` với bead 1–1 theo segment; gán ruleCode/ruleVersion; miễn chữ gốc của mục glossary giữ nguyên.
- [x] 1.2 Fixture đúng và báo nhầm dễ gặp cho từng luật (alias chồng, tên giữ nguyên, thoại không nêu tên, đoạn dài hơn nguồn hợp lệ); test kết quả theo bản chụp, không theo Context hiện hành.

## 2. Dismiss

- [x] 2.1 Migration work DB thêm `qa_dismissal` (khóa duy nhất ruleCode, ruleVersion, chapterId, segmentId, target hash), schema snapshot test.
- [x] 2.2 Service main đọc bản chụp qua `run_key` và target hiện tại, lọc dismiss; IPC đọc cảnh báo theo task/item và dismiss; test target đổi hoặc ruleVersion đổi làm cảnh báo hiện lại, dismiss không đổi target hay trạng thái item.

## 3. Màn Tác vụ

- [x] 3.1 Số cảnh báo mở trong tổng kết task, danh sách theo item, Mở đoạn, Bỏ qua kèm lý do tùy chọn; test không dùng màu làm tín hiệu duy nhất, không có nhãn “đúng 100%”, item không target hiện N/A.
- [x] 3.2 Chạy `node scripts/check.mjs`.
