## Why

Luồng dịch chương hiện tại (`ChapterTranslator` và `openAiCompatible.ts`) phân lô sơ sài theo số ký tự,
không bảo toàn ID đoạn khi model gộp hoặc tách dòng, thiếu cơ chế đối soát ID xác định, và chưa tách
lỗi hạ tầng mạng khỏi lỗi cú pháp model. Prompt dịch còn mỏng và chưa có cấu trúc phân tầng ngữ cảnh
(A/B/C) cũng như bộ đệm hash. Cần tái cấu trúc thành một Lõi dịch độc lập (`translation-core`) xử lý
đoạn theo ID tạm `[n]`, phân lô an toàn, parse khoan dung, sửa đúng phần lỗi và cung cấp bằng chứng đo lường T0.

## What Changes

- Chuẩn hóa runner dịch của Bộ đo (`scripts/bench/translate.run.ts`) theo API hiện hành và tích hợp chạy kiểm mock vào gate.
- Tách toàn bộ logic lập lô (planner), sinh prompt có hash/version, phân tích phản hồi (parser khoan dung), đối soát ID và vòng sửa lỗi thành service riêng (`services/ai/translate/`).
- Ánh xạ ID tạm `[n]` theo từng lời gọi API để bảo vệ cấu trúc đoạn văn bản và ghép lại đúng ID nguồn ban đầu.
- Tách biệt lỗi hạ tầng (429, timeout do gateway xử lý retry) khỏi lỗi nội dung/cú pháp (thiếu/hỏng ID được hỏi lại đích danh một lần).
- Cập nhật `ChapterTranslator` thành adapter kết nối kho lưu trữ app với Lõi dịch mới, giữ nguyên nguyên tắc không ghi đè chữ người dùng.
- Thêm cơ chế đo lường tham số (thinking, temperature, output limit) và cấu hình ngữ cảnh tối thiểu theo từng nguồn ngôn ngữ (ZH/JA/EN).

## Capabilities

### New Capabilities
- `translation-core`: Lõi dịch nhận đơn vị `{id, text}`, ánh xạ ID tạm `[n]`, phân lô theo token/số đoạn, parse khoan dung, đối soát ID, sửa lỗi cục bộ và tính usage/contextHash.

### Modified Capabilities
- `ai-translate-chapter`: `ChapterTranslator` đóng vai trò adapter chuyển đổi giữa cấu trúc lưu trữ của app và `translation-core`, giữ giao diện hiển thị ước lượng, tiến độ và xử lý hàng bảo vệ.

## Impact

- Mã nguồn: thêm module `src/main/services/ai/translate/`, sửa `src/main/services/ai/chapterTranslation.ts`, thu hẹp `src/main/infra/providers/openAiCompatible.ts` về vai trò transport/chat.
- Công cụ đo: sửa `scripts/bench/translate.run.ts`, thêm kiểm mock tự động trong `scripts/check.mjs`.
- Không làm thay đổi schema SQLite hay phá vỡ giao diện IPC hiện có.
