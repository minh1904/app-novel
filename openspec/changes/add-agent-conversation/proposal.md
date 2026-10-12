## Why

Sau `repair-agent-runtime`, runtime agent ghi thật và Undo được, nhưng vẫn chọn hành động bằng regex, chỉ
biết dịch một chương, không lưu tool round, và turn chết theo cửa sổ đã gửi lệnh. Người dùng cần chat tự
nhiên trên toàn ứng dụng, nơi model chọn capability nhưng target, quyền và budget luôn do code Mira quyết định.

## What Changes

- Thay regex bằng vòng model → tool → kết quả → model trên `provider.chat` có sẵn; tool definitions viết tay,
  không thêm dependency; không fallback model tự động.
- Migration library v11: bảng `agent_tool_call` lưu từng call, quyết định policy và kết quả trước/sau side
  effect; `agent_turn` có trạng thái `expired`; một session chỉ có một turn `queued | running | waiting_user`.
- Target chỉ qua handle theo turn do `resolve_target` hoặc context snapshot cấp; policy là bảng trong code.
- Budget 6 vòng model với vòng cuối không tool; loop detector theo `(tool, tham số chuẩn hóa)` lặp 3 lần.
- `waiting_user → running | cancelled | expired`; continuation qua `continuesTurnId` ràng buộc ID + digest của
  call đang chờ; lệnh mới làm turn đang chờ hết hạn.
- Turn thuộc Main: đóng cửa sổ không hủy turn; event tới mọi cửa sổ; snapshot có activity, operation và
  pending action; renderer upsert theo ID + `updatedAt`.
- Màn Trợ lý (Chat mới, lịch sử, transcript, composer, activity, Mở đích) và shell side panel
  `Trợ lý | Ngữ cảnh` trong màn chương dùng chung store; draft theo session.

## Capabilities

### New Capabilities

- `agent-conversation`: chat toàn ứng dụng, vòng model–tool bền, target handle, policy, budget/loop,
  continuation, phân phối event và UI chat.

### Modified Capabilities

- `agent-runtime-integration` (thêm bởi `repair-agent-runtime`, chưa archive): một turn active tính cả
  `waiting_user`, lệnh mới làm turn đang chờ `expired`; vòng đời turn thuộc Main, đóng cửa sổ không hủy turn.

`ai-chat-tools` không đổi; spec đó vẫn mô tả chat legacy theo tác phẩm.

## Impact

- Phụ thuộc: archive `repair-agent-runtime` trước khi apply.
- Main: `librarySchema.ts` (v11), `migrate.ts` (cờ `foreignKeysOff`), `agentRepository.ts`,
  `agentService.ts`, `registry.ts`, capability đọc/ghi, `writeCoordinator.ts`, `ipc/handlers/agent.ts`.
- Shared/preload: `contracts/agent.ts` (state, `AgentSendInput`, snapshot), `desktopApi.ts`, preload.
- Renderer: module `agent` (store, panel, màn Trợ lý), `app/screens`, shell side panel của workspace.
- Test: fixture `library-v11.schema.sql`, backup trước migration, model giả cho vòng tool, policy, loop,
  continuation, nhiều cửa sổ, accessibility.
