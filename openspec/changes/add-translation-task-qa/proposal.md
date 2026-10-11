## Why

Task chỉ hoàn tất theo số request không đủ chứng minh bản dịch đầy đủ và nhất quán. Mira cần kiểm deterministic cho cấu trúc/revision và cảnh báo domain riêng, nhưng không được hứa máy móc rằng văn phong văn học “đúng”.

## What Changes

- Kiểm manifest segment: đủ, không thừa/trùng, đúng source revision trước commit.
- Kiểm sau dịch cho glossary, tên riêng, xưng hô và lỗi thiếu/thừa; phân loại blocker/cảnh báo.
- Tách tiến độ dịch và QA; task chỉ thành công toàn bộ khi gate bắt buộc đạt.
- Cung cấp activity, mở đúng vị trí lỗi và retry/review rõ ràng.
- Không auto-polish, tự sửa cảnh báo hoặc chấm chất lượng văn học tuyệt đối.

## Capabilities

### New Capabilities

- `translation-task-quality`: contract kiểm tính đầy đủ và nhất quán của kết quả task dịch.

### Modified Capabilities

Không có.

## Impact

- Phụ thuộc `add-durable-translation-tasks`; kiểm Context đầy đủ dùng `add-agent-context-workflow`.
- Translation result validator, task state/progress, activity và editor navigation.
- Fixture lỗi segment/glossary/addressing, test false-positive và E2E partial result.
