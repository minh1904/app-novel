## Context

Xem [proposal.md](proposal.md) và bốn delta spec trong `specs/`. Kho tác phẩm hiện ở SQLite schema v6, văn bản có `rev` và segment/link/provenance; `saveRow` là đường dịch chương cũ. Chat sống trong state của `AiPanel`; `chatReview.ts` dùng CodeMirror merge trên tài liệu đang mở, và `useAiChat` còn tự áp dụng khi pane trống. Lõi dịch đã nhận đơn vị `{id, text}` và có `contextHash`; Bộ đo đã dùng định nghĩa đoạn là mỗi dòng không trống.

## Goals / Non-Goals

**Goals:**

- Một đường tạo và duyệt đề xuất dùng chung cho chat Sửa và dịch một chương; mode Duyệt trước không đổi chữ tới Accept, mode Áp dụng thẳng tự Accept bằng cùng đường khi an toàn.
- Review theo phần với checkpoint và kiểm xung đột tại điểm ghi; panel/phiên tồn tại qua ẩn, chuyển chương và khởi động lại.
- Đầu vào chat minh bạch, câu trả lời đọc được; giữ đúng phần ngữ cảnh thật gửi và phạm vi sửa.

**Non-Goals:**

- JobRunner, chạy/tiếp tục dịch nhiều chương sau khi app tắt, trần chi phí tác vụ (Module 7).
- Xóa schema segment/link/provenance hoặc chuyển toàn editor sang `ai_mark` (Module 8).
- Xuất `.md`/`.txt` và QA theo đoạn (Module 6/9).

## Decisions

### 1. Schema v7 là phần bổ sung vào tệp tác phẩm

Thêm `ai_session`, `ai_turn`, `proposal`, `proposal_part` và `text_snapshot` vào `.mira` qua migration nguyên tử v6→v7. Tệp mỗi tác phẩm là ranh giới quyền; mọi truy vấn IPC vẫn nhận/kiểm `workId` và `chapterId`. `ai_turn` lưu câu hỏi, câu trả lời gốc, trạng thái, model/usage, snapshot ngữ cảnh và nhật ký tool đọc; không lưu khóa. `proposal` lưu nguồn sinh, chương, phiên/lượt, source revision/hash, target base revision và một base snapshot của bên dịch; `proposal_part` lưu chữ trước/sau, vùng neo trên base, thứ tự nguồn, trạng thái/quyết định. `text_snapshot` là checkpoint **trước Accept**; nó không đồng nghĩa với base snapshot của đề xuất.

Chọn bảng con cho phần diff vì một lần dịch chương có nhiều phần cần quyết định độc lập và phục hồi được. Tránh lưu diff chỉ trong JSON blob: việc cập nhật từng quyết định và đếm pending sẽ khó kiểm tra nguyên tử. Giữ segment/link cũ nguyên vẹn đến Module 8; migration không suy ra proposal từ bản dịch AI cũ.

### 2. Đề xuất được tạo từ snapshot lúc gửi yêu cầu

Trước khi gọi model, chụp văn bản nguồn/đích hiện hành, revision và phạm vi sửa. Với editor có chữ chưa lưu, snapshot phải lấy đúng live buffer và yêu cầu lưu rõ ràng trước một hành động có thể ghi xuống kho; không giả vờ revision kho đã chứa chữ vừa gõ. Khi kết quả về, ghi đề xuất từ snapshot đó cùng nội dung AI và metadata context; không đọc lại pane hiện tại làm base. Kết quả stream thiếu, fence không hợp lệ hoặc `finishReason` báo cắt không thành đề xuất.

Chat Sửa tạo một đề xuất cho vùng được nhắm. Dịch chương tạo một nhóm đề xuất cho chương từ các đoạn nguồn theo thứ tự; từng kết quả hợp lệ được lưu bền theo khóa idempotent của lần chạy/đoạn. Nếu một lô lỗi hoặc người dùng hủy, phần đã trả được giữ; phần chưa đủ dữ liệu/không có neo đích chắc chắn được đánh dấu `needs-placement` và không thể Accept tự động. Người dùng có thể retry phần lỗi; Module 5 không tự chạy tiếp sau khi app tắt. Với pane trống, thứ tự đoạn nguồn là thứ tự chèn của các phần, kể cả khi nhiều phần cùng có base rỗng. Với pane đã có chữ, chỉ tạo phép thay vùng tự động khi mapping duy nhất; nếu không, review cho người dùng đặt đích rõ ràng hoặc xem bản dịch cả chương như một ứng viên, tuyệt đối không ghép theo chỉ số đoạn đích mù quáng.

Phương án thay thế là một đề xuất toàn chương duy nhất. Nó đơn giản hơn nhưng làm Accept/Deny từng đoạn và giữ phần thành công khi lỗi khó hiểu; vì vậy chọn đề xuất có phần con và thứ tự rõ.

### 3. Review là lớp đọc trên tài liệu canonical

Chính sách ghi là thuộc tính của **từng lượt**, không phải mode Hỏi/Sửa giữ trên panel hay trạng thái ngầm theo pane trống. Nút Gửi tạo câu trả lời để đọc. Hai hành động viết ngay lúc gửi là Tạo đề xuất (mặc định chờ duyệt) và Áp dụng thẳng; cả hai hiển thị đích sửa trước khi gửi. Dịch chương cho chọn Duyệt trước hoặc Áp dụng thẳng, mặc định Duyệt trước. Sau khi đề xuất được lưu bền, lựa chọn Áp dụng thẳng gọi cùng service Accept/Accept all cho phần có đích xác định. Kết quả xung đột, source đổi, phần chưa neo hoặc editor có draft chưa lưu ở lại hàng chờ; panel nêu rõ phần đã tự áp dụng và phần cần duyệt. Quyết định tự Accept được ghi với tác nhân `auto` và hành động gốc để người dùng có thể xem/hoàn tác. Chọn hành động khác cho lượt sau không đổi chính sách của lượt đang chạy.

Pane dịch tiếp tục hiển thị chữ thật từ editor/kho. Lớp review trình bày chữ AI chèn/xóa và các nút Accept/Deny cạnh phần liên quan; nó không dispatch bản ứng viên vào tài liệu canonical khi chỉ mở review. Có thể tận dụng thuật toán/kiểu diff của `@codemirror/merge`, nhưng không dùng hành động mặc định nếu hành động đó làm đổi doc trước giao dịch Accept. Chỉ hiển thị phần trong viewport cần thiết cho chương dài. Sau khi IPC Accept thành công, nạp lại revision/chữ mới và cập nhật decoration; không hiển thị “đã nhận” chỉ dựa trên click ở renderer.

Một nút Deny chỉ đổi `proposal_part.status`; chữ giữ nguyên. Duyệt từng phần làm đề xuất tổng ở trạng thái `partial` tới khi mọi phần quyết định xong. Panel và danh sách chương dùng cùng query đếm pending, không giữ bộ đếm riêng trong React.

### 4. Accept và Accept all dùng một hàm lập kế hoạch ghi

Main đọc `target` hiện hành và tất cả phần được chọn trong một transaction. Với revision/base còn khớp, dùng vùng neo ban đầu; khi revision đã đổi, chỉ tìm lại bằng nội dung cùng neo lân cận nếu kết quả duy nhất. Trường hợp đích rỗng có nhiều phần từ cùng run dùng thứ tự đoạn nguồn và một kế hoạch chèn chung. Đề xuất từ nhiều run cùng base rỗng cạnh tranh nhau: sau khi một run được nhận, run còn lại phải review lại, không tự chèn nối đuôi. Chữ đã sửa, vị trí trùng, nguồn đã đổi hoặc phần chồng lấn chuyển `conflict`/`stale` và không vào kế hoạch ghi.

Accept all khóa phạm vi **chương đang mở**, tính mọi phần hợp lệ trên cùng bản hiện hành, sắp thay đổi từ offset cao xuống thấp, rồi ghi văn bản một lần, checkpoint một lần và quyết định trong cùng transaction. Phần bị bỏ qua vẫn pending/conflict với lý do. Lệnh có ID idempotent để retry IPC không lặp thay đổi. Nếu người dùng đang có chữ chưa lưu, hiện lựa chọn lưu trước hoặc hủy duyệt; không tự flush. Module 7 sẽ có một hành động riêng cho phạm vi lượt dịch, không dùng lại nhãn/nút Accept all của chương.

Checkpoint ghi `beforeRev`, `afterRev`, văn bản trước và các quyết định bị tác động. Hành động Hoàn tác gần nhất dùng transaction kiểm `afterRev` còn là revision hiện tại, phục hồi văn bản và quyết định rồi tăng revision mới; checkpoint vẫn là dấu vết, không xóa lịch sử. Nếu đã có chữ mới sau Accept, chỉ báo xung đột. Phím Ctrl+Z trong editor có thể nối tới hành động này khi review còn mở; nút Hoàn tác luôn là đường rõ ràng, dùng được sau khi mở lại app.

Phương án áp từng phần rồi tăng `rev` giữa vòng bị loại vì tạo xung đột giả cho các phần cùng base. Phương án tự nhận theo vị trí dòng hiện tại bị loại vì hai đoạn trùng có thể khiến ghi sai mà không báo.

### 5. Phiên chat độc lập với vòng đời panel

Tách controller phiên khỏi component `AiPanel`: phiên hiện chọn nằm ở cấp tác phẩm; dữ liệu bền lấy từ main, panel chỉ giữ draft/scroll/độ rộng. Tạo phiên mới không xóa phiên trước. Lượt đã hoàn tất lưu cả raw answer và ngữ cảnh. Lượt đang stream lưu tiến độ theo các batch nhỏ; khi khởi động lại, mọi lượt `running` chuyển `interrupted` và không được coi là bản thay thế hoàn chỉnh. Hỏi tiếp phiên cũ là request mới với lịch sử theo ngân sách hiện hành; nếu cắt bớt lịch sử, ghi đúng số lượt bị lược vào lượt mới.

Không dùng `chat_session` như job. Dịch một chương có thể gắn vào phiên/lượt để người dùng tìm lại; trường `jobId` để trống tới Module 7. Chuyển chương không đổi `chapterId` của lượt hoặc đề xuất cũ; công cụ đọc chương khác vẫn giới hạn trong cùng tác phẩm.

### 6. Ngữ cảnh chat và trình bày câu trả lời

Composer biểu diễn hai thực thể: **nguồn AI đọc** và **đích được đề xuất thay**. Một picker thêm nguồn theo tác phẩm; mặc định lấy live selection/đoạn và nguồn cần thiết. Bộ lắp ngữ cảnh trả về cấu trúc đã định kích thước và bản preview từ cùng dữ liệu snapshot dùng để gửi, thay vì dựng preview và payload bằng hai đường khác nhau. Nếu nguồn vượt giới hạn, UI buộc thu hẹp hoặc xác nhận rõ phần được gửi; không ghi `cả chương` khi chỉ gửi đầu chương. Mục glossary/xưng hô lấy qua truy vấn approved + hiệu lực chương, không lấy toàn bộ mục đang có. Phân biệt nguồn Mira gửi và tool model đọc.

Render Markdown cho **lời giải thích** qua parser không cho raw HTML, whitelist URL an toàn và không tự tải ảnh. Khối thay thế được bóc tách/lưu như text gốc, không render Markdown của truyện thành nội dung HTML. Kiểm `finishReason`, fence và phạm vi trước khi ghi đề xuất. Xác minh chi phí bundle/parser trong implementation; không mở quyền HTML chỉ để có typography.

## Risks / Trade-offs

- [Đề xuất/turn dài làm tệp `.mira` lớn] → giới hạn kích thước có thông báo trước, dùng một base snapshot cho mỗi proposal, phân trang lịch sử; backup giữ toàn bộ, không tự xóa lịch sử.
- [Bản dịch cũ không khớp số đoạn nguồn] → không ghép theo số thứ tự; phần không neo chắc chắn cần đặt đích hoặc review cả chương, và không thuộc Accept all tự động.
- [Review overlay lệch khi người dùng gõ hoặc IME] → không tạo decoration/chuyển doc lúc composition; đánh dấu cần refresh sau khi sửa, kiểm V09/V11/V12 trên Electron thật.
- [Cùng lúc có nhiều đề xuất chồng lấn] → Accept lên kế hoạch theo snapshot hiện tại, chỉ nhận phần không chồng lấn; báo rõ phần cần xem lại.
- [Lịch sử stream có thể mất vài delta cuối khi crash] → trạng thái `interrupted`; chỉ lượt `done` có thể tạo đề xuất, phần chữ dở chỉ để đọc.
- [Migration hoặc backup lỗi] → migration v7 chạy trong transaction, fixture v6/v5 và crash test; không báo thành công khi chưa bền.

## Migration Plan

1. Thêm schema v7 và fixture nâng cấp từ v6/v5; không xóa bảng cũ. Tệp từ bản Mira mới hơn vẫn từ chối mở theo luật kho.
2. Thêm repository/service/IPC mới và test nguyên tử cho phiên, đề xuất, Accept/Deny/Accept all trước khi chuyển UI.
3. Chuyển hành động viết trong chat và dịch một chương sang tạo đề xuất; hành động Áp dụng thẳng đi qua service duyệt chung, bỏ auto-apply **ngầm** theo pane trống và đường ghi AI qua `saveRow` ở hai luồng này. Giữ API/segment cũ nếu phần chưa chuyển của app còn cần.
4. Thay review thành lớp không đổi canonical doc, thêm queue và panel mới; kiểm backup/restore, IME và kill process. Bản build cũ không được mở tệp v7 để ghi vì chặn schema mới hơn đã có.

## Open Questions

- Tên/biểu tượng cuối cùng của picker và nhãn `needs-placement` cần dùng thử với người dịch; hành vi và trạng thái dữ liệu không phụ thuộc vào wording.
