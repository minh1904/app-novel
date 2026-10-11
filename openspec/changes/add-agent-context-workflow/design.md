## Context

Mira đã có glossary/addressing services, extraction và translation context snapshot. Dữ liệu nằm trong
work DB; agent/task chỉ cần orchestration và UI nhanh. Quyết định hiện hành yêu cầu pending không vào
prompt và side panel dùng chung slot Trợ lý/Ngữ cảnh.

## Goals / Non-Goals

**Goals:** extraction có provenance, review rõ, effective resolver dùng chung, snapshot tái hiện và tab
Ngữ cảnh trong chapter không tạo nguồn dữ liệu thứ hai.

**Non-Goals:** không tự duyệt, memory tự động, import/bulk editor mới, steering giữa task hoặc QA hậu dịch.

## Decisions

### Workflow là phase của task, không là agent loop mở

Task dùng phase cố định:

```text
context_preflight
  → extracting (tùy chọn)
  → waiting_review
  → snapshotting
  → translation queued
```

Agent có thể chọn capability bắt đầu workflow, nhưng code quyết định phase/transition. Extraction là run
riêng có model/usage/error; review không giữ provider request hay write lease.

### Candidate dùng schema Context hiện có

Không tạo bảng “agent glossary”. Extraction ghi entry/candidate bằng service owner Context và thêm/giữ
provenance cần thiết: runId, chapter/segment evidence, original proposal, confidence nếu provider có và
suggested scope. Dedupe dựa trên normalized source + scope/type nhưng không auto-merge khi bản dịch khác;
UI trình bày conflict với entry approved.

Review command có commandId, expected candidate revision và action approve/edit/reject. Bulk review chạy
transaction work DB và trả từng lỗi nếu precondition khác nhau; không đánh dấu phần thất bại là thành công.

### Effective resolver là một hàm dùng chung

Drawer, translation prompt và run detail gọi cùng resolver domain với `(workId, chapterId, segment
metadata, atRevision)`. Resolver chỉ nhận approved entry, xét scope và loại nội dung. Nó trả entry +
reason/provenance để debug. Không cache bản sao trong Zustand; UI cache query có thể invalidate theo
context revision.

### Snapshot giữ payload thực tế

Snapshot item gồm normalized payload đúng như prompt builder nhận, entry IDs/revisions, resolver version,
instruction version và hash. Nếu storage hiện tại chỉ giữ ID trỏ bản ghi mutable, migration bổ sung payload
JSON immutable hoặc version table nhỏ; chọn phương án ít thay đổi nhất sau khi characterization test xác
nhận behavior. Snapshot được tạo khi item chuẩn bị chạy, không lúc task vừa tạo nếu review còn mở.

Prompt builder chỉ đọc snapshot, không query “latest” giữa request/retry của cùng attempt.

### Task waiting_review là state/reason bền

Task item chưa chạy; task giữ `waiting_user`/phase reason và liên kết extraction run. Continue kiểm:
candidate state, source revision, effective Context revision và task stateVersion. Nếu Context thay đổi
sau review nhưng trước snapshot, UI nêu snapshot sẽ dùng revision mới hoặc yêu cầu review lại khi thay đổi
liên quan; không âm thầm dùng candidate chưa duyệt.

### UI side panel theo owner

Workspace compose một utility panel slot; module agent cung cấp Trợ lý, module Context cung cấp Context
panel public component/store query. Tab state/width thuộc workspace; draft agent thuộc session; search/
filter/selected context entry thuộc panel instance. Desktop dock và narrow overlay dùng primitives hiện có.

`Đang áp dụng` gọi effective resolver cho chapter hiện tại; `Tất cả` query work; `Chờ duyệt` filter state.
Edit/approve nhanh dùng Context service và optimistic UI chỉ sau response success. Link activity truyền
workId/runId/filter qua typed navigation intent, không deep import store.

## Risks / Trade-offs

- **Snapshot tăng dung lượng** → chỉ lưu payload Context thực dùng, không toàn work; đo size trước nén.
- **Dedupe sai hai nghĩa đồng hình** → không auto-merge khi type/scope/translation khác; yêu cầu review.
- **Context đổi lúc task chờ** → revision guard và preview snapshot trước Continue.
- **Nested navigation trong panel** → chỉ ba filter; quản lý nâng cao mở màn Context đầy đủ.

## Migration Plan

1. Characterize resolver/snapshot/extraction hiện có và fixture pending/approved/rejected.
2. Bổ sung provenance/snapshot persistence nhỏ nhất cùng migration/test nếu thiếu.
3. Thêm task phases và review commands; test restart khi waiting_review.
4. Nối panel Context/public surface và activity navigation.
5. Gate extraction → review một phần → snapshot → dịch, rồi sửa glossary và chứng minh run cũ tái hiện được.

Rollback tắt phase extraction/panel quick actions; giữ candidate và snapshot đã tạo để không mất provenance.

## References

- Quyết định và dữ liệu Context trong `docs/modules/context/`; phân tách checkpoint/store của LangGraph
  chỉ là tham khảo trong [`agent-spec-program.md`](../../../docs/modules/proposals/agent-spec-program.md).
