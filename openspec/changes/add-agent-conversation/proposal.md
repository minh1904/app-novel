## Why

Sau khi runtime chạy thật, Mira vẫn chỉ phân loại yêu cầu bằng regex và chưa có chat toàn ứng dụng hoàn chỉnh. Người dùng cần hội thoại tự nhiên có lịch sử tập trung, target rõ và model chỉ gọi capability trong quyền được cấp.

## What Changes

- Thêm vòng model → tool → result → model với schema, giới hạn, loop detection và lỗi trung thực.
- Chụp context theo lượt, resolve target, hỗ trợ `waiting_user` và continuation ràng buộc đúng call.
- Hoàn thiện màn Trợ lý: Chat mới, lịch sử, transcript, composer, activity và Mở đích.
- Dùng cùng session/store trong panel chương; tạo shell side panel `Trợ lý | Ngữ cảnh` nhưng chưa xây workflow Context.
- Giới hạn context/history và chống prompt/tool-output thay đổi quyền.

## Capabilities

### New Capabilities

- `agent-conversation`: contract hội thoại toàn ứng dụng, model/tool loop, context theo lượt, continuation và UI chat.

### Modified Capabilities

Không sửa `ai-chat-tools`; spec đó tiếp tục mô tả chat legacy theo tác phẩm trong thời gian chuyển đổi.

## Impact

- Phụ thuộc `repair-agent-runtime` đã đạt gate.
- AgentService/provider tool-call adapter, resolver, registry/budget và session repository.
- Shared/preload/IPC continuation/stream; renderer agent, navigation và workspace side-panel shell.
- Test model giả, prompt injection, limit/loop, reconnect và accessibility.
