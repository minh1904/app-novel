# Đoạn bị nhà cung cấp từ chối dịch

Cập nhật: 2026-10-07 · Trạng thái: chia nhỏ lô khi bị lọc, giữ lý do chặn theo đoạn, tách lỗi cấu hình
và kiểm mức thinking ở main **đã triển khai** (change `provider-error-reasons`, mục 3); kết nối dự phòng
là **đề xuất**. Ranh giới ở mục 1 là quyết định của chủ sản phẩm cùng chính sách an toàn.
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

Thử lại 2026-10-07 với `gemini-3.5-flash-lite` (bản `v5-minimal+lite35`, cùng glossary AI), chương 3 và
10: 15 lời gọi, không lời gọi nào bị bộ lọc chặn; chương 3 đủ đoạn, chương 10 thiếu 5 câu vô hại do
model gộp đoạn (thiếu id, không phải từ chối). Model này không tắt được thinking: `reasoning_effort:
"none"` trả 400 “Request contains an invalid argument”, mức thấp nhất là `minimal`. Mira xếp 400 đó
vào `refused` nên chọn thinking “off” với model này thì mọi lô đều báo “nhà cung cấp từ chối”.
Tài liệu Google ghi `"none"` chỉ dùng được với model 2.5
([OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai), đọc 2026-10-07), nhưng probe đã
ghi của Mira cho thấy `gemini-3.5-flash` vẫn nhận `none`; mức hợp lệ cần lấy theo từng model. Giao diện
đã lọc mức theo catalog, còn main và Lab chưa kiểm lại — lần chạy này đi qua Lab.

Chạy đủ luồng 2026-10-07 với `gemini-3.5-flash-lite`, thinking `minimal`: glossary trích bằng chính model
này (`n4696dd.lite35`, 27 thuật ngữ, 20 nhân vật), dịch chương 1–30 (bản `v5-minimal+lite35gloss`).
179 lời gọi dịch và 7 lời gọi trích, **không lời gọi nào bị bộ lọc chặn**. Đổi lại thiếu 253 đoạn ở 13
chương: model hay chèn thẻ của prompt vào khóa JSON (`{"id><context>[14]</context><speaker_to_listener>…
<dst":"…"}`), bộ đọc không lấy được id nên đoạn đã dịch bị tính là thiếu. Chi phí $0.837 (bản
2.5-flash không thinking $0.651). Một lần chạy chưa đủ để nói model này không bao giờ bị chặn.

Đọc mã ngày 2026-10-07 thấy thêm ba lỗi (đều đã sửa, xem mục 3):

- Một lô có đoạn bị lọc trả `kind: 'refused'` cho cả lô, và giao diện xếp `refused` vào nhóm lỗi dừng lượt
  dịch, nên vài đoạn bị chặn làm các lô còn lại của chương không được dịch.
- `kindForStatus` gán `refused` cho **mọi** 4xx không phải 401/402/403/429 (chỉ sai key được tách thành
  `auth`). Mức thinking sai, schema bị từ chối, tham số sai hay request quá dài đều hiện là “nhà cung
  cấp từ chối” và bị Lab đếm như nội dung bị chặn.
- Lỗi khởi động lượt chat bị gán cứng `refused`.

Hai lỗi của Mira làm thiệt hại lớn hơn cần thiết (sửa 2026-10-06):

1. Gemini qua endpoint tương thích OpenAI trả `finish_reason` có hậu tố (`content_filter: …`); bộ ánh xạ
   chỉ nhận đúng `content_filter`, nên lô bị lọc bị coi như phản hồi thiếu id và hỏi lại nguyên lô.
2. Không có cách khoanh đoạn bị chặn: mất cả lô.

## 3. Đã triển khai: chia nhỏ lô khi bị lọc

- [`mapFinishReason`](../../../src/main/infra/providers/openAiChatTransport.ts) nhận mọi dạng
  `content_filter…` là `filter`.
- [`translationCore.ts`](../../../src/main/services/ai/translate/translationCore.ts): lượt chính bị lọc
  thì chia đôi và gửi lại từng nửa với cùng ngữ cảnh, tới khi khoanh được đoạn vẫn bị chặn khi đứng
  riêng; trần 16 lời gọi cho mỗi lần chia (vòng gửi lại không ngữ cảnh bên dưới có trần 16 riêng, nên
  một lô tối đa 34 lời gọi model kể cả lượt chính và lượt hỏi lại; change `translation-call-budget` đề
  xuất ngân sách chung theo chương). Nội dung và chỉ dẫn không đổi. Đoạn bị chặn trả trong `refusedIds`
  (cũng nằm trong `failedIds`) với lỗi `refused`.
- Đoạn vẫn bị chặn sau khi chia thì **gửi lại một vòng không kèm glossary, nhân vật và cặp xưng hô**
  (chủ sản phẩm chốt 2026-10-06). Bản gốc, đoạn liền trước và chỉ dẫn giữ nguyên; không viết lại hay
  che nội dung. Qua được thì đoạn nằm trong `withoutContextIds` (tên và xưng hô chưa đối chiếu, cần
  soát); vẫn bị chặn thì mới vào `refusedIds`. Prompt vốn không có các khối đó thì không gửi lại.
  Chưa có cờ riêng trên giao diện cho `withoutContextIds`.

Đã triển khai 2026-10-07 (change `provider-error-reasons`):

- **Lý do chặn theo đoạn.** [`filterReason.ts`](../../../src/main/infra/providers/filterReason.ts) đọc hậu
  tố của `content_filter: …` thành bốn nhóm: `prohibited` (`PROHIBITED_CONTENT`), `safety` (`SAFETY`),
  `recitation` (`RECITATION`), `other` (mọi lý do khác, kể cả `SPII`, `BLOCKLIST` và `content_filter`
  không hậu tố), luôn giữ chữ gốc. Lõi dịch trả `refusals` (id, nhóm, chữ gốc) cạnh `refusedIds`; lý do
  là của lần chặn cuối, đoạn qua được ở vòng không ngữ cảnh thì không còn lý do. Kết quả lô và trace của
  hồ sơ đề xuất mang `refusals` khi có.
- **Thông báo đếm theo lý do**, ví dụ “Nhà cung cấp từ chối dịch 2 đoạn bị chặn theo chính sách nội dung,
  1 đoạn bị bộ lọc trích dẫn chặn (không phải vấn đề nội dung); cần dịch tay hoặc dùng model khác.” Hộp
  thoại dịch đếm trên cả lượt, không chỉ lô cuối.
- **Đoạn bị lọc không dừng lượt dịch.** Main quyết lỗi nào dừng lượt bằng bảng chính sách
  ([`errorPolicy.ts`](../../../src/main/services/ai/errorPolicy.ts)) và gửi `haltsRun` kèm lỗi của lô;
  renderer làm theo. Dừng: `invalid_request`, `auth`, hết hạn mức, hết khóa, xung đột, hủy.
- **Lỗi cấu hình là `invalid_request`**: 4xx còn lại không thử lại, không đổi hay đóng băng khóa, và
  thông báo nêu thông điệp nhà cung cấp kèm tham số đã gửi (mức thinking, nhiệt độ, top-p, giới hạn đầu
  ra, tên khóa `extra_body`, có gửi `response_format` không; không có header hay khóa). 413 và 400 vượt
  giới hạn token báo là request quá lớn. Một 4xx chỉ là `refused` khi thân lỗi có bằng chứng bộ lọc chặn
  (`blockReason`, `PROHIBITED_CONTENT`, `SAFETY`, `HARM_CATEGORY_…` viết hoa).
- **Mức thinking kiểm ở main** theo catalog cộng dòng đo thật: khi lưu mức (từ chối kèm các mức hợp lệ),
  ngay trước khi gọi (không có request nào đi ra), và trong Lab (biến thể không hợp lệ không chạy, không
  vào sổ đăng ký). Không tự đổi sang mức khác; form cài đặt báo mức đang lưu không còn hợp lệ và gợi ý
  mức gần nhất.

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

Tài liệu tương thích OpenAI của Google (đọc 2026-10-07) chỉ liệt kê `safety_settings` trong `extra_body`
cho sinh ảnh, khớp với kết quả thử trên. Adapter Gemini gốc của Hermes Agent cũng không phải lời giải có
sẵn: nó không gửi `safetySettings`, không đọc `promptFeedback` và gộp `SAFETY` với `RECITATION`
([đối chiếu harness](harness-review.md)).

## 5. Đề xuất: xử lý theo lý do bị chặn

Lý do theo đoạn đã có (mục 3). Phần còn là đề xuất là hành vi khác nhau theo từng lý do:

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
Hiện mới có câu đếm theo lý do trong hộp thoại dịch; cờ theo đoạn trên editor chưa làm.

## 6. Câu hỏi còn mở

- Có làm bộ chuyển đổi API gốc Gemini để chỉnh ngưỡng nhóm chỉnh được không, hay chỉ dựa vào kết nối
  dự phòng?
- Kết nối dự phòng chọn theo tác phẩm hay theo lượt dịch?
- Bộ đo: đã có hướng trong change `lab-completion-quality-report` — chất lượng chấm trên tập đoạn có
  đầu ra hợp lệ ở mọi bản, còn đoạn bị từ chối báo ở trục khả năng hoàn thành, để bản từ chối nhiều
  không trông đẹp hơn thực tế.

[Về module Ngữ cảnh](README.md)
