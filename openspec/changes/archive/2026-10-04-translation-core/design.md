## Context

Mã dịch ban đầu đặt trực tiếp trong `src/main/infra/providers/openAiCompatible.ts` và được gọi qua `ChapterTranslator`.
Bộ đo offline đã hoàn thành hạ tầng với các bài kiểm tra T0 tất định. Để cải thiện chất lượng dịch thực tế,
cần tách lõi dịch thành các hàm thuần và dịch vụ riêng biệt (`services/ai/translate/`), xử lý ID tạm thời
để tránh lỗi mô hình bỏ sót hoặc gộp đoạn, đồng thời cập nhật runner của Bộ đo để có baseline mới chính xác.

## Goals / Non-Goals

**Goals:**
- Chuẩn hóa runner của Bộ đo (`scripts/bench/translate.run.ts`) để tương thích với API hiện hành của `LibraryStore` và `ChapterTranslator`, tích hợp kiểm tra chạy bằng mock vào `check.mjs`.
- Xây dựng kiến trúc Lõi dịch (`translation-core`) gồm các thành phần độc lập:
  - `planner`: Chia lô theo số đoạn và trần token an toàn.
  - `prompt`: Tạo system/user prompt có version/hash, hỗ trợ các tầng ngữ cảnh A/B/C.
  - `parser`: Phân tích cú pháp JSON khoan dung (loại bỏ markdown, xử lý dấu phẩy thừa, unescape).
  - `reconciler`: Đối soát tập ID gửi đi và nhận về, phát hiện ID thiếu/lạ/trùng.
  - `repair`: Hỏi lại đúng các ID bị thiếu hoặc lỗi nội dung một lần duy nhất.
- Đảm bảo `ChapterTranslator` hoạt động như một adapter an toàn, không làm hỏng dữ liệu hoặc thay đổi hành vi lưu trữ hiện tại.

**Non-Goals:**
- Không thay đổi bảng lưu trữ SQLite hay bỏ cấu trúc segment trong app (thuộc module Đề xuất và Gỡ Từng câu).
- Không xây dựng giao diện duyệt đề xuất hay bảng thuật ngữ/xưng hô trong change này (thuộc module 3, 4, 5).
- Không tự động sửa bản dịch hoặc tự ý ghi đè các đoạn người dùng đã biên tập.

## Decisions

### Quyết định 1: Sử dụng ID tạm `[n]` trong payload gửi tới mô hình AI
- **Lý do**: Sử dụng ID UUID hoặc chuỗi dài từ database khiến mô hình dễ nhầm lẫn, tăng token prompt và dễ sinh sai định dạng. Sử dụng chỉ số tuần tự `[1]`, `[2]`, ... ngắn gọn, dễ kiểm soát, và giảm thiểu tối đa sai lệch khi mô hình sinh câu trả lời.
- **Phương án thay thế**: Dùng trực tiếp UUID nguồn (bị loại vì tốn token và tỷ lệ hallucinate cao hơn).

### Quyết định 2: Tách biệt hoàn toàn lỗi hạ tầng và lỗi nội dung
- **Lý do**: Lỗi hạ tầng (429 rate limit, 503 gateway, connection timeout) cần được xử lý ở tầng gateway bằng backoff/cooldown và chuyển đổi API key. Lõi dịch chỉ xử lý lỗi nội dung (JSON parse error, missing IDs) bằng cách gửi lại đúng các đơn vị hỏng 1 lần với lý do cụ thể.
- **Phương án thay thế**: Gom chung mọi lỗi để retry cả lô (bị loại vì gây lãng phí chi phí token và dễ lặp vô hạn khi gặp lỗi phân tích cú pháp).

### Quyết định 3: Parser khoan dung nhiều tầng
- **Lý do**: Mô hình AI thường bọc kết quả trong khối codeblock markdown (```json ... ```), có thể để sót dấu phẩy ở phần tử cuối, hoặc chứa ký tự xuống dòng chưa escape. Parser cần bóc tách các trường hợp này trước khi ném lỗi cú pháp.
- **Phương án thay thế**: Chỉ dùng `JSON.parse` chuẩn (bị loại vì tỷ lệ lỗi định dạng giả tăng cao).

### Quyết định 4: Adapter chuyển đổi cho `ChapterTranslator`
- **Lý do**: Cho phép toàn bộ hệ thống hiện tại tiếp tục hoạt động mà không bị gián đoạn; các bài kiểm tra giao diện và IPC hiện hành vẫn giữ nguyên tính đúng đắn trong khi tầng thuật toán cốt lõi được nâng cấp.

## Risks / Trade-offs

- **[Rủi ro]**: Kích thước lô quá lớn dẫn đến vượt trần token output của mô hình hoặc bị cắt cụt (`length`).
  → **Giảm thiểu**: Thiết lập ngưỡng an toàn kép (cả số đoạn và ước tính token đầu vào) trong planner; chia nhỏ đoạn khi cần.
- **[Rủi ro]**: Mô hình dịch gộp nhiều đoạn nguồn thành một đoạn đích duy nhất.
  → **Giảm thiểu**: Quy tắc prompt chặt chẽ yêu cầu 1-1 theo ID tạm `[n]`, bộ đối soát phát hiện thiếu ID và yêu cầu dịch lại đơn vị thiếu.

## Migration Plan

1. Mốc L0: Cập nhật runner dịch của Bộ đo (`translate.run.ts`) theo đúng API mới, thêm kiểm thử runner bằng mock provider.
2. Mốc L1: Viết module lõi dịch tại `services/ai/translate/`, cập nhật `ChapterTranslator` dùng lõi dịch qua adapter.
3. Chạy toàn bộ test suite (`node scripts/check.mjs`) bảo đảm 0 lỗi hồi quy.
