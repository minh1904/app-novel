# Báo cáo nghiệm thu — App Agent Foundation

Ngày: 2026-10-11 · Trạng thái: **Đã nghiệm thu thành công**  
Phạm vi: OpenSpec change `app-agent-foundation` (Module 0 đến 8).

---

## 1. Mục tiêu nghiệm thu

Xác thực nền tảng trợ lý AI cấp ứng dụng (app-wide agent foundation) thay thế kiến trúc phiên gắn chặt theo tác phẩm và cơ chế ghi proposal-only cũ:
- Quản lý phiên, lượt và hoạt động tập trung tại `library.db`.
- Target resolver phân giải mục tiêu tất định theo ngữ cảnh hoặc chỉ định rõ ràng.
- Ghi trực tiếp qua operation có write lease, batch journal, checkpoint và khả năng hoàn tác (Undo).
- Trải nghiệm giao diện: đổi tác phẩm không mất phiên, streaming mượt không giật, cuộn thông minh, hiển thị token usage thật từ provider.

---

## 2. Kết quả kiểm tra theo các kịch bản UI & Tích hợp

### Kịch bản 1: Đổi tác phẩm không mất phiên (App-wide Session)
- **Kiểm tra**: Mở phiên trợ lý AI, gửi yêu cầu trong ngữ cảnh Tác phẩm A, chuyển qua xem Tác phẩm B trong Thư viện, sau đó quay lại Trợ lý.
- **Kết quả**: Đạt (Pass).
  - Trợ lý AI được đưa lên cấp ứng dụng (`src/renderer/src/modules/agent/`) và mount ở `AppContent.tsx`.
  - Phiên và các lượt hội thoại được lưu tại `library.db` (`agent_session`, `agent_turn`).
  - Toàn bộ lịch sử trao đổi và tiến trình hoạt động được giữ nguyên vẹn khi chuyển đổi workspace tab hoặc quay về màn Home.

### Kịch bản 2: Streaming Delta & Tiến độ không giật
- **Kiểm tra**: Mô phỏng stream hàng trăm delta từ provider và stream tiến độ xử lý lô của operation.
- **Kết quả**: Đạt (Pass).
  - `DeltaBuffer` (`DeltaBuffer.ts`) điều tiết nhịp commit theo ngưỡng 40ms, khoá Markdown block hoàn chỉnh và xử lý tail fence an toàn cho các khối mã chưa đóng.
  - `OperationCard` hiển thị tiến độ tăng dần theo từng lô (`appliedUnits / totalUnits`) mượt mà, không giật lag DOM.
  - Transcript chỉ chứa tóm tắt và thẻ thao tác tiến độ, không render toàn văn bản dịch vào luồng hội thoại.

### Kịch bản 3: AutoScrollSentinel (Tự động cuộn thông minh)
- **Kiểm tra**: Người dùng cuộn lên xem lịch sử khi agent đang stream; người dùng ở đáy transcript khi stream; kiểm tra cấu hình reduced-motion.
- **Kết quả**: Đạt (Pass).
  - Khi khoảng cách tới đáy `< 80px`, danh sách tự động cuộn theo nội dung mới.
  - Khi người dùng cuộn lên trên (`distance >= 80px`), sentinel ngắt tự cuộn ngay lập tức để không cướp tầm nhìn của người dùng.
  - Hiển thị nút "Nội dung mới" để người dùng chủ động quay lại chân trang khi muốn.
  - Tôn trọng thuộc tính hệ thống `prefers-reduced-motion` (dùng `behavior: 'auto'` thay vì `'smooth'`).

### Kịch bản 4: Mở đích đúng chương (Open Target)
- **Kiểm tra**: Thực hiện thao tác dịch chương khác hoặc chương ở tác phẩm khác, bấm nút "Mở đích" trên `OperationCard`.
- **Kết quả**: Đạt (Pass).
  - `workspaceAgentAdapter.openTarget` nhận đúng `ResolvedTarget` (`workId`, `chapterId`).
  - Giao diện điều hướng chính xác đến tác phẩm và chương mục tiêu.

### Kịch bản 5: Hoàn tác (Undo) và Bảo vệ xung đột (Revision Conflict)
- **Kiểm tra**:
  1. Thao tác dịch hoàn tất → bấm Hoàn tác → bản dịch được đưa về trạng thái `before_content`.
  2. Thao tác dịch hoàn tất → người dùng chỉnh sửa bản dịch trong editor → bấm Hoàn tác.
- **Kết quả**: Đạt (Pass).
  - Trạng thái checkpoint chuyển thành `undone`, văn bản khôi phục nguyên vẹn về bản lưu trước đó.
  - Khi bản dịch đã bị sửa sau khi agent ghi (`current.rev !== last_applied_rev`), hệ thống chặn hoàn tác và báo lỗi xung đột (`StorageError: conflict`), bảo vệ an toàn thay đổi của người dịch.

### Kịch bản 6: Usage và Chi phí thực tế từ Provider
- **Kiểm tra**: Nhận phản hồi hoàn tất từ provider có usage đầy đủ; provider báo thiếu; provider không báo usage.
- **Kết quả**: Đạt (Pass).
  - Hiển thị token chi tiết: Input (uncached + cached read/write), Output, Reasoning.
  - Khi một lượt phụ thiếu usage, hiển thị nhãn trạng thái chưa đầy đủ.
  - Khi provider không báo usage, hiển thị ký hiệu `—` và ghi rõ không suy đoán.
  - Bỏ hoàn toàn token ước lượng và counter live suy đoán khỏi UI sản phẩm.

---

## 3. Kết luận

Toàn bộ 6 kịch bản kiểm thử tích hợp và giao diện thực tế đều đạt tiêu chuẩn chất lượng và đáp ứng đúng quy cách thiết kế của OpenSpec change `app-agent-foundation`.
