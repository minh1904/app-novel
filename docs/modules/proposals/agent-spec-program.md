# Chương trình đặc tả Trợ lý Agent

Cập nhật: 2026-10-11 · Trạng thái: **nghiên cứu và kế hoạch triển khai; chưa triển khai**.

## Kết luận

Module chat Agent phải được triển khai thành bảy change độc lập, theo thứ tự phụ thuộc. Change sau chỉ
bắt đầu khi gate của change trước mà nó phụ thuộc đã có bằng chứng runtime. Bộ `agent-chat-module` cũ
gom cả chương trình vào một change nên không còn là nguồn triển khai.

```text
repair-agent-runtime
        ↓
add-agent-conversation
        ↓
add-durable-translation-tasks
        ↓
add-agent-context-workflow
        ├──────────────┐
        ↓              ↓
add-agent-steering   add-translation-task-qa
        └──────┬───────┘
               ↓
add-external-translation-worker
```

| Lát | Change | Kết quả độc lập | Không thuộc lát |
| --- | --- | --- | --- |
| 1 | [`repair-agent-runtime`](../../../openspec/changes/repair-agent-runtime/proposal.md) | Một chương dịch được qua UI → IPC → service → storage; cancel, usage và Undo đúng | Model tự chọn tool, task nhiều chương |
| 2 | [`add-agent-conversation`](../../../openspec/changes/add-agent-conversation/proposal.md) | Chat toàn ứng dụng với model/tool loop, làm rõ target và lịch sử thật | Task dài, Context review |
| 3 | [`add-durable-translation-tasks`](../../../openspec/changes/add-durable-translation-tasks/proposal.md) | Dịch dải chương tuần tự, pause/cancel/retry/recovery | Extraction, steering, MCP |
| 4 | [`add-agent-context-workflow`](../../../openspec/changes/add-agent-context-workflow/proposal.md) | Extraction → review → snapshot đã duyệt → dịch | Sửa hướng giữa task, QA hậu dịch |
| 5 | [`add-agent-steering`](../../../openspec/changes/add-agent-steering/proposal.md) | Chỉ dẫn mới có điểm hiệu lực rõ cho phần chưa chạy | QA tự động, sửa ngược kết quả |
| 6 | [`add-translation-task-qa`](../../../openspec/changes/add-translation-task-qa/proposal.md) | Kiểm đủ segment, revision và nhất quán; phân biệt lỗi với cảnh báo | Auto-polish, chấm chất lượng văn học tuyệt đối |
| 7 | [`add-external-translation-worker`](../../../openspec/changes/add-external-translation-worker/proposal.md) | MCP local giao batch và nhận bản dịch từ agent ngoài an toàn | Gateway cloud/Gemini web, daemon |

## Bằng chứng từ Mira

Khảo sát tại commit `34ad169d956825cc5b9ad783326a5ee0c745c869` cho thấy foundation có nhiều
khối dùng lại được nhưng chưa có đường chạy đầu-cuối:

| Bằng chứng | Nhận định |
| --- | --- |
| [`src/main/ipc/handlers/agent.ts`](../../../src/main/ipc/handlers/agent.ts) | `send` mới tạo turn; `cancel` chỉ đổi DB state; `undo` trả revision giả `0` |
| [`src/main/services/createServices.ts`](../../../src/main/services/createServices.ts) | Composition root chưa tạo `AgentService` |
| [`src/main/services/agent/agentService.ts`](../../../src/main/services/agent/agentService.ts) | Intent vẫn là regex; đường lỗi có thể rơi vào câu trả lời thành công mặc định |
| [`src/main/services/agent/registry.ts`](../../../src/main/services/agent/registry.ts) | Registry và `TurnBudgetTracker` đã có, nên tái sử dụng |
| [`src/main/infra/storage/agentOperationJournal.ts`](../../../src/main/infra/storage/agentOperationJournal.ts) | Work DB đã có prepare, batch journal, checkpoint và revision guard |
| [`src/main/infra/storage/librarySchema.ts`](../../../src/main/infra/storage/librarySchema.ts) | Library DB đã có session, turn, operation, activity và unique active turn |
| [`src/renderer/src/app/AppContent.tsx`](../../../src/renderer/src/app/AppContent.tsx) | Màn Assistant dùng `AgentPanel`, màn Jobs vẫn là mock |
| [`src/renderer/src/modules/agent/adapter/workspaceAdapter.ts`](../../../src/renderer/src/modules/agent/adapter/workspaceAdapter.ts) | Có nền flush dirty và write-intent nhưng IPC chưa dùng nó làm hàng rào ghi thật |

Phạm vi phải chạm khi triển khai gồm caller UI, shared contract, preload, IPC, service composition,
provider adapter, storage/migration, startup reconcile, fixture schema, backup, public exports và test.
Một thay đổi chỉ sửa service mà bỏ caller hoặc fixture là chưa hoàn chỉnh.

## Nghiên cứu các repo khác

Các nguồn dưới đây được ghim theo commit khảo sát ngày 2026-10-11. Chúng là bằng chứng cho nguyên tắc,
không phải dependency được đề xuất.

### Hermes Agent

Repo [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent/tree/bf871a5943f0c280a81245b28096edb2c8832457)
được đọc cả source local tại đúng commit.

- [`agent/turn_tool_round.py`](https://github.com/NousResearch/hermes-agent/blob/bf871a5943f0c280a81245b28096edb2c8832457/agent/turn_tool_round.py#L127-L173)
  lưu assistant tool-call trước khi chạy side effect. Nếu persistence thất bại, vòng dừng và không dùng
  kết quả chỉ tồn tại trong RAM. Mira áp dụng cùng thứ tự: durable intent trước side effect, durable
  result trước event thành công.
- [`gateway/run_busy.py`](https://github.com/NousResearch/hermes-agent/blob/bf871a5943f0c280a81245b28096edb2c8832457/gateway/run_busy.py#L1038-L1100)
  phân biệt queue, steer và stop khi agent đang bận. Mira đơn giản hơn: một turn active mỗi session,
  task có control riêng; steering chỉ đi vào ranh giới item/batch đã định.
- [`tools/write_approval.py`](https://github.com/NousResearch/hermes-agent/blob/bf871a5943f0c280a81245b28096edb2c8832457/tools/write_approval.py#L155-L216)
  giữ quyết định allow/stage/block bên ngoài model và fail closed khi không thể hỏi người dùng. Mira
  đưa quyền, target policy và write lease vào registry/coordinator, không cho prompt tự cấp quyền.

### Gemini CLI

Repo [`google-gemini/gemini-cli`](https://github.com/google-gemini/gemini-cli/tree/9b6e0265d16bbd29ca51e33c9e0c01dc4cec5e83)
cho hai bài học trực tiếp:

- [`policy-engine.md`](https://github.com/google-gemini/gemini-cli/blob/9b6e0265d16bbd29ca51e33c9e0c01dc4cec5e83/docs/reference/policy-engine.md)
  tách quyết định allow/deny/ask khỏi model, xét theo tool và arguments. Mira không cần ngôn ngữ policy
  tổng quát ở MVP; capability metadata + grant + target resolver đủ cho nghiệp vụ hẹp.
- [`loopDetectionService.ts`](https://github.com/google-gemini/gemini-cli/blob/9b6e0265d16bbd29ca51e33c9e0c01dc4cec5e83/packages/core/src/services/loopDetectionService.ts)
  theo dõi tool-call lặp và content loop. Mira dùng trần model round/capability call đã có cùng phát hiện
  lặp `(tool, normalized args)`, chưa cần thêm một model chuyên phát hiện loop.

### LangGraph

- [`persistence.mdx`](https://github.com/langchain-ai/docs/blob/cd302e5548df094a85b34dfb6eb23823c66614f4/docs/src/oss/langgraph/persistence.mdx)
  phân biệt checkpoint theo thread với store dữ liệu dùng chung. Điều này củng cố việc tách session/turn
  khỏi task/operation và Context của Mira.
- [`types.py`](https://github.com/langchain-ai/langgraph/blob/799c2f04fd3a56186e24e9fb8bbf3568e543cfbe/libs/langgraph/langgraph/types.py#L3556-L3577)
  nói rõ resume từ interrupt chạy lại node từ đầu.
- [`functional-api.mdx`](https://github.com/langchain-ai/docs/blob/cd302e5548df094a85b34dfb6eb23823c66614f4/docs/src/oss/langgraph/functional-api.mdx)
  yêu cầu side effect có idempotency vì task chưa hoàn tất có thể chạy lại sau resume.

Mira đã có SQLite journal/checkpoint đúng nhu cầu, nên không cài LangGraph. Bài học được đưa vào batch
key, payload digest, reconcile và fault-injection test.

### OpenAI Agents SDK

Repo [`openai/openai-agents-js`](https://github.com/openai/openai-agents-js/tree/89a9ddf1e241e75f2e0ad4c15d89de9e215ebac6)
cho thấy tập primitive nhỏ gồm agent loop, function tools, guardrails, session, human-in-the-loop và
tracing là đủ. [`runContext.ts`](https://github.com/openai/openai-agents-js/blob/89a9ddf1e241e75f2e0ad4c15d89de9e215ebac6/packages/agents-core/src/runContext.ts)
ràng buộc approval với call identity/fingerprint để quyết định cũ không áp nhầm cho lời gọi đã đổi.
Mira áp dụng nguyên tắc binding này cho continuation và external claim; không thêm SDK vì provider,
registry và persistence đã tồn tại.

### MCP TypeScript SDK

Repo [`modelcontextprotocol/typescript-sdk`](https://github.com/modelcontextprotocol/typescript-sdk/tree/b022522089a0c8b632595c6e7b536453945ed5a9)
xác nhận:

- MCP tách context/tool transport khỏi business logic; middleware được thiết kế là adapter mỏng.
- Host khởi chạy local child process dùng stdio; endpoint nhiều client dùng Streamable HTTP.
- HTTP handler không tự xác thực bearer token hoặc Host/Origin; lớp phía trước phải làm việc đó.

Vì vậy lát external đầu tiên chỉ có stdio adapter tới broker local và registry. Streamable HTTP, OAuth,
relay, Gemini web và availability theo khu vực thuộc change khác nếu MVP local đã chứng minh giá trị.

## Quyết định xuyên suốt

1. Agent hiểu mục tiêu và chọn capability; code nghiệp vụ điều khiển workflow dài.
2. Intent/tool call phải bền trước side effect; kết quả bền trước terminal event.
3. Mọi write có target đã resolve, expected revision, lease ngắn, journal/checkpoint và Undo.
4. Resume/retry luôn giả định bước có thể chạy lại; mọi side effect dùng idempotency key + payload digest.
5. Turn, task và operation có vòng đời riêng. Stop turn không ngầm cancel task.
6. Usage chỉ lấy từ provider. Thiếu dữ liệu là unknown, không phải 0.
7. Pending Context không vào prompt. Snapshot giữ đúng dữ liệu/version thực sự đã dùng.
8. Transport ngoài là adapter; không mở DB, SQL, shell hoặc file primitive cho model.

## Rủi ro và gate chương trình

| Rủi ro | Hàng rào bắt buộc |
| --- | --- |
| Báo thành công dù capability lỗi | Terminal state lấy từ kết quả bền, test mọi exit path |
| Ghi đè bản sửa tay | Flush/ack + expected revision + lease + conflict rõ |
| Crash giữa work DB và library DB | Work journal là bằng chứng; startup reconcile idempotent |
| Retry làm dịch/ghi hai lần | Command/batch key và digest; cùng key khác payload là conflict |
| Cancel nhưng kết quả muộn vẫn ghi | Coordinator chặn commit sau thời điểm cancel được chấp nhận |
| Task 30 chương vượt tiền | Kiểm budget trước mỗi request; thiếu giá/usage không hứa hard cap tiền |
| Prompt/tool output cấp quyền trái phép | Policy trong code; dữ liệu không thay đổi grant/target |
| External client đọc quá phạm vi | Pairing và grant theo tác phẩm; kiểm lại mỗi call; revoke fail closed |

Mỗi change có gate riêng. `node scripts/check.mjs` là kiểm repository, không thay test hành vi qua IPC,
crash injection hoặc MCP client thật được ghi trong task của từng change.

[Roadmap agent](agent-roadmap.md) · [Quyết định](decisions.md) · [Về module](README.md)
