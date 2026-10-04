## Context

Trong hệ thống ngữ cảnh đa tầng của Mira ([nghiên cứu ngữ cảnh đợt 1 & 2](../../../docs/handbook/research/story-context.md)), prompt của Lõi dịch được chia làm ba tầng:
- Tầng A: Brief tác phẩm và quy ước chung (ổn định cả tác phẩm).
- Tầng B: Dàn nhân vật và ma trận xưng hô đối thoại (ổn định trong phạm vi từng chương).
- Tầng C: Thuật ngữ đã khớp và các đoạn liền trước (biến thiên theo từng lô).

Module 3 vừa hoàn thành việc quản lý thuật ngữ và tiêm vào Tầng C. Module 4 tiếp tục lát cắt thứ 2 của `context-core` để hiện thực hóa Tầng B với danh tính nhân vật (`character`) và quan hệ xưng hô đối thoại có chiều (`dyad`).

## Goals / Non-Goals

**Goals:**
- Tận dụng cấu trúc bảng `context_entry` đã hỗ trợ sẵn `kind IN ('term', 'character', 'dyad', ...)` ở SQLite schema v6, không cần tăng version schema.
- Hỗ trợ lưu trữ và quản lý nhân vật (`character`) cùng các dạng viết/bí danh (`context_alias`).
- Hỗ trợ lưu trữ ma trận xưng hô có chiều (`dyad`): $A \to B$ định nghĩa từ tự xưng và từ gọi đối phương; $B \to A$ là bản ghi độc lập.
- Lọc xưng hô có hiệu lực theo chương dựa trên vị trí thứ tự của chương (`chapter.number`).
- Tiêm ma trận xưng hô đã duyệt vào Tầng B của Prompt Builder trong Lõi dịch và cập nhật `contextHash`.
- Cung cấp hàm kiểm tra tuân thủ xưng hô thuần (`addressingCompliance.ts`) để gắn cờ cảnh báo nhẹ.
- Xây dựng màn hình `AddressingScreen` thật thay thế cho mockup tab "Xưng hô" trong `ContextAreaMock.tsx`.

**Non-Goals:**
- AI tự động trích xuất nhân vật từ văn bản (thuộc Module 10: Ngữ cảnh tự động).
- Phân tích cú pháp câu thoại phức tạp bằng NLP/LLM để khẳng định 100% người nói/người nghe trong cảnh ba người (chỉ kiểm tra từ vựng đại từ bằng luật).
- Tự động đảo ngược từ xưng hô khi người dùng chỉ mới nhập một chiều (vi phạm nguyên tắc quan hệ có chiều).

## Decisions

### 1. Mô hình dữ liệu trong bảng `context_entry` (Schema v6)

**Quyết định:** Sử dụng bảng `context_entry` và `context_alias` hiện có của schema v6:
- Đối với `kind = 'character'`:
  - `source`: Tên gốc nhân vật (ví dụ: `韩立`).
  - `target`: Tên dịch tiếng Việt (ví dụ: `Hàn Lập`).
  - `notes`: JSON string chứa thông tin mở rộng `{ gender?: 'male' | 'female' | 'other', role?: string }`.
  - Bí danh lưu trong `context_alias`.
- Đối với `kind = 'dyad'`:
  - `source`: `characterA_id` (ID nhân vật người nói).
  - `target`: `characterB_id` (ID nhân vật người nghe).
  - `notes`: JSON string chứa chi tiết xưng hô `{ speakerPronoun: string, recipientPronoun: string, formality?: string }`.
  - `from_chapter_id`, `to_chapter_id`: Khoảng chương có hiệu lực.
  - `status`: `'approved' | 'pending' | 'rejected'`.

*Lý do:* Schema v6 đã được thiết kế sẵn với trường `kind` hỗ trợ đa dạng mục ngữ cảnh. Việc sử dụng schema v6 tránh migration không cần thiết, giữ nguyên snapshot fixture và duy trì tính ổn định của cơ sở dữ liệu.

### 2. Định dạng Tầng B trong Prompt Builder

**Quyết định:** Trong `promptBuilder.ts`, bổ sung hàm `formatAddressingLayerB(dyads, characterMap)`. Nếu có các cặp xưng hô hợp lệ, xuất ra khối:
```
[QUY ƯỚC XƯNG HÔ & ĐỐI THOẠI TRONG CHƯƠNG]
- Hàn Lập -> Nam Cung Uyển: Hàn Lập tự xưng "ta", gọi Nam Cung Uyển là "nàng" / "sư muội".
- Nam Cung Uyển -> Hàn Lập: Nam Cung Uyển tự xưng "thiếp", gọi Hàn Lập là "chàng" / "sư huynh".
```
Nếu không có cặp nào hiệu lực trong chương, khối này được bỏ qua để tiết kiệm token.

*Lý do:* Rõ ràng, trực quan, LLM dễ nắm bắt vai vế và chiều xưng hô của từng người khi dịch lời thoại.

### 3. Nguyên tắc bảo vệ quyền riêng tư (Privacy Guard)

**Quyết định:** Tương tự như thuật ngữ, chỉ những mục `character` và `dyad` có `status = 'approved'` mới được đưa vào Prompt Layer B. Bất kỳ mục nào đang `pending` hoặc `rejected` tuyệt đối không được đưa vào prompt gửi ra ngoài.

### 4. Giao diện Người dùng (AddressingScreen)

**Quyết định:** Màn hình Xưng hô chia làm 2 khu vực rõ ràng:
1. **Quản lý Nhân vật:** Danh sách nhân vật (tên, giới tính, vai vế, aliases) với thao tác thêm, sửa, xóa.
2. **Ma trận Xưng hô:** Hiển thị danh sách/lưới quan hệ giữa các nhân vật với bộ lọc theo chương ("Tất cả" hoặc chọn chương cụ thể). Bấm vào để chỉnh sửa từ tự xưng và từ gọi đối phương.

## Risks / Trade-offs

- **[Risk]** Truy vấn hiệu lực chương cho nhiều cặp quan hệ có thể chậm nếu tác phẩm có hàng trăm nhân vật.
  - *Mitigation:* Lọc `approved` trước, lập `Map` ID nhân vật trong bộ nhớ và truy vấn số thứ tự chương qua chỉ mục `chapter_number`.
- **[Risk]** Kiểm tra xưng hô bằng luật trong tiếng Việt có thể báo nhầm (false positive) do hiện tượng đa nghĩa của đại từ ("anh", "chị", "em", "nó").
  - *Mitigation:* Bộ kiểm tra chỉ đưa ra cờ cảnh báo thông tin (severity `info`/`warning`), không chặn lưu hoặc ép hỏi lại mô hình.
