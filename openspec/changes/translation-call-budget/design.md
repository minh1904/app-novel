## Context

- `executeTranslateBatch` (`translationCore.ts`) gọi `caller.complete` ở bốn chỗ: lượt chính, `splitFiltered`
  (lượt chính bị lọc), `splitFiltered` lần hai với ngữ cảnh rút gọn, và lượt hỏi lại. Biến `calls` nằm
  trong từng lần gọi `splitFiltered`, nên trần 16 áp riêng cho mỗi vòng.
- Lượt dịch do renderer điều khiển (`useParagraphTranslate.ts`): `plan()` trả `runId` và danh sách lô,
  rồi gọi `paragraphBatch` cho từng lô; thử lại phần lỗi dùng lại cùng `runId`. Main không giữ trạng
  thái nào của lượt giữa các lô ngoài đề xuất trong `.mira`.
- Gateway (`gateway.ts`) thử lại lỗi `network`/`timeout` tới `maxRetries: 2` (`retryPolicy.ts`), đổi khóa khi
  bị giới hạn tốc độ; tầng trên không biết một lời gọi đã thử mấy lần.
- Lab (`scripts/lab/cli.ts`) gọi lõi dịch trực tiếp, đã có `--max-usd` dừng nhận chương mới và một bộ đếm
  `budget.calls` riêng cho polish.

## Goals / Non-Goals

**Goals:**
- Một trần duy nhất, tất định, cho số lời gọi model của một lượt dịch chương.
- Tách "hết ngân sách" khỏi "bị từ chối" và "thiếu" trong kết quả, trace và Lab.
- Thấy được số lời gọi và lần thử HTTP thật của mỗi lượt.

**Non-Goals:**
- Ngân sách theo tiền cho sản phẩm (Lab đã có `--max-usd`); sản phẩm chỉ báo chi phí ước tính.
- Đổi thuật toán chia lô hay số vòng (bớt ngữ cảnh, hỏi lại) — chỉ giới hạn chúng.
- Ngân sách cho chat và polish.

## Decisions

**D1. Đơn vị là lời gọi model, không phải request HTTP.** Một lần `caller.complete` = một đơn vị. Retry
của gateway không trừ: nó đã có trần riêng (2 lần), chỉ xảy ra với lỗi tạm thời, và nếu tính vào thì
một mạng chập chờn sẽ làm đoạn vô can "hết ngân sách". Thay vào đó gateway báo số lần thử của mỗi lời
gọi qua callback tùy chọn, và lõi dịch cộng vào `httpAttempts` để báo cáo. Phương án đếm theo HTTP bị
loại vì làm kết quả phụ thuộc mạng; phương án theo token bị loại vì token chỉ biết sau khi gọi.

**D2. Ngân sách = phần dành cho lượt chính + quỹ vòng phụ.** Mặc định: `main = số lô`,
`extra = max(8, 2 × số lô)`. Với chương 3 lô, trần là 3 + 8 = 11 lời gọi thay vì 3 × 34 = 102. Lượt
chính không bao giờ bị từ chối vì ngân sách (đã dành sẵn); vòng phụ xin quỹ trước mỗi lời gọi. Giá trị
`2 × số lô` đủ cho mỗi lô một lượt hỏi lại và một lần chia nhỏ; con số là mặc định thử, Lab dùng để đo
lại. Phương án một quỹ chung không dành sẵn bị loại vì lô đầu bị lọc nặng có thể làm lô sau không được
gửi.

**D3. Đối tượng `CallBudget` truyền vào lõi dịch.** `executeTranslateBatch` nhận `budget?: CallBudget` với
`take(round): boolean` và `snapshot()`. Thiếu `budget` thì dùng một ngân sách cục bộ có quỹ phụ 33 —
giữ hành vi hiện tại cho test và `ChapterTranslator`. `splitFiltered` bỏ biến `calls`, hỏi `budget.take
('split' | 'bare')`; lượt hỏi lại hỏi `take('repair')`. `take` đồng bộ và trừ ngay, nên các lô song song
trong cùng tiến trình không vượt trần dù `await` xen kẽ.

**D4. Main giữ ngân sách theo `runId`.** `ParagraphTranslator` giữ `Map<runId, CallBudget>`, tạo trong
`plan()` từ số lô. `runBatch` lấy ra theo `runId`; không có (app khởi động lại giữa lượt) thì tạo mới từ
kế hoạch còn lại — chấp nhận được vì lượt hiếm khi kéo dài qua lần khởi động. Thử lại phần lỗi do người
dùng bấm gửi cờ `retry: true`, main cấp lại quỹ phụ cho lượt (D2 tính theo số lô của lần thử lại).
`finalize` xóa mục khỏi `Map`.

**D5. Lý do `budget_exhausted`.** Thêm vào `TranslateErrorKind`. Lõi dịch trả `budgetIds` (cũng nằm trong
`failedIds`), như `refusedIds`. Khi một lô có cả đoạn bị từ chối và đoạn hết ngân sách, `error.kind` giữ
`refused` (nặng hơn, thử lại vô ích) và thông báo nối thêm số đoạn hết ngân sách; `budgetIds` vẫn tách
riêng để giao diện cho thử lại đúng các đoạn đó.

**D6. Báo cáo.** `ParagraphBatchResult.budget = { used, limit, byRound: {main, split, bare, repair},
httpAttempts, warn }`; `warn` bật ở lô đầu tiên làm `used ≥ 0,8 × limit`. Trace đề xuất thêm cùng
`byRound` và `httpAttempts` của lô. Chi phí ước tính dùng `estimateCost`/bảng giá đã có, chỉ để hiển thị.

**D7. Lab.** Cờ `--max-calls <n>` đặt quỹ phụ mỗi chương (mặc định theo D2); registry ghi `calls`,
`httpAttempts`, `budgetExhausted` cho mỗi chương. Bộ đếm polish giữ nguyên, ngoài phạm vi.

## Risks / Trade-offs

- [Mặc định quá chặt làm mất đoạn lẽ ra cứu được bằng chia lô] → `budget_exhausted` cho thử lại riêng;
  đo trên `n4696dd` chương 3 và 10 trước khi chốt mặc định.
- [Ngân sách trong bộ nhớ mất khi khởi động lại] → tạo lại từ kế hoạch còn lại; tệ nhất là một lượt
  được thêm một quỹ phụ.
- [Renderer gửi `retry: true` tùy ý để lách trần] → renderer là mã của chính app; trần nhằm chặn vòng lặp
  máy, không chống người dùng. Mỗi lần cấp lại vẫn có trần.
- [Callback số lần thử làm gateway phức tạp thêm] → tùy chọn, không đổi quyết định retry; có test.

## Migration Plan

Không đổi schema. Đề xuất cũ không có trường ngân sách trong trace; giao diện coi là "không rõ". Rollback
bằng cách bỏ truyền `budget` (lõi dịch về ngân sách cục bộ như cũ).

## Open Questions

- Mặc định `extra = max(8, 2 × số lô)` cần chỉnh theo số đo Lab; không đổi spec hay cấu trúc.
