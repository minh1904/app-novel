# Nghiên cứu lại panel AI

Ngày đọc: 2026-10-04 · Trạng thái: **quan sát mã và tài liệu chính thức; thiết kế bên dưới là đề xuất, chưa chốt**.
Chủ trì: sản phẩm/kỹ thuật. Câu hỏi: panel giúp người dịch hỏi, chọn ngữ cảnh và xem kết quả như thế nào để không hiểu sai phạm vi?

> **Cập nhật 2026-10-05:** chủ sản phẩm quyết định bỏ khối xem nguồn gửi kèm và nút thêm nguồn từ
> chương khác khỏi composer, và đặt “viết vào bản dịch” làm hành động gửi mặc định. Mục 2–3 của
> phần đề xuất bên dưới (picker ngữ cảnh, xem trước payload) vì vậy **không làm**; các mục còn lại
> vẫn là đề xuất. Xem [quyết định 7–8](decisions.md). Bảng “Quan sát Mira hiện tại” giữ nguyên như
> lúc đọc mã ngày 2026-10-04.

## Vấn đề người dùng nêu

Panel hiện cho cảm giác câu trả lời là text thuần và các nút thêm/chọn ngữ cảnh chưa hợp lý. Đây là
nhận xét UX của chủ sản phẩm, không phải kết quả thử nghiệm người dùng có đo lường. Kiểm tra mã cho
thấy những cơ chế cụ thể bên dưới; chưa chạy quan sát trực tiếp ứng dụng với một hội thoại thực.

## Quan sát Mira hiện tại

| Mã | Hành vi đã triển khai | Hệ quả UX |
| --- | --- | --- |
| [`AiTurn.tsx`](../../../src/renderer/src/features/chapter/chat/AiTurn.tsx) | `turn.answer` nằm trong `div` với `whitespace-pre-wrap`; không có parser Markdown. Toàn bộ câu trả lời, kể cả hàng rào khối thay thế của chế độ Sửa, hiện dưới dạng chữ. | Tiêu đề, danh sách, trích dẫn, link và code fence không có cấu trúc thị giác. Khối văn bản đề xuất lẫn với lời giải thích. |
| [`AiComposer.tsx`](../../../src/renderer/src/features/chapter/chat/AiComposer.tsx) | Một nhãn phạm vi không bấm được nằm cạnh nút chuyển `Cả chương`; không có picker để thêm/bỏ một nguồn cụ thể. | Hai thành phần trông như “ngữ cảnh” nhưng một cái chỉ hiển thị, một cái đổi phạm vi. Người dùng khó suy ra chính xác request sẽ mang gì. |
| [`chatContext.ts`](../../../src/renderer/src/features/chapter/chatContext.ts) | Request luôn kèm bản gốc cả chương và bản dịch hiện có nếu có; phạm vi hẹp chỉ **bổ sung** đoạn đang sửa, đoạn nguồn cùng chỉ số khi số đoạn hai bên bằng nhau, và đoạn dịch lân cận. Mỗi khối chương cắt ở 20.000 ký tự đầu và ghi chú trong `detail`. | Nhãn `đoạn đang sửa` không có nghĩa chỉ gửi đoạn đó; `Cả chương` không có nghĩa toàn bộ chương dài được gửi. Ghi chú cắt không hiện trước lúc gửi. |
| [`AiTurn.tsx`](../../../src/renderer/src/features/chapter/chat/AiTurn.tsx) | `Đã gửi kèm N khối ngữ cảnh` liệt kê nhãn và mô tả sau khi gửi, không cho xem nội dung chính xác. Các lần model gọi công cụ được hiển thị riêng. | Có dấu vết sau lượt hỏi, nhưng không có bước kiểm trước khi gửi hoặc mở lại snapshot chính xác của từng nguồn. |
| [`AiPanel.tsx`](../../../src/renderer/src/features/chapter/chat/AiPanel.tsx), [`useAiChat.ts`](../../../src/renderer/src/features/chapter/chat/useAiChat.ts) | Pane dịch trống buộc phạm vi cả chương và mặc định chế độ Sửa; đóng panel hủy request và mất hội thoại. Chế độ Sửa hiện tự áp dụng đề xuất vào pane trống. | Luồng “hỏi” và “dịch chương” nhập làm một; việc tự ghi khi pane trống trái [quyết định sản phẩm mới](decisions.md). Việc lưu phiên đã được chốt nhưng chưa triển khai. |
| [`chatPrompt.ts`](../../../src/main/services/ai/chatPrompt.ts), [`chatTools.ts`](../../../src/main/services/ai/chatTools.ts) | Ngữ cảnh mặc định nằm trong một message trước lịch sử; model có thể tự `list_chapters`/`read_chapter` trong cùng tác phẩm. Chưa có picker thuật ngữ, nhân vật hay chương khác. | “Đã gửi kèm” và “AI đã đọc thêm” là hai nhóm khác nhau; giao diện phải tiếp tục phân biệt. |
| [`chatTurns.ts`](../../../src/renderer/src/features/chapter/chat/chatTurns.ts), [`aiChat.ts`](../../../src/shared/contracts/aiChat.ts) | Lịch sử gửi model bị giới hạn theo ngân sách ký tự; phần bị bỏ chỉ báo sau lượt. `finishReason` tồn tại ở contract nhưng panel chưa dùng. | Cần báo khi ngữ cảnh/lịch sử bị lược bỏ hoặc câu trả lời bị cắt, trước khi cho xem kết quả Sửa như một bản hoàn chỉnh. |

Code đã tránh gửi giữa lúc IME đang composition và có nút Hủy, Sao chép, Hỏi lại. Các điểm này nên
giữ khi thay thiết kế; không có căn cứ để kết luận toàn bộ panel đều hỏng.

### Tool chat sau change `chat-tools-paging-search` (đã triển khai 2026-10-08)

Hàng `chatTools.ts` ở bảng trên là hiện trạng ngày 2026-10-04. Nay model có ba tool, đều chỉ đọc và buộc
vào tác phẩm đang mở:

- **`read_chapter` đọc theo trang.** Mỗi lần tối đa 20.000 ký tự, dừng ở ranh giới đoạn (đoạn là dòng
  không trống); chỉ cắt giữa đoạn khi một đoạn dài hơn cả trang. Đầu kết quả ghi chương, phía, revision,
  đoạn từ–đến trên tổng, số ký tự và con trỏ đọc tiếp (dạng `c3.target.p81.o0.r12`). Có thể bắt đầu ở
  `from_paragraph`. Con trỏ của revision cũ vẫn đọc tiếp từ đầu đoạn đó, kèm cảnh báo vị trí có thể lệch;
  con trỏ hỏng hay của chương khác bị từ chối kèm gợi ý đọc bằng số đoạn. Không còn cắt im lặng.
- **`search_work(query, side)`** tìm chuỗi 1–100 ký tự trên văn bản đã lưu của mọi chương (chuẩn hóa NFC,
  chữ Latin không phân biệt hoa thường, chữ CJK không cần dấu cách). Trả tổng chỗ khớp, số chương, tối
  đa 20 kết quả có chương, số đoạn và đoạn trích. Đoạn tương ứng ở phía kia **chỉ** lấy qua liên kết căn
  chỉnh; không có liên kết thì ghi “chưa căn chỉnh”, liên kết cần xem lại hay đã hỏng thì ghi “chưa chắc
  đúng”, không bao giờ ghép theo số thứ tự đoạn. Chưa có chỉ mục FTS5: trên tác phẩm 242 chương, 1,17
  triệu ký tự, một lần tìm mất 9–52 ms.
- **Giới hạn mỗi lượt:** tối đa 6 vòng gọi tool và 80.000 ký tự tool trả về; hết thì tool báo “Hết ngân sách
  đọc của lượt” và vòng cuối không mời tool, nên lượt vẫn kết thúc bằng câu trả lời. Các số này là giá trị
  khởi đầu.
- **“AI đã đọc”** vẫn là một dòng mỗi lần gọi (`{ name, detail }`), nay ghi khoảng đoạn và còn tiếp hay hết
  chương, hoặc chuỗi tìm, tổng chỗ khớp và số kết quả đã trả. Chưa kiểm trên app thật.

## Đối chiếu sản phẩm khác

Đọc tài liệu chính thức ngày 2026-10-04. Đây là **mẫu tham khảo**, không tự thành yêu cầu của Mira.

| Sản phẩm | Quan sát có nguồn | Điều đáng thử trong Mira |
| --- | --- | --- |
| [VS Code — Add context](https://code.visualstudio.com/docs/chat/copilot-chat-context) | Có context tự động và `#`/Add Context để gắn nguồn cụ thể; attachment nằm trong bản nháp và đi cùng request. | Phân biệt nguồn mặc định với nguồn người dùng chủ động chọn; cho xem attachment trước lúc gửi. |
| [Notion Agent](https://www.notion.com/help/notion-agent) | Mặc định lấy trang đang mở hoặc block được chọn; `@` và All sources cho thêm nguồn. Có tìm hội thoại cũ. | Theo vùng chọn là mặc định dễ hiểu; thêm nguồn qua một cửa vào thay vì nhiều chip cạnh tranh. |
| [Antigravity IDE panel](https://antigravity.google/docs/ide/agent-side-panel), [Google Codelab](https://codelabs.developers.google.com/getting-started-agy-ide) | Panel có hội thoại, model/mode và dấu vết thay đổi; `@` dùng để thêm ngữ cảnh. | Tách nguồn đầu vào, hoạt động của AI và kết quả cần duyệt thành ba lớp nhìn được. |
| [VS Code — Use chat](https://code.visualstudio.com/docs/chat/chat-overview) | Transcript có Markdown và code block; có tìm kiếm, điều hướng lượt hỏi và review thay đổi ở bề mặt riêng. | Câu trả lời cần cấu trúc đọc được; đề xuất sửa phải dẫn tới review trong editor. |

## Đề xuất luồng panel cho Mira

1. **Một vùng nhập, một dòng “Đang dùng” rõ nghĩa.** Mặc định lấy tác phẩm/chương đang mở và vùng
   chọn trong pane dịch; nếu không chọn, lấy đoạn chứa con trỏ. Nếu pane dịch trống, mặc định **tham
   chiếu** là bản gốc chương, nhưng **đích ghi** vẫn là đề xuất mới chờ duyệt. Không để nhãn phạm vi
   ngụ ý sai rằng chỉ đoạn ấy được gửi.
2. **Một nút `+ Thêm ngữ cảnh` mở picker.** Ưu tiên lựa chọn phù hợp với người dịch: đoạn/vùng chọn
   hiện tại, cả chương đang mở, chương khác trong tác phẩm, thuật ngữ đã duyệt, nhân vật/xưng hô đã
   duyệt khi module tương ứng có dữ liệu thật. Nút chỉ hiện nguồn khả dụng; không có chip trang trí
   hoặc nút riêng `Cả chương` đứng cạnh một chip phạm vi khác nghĩa. Có thể gõ `@` sau nếu tìm kiếm
   bằng bàn phím thực sự có nhu cầu; không cần làm để bắt chước IDE.
3. **Cho xem trước payload sẽ gửi.** Mỗi nguồn có tên chương, phía nguồn/bản dịch, vùng đoạn,
   kích thước và trạng thái “tự động” hoặc “đã thêm”. Mở nguồn để xem đoạn text thực sự; bỏ nguồn
   thêm tay được. Nếu văn bản quá dài, báo “chỉ gửi N ký tự đầu” **trước** khi gửi và cho thu hẹp
   hoặc chia phạm vi. Giữ snapshot của đúng lần gửi trong transcript; nếu nội dung editor đổi sau
   đó, không giả vờ snapshot cũ là nội dung hiện tại.
4. **Tách “ngữ cảnh để đọc” khỏi “phạm vi AI được đề xuất sửa”.** Chọn cả chương làm ngữ cảnh
   không được tự biến đích sửa thành cả chương. Ở chế độ Hỏi, không có đích ghi; ở chế độ Sửa, đích
   phải hiện riêng: vùng chọn, đoạn có con trỏ hoặc chương khi người dùng chọn rõ. Chương trống cần
   đường “Dịch chương → đề xuất chờ duyệt” có nhãn riêng; dịch nhiều chương thuộc Module 7.
5. **Transcript là giao diện đọc.** Render phần giải thích của AI bằng Markdown an toàn: đoạn văn,
   tiêu đề, danh sách, trích dẫn, nhấn mạnh, link và khối code/văn bản. Không thực thi HTML hoặc nhúng
   ảnh/link từ xa tự động. Bản dịch đề xuất là **văn bản nguyên dạng**, tách khỏi Markdown giải thích,
   có nút `Xem đề xuất trong bản dịch` dẫn tới diff/Accept/Deny trong editor. `Sao chép` nên cho
   chọn sao chép câu trả lời hoặc chỉ bản thay thế.
6. **Hiện trạng thái và giới hạn ở đúng lượt.** Streaming có trạng thái đang trả lời/Hủy; lỗi và
   retry gắn vào lượt tương ứng. Khi provider báo hết giới hạn hoặc câu trả lời có thể bị cắt, không
   mở hành động áp dụng bản Sửa. `Đã gửi kèm` ghi những gì Mira gửi; `AI đã đọc` ghi công cụ model
   gọi; không gộp hai nguồn chứng cứ. Lịch sử đã lược bớt phải báo rõ với lượt tiếp theo.
7. **Panel theo tác phẩm, còn ngữ cảnh theo từng lượt.** Quyết định này đã [được chốt](decisions.md).
   Chuyển chương không xóa phiên; một lượt cũ luôn hiển thị chương và snapshot đã dùng. Mở lại phiên
   cũ để hỏi tiếp cần đánh dấu chương hiện đang nhắm tới; không tự áp dụng đề xuất cũ vào chương mới.

Ví dụ composer đề xuất (chỉ là bố cục chữ, chưa chốt thiết kế):

```text
Đang dùng: Chương 12 · bản gốc + bản dịch · đoạn 8 (tự động)
+ Thêm ngữ cảnh                 Xem nội dung sẽ gửi
[ Hỏi vì sao câu này lệch sắc thái...                 ]
Hỏi / Đề xuất sửa   Model                              Gửi
```

Khi chọn “Đề xuất sửa”, hiện thêm một dòng `Sẽ đề xuất thay: đoạn 8` độc lập với dòng `Đang dùng`.

## Thứ tự và cách kiểm chứng đề xuất

1. **Trước hết:** thiết kế lại dòng phạm vi/ngữ cảnh và preview payload; xử lý cảnh báo cắt chương,
   vì đây là sai lệch giữa điều giao diện hứa và điều request thực gửi.
2. **Cùng lát cắt UX:** render Markdown an toàn cho lời giải thích, tách bản thay thế khỏi lời đáp,
   và chặn đề xuất thiếu/đứt đoạn. Chọn parser/chi phí bundle khi lập OpenSpec, không khóa thư viện
   ở nghiên cứu này.
3. **Theo Module 5:** lưu phiên, snapshot và đề xuất bền vững; mọi kết quả AI chờ duyệt kể cả pane
   trống. Picker chương khác/thuật ngữ chỉ nối khi dữ liệu và quyền gửi tương ứng đã sẵn.

Kiểm bằng các tình huống: hỏi khi con trỏ di chuyển sau lúc soạn; chương nguồn hơn 20.000 ký tự;
pane dịch trống; bôi chọn nhiều đoạn; chuyển chương khi panel mở; AI trả Markdown và fence không đóng;
provider dừng do giới hạn; ẩn/mở lại panel; IME; bàn phím/screen reader. So sánh payload thực với
preview và snapshot trong transcript. Cần dùng thử với người dịch để xác nhận thứ tự picker và tên nút;
hiện chưa có số liệu hành vi thực tế.

[Về module](README.md) · [Quyết định hiện hành](decisions.md)
