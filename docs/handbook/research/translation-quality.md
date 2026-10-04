# Chất lượng dịch: đo, prompt, lượt soát lại và chọn model

Ngày đọc: **2026-10-03** · Trạng thái: **Quan sát** (bài báo, tài liệu nhà cung cấp, tệp prompt của các công cụ, mã Mira) cộng **đề xuất chưa chốt** ở mục "Suy luận" · Chủ trì: research/engineering · Liên quan: [lộ trình](../delivery/roadmap.md) (module Bộ đo, Lõi dịch, QA), [ngữ cảnh truyện đợt 1](story-context.md), [đợt 2](context-system.md), [chia lô](chunking-translation.md), [lõi AI](ai-core-architecture.md), [hệ sinh thái Việt](vietnam-ecosystem.md), [kế hoạch kiểm chứng](../delivery/validation.md)

## Câu hỏi và phương pháp

Ngày 2026-10-03 chủ sản phẩm chốt **cải thiện khả năng dịch trước khi làm kỹ luồng áp dụng đề xuất** ([lộ trình](../delivery/roadmap.md)). Ngữ cảnh (glossary, xưng hô, văn phong), bộ đệm prompt và chia lô đã có nghiên cứu riêng. Trang này trả lời bốn câu còn trống:

1. **Đo thế nào** để biết một thay đổi (chèn glossary, bật thinking, đổi prompt) làm bản dịch →Việt tốt hơn hay tệ đi?
2. **System prompt, tham số sinh và định dạng đầu ra** nên ra sao, và **quy ước tiếng Việt** nào cần đưa vào prompt?
3. **Lượt soát lại** (refine, hậu biên tập bằng LLM) có đáng làm không?
4. **Chọn model** nào để thử, và giá bao nhiêu?

**Cách làm:** ba agent nghiên cứu web chạy song song, mỗi agent một nhóm câu hỏi. Agent tải tệp prompt thô của các công cụ và trích chữ từ PDF bằng `pdftotext` khi cần đọc bảng. Hai phép tính (tỷ lệ độ dài trên WMT24++, cỡ mẫu cho sign test) do agent tự làm. **Chưa chạy model, metric hay công cụ nào.** Mức kiểm ghi ở từng hàng:

- **đọc†**: con số đã được đối chiếu trên văn bản thô của trang.
- **đọc**: đã mở trang chính, nhưng qua công cụ tải có tóm tắt bằng model nhỏ, nên con số có thể lệch nhỏ.
- **tóm tắt**: chỉ đọc abstract.
- **snippet**: chỉ thấy đoạn trích của máy tìm kiếm.
- **tự tính**: phép tính của agent.

Nguồn đầy đủ ở [sổ nguồn](sources.md) S36–S38.

## Tóm tắt

1. **Mira hôm nay chưa có thứ gì để đo, và prompt rất mỏng.** System prompt dịch là năm câu chung chung ([`openAiCompatible.ts:64-70`](../../../src/main/infra/providers/openAiCompatible.ts)). Không gửi ngữ cảnh, `reasoning_effort`, `temperature` hay `max_tokens`. `parseItems` dùng `JSON.parse` nghiêm ngặt. Chưa có fixture, chưa có baseline, chưa có chỉ số chất lượng.
2. **Chưa có metric tự động nào được kiểm chứng cho văn học dịch sang tiếng Việt.** Ở văn học, cả metric lẫn LLM-judge đều lệch khỏi người: GEMBA-MQM chỉ chọn bản dịch người ở 9,6% trường hợp, trong khi dịch giả chuyên nghiệp chọn ở 94,4% (LITEVAL). Vì vậy nên đo ba tầng: **kiểm tất định** (rẻ và chắc), **LLM-judge so cặp mù** (khác họ model dịch, chạy hai chiều, có lượt A/A), và **người chấm mù** khoảng 60–80 cặp mỗi thí nghiệm.
3. **Nhiễu lớn hơn ta nghĩ.** Ở temperature 0, một model vẫn cho 80 đầu ra khác nhau trên 1.000 lần chạy. Muốn thấy tỷ lệ thắng thật 65/35 cần khoảng 90 cặp không hòa. Một thí nghiệm tốn khoảng **2–8 USD** API; nút thắt là **1–2 giờ người chấm**.
4. **Prompt: "brief" (mục đích, người đọc, ngữ vực) có bằng chứng tốt nhất.** Viết chuỗi suy luận (CoT) vào prompt thì làm dịch từng chữ. Google khuyên prompt ngắn cho Gemini 3. Tầng A đề xuất dài 1.200–2.500 token, dưới ngưỡng cache 4.096 của Gemini 3.x. Trên Gemini 3, cache chỉ có khi tầng A + B đủ dài. Không độn chữ để chạm ngưỡng.
5. **Thinking không giúp dịch một lượt.** Chất lượng đi ngang sau khoảng 100 token thinking, và ép nghĩ thêm thì giảm. Gemini 3 không tắt được thinking, và `max_tokens` chặn cả thinking lẫn đầu ra, nên Mira phải tự tính trần. Google "strongly recommend" giữ temperature 1.0 cho Gemini 3; DeepSeek khuyên 1.3 cho dịch.
6. **Định dạng đầu ra:** không tìm thấy số đo tỷ lệ mất ID theo từng định dạng. Hai lỗi thật khớp đúng mã Mira: xuống dòng thô trong chuỗi JSON làm hỏng cả lô 286 dòng; prompt đòi mảng trần nhưng gửi `json_object` làm model trả một đối tượng. Nên làm parse khoan dung trước, rồi mới đo định dạng.
7. **Quy ước tiếng Việt:**
   - **Các nguồn đồng thuận:** tên, môn phái, cảnh giới gốc Trung đọc Hán-Việt và không để pinyin; khôi phục tên phương Tây bị phiên qua chữ Hán; bỏ từ đệm kiểu convert; giữ xưng hô nhất quán (đây là lời phàn nàn số 1).
   - **Còn tranh cãi**, nên làm thành cài đặt: dùng "y" hay không, mức Hán-Việt, ngoặc kép hay gạch thoại, kính ngữ Nhật.
8. **Lượt soát lại chủ yếu làm văn mượt hơn, còn độ đúng nghĩa thì không tăng, có khi giảm.** Một đánh giá MQM của người trên WMT24 Literary (2026) cho thấy điểm Accuracy giảm với ba trong bốn model. Model tự sửa thì tự thiên vị. Đánh bóng tiếng Việt mà bỏ nguồn thì trôi nghĩa. Refine theo đoạn sửa 25–40% token, tức người dùng phải duyệt lại gần như cả chương. **Kết luận:** không refine cả chương ở bản đầu; kiểm tất định rồi dịch lại đúng đoạn bị cờ.
9. **Chọn model:**
   - Không có benchmark văn học ZH/JA→VI nào. EN→VI chỉ được chấm tự động (WMT25), và Gemini 2.5 Pro dẫn đầu.
   - Dịch 1.000 chương (mỗi chương khoảng 3.000 chữ Hán) tốn từ khoảng 5 đến khoảng 120 USD tùy model. Giá Gemini Flash tăng gấp đôi từ 2027-01-01.
   - Ở free tier của Gemini, dữ liệu được dùng để cải thiện sản phẩm, và hạn mức tính **theo project, không theo khóa**.

## Quan sát 0 — Mira hôm nay

Đọc mã ngày 2026-10-03:

- **Prompt:** năm câu: vai "người dịch truyện sang tiếng Việt", hợp đồng JSON `{"id","src"}` → `{"id","dst"}`, giữ ID, "dịch tự nhiên, giữ xuống dòng và dấu câu". Không có ngôn ngữ nguồn, thể loại, người đọc hay quy ước tên.
- **Không gửi tham số:** một mục model chưa đặt gì thì không gửi `reasoning_effort`, `temperature` hay `max_tokens` ([hiện trạng](../engineering/current-state.md)). Với Gemini 2.5 Flash, một câu ngắn ra 13 token chữ cộng khoảng 91 token thinking ẩn. `max_tokens: 5` cho ra câu cụt ([lõi AI](ai-core-architecture.md)).
- **Parse:** `parseItems` cắt từ `[` đầu tới `]` cuối rồi gọi `JSON.parse` nghiêm ngặt ([`openAiCompatible.ts:143`](../../../src/main/infra/providers/openAiCompatible.ts)). Một dấu `"` không thoát là hỏng cả lô, rồi lô bị hỏi lại.
- **Không có gì để đo:** `__fixtures__` chỉ có snapshot schema SQL và bản ghi gọi Gemini thật; chưa có văn bản truyện, glossary hay bản dịch tham chiếu.

## Quan sát 1 — Đo chất lượng bản dịch

### 1.1 Metric tự động

| Nguồn | Phát hiện | Giới hạn | Mức kiểm |
| --- | --- | --- | --- |
| [`wmt22-comet-da`](https://huggingface.co/Unbabel/wmt22-comet-da), [COMET `encoders/base.py`](https://github.com/Unbabel/COMET/blob/master/comet/encoders/base.py) | Bắt buộc có bản tham chiếu, Apache-2.0. Đoạn dài hơn 512 token bị **cắt im lặng** | Không thấy tiếng Việt trong dữ liệu huấn luyện | đọc |
| [CometKiwi](https://huggingface.co/Unbabel/wmt23-cometkiwi-da-xl), [XCOMET](https://huggingface.co/Unbabel/XCOMET-XL), [`LICENSE.models.md`](https://github.com/Unbabel/COMET/blob/master/LICENSE.models.md) | Chạy không cần tham chiếu (QE). Bản XL 3,5B tham số, cần ≥15 GB VRAM. **CC BY-NC-SA, gated** | Dùng thương mại phải xin phép | đọc |
| [MetricX-24 hybrid](https://github.com/google-research/metricx) | Một model chạy cả có và không có tham chiếu; **Apache-2.0**; điểm 0–25, thấp là tốt; huấn luyện với tối đa 1.536 token | Không thấy tiếng Việt trong dữ liệu huấn luyện | đọc |
| [Pitfalls in Using COMET (WMT24)](https://arxiv.org/html/2408.15366) | Bản dịch **rỗng** vẫn được 0,31–0,54 điểm; dịch nhầm sang ngôn ngữ gần vẫn được khoảng 0,8 | en-de/zh | đọc |
| [LITEVAL-CORPUS (NAACL 2025)](https://arxiv.org/html/2410.18697v2) | Văn học, bốn cặp ngôn ngữ, chín hệ dịch. GEMBA-MQM tốt nhất trong các metric, nhưng tương quan mức đoạn với MQM chỉ từ vừa đến kém, và **gần 0 ở mục Terminology**. XCOMET tương quan âm với độ dài. Tỷ lệ chọn bản người: dịch giả chuyên nghiệp 94,4%, GEMBA-MQM 9,6% | Không có tiếng Việt; model đời 2024 | đọc |
| [Nghiên cứu người đọc (2606.26040)](https://arxiv.org/html/2606.26040) | FR/PL/JA→EN, 15 người đọc, khúc khoảng 300 từ. Người đọc chọn bản người 522/772 lần. LiTransProQA, MetricX-QE và CometKiwi đều chọn bản máy (Kendall τ từ −0,318 đến −0,075) | Bản máy do pipeline agent tạo | đọc |
| [WMT25 General](https://aclanthology.org/2025.wmt-1.22.pdf) | Một hệ dùng XCOMET và GEMBA làm reward khi huấn luyện: đứng đầu bảng tự động ở gần mọi cặp nhưng **thấp hơn hẳn** ở đánh giá người | EN→VI chỉ có điểm tự động | đọc |

### 1.2 LLM làm giám khảo

| Nguồn | Phát hiện | Giới hạn | Mức kiểm |
| --- | --- | --- | --- |
| [GEMBA-MQM](https://arxiv.org/abs/2310.13988), [repo](https://github.com/MicrosoftTranslator/GEMBA) | Đánh dấu span lỗi, không cần tham chiếu. Prompt mang giấy phép **CC BY-SA 4.0**: chép thì phải chia sẻ cùng giấy phép | Tác giả khuyên thận trọng khi dùng để chứng minh cải tiến | tóm tắt / đọc |
| [ESA (WMT24)](https://arxiv.org/abs/2406.11580) | Đánh dấu span minor/major rồi chấm 0–100. Nhanh hơn MQM 23–32%, đồng thuận giữa người chấm cao hơn MQM | En→De | đọc |
| WMT25 (cùng bài trên) | Command A chấm bản người tiếng Iceland thấp hơn GPT-4.1 15 điểm: judge kém ở ngôn ngữ nó không mạnh | — | đọc |
| [DiscoX](https://arxiv.org/abs/2511.10984) | o3 làm judge tự chấm mình **cao nhất** (77,54), trong khi người xếp nó thứ ba | ZH-EN văn bản dài, 4 model | đọc |
| [Position bias (2406.07791)](https://arxiv.org/abs/2406.07791) | Thiên lệch vị trí có hệ thống, **mạnh nhất khi hai bản gần nhau**. Đây đúng là kiểu A/B Mira sẽ chạy | Không riêng cho dịch | tóm tắt |
| [Multilingual LLM-as-a-Judge (EMNLP Findings 2025)](https://arxiv.org/html/2505.12201v1) | 25 ngôn ngữ, Fleiss κ trung bình khoảng 0,3; dùng ensemble thì đỡ | Có tiếng Việt nhưng không ở bộ MT | đọc |

### 1.3 Kiểm tất định

| Nguồn | Phát hiện | Mức kiểm |
| --- | --- | --- |
| [GalTransl](https://github.com/GalTransl/GalTransl/blob/main/README_EN.md) | Tám loại kiểm: từ lặp, dấu câu, kana còn sót, xuống dòng, bản dịch dài hơn 1,3 lần bản Nhật, không theo từ điển, nghi chưa dịch. Lọc theo loại lỗi để dịch lại | đọc |
| [Xbench QA](https://docs.xbench.net/online-help/dialogs/main-window/qa/), [Verifika](https://e-verifika.com/help_terminology) | Chưa dịch, đích trùng nguồn, không nhất quán, thuật ngữ thiếu hoặc bị cấm, kiểm ngược chiều. Xbench không kiểm độ dài | đọc |
| [Last Translation Benchmark (2609.04173)](https://arxiv.org/abs/2609.04173) | Dùng quy tắc kiểm viết tay cho từng lỗi cụ thể thay cho điểm số, vì điểm số dễ bị "reward hacking" | tóm tắt |

**Tỷ lệ độ dài (tự tính** trên bản tham chiếu `google/wmt24pp`, Apache-2.0; đếm ký tự không tính khoảng trắng; bỏ dòng `is_bad_source`). Không tìm thấy số đã công bố cho ZH→VI hay EN→VI.

| Tỷ lệ | Literary (206 đoạn): trung vị [p5–p95] | Toàn bộ (960 đoạn) |
| --- | --- | --- |
| VI / EN | 0,99 [0,75–1,29] | 1,02 [0,79–1,34] |
| VI / ZH | 2,44 [1,70–3,13] | 2,45 [1,60–3,29] |
| Âm tiết VI / chữ Hán | 0,81 [0,63–1,10] | 0,85 [0,58–1,12] |
| VI / JA | 1,74 [1,20–2,26] | 1,85 [1,20–2,57] |

Giới hạn của bảng: bản ZH, JA và VI ở đây đều được dịch từ cùng một nguồn tiếng Anh, không phải dịch thẳng ZH→VI; đoạn literary ngắn (trung bình 38 token).

### 1.4 Người chấm và cỡ mẫu

- **WMT25** dùng ESA với người chấm chuyên nghiệp, mất **23–101 giây mỗi đoạn** khoảng 100 từ ([findings](https://aclanthology.org/2025.wmt-1.22.pdf), đọc).
- **Chấm hai bản cạnh nhau** (side-by-side) nhất quán hơn chấm từng bản riêng ([Song et al., ACL 2025](https://aclanthology.org/2025.acl-long.1002/), tóm tắt).
- **LITEVAL:** so cặp kiểu BWS đáng tin hơn MQM. Sinh viên chấm MQM xếp nhầm khoảng 60% bản người thành bằng hoặc kém bản máy (đọc).

**Sign test hai phía, α = 0,05 (tự tính):**

| Tỷ lệ thắng thật (bỏ hòa) | Cặp không hòa để có power 0,8 | Power khi có 30 / 50 / 100 cặp |
| --- | --- | --- |
| 0,60 | 199 | 0,18 / 0,24 / 0,46 |
| 0,65 | 90 | 0,36 / 0,51 / 0,83 |
| 0,70 | 49 | 0,59 / 0,78 / 0,98 |
| 0,75 | 30 | 0,80 / 0,94 / 1,00 |

Bảng giả định các cặp độc lập. Đoạn trong cùng một chương tương quan nhau, nên thực tế cần **nhiều hơn**.

### 1.5 Dữ liệu có sẵn và tính lặp lại

- **Dữ liệu:** không tìm thấy benchmark văn học ZH→VI hay JA→VI có người chấm. Những gì có:
  - [WMT24++](https://huggingface.co/datasets/google/wmt24pp) có `en-vi_VN`: 998 dòng, miền literary 206 đoạn trong 8 tài liệu, **Apache-2.0** (đọc).
  - FLORES+ (CC BY-SA, gated) là văn tin tức/wiki.
  - PhoMT chỉ dùng cho nghiên cứu.
  - GuoFeng Webnovel chỉ có ZH→EN, phi thương mại.
  - [`tran-vi-teacher`](https://huggingface.co/datasets/ngocdang83/tran-vi-teacher) có 350 nghìn đoạn web novel ZH→VI do Gemini sinh, không ai duyệt. Không dùng làm chuẩn được.
- **Tính lặp lại:**
  - Qwen3-235B ở temperature 0 cho 80 bản khác nhau trên 1.000 lần chạy ([Thinking Machines](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/), đọc).
  - Năm LLM, tám tác vụ: độ chính xác dao động tới 15% giữa các lần chạy ([2408.04667](https://arxiv.org/abs/2408.04667), tóm tắt).
  - "Error bars" khuyên phân tích **hiệu theo cặp** và ước lượng sai số theo cụm ([2411.00640](https://arxiv.org/html/2411.00640), đọc).
  - Không tìm thấy số đo phương sai riêng cho dịch văn học.

## Quan sát 2 — Prompt, tham số sinh và định dạng đầu ra

### 2.1 Nội dung system prompt

| Nguồn | Phát hiện | Giới hạn | Mức kiểm |
| --- | --- | --- | --- |
| [Merx et al. (EMNLP 2026)](https://arxiv.org/html/2606.03259v2) | Chỉ dẫn tường minh về mục đích và người đọc tăng "adaptedness" **+11,1 điểm**, few-shot chỉ +2,9 (model 12B). Model lớn hưởng lợi nhiều hơn | Gemma 3/4, judge là LLM | đọc |
| [Lai & Li (2607.03160)](https://arxiv.org/abs/2607.03160) | GPT-5.2: người chấm xếp prompt BRIEF cao nhất (MQM 8,66 so với 7,84), trong khi BLEU/BERTScore chọn prompt gốc. Viết prompt bằng ngôn ngữ nào gần như không ảnh hưởng | ES→ZH, mẫu nhỏ | tóm tắt |
| [Peng et al. 2023](https://arxiv.org/abs/2303.13780) | Nêu tác vụ và lĩnh vực trong prompt có ích; **CoT làm dịch từng chữ** | ChatGPT 2023 | tóm tắt |
| [Gemini 3 guide](https://ai.google.dev/gemini-api/docs/gemini-3) | "Be concise in your input prompts"; với dữ liệu lớn, đặt chỉ dẫn cụ thể ở cuối | Hướng dẫn chung | đọc |

**Cấu trúc prompt của các công cụ** (agent đọc tệp thô; đối chiếu lại nguyên văn LinguaGacha, AiNiee, llm-subtrans):

- **LinguaGacha** (không có LICENSE):
  - Khối quy tắc khoảng 350–450 token; phần động nằm ở tin nhắn user.
  - Quy tắc: đại từ đúng; "vivid, natural, and colloquial"; dịch cả nội dung thô tục "without evading, diluting, or prettifying"; "Merging or splitting adjacent lines is strictly prohibited".
- **GalTransl** (GPL-3.0): khối XML gồm thông tin nhiệm vụ, quy trình, hướng dẫn, bản dịch trước, glossary, đầu vào. Có nêu người đọc ("mass ACGN readers").
- **AiNiee** (AGPL-3.0): có preset riêng cho model suy luận, **bỏ CoT 3 bước**.
- **auto-novel** (GPL-3.0): "không bỏ câu nào, không thêm giải thích", kèm dấu "hết nguyên văn" để chặn bịa thêm.
- **llm-subtrans** (MIT): bốn ví dụ cố định để minh họa định dạng; temperature 0.0.
- **Khối chỉ dẫn lõi** của các công cụ dài khoảng 60–600 token.

### 2.2 Thinking và temperature

| Nguồn | Phát hiện | Giới hạn | Mức kiểm |
| --- | --- | --- | --- |
| [Test-time scaling cho MT (2510.06471)](https://arxiv.org/html/2510.06471v1) | 12 model, ngân sách thinking 0–2.000 token: chất lượng gần như đi ngang sau khoảng 100 token. Ép nghĩ thêm làm 55/64 điểm số giảm. Có ích khi model đã tinh chỉnh cho miền đó, hoặc khi hậu biên tập | Model mở | đọc |
| [Chen et al. 2025 (2502.11544)](https://arxiv.org/html/2502.11544) | Model kiểu o1 tốn khoảng 10 lần token đầu ra và 8–40 lần thời gian. Hay "lan man", giải thích thay vì dịch, nặng nhất ở các cặp có tiếng Trung | Câu ngắn, Flores | đọc |
| [Gemini thinking](https://ai.google.dev/gemini-api/docs/thinking) | Mặc định: dòng Flash 3.5–3.8 "On (medium)", 3.5 Flash-Lite "minimal", 3.1 Pro "high". `minimal` "does not guarantee that thinking is off". Gemini 3: "strongly recommend keeping… [temperature] 1.0… may lead to… looping" | Tên model 3.5–3.8 chưa đối chiếu chéo | đọc |
| [Gemini OpenAI compat](https://ai.google.dev/gemini-api/docs/openai) | Bảng ánh xạ `reasoning_effort` **chưa có** cho 3.5–3.8 Flash. "Reasoning cannot be turned off for Gemini 2.5 Pro or 3 models" | — | đọc |
| [python-genai #2062](https://github.com/googleapis/python-genai/issues/2062) | Gemini 3: trần đầu ra 16.384 token, dùng hết 15.726 cho thinking, còn 118 cho bản dịch | Issue người dùng | đọc |
| [DeepSeek parameter settings](https://api-docs.deepseek.com/quick_start/parameter_settings) | Temperature khuyên dùng cho dịch: **1.3**. Chế độ thinking bỏ qua temperature | — | đọc |

### 2.3 Định dạng đầu ra

| Nguồn | Phát hiện | Mức kiểm |
| --- | --- | --- |
| [Let Me Speak Freely? (2408.02442)](https://arxiv.org/html/2408.02442v1) và [phản biện của dottxt](https://blog.dottxt.ai/say-what-you-mean.html) | Ép định dạng làm giảm suy luận, nhưng dùng cùng prompt thì đầu ra có cấu trúc lại thắng. Bằng chứng không phải về dịch | đọc |
| [ai-subtitle-translator PR #7](https://github.com/LavX/ai-subtitle-translator/pull/7), [#8](https://github.com/LavX/ai-subtitle-translator/pull/8) | Gemini Flash-Lite chèn xuống dòng hoặc tab thô vào chuỗi JSON, mất cả lô 286 dòng. Prompt đòi mảng trần nhưng gửi `json_object`: DeepSeek trả một đối tượng ở 4/6 lần | đọc |
| [RFC 8259 §7](https://www.rfc-editor.org/rfc/rfc8259#section-7) | Chỉ `"`, `\` và ký tự điều khiển phải thoát; 「」『』“” không cần | đọc |
| Tỷ lệ mất hoặc gộp ID theo định dạng | **Không tìm thấy** nghiên cứu nào | — |

### 2.4 Few-shot cố định

- **Văn phong:** có 20 ví dụ đúng giọng một dịch giả, tỷ lệ đầu ra máy nhận là giọng đó tăng 2–4 lần, trong khi COMET đứng yên ([Scalena et al., EACL 2026](https://arxiv.org/html/2505.16612), đọc).
- **Có thể làm hại:** ví dụ cố định làm EN→Khmer giảm 21,6 COMET ([2506.00507](https://arxiv.org/html/2506.00507v1), đọc).
- **Công cụ dịch truyện** ít dùng ví dụ cố định; khi dùng thì chủ yếu để minh họa định dạng.

## Quan sát 3 — Quy ước tiếng Việt

Nghiên cứu riêng cho cặp Nhật → Việt (lược chủ thể, xưng hô/kính ngữ, ngôn ngữ vai, tên riêng và
rubric đề xuất) nằm ở [Dịch truyện Nhật → Việt](ja-vi-translation.md). Phần dưới đây giữ vai trò bảng
tổng hợp nhiều ngôn ngữ; khi có khác biệt, trang chuyên cặp ngôn ngữ là nơi chịu trách nhiệm.

Agent đọc hướng dẫn biên tập, diễn đàn và prompt của các công cụ dịch truyện Việt trên GitHub. Phần lớn là repo nhỏ (0–3 sao), nên chỉ là **tín hiệu thực hành**, không phải chuẩn. Hako chỉ cấm convert trong mục "AI dịch", **không** có quy định về tên hay kính ngữ.

| Chủ đề | Thực hành tìm thấy | Nguồn (giấy phép nếu là mã) |
| --- | --- | --- |
| Tên, môn phái, cảnh giới gốc Trung | Hán-Việt, giữ trật tự Hán-Việt ("Thái Âm Tông"); "TUYỆT ĐỐI không để pinyin"; cảnh giới giữ Hán-Việt (Luyện Khí, Kim Đan) | [dembuon](https://dembuon.vn/threads/cac-thuat-ngu-trong-truyen-tien-hiep.44990/), [KazuoKai](https://github.com/KazuoKai/ai-translator-pro) (không license), [quick-translate](https://github.com/thiendiepdt/quick-translate) (không license) |
| Tên phương Tây phiên qua chữ Hán | "khôi phục TÊN GỐC TIẾNG ANH" (阿诗娜 → Athena); tây huyễn không dùng âm Hán-Việt cho tên | [caoduongle/API_dich_truyen](https://github.com/caoduongle/API_dich_truyen) (**MIT**), KazuoKai |
| Văn convert | Bỏ "bất quá", "thân ảnh", "tựa hồ" và hư từ đích/a/ân; sửa câu kiểu "Hắn tại trường học gặp nàng"; thay từ Hán-Việt gượng gạo; tránh lặp từ ở khoảng gần | [vozer.net](https://vozer.net/threads/cach-edit-truyen-tu-ban-convert.2662/), [ngontinhgroup](https://ngontinhgroup.wordpress.com/cach-edit-cho-nguoi-moi/), caoduongle |
| Đại từ ngôi ba | "'Hắn' nên chỉ dùng cho Main", nhân vật khác dùng gã, y, lão, nàng, thị. Có công cụ thì "TUYỆT ĐỐI KHÔNG DÙNG 'y'" → **còn tranh cãi** | vozer.net, KazuoKai |
| Xưng hô | "TUYỆT ĐỐI KHÔNG để xảy ra tình trạng 'lúc xưng anh-em, lúc xưng tôi-cô…'"; preset tiên hiệp ta–ngươi, đạo hữu, tiền bối–vãn bối | [Donut4055/truyen](https://github.com/Donut4055/truyen) (không license) |
| Lời thoại | Ngoặc kép **hoặc** gạch đầu dòng, không trộn; tacgiaviet khuyến khích ngoặc kép; 「」 thành ngoặc kép, 『』 giữ cho chữ trên màn hình; 【】 cho chữ hệ thống | [tacgiaviet](https://tacgiaviet.com/quy-dinh), [MTLS](https://github.com/thang97-21/MTLS) (**Apache-2.0**), quick-translate |
| Nguồn Nhật | Tên romaji Hepburn, thứ tự Họ + Tên; Nhật hiện đại giữ -san/-kun, fantasy dùng Sir/Lady. Cộng đồng **chưa có chuẩn** về kính ngữ | MTLS |
| Độc giả nói về bản AI | Bản Gemini "hơn convert nhưng vẫn ko nuột"; "tên nhân vật khác qua chương mới tên khác" | [Voz](https://voz.vn/t/ai-dich-tieu-thuyet-gay-tranh-cai-chat-luong-khong-thua-kem-ban-nguoi-dich.1122997/page-7) |

Chỉ caoduongle (MIT), MTLS (Apache-2.0), Translation-Agent và llm-subtrans (MIT) cho phép dùng lại nguyên câu chữ. Các repo không có license hoặc theo GPL/AGPL thì chỉ học ý.

## Quan sát 4 — Lượt soát lại và hậu biên tập bằng LLM

| Nguồn | Phát hiện | Giới hạn | Mức kiểm |
| --- | --- | --- | --- |
| [Tan et al. 2026 (2605.13368)](https://arxiv.org/abs/2605.13368) | Người chấm MQM trên WMT24 Literary (7 hướng dịch, 9 LLM). Refine bằng prompt chung tăng MQM tổng (+4,4 đến +12,2) và Fluency, nhưng **Accuracy giảm** với Qwen3-235B (−2,3), DeepSeek-V3 (−0,6), GPT-5.2 (−1,2). Người chấm chọn bản refine 97,5% về độ mượt, chỉ 76,1% về độ đúng. Lỗi model tự chẩn đoán khớp lỗi MQM rất kém (F1 0,06–0,21). Refine theo đoạn sửa **25–40% token**. Step-by-step không hơn prompt "dịch lại cho tốt hơn" | Không có tiếng Việt | đọc† |
| [Xu et al. 2024 (2402.11436)](https://arxiv.org/abs/2402.11436) | Tự sửa 10 vòng: model tự chấm thấy tiến bộ, BLEURT không tăng. Feedback từ ngoài thì giúp | Ngôn ngữ ít tài nguyên → EN | đọc† |
| [Chen et al. (2306.03856)](https://arxiv.org/abs/2306.03856) | Sửa mà không kèm nguồn (paraphrase) tụt ở mọi chỉ số; cần nguồn làm neo "to prevent semantic drift" | GPT-3.5 | đọc† |
| [Briakou et al. (2409.06790)](https://arxiv.org/abs/2409.06790) | Research → nháp → refine → proofread cải thiện MetricX, tốn 4 lượt gọi. Bước refine có ví dụ thêm chi tiết không có trong nguồn | Chỉ metric tự động | đọc† |
| [TransAgents (2405.11804)](https://arxiv.org/abs/2405.11804) | Truyện mạng ZH→EN: người đọc thích hơn GPT-4 (55,6%), nhưng có "significant content omission"; khoảng 2 USD/chương (2024) | Khó tái lập | đọc† |
| [Bogoychev & Chen (2310.05824)](https://arxiv.org/abs/2310.05824), [Translate-and-Revise (2407.13164)](https://arxiv.org/abs/2407.13164) | Cho LLM sửa đúng chỗ vi phạm thuật ngữ, kèm danh sách ràng buộc **chưa thỏa**: recall thuật ngữ và độ chính xác ràng buộc tăng (khoảng 15%) | Không rõ đo trên mọi câu hay chỉ câu vi phạm | đọc / tóm tắt |
| [Diagnose, Then Repair (2609.22793)](https://arxiv.org/abs/2609.22793) | Chẩn đoán span lỗi trước, rồi chỉ sửa tối thiểu trong span: ít trôi diễn đạt hơn "chấm và sửa" một bước | Miền chuyên ngành | tóm tắt |
| Luật tất định rồi dịch lại, cho tiếng Việt | **Không tìm thấy** bài nào đo. GalTransl và [trans-assistant](https://github.com/RinYuki-sclass/trans-assistant) có tính năng này nhưng không công bố số | — | đọc |

## Quan sát 5 — Model, benchmark và giá

- **Benchmark dịch vào tiếng Việt:**
  - WMT25 General **không có** tiếng Việt.
  - Phần MT của [WMT25 Multilingual Instruction](https://aclanthology.org/2025.wmt-1.23.pdf) có EN→VI, chỉ chấm tự động, và GPT-4.1 vừa thi vừa làm một trong hai giám khảo. AutoRank (thấp là tốt): Gemini 2.5 Pro 1,0; GPT-4.1 1,1; DeepSeek V3 1,4; Qwen3-235B 1,4; Claude 4 2,6; Gemma 3 27B 5,9 (đọc†).
  - Không tìm thấy benchmark văn học ZH/JA→VI nào.
  - [DITING](https://arxiv.org/abs/2510.09116) (truyện mạng ZH→EN) xếp DeepSeek-V3 trên GPT-4o (đọc).
- **Cộng đồng Việt** (giai thoại):
  - Họ Gemini Flash chiếm ưu thế vì có free tier.
  - Một thread Voz tháng 8/2026 cho rằng 3.5 Flash-Lite rẻ nhưng "chất lượng dịch không đảm bảo".
  - Repo Việt hay dùng Flash-Lite để dịch và Flash để kiểm.
- **Tài liệu Google:**
  - "Rate limits are applied **per project, not per API key**."
  - Ở free tier, mục "Used to improve our products" ghi **Yes** ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [pricing](https://ai.google.dev/gemini-api/docs/pricing); đọc†).
- **Giá cho 1.000 chương** (giá niêm yết đọc ngày 2026-10-03, qua agent; **giá đổi nhanh**):
  - Giả định mỗi chương 3.000 chữ Hán, vào khoảng 7.000 token (gồm prompt và ngữ cảnh), ra khoảng 6.000 token (chưa đo). Không tính cache hay batch.

| Model | Giá vào / ra mỗi 1M token | 1.000 chương |
| --- | --- | --- |
| `deepseek-flash`, tắt thinking | 0,30 / 1,20 USD (giờ cao điểm; ngoài giờ giảm một nửa) | khoảng 5–9 USD |
| `gemini-3.5-flash-lite` | 0,30 / 2,50 | khoảng 17 USD |
| `gemini-3.8-flash` | 0,75 / 3,75 đến 2026-12-31; **1,50 / 7,50 từ 2027-01-01** | khoảng 28–39 USD; 56–78 USD từ 2027 |
| `deepseek-v4-pro`, tắt thinking | 1,32 / 3,96 (giờ cao điểm) | khoảng 17–33 USD |
| `gpt-6.1-sol` | 2 / 10 | khoảng 74 USD |
| `gemini-3.1-pro-preview` | 2 / 12 | khoảng 86–122 USD |

Tên model đời mới chỉ được xác nhận qua trang giá chính thức; chưa có model card hay benchmark dịch nào cho chúng.

## Suy luận cho Mira

> Mọi mục dưới đây là **đề xuất**, chưa phải quyết định. Con số token là ước lượng, chưa đếm bằng tokenizer. Nơi làm từng mục ghi ở [lộ trình](../delivery/roadmap.md).

### Đo (module Bộ đo)

**E1. Fixture có cấu trúc, chia hai phần: riêng tư và công khai.**
- **Mỗi chương một thư mục**, gồm:
  - `meta.json`: ngôn ngữ, tác phẩm, thẻ như `dialogue`, `cultivation-terms`, `pronoun-shift`, `long`.
  - `source.txt`: mỗi đoạn một dòng, theo định nghĩa đoạn của ADR-005.
  - `glossary.json`: mục thuật ngữ, kèm term cấm.
  - `pronouns.json`: cặp xưng hô viết tay.
  - `reference.vi.txt` (tùy chọn): bản dịch tham chiếu.
  - `assertions.json`: quy tắc viết tay, ví dụ "đoạn 12 phải chứa 'sư huynh'".
- **Quy mô:** bắt đầu với 4 chương (2 ZH, 1 JA, 1 EN) cho lần chạy A/A. Nâng lên khoảng 12 chương (300–400 đoạn) trước khi dùng kết quả để quyết định. Cố ý có chương thoại dày đổi xưng hô, chương dày thuật ngữ, một chương rất dài, chữ phồn thể, và tiếng Nhật có kính ngữ.
- **Riêng tư:** raw có bản quyền **để ngoài repo**, ở thư mục bị ignore hoặc repo riêng. Repo chỉ giữ định dạng, script và số đo.
- **Công khai:** khoảng 50 đoạn literary của WMT24++ `en-vi_VN` (Apache-2.0) được vào repo, để ai cũng chạy lại được.

**E2. Tầng T0: kiểm tất định, chạy mọi lần, không tốn tiền.** Viết bằng hàm thuần TypeScript ở `src/shared/algorithms/`, để module QA dùng lại nguyên. Các phép kiểm:
- **Cấu trúc:** số đoạn lệch, đoạn rỗng, đầu ra trùng nguồn, `finish_reason` khác `stop`.
- **Chữ nguồn còn sót:** chữ Hán, kana, có danh sách ngoại lệ.
- **Độ dài:** tỷ lệ độ dài từng đoạn nằm ngoài băng. Băng khởi điểm lấy từ bảng ở Quan sát 1.3 nới ±20%, bỏ qua đoạn dưới 20 ký tự. Hiệu chỉnh lại trên bản dịch đã duyệt.
- **Vòng lặp:** n-gram âm tiết lặp nhiều lần, hoặc đoạn trùng đoạn liền trước.
- **Thuật ngữ:** tỷ lệ tuân thủ và term cấm, so khớp sau khi chuẩn hóa NFC, chấp nhận cả hai kiểu đặt dấu thanh (hòa/hoà).
- **Xưng hô:** chỉ cảnh báo, không đánh trượt, vì chưa biết ai nói với ai ([hệ thống ngữ cảnh](context-system.md) K5).

Thuật ngữ được kiểm ở tầng này chứ không hỏi giám khảo, vì LLM-judge kém nhất đúng ở mục Terminology.

**E3. Tầng T1: giám khảo LLM so cặp mù.**
- **Đầu vào và đầu ra:** đưa cả chương vào; judge phán **theo từng đoạn**: A tốt hơn / B tốt hơn / ngang, kèm lỗi major hoặc minor ở bốn mục: sai nghĩa hoặc bỏ sót, độ tự nhiên, xưng hô so với ma trận đưa kèm, giọng văn.
- **Chống thiên lệch:** chạy cả hai thứ tự, chỉ tính thắng khi hai chiều cùng kết quả. Judge **khác họ** với model dịch; khi so hai nhà cung cấp thì judge thuộc họ thứ ba; dùng hai judge khác họ nếu có thể (WMT25 dùng GPT-4.1 + Command A).
- **Cố định:** model ID, mã băm prompt và nhiệt độ của judge.
- **Kiểm A/A:** hai lần chạy của cùng một điều kiện so với nhau phải ra khoảng 50%; đó là mức nhiễu nền. Lấy luôn từ các lần lặp, không tốn thêm tiền dịch.
- **Giấy phép:** prompt GEMBA là CC BY-SA, nên tự viết prompt chứ không chép.

**E4. Tầng T2: metric học sẵn, tùy chọn, chỉ để chẩn đoán.** MetricX-24 hybrid (Apache-2.0) chạy ở chế độ không cần tham chiếu, theo từng đoạn, bằng script Python ngoài app. Không dùng điểm này để quyết định: nó chưa được kiểm cho văn học tiếng Việt, thiên lệch theo độ dài, và WMT25 cho thấy tối ưu theo metric thì tụt ở đánh giá người. **Không dùng** CometKiwi hay XCOMET khi chưa rà giấy phép NC.

**E5. Tầng T3: người chấm mù.**
- Chủ sản phẩm chấm cạnh nhau, chỉ chọn A / B / ngang. Có thể đánh dấu thêm lỗi major/minor kiểu ESA rút gọn.
- Mỗi thí nghiệm chấm 60–80 cặp đoạn lấy ngẫu nhiên, ẩn tên điều kiện.
- Đoạn bị T0 gắn cờ hoặc hai judge bất đồng thì xem riêng để chẩn đoán, **không gộp vào ước lượng tỷ lệ thắng**.
- Lần đầu, dùng nhãn của người để đo đồng thuận judge–người, rồi mới đặt ngưỡng tin judge.

**E6. Lặp lại và quy tắc quyết định.**
- Mỗi điều kiện, mỗi chương chạy **3 lần**. Đơn vị phân tích là chương, so theo cặp; bootstrap theo chương.
- Một thay đổi được coi là **có lợi** khi đủ ba điều:
  - T0 không xấu đi: không lệch đoạn, tuân thủ thuật ngữ không giảm.
  - Cận dưới khoảng tin cậy 95% của tỷ lệ thắng ở T1 trên 50%, và A/A nằm trong khoảng nhiễu.
  - Người chấm ở T3 không cho kết quả ngược chiều.

**E7. Không làm:**
- Lấy BLEU/chrF làm thước đo chính.
- Dùng judge cùng họ với model dịch.
- Tinh chỉnh prompt theo chính judge dùng để chấm cuối.
- Kết luận từ một lần chạy, hoặc từ dưới khoảng 50 cặp không hòa.
- So điểm giữa các phiên bản judge khác nhau.
- Đưa cả chương vào COMET/MetricX (sẽ bị cắt).
- Dùng MQM đầy đủ khi chỉ có một người chấm.

### Prompt và tham số (module Lõi dịch)

**G1. Khung tầng A:** một system prompt ổn định theo tác vụ, khoảng 1.200–2.500 token, theo thứ tự:
1. **Vai và brief:** dịch truyện mạng cho độc giả Việt đọc giải trí; dịch đủ, không tóm tắt, không bỏ, không thêm chú thích, không làm nhẹ nội dung.
2. **Hợp đồng vào/ra:** mỗi `[n]` một đoạn, 1:1, cấm gộp hoặc tách; không có chữ ngoài định dạng.
3. **Quy ước tiếng Việt chung:**
   - Một kiểu thoại duy nhất, theo cài đặt.
   - Danh sách từ đệm convert cần tránh.
   - Trật tự câu tiếng Việt.
   - Tránh lặp từ ở khoảng gần.
   - Bù chủ ngữ ẩn.
   - Đại từ ngôi ba theo bảng thể loại.
   - **Xưng hô theo ma trận ở tầng B thắng mọi mặc định.**
4. **Phụ lục theo ngôn ngữ nguồn** (G2).
5. **Preset thể loại và văn phong đã duyệt:** là dữ liệu, không viết cứng (G3).
6. **Tùy chọn:** 2–3 cặp ví dụ minh họa định dạng (G6).
7. **Nhắc lại định dạng thật ngắn ở cuối tin nhắn user** (tầng C).

Không viết CoT vào prompt. Không độn tầng A để chạm ngưỡng cache, vì càng nhiều chỉ dẫn thì độ tuân thủ càng giảm (IFScale, đã dẫn ở [đợt 2](context-system.md)).

**G2. Phụ lục theo nguồn.**
- **ZH:**
  - Tên, địa danh, môn phái, cảnh giới, công pháp đọc Hán-Việt, giữ trật tự Hán-Việt, không pinyin. Kèm danh xưng (sư huynh, sư tôn).
  - Tên phương Tây phiên qua chữ Hán thì khôi phục tên gốc nếu nhận ra; nếu không thì đưa vào hàng chờ thuật ngữ.
  - Thành ngữ dịch nghĩa, trừ thành ngữ Hán-Việt đã quen dùng.
  - “” và 「」 chuyển theo kiểu thoại đã chọn; 【】 giữ cho chữ hệ thống.
- **JA:**
  - Tên romaji Hepburn, giữ thứ tự Họ + Tên như nguồn; katakana mượn từ tiếng Anh thì về dạng tiếng Anh.
  - Kính ngữ là cài đặt ba mức (giữ / Việt hóa / theo bối cảnh).
  - Đại từ ore/boku/watashi đi theo ma trận xưng hô.
- **EN:**
  - Giữ tên; Sir/Lady giữ hoặc dịch theo cài đặt.
  - Không dùng xưng hô cổ phong cho fantasy phương Tây.

**G3. Chỗ còn tranh cãi thì làm thành cài đặt, không viết cứng.** Gồm: dùng "y" hay không, mức Hán-Việt, ngoặc kép hay gạch thoại, kính ngữ Nhật. Preset thể loại (tiên hiệp/cổ đại, đô thị, tây huyễn, light novel Nhật) chỉ điền giá trị mặc định cho bảng đại từ. Người dùng duyệt như mọi mục ngữ cảnh khác (kiểu `style` của `context-core`).

**G4. Tham số: đo rồi mới đặt mặc định.**
- **Gemini 3.x:** không gửi temperature (giữ 1.0); thinking ở mức thấp nhất model nhận.
- **Gemini 2.5 Flash:** so `none` với `low`.
- **DeepSeek:** tắt thinking, so temperature để trống / 1.3 / 0.3.
- **Luôn gửi `max_tokens`**, tính bằng ước lượng đầu ra tiếng Việt × hệ số dư, **cộng** ngân sách thinking. Gặp `length` hoặc đầu ra rỗng thì chia nhỏ lô, không gửi lại y hệt ([chia lô](chunking-translation.md) C6).
- **Gemini 3.5–3.8 Flash:** phải đo xem `reasoning_effort` ánh xạ ra mức nào, vì tài liệu chưa có bảng.

Cách làm này hợp với nguyên tắc hiện có "chỉ gửi tham số người dùng đã bật", vì lõi dịch sẽ đặt giá trị mặc định cho riêng tác vụ dịch, và giá trị đó hiện trong hộp thoại.

**G5. Làm parse bền hơn trước khi đổi định dạng.**
- Parse khoan dung: chấp nhận xuống dòng và tab thô trong chuỗi, sửa `"` không thoát khi chắc chắn, gỡ lớp bọc kiểu `{"translations":[…]}`.
- Không gửi `json_object` khi prompt đòi mảng trần.
- Bảo model dùng “ ” cho thoại tiếng Việt: vừa đúng quy ước chữ, vừa bớt phải thoát ký tự (suy từ RFC 8259, chưa đo).
- Sau đó mới so định dạng bằng thí nghiệm (B4 ở dưới).

**G6. Few-shot cố định chỉ để minh họa định dạng và văn phong, không kỳ vọng tăng chất lượng.** Ví dụ lấy từ đoạn đã duyệt ([đợt 2](context-system.md) K6) vẫn là đường chính khi có.

### Lượt soát lại và model (module Lõi dịch, QA, Tác vụ)

**R1. Bản đầu không có lượt refine cả chương.**
- Bằng chứng cho thấy refine đổi lấy độ mượt, còn độ đúng nghĩa không tăng hoặc giảm.
- Chi phí gần gấp đôi.
- Refine theo đoạn sửa 25–40% token, biến thành gánh duyệt lại cả chương.

Điều này củng cố C8 của [chia lô](chunking-translation.md) bằng bằng chứng mạnh hơn nguồn cũ.

**R2. Kiểm tất định rồi dịch lại đúng đoạn bị cờ.**
- **Đoạn nào:** đoạn trượt T0 (thiếu, rỗng, còn chữ nguồn, độ dài bất thường, lặp vòng; ở module Thuật ngữ thêm: thiếu thuật ngữ).
- **Cách gửi lại:** một lần, kèm lỗi cụ thể và danh sách ràng buộc chưa thỏa (kiểu Translate-and-Revise).
- **Ghi vào đâu:** kết quả đi cùng đường ghi với bản dịch. Trước module Đề xuất là trong lần dịch; sau đó là một đề xuất.
- **Chi phí:** tỷ lệ với số đoạn bị cờ, phải đo.

**R3. Refine chọn lọc là tùy chọn sau bản đầu, mặc định tắt.** Chỉ mở nếu thí nghiệm B6 cho thấy nó thắng về **độ đúng nghĩa** theo người chấm. Khi mở:
- Luôn kèm nguồn.
- Chẩn đoán span trước, chỉ sửa trong span đó (Diagnose-then-Repair).
- Ưu tiên model khác và mạnh hơn làm người sửa.
- Chi phí hiện trước và nằm dưới trần của tác vụ.

**R4. Không làm lượt đánh bóng tiếng Việt bỏ nguồn**, vì hai nghiên cứu độc lập thấy trôi nghĩa.

**R5. LLM-judge trong sản phẩm chỉ gắn cờ cho người xem**, ghi rõ "AI cho rằng…", dùng model khác model dịch, và không tự sửa trong vòng lặp.

**R6. Ma trận model cho benchmark đầu tiên** (khoảng 5 model):
- Gemini Flash đời hiện tại: mặc định của người dùng hiện nay.
- Một model rẻ: Flash-Lite hoặc `deepseek-flash`.
- `deepseek-v4-pro`: mạnh, gốc Trung Quốc, giá vừa.
- Một model làm trần chất lượng: dòng GPT hoặc Claude qua OpenRouter, vì [ADR-004](../decisions/0004-ai-provider-layer.md) không có adapter Anthropic native.
- Một model local qua Ollama: Qwen hoặc Gemma cỡ khoảng 30B.

**R7. Ước lượng chi phí phải biết thêm:**
- Thinking được tính như đầu ra; có model không tắt được thinking.
- Giá theo ngày hiệu lực (Gemini tăng giá từ 2027-01-01).
- Giá theo giờ của DeepSeek.
- Hệ số tokenizer theo nhà cung cấp.
- Đối chiếu với `usage` thật sau mỗi lần chạy.

Thuộc module Tác vụ, cùng sổ `usage`.

**R8. Free tier và hạn mức.**
- Màn Cài đặt nên nói rõ: dữ liệu gửi qua free tier của Gemini được dùng để cải thiện sản phẩm. Đây là một phần câu hỏi mở "dữ liệu nào được gửi đi".
- Nhiều khóa trong cùng một project **không** cộng hạn mức.
- Không xây xoay vòng nhiều tài khoản để lách hạn mức.

## Bước kiểm chứng

Dùng chung fixture với các bước kiểm chứng của [ngữ cảnh đợt 1](story-context.md#bước-kiểm-chứng), [đợt 2](context-system.md#bước-kiểm-chứng) và [chia lô](chunking-translation.md#bước-kiểm-chứng). Mỗi điều kiện lặp 3 lần.

| # | Thí nghiệm | Đo gì | Module |
| --- | --- | --- | --- |
| B0 | A/A trên 3–4 chương | Mức nhiễu nền của bước dịch cộng judge | Bộ đo |
| B1 | Baseline: prompt MVP trên ma trận model (R6) | T0, T1, `usage` thật, hệ số token tiếng Việt so với nguồn | Bộ đo |
| B2 | Prompt: 5 câu hiện tại / tầng A đầy đủ / tầng A + ví dụ; chỉ dẫn viết tiếng Việt hay tiếng Anh; bật/tắt từng phụ lục | Người chấm làm thước đo chính; số từ đệm convert đếm bằng regex; ID nguyên vẹn; tỷ lệ độ dài | Lõi dịch |
| B3 | Thinking: mức thấp nhất / thấp / vừa; temperature theo G4 | Chất lượng như B2, token thinking, độ trễ, chi phí mỗi chương, tỷ lệ `length` và rỗng, độ ổn định tên giữa 3 lần | Lõi dịch |
| B4 | Định dạng: mảng JSON / JSONL / dòng `[n]` / thẻ `<p id>`, trên chương nhiều thoại | Lỗi parse, ID thiếu hoặc gộp, số lần hỏi lại, token đầu ra | Lõi dịch |
| B5 | Endpoint tương thích của Gemini: nhận `temperature` và `reasoning_effort` thấp cho 3.x Flash không; `usage` có tách thinking không; `max_tokens` có chặn cả thinking không | Bản ghi gọi thật (theo khuôn `scripts/capture-provider-fixtures.mjs`) | Lõi dịch |
| B6 | Lượt soát lại: (a) một lượt; (b) (a) + dịch lại đoạn bị cờ; (c) refine toàn bộ có nguồn; (d) nháp rẻ rồi model mạnh refine; (e) đánh bóng không nguồn, mẫu nhỏ, làm đối chứng âm | Người chấm **riêng** độ đúng và độ mượt; tỷ lệ đoạn bị cờ và tỷ lệ sửa xong sau một lần dịch lại; chi phí | QA |
| B7 | Đồng thuận judge–người trên 50–100 cặp; so hai judge với nhau | Ngưỡng tin judge | Bộ đo |
| B8 | Băng độ dài và ngoại lệ chữ Hán/kana trên bản dịch đã duyệt | Băng thật cho từng cặp ngôn ngữ | Bộ đo, QA |

## Kết quả đo của Mira

Số đo do chính Mira chạy, bằng công cụ tạm [`scripts/bench/`](../../../scripts/bench/) trên [fixture](../../../fixtures/README.md). Bản dịch và báo cáo chi tiết nằm ở `fixtures/private/runs/` (bị ignore vì có văn bản truyện). Mới có **tầng kiểm tất định (T0)**: chưa có giám khảo LLM hay người chấm. Glossary và quy tắc kiểm vẫn là nháp chưa duyệt, nên tỷ lệ "glossary đúng" phản ánh cả lựa chọn văn phong của bảng nháp.

### B1 — baseline đường dịch MVP (2026-10-03)

**Cấu hình:**
- Gemini 2.5 Flash qua endpoint tương thích OpenAI.
- Prompt 5 câu của app; không gửi tham số nào, nên model tự bật thinking.
- Đi đúng đường của app: chuẩn hóa raw, chia câu, `plan` rồi `runBatch` từng lô.
- 8 chương, 4 tác phẩm, 507 đoạn; mỗi chương dịch 3 lần.
- Lô lỗi được gửi lại một lần, như khi người dùng bấm "Dịch lại phần lỗi".

**Kết quả** (24 lần dịch):

| Tác phẩm | Đoạn khớp | Câu bị sót | Glossary đúng / chấp nhận được | Kiểu thoại (3 lần) | Đoạn ngoặc lệch |
| --- | --- | --- | --- | --- | --- |
| Anh, fantasy (57 đoạn) | 3/3 | 1 | 96% / 97% | Việt, Việt, Việt | 0, 1, 1 |
| 西遊記 hồi 2 (54 đoạn) | 3/3 | 1 | 81% / 82% | Việt, Việt, Việt | 1, 2, 0 |
| 孔乙己 (15 đoạn) | 3/3 | 0 | 57% / 60% | Việt, **『』**, Việt | 0, 0, 0 |
| Nhật, chương 01 (87 đoạn) | 2/3 | 0 | 79% / 87% | Việt, Việt, Việt | 1, 0, 0 |
| Nhật, chương 02 (69 đoạn) | 2/3 | 0 | 87% / 88% | **「」, 「」, 「」** | 0, 2, 0 |
| Nhật, chương 03 (99 đoạn) | 1/3 | 0 | 93% / 95% | **«»**, lẫn, Việt | 0, 0, 0 |
| Nhật, chương 04 (73 đoạn) | 3/3 | 0 | 44% / 47% | **「」, 「」, 「」** | 1, 1, 1 |
| Nhật, chương 05 (53 đoạn) | 3/3 | 0 | 59% / 74% | Việt, lẫn, **「」** | 0, 0, 0 |

**Quan sát:**

1. **Cấu trúc khá ổn.**
   - Số đoạn khớp ở 20/24 lần. 4 lần dư một đoạn vì model tự chèn xuống dòng giữa một câu (ví dụ `「Mẹ.` bị tách khỏi phần còn lại của câu thoại). Khi số đoạn lệch, mọi đoạn phía sau không ghép được với nguồn.
   - Sót 2 câu trên tổng 24 lần, sau khi đã gửi lại một lần.
   - 2 lần cả lô trả về JSON hỏng (110 câu và 52 câu); gửi lại thì được.
   - Không có lặp vòng; độ dài bất thường 9/886 đoạn.
2. **Lỗi lớn nhất là thiếu nhất quán**, giữa các chương và giữa các lần dịch:
   - **Kiểu thoại:** ít nhất bốn kiểu (`"…"`, `「…」`, `『…』`, `«…»`), đổi theo chương và theo lần chạy. Chương 02 và 04 tiếng Nhật giữ nguyên 「」 ở cả 3 lần. Prompt hiện tại không nói gì về quy ước thoại (G2).
   - **Tên nhân vật chính bị trôi:** "Irene" ở chương 01–03 thành "Irène" (2 lần) và "Irenne" (1 lần) ở chương 04. Đây là lý do glossary của chương 04 chỉ đạt 44%.
   - **Cách gọi đổi qua lại:** 母様 khoảng nửa "mẹ", nửa "mẫu thân". 大奥様 lúc thành "phu nhân trưởng", lúc thành "mẹ chồng của phu nhân".
3. **Xưng hô sai đúng chỗ khó của tiếng Việt.**
   - おば様 (Loretta gọi Irene, vợ của cậu mình) **chưa lần nào ra "mợ"**: chủ yếu là "cô", có lần "bác" và "dì".
   - 伯父上 (chồng của chị gái cha) thành "chú".

   Không có ngữ cảnh quan hệ thì model không thể biết đúng các vai vế này.
4. **Phần lớn chỗ "glossary sai" ở tiếng Trung là lựa chọn văn phong, không phải lỗi.** Model nhất quán viết "Hoa Quả Sơn" và "Thủy Liêm Động" (glossary nháp ghi "núi Hoa Quả", "động Thủy Liêm"), viết "chủ quán" (nháp ghi "ông chủ quán"). Con số chỉ có nghĩa sau khi chủ sản phẩm chốt bảng văn phong.
5. **Lỗi nghĩa mà kiểm tất định không bắt được** (đọc tay một bản 孔乙己 lần chạy thử):
   - 坐着用这手慢慢走去了 thành "ngồi dậy dùng đôi tay này từ từ đi mất". Đúng ra Khổng Ất Kỷ cứ ngồi mà chống tay lết đi.
   - Chơi chữ 窃 và 偷 bị mất ("Trộm sách không thể gọi là trộm").
   - 多乎哉？不多也 mất chất văn ngôn.

   Đây là việc của tầng giám khảo LLM và người chấm (E3, E5).
6. **Chi phí:** 208.624 token vào, 567.316 token ra (phần lớn là thinking), 61 phút, trung bình 2,5 phút một chương. Theo giá Gemini 2.5 Flash là khoảng 1,5 USD cho cả lượt.

**Kết luận:** với prompt hiện tại, chỗ hỏng chính là **nhất quán** (tên, cách gọi, xưng hô, kiểu thoại), không phải chất lượng từng câu. Điều này khớp với thứ tự Lõi dịch → Thuật ngữ → Xưng hô của [lộ trình](../delivery/roadmap.md). Hai việc rẻ làm được ngay ở Lõi dịch:
- đưa quy ước thoại và tên vào prompt (G1–G2);
- chuẩn hóa xuống dòng trong câu dịch và parse JSON khoan dung hơn (G5).

### B2a — quy ước tiếng Việt trong system prompt (2026-10-03)

**Cấu hình:**
- Như B1, chỉ khác system prompt: thay bằng [`ja-vi-conventions.txt`](../../../scripts/bench/prompts/ja-vi-conventions.txt).
- Prompt giữ nguyên hợp đồng JSON của app, thêm brief và quy ước theo G1–G2: thoại “…”, ngoặc lồng ‘…’, không dùng 「」; tên katakana khôi phục chữ Latinh và giữ một cách viết; không xưng hô cổ phong (con gọi "mẹ", "cha"); chọn và giữ cặp xưng hô theo vai vế; "dst" không chứa xuống dòng.
- Chỉ đổi nội dung system message, ở lớp `fetch`; 100/100 yêu cầu đã được thay.
- 5 chương tiếng Nhật × 3 lần.

**So với B1 trên cùng 5 chương:**

| | B1 baseline | B2a quy ước |
| --- | --- | --- |
| Kiểu thoại | 「」 hoặc lẫn kiểu ở 8/15 lần | **“…” ở 15/15 lần, không còn 「」** |
| 母様 | "mẫu thân" 25 lần, "mẹ" 73 lần | **chỉ "mẹ"** (116 lần) |
| 伯父上 (chương 05) | "chú" | **"bác"** (đúng vai vế) |
| Tên イレーヌ | "Irene" ở chương 01–03; "Irène"/"Irenne" ở chương 04 | **"Irene" và "Irène" lẫn nhau ở mọi chương** |
| おば様 | "dì" 9 lần, "bác" | "dì" 3 lần, "bác", chưa lần nào "mợ" |
| Câu bị sót (sau một lần gửi lại) | 0 | **14** |
| Ghép được từng đoạn | 11/15 | **7/15** (3 lần số đoạn bằng nhau nhưng các đoạn trượt vị trí) |
| Token ra | 253.249 | 346.685 (+37%) |
| Thời gian | 1.246 giây | 2.030 giây (×1,6) |

**Quan sát:**

1. **Quy ước trong prompt sửa được những gì là quy tắc chung:** kiểu thoại, cách con gọi mẹ, và cả một quan hệ suy ra được từ chính câu chữ (伯父上 là chồng của chị gái cha, nên gọi "bác").
2. **Quy ước không sửa được những gì cần biết trước:**
   - Cách viết tên: イレーヌ đọc được cả "Irene" lẫn "Irène", nên model lần nào chọn lại lần đó, kể cả trong cùng một chương.
   - Quan hệ không nói ra trong chương: Loretta là cháu của chồng Irene nên gọi Irene là "mợ".

   Hai việc này thuộc module Thuật ngữ và Xưng hô, không thuộc prompt.
3. **Prompt "viết tự nhiên" làm model gộp câu, và với đơn vị câu thì gộp câu thành mất câu.**
   - App MVP gửi mỗi câu một ID. Ví dụ: model gộp 「あっ」 và dòng ngay sau (小さな声がした) thành một câu dịch, nên dòng sau mất ID và mất khỏi bản dịch.
   - Một dòng dư ở chỗ khác bù lại, nên số đoạn vẫn bằng nhau, nhưng mọi đoạn ở giữa trượt một vị trí.
   - Tổng độ dài bản dịch vẫn bằng 95–100% của B1: nội dung phần lớn còn, chỉ bị dồn sang câu bên cạnh.
4. **Chi phí tăng:** token ra +37%, thời gian ×1,6. Prompt dài hơn khiến model nghĩ nhiều hơn.

**Kết luận:** theo quy tắc E6, B2a **không được giữ nguyên trạng**, vì T0 xấu đi (sót câu, trượt đoạn). Nhưng nó chỉ ra thứ tự đúng cho module Lõi dịch:
- (a) đổi đơn vị gửi sang **đoạn** có ID `[n]`, để gộp câu trong một đoạn không còn làm mất gì, rồi mới thêm chỉ dẫn "viết tự nhiên";
- (b) giữ các quy ước chung (thoại, cách gọi, không cổ phong) trong tầng A;
- (c) tên và quan hệ đi qua glossary và ma trận xưng hô;
- (d) đo mức thinking (B3) trước khi thêm chữ vào prompt, vì chi phí tăng theo độ dài prompt.

**Bài học cho Bộ đo:** "số đoạn bằng nhau" không có nghĩa là ghép đúng. Bộ chấm nay coi một lần là trượt vị trí khi hơn 15% đoạn lệch độ dài, và khi đó không so từng đoạn nữa. Cả B1 và B2a ở trên đã được chấm lại theo luật này. Module Bộ đo cần một cách ghép đoạn theo nội dung, hoặc nhờ ID đoạn của Lõi dịch.

**Giới hạn của lượt đo:**
- Một model, mỗi chương 3 lần, chỉ có T0.
- Hai chương tiếng Trung là văn cổ điển và cận đại, không phải truyện mạng.
- Ngưỡng băng độ dài là số khởi điểm, chưa hiệu chỉnh.
- Script không ghi được mã commit vào báo cáo của lượt này. Lượt dịch chạy bằng bản script trước khi tách `score.ts`; các số ở bảng là sau khi chấm lại bằng bộ kiểm đã commit ở `d7954e6`, gồm hai phép kiểm thêm sau lượt chạy (ngoặc lệch, dấu câu nguồn còn sót).

## Giới hạn

- **Không có bằng chứng nào lấy tiếng Việt làm đích** cho các câu hỏi về prompt, thinking, định dạng hay refine. EN→VI ở WMT25 chỉ có điểm tự động. Không tìm thấy benchmark xưng hô tiếng Việt.
- Nhiều trang được đọc qua công cụ tóm tắt; chỉ các hàng ghi **đọc†** là đã đối chiếu con số trên văn bản thô. Mọi con số dùng để quyết định phải mở lại trang gốc.
- Các nguồn năm 2026 (Tan, Merx, Diagnose-then-Repair, nghiên cứu người đọc) phần lớn chưa được kiểm chứng độc lập.
- Tên model đời mới (Gemini 3.5–3.8, `deepseek-v4-pro`, `gpt-6.1-sol`) và giá chỉ đọc qua trang giá chính thức, qua agent; giá đổi nhanh.
- Tỷ lệ độ dài và bảng cỡ mẫu là **tự tính**. Tỷ lệ độ dài đi vòng qua tiếng Anh; bảng cỡ mẫu giả định các cặp độc lập.
- Ý kiến cộng đồng Việt phần lớn từ repo nhỏ và diễn đàn. Trang Hako đọc qua bản sao vì trang gốc lỗi kết nối.
- Tệp tạm của agent (văn bản trích từ PDF, tệp prompt thô, script tính tỷ lệ) nằm trong scratchpad của phiên, không vào repo.

---

[Mục lục handbook](../README.md)
