## Context

Change đầu tiên chỉ sửa integration của foundation hiện có. Nguồn trạng thái và nghiên cứu nằm ở
[`agent-spec-program.md`](../../../docs/modules/proposals/agent-spec-program.md). Hiện IPC tự tạo
`AgentRepository`, `send` chỉ insert turn, `cancel` chỉ đổi state và `undo` không gọi checkpoint;
`createServices` chưa sở hữu AgentService. Registry, resolver, runner và journal đã có test đơn vị.

## Goals / Non-Goals

**Goals:** chứng minh một lệnh dịch chapter chạy từ UI qua IPC đến commit/Undo thật; mọi exit path có
state đúng; cancel và revision bảo vệ dữ liệu.

**Non-Goals:** không model tool loop, không task nhiều chapter, không sửa layout, không đổi semantics
Context hay thêm framework/dependency.

## Decisions

### Main sở hữu một runtime

Mở rộng `Services` bằng agent runtime/coordinator được tạo trong `createServices`. `HandlerDeps` nhận
instance này như các service khác. `AgentRepository` là dependency của runtime, không được tạo một
orchestrator mới trong mỗi IPC call. `activeControllers` chỉ có nghĩa khi AgentService sống lâu bằng app.

```text
renderer send
  → preload schema
  → IPC durable accept(commandId)
  → singleton AgentService.runExistingTurn
  → registry/capability
  → domain service + work journal
  → library state
  → stream terminal
```

AgentService nhận `turnId` đã được IPC/repository tạo; bỏ trách nhiệm tự tạo turn để không có hai owner.
Repository thêm lookup theo `(sessionId, clientCommandId)` hoặc khóa tương đương. Hash canonical payload
được lưu để cùng commandId khác nội dung trả conflict.

### Durable state đi trước quan sát và side effect

Áp bài học từ Hermes: intent/assistant tool decision phải lưu trước side effect; result/state phải lưu
trước terminal event. Không cần event sourcing token. Activity và operation hiện có là snapshot bền;
eventSeq là thứ tự trong process cho UI, reconnect đọc snapshot.

Nếu tạo operation hoặc persist terminal thất bại, capability chưa được gọi hoặc không phát success.
Nếu work DB đã commit nhưng library update lỗi, journal là bằng chứng và reconciler sửa library sau.

### Một write coordinator dùng cho UI và capability

Coordinator ở Main quản lý theo target key `(workId, chapterId, side)`:

1. phát write-intent có requestId và expected revision;
2. chờ adapter flush/ack; timeout là `flush_failed`, không suy thành `not-open`;
3. lấy lease, kiểm revision;
4. gọi capability với AbortSignal;
5. release/reload trong `finally`.

Renderer không thực thi domain write. `not-open` được Main xác định từ registry editor đang mount, tránh
tin ack giả. Lease chỉ giữ lúc commit/batch apply, không giữ suốt provider latency.

### Cancel có acceptance point

IPC gọi `AgentService.cancel(turnId)`, abort signal và yêu cầu coordinator đóng cửa commit. Một mutex hoặc
queue nhỏ theo target serialize `acceptCancel` với `beginCommit`; transaction đã bắt đầu được phép xong,
sau acceptance không transaction mới. Đây là semantics có thể test, thay vì hứa cancel tức thì.

### Undo dùng một đường storage

IPC lookup operation để lấy target rồi gọi `library.undoAgentOperation(workId, operationId)`. Storage
kiểm lastAppliedRev và restore checkpoint trong transaction; library operation chỉ chuyển undone sau
kết quả thật. Xóa response revision giả. Capability `undo_operation` và IPC dùng cùng service/helper,
không sao chép logic.

### Reconcile không chạy inference

Startup hiện có operation reconciler được compose sau migration và trước renderer ready. Nó đọc các
operation non-terminal, tra checkpoint/batches từng work:

- có terminal/đủ batch trong work journal → chiếu result/progress sang library;
- có một phần commit → interrupted/partially_completed với `hasChanges`;
- không bằng chứng → interrupted;
- không bao giờ gọi provider hoặc tạo batch mới.

Chạy lại reconciler cho cùng dữ liệu không đổi revision/trạng thái lần hai.

### Contract và lỗi tối thiểu

Giữ channel hiện có; mở rộng send input bằng `clientCommandId`, cancel/undo result bằng state thực. Dùng
error type hiện có khi phù hợp, chuẩn hóa ít nhất `session_busy`, `flush_failed`, `write_busy`,
`revision_conflict`, `provider_error`, `cancelled`, `persistence_error`. Lỗi log được lọc secret.

## Risks / Trade-offs

- **Hai DB không atomic chung** → work journal là commit evidence; fault-injection ở mọi biên.
- **Abort provider không đảm bảo dừng billing** → chỉ cam kết chặn commit sau cancel, usage có thể unknown.
- **UI listener biến mất giữa write-intent** → timeout fail closed; không tự ghi khi dirty state chưa rõ.
- **Foundation spec cũ giao nhau** → đối chiếu requirement/gate trước archive, không sửa checklist thành bằng chứng.

## Migration Plan

1. Chạy baseline `node scripts/check.mjs`; ghi lại test hiện có.
2. Mở rộng contract/repository bằng migration additive nếu cần command ID; cập nhật schema snapshot và backup test.
3. Compose runtime/coordinator, sau đó nối send/cancel/undo tuần tự để lỗi dễ định vị.
4. Thêm IPC E2E bằng DB tạm + fake provider, rồi fault-injection/restart.
5. Chỉ cập nhật tài liệu trạng thái sau khi gate UI → commit → Undo đạt.

Rollback code không hạ schema. Cột/index additive được để lại; app cũ phải bỏ qua nếu cơ chế migration
hiện tại cho phép, nếu không thì phát hành runtime cùng schema như một đơn vị và dùng backup trước migration.

## References

- Hermes persist-before-side-effect: xem nghiên cứu chương trình.
- Mira: `agent.ts`, `createServices.ts`, `agentService.ts`, `agentOperationJournal.ts` và test colocated.
