## Context

Xem proposal.md — Why. Hiện trạng liên quan:

- `ParagraphTranslator.plan()` (`src/main/services/ai/paragraphTranslation.ts`) chỉ đọc bản gốc/bản dịch,
  lập lô và ước lượng chi phí; trả `runId` cho renderer.
- `runBatch()` mỗi lô gọi `library.getEffectiveGlossary(..., { approvedOnly: true })`,
  `library.getEffectiveAddressing(...)` và `listCharacters(db, { status: 'approved' })`, rồi
  `matchContextEntries` theo chữ của lô, `dyadsMentionedIn`/`charactersMentionedIn` theo cả chương.
- Trace ghi vào `proposal.context_json`: `sourceIds`, `context` (mục đã khớp + cặp), `contextHash`
  (= `requestHash`), `promptVersion`, `systemHash`, `usage`. Không có nhân vật, `previous`, `register`.
- Đề xuất (`proposal`, khóa `run_key = translate:<runId>`) chỉ được tạo khi lô đầu có đoạn dịch được, nên
  không thể là nơi giữ bản chụp (bản chụp phải có trước lô đầu).
- Renderer (`useParagraphTranslate.ts`) chạy các lô **tuần tự**, chạy lại đoạn lỗi bằng cùng `plan`, và lập
  kế hoạch lại khi nhận lỗi `conflict`. Lab (`scripts/lab/cli.ts`) gọi đúng `plan` → `runBatch` → `finalize`.
- `translationCore` chỉ nhận `TranslatePromptContext`; các lượt chia lô, gửi lại không ngữ cảnh và hỏi lại
  đều dùng prompt được truyền vào, nên chỉ cần thay **nguồn** của prompt ở `runBatch`.
- Schema tệp `.mira` hiện ở v8 (`workSchema.ts`).

## Goals / Non-Goals

**Goals:**
- Một bản chụp bất biến cho mỗi `runId`; mọi lô của lượt dựng prompt từ nó.
- Trace + bản chụp đủ để dựng lại request lượt chính, kiểm được bằng hash.
- Báo, không chặn, khi ngữ cảnh sống đã khác bản chụp.

**Non-Goals:**
- Không đổi nội dung prompt hay `translationCore`.
- Không áp bản chụp cho chat (`chatStoreContext.ts`) và `ChapterTranslator` (đường cũ của bench).
- Không lưu request đầy đủ cho các lượt phụ (chia lô, hỏi lại); chúng tái dựng được từ cùng bản chụp nhưng
  ID con của lượt chia không được ghi riêng trong change này.
- Không cam kết tỷ lệ trúng cache.

## Decisions

### 1. Bảng riêng `translate_run_context` trong tệp `.mira` (migration v9)

```text
translate_run_context(
  run_key TEXT PRIMARY KEY,            -- 'translate:<runId>', cùng khóa với proposal.run_key
  chapter_id TEXT NOT NULL REFERENCES chapter(id) ON DELETE CASCADE,
  snapshot_json TEXT NOT NULL,         -- nội dung bản chụp, JSON chuẩn hóa
  snapshot_hash TEXT NOT NULL,         -- sha256 của snapshot_json
  created_at INTEGER NOT NULL
)
```

Cột `live_fingerprint` trong bản nháp đầu bị bỏ khi triển khai: nó luôn bằng `snapshot_hash`, còn bản chụp sống được tính lại mỗi lô chứ không lưu.

Vì sao không nhét vào `proposal`: proposal sinh muộn (sau lô đầu thành công) và có thể không bao giờ sinh
nếu mọi lô lỗi; bản chụp phải có từ `plan`. Vì sao không giữ trong bộ nhớ main: app khởi động lại thì
renderer vẫn có thể chạy lại đoạn lỗi với cùng `runId`, và Lab cần đọc lại sau. Vì sao không lưu từng phiên
bản mục glossary (bảng lịch sử): kho ngữ cảnh chưa có versioning; một bản chụp JSON theo lượt rẻ và đủ cho
mục tiêu tái dựng. Đánh đổi: trùng lặp dữ liệu giữa các lượt — chấp nhận, glossary cỡ vài trăm mục.

### 2. Nội dung bản chụp

`{ version: 1, sourceLang, genre, register, glossary: ContextEntryItem[], dyads: AddressingDyadResolved[],
characters: CharacterItem[] }` — glossary là **toàn bộ** glossary hiệu lực đã duyệt của chương (chưa lọc
theo lô); `dyads` và `characters` đã lọc theo chữ cả chương (`dyadsMentionedIn`, `charactersMentionedIn`)
vì phép lọc đó vốn tính trên cả chương. JSON được chuẩn hóa (thứ tự khóa cố định, mảng theo thứ tự truy vấn
đã có `ORDER BY`) trước khi băm để cùng ngữ cảnh luôn cho cùng hash.

`runBatch` dựng `TranslatePromptContext` từ bản chụp: `glossary = matchContextEntries(chữ lô, snapshot.glossary)`,
`dyads`, `characters`, `register` lấy thẳng; `previous` vẫn lấy từ bản gốc (bản gốc đã được khóa bằng
`sourceRev` và kiểm `conflict` sẵn).

### 3. Phát hiện ngữ cảnh đổi bằng so hash, không bằng sự kiện

Mỗi `runBatch` tính lại bản chụp “sống” bằng cùng hàm chụp và so hash với `snapshot_hash`. Khác thì
`ParagraphBatchResult.contextChanged = true`. Chọn so hash vì kho ngữ cảnh có nhiều đường ghi (glossary,
alias, xưng hô, nhân vật, trích xuất AI) — theo dõi sự kiện dễ sót. Chi phí: thêm ba truy vấn mỗi lô, đúng
bằng chi phí hiện nay (hiện mỗi lô đã đọc ba nguồn này). Alternative bị loại: trả `conflict` và buộc lập kế
hoạch lại — làm mất tiến độ giữa chừng chỉ vì một sửa nhỏ, trong khi bản chụp đã bảo đảm nhất quán.

### 4. Trace lô mở rộng, không thay đổi dạng cũ

Trace thêm `snapshot: { runKey, hash }`, `characters` (tên/nhãn đã gửi), `previous`, `register`. Giữ các khóa
cũ (`context`, `contextHash`, `promptVersion`, `systemHash`) để mã đọc đề xuất cũ không đổi. Hàm
`rebuildTranslateRequest(trace, snapshot, units)` (main, dùng chung với test và Lab) dựng lại request bằng
`buildTranslateRequest` và so `requestHash`.

### 5. Hợp đồng IPC

- `ParagraphTranslationPlan` thêm `context: { hash: string; glossary: number; dyads: number; characters: number }`.
- `ParagraphBatchResult` thêm `contextChanged: boolean`.
- `ParagraphBatchInput` không đổi (bản chụp tra theo `runId`).

### 6. Vòng đời

Tạo trong `plan()`. Xóa theo `chapter` (cascade). Bản chụp mồ côi (lượt không sinh đề xuất) được dọn khi
`plan()` chạy cho cùng chương và bản chụp cũ hơn 30 ngày không có `proposal.run_key` tương ứng. Đề xuất còn
tồn tại thì bản chụp của nó được giữ.

### 7. Lab

`scripts/lab/cli.ts` sau `plan()` đọc `plan.context.hash`, ghi vào bản ghi lần chạy (`runs/*.jsonl`) và ghi
`context-<chapter>.json` vào thư mục lần chạy. Báo cáo so sánh hai lần chạy nêu chương có hash khác nhau.
Tên `snapshotOf` đã có trong `cli.ts` với nghĩa khác (ảnh chụp số đo) — mã mới dùng tên `contextSnapshot`.

## Risks / Trade-offs

- [Bản chụp lớn làm phình tệp `.mira`] → glossary vài trăm mục cỡ vài chục KB mỗi lượt; dọn mồ côi; đo lại
  nếu tác phẩm có hàng nghìn mục.
- [So hash mỗi lô báo “đã đổi” vì thay đổi không liên quan tới chương, ví dụ nhân vật không xuất hiện] →
  bản chụp sống dùng cùng phép lọc theo chương, nên thay đổi ngoài chương không đổi hash.
- [Kế hoạch đang mở trong renderer lúc nâng cấp] → lỗi `conflict` sẵn có đã kích hoạt lập kế hoạch lại.
- [Hàm chụp và hàm dựng prompt lệch nhau theo thời gian] → test dựng lại request từ trace phải trùng hash,
  chạy trong `scripts/check.mjs`.

## Migration Plan

Migration v9 chỉ thêm bảng; tệp v8 mở được và nâng tự động; cập nhật `__fixtures__/work-v9.schema.sql` và
test snapshot schema. Rollback: bản cũ của app từ chối mở tệp v9 theo cơ chế `unsupported_version` hiện có —
cần ghi trong ghi chú phát hành.

## Open Questions

- Ngưỡng 30 ngày cho bản chụp mồ côi là giá trị chọn tạm; có thể chỉnh khi có số liệu dung lượng.
- Có hiển thị nội dung bản chụp trong hồ sơ đề xuất không — thuộc thiết kế giao diện hồ sơ, không đổi spec.
