## Context

Change này nối tiếp `repair-agent-runtime` (đã xong mọi task, chưa archive). Hiện trạng ở HEAD `e6090be`:

- `AgentService` chọn hành động bằng regex
  ([agentService.ts#L351-L355](../../../src/main/services/agent/agentService.ts#L351-L355)) và chỉ biết
  `translate_chapter`. Registry đã có capability đọc/ghi và `resolveTarget` xác định, nhưng `list_works`
  trả ID thô và `list_chapters` nhận `workId` thô từ model
  ([readCapabilities.ts#L5-L45](../../../src/main/services/agent/capabilities/readCapabilities.ts#L5-L45)).
- `agent_turn` chỉ lưu `instruction`, `answer`, `context_json`
  ([librarySchema.ts#L251-L265](../../../src/main/infra/storage/librarySchema.ts#L251-L265)); không có chỗ
  lưu tool round hay pending action. Index một-turn-active bỏ qua `waiting_user`
  ([librarySchema.ts#L267-L268](../../../src/main/infra/storage/librarySchema.ts#L267-L268)), và CHECK của
  `status` chưa có `expired`.
- `waiting_user` chỉ có lối ra `running`
  ([agent.ts#L103-L111](../../../src/shared/contracts/agent.ts#L103-L111)); Stop không làm gì với turn đang
  chờ ([agentService.ts#L150-L161](../../../src/main/services/agent/agentService.ts#L150-L161)); lệnh mới
  được chạy lại trên turn cũ với instruction mới
  ([agentService.ts#L277-L280](../../../src/main/services/agent/agentService.ts#L277-L280)).
- IPC hủy turn khi cửa sổ gửi lệnh bị hủy và chỉ gửi event về cửa sổ đó
  ([handlers/agent.ts#L78-L97](../../../src/main/ipc/handlers/agent.ts#L78-L97)); `eventSeq` là biến cục
  bộ của mỗi lần chạy ([agentService.ts#L293](../../../src/main/services/agent/agentService.ts#L293));
  snapshot session chỉ có `session` và `turns`
  ([agent.ts#L254-L257](../../../src/shared/contracts/agent.ts#L254-L257)).
- `TurnBudgetTracker.recordModelRound()` đã trả `isFinalRound`
  ([registry.ts#L23-L37](../../../src/main/services/agent/registry.ts#L23-L37)) nhưng chỉ test dùng.
- Context snapshot đã được lưu khi accept
  ([agentService.ts#L228-L244](../../../src/main/services/agent/agentService.ts#L228-L244)).
- Chat legacy đã có vòng model–tool trên `provider.chat(messages, { tools })`
  ([chatService.ts#L238-L252](../../../src/main/services/ai/chatService.ts#L238-L252)), sáu vòng có tool
  ([chatService.ts#L104](../../../src/main/services/ai/chatService.ts#L104)), tool definitions viết tay
  ([chatTools.ts#L136](../../../src/main/services/ai/chatTools.ts#L136)) và tự chuyển sang model dự phòng
  khi lỗi ([chatService.ts#L287-L296](../../../src/main/services/ai/chatService.ts#L287-L296),
  [chatService.ts#L396-L405](../../../src/main/services/ai/chatService.ts#L396-L405)).
- Store renderer chưa có draft
  ([agentStore.ts#L18-L39](../../../src/renderer/src/modules/agent/store/agentStore.ts#L18-L39)).

## Goals / Non-Goals

**Goals:** chat toàn ứng dụng thật trên vòng model–tool, target chỉ qua handle, policy bằng bảng trong code,
tool round và pending action bền, turn sống trong Main và thấy được từ mọi cửa sổ, UI dùng chung session.

**Non-Goals (cắt khỏi MVP):**

- Task nhiều chương (thuộc `add-durable-translation-tasks`); change này chỉ đặt rule `needs_user` cho
  capability tạo task.
- Attachment, memory tự động, tóm tắt lịch sử bằng model phụ.
- Đổi tên, ghim, lưu trữ, tìm kiếm session; queue lệnh chat khi session bận.
- Multi-agent, policy DSL/TOML, duyệt "luôn cho phép tool này".
- Phát hiện loop bằng model phụ hoặc chu kỳ dài hơn 1.
- Tùy chỉnh budget trên UI.
- Tự chuyển model/provider khi lỗi.
- Nội dung tab Ngữ cảnh (thuộc `add-agent-context-workflow`).
- Lưu từng token delta; watermark `eventSeq` qua nhiều lần chạy.
- Gỡ chat legacy; spec `ai-chat-tools` không đổi.

## Decisions

### D1. Vòng model–tool dùng `provider.chat` có sẵn, không thêm framework

`provider.chat(messages, { signal, tools, turnRound })` đã là adapter "một vòng model". AgentService gọi
trực tiếp nó, không tách thêm lớp.

```text
accept turn → assemble context → model round → persist calls + decisions
  → execute allowed calls → persist results → next round | final | waiting_user
```

Tool definitions: capability schema là valibot và repo không có bộ xuất JSON Schema. Mỗi capability được
cho phép trong chat khai báo thêm `parameters` viết tay theo định dạng OpenAI như `chatTools.ts`; một test
kiểm mỗi `parameters` khớp schema valibot trên mẫu hợp lệ và không hợp lệ. Không thêm dependency.

Model chốt cho turn như hiện nay. Không có fallback tự động sang model/provider/connection khác: lỗi provider
kết thúc turn `failed` với lý do đã phân loại. Model catalog có `toolCall?: boolean`
([modelCatalog.ts#L36](../../../src/main/infra/providers/modelCatalog.ts#L36)): `false` → chạy một vòng không
tool và ghi activity giải thích; vắng → vẫn gửi tool; provider từ chối tool → `failed`.

### D2. Lưu tool round: migration library v11

```sql
CREATE TABLE agent_tool_call (
  id TEXT PRIMARY KEY,
  turn_id TEXT NOT NULL REFERENCES agent_turn (id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round > 0),
  call_id TEXT NOT NULL,              -- ID provider trả
  name TEXT NOT NULL,
  args_json TEXT NOT NULL,            -- tham số đã chuẩn hóa
  args_digest TEXT NOT NULL,          -- sha256(name + canonical args)
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'deny', 'needs_user')),
  state TEXT NOT NULL CHECK (state IN ('pending', 'completed', 'failed', 'cancelled', 'expired')),
  result_json TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (turn_id, call_id)
);
CREATE INDEX agent_tool_call_turn_order ON agent_tool_call (turn_id, round, created_at);
```

Pending action = hàng `decision = 'needs_user' AND state = 'pending'`. Cùng migration:

- dựng lại `agent_turn` để CHECK `status` có `expired`;
- tạo lại `agent_turn_one_active` với `status IN ('queued', 'running', 'waiting_user')`.

SQLite không sửa CHECK tại chỗ, và `DROP TABLE agent_turn` khi `foreign_keys = ON` sẽ cascade xóa
operation/activity. Runner `migrate` nhận thêm cờ `foreignKeysOff` trên một migration: tắt
`PRAGMA foreign_keys` ngoài transaction, chạy quy trình dựng lại bảng của SQLite, chạy
`PRAGMA foreign_key_check` trước commit, rồi bật lại. v12 của `add-durable-translation-tasks` (dựng lại
`agent_operation`) có thể dùng cờ này thay cho việc lưu rồi khôi phục liên kết con. Migration có fixture `library-v11.schema.sql` và test backup trước
migration giữ nguyên turn/operation/activity.

Call được ghi trước khi chạy bất kỳ call nào trong vòng; kết quả ghi trước khi đưa lại model; ghi thất bại
thì turn `failed` và không chạy tiếp. Đây là cách Hermes làm (xem References).

### D3. Target qua handle theo turn

`resolve_target(description)` bọc `resolveTarget` hiện có và trả `{ status: 'resolved', handle, label }`,
`{ status: 'ambiguous', candidates: [{ handle, label }] }` hoặc `{ status: 'not_found' }`. Handle là chuỗi
ngắn (`t1`, `t2`…) chỉ có nghĩa trong turn; ánh xạ handle → `ResolvedTarget` nằm trong `result_json` của hàng
`resolve_target`, nên continuation dựng lại được sau khi app mở lại. Target của context snapshot nhận handle
`ctx`. Mọi capability khác nhận `target: handle` thay cho `workId`/`chapterId`; `list_works` chỉ trả tên và
số chương, không trả ID. `undo_operation` nhận operation ID nhưng policy kiểm operation thuộc session.

`ambiguous` từ `resolve_target` tạo pending action như `needs_user`: UI hiện các ứng viên, câu trả lời hoàn
tất call đó bằng handle được chọn.

### D4. Policy là bảng trong một hàm thuần

| Capability | Điều kiện | Quyết định |
| --- | --- | --- |
| kind `read`, `resolve_target` | luôn | `allow` |
| kind `reversible-write` | target là `ctx`, hoặc nhãn tác phẩm/số chương có trong instruction (chuẩn hóa) | `allow` (có Undo) |
| kind `reversible-write` | target khác | `needs_user` |
| `undo_operation` | operation thuộc session hiện tại | `allow` |
| `undo_operation` | operation thuộc session khác | `deny` |
| tạo task dịch | luôn (tốn tiền, nhiều chương) | `needs_user` |
| còn lại | — | `deny` |

Handle không do turn cấp → `deny` trước khi tra bảng. "Do người dùng nêu" được kiểm bằng instruction lưu
trên turn, không bằng lời model, nên chỉ dẫn trong raw không thể biến tác phẩm khác thành target `allow`.

### D5. Budget và loop

`TurnBudgetTracker` được nối vào vòng thật với `maxModelRounds = 6`. Khi `isFinalRound` là `true`, vòng đó
gửi không kèm tool và vẫn tính trong 6 vòng, đúng rule của spec `ai-chat-tools`
([spec.md#L117-L129](../../specs/ai-chat-tools/spec.md#L117-L129)). Legacy gửi tool trong sáu vòng rồi thêm
một vòng không tool; ở đây tổng là 6, tức tối đa 5 vòng có tool. Các trần khác giữ default hiện có: 20 call,
100.000 ký tự đọc, 3 operation ghi.

- Chạm trần call → call đó nhận lỗi budget, vòng kế tiếp là vòng cuối không tool.
- Loop, vượt trần đọc, vượt trần ghi → dừng cứng: call không chạy, turn `failed` với lý do, không gọi model
  tổng kết.
- Loop detector: đếm `args_digest` trong turn; lần thứ ba cùng digest là loop. Gemini CLI dùng ngưỡng 5 và
  chu kỳ 1–5; Mira chỉ có 6 vòng nên ngưỡng 3, chu kỳ 1 là đủ. Các lần đọc phân trang có tham số khác nhau
  nên không bị tính là lặp.

### D6. Context window

Thứ tự lắp: system policy + tool definitions → instruction + snapshot → pending action đang trả lời → các turn
trước (chỉ instruction và câu trả lời cuối) → call/result của turn hiện tại. Quá giới hạn context của model
thì bỏ turn cũ nhất trước và ghi `droppedTurns` vào `detail` của activity vòng đó. Chương dài đi qua tool
phân trang; chỉ selection nhỏ hiện trên composer được đưa thẳng vào prompt.

### D7. `waiting_user`, continuation và quan hệ với `repair-agent-runtime`

Chuyển trạng thái mới: `waiting_user → running | cancelled | expired`. `AgentSendInput` thêm
`continuesTurnId` và `pendingReply: { toolCallId, argsDigest, choice }`, với `choice` là `approve`,
`reject` hoặc một handle ứng viên. Instruction của câu trả lời được lưu trong `result_json` của pending call
cùng `clientCommandId`; gửi lại cùng command trả cùng turn.

- Continuation: trong một transaction, kiểm turn còn `waiting_user`, hàng `pending` có `args_digest` khớp,
  hoàn tất hàng đó, chuyển turn sang `running`. Sau đó policy chạy lại trước khi thực thi. Duyệt bám theo
  call ID + digest, không theo tên tool; đây là bài học từ OpenAI Agents JS, nơi duyệt gắn với fingerprint
  của từng call còn duyệt "cả tool" không gắn call (xem References).
- Lệnh mới không có `continuesTurnId` trong session có turn đang chờ: cùng transaction accept chuyển turn
  cũ sang `expired` và pending call sang `expired`.
- Stop trên turn đang chờ → `cancelled`, pending call → `cancelled`.
- Shutdown và startup reconcile không đụng turn `waiting_user`; nó vẫn chờ sau khi mở lại app.
- Tiếp tục turn dựng lại message từ instruction, các hàng `agent_tool_call` theo `round`, và câu trả lời.

Các rule này đổi hai requirement của capability `agent-runtime-integration` do `repair-agent-runtime` thêm
(một turn active, lifecycle do Main sở hữu). Change đó chưa archive, nên spec này viết delta `MODIFIED`
lên bản của nó; `openspec validate` chấp nhận, nhưng archive cần spec gốc tồn tại. Vì vậy
`repair-agent-runtime` phải được archive trước khi apply change này.

### D8. Turn thuộc Main, event tới mọi cửa sổ

- Bỏ `sink.onDestroyed(() => cancelTurn)`; chỉ Stop hoặc thoát app kết thúc turn đang chạy.
- Event stream, write-intent và target-changed được phát tới mọi `BrowserWindow`. Write coordinator chờ ack
  của mọi cửa sổ đang mở lúc phát; cửa sổ đóng trong lúc chờ tính là `not-open`.
- `AgentSessionDetailView` thêm `activities`, `operations` và `pending` (các hàng pending action).
- Renderer upsert turn/activity/operation theo ID và chỉ thay khi `updatedAt` mới hơn; event terminal hoặc
  event của turn lạ → đọc lại snapshot. `eventSeq` vẫn tăng trong một lần chạy để kiểm thứ tự, nhưng renderer
  không dùng nó làm watermark.

### D9. UI

Màn Trợ lý thuộc module `agent`, compose ở `app/screens`. Side panel `Trợ lý | Ngữ cảnh` là shell của
workspace; `AgentPanel` và state thuộc `agent`, dùng qua `public.ts`. Tab Ngữ cảnh là placeholder. Draft theo
session là state mới của `agentStore`, chỉ ở renderer. Pending action hiện thành nút lựa chọn trong transcript.
Drawer ở cửa sổ hẹp trap/restore focus; panel dock không trap.

## Risks / Trade-offs

- **Dựng lại `agent_turn`** → cờ `foreignKeysOff` + `foreign_key_check` + backup trước migration; test giữ
  nguyên hàng con.
- **Model yếu không dùng handle** → lỗi có cấu trúc chỉ cách gọi `resolve_target`; vòng cuối không tool đảm
  bảo turn vẫn kết thúc.
- **Ngưỡng loop 3 có thể chặn trường hợp hợp lệ** → chỉ tính tham số giống hệt; đọc phân trang khác tham số.
- **Nhiều cửa sổ ack chậm** → giữ timeout 5 giây hiện có; fail closed như trước.
- **Đổi hành vi so với legacy** (5 vòng có tool thay vì 6, không fallback) → ghi rõ ở đây; legacy không đổi.

## Migration Plan

1. Archive `repair-agent-runtime`.
2. Migration v11 + runner `foreignKeysOff`, contract/state mới, repository tool call.
3. Policy, handle, budget/loop, context assembly dưới dạng hàm thuần có unit test.
4. Thay regex bằng vòng model–tool; xóa nhánh regex trong cùng change.
5. Broadcast event, snapshot mở rộng, store upsert/refetch, UI.

Rollback: revert code giữ được dữ liệu vì v11 chỉ thêm bảng và nới CHECK; app cũ từ chối mở DB v11 theo
`unsupported_version`, nên rollback cần bản backup trước migration.

## References

- Hermes lưu tool-call turn trước side effect và dừng khi lưu thất bại:
  [hermes-agent `agent/turn_tool_round.py#L127-L174`](https://github.com/NousResearch/hermes-agent/blob/7cc3fb8cb55898747dd1dfa56fda3e16ebba028e/agent/turn_tool_round.py#L127-L174).
- Gemini CLI loop detector, ngưỡng 5, chu kỳ 1–5:
  [gemini-cli `loopDetectionService.ts#L313-L348`](https://github.com/google-gemini/gemini-cli/blob/9b6e0265d16bbd29ca51e33c9e0c01dc4cec5e83/packages/core/src/services/loopDetectionService.ts#L313-L348).
- OpenAI Agents JS ràng buộc duyệt theo fingerprint của từng call:
  [openai-agents-js `runContext.ts#L438-L505`](https://github.com/openai/openai-agents-js/blob/89a9ddf1e241e75f2e0ad4c15d89de9e215ebac6/packages/agents-core/src/runContext.ts#L438-L505).
