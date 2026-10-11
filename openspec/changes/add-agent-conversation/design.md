## Context

Change này bắt đầu sau gate `repair-agent-runtime`. Mira có hai nền khác nhau: `ChatService` legacy đã
có model/tool round nhưng gắn work DB và proposal; `AgentService` mới có global session/operation nhưng
dispatch regex. Mục tiêu là lấy cơ chế provider/tool cần thiết, không nhập contract proposal-only.

## Goals / Non-Goals

**Goals:** chat toàn ứng dụng thật, model chọn capability đã cấp, target/context bền, continuation an
toàn, reconnect được và UI dùng chung session.

**Non-Goals:** không task nhiều chương, attachment, memory tự động, rename/pin/archive/search session,
multi-agent, approval language tổng quát hoặc side panel Context đầy đủ.

## Decisions

### Agent loop nhỏ, không thêm framework

Tách adapter “một model round” từ provider path hiện có nếu có thể dùng chung mà không kéo persistence
legacy. Runtime tự điều khiển vòng:

```text
assemble context → model round → validate tool calls
  → policy/budget → persist decision → execute tools
  → persist results → next model round | final
```

Các primitive cần thiết đã có: connection/model, registry/schema, repository/session, stream, budget.
OpenAI Agents SDK và Gemini CLI chứng minh pattern nhưng không giải quyết ownership SQLite/Mira nên không
được thêm làm dependency.

### Tool exposure là allowlist theo lượt

Registry giữ mọi capability, nhưng prompt chỉ nhận tool đáp ứng mode, target availability và quyền. Một
policy evaluator thuần trả `allow | deny | needs_user` cùng reason dựa trên capability kind,
targetPolicy, normalized args, resolved target và turn grant. Không có TOML/policy DSL ở MVP.

Arguments model không chứa authoritative workId khi tool đã bound vào target. Nếu tool cần target khác,
resolver nhận mô tả người dùng và xác nhận trong quyền; model không tự bịa ID. Tool result được bọc là
dữ liệu và cắt theo giới hạn công bố.

### Context assembly theo lớp ưu tiên

Mỗi model round lắp:

1. system policy + tool schemas;
2. current instruction và snapshot context của turn;
3. pending clarification/action nếu có;
4. các turn gần nhất trong session;
5. tool results của turn hiện tại.

Không nhúng toàn library. Khi quá budget, bỏ turn cũ trước, ghi `droppedTurns`; không bỏ system policy,
current instruction, active tool-call/result pairs hoặc target snapshot. Source chapter được đọc qua tool
phân trang, không auto-attach toàn chapter trừ selection nhỏ đã hiện trên composer.

### Continuation dùng identity và fingerprint

Waiting state lưu pendingActionId, tool name, canonical args fingerprint, candidate data và policy
version. Reply có waitingTurnId + response; runtime resolve thành args mới, chạy lại validation/policy và
chỉ reuse approval/choice khi fingerprint binding còn hợp lệ. Bài học từ OpenAI Agents SDK: approval
không gắn tên tool chung chung vì arguments có thể thay đổi sau resume.

Một request có thể terminal `waiting_user`; turn vẫn resumable. Resume cấp requestId/eventSeq stream mới,
giữ turnId và command lineage. Expire continuation khi target bị xóa, policy version incompatible hoặc
turn đã cancelled/completed.

### Budget và loop detection dùng code đơn giản

Nối `TurnBudgetTracker` hiện có. Default ban đầu giữ 5 model rounds, 20 capability calls, 100.000 ký tự
đọc và 3 write operation; config nội bộ, chưa mở UI tùy chỉnh. Thêm ring buffer fingerprint
`toolName + canonical args`; chu kỳ 1–3 lặp ba lần không tiến triển hoặc chạm hard limit thì dừng.
Không gọi model phụ để phát hiện loop như Gemini CLI vì chi phí/độ phức tạp chưa cần.

### Snapshot + subscribe cho renderer

Renderer subscribe stream trước, fetch session snapshot, rồi merge event có seq/newer timestamp. Activity
upsert theo ID; answer delta chỉ là presentation buffer, final answer từ DB thắng sau reconnect. Nếu event
gap, refetch snapshot. Store có draft theo session và active request map, không chứa authoritative target.

### UI ownership

Màn assistant thật nằm trong module agent và compose tại app screen. History list + transcript + composer
dùng primitive hiện có. Workspace cung cấp context adapter; side-panel shell thuộc workspace composition,
nhưng AgentPanel/state thuộc module agent. Tab Ngữ cảnh là placeholder có owner/public surface rõ cho
change sau, không deep import.

Desktop dock; cửa sổ hẹp overlay drawer theo primitive/design tokens hiện có. Drawer trap/restore focus;
docked panel không trap. Reasoning nội bộ không bắt buộc hiển thị; activity mô tả hành động kiểm chứng được.

## Risks / Trade-offs

- **Legacy ChatService trùng code** → chỉ tách model-round adapter trung lập; giữ legacy persistence/tool contract.
- **Context dài** → pagination + hard read budget; không tự summarize source quan trọng bằng model phụ.
- **Model trả malformed/mixed calls** → error result cho từng call, đảm bảo mọi call ID có result; không chạy call invalid.
- **Reconnect race** → subscribe-before-snapshot + seq/gap recovery, test event đến đúng lúc hydrate.
- **Session bận** → một active turn; trả lỗi nhanh và giữ draft, chưa xây queue chat.

## Migration Plan

1. Characterize ChatService provider/tool round và AgentService contract; tách helper nhỏ nhất dùng lại được.
2. Thêm policy/context/continuation model thuần cùng unit tests.
3. Thay regex bằng loop sau feature gate nội bộ; giữ direct single-chapter path làm test oracle, không giữ hai production dispatcher lâu dài.
4. Nối session screen/panel/reconnect và accessibility tests.
5. Gate bằng câu hỏi read-only, write rõ target, ambiguous continuation, injection và loop exhaustion.

Rollback tắt loop mới và giữ lịch sử đã ghi; không xóa session/turn. Không archive chat legacy trong change này.

## References

- Gemini CLI policy engine và loop detector, OpenAI Agents JS run context, Hermes tool-round persistence:
  xem [`agent-spec-program.md`](../../../docs/modules/proposals/agent-spec-program.md).
