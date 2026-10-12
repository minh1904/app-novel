## Context

Hiện trạng đã kiểm (2026-10-12):

- `context_entry` có `status` (`approved | pending | rejected`), `origin` (`user | ai | import`), phạm vi
  `from_chapter_id`/`to_chapter_id` với `ON DELETE SET NULL`, và `updated_at`; không có cột revision, bằng
  chứng, lần chạy, model hay hash prompt. `context_alias` có `UNIQUE (form)`
  ([`workSchema.ts`](../../../src/main/infra/storage/workSchema.ts#L148-L172)).
- Trùng dạng nguồn/alias khi ghi bị `checkUniqueness` từ chối bằng `conflict`
  ([`contextEntries.ts`](../../../src/main/infra/storage/contextEntries.ts#L89-L135)).
- Resolver: `getEffectiveGlossary` lọc phạm vi theo vị trí chương, coi mốc `NULL` là không giới hạn, mặc
  định chỉ lấy `approved` ([`contextEntries.ts`](../../../src/main/infra/storage/contextEntries.ts#L229-L256));
  `getEffectiveDyadsForChapter`
  ([`addressingEntries.ts`](../../../src/main/infra/storage/addressingEntries.ts#L583)).
- Bản chụp: `takeContextSnapshot` dựng glossary approved, cặp xưng hô và nhân vật approved
  ([`contextSnapshot.ts`](../../../src/main/services/ai/translate/contextSnapshot.ts#L122-L144)); prompt chỉ
  đọc bản chụp ([`promptFromSnapshot`](../../../src/main/services/ai/translate/contextSnapshot.ts#L69-L83));
  bản chụp lưu bất biến trong `translate_run_context`
  ([`workSchema.ts`](../../../src/main/infra/storage/workSchema.ts#L340-L348)); lô sau so hash với kho để
  báo "ngữ cảnh đã đổi" ([`paragraphTranslation.ts`](../../../src/main/services/ai/paragraphTranslation.ts#L219-L223)).
- Lời thoại và lời kể đã tách: cặp xưng hô có `speakerPronoun`/`recipientPronoun`/`secondPerson`, nhân vật
  có `thirdPerson` cho người kể ([`addressing.ts`](../../../src/shared/contracts/addressing.ts#L15-L34));
  prompt viết cặp xưng hô trong khối `addressing` và đại từ người kể là "narrator calls them …" trong khối
  `characters` ([`translatePrompt.ts`](../../../src/main/services/ai/translate/translatePrompt.ts#L210-L248)).
  Đó chính là "nhãn lời thoại/lời kể" của spec; change này chỉ thêm test characterization, không đổi prompt.
- Trích thuật ngữ (bước 1–4 của [glossary-extraction](../../../docs/modules/context/glossary-extraction.md))
  chỉ được gọi từ Lab ([`cli.ts`](../../../scripts/lab/cli.ts#L2167-L2254)); `addressingAnalysis.ts` không có
  caller trong app.
- Màn Từ điển đã có bộ lọc `Chờ duyệt`
  ([`GlossaryScreen.tsx`](../../../src/renderer/src/modules/context/glossary/GlossaryScreen.tsx#L25-L30)),
  nhưng trạng thái lọc khởi tạo cứng là `all`
  ([`useGlossary.ts`](../../../src/renderer/src/modules/context/glossary/useGlossary.ts#L55)).

## Goals / Non-Goals

**Goals:** đưa trích thuật ngữ vào sản phẩm với bằng chứng và nguồn gốc lưu bền; người dùng chọn rõ có trích
hay không khi giao task; task chờ duyệt mà không giữ tài nguyên; chỉ mục đã duyệt vào prompt qua resolver và
bản chụp hiện có.

**Non-Goals:**

- Bảng snapshot mới, payload snapshot riêng cho task hay ghim/giữ snapshot (thuộc
  `add-durable-translation-tasks`).
- Đổi prompt dịch hoặc thay chuỗi theo lời thoại/lời kể.
- Phân tích xưng hô bằng AI trong app (`addressingAnalysis`) và tự chuyển mục loại người thành nhân vật
  (bước 7 của glossary-extraction).
- Đề xuất alias mới cho mục đã duyệt.
- Tự duyệt; quét lại chương đã quét khi bản gốc đổi; cảnh báo khi xóa chương làm mốc phạm vi.
- Panel Context ba bộ lọc, sửa/duyệt nhanh trong side panel, import hay bulk editor mới.
- Cột revision cho `context_entry`.

## Decisions

### 1. Work DB v14: bằng chứng, chương đã quét, loại và cờ

```sql
ALTER TABLE context_entry ADD COLUMN term_type TEXT;            -- person, place, … theo TERM_TYPES
ALTER TABLE context_entry ADD COLUMN review_flags TEXT NOT NULL DEFAULT '[]';  -- JSON [{code, detail}]
CREATE TABLE context_entry_evidence (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES context_entry (id) ON DELETE CASCADE,
  run_id TEXT NOT NULL,
  chapter_id TEXT REFERENCES chapter (id) ON DELETE SET NULL,
  quote TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX context_entry_evidence_entry ON context_entry_evidence (entry_id);
CREATE TABLE context_extraction_scan (
  chapter_id TEXT PRIMARY KEY REFERENCES chapter (id) ON DELETE CASCADE,
  run_id TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  scanned_at INTEGER NOT NULL
);
```

Vì sao bảng bằng chứng riêng: một mục có nhiều câu trích từ nhiều chương và nhiều lần chạy; mục do người
dùng tạo không có dòng nào. Cờ là JSON trên mục vì chỉ để hiển thị cho người duyệt, không truy vấn. Mã cờ:
`alias_conflict` (detail = dạng alias), `script_mismatch`, `reopened` (mục đã loại được mở lại vì bằng chứng
mới). `term_type` cần cho duyệt hàng loạt trong một loại.

### 2. Alias trùng: không ghi vào `context_alias`

`UNIQUE (form)` giữ nguyên để không phải dựng lại bảng. Khi ứng viên có alias đã thuộc mục khác, service lưu
ứng viên **không có alias đó** và thêm cờ `alias_conflict` mang dạng alias; lần trích không lỗi. Khi duyệt,
người dùng chọn bỏ alias hoặc gỡ nó khỏi mục kia rồi thêm vào; mọi ghi alias vẫn qua `checkUniqueness`.

### 3. Service trích thuật ngữ trong main

`ContextExtractionService` (trong `src/main/services/context/`) tái dùng hàm thuần của
`glossaryExtraction.ts` theo đúng thứ tự Lab: ứng viên bằng code, quét mẫu, phân loại, `verifyTerms`. Sau
kiểm của Lab, service thêm kiểm sản phẩm:

| Trường hợp | Xử lý |
| --- | --- |
| Trùng dạng nguồn mục `approved` hoặc `pending` | bỏ, không tạo mục cạnh tranh |
| Trùng mục `rejected` | bỏ, trừ khi có câu trích từ chương chưa có trong bằng chứng cũ; khi đó về `pending` với cờ `reopened` |
| Alias trùng mục khác | quyết định 2 |
| Tên Nhật mà `target` không phải chữ Latin; tên Trung mà `target` không phải chữ tiếng Việt | cờ `script_mismatch`, không tự sửa |
| `not-a-term` | lưu `rejected` để không đề xuất lại |

Phạm vi quét: các chương trong phạm vi task chưa có dòng `context_extraction_scan`. Mỗi lời gọi model đi
qua cổng ngân sách của task (`add-durable-translation-tasks`); chạm trần thì task `paused(reason=budget)`
trước request, và chương chưa ghi scan sẽ được quét ở lần Tiếp tục. Ghi mục, bằng chứng và scan của một
chương trong một transaction work DB; lỗi model không đổi mục đã có. Tiếp tục sau khi app đóng chỉ quét chương
chưa có scan.

### 4. Lựa chọn Context khi tạo task: bắt buộc, không mặc định

Lệnh tạo task dịch có `contextStrategy: 'extract_then_review' | 'approved_only'` bắt buộc, lưu trong
`agent_task.options_json` do `add-durable-translation-tasks` sở hữu (không thêm cột library). Thiếu trường thì lệnh bị
từ chối bằng lỗi kiểm tra. Màn tạo task hỏi người dùng; capability tạo task trong chat khai trường này là bắt
buộc và mô tả rằng model phải hỏi người dùng, không tự chọn. Không đường nào tự chọn `extract_then_review`.

### 5. Chờ duyệt = `waiting_user(reason=context_review)`

Với `extract_then_review`, trước item đầu tiên scheduler chạy bước trích. Nếu lần chạy tạo ít nhất một mục
`pending`, task chuyển `waiting_user(reason=context_review)`; các item vẫn `queued`, không giữ provider request,
write intent hay khóa editor. Không có mục mới thì task chạy tiếp. Tiếp tục không yêu cầu duyệt hết: mục còn
`pending` không vào bản chụp vì `takeContextSnapshot` chỉ lấy `approved`. Hủy task không xóa ứng viên.

### 6. Bản chụp: dùng nguyên cơ chế hiện có

Item ghim bản chụp khi lần đầu `queued → running` qua `run_key` trỏ `translate_run_context`, theo
`add-durable-translation-tasks`. Change này không thêm gì cho bản chụp. "Context đã đổi" nghĩa là hash bản
chụp mới khác hash đã ghim, như `paragraphTranslation.ts` đang làm.

### 7. Lệnh duyệt với guard `updatedAt`

IPC mới trong `src/shared/contracts/` và handler mỏng: `approve`, `editApprove` (sửa target/alias/phạm vi rồi
approve), `reject` (lý do vào `notes`), `bulkApprove`. Mỗi lệnh mang `expectedUpdatedAt`; lệch thì trả
`conflict` cho mục đó. `bulkApprove` chỉ nhận mục cùng `term_type`, chạy một transaction và trả kết quả từng
mục; mục lỗi không được báo thành công. Approve mục có cờ `alias_conflict` vẫn qua `checkUniqueness`.

### 8. UI: tối thiểu

- Tab Ngữ cảnh của side panel (shell do `add-agent-conversation` dựng) chỉ có `Đang áp dụng` cho chương hiện
  tại, đọc qua IPC trả nội dung của `takeContextSnapshot` (cùng nguồn với prompt), chỉ đọc.
- Activity của task `context_review` và tab Ngữ cảnh có nút "Xem và duyệt" mở màn Từ điển của tác phẩm với
  bộ lọc `pending`; `GlossaryScreen`/`useGlossary` nhận trạng thái lọc ban đầu. Màn Từ điển hiện bằng chứng,
  cờ và lệnh duyệt.

## Risks / Trade-offs

- **Xóa chương làm mốc nới phạm vi** (`ON DELETE SET NULL`, `NULL` = không giới hạn): giữ hành vi hiện có;
  item đã ghim không đổi, item sau dùng phạm vi mới. Cảnh báo khi xóa để sau.
- **`updated_at` cùng mili-giây** có thể che một lần sửa: chấp nhận vì một người dùng một máy.
- **Không quét lại chương đã sửa bản gốc**: người dùng thêm tay; quét lại để sau.

## Migration Plan

1. Migration work v14 và test nâng cấp từ v13 có dữ liệu; mục cũ có `review_flags = '[]'`, `term_type` null.
2. Service trích + test bằng provider giả; IPC duyệt.
3. Nối `contextStrategy` và `context_review` vào scheduler của task.
4. UI tab `Đang áp dụng` và lối "Xem và duyệt".

Rollback: bỏ lựa chọn `extract_then_review` khỏi UI/capability; bảng và cột v14 để nguyên.
