## Why

Mira đã có glossary, nhân vật, xưng hô và extraction rời rạc nhưng task dịch chưa có quy trình duyệt và snapshot tái hiện được. Nếu nối trực tiếp, candidate AI chưa duyệt có thể âm thầm trở thành quy ước dịch.

## What Changes

- Nối preflight → extraction có bằng chứng → pending review → snapshot approved → task dịch.
- Lưu snapshot bất biến hoặc dữ liệu đủ tái hiện cho từng item/run.
- Hoàn thiện tab Ngữ cảnh trong side panel với Đang áp dụng, Tất cả, Chờ duyệt và link từ activity.
- Dùng chung Context owner/work DB với màn quản lý đầy đủ; không sao chép glossary vào agent state.
- Cho phép tiếp tục bằng Context đã duyệt hiện có hoặc bỏ qua extraction rõ ràng.

## Capabilities

### New Capabilities

- `agent-context-workflow`: contract chuẩn bị, duyệt, snapshot và hiển thị Context cho task dịch.

### Modified Capabilities

Không thay đổi semantics lưu trữ Context hiện hành; change này chỉ điều phối các service đã có.

## Impact

- Phụ thuộc `add-durable-translation-tasks` và nền Context hiện có.
- Glossary/extraction/addressing/context snapshot services và work DB.
- Task preflight/item metadata, activity và renderer context/agent/workspace public surfaces.
- Test phạm vi effective, pending/rejected, snapshot sau khi glossary bị sửa và keyboard/drawer.
