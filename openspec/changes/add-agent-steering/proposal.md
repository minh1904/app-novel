## Why

Task dịch dài cần nhận điều chỉnh giữa chừng, ví dụ “từ chương 8 dùng cách xưng hô mới” hoặc “từ chương 12 giữ
câu ngắn”, mà không sửa ngược chương đã dịch và không đổi snapshot của item đang chạy. Hiện chưa có chỗ nào
lưu yêu cầu đó, chưa có điểm hiệu lực xác định, và prompt dịch không có ô nào nhận chỉ dẫn của task.

## What Changes

- Thêm steering record bền trong library DB: taskId, clientCommandId, digest, chương yêu cầu, item thực sự bắt
  đầu áp dụng (`resolvedFromItem`), loại `instruction | context_ref`, nội dung (text hoặc ref tới Context entry)
  và trạng thái `accepted | applied | superseded`.
- Validate đồng bộ khi nhận lệnh: ngoài phạm vi task, mơ hồ hoặc không còn item chưa chạy thì từ chối và không
  tạo record; chấp nhận thì trả về item thực sự bắt đầu áp dụng.
- Steering chỉ có hiệu lực từ item kế tiếp chưa bắt đầu; item đang chạy và item đã xong giữ snapshot cũ.
- Instruction text được vật chất hóa vào snapshot của item (`translate_run_context`) và đưa vào prompt; đổi
  bộ dựng prompt nên tăng `TRANSLATE_PROMPT_VERSION`.
- Đổi xưng hô từ chương N dùng `fromChapterId` sẵn có của cặp xưng hô và đóng `toChapterId` của cặp cũ trong
  cùng transaction work DB. Đổi đại từ ngôi ba (`thirdPerson`) theo chương bị từ chối kèm lý do vì trường này
  chưa có phạm vi chương.
- Không làm: bảng version/overlay, baseVersion/resultingVersion, workflow pause item đang chạy để quyết định
  phần đã commit (Undo và Cancel đã đủ), tự dịch lại chương cũ, chèn text vào provider stream.

## Capabilities

### New Capabilities

- `agent-task-steering`: nhận, validate và áp steering cho task dịch bền với điểm hiệu lực xác định.

### Modified Capabilities

- `translation-context-snapshot`: snapshot chứa instruction text đã vật chất hóa của task; prompt dùng nó.

## Impact

- Phụ thuộc `add-durable-translation-tasks` (task, item, pin snapshot lúc `queued → running`, trạng thái);
  phần `context_ref` phụ thuộc `add-agent-context-workflow` (đường ghi Context do người dùng xác nhận).
- Library DB: bảng steering mới, migration v13 kèm fixture `library-v13.schema.sql` và backup test.
- Work DB: không đổi schema; dùng `context_entry` (cặp xưng hô) và `translate_run_context` sẵn có.
- Code: `contextSnapshot.ts`, `translatePrompt.ts`, task runner (pin snapshot), chat capability và form ở màn
  Tác vụ.
