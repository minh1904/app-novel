## Context

Theo [ADR-005](../../../docs/handbook/decisions/0005-ai-first-proposals-no-sentence-mode.md) và [lộ trình](../../../docs/handbook/delivery/roadmap.md), ngữ cảnh truyện được chia nhỏ để ưu tiên phục vụ chất lượng dịch trước khi chuyển đổi toàn bộ mô hình dữ liệu câu sang đoạn. Module 3 (Thuật ngữ) là lát cắt đầu tiên của hệ thống ngữ cảnh, tập trung toàn diện vào `term`: từ schema SQLite, thuật toán so khớp, chèn prompt Tầng C, kiểm tra tuân thủ cho đến giao diện người dùng.

## Goals / Non-Goals

**Goals:**
- Nâng cấp schema tác phẩm (`.mira`) lên version 6, bổ sung bảng `context_entry` và `context_alias`.
- Cài đặt bộ phân tích cú pháp tệp `Names.txt` (`namesParser.ts`) chuẩn xác, chịu lỗi tốt.
- Cài đặt hàm thuần so khớp thuật ngữ (`contextMatching.ts`) tối ưu cho cả CJK và Latin.
- Chèn các thuật ngữ đã duyệt và khớp vào Tầng C của `buildTranslateSystemPrompt()`.
- Cài đặt hàm kiểm tra tuân thủ thuật ngữ thuần (`glossaryCompliance.ts`).
- Cung cấp đầy đủ kênh IPC và giao diện màn Thuật ngữ (`GlossaryScreen`) thay thế mockup tạm.

**Non-Goals:**
- Chưa xử lý nhân vật (`character`) và ma trận xưng hô (`dyad`) — thuộc Module 4 (Xưng hô).
- Chưa triển khai AI tự trích xuất thuật ngữ từ chương raw (thuộc Module 10).
- Chưa đổi đơn vị ghi của app từ câu/segment sang đoạn (thuộc Module 5: Đề xuất).

## Decisions

### D1. Cấu trúc bảng `context_entry` và `context_alias`
- **Quyết định**: Dùng một bảng `context_entry` dùng chung cho các kiểu ngữ cảnh với cột `kind` (`term`, `character`, `dyad`, `world`, `style`, `summary`). Trong module này, chỉ mở và sử dụng `kind = 'term'`. Bảng `context_alias` lưu các biến thể dạng viết của thuật ngữ và có khóa ngoại `REFERENCES context_entry(id) ON DELETE CASCADE`.
- **Lý do**: Cho phép tái sử dụng cấu trúc lưu trữ và index thống nhất khi mở rộng sang Xưng hô ở module tiếp theo mà không cần migration thêm bảng nhiều lần.

### D2. Quy ước hiệu lực theo chương
- **Quyết định**: `from_chapter_id` và `to_chapter_id` trỏ tới `chapter(id)` với `ON DELETE SET NULL`. Giá trị `NULL` mang ý nghĩa "từ đầu tác phẩm" hoặc "cho tới hết tác phẩm".
- **Lý do**: Tránh mất mục thuật ngữ khi người dùng xóa một chương làm mốc, đồng thời truy vấn đơn giản bằng việc so sánh `position` của chương.

### D3. Chiến lược so khớp thuật ngữ
- **Quyết định**:
  - Tiếng Trung và Tiếng Nhật: Khớp chuỗi con, sắp xếp theo độ dài giảm dần (longest-match first) để ưu tiên cụm từ dài trước từ đơn lẻ (ví dụ: "Thiên Lam Tông" trước "Thiên Lam"). Chặn từ khóa < 2 ký tự trừ khi được đánh dấu ép khớp.
  - Tiếng Anh: Bọc ranh giới từ `\b` regex để tránh khớp nhầm vào giữa từ (ví dụ: `Ash` không khớp trong `Flash`). Chặn từ khóa < 3 ký tự trừ khi được ép khớp.

### D4. Bảo vệ dữ liệu chưa duyệt (Pending Privacy)
- **Quyết định**: Chỉ các mục có `status = 'approved'` mới được đưa vào danh sách khớp để gửi cho AI. Mục `pending` (chờ duyệt) và `rejected` (từ chối) bị chặn tuyệt đối ở tầng service trước khi lắp prompt.
- **Lý do**: Tuân thủ nguyên tắc "dữ liệu chưa duyệt không rời máy" đã chốt trong handbook.

### D5. Định dạng tệp `Names.txt`
- **Quyết định**: Chấp nhận cú pháp `Nguồn=Đích` phân tách theo dòng. Cho phép dấu cách quanh dấu `=`, bỏ qua dòng trống và dòng bắt đầu bằng `#` hoặc `//`. Bỏ qua các mục bị trùng nguồn hoặc đã tồn tại trong tác phẩm.

## Risks / Trade-offs

- **[Risk]**: Số lượng thuật ngữ trong một chương quá lớn dẫn tới vượt trần token của Tầng C.
  - **Mitigation**: Áp dụng trần tối đa (ví dụ: 100 mục thuật ngữ khớp nhất mỗi lô) và cắt tỉa theo thứ tự độ dài/tần suất xuất hiện nếu chạm ngưỡng.
- **[Risk]**: Nâng cấp schema làm hỏng các tệp tác phẩm v5 cũ.
  - **Mitigation**: Viết test migration kiểm tra nâng cấp tuần tự từ v5 lên v6 trong `workSchema.test.ts` đảm bảo dữ liệu cũ giữ nguyên vẹn.
