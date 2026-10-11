## Why

Panel AI hiện bị khóa vào tác phẩm và chương đang mở, chỉ tạo đề xuất chờ duyệt và có thể trả cả bản dịch dài vào transcript thay vì thực hiện công việc. Mira cần một agent cấp ứng dụng: vị trí hiện tại chỉ là ngữ cảnh ưu tiên, còn mỗi yêu cầu được giải quyết thành đích và capability rõ ràng, thực hiện an toàn, có tiến độ và hoàn tác.

## What Changes

- **BREAKING:** chuyển phiên mới từ phạm vi tác phẩm sang phạm vi ứng dụng; đổi tác phẩm hoặc chương không đổi phiên.
- Tách `context` lúc gửi khỏi `target` thực tế của từng operation. Agent được đọc và thao tác chương khác với chương đang mở, và được nhắm tác phẩm khác khi người dùng nêu rõ.
- Thêm resolver tác phẩm/chương có kết quả xác định; đích mơ hồ phải hỏi lại và không được ghi.
- Thay các tool chỉ tạo đề xuất bằng capability sản phẩm có kiểm soát. Hỏi chỉ trả lời trong chat; yêu cầu dịch/sửa rõ ràng được thực hiện trực tiếp qua service của Mira.
- Thêm capability dịch một chương từ chat bằng pipeline dịch chuyên dụng. Bản dịch nằm trong editor, transcript chỉ hiện activity, tiến độ và kết quả ngắn.
- Phối hợp operation ghi với editor đang mở bằng write intent/lease, flush dirty state và refresh một lần ở revision cuối để tránh autosave hoặc nội dung RAM ghi đè kết quả Agent.
- **BREAKING:** lượt mới không tạo proposal chờ duyệt và không hiện Accept/Deny. Hệ thống vẫn tạo checkpoint, kiểm revision, ghi transaction, lưu provenance và cung cấp Hoàn tác. Proposal cũ tiếp tục đọc được.
- Thao tác phá hủy, khó hoàn tác hoặc có side effect bên ngoài phải xác nhận; thao tác nội bộ có checkpoint được thực hiện ngay.
- Thay dòng tool hiện tại bằng activity timeline thống nhất cho thinking, đọc, thực hiện, tiến độ, lỗi và kết quả; tối ưu delta streaming để không giật hoặc cưỡng bức cuộn.
- Chỉ hiển thị token do provider báo. Không có usage thì hiện không có số liệu; không hiển thị token giả hoặc ước lượng như số thật. Chi phí tính từ usage thật vẫn phải ghi là ước tính theo bảng giá.
- Bỏ số token/chi phí hard-code khỏi các màn sản phẩm và bỏ token ước lượng trước khi dịch; trước khi chạy chỉ hiện đơn vị công việc như số đoạn và số lô.
- Phạm vi change này là nền dọc chạy được cho session toàn ứng dụng, đọc cross-work, dịch/áp dụng một chương, activity streaming, usage thật và undo. Dịch nhiều chương bền qua lần khởi động, source, export và capability hàng loạt là change tiếp theo.

Change này kế tiếp mã đã triển khai bởi `agentic-chat`, nhưng thay các quyết định chưa nghiệm thu của change đó về session theo tác phẩm, tool ghi chỉ tạo proposal và thẻ Accept/Deny. Trước khi implementation bắt đầu, `agentic-chat` phải được rút khỏi tập change active như một kế hoạch superseded — không archive hoặc merge delta chưa hoàn tất — để chỉ foundation này định nghĩa contract đích.

## Capabilities

### New Capabilities

- `app-agent-session`: phiên toàn ứng dụng, context theo lượt, target/operation bền và khả năng tiếp tục khi đổi tác phẩm.
- `app-agent-actions`: resolve đích, phân loại hỏi/thực hiện, dịch và áp dụng một chương qua service chuyên dụng, checkpoint, conflict và undo.
- `app-agent-activity`: thinking, activity timeline, progress và answer streaming ổn định trong panel agent.
- `provider-reported-usage`: cách ghi, cộng dồn và hiển thị token do provider báo cùng chi phí tính từ usage thật.

### Modified Capabilities

- `ai-chat-tools`: bỏ ràng buộc mọi tool vào tác phẩm đang mở; tool đọc/ghi trở thành capability có target rõ, giới hạn chi phí và activity có cấu trúc.

## Impact

- **Storage:** migration `library.db` cho session/turn/operation cấp ứng dụng; liên kết mềm tới work/chapter; checkpoint cùng batch journal và nội dung vẫn thuộc DB tác phẩm. Dữ liệu phiên cũ được import kèm mapping từng turn để proposal legacy tiếp tục định tuyến về DB gốc. `library.db` trở thành dữ liệu bền, cần backup migration/recovery và không được silent recreate.
- **Shared contracts:** thay `ChatSendInput`/`ChatChunk` bằng context, target resolution, operation, activity, progress, undo và usage chi tiết; giữ DTO đọc lịch sử cũ.
- **Main services:** tách agent orchestration khỏi `ChatService`, thêm resolver qua `WorkFiles`, registry capability và adapter gọi `ChapterTranslationService`; không cấp SQL, shell, filesystem hay IPC tổng quát cho model.
- **IPC/preload:** API session toàn ứng dụng, stream activity/operation và undo; renderer không được truyền primitive ghi tổng quát.
- **Renderer:** chuyển assistant khỏi ownership workspace sang module agent do app composition root mount; panel không đổi phiên theo work, có activity timeline, streaming buffer, trạng thái tác vụ và hành động Mở đích/Hoàn tác; ẩn proposal mới.
- **Usage/UI:** mở rộng `TokenUsage` để phân biệt tổng input với breakdown uncached/cache/reasoning và source; bỏ estimate khỏi `AiTranslateDialog` và dữ liệu token hard-code khỏi Home/Jobs.
- **Documentation:** cập nhật module Đề xuất và phiên AI, AI connections, workspace và tài liệu quyết định bằng tiếng Việt sau khi hành vi được triển khai.
