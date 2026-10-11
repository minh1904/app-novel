> **Ghi chú trạng thái 2026-10-11:** `[x]` ghi lại công việc được báo cáo khi xây foundation; không phải
> bằng chứng rằng đường chạy runtime hiện tại đã đạt. Gate triển khai hiện hành nằm ở
> [`agent-roadmap.md`](../../../docs/modules/proposals/agent-roadmap.md).

## 0. Rút change bị thay thế

- [x] 0.1 Theo D0, chuyển quyết định còn giá trị sang foundation, xóa `agentic-chat` khỏi tập change active mà không merge delta chưa hoàn tất; lịch sử Git giữ artifact cũ.

## 1. Baseline và contract

- [x] 1.1 Chụp baseline bằng `node scripts/check.mjs` và lưu các lỗi có sẵn liên quan agent/translation để phân biệt regression; kiểm bằng output từng bước có bằng chứng đã chạy.
- [x] 1.2 Thêm contract `AgentContext`, `ResolvedTarget`, `AgentOperation`, `AgentActivity`, `stepSeq`, `eventSeq`, progress, state machine D8 và stream event vào `src/shared/contracts`; kiểm bằng test Valibot cho context có/không có work, target hợp lệ, target mơ hồ không đi qua, sequence hợp lệ, mọi transition hợp lệ/bị cấm và event terminal duy nhất.
- [x] 1.3 Mở rộng `TokenUsage` với `inputTokens` tổng, `uncachedInputTokens`, cache read/write, reasoning, `source: 'provider'` và `complete`; cập nhật mọi consumer mà không dùng giá trị mặc định 0 cho trường thiếu; kiểm bằng typecheck node/web và test normalize/aggregate/cost không đếm cache hoặc reasoning hai lần.
- [x] 1.4 Thêm kênh IPC và typed preload API cho session, send/cancel, stream activity, target write-intent/ack/changed, operation detail và undo; kiểm bằng contract test rằng renderer không nhận API SQL/file/IPC tổng quát.

## 2. Lưu trữ session toàn ứng dụng

- [x] 2.1 Thêm migration `library.db` cho `agent_session`, `agent_turn`, `agent_operation`, `agent_activity`, `agent_legacy_import` và `agent_legacy_turn_import` theo D2; kiểm bằng schema snapshot, migrate từ v8 có dữ liệu connection/source và test constraint/index/idempotency.
- [x] 2.2 Viết repository session/turn/operation/activity trong main với command ID duy nhất, một turn active mỗi session, `stepSeq` bất biến và update trạng thái hợp lệ; kiểm bằng unit test create/read/list, hai create đồng thời, retry cùng command, update nhiều lần cùng activity và từ chối transition ngược.
- [x] 2.3 Sửa lifecycle `library.db`: backup cục bộ bằng SQLite backup API trước migration, ghi qua file tạm rồi chỉ publish backup sau khi mở/kiểm tra được; reconcile chỉ dựng lại `work_index`, file hỏng phải restore backup hoặc hiện lỗi recovery thay vì silent recreation; kiểm bằng test mất projection, migration failure, dừng giữa backup, backup tạm hỏng, DB corrupt có/không có backup và giữ nguyên agent/connection/source rows.
- [x] 2.4 Thêm adapter liệt kê/import lười session cũ, copy `legacyRef`, map từng turn và route đọc/Accept/Deny proposal về work DB gốc; kiểm bằng fixture hai work rằng import hai lần không nhân bản session/turn/proposal và thao tác chỉ đổi proposal gốc.
- [x] 2.5 Khi khởi động, reconcile operation `queued`/`running` từ batch journal work DB, không từ checkpoint `prepared` đơn độc; kiểm bằng test crash trước batch, sau từng batch commit, sau terminal marker và trước update library DB.

## 3. Resolver và registry capability

- [x] 3.1 Tạo module `src/main/services/agent/` theo boundary trong `ARCHITECTURE.md`, gồm resolver, registry, service và runner interface; cập nhật architecture rule trong cùng task để renderer/preload không import implementation main; kiểm bằng checker boundary và typecheck.
- [x] 3.2 Implement resolver deterministic cho work/chapter theo selector rõ, context mặc định và candidate mơ hồ; kiểm bằng test “chương này”, chương khác cùng work, work khác, tên trùng, resource bị xóa và retry không resolve lại.
- [x] 3.3 Tạo registry typed với loại quyền, schema args, budget, target policy, handler và activity adapter; kiểm bằng test tool không đăng ký, args hỏng và primitive SQL/shell/file/IPC đều không có đường gọi.
- [x] 3.4 Chuyển các capability đọc hiện có (`list_works`, `list_chapters`, `read_chapter`, `read_segments`, `search_work`, glossary, addressing) sang target đã resolve; kiểm bằng test đọc cross-work không đổi revision và kết quả/activity luôn ghi đúng target.
- [x] 3.5 Áp trần vòng model, dữ liệu đọc, operation ghi và budget capability; vòng cuối không mời capability; kiểm bằng test hết từng budget vẫn sinh terminal event duy nhất và không ghi thêm.

## 4. Operation ghi, dịch chương và undo

- [x] 4.1 Thêm `agent_operation_checkpoint` (`operation_id`, `prepared`, before revision/content, nullable last applied revision, counters, terminal marker) và `agent_operation_batch(operation_id, batch_key, ...)` trong work DB; giữ `command_id` chỉ ở library DB để dedupe tạo operation; kiểm migration, unique idempotency và checkpoint mới không giả có final revision.
- [x] 4.2 Thêm write lease keyed `(workId, chapterId, side)` và API domain ghi cả batch + journal + checkpoint trong một work DB transaction, thay đường `saveRow()` transaction từng hàng cho operation agent; mọi editor save cũng kiểm lease/revision; implement reconciler D7 và fault test để không có hàng nửa lô hoặc ghi hai lần.
- [x] 4.3 Chuyển vòng plan/batch/finalize dịch chương vào adapter main-owned dùng pipeline hiện có và model/settings snapshot của lượt; kiểm bằng fake provider rằng context, batch, fallback/refusal, expected revision giữ semantics cũ, còn protected row bị giữ, output AI bị bỏ và state là `partially_completed`/`conflict` theo D6.
- [x] 4.4 Implement `translate_chapter` cho chapter khác context và work khác, stream progress theo lô/đoạn, không đưa bản dịch vào answer; kiểm end-to-end với hai work rằng chỉ target thay đổi và transcript không chứa toàn bộ target content.
- [x] 4.5 Implement `edit_translation` chỉ sau read target, nhận replacement từ tool call với trần đoạn/ký tự, base/revision và provenance model của lượt; kiểm apply thành công, rỗng/trùng/quá lớn, range lỗi, target đổi, command retry và không có provider call ẩn.
- [x] 4.6 Ẩn record proposal nội bộ của operation mới khỏi pending queue; chuyển auto-apply không an toàn sang `conflict`, protected rows có phần ghi sang `partially_completed`; kiểm queue không tăng sau success/partial/conflict và proposal legacy vẫn hiện.
- [x] 4.7 Implement cancel: abort request đang chạy, giữ lô đã commit, lưu progress thực và cung cấp undo toàn run; kiểm bằng fake provider bị giữ giữa lô và assert số đoạn đã ghi đúng.
- [x] 4.8 Implement `undo_operation` chỉ khi revision hiện tại bằng `lastAppliedRev` của checkpoint; kiểm bằng test undo thành công, retry idempotent, operation bị hủy giữa run và từ chối khi có sửa mới.

## 5. Agent service và stream protocol

- [x] 5.1 Implement `AgentService` tạo/tiếp tục session, enforce một turn active mỗi session, chụp context, chạy vòng model-capability, cộng answer/reasoning và bảo đảm đúng một `done` hoặc `error`; kiểm hai send đồng thời trả `turn_in_progress`, clarify-resume cùng turn, cancel có/không có thay đổi, fallback, tool loop, crash reconcile và window đóng.
- [x] 5.2 Implement phân loại hành vi bằng capability/prompt: câu hỏi không ghi, lệnh rõ tạo operation, yêu cầu mơ hồ trả trạng thái cần làm rõ; kiểm bằng fake model cho ba scenario trong `app-agent-actions` mà không dựa vào model live.
- [x] 5.3 Thêm `activity-start/update/finish` có `activityId`/`stepSeq` bất biến, `eventSeq` tăng đơn điệu và operation snapshot; throttle persistence nhưng flush terminal state; kiểm bảy lô update một DB activity, event trùng/out-of-order bị bỏ và lịch sử restore đúng thứ tự.
- [x] 5.4 Cộng usage mọi vòng tool/lô/retry/fallback, đặt `complete=false` nếu một call không báo và giữ cache/reasoning không đếm đôi; kiểm bằng unit test mixed providers và integration fake stream.
- [x] 5.5 Tính chi phí chỉ từ usage provider + catalog, lưu nhãn semantics “ước tính theo bảng giá”, giữ `null` khi thiếu usage/giá; kiểm bằng test không trả 0 cho dữ liệu thiếu.

## 6. Renderer agent toàn ứng dụng

- [x] 6.1 Tạo public module `src/renderer/src/modules/agent/`, chuyển panel/store/session controller khỏi ownership workspace và mount từ app composition root để dùng được ở màn không có work; mỗi send chụp context qua adapter còn target lấy từ event main; cập nhật `ARCHITECTURE.md` cùng task và kiểm bằng boundary/store test đổi A → B, màn Home không context và target cũ không đổi.
- [x] 6.2 Nối write-intent/ack/target-changed vào workspace adapter: flush dirty target trước ack, khóa đúng target editor trong operation, chặn autosave cạnh tranh và gọi `applyTarget`/reload một lần ở terminal revision; kiểm dirty flush thành công/thất bại, rời workspace giữa run, editor khác không bị khóa và không reload từng batch.
- [x] 6.3 Thay tool summary bằng activity timeline có trạng thái, target, progress, expand/collapse và lỗi; kiểm bằng component test cho read, translate 1/7→7/7, conflict, cancel và restore history.
- [x] 6.4 Làm thinking preview tối đa 2–3 dòng, tự thu khi answer/operation bắt đầu nếu người dùng chưa mở, và không tạo thinking giả; kiểm bằng component test có/không có reasoning và duration thiếu.
- [x] 6.5 Buffer delta theo animation frame hoặc ngưỡng 30–50 ms, giữ key ổn định cho Markdown block hoàn tất và render tail fence an toàn; kiểm bằng test stream hàng trăm delta có số commit bị chặn và snapshot nội dung cuối chính xác.
- [x] 6.6 Thêm auto-scroll sentinel: chỉ follow khi gần đáy, dừng khi người dùng cuộn lên và có nút về nội dung mới; kiểm bằng DOM test cho hai trạng thái và reduced motion.
- [x] 6.7 Với operation dài, chỉ hiện target/progress/result cùng Mở đích, Dừng, Hoàn tác, Xem chi tiết; không render nội dung đã ghi; kiểm bằng component/integration test bản dịch dài không xuất hiện trong transcript.
- [x] 6.8 Giữ renderer legacy cho lượt/proposal cũ, dùng `legacyRef` để đọc và Accept/Deny tại work DB gốc, nhưng lượt mới không render `ProposalCard`; kiểm bằng session trộn legacy + agent và work gốc đã bị xóa.

## 7. Usage thật và dọn UI ước lượng

- [x] 7.1 Hiện usage provider sau terminal event, chi tiết cache/reasoning và trạng thái tổng chưa đầy đủ; khi không có usage hiện `—`/thông báo provider không báo; kiểm bằng component test đủ, thiếu một call và null.
- [x] 7.2 Bỏ `TranslateEstimate` khỏi DTO sản phẩm và bỏ “Token/Chi phí ước lượng” trước chạy trong `AiTranslateDialog`; giữ estimate nội bộ nếu planner cần nhưng không nối vào usage/UI; kiểm bằng typecheck và test dialog chỉ hiện số đoạn/lô.
- [x] 7.3 Xóa token/chi phí hard-code khỏi `HomeScreen` và `JobsScreenMock`, hoặc thay bằng dữ liệu thật/empty state rõ là demo không vào product; kiểm bằng search không còn các chuỗi mock `3,9 triệu token`, `412k`, `1,9 tr`, `96k`, `~$0,02` trong màn sản phẩm.
- [x] 7.4 Bỏ token counter live suy đoán; usage chỉ xuất hiện khi provider gửi terminal usage; kiểm bằng stream test rằng trước `done` không có số token và sau `done` hiện đúng provider payload.

## 8. Tích hợp, tài liệu và gate

- [x] 8.1 Tạo fixture end-to-end hai tác phẩm và fake provider để chạy: hỏi đoạn hiện tại, dịch chương khác cùng work, dịch chapter ở work khác, target mơ hồ, hủy giữa run, undo, revision conflict và provider không báo usage; kiểm toàn bộ scenario bằng test tự động.
- [x] 8.2 Chạy app với fixture và kiểm bằng UI thật: đổi work không đổi session, progress không giật, cuộn lên không bị kéo xuống, Mở đích đúng chapter, Undo khôi phục nội dung; lưu kết quả nghiệm thu trong `docs/modules/proposals/` bằng tiếng Việt.
- [x] 8.3 Cập nhật `docs/modules/proposals/{README,decisions,sessions-and-jobs}.md` và module AI connections/workspace; xác nhận `ARCHITECTURE.md` đã phản ánh module agent/app composition từ task 6.1, phân biệt hành vi đã triển khai với tác vụ nhiều chương còn đề xuất; kiểm stale scan cho “phiên theo tác phẩm”, “chỉ chương đang mở”, “luôn duyệt trước” và token ước lượng.
- [x] 8.4 Kiểm lifecycle D0: `agentic-chat` không nằm trong active/archived OpenSpec như change đã hoàn tất và không còn delta proposal-only cạnh tranh; dùng lịch sử Git khi cần tra cứu.
- [x] 8.5 Chạy `openspec validate app-agent-foundation --strict`, `node scripts/check.mjs` và `node scripts/check.mjs --build`; mọi bước phải có output thành công trước khi đánh dấu change hoàn tất.
