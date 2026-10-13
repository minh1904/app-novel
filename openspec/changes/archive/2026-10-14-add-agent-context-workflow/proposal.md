## Why

Mira đã có glossary, nhân vật, cặp xưng hô, effective resolver và bản chụp ngữ cảnh bất biến cho mỗi lượt
dịch, nhưng trích thuật ngữ bằng AI mới chạy trong Lab: chỉ lệnh `extract` của
[`scripts/lab/cli.ts`](../../../scripts/lab/cli.ts#L2167-L2254) gọi
[`glossaryExtraction.ts`](../../../src/main/services/ai/glossaryExtraction.ts); main không có service hay
IPC trích xuất, và `context_entry` không có chỗ lưu bằng chứng, lần chạy, model hay hash prompt
([`workSchema.ts`](../../../src/main/infra/storage/workSchema.ts#L148-L162)) mà quyết định ở
[glossary-extraction](../../../docs/modules/context/glossary-extraction.md) yêu cầu. Task dịch nhiều chương
vì vậy không có bước "trích thuật ngữ rồi duyệt" trước khi dịch.

## What Changes

- Work DB migration (v14): bảng bằng chứng cho mục do AI trích (lần chạy, chương, câu trích, model, hash
  prompt), bảng chương đã quét để trích tăng dần, cột loại thuật ngữ và cờ duyệt trên `context_entry`.
- Service trích thuật ngữ trong main, đưa luồng Lab (bước 1–4) vào sản phẩm, ghi ứng viên `pending`,
  `origin = ai`; lời gọi model đi qua cổng ngân sách của task.
- Lựa chọn Context bắt buộc khi tạo task dịch: trích thuật ngữ rồi duyệt, hoặc dịch ngay bằng Context đã
  duyệt. Không có mặc định; không bao giờ tự trích.
- Task chờ duyệt bằng `waiting_user(reason = context_review)` theo từ vựng trạng thái của
  `add-durable-translation-tasks`.
- Lệnh duyệt (approve, sửa rồi approve, reject kèm lý do, duyệt hàng loạt trong một loại) có guard
  `updatedAt`.
- Side panel chương có tab Ngữ cảnh chỉ hiển thị `Đang áp dụng`; "Xem và duyệt" mở màn Từ điển hiện có với
  bộ lọc `Chờ duyệt`.
- Tái dùng resolver và bản chụp hiện có (`getEffectiveGlossary`, `getEffectiveDyadsForChapter`,
  `takeContextSnapshot`, `translate_run_context`); không tạo bảng snapshot mới, không đổi prompt dịch.

## Capabilities

### New Capabilities

- `agent-context-workflow`: lựa chọn Context khi tạo task, trích thuật ngữ có bằng chứng, chờ duyệt, lệnh
  duyệt và tab Ngữ cảnh trong side panel.

### Modified Capabilities

Không có. Bản chụp ngữ cảnh (`translation-context-snapshot`) giữ nguyên hành vi; việc ghim bản chụp theo
item và giữ bản chụp khỏi `pruneOrphanRunContexts` thuộc `add-durable-translation-tasks`.

## Impact

- Phụ thuộc `add-durable-translation-tasks` (trạng thái task/item, reason `context_review`, cổng ngân sách,
  ghim `run_key`) và `add-agent-conversation` (side panel, capability tạo task từ chat).
- Work DB: migration v14 trong `src/main/infra/storage/workSchema.ts` cùng test nâng cấp từ v13.
- Main: service trích thuật ngữ mới trong `src/main/services/context/`, mở rộng `contextEntries.ts` cho
  ứng viên/bằng chứng/cờ, IPC channel và contract trong `src/shared/contracts/`.
- Renderer: tab Ngữ cảnh của side panel thuộc module context; `GlossaryScreen` nhận bộ lọc trạng thái ban
  đầu.
- Prompt dịch và `TRANSLATE_PROMPT_VERSION` không đổi.
