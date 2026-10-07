## Why

Một lô dịch hiện có thể tốn tới 34 lời gọi model: lượt chính, tối đa 16 lời gọi chia lô khi bị bộ lọc
chặn, thêm tối đa 16 lời gọi ở vòng gửi lại không kèm ngữ cảnh, và một lượt hỏi lại. Gateway còn thử
lại mỗi lời gọi tới hai lần khi lỗi mạng, nên một lô xấu có thể thành khoảng 100 request HTTP. Trần
`MAX_FILTER_SPLIT_CALLS` đếm riêng trong từng lần chia, không có giới hạn nào cho cả lô hay cả chương,
và người dịch không thấy một chương đã tiêu bao nhiêu lời gọi.

## What Changes

- Thêm **ngân sách lời gọi cho một lượt dịch chương** (một `runId`): dùng chung cho mọi lô của lượt
  và mọi vòng trong lô (lượt chính, chia lô khi bị lọc, gửi lại không ngữ cảnh, hỏi lại id thiếu).
- Lượt chính của mỗi lô luôn có phần dành sẵn; các vòng phụ rút từ một quỹ chung, nên một lô bị lọc
  nặng không làm các lô sau hết lượt chính.
- Khi quỹ vòng phụ cạn: dừng mọi vòng phụ còn lại, giữ đoạn đã dịch, đoạn chưa xong vào `failedIds`
  với lý do riêng **hết ngân sách** (`budget_exhausted`), khác `refused` và thiếu do phản hồi.
- Cảnh báo khi đã dùng từ 80% ngân sách; kết quả lô và trace đề xuất ghi số lời gọi đã dùng (theo
  vòng), giới hạn và chi phí ước tính.
- Thử lại riêng phần lỗi do người dùng bấm được cấp lại quỹ vòng phụ.
- Mira Lab nhận cờ cấu hình ngân sách và ghi số lời gọi vào sổ đăng ký lần chạy.
- Retry của gateway (lỗi mạng, timeout) **không** tính vào ngân sách; số lần thử HTTP được ghi riêng
  để thấy chi phí thật.

## Capabilities

### New Capabilities
- `translation-call-budget`: giới hạn và báo cáo số lời gọi model của một lượt dịch chương, chia giữa
  lượt chính và các vòng phụ, với lý do thất bại riêng khi hết ngân sách.

### Modified Capabilities

(không có; chưa có spec chính trong `openspec/specs/`)

## Impact

- `src/main/services/ai/translate/translationCore.ts`: nhận một bộ đếm ngân sách thay cho đếm cục bộ
  trong `splitFiltered`; trả số lời gọi theo vòng và id hết ngân sách.
- `src/main/services/ai/paragraphTranslation.ts`: giữ ngân sách theo `runId`, tạo lúc lập kế hoạch,
  ghi vào trace đề xuất.
- `src/shared/contracts/aiTranslate.ts`, `aiTranslateProposals.ts`: thêm `budget_exhausted` vào
  `TranslateErrorKind`; `ParagraphBatchResult` thêm trường ngân sách.
- `src/renderer/src/features/chapter/useParagraphTranslate.ts`: hiện cảnh báo 80% và lỗi hết ngân sách.
- `src/main/infra/providers/gateway/gateway.ts`: báo số lần thử của một lời gọi (chỉ để ghi nhận).
- `scripts/lab/cli.ts`: cờ `--max-calls`, ghi số lời gọi vào registry.
- Không đổi schema SQLite: số liệu nằm trong `context_json` của đề xuất.
