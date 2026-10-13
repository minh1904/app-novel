## Context

Chat dịch một chương qua `runChapterTranslation`
([`chapterTranslationRunner.ts`](../../../src/main/services/agent/chapterTranslationRunner.ts)); work DB
ghi checkpoint và batch của operation; library DB giữ projection `agent_operation`. Màn Tác vụ là mock
([`JobsScreenMock`](../../../src/renderer/src/app/AppContent.tsx#L150) và
[`JobsAreaMock`](../../../src/renderer/src/modules/workspace/work-detail/workAreas.tsx#L3-L35)). Change
này thêm orchestration bền trong Main và sửa runner ở những chỗ task cần, không viết translation core mới.

Library DB hiện ở v10 ([`librarySchema.ts`](../../../src/main/infra/storage/librarySchema.ts));
`add-agent-conversation` lấy v11, change này lấy v12.

## Goals / Non-Goals

**Goals:** task dải chương với phạm vi cố định; scheduler tuần tự; Pause/Continue/Cancel/Retry/Skip/Run
again; phục hồi sau đóng app hoặc crash; trần ngân sách; màn Tác vụ thật; capability chat tạo task.

**Non-Goals (đã cắt):**

- Chạy song song, DAG, cron, chạy khi app đã thoát, tự chạy lại khi mở app.
- Chính sách ghi đè khác `fill_untranslated` (ghi đè hàng AI hoặc hàng người dùng).
- Đặt trước chi phí theo trường hợp xấu nhất; khử trùng usage theo request ID (usage cộng từ hàng operation).
- Trần chi phí cho kết nối subscription/OAuth; tự chuyển sang provider/model/kết nối khác.
- Trích Context, steering, QA hậu dịch (các change sau), ETA/tốc độ.

## Decisions

### Từ vựng trạng thái (change này sở hữu)

- Task: `queued`, `running`, `pausing`, `paused`, `waiting_user`, `cancelling`, `cancelled`, `completed`,
  `partially_completed`, `failed`.
- Item: `queued`, `running`, `waiting_user`, `completed`, `failed`, `skipped`, `cancelled`.
- `reason` (cho `waiting_user`, `paused`, `failed`): `missing_raw`, `conflict`, `budget`, `provider`,
  `refused`, `context_review`, `app_closed`, `recovered_after_restart`, `user`. `context_review` chỉ được
  dùng từ `add-agent-context-workflow`; `user` là Pause do người dùng bấm.
- Không dùng `waiting_review`, `needs_attention`, `checking`, `needs_user` làm trạng thái.

Bảng chuyển trạng thái đầy đủ nằm trong spec. Mọi chuyển trạng thái đi qua một repository method có
compare-and-set `state_version`; renderer không cập nhật trạng thái trực tiếp.

### Dữ liệu library DB v12

| Bảng | Cột chính |
| --- | --- |
| `agent_task` | id, kind `translate_chapters`, work_id, origin_turn_id nullable (FK `agent_turn` ON DELETE SET NULL), source_task_id nullable, client_command_id UNIQUE, payload_digest, state, reason, model_ref_json (connectionId, entryId, settingsKey), overwrite_policy (`fill_untranslated`), options_json (tùy chọn theo kind; `add-agent-context-workflow` thêm `contextStrategy`), budget_json (maxCalls, maxTokens, maxCostUsd), state_version, created_at, updated_at |
| `agent_task_item` | id, task_id, ordinal, chapter_id, state, reason, run_key nullable, source_rev nullable, expected_target_rev nullable, skipped_segments_json, progress_json (applied, kept, total, failed, refused), context_changed, state_version, timestamps; UNIQUE (task_id, ordinal), UNIQUE (task_id, chapter_id) |
| `agent_task_attempt` | item_id, attempt, operation_id UNIQUE, created_at; PRIMARY KEY (item_id, attempt) |
| `agent_operation` (dựng lại) | như cũ, nhưng `turn_id` nullable, thêm `task_item_id` (FK `agent_task_item`), `CHECK ((turn_id IS NULL) <> (task_item_id IS NULL))` |

Usage của task không có cột riêng: là tổng `usage_json` của các operation thuộc item của task, tính khi đọc.
Không lưu text nguồn/bản dịch trong library DB.

Dựng lại `agent_operation` theo mẫu đã có ở work DB (tạo bảng mới, chép, drop, rename,
[`workSchema.ts` L324](../../../src/main/infra/storage/workSchema.ts#L324)). Lưu ý: migration chạy trong
transaction với `foreign_keys = ON`, nên `DROP TABLE agent_operation` sẽ chạy `ON DELETE SET NULL` trên
`agent_activity.operation_id`
([`librarySchema.ts` L292](../../../src/main/infra/storage/librarySchema.ts#L292)). Migration dùng cờ
`foreignKeysOff` mà `add-agent-conversation` thêm vào runner cho v11 (tắt `PRAGMA foreign_keys` trước khi mở
transaction, vì SQLite bỏ qua pragma này bên trong transaction; `foreign_key_check` trước commit); test migration kiểm
liên kết còn nguyên.

### Mỗi lần chạy item là một operation mới

Journal từ chối batch trên operation đã kết thúc
([`agentOperationJournal.ts` L207](../../../src/main/infra/storage/agentOperationJournal.ts#L207)), nên
mọi lần item chuyển queued → running (lần đầu, Continue, Retry) tạo một operation mới và một hàng
`agent_task_attempt`. `attempt` chỉ là metadata.

Khóa batch = `item:<itemId>:` + sha256(segmentIds, sourceRev, contextSnapshotHash, settingsKey). Cùng khóa
và cùng checksum trong các operation của item → trả kết quả cũ; cùng khóa khác checksum → `conflict`. Tra
khóa qua các `operation_id` của item (biết từ `agent_task_attempt`), dùng được khóa chính hiện có
`(operation_id, batch_key)` nên không cần migration work DB.

Chính sách `fill_untranslated`: runner chỉ lập kế hoạch các hàng nguồn không rỗng chưa có bản dịch nào. Hàng
đã được operation trước của item commit thì đã có bản dịch nên tự rơi khỏi kế hoạch; hàng người dùng sửa
cũng không bị đụng. Đây là cách thực hiện quy tắc "loại đoạn đã commit mà hàng đích chưa đổi" mà không cần
lưu danh sách segment trong journal. Chat giữ chính sách hiện tại.

Giống Temporal, idempotency key phải ổn định qua các lần thử lại và do nơi ghi kiểm, không phải do bước gọi
([Temporal activity-definition L218](https://github.com/temporalio/documentation/blob/e78a13b3d87ef060e404314ac7d4564424d64181/docs/encyclopedia/activities/activity-definition.mdx#L218));
LangGraph cũng nói bước đang dở có thể chạy lại khi resume
([functional-api L806-L810](https://github.com/langchain-ai/docs/blob/cd302e5548df094a85b34dfb6eb23823c66614f4/src/oss/langgraph/functional-api.mdx#L806-L810)).
Provider không nhận idempotency key, nên Mira chỉ bảo đảm không ghi lặp, không bảo đảm không gọi lặp.

### Ghim bản chụp theo item

Trong lần chuyển queued → running đầu tiên: work DB trước — `takeContextSnapshot` rồi `createRunContext`
với `run_key = task:<itemId>` (nếu hàng đã có do crash giữa hai DB thì dùng lại) — rồi library transaction
đặt `run_key`, `source_rev`, `expected_target_rev`, tạo operation và attempt. Các lần sau dùng lại `run_key`.
Runner đọc `getRunContext` và dựng prompt mỗi batch bằng `promptFromSnapshot`
([`contextSnapshot.ts` L69](../../../src/main/services/ai/translate/contextSnapshot.ts#L69)); không còn đọc
`getEffectiveGlossary`/`getEffectiveAddressing` trong vòng batch và không nuốt lỗi. Chat dùng cùng đường
với `run_key = agent:<operationId>`.

`source_rev` khác bản nguồn lúc Continue/Retry → item `waiting_user(conflict)`; "Dịch lại chương" là task
mới (Run again) nên có item và bản chụp mới. `expected_target_rev` được chụp lúc item bắt đầu, không lúc tạo
task.

Giữ bản chụp: `pruneOrphanRunContexts` chạy trên work DB, không join được library DB. Hàm bỏ qua mọi
`run_key` bắt đầu bằng `task:`. Vì MVP không có xóa task, điều này tương đương "được item tham chiếu".

### Runner: điểm dừng, ngân sách, kết quả

Runner nhận thêm `runKey`, `budget: CallBudget`, `shouldStop(): StopReason | null`, `batchKey()` và
`beforeCommit()`:

- `shouldStop()` được kiểm trước mỗi batch. `pause`, `budget`, `app_closed` → runner dừng, đánh dấu
  operation `interrupted`, trả `stopped`; item về `queued`.
- Cancel: abort `signal` (hủy request đang bay) và rào commit — trong lease, ngay trước
  `applyAgentTranslationBatch`, kiểm cancel lần nữa (đã có ở
  [L239](../../../src/main/services/agent/chapterTranslationRunner.ts#L239)). Task chỉ sang `cancelled` sau
  khi promise của runner kết thúc.
- Một operation = một `CallBudget(batches, defaultExtra(batches))` truyền cho mọi `executeTranslateBatch`
  (spec `translation-call-budget`). `CallBudget` nhận thêm một cổng ngoài: trước mỗi `take()` hỏi trần task;
  cổng từ chối thì `take()` trả `false` và runner ghi `budgetStop`, item về `queued`, task `paused(budget)`.
- Usage ghi vào `agent_operation.usage_json` sau mỗi batch với `complete: false`, chốt `complete: true` khi
  kết thúc bình thường; lỗi không phải abort vẫn ghi usage một phần trước khi ném. Provider không báo usage
  → `null`, hiển thị "không rõ".
- Kết quả đối soát dùng `translateReconcile` sẵn có (thiếu/thừa/trùng ID,
  [`translateReconcile.ts` L89-L112](../../../src/shared/translation/translateReconcile.ts#L89-L112)) và
  `failedIds`/`refusedIds`/`budgetIds` của `executeTranslateBatch`; không thêm bước kiểm cấu trúc mới.

Ánh xạ kết quả runner → item:

| Kết quả runner | Item |
| --- | --- |
| `completed`, mọi hàng cần dịch đã có bản dịch hoặc nằm trong `skipped_segments` | `completed` |
| `partially_completed` chỉ vì hàng đã có bản dịch được giữ | `completed` (đếm `kept`) |
| `partially_completed` có `refusedIds` | `failed(refused)` |
| `partially_completed` có `failedIds`/`budgetIds` (không có refused) | `failed(provider)` hoặc `failed(budget)` |
| `stopped` (pause / trần task / đóng app) | `queued` |
| `cancelled` | `cancelled` |
| `conflict` (revision lệch, khóa batch trùng khác checksum, nguồn đổi) | `waiting_user(conflict)` |
| ném lỗi "chưa có bản gốc" | `waiting_user(missing_raw)` |
| ném lỗi provider khác | `failed(provider)` |

Trường hợp "toàn bộ hàng được bảo vệ" hiện trả `conflict`
([L106-L120](../../../src/main/services/agent/chapterTranslationRunner.ts#L106-L120)); với task, chương
không còn hàng chưa dịch là `completed` với `applied = 0`.

### Scheduler tuần tự

Một scheduler trong Main chọn item `queued` đầu tiên của task `queued`/`running` theo
`(task.created_at, task.id, item.ordinal)`. Toàn app tối đa một item `running`. Scheduler được đánh thức khi
tạo task, Continue/Retry và khi một item kết thúc; không poll. Item `waiting_user`/`failed` không chặn item
sau. Khi task không còn item `queued`/`running`: tất cả `completed` → `completed`; có ít nhất một `completed`
→ `partially_completed`; không có → `failed`.

### Ghi và editor

Task không có `webContents` gọi nó, nên publisher của task gửi write-intent tới mọi cửa sổ trước mỗi batch
commit và đợi ack của từng cửa sổ (`ack` hoặc `not-open`); `flush-failed` hoặc hết giờ → item
`waiting_user(conflict)`. Main giữ tập chương đang có item `running`; capability ghi của chat kiểm tập này
trước khi gọi provider và trả `conflict`. Người dùng vẫn sửa được chương; sửa giữa hai batch làm revision lệch
→ item `waiting_user(conflict)`, Continue tạo operation mới và `fill_untranslated` bỏ qua hàng vừa sửa.

### Đóng app và khởi động

`will-quit` ([`index.ts` L186-L191](../../../src/main/index.ts#L186-L191)) đóng scheduler trước khi đóng
library: abort runner, ghi đồng bộ task `queued`/`running`/`pausing` → `paused(app_closed)`, item `running`
→ `queued`, `cancelling` → `cancelled`. Khởi động, sau `operationReconciler`, task reconciler xử lý phần do
crash để lại: đọc journal work DB của operation item đang `running`; operation đã `completed` ở work DB thì
item `completed` (journal thắng), còn lại item → `queued`; task `queued`/`running`/`pausing` →
`paused(recovered_after_restart)`; `cancelling` → `cancelled`. Không gọi provider, không tự chạy.

### Ngân sách task

Trần: số lời gọi model, số token (theo usage đã báo), chi phí USD chỉ khi `lookupModel` có giá cho model;
kết nối subscription/OAuth chỉ có trần lời gọi/token. Kiểm trước mỗi lời gọi qua cổng của `CallBudget`.
Đã đặt trần token mà lần gọi trước không có usage → không chứng minh được trần → `paused(budget)` với thông
điệp nói usage không rõ.

### IPC, chat và UI

- Kênh: `agentTaskList`, `agentTaskGet`, `agentTaskCreate`, `agentTaskControl` (lệnh `pause`, `continue`,
  `cancel`, `retry`, `skip_item`, `skip_refused`, `run_again`; kèm `clientCommandId`, `stateVersion`);
  sự kiện `agentTaskChanged` phát tới mọi cửa sổ. Preload expose cùng tên.
- Capability `create_translation_task`: policy `needs_user` (tốn tiền), resolve work và chapter ID, trả
  taskId; turn kết thúc độc lập với task. Làm sau khi `add-agent-conversation` có.
- `JobsScreen` (toàn app) và `JobsArea` (lọc theo work) thay hai mock, refetch khi mount và khi nhận
  `agentTaskChanged`. Dùng `ProgressBar` sẵn có với nhãn chữ ("12/30 chương"), một vùng `aria-live="polite"`
  báo đổi trạng thái; control chỉ hiện khi chuyển trạng thái hợp lệ. Theo [DESIGN.md](../../../DESIGN.md).

## Risks / Trade-offs

- **Provider đã tính tiền trước crash** → không ghi lặp nhưng có thể gọi lại một batch; usage của lời gọi mất
  hiện "không rõ".
- **Một item một lúc** → chậm hơn; song song là change sau khi có số đo.
- **Hai DB lệch** → work DB trước, library sau; journal thắng khi reconcile.
- **Bản chụp task không bao giờ bị dọn** → chấp nhận cho MVP (không xóa task); khi có xóa task thì dọn theo.
- **Tiền tố `task:` để giữ bản chụp** → `shortcut` có chủ đích vì không join được hai DB.

## Migration Plan

1. v12 + fixture `library-v12.schema.sql`, test migration giữ liên kết `agent_activity`, test backup giữa
   lúc task chạy.
2. Repository + state machine + scheduler với executor giả.
3. Sửa runner (snapshot, budget, `shouldStop`, khóa batch, usage) cho cả chat và task.
4. Publisher write-intent, đường thoát app, task reconciler, fault injection.
5. IPC/preload, màn Tác vụ, capability chat.

Rollback: tắt scheduler; bảng giữ read-only; kết quả đã commit vẫn Undo được theo operation.
