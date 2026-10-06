## Why

Thử nghiệm ngày 2026-10-06 cho thấy v3 nhận đúng người nói nhưng vẫn dùng sai đại từ của cặp đã duyệt. T0 dùng lô nguyên chương còn T1 dùng lô nhỏ, nên chưa thể quy chênh lệch cho prompt.

## What Changes

- Thêm prompt thử nghiệm v4: khai cách tự xưng và gọi người nghe trước khi viết bản dịch.
- Giữ v3 làm đối chứng, chạy T1 nguyên chương và v4 cùng model, dữ liệu, phạm vi.
- Ghi số đo tự động cùng các câu đã đọc tay; không đổi prompt mặc định của sản phẩm.

## Capabilities

### New Capabilities
- `translation-prompt-grounding`: buộc bước chọn cặp xuất hiện trước bản dịch trong prompt thử nghiệm.

### Modified Capabilities

## Impact

Prompt builder, danh sách phiên bản, test, dữ liệu Lab riêng và tài liệu module Ngữ cảnh. Không đổi schema lưu trữ.
