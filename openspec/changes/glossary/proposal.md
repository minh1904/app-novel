## Why

Trong dịch truyện dài và tiểu thuyết nhiều chương, tính nhất quán của tên riêng, địa danh, tuyệt kỹ và thuật ngữ chuyên ngành là yếu tố sống còn ([ADR-002](../../../docs/handbook/decisions/0002-ai-first-translation.md)). Hiện tại khu vực Ngữ cảnh (`ContextArea`) trên giao diện chỉ là mockup minh họa tĩnh (`ContextAreaMock`), `TranslateRequest.context` chưa được cấp dữ liệu thật từ tác phẩm, và việc dịch phụ thuộc hoàn toàn vào trí nhớ ngữ cảnh ngắn hạn của LLM.

Module 3: Thuật ngữ (Lát 1 của `context-core` theo [Roadmap](../../../docs/handbook/delivery/roadmap.md)) giải quyết bài toán này bằng cách:
1. Lưu trữ bền vững thuật ngữ và các dạng viết (alias), term cấm, phạm vi hiệu lực theo chương trong cơ sở dữ liệu tác phẩm (`.mira`).
2. Cung cấp màn hình Thuật ngữ thật trong khu vực Ngữ cảnh để người dùng tạo, sửa, duyệt và nhập nhanh từ tệp `Names.txt` quen thuộc.
3. Tự động so khớp thuật ngữ trong văn bản nguồn và chèn vào Tầng C của prompt Lõi dịch đã xây dựng ở Module 2.
4. Kiểm tra tuân thủ thuật ngữ bằng bộ kiểm tra thuần để phát hiện việc dịch sai hoặc vi phạm term cấm mà không làm chậm hệ thống.

## What Changes

- **Schema tác phẩm (SQLite `.mira`)**: Bổ sung bảng `context_entry` chuyên cho thuật ngữ (`kind = 'term'`) và bảng `context_alias`, hỗ trợ hiệu lực theo chương (`from_chapter_id`, `to_chapter_id`), cờ cấm (`forbidden`), trạng thái duyệt (`approved | pending | rejected`), và nguồn gốc (`user | ai | import`).
- **Tầng khớp thuật ngữ (`contextMatching.ts`)**: Hàm thuần so khớp chuỗi con cho CJK (`zh-Hans`, `zh-Hant`, `ja`) và biên từ `\b` cho `en`; ưu tiên khớp dài trước, chặn mục quá ngắn (< 2 ký tự CJK, < 3 ký tự Latin trừ khi được ép khớp), khớp qua alias.
- **Tích hợp Tầng C vào Lõi dịch**: Chỉ chèn các thuật ngữ đã khớp (kèm các term cấm liên quan) vào Tầng C của `buildTranslateSystemPrompt()`. Các mục `pending` (chưa duyệt) hoặc `rejected` (đã từ chối) tuyệt đối không được đưa vào prompt.
- **Bộ kiểm tra tuân thủ (`glossaryCompliance.ts`)**: Kiểm tra tự động bằng luật xem bản dịch có chứa bản dịch đích (`target`) của thuật ngữ đã khớp hay không, và phát hiện sự xuất hiện của thuật ngữ bị cấm.
- **Kênh IPC cho Thuật ngữ**: Các kênh CRUD và thao tác duyệt/từ chối, cùng kênh nhập tệp `Names.txt` (định dạng `Nguồn=Đích`).
- **Giao diện màn Thuật ngữ (`GlossaryScreen`)**: Thay thế minh họa tĩnh `ContextAreaMock` bằng giao diện bảng/danh sách thuật ngữ thật, có tìm kiếm, bộ lọc trạng thái, form thêm/sửa, modal nhập file `Names.txt`.

## Capabilities

### New Capabilities
- `story-glossary`: Lưu trữ và truy vấn danh mục thuật ngữ cấp tác phẩm trong SQLite (`.mira`): hỗ trợ dạng viết khác (alias), thuật ngữ cấm (forbidden), hiệu lực theo chương, trạng thái duyệt và nhập từ file `Names.txt`.
- `glossary-screen`: Màn hình giao diện Thuật ngữ thật trong khu vực Ngữ cảnh: hiển thị danh sách, phân trang/tìm kiếm, tạo, sửa, xóa, duyệt/loại và nhập dữ liệu.

### Modified Capabilities
- `translation-core`: Tiếp nhận danh sách thuật ngữ đã khớp để chèn vào Tầng C của prompt, tính `contextHash`, bảo đảm mục chưa duyệt không rời máy.

## Impact

- **Storage**: Nâng cấp version schema tác phẩm trong `src/main/infra/storage/workSchema.ts` (thêm bảng `context_entry`, `context_alias`), migration an toàn không ảnh hưởng dữ liệu cũ.
- **Core Algorithms**: Bổ sung `src/shared/algorithms/contextMatching.ts`, `src/shared/algorithms/glossaryCompliance.ts`, `src/shared/algorithms/namesParser.ts`.
- **Services & IPC**: Bổ sung `src/main/services/context/glossaryService.ts`, tích hợp vào `src/main/ipc/libraryHandlers.ts` và `src/shared/contracts/channels.ts`.
- **Renderer**: Thay thế `ContextAreaMock` tại tab Ngữ cảnh bằng `GlossaryScreen` có đầy đủ tính năng tương tác.
- **Tài liệu**: Cập nhật handbook changelog, roadmap, và trạng thái triển khai.
