## Context

Xem `proposal.md` cho động cơ. Hiện trạng tạo các ràng buộc kỹ thuật sau:

- `ai_session` và `ai_turn` nằm trong từng DB tác phẩm; renderer còn giữ một session riêng cho mỗi `workId`.
- `ChatSendInput` dùng `workId`/`chapterId` đang mở để dựng tool runner. Tool đọc được chương khác trong cùng tác phẩm nhưng tool ghi từ chối mọi chương khác chương đang mở.
- Vòng chat, reasoning, tool call và usage đã stream main → renderer. Renderer nối từng delta thẳng vào state và parse lại toàn bộ Markdown.
- Dịch chương hiện do renderer điều phối từng lô. Main đã có lập kế hoạch, khóa cấu hình model, context dịch, kiểm revision, ghi từng lô, proposal `policy: auto`, usage thật và snapshot/undo ở luồng proposal.
- `library.db` đã chứa dữ liệu cấp ứng dụng như kết nối, model, OAuth và source job; DB từng tác phẩm là nguồn sự thật cho nội dung.
- Change `agentic-chat` đã triển khai phần lớn nhưng còn hai task live/UX chưa hoàn tất. Foundation này thay thiết kế proposal chờ duyệt của change đó; không coi hai change là hai hành vi cùng tồn tại.

## Goals / Non-Goals

**Goals:**

- Tạo một lát cắt dọc chạy được: session toàn ứng dụng → resolve target cross-work → dịch một chương → áp dụng trực tiếp → activity/progress → undo.
- Giữ quyền đặc quyền trong main và chỉ cấp capability domain typed cho model.
- Dùng lại pipeline dịch, policy lỗi, context snapshot, usage và phép kiểm revision đã có thay vì viết một lõi dịch thứ hai.
- Tách dữ liệu orchestration toàn ứng dụng khỏi nội dung/checkpoint thuộc tác phẩm và xử lý được việc hai DB không có transaction chung.
- Giữ lịch sử cũ đọc được và cho tiếp tục bằng contract mới.

**Non-Goals:**

- Không làm MCP, code execution hoặc plugin capability trong change này.
- Không làm scheduler bền qua lần tắt app, dịch nhiều chương hoặc resume operation đang chạy; operation đang chạy khi app đóng được đánh dấu `interrupted`.
- Không mở source, export, xóa resource hoặc thao tác hàng loạt cho model; registry chỉ có capability được liệt kê và test.
- Không xóa bảng proposal/session cũ khỏi DB tác phẩm trong migration này.
- Không cam kết số token khi provider không báo và không đối soát hóa đơn provider.

## Decisions

### D0. `app-agent-foundation` thay thế change `agentic-chat` đang mở

Trước khi sửa code, duy trì viên SHALL rút `agentic-chat` khỏi tập change đang hoạt động: chuyển các quyết định và bằng chứng triển khai còn giá trị vào module docs, giữ bản artifact cũ như lịch sử được gắn nhãn “superseded”, rồi bỏ thư mục đó khỏi `openspec/changes`. Không chạy `openspec archive` và không merge delta của change cũ vào main specs vì checklist cũ chưa hoàn tất. `app-agent-foundation` là change duy nhất định nghĩa contract đích; code proposal hiện có chỉ là baseline cần migrate.

Lý do: nếu hai change cùng active hoặc được archive theo thứ tự bất kỳ, delta proposal-only của `agentic-chat` có thể ghi đè contract direct-apply của foundation. “Superseded” là rút một kế hoạch chưa nghiệm thu, không phải tuyên bố nó đã hoàn tất.

### D1. Agent orchestration thuộc main process

Tạo `AgentService` và `AgentOperationRunner` trong `src/main/services/agent/`. Renderer chỉ gửi instruction + context và nhận stream typed; nó không tự mở work DB, tự resolve target hay điều phối lô dịch.

Lý do: operation phải tiếp tục khi người dùng đổi màn/tác phẩm, target không được trôi theo React state, và quyền ghi không được nằm ở renderer. Runner foreground của foundation sống tới khi app đóng; lần khởi động sau chuyển `queued`/`running` còn sót thành `interrupted`.

Phương án loại: tiếp tục vòng lô trong `AiTranslateDialog`. Cách đó buộc operation vào component đang mount và không thể làm agent cross-work đáng tin cậy.

Renderer có module công khai mới `src/renderer/src/modules/agent/`, do composition root cấp ứng dụng mount để panel tồn tại ngoài `ChapterWorkspace`. Workspace và các màn khác chỉ cung cấp `AgentContext` qua adapter/public API; chúng không sở hữu session hoặc runner. Các component assistant legacy được chuyển vào module này hoặc nằm sau adapter tương thích. `ARCHITECTURE.md` phải đổi ownership cùng commit tạo module, không để tới bước tài liệu cuối.

### D2. Session/turn/operation mới lưu trong `library.db`

Thêm migration sau library schema v8 với các bảng khái niệm:

- `agent_session(id, title, created_at, updated_at)`;
- `agent_turn(id, session_id, instruction, answer, reasoning, context_json, status, usage_json, cost_usd, created_at, updated_at)`;
- `agent_operation(id, turn_id, command_id UNIQUE, capability, target_json, state, progress_json, model_ref_json, usage_json, result_json, error_json, created_at, updated_at)`; `id` là `operationId` bền dùng xuyên hai DB, còn `command_id` chỉ dedupe request tạo operation;
- `agent_activity(id, turn_id, operation_id NULL, step_seq, kind, state, label, detail_json, created_at, updated_at)` với unique `(turn_id, step_seq)`; update progress giữ nguyên `id`/`step_seq`;
- `agent_legacy_import(work_id, legacy_session_id, agent_session_id, imported_at)` để import session idempotent;
- `agent_legacy_turn_import(work_id, legacy_session_id, legacy_turn_id, agent_turn_id, imported_at)` để route lượt và proposal legacy về DB gốc.

`target_json` lưu ID và nhãn chụp tại lúc resolve. Không tạo foreign key cross-file tới work/chapter. Mọi lần dùng target phải mở đúng work DB và xác minh ID còn tồn tại.

Lý do: session có thể tham chiếu nhiều DB tác phẩm; đặt nó trong một work DB sẽ tái tạo chính ràng buộc cần bỏ. `library.db` đã là owner của dữ liệu ứng dụng khác.

Hệ quả: `library.db` không còn là cache có thể xóa. Trước migration, app tạo bản sao lưu cục bộ nguyên file trong cùng profile bằng SQLite backup API và giữ credential ở dạng mã hóa hiện có; đây là recovery nội bộ, không phải định dạng export người dùng. Nếu file hiện hữu không mở được, app thử bản backup mới nhất hoặc dừng với luồng recovery rõ ràng, không đổi tên rồi âm thầm tạo DB trắng. Reconcile chỉ dựng lại `work_index`, không được xóa bảng agent. Export/merge history giữa profile nằm ngoài change này.

### D3. Phiên cũ được import lười, không di chuyển phá hủy

Danh sách lịch sử có một adapter đọc phiên cũ từ work DB. Khi người dùng tiếp tục một phiên cũ, main tạo session toàn ứng dụng, copy immutable các lượt cũ với `legacyRef = { workId, sessionId, turnId }`, ghi mapping session và từng turn, rồi thêm lượt mới. API lịch sử dùng `legacyRef` để đọc/Accept/Deny proposal trong work DB gốc và trả kết quả vào cùng item; không copy proposal sang `library.db` và không xóa session cũ.

Import cùng mapping phải idempotent. Nếu work file không còn, session đã import vẫn đọc được từ bản copy; link mở resource báo resource không còn.

Phương án loại: eager scan/copy mọi work khi nâng cấp. Nó làm startup phụ thuộc số lượng/kích thước work và biến migration library DB thành transaction cross-file không thể rollback nguyên tử.

### D4. Context và target là hai contract khác nhau

`AgentSendInput` chứa:

- `sessionId?`, instruction và model selection;
- `context`: `workId?`, `chapterId?`, caret và selection.

Model không được tự quyết ID ghi từ chuỗi arguments. Resolver main cung cấp capability đọc danh mục và tạo `ResolvedTarget` từ các candidate. Thứ tự resolve:

1. resource được người dùng nêu rõ;
2. chapter được nêu + work trong context;
3. từ chỉ định tương đối + context;
4. không đúng một candidate → trả clarify state, không tạo operation ghi.

Sau khi tạo operation, target bất biến. Retry dùng `operation.target`, không gọi resolver lại.

### D5. Registry capability typed, không có primitive tổng quát

Tạo registry khai báo cho mỗi capability:

- schema arguments;
- loại `read | reversible-write | destructive | external`;
- hàm resolve/authorize target;
- budget;
- handler;
- cách chuyển event domain thành activity.

Foundation đăng ký tối thiểu: `list_works`, `list_chapters`, `read_chapter`, `read_segments`, `search_work`, `list_glossary`, `list_addressing`, `translate_chapter`, `edit_translation`, `undo_operation` và navigation result. Không đăng ký SQL, shell, arbitrary file write hay generic IPC.

Arguments từ model chỉ chứa selector người dùng hiểu (tên/số chương, khoảng đoạn, instruction). Riêng `edit_translation` nhận thêm replacement text do chính lời gọi model điều phối tạo, sau khi đã đọc target; schema giới hạn số đoạn/ký tự, từ chối rỗng/trùng và không nhận work/chapter ID. Handler nhận target ID từ resolver bằng kênh nội bộ và command ID từ operation. Provenance/usage của replacement là provenance/usage của lời gọi model đã tạo tool call; handler không gọi provider ẩn lần hai.

### D6. Dịch chương là operation main-owned dùng pipeline hiện có

`translate_chapter` chụp model entry đang chọn ở composer và settings key khi bắt đầu. Adapter gọi logic plan/batch/finalize hiện có nhưng chuyển vòng lô khỏi renderer vào runner main. Context snapshot, batch planning, refusal handling, fallback và usage giữ cùng semantics hiện hành.

Mỗi operation có checkpoint toàn chương trong work DB trước lần ghi đầu, keyed bởi `operation.id`, bắt đầu ở `prepared` với `beforeRev`/`beforeContent`; `lastAppliedRev` lúc này là `NULL`. Các lô có thể ghi dần để không mất phần thành công. Mỗi batch write áp dụng toàn bộ hàng an toàn và ghi journal batch trong cùng một transaction work DB; vì vậy adapter phải thay đường `saveRow()` transaction riêng bằng API domain batch nguyên tử. Sau commit, checkpoint cập nhật `lastAppliedRev` và số đoạn đã hoàn tất. Kết quả dài không đi vào `agent_turn.answer`; answer chỉ là tóm tắt.

Protected row không bị ghi đè. Output AI tương ứng bị bỏ, không biến thành pending proposal. Nếu còn hàng an toàn, operation áp dụng chúng và kết thúc `partially_completed` với số hàng được giữ; nếu không có hàng nào an toàn, operation kết thúc `conflict` mà không tạo checkpoint đã áp dụng.

Trước batch đầu, runner phát `target-write-intent` qua coordinator app-level. Editor khớp target chặn input mới ngay, flush dirty state rồi ack revision; nếu không có editor khớp, coordinator ack `not-open` ngay. Timeout, flush lỗi hoặc revision đổi đều fail closed trước khi ghi. Sau ack, main giữ write lease keyed `(workId, chapterId, side)` để cả editor save và agent write đi qua cùng guard. Renderer khóa riêng editor target và hiển thị lý do. Khi operation terminal, main phát `target-changed` với `lastAppliedRev`; renderer dùng `applyTarget`/reload một lần rồi nhả khóa. Không reload sau từng batch và không coi UI read-only là thay thế revision check trong main.

Luồng proposal `policy: auto` có thể được tái sử dụng như implementation detail, nhưng record nội bộ của operation không xuất hiện trong pending queue. Nếu auto-apply không thể đặt an toàn, runner chuyển operation sang `conflict`, đóng record nội bộ và không tạo proposal người dùng phải Accept.

Phương án loại: để model chat đọc cả chương và truyền bản dịch qua tool arguments. Cách đó làm phình transcript/context, bỏ qua batch/retry/context snapshot và dễ ghi thiếu.

### D7. Ghi chéo hai DB dùng journal, không giả transaction nguyên tử

SQLite không cung cấp transaction nguyên tử đáng tin cậy giữa `library.db` và work DB trong kiến trúc hiện tại. Trình tự operation ghi:

1. insert operation `queued` trong library DB;
2. đổi `running` và ghi target/model snapshot;
3. trong work DB, tạo checkpoint `prepared` idempotent theo `operation_id`;
4. với mỗi lô, một transaction vừa ghi toàn bộ thay đổi domain vừa insert `agent_operation_batch(operation_id, batch_key, expected_rev, after_rev, applied_units, checksum)` và cập nhật checkpoint;
5. cập nhật progress/final result trong library DB.

`operationId` là UUID chính của hàng `agent_operation` và là khóa tương quan trong checkpoint/journal work DB. `commandId` là idempotency key riêng của request tạo operation và không xuất hiện trong batch journal. Unique `(operation_id, batch_key)` chống chạy lại một batch. Checkpoint đơn độc chỉ chứng minh operation đã chuẩn bị; chỉ batch journal đã commit mới chứng minh dữ liệu đã áp dụng. Nếu app chết sau bước 4 trước bước 5, startup reconciler đọc các batch journal, `lastAppliedRev` và terminal marker trong target work DB để sửa operation thành `completed`, `partially_completed`, `cancelled` có thay đổi hoặc `interrupted`; không chạy lại batch đã commit. Nếu work DB không mở được, operation thành `interrupted` với target giữ nguyên.

### D8. Turn, operation và activity có state machine riêng

| Entity | Chuyển trạng thái hợp lệ |
| --- | --- |
| Turn | `queued → running → completed | waiting_user | failed | cancelled | interrupted`; `waiting_user → running` khi người dùng làm rõ |
| Operation | `queued → running → completed | partially_completed | conflict | failed | cancelled | interrupted`; `completed | partially_completed | cancelled` có thay đổi `→ undone` |
| Activity | `pending → running → completed | failed | cancelled` |

`conflict`, `failed`, `interrupted` và `cancelled` không có thay đổi là terminal. Reconciler chỉ được chuyển `queued`/`running` sang trạng thái terminal dựa trên journal; không được chuyển ngược. Stream terminal `done` có thể mang turn `completed` hoặc `waiting_user`; lỗi giao thức/runtime dùng `error` và turn `failed`.

Mỗi session chỉ có một turn ở `queued` hoặc `running`; repository/service enforce bằng transaction hoặc partial unique invariant thay vì chỉ dựa vào nút disabled. Composer được giữ draft trong khi chạy nhưng chỉ hiện Dừng. `waiting_user` nhường quyền gửi và câu làm rõ tiếp tục chính turn đó từ `waiting_user → running`.

### D9. Undo ở cấp operation và từ chối khi có sửa mới

Checkpoint operation lưu toàn bộ target content trước run và revision sau cùng do operation ghi. `undo_operation` chỉ chạy khi revision hiện tại bằng `lastAppliedRev`; nó khôi phục `beforeContent` trong một transaction và đánh dấu checkpoint/operation `undone`. Nếu revision khác, trả conflict để không xóa sửa đổi sau đó.

Với operation bị hủy sau vài lô, checkpoint vẫn là trạng thái trước run nên một lần Undo khôi phục toàn bộ phần đã ghi. Foundation không hỗ trợ undo chọn từng lô.

### D10. Stream protocol là event có định danh, activity được cập nhật thay vì nối dòng

Mở rộng stream thành các event:

- `reasoning-delta` và `answer-delta`;
- `activity-start`, `activity-update`, `activity-finish` với `activityId` và `stepSeq` bất biến;
- `operation` snapshot/progress;
- `usage` chỉ ở terminal event;
- đúng một `done` hoặc `error` cho mỗi turn.

Mọi event của request/turn có `eventSeq` tăng đơn điệu, tách khỏi `stepSeq`. Renderer giữ `lastEventSeq` để bỏ event trùng/out-of-order; repository chỉ persist một activity cho mỗi `(turnId, stepSeq)` và update cùng hàng khi progress đổi.

Main persist reasoning/answer theo nhịp hiện có nhưng persist activity theo chuyển trạng thái hoặc progress đã throttle, không theo token. Renderer buffer delta theo request và flush tối đa một lần mỗi animation frame (có thể chọn 30–50 ms nếu profiling tốt hơn). `SafeMarkdown` tách block ổn định khỏi tail đang stream và dùng key ổn định, không dùng index toàn answer làm identity.

Auto-scroll dùng sentinel: chỉ bám đáy khi sentinel đang trong ngưỡng; cuộn tay lên tắt follow và hiện nút về nội dung mới.

### D11. Thinking chỉ hiển thị dữ liệu provider gửi

Reasoning stream được coi là nội dung provider cung cấp, không phải activity do Mira tự viết. Khi chưa có reasoning/tool/answer, UI chỉ hiện trạng thái trung tính “Đang xử lý”. Khi provider có reasoning, preview tối đa theo chiều cao token UI, mở toàn bộ bằng `Disclosure`; answer/operation bắt đầu thì tự thu nếu người dùng chưa tự chọn trạng thái.

Không tạo câu “AI đang nghĩ rằng…” từ heuristic. Thời lượng lấy từ timestamp đầu/cuối reasoning, thiếu thì chỉ hiện “Đã suy nghĩ”.

### D12. Usage giữ provenance và completeness

Mở rộng shared `TokenUsage`:

```ts
interface TokenUsage {
  inputTokens: number // tổng input provider báo
  uncachedInputTokens?: number
  outputTokens: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  source: 'provider'
  complete: boolean
}
```

`inputTokens` wire là tổng input. `uncachedInputTokens`, `cacheReadTokens` và `cacheWriteTokens` là breakdown khi provider cho phép xác định; chúng không được cộng thêm vào `inputTokens` ở tổng UI. `reasoningTokens` là subset của output. Aggregator cộng mọi call có usage; nếu bất kỳ call thực sự chạy mà không báo usage thì `complete = false`. Với fallback, usage trước và sau fallback cùng được cộng nếu provider báo.

`costOfUsage` tiếp tục dùng usage thật và catalog, nhưng DTO/UI đặt nhãn “ước tính theo bảng giá”. `estimateCost` có thể còn tồn tại nội bộ cho batch planning hoặc Lab, nhưng không nằm trong plan DTO hiển thị sản phẩm và không điền vào usage.

### D13. UX proposal mới bị ẩn, lịch sử cũ vẫn render

Lượt `agent` mới render activity/operation và không render `ProposalCard`. Lượt legacy tiếp tục dùng renderer tương thích để hiển thị mode/proposal cũ và cho xử lý pending cũ. Queue proposal vẫn tồn tại cho dữ liệu cũ và các luồng chưa chuyển; change này không xóa schema hoặc hàng cũ.

Proposal legacy được route bằng `legacyRef` về work DB gốc. Change `agentic-chat` phải được rút theo D0 trước implementation, không chờ tới lúc foundation hoàn tất và không được archive bằng cách đánh dấu giả.

## Risks / Trade-offs

- **[Session mới làm `library.db` trở thành dữ liệu không thể dựng lại hoàn toàn]** → backup cục bộ trước migration, không silent recreation và test rằng reconcile chỉ thay `work_index`, không xóa bảng agent.
- **[Crash giữa commit work DB và update operation]** → operation ID + batch journal trong work DB là bằng chứng; checkpoint `prepared` không bị hiểu nhầm là đã áp dụng.
- **[Model chọn nhầm tác phẩm/chương]** → resolver deterministic, target snapshot hiện trong activity, ambiguity chặn ghi và args model không mang quyền ID độc lập.
- **[Auto-apply làm mất chỉnh sửa người dùng]** → expected revision từng lô, protected-row semantics hiện có, checkpoint toàn operation và undo yêu cầu revision chính xác.
- **[Editor đang mở giữ revision cũ khi main ghi]** → write intent, flush dirty state, lease ở main và một lần target-changed/applyTarget khi operation terminal.
- **[Hai turn cùng session tranh chấp target]** → service/repository giới hạn một turn active mỗi session; renderer chỉ hiện Dừng trong khi chạy.
- **[Operation cross-work giữ nhiều DB mở]** → foundation chỉ chạy một target work cho mỗi write operation; capability so sánh mở tuần tự và giới hạn dữ liệu trả về.
- **[Delta buffer làm tăng độ trễ cảm nhận]** → trần flush thấp, đo render commit; terminal event flush ngay phần còn lại.
- **[Usage tổng không đầy đủ bị hiểu là chính xác]** → trường `complete`, nhãn rõ và không thay call thiếu usage bằng 0.
- **[Hai change OpenSpec mô tả hành vi ngược nhau]** → rút change cũ theo D0 trước khi sửa code; không archive hoặc merge delta chưa hoàn tất.

## Migration Plan

1. Rút `agentic-chat` khỏi active changes theo D0 và cập nhật ownership agent trong `ARCHITECTURE.md`.
2. Thêm schema/library storage và repository test; cập nhật local migration backup/recovery/reconcile trước khi ghi session mới.
3. Thêm contract agent và adapter đọc legacy với mapping từng turn, chưa chuyển renderer; test import và route proposal idempotent.
4. Thêm resolver, registry và read capability với fake work library; chưa cấp write.
5. Thêm batch journal/checkpoint/reconciler và `translate_chapter` trên fixture; kiểm crash points bằng test chủ động ném lỗi giữa các bước.
6. Chuyển panel sang module agent cấp ứng dụng và stream protocol mới; giữ renderer legacy cho lượt cũ.
7. Bật direct apply + undo, ẩn proposal với lượt mới và bỏ estimate/hard-code token khỏi UI sản phẩm.
8. Chạy fixture end-to-end và model thật cho các câu: hỏi đoạn hiện tại, dịch chương khác cùng work, dịch chương thuộc work khác, target mơ hồ, hủy giữa run, undo, provider không báo usage.
9. Cập nhật tài liệu module và chỉ mở gate khi không còn change active mô tả proposal-only cho lượt mới.

Rollback code phải giữ khả năng đọc library schema mới nhưng có thể tắt tạo lượt agent mới bằng feature gate. Không hạ `user_version` và không xóa bảng agent. Bản phát hành rollback chính thức phải dùng build có reader tương thích hoặc phục hồi bản backup cục bộ trước migration; không dùng export work để thay thế recovery này.
