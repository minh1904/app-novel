# Đoạn bị nhà cung cấp từ chối dịch

Cập nhật: 2026-10-06 · Trạng thái: chia nhỏ lô khi bị lọc **đã triển khai**; giữ lý do chặn và kết nối
dự phòng là **đề xuất**. Ranh giới ở mục 1 là quyết định của chủ sản phẩm cùng chính sách an toàn.
Chủ trì: kỹ thuật (lõi dịch, provider), sản phẩm (hành vi với người dịch).
Câu hỏi: khi model từ chối dịch một phần chương, Mira mất bao nhiêu, báo người dịch thế nào, và được
phép làm gì tiếp?

## 1. Ranh giới

- **Nội dung tình dục liên quan trẻ vị thành niên không được đưa qua đường nào khác.** Gemini chặn nhóm
  này bằng `PROHIBITED_CONTENT`, không chỉnh được. Mira không tự chuyển sang model khác, không viết
  lại, che hay mã hóa bản gốc để lách; ngoài chia lô và một vòng bớt ngữ cảnh (mục 3), đoạn còn bị
  chặn để trống và báo người dịch. Người dịch đọc bản gốc rồi tự quyết dịch tay hay dùng model khác.
- **Nội dung 18+ giữa người trưởng thành** là nhóm chỉnh được của nhà cung cấp; người dùng được chọn
  model hoặc ngưỡng phù hợp với tác phẩm của mình.
- Không viết prompt nhằm đánh lừa bộ lọc ở bất kỳ nhóm nào.

## 2. Quan sát (2026-10-06, Lab `n4696dd`, `gemini-2.5-flash`)

Ba bản dịch 30 chương, 254 lời gọi: 2 lần `content_filter: PROHIBITED_CONTENT` (chương 3, cảnh nhân vật
4 tuổi bị ôm vào ngực), 1 lần `content_filter: RECITATION` (chương 10, hai chị em 9 và 8 tuổi nói chuyện
gợi dục), 1 phản hồi rỗng, 1 lỗi 503. Mỗi lần chặn làm mất **cả lô** (20–30 đoạn) dù chỉ vài câu kích
hoạt. Cùng đoạn chương 3, bản không glossary qua được, hai bản có glossary bị chặn; chương 10 qua ở bản
không thinking, bị chặn ở bản thinking — bộ lọc không tất định, chưa đủ dữ liệu để nói glossary có làm
tăng khả năng bị chặn.

Hai lỗi của Mira làm thiệt hại lớn hơn cần thiết:

1. Gemini qua endpoint tương thích OpenAI trả `finish_reason` có hậu tố (`content_filter: …`); bộ ánh xạ
   chỉ nhận đúng `content_filter`, nên lô bị lọc bị coi như phản hồi thiếu id và hỏi lại nguyên lô.
2. Không có cách khoanh đoạn bị chặn: mất cả lô.

## 3. Đã triển khai: chia nhỏ lô khi bị lọc

- [`mapFinishReason`](../../../src/main/infra/providers/openAiChatTransport.ts) nhận mọi dạng
  `content_filter…` là `filter`.
- [`translationCore.ts`](../../../src/main/services/ai/translate/translationCore.ts): lượt chính bị lọc
  thì chia đôi và gửi lại từng nửa với cùng ngữ cảnh, tới khi khoanh được đoạn vẫn bị chặn khi đứng
  riêng; trần 16 lời gọi mỗi lô. Nội dung và chỉ dẫn không đổi. Đoạn bị chặn trả trong `refusedIds`
  (cũng nằm trong `failedIds`) với lỗi `refused`: “Nhà cung cấp từ chối dịch N đoạn (bộ lọc nội dung);
  cần dịch tay hoặc dùng model khác.”
- Đoạn vẫn bị chặn sau khi chia thì **gửi lại một vòng không kèm glossary, nhân vật và cặp xưng hô**
  (chủ sản phẩm chốt 2026-10-06). Bản gốc, đoạn liền trước và chỉ dẫn giữ nguyên; không viết lại hay
  che nội dung. Qua được thì đoạn nằm trong `withoutContextIds` (tên và xưng hô chưa đối chiếu, cần
  soát); vẫn bị chặn thì mới vào `refusedIds`. Prompt vốn không có các khối đó thì không gửi lại.
  Chưa có cờ riêng trên giao diện cho `withoutContextIds`.

Lần chạy lại chương 3 (cơ chế chia, chưa có vòng không glossary): lô 30 đoạn bị chặn còn mất 4 đoạn
(bản không thinking) và 2 đoạn (bản thinking). Câu vô hại như “vùng vẫy, cô hầu buông ra” đứng riêng
vẫn bị chặn: bộ lọc xét cả request, không chỉ câu cần dịch.

Kết quả trên ba bản `n4696dd` ghi ở [lịch sử đo](../measurement/history.md) và trang đọc của thí nghiệm.

## 4. Kiểm chứng: endpoint tương thích OpenAI không nhận cài đặt an toàn

Thử 2026-10-06 với câu vô hại, `gemini-2.5-flash`: không cài đặt → 200; `extra_body.google.safety_settings`
→ 400 “Unknown name "safety_settings" at 'extra_body.google'”; `safety_settings` ở cấp cao nhất → 400
tương tự. Vậy với đường Mira đang dùng, **không chỉnh được ngưỡng bộ lọc**. Muốn chỉnh nhóm “Sexually
explicit” (tới `BLOCK_NONE`, mà theo [Google](https://ai.google.dev/docs/safety_setting_gemini) không mở
cho mọi tài khoản) phải gọi API gốc `generateContent`, tức thêm một bộ chuyển đổi provider riêng.
`PROHIBITED_CONTENT` không chỉnh được ở bất kỳ đường nào
([Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-filters)).

## 5. Đề xuất: xử lý theo lý do bị chặn

Lõi dịch hiện gộp mọi dạng thành `filter`; đề xuất giữ lý do cụ thể từ phản hồi (`PROHIBITED_CONTENT`,
`SAFETY`, `RECITATION`, `OTHER`) trên từng đoạn bị từ chối.

| Lý do | Hành vi đề xuất |
| --- | --- |
| `PROHIBITED_CONTENT` | Không chuyển sang model nào. Đoạn trống, cờ “nhà cung cấp từ chối”, người dịch tự quyết |
| `SAFETY` (nhóm chỉnh được, ví dụ 18+) | Cho người dùng chọn **kết nối dự phòng** do chính họ cấu hình, chỉ để dịch các đoạn bị từ chối; ghi nguồn gốc model trên đoạn đó |
| `RECITATION` | Thử lại khi chia nhỏ như mục 3; không phải vấn đề nội dung |
| không rõ / rỗng | Như phản hồi thiếu id: hỏi lại một lần |

Kết nối dự phòng là lựa chọn của người dùng theo tác phẩm, tắt mặc định; Mira không tự gợi ý model
“dễ dãi hơn”. Đoạn do kết nối dự phòng dịch vẫn là đề xuất chờ duyệt, mang nhãn model đã dịch.

Trên giao diện: hồ sơ đề xuất hiện số đoạn bị từ chối và lý do; mỗi đoạn trống có cờ riêng, không lẫn
với đoạn thiếu do lỗi mạng (thử lại có ích) — khác biệt này đã có ở `refusedIds` so với `failedIds`.

## 6. Câu hỏi còn mở

- Có làm bộ chuyển đổi API gốc Gemini để chỉnh ngưỡng nhóm chỉnh được không, hay chỉ dựa vào kết nối
  dự phòng?
- Kết nối dự phòng chọn theo tác phẩm hay theo lượt dịch?
- Bộ đo: khi so các bản, loại đoạn bị từ chối ở bất kỳ bản nào khỏi mọi bản, để bản may mắn qua bộ lọc
  không được lợi.

[Về module Ngữ cảnh](README.md)
