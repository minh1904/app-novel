# Chia lô dịch truyện và giữ mạch giữa các lô: LinguaGacha, công cụ khác và nghiên cứu

Ngày đọc: **2026-10-03** · Trạng thái: **Quan sát** (mã LinguaGacha và Mira, tài liệu công cụ khác, bài báo) cộng **đề xuất chưa chốt**, ghi riêng ở "Suy luận" · Chủ trì: engineering · Liên quan: [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md), [kiến trúc AI-first](../engineering/ai-first-architecture.md) mục 6.1, change `context-core`, [ngữ cảnh truyện](story-context.md), [công cụ dịch AI](ai-translation-tools.md), [lõi AI](ai-core-architecture.md).

## Kết luận ngắn

1. **Các công cụ dịch truyện/game đồng thuận về một khuôn:** chia theo **ranh giới dòng/đoạn có sẵn**, giới hạn bằng **ngân sách token đầu vào nhỏ** (khoảng 500–2.000 token) **cộng một trần số dòng** (10–50), đánh ID tạm cho từng dòng, nhận lại JSON theo ID. Không công cụ nào đã đọc được lấy "cả chương một lượt" làm mặc định cho chương dài (Translation-Agent chỉ làm vậy khi văn bản dưới 1.000 token); bằng chứng học thuật (dịch theo đoạn thắng dịch theo câu, chất lượng tụt khi đoạn dài) ủng hộ cỡ này.
2. **Mira đã đúng ranh giới nhưng thiếu trần số đoạn.** `splitIntoBatches` chỉ cắt theo 1.500 token *ước lượng* với `CHARS_PER_TOKEN = 2` ([`openAiCompatible.ts:24-27,108`](../../../src/main/infra/providers/openAiCompatible.ts)). Một chương toàn câu thoại ngắn (10 ký tự/đoạn) sẽ thành lô ~300 đoạn. LinguaGacha, AiNiee, GalTransl, llm-subtrans đều có trần số dòng riêng; một bài 2026 (chưa tự kiểm) nói suy giảm theo **số mục** mạnh hơn theo độ dài ngữ cảnh. Đây là chỗ hở rõ nhất.
3. **Không công cụ nào chọn điểm cắt theo cảnh/hội thoại** cho truyện (chỉ llm-subtrans cắt cảnh theo khoảng trống thời gian, cho phụ đề). LinguaGacha cắt giữa cảnh không chút nhận biết. Bỏ trống này rẻ để lấp và test được, nhưng **không có bằng chứng** nó cải thiện chất lượng.
4. **Câu liền trước giúp mượt văn, chưa chắc giúp nhất quán.** LinguaGacha mặc định **tắt** (0 dòng) và dùng **nguồn**; GalTransl dùng 8 câu **bản dịch**; AiNiee 3. Ablation của DelTA (đã ghi ở [ngữ cảnh truyện](story-context.md)) nói nhất quán đến từ tóm tắt và sổ tên riêng. Hợp với thiết kế `context-core` (tầng B), nên không nên đầu tư quá tay vào số đoạn liền trước.
5. **Cách xử lý lỗi ở LinguaGacha có tiền lệ đáng học và hai lỗi đáng tránh:** chấp nhận từng mục (một phần thành công được ghi ngay) và thu nhỏ chỉ phần còn lại là tốt; nhưng **chia nhỏ cả khi gặp 429** (issue #832: 32 dòng còn 2–3, mất ngữ cảnh) và **một mục hỏng kéo ~7 vòng gọi thêm** là hai điểm yếu. Khớp với D5 của [lõi AI](ai-core-architecture.md): tách lỗi hạ tầng khỏi lỗi nội dung.
6. **Ranh giới lô nên tính từ nguồn, không từ ngữ cảnh.** Điều này nối với điểm hở "độ mịn của băm lưu" ở D11 của `context-core`: nếu cách chia lô đổi khi glossary đổi thì băm theo lô mất nghĩa. LinguaGacha đếm riêng token nguồn (tôi không thấy chú thích nêu lý do trong phần mã đã đọc, nên không biết là cố ý).
7. **Chưa có số đo nào của Mira.** Mọi ngưỡng bên dưới là điểm khởi đầu từ công cụ khác, không phải kết luận. Cần fixture văn bản thật (repo chưa có, cùng fixture mà Q3 của ADR-005 đang đợi).

## Câu hỏi và phương pháp

1. Các công cụ dịch truyện/game/phụ đề chia lô thế nào (đơn vị, cỡ, điểm cắt), và giữ mạch giữa các lô bằng gì?
2. Bài báo nói gì về cỡ lô và lượng ngữ cảnh tối ưu, và kiểu hỏng nào đi kèm?
3. Mira nên giữ, thêm hay hoãn điều gì ở bước chia lô của tác vụ dịch?

**Phương pháp.** (a) **LinguaGacha:** một agent đọc mã bản local `D:\personal\LinguaGacha` (TypeScript/Electron, v0.125.0, commit `5a0058d5` ngày 2026-10-01); tôi **đọc lại** `translation-planner.ts` dòng 70–300 và các giá trị mặc định (`setting.ts`, `model.ts`, `batch-translation-runner.ts`). Các phần còn lại (bộ kiểm đầu ra, scheduler, mẫu prompt) là **đọc qua agent**. (b) **Công cụ khác và bài báo:** một agent tìm web, đọc README, wiki, issue, trang bài báo ngày 2026-10-03; một số trang GitHub/DeepWiki trả 403/404/429 nên có chỗ chỉ đọc được đoạn trích tìm kiếm (ghi rõ ở cột mức kiểm). (c) Đối chiếu với mã Mira và các tài liệu handbook đã chốt. **Không chạy công cụ nào, không gọi provider, không benchmark.** Mã GPL/AGPL chỉ để học ý tưởng; **giấy phép LinguaGacha chưa xác nhận** (bản local không có tệp LICENSE, chỉ có huy hiệu ở README).

## Quan sát 1 — LinguaGacha chia lô và giữ mạch thế nào

Đường dẫn tính từ gốc repo LinguaGacha. "Đọc lại" = tôi tự đọc; "agent" = chỉ qua báo cáo của agent.

| Khía cạnh | Làm gì | Mức kiểm |
| --- | --- | --- |
| **Đơn vị** | "Mục" (item), tùy định dạng: TXT một dòng một mục; SRT một cue (có thể nhiều dòng); Markdown một khối mdast. Không cắt một mục | Agent |
| **Luật cắt** | Tham lam theo thứ tự dự án; đóng lô khi thêm mục kế tiếp làm **vượt số dòng**, **vượt ngưỡng token nguồn**, hoặc **đổi tệp**. Mục quá lớn thành lô một mục (`planning/translation-planner.ts:144-200`, đặc biệt L165-168) | **Đọc lại** |
| **Cỡ** | `line_limit = max(8, trunc(ngưỡng/16))` (L151). Ngưỡng nhập mặc định **512** (`domain/model.ts:122`), preset dựng sẵn 768, Sakura 384. Với 768 token: 48 dòng. Đếm bằng `o200k_base`, **chỉ trên văn nguồn**, không gồm system prompt, glossary, ngữ cảnh trước, khung JSON | Ngưỡng và công thức: **đọc lại**; tokenizer, preset: agent |
| **Điểm cắt tự nhiên** | **Không có.** Không nhận biết chương, cảnh, đổi người nói, hết câu. Dòng trống thường đã bị bộ lọc trước loại nên không phá lô | Agent |
| **Ngữ cảnh trước** | Cài đặt `preceding_lines_threshold`, **mặc định 0 (tắt)** (`domain/setting.ts:117`). Khi bật: đi lùi từ đầu lô, bỏ qua mục đã bỏ, **dừng** khi hết số dòng, hết tệp, hoặc gặp mục **không kết thúc bằng** một trong `. 。 ? ？ ! ！ … ' " 」 』` (L21, L265-293). Lấy **văn nguồn**, không lấy bản dịch; không giới hạn token. Lô thử lại luôn `precedings: []`. Sakura bị ép về 0 (agent) | **Đọc lại** (trừ Sakura) |
| **Glossary** | Mỗi lô khớp bằng Aho–Corasick trên nguồn của các mục trong lô; chỉ gửi mục trúng, **không trần số mục, không xếp hạng** (`translation-runner.ts` L377-399). Dòng `src -> dst #info` | Agent |
| **ID và ánh xạ** | Mỗi mục một dòng JSON `{"id":N,"text":"..."}` (thêm `actor` nếu có tên), ID **cục bộ theo lô** từ 0, độc lập ID trong DB; đọc phản hồi từng dòng bằng `jsonrepair` | Agent |
| **Nhận kết quả** | Theo **từng mục**: có ID, không trùng, `text` không rỗng thì thành công; còn lại giữ để thử lại. Một phần thành công được ghi ngay | Agent |
| **Chia lại khi lỗi** | Với các mục còn lại (hai mục trở lên): chia lại bằng ngưỡng mới `floor(t · (16/max(17,t))^0.25)` (L122-126, L298-300), loại ngữ cảnh trước, đẩy lên đầu hàng. 768 → 291 → 140 → 81 → 54 … tới khi còn từng mục. Còn **một** mục: thử lại riêng tối đa 3 lần (`batch-translation-runner.ts:36`) rồi đánh `ERROR`, **không ghi bản dịch dự phòng** | Công thức: **đọc lại**; các bước dãy số tôi tính lại bằng tay, khớp với agent; còn lại agent |
| **Kiểm khi dịch** | Chỉ kiểm hình dạng (ID, trùng, rỗng). **Không** kiểm số dòng trong một mục nhiều dòng, sót ngôn ngữ nguồn, giống nguồn, lặp, tuân thủ glossary. Các kiểm đó chỉ có ở trang soát lại, sau khi dịch xong | Agent |
| **Tầng vận chuyển** | Tách khỏi nội dung: lỗi mạng/hạn mức chờ khóa hồi, 429 giảm nửa số luồng, lỗi không thử lại được thì hủy cả tác vụ. Mặc định tự dò 4→16 luồng | Agent |

**Điểm yếu thấy được** (mức kiểm theo cột trên):

- Ngân sách đếm chỉ nguồn bằng tokenizer OpenAI; prompt, glossary và ngữ cảnh trước nằm ngoài. Model khác tách CJK khác.
- Ngữ cảnh trước **dễ rỗng**: dòng đầu tiên không kết bằng dấu trong tập trên là dừng cả đường đi (tập không gồm ngoặc kép cong “ ”, `）`, `】`, `～`, `—`), và nó vốn tắt.
- Không có cổng chất lượng lúc dịch: bản "dịch" giữ nguyên tiếng nguồn hay lặp vẫn được nhận.
- Mục dài nhất vẫn là một mục: đầu ra bị cắt (`stopReason: length`) được thử lại **y hệt** rồi thành lỗi.
- Issue của chính dự án (đọc qua agent, chưa kiểm): #832 (chia nhỏ vì 429 làm mất ngữ cảnh), #927 (lô khởi đầu 8–10k token co xuống 2–4 dòng, hết hạn 120 giây), #930 (chia nhỏ khi lệch số dòng).

## Quan sát 2 — Công cụ khác

Mức kiểm: **ghi nhận** = đọc README/wiki/issue (qua agent); các con số tự báo cáo ghi "tự báo". Giấy phép: GPL/AGPL chỉ học ý tưởng.

| Công cụ | Đơn vị và cỡ | Ngữ cảnh giữa lô | Ánh xạ / kiểm | Ghi chú |
| --- | --- | --- | --- | --- |
| **[Translation-Agent](https://github.com/andrewyng/translation-agent)** (Andrew Ng) | Token: `MAX_TOKENS_PER_CHUNK = 1000` (cl100k); chia **đều** (`ceil(tổng/1000)` phần), `RecursiveCharacterTextSplitter`, overlap 0 | **Gửi cả văn bản làm ngữ cảnh** mỗi lần, đoạn cần dịch bọc `<TRANSLATE_THIS>` | Không kiểm căn chỉnh; dịch → phản biện → sửa mỗi lô | Chi phí đầu vào **bậc hai** theo độ dài chương (mỗi lô gửi cả chương, số lô tỉ lệ độ dài) |
| **[GalTransl](https://github.com/GalTransl/GalTransl/blob/main/README_EN.md)** | 10 dòng/yêu cầu mặc định (1–32) | `contextNum` = 8 câu **đã dịch**; chế độ nhiều lượt: tối đa 8 lượt hoặc 24.000 ký tự thì mở phiên mới và gieo lại 8 câu | JSON theo `index`; bộ tìm lỗi: lặp từ, mất/thừa dấu câu, sót kana, mất/thừa xuống dòng, **đầu ra dài hơn nguồn ~30%**, không theo từ điển | Glossary chỉ gửi mục trúng trong yêu cầu |
| **[AiNiee](https://github.com/NEKOparapa/AiNiee)** | Theo dòng hoặc token; issue #509 báo một hằng `cross_max = 30` cố định dù ngân sách 32k; người báo thấy 120 dòng cho ngữ cảnh tốt hơn nhưng kém ổn định hơn. Fork AiNiee-Next: 20 dòng/yêu cầu (10–40) | 3 dòng trước (2–5); soát lại ở lượt thứ hai | `{"<id>":"text"}` hai chiều, sai định dạng thì sinh lại | Nhiều con số theo fork, chưa kiểm bản gốc |
| **[llm-subtrans](https://github.com/machinewrapped/llm-subtrans)** (phụ đề) | **Cảnh** (khoảng trống thời gian `--scenethreshold`) rồi **lô** (min 10, max 30; wiki gợi ý 60–120 tùy model) | Model trả `<summary>` (lô) và `<scene>` (cảnh tới giờ), đưa sang lô sau, người dùng sửa được. Chạy đa luồng thì luồng này **không thấy** tóm tắt của luồng kia | `#N / Original> / Translation>`, yêu cầu cùng số dòng; lệch thì thử lại | Issue #404: tràn token thì thử lại **cùng cỡ**, bỏ ngữ cảnh (có TODO "chia nhỏ lô"). Ngưỡng cảnh mặc định 60 giây: **chưa xác minh** |
| **[SakuraLLM](https://github.com/SakuraLLM/SakuraLLM)** | "7–10 câu mỗi yêu cầu" (thẻ model v3.7) | `[History]`, `[Glossary]`, `[Input]` | Không | Model local chỉ Nhật → Trung |
| **LunaTranslator** | Dịch trực tiếp theo dòng hiện ra | `contextOriginal[N]`, `contextTranslation[N]`, `contextBoth[N]` (0 = tắt); `DictWithPrompt` chỉ chèn mục trúng | Không | Chọn **nguồn, dịch, hoặc cả hai** là một tham số |
| **[Calibre ebook-translator](https://github.com/bookfere/Ebook-Translator-Calibre-Plugin/wiki/English)** | "Gộp để dịch" 1.800 ký tự mặc định | Không ghi | Không ghi; 3 lần thử, dừng sau 10 lỗi liên tiếp | Glossary là tệp `.txt` |
| **[translate-book](https://github.com/deusyu/translate-book)** | ~6.000 ký tự/lô, 8 subagent song song, mỗi cái ngữ cảnh mới | ~300 ký tự đầu lô sau và ~300 ký tự cuối lô trước (**nguồn lân cận**); glossary 3 cột lấy mẫu từ 5 chương | SHA-256 manifest: đổi bản glossary thì dịch lại đúng các lô đã dùng bản cũ | Số liệu của repo (chưa kiểm) |
| **[Khaibec/local-translator](https://github.com/Khaibec/local-translator)** (Nhật → **Việt**) | 1.800 ký tự, cắt ở `。！？` và dòng trống | **600 ký tự cuối của bản dịch tiếng Việt** sang lô sau "cho đại từ và tên"; nhiệt độ 0,1 | Bỏ rào ```, cảnh báo lặp, cờ đầu ra rỗng | Ví dụ gần Mira nhất về ngôn ngữ đích |
| **LectuLibre (dev.to)** | 2.000–4.000 token, **chồng 2 đoạn**, bản dịch trước cắt 500 token | glossary dựng dần trong system prompt | Không | Số liệu "ít lỗi hơn 70–80%" **tự báo, khác nhau giữa bốn bài**: coi là giai thoại |
| **Thương mại: DeepL, Google Cloud** | DeepL: tham số `context` (không dịch, không tính tiền), thân yêu cầu ≤ 128 KiB; Google: khuyến nghị ≤ 30.000 điểm mã/yêu cầu | — | — | Chưa kiểm xem có giữ mạch giữa các yêu cầu không |

Thêm hai dự án chỉ đọc được đoạn trích (nên **chưa xác minh chi tiết**): `tritamk14/novel-publisher-agy` (ma trận xưng hô **theo giai đoạn truyện**) và `thang97-21/MTLS` (hồ sơ giọng nhân vật, lệnh phát hiện đổi đại từ).

**Điều rút ra từ bảng:**

- **Cỡ lô lệch nhau gấp mười**, từ 7–10 dòng (Sakura) tới 6.000 ký tự (translate-book). Con số không chuyển giữa model được: chúng là mặc định thời GPT-3.5 (llm-subtrans, AiNiee) hoặc cho model local nhỏ (Sakura). Người dùng báo model mạnh chịu được 120+ dòng nhưng kém ổn định hơn.
- **Ba cách lấy ngữ cảnh trước:** bản dịch (GalTransl, local-translator, LectuLibre), nguồn (LinguaGacha, translate-book), cả hai (LunaTranslator cho chọn). Không tài liệu nào đã tìm đo so sánh ba cách.
- **Chạy song song cắt đứt chuỗi ngữ cảnh** theo tóm tắt/bản dịch (llm-subtrans ghi nhận thẳng). Ngữ cảnh lấy từ **nguồn** thì không phụ thuộc thứ tự.
- **Không công cụ nào xếp thứ tự prompt để trúng cache** (đã ghi ở [lõi AI](ai-core-architecture.md)); chỉ MTLS nhắc kế hoạch dùng Batch API.

## Quan sát 3 — Nghiên cứu: cỡ lô và lượng ngữ cảnh

Mức kiểm: **trang bài báo, đã đọc qua agent**, tôi chưa đọc lại toàn văn; riêng DelTA là bài đã được đọc ở [ngữ cảnh truyện](story-context.md).

| Bài | Phát hiện liên quan | Giới hạn |
| --- | --- | --- |
| [Karpinska & Iyyer, WMT 2023](https://arxiv.org/abs/2304.03245) | Dịch **theo đoạn** (TB 7,45 câu) thắng dịch từng câu ở 71,1% lượt ưa thích; ít sai nghĩa hơn 29,5%, ít sai ngữ pháp hơn 65,4%; **lỗi nghiêm trọng như bỏ sót vẫn còn** | GPT-3.5-era, 18 cặp ngôn ngữ, không có tiếng Việt |
| [Wang et al., 2023](https://arxiv.org/abs/2304.02210) | Đưa cả tài liệu như văn bản liền mạch (không đánh dấu câu) là kiểu prompt tốt nhất trong ba kiểu; người đánh giá thích GPT-4 dù d-BLEU thấp hơn DeepL/Google | Model đời 2023; độ dài tài liệu thử chưa đọc lại |
| [DelTA, ICLR 2025](https://arxiv.org/abs/2410.08143) | Câu liền trước (k=3) tự nó **không** tăng nhất quán; tóm tắt song ngữ và sổ tên riêng mới tăng | Đã ghi ở [ngữ cảnh truyện](story-context.md), cặp ngôn ngữ không có tiếng Việt |
| [SEGALE, EMNLP 2025](https://arxiv.org/abs/2509.17249) | Với 7 model mở, đoạn **4k–8k token** tụt mạnh (dịch thiếu, dịch thừa; có model tóm tắt thay vì dịch); Qwen2.5-72B ổn định và còn khá lên tới 4k | Model mở; model đóng và mới hơn chưa rõ |
| [Peng, Bawden & Yvon, 2025](https://arxiv.org/abs/2412.17592) | Chất lượng giảm khi đầu vào dài, **kể cả ở độ dài trong phân phối**; đầu văn bản được dịch tốt hơn cuối | Model nào được thử chưa đọc lại |
| [Chen et al., 2026](https://arxiv.org/abs/2603.22608) | Hiệu năng sụp theo **số mục** hơn theo độ dài ngữ cảnh (tương quan −0,61 so với −0,37), rõ trên ~200 mục | **Không thử trên dịch thuật; chưa tự kiểm bài.** Chỉ là gợi ý cho trần số dòng |
| [LongWriter, ICLR 2025](https://arxiv.org/abs/2408.07055) | Model khó sinh quá ~2.000 từ một lần | Sinh văn, không phải dịch |
| [Ramos et al., COLM 2025](https://arxiv.org/abs/2504.12140) | So Doc2Doc, lô thường, lô có ngữ cảnh (điều kiện trên nguồn và đích của lô trước), lô theo chất lượng; lô có ngữ cảnh chậm ~10 lần lô thường | Tăng chất lượng so từng cách chưa đọc |
| [TransAgents, TACL](https://arxiv.org/abs/2405.11804) | **Pha chuẩn bị** (glossary, tóm tắt sách, giọng) rồi dịch từng chương; người và LLM thích hơn bản người dịch, d-BLEU thấp nhất; **$487 và 13,1 giờ** so với $42 và 1,1 giờ cho `gpt-4-turbo` | Đã ghi ở [ngữ cảnh truyện](story-context.md) |

**Điều bài báo *không* trả lời cho Mira:** không bài nào có tiếng Việt làm đích; không bài nào đo tình huống raw truyện mạng (đoạn rất ngắn, thoại dày) hay model đời 2026 (Gemini 2.5/3, Claude 4–5). Về đầu ra: trang Gemini 2.5 Pro ghi trần 65.536 token nhưng một chủ đề diễn đàn báo Gemini 3 bị cắt ~4k (agent đọc, chưa kiểm). Tiếng Việt tốn token hơn tiếng Anh (hệ số 1,2–1,5 ở [công cụ dịch AI](ai-translation-tools.md) vẫn là "cần đo").

## Quan sát 4 — Mira hiện có gì

| Điểm | Hiện trạng | Nơi |
| --- | --- | --- |
| Đơn vị lô | Cắt ở ranh giới segment (sẽ là đoạn theo ADR-005); một đoạn dài hơn cả lô đi riêng một lô, không chia | `openAiCompatible.ts:104-127` |
| Ngân sách | 1.500 token ước lượng, `CHARS_PER_TOKEN = 2` cho mọi ngôn ngữ; **không có trần số đoạn** | `openAiCompatible.ts:24-26` |
| Ngữ cảnh giữa lô | **Không có.** `TranslateRequest.context` có kiểu nhưng không dòng nào đọc (theo [lõi AI](ai-core-architecture.md) A1) | — |
| Ánh xạ | `[{id, src}]` → `[{id, dst}]`, `reconcile` theo ID | `SYSTEM_PROMPT` L58-64, `parseItems` L130 |
| Thử lại | Gửi lại **ID thiếu**, tối đa 3 lượt, dùng chung ngân sách với lỗi hạ tầng; **không thu nhỏ lô** | `MAX_RETRIES_PER_BATCH = 3`, L27 |
| Thiết kế đã chốt | Chương là `job_item`, trong chương chia lô theo đoạn, ID tạm `[n]`, đoạn quá dài cắt theo câu chỉ để vừa lô; **tối đa 3 lượt gửi lại đúng đoạn thiếu**; một tác vụ chạy một lúc | [kiến trúc AI-first §6.1](../engineering/ai-first-architecture.md) |

Phép tính nói ở kết luận 2: một đoạn 10 ký tự tốn `ceil(10/2) = 5` token ước lượng, nên chạm 1.500 token cần ~300 đoạn. Hằng số là của mã hiện tại; **chưa chạy với fixture thật**.

## Suy luận cho Mira

> Mọi mục dưới đây là **đề xuất** chưa chốt. Con số lấy từ công cụ khác, dùng làm điểm khởi đầu cho phép đo, không làm quy tắc.

**C1. Thêm trần số đoạn mỗi lô, tính cùng ngân sách token.** Hợp với LinguaGacha (`ngưỡng/16`, 48 dòng ở 768 token), AiNiee (30), GalTransl (10), llm-subtrans (30). Khởi điểm để đo: trần theo số đoạn nằm trong khoảng 20–50 và theo token nguồn trong khoảng 500–2.000; chọn bằng spike. Lý do chính là **tỷ lệ ID hỏng/bỏ sót tăng theo số mục**, lý do phụ là chi phí gửi lại.

**C2. Tách ba ngân sách, và tính ranh giới lô từ nguồn.** (i) *Nguồn*: quyết định ranh giới lô, ổn định khi glossary hay ngữ cảnh đổi. (ii) *Ngữ cảnh* (tầng A/B/C): đã có trần ~40% ở `context-core` D6. (iii) *Đầu ra*: ước lượng token đầu ra tiếng Việt của lô phải nằm dưới `max_tokens` đặt cho lô, đòi D3 của [lõi AI](ai-core-architecture.md) (hiện **không gửi** `max_tokens`). Phần (i) tránh việc `contextHash` theo lô đổi chỉ vì cách chia đổi. Mặt trái: không đếm prompt vào ngân sách nguồn thì phải để dư biên ở (ii).

**C3. Chia lô là hàm thuần có test.** `planBatches(đoạn[], giới hạn) → lô[]` đặt ở `services/ai/translate/` cùng D1 của [lõi AI](ai-core-architecture.md); không IO, không tokenizer thật. Nhờ vậy các luật điểm cắt (C4) và thang thu nhỏ (C6) kiểm được bằng fixture, đúng tinh thần `buildContext`.

**C4. Điểm cắt ưu tiên (rẻ, chưa có bằng chứng).** Khi có nhiều chỗ cắt hợp lệ trong biên độ ngân sách, ưu tiên cắt **sau dấu ngắt cảnh** (`***`, `---`, `◇`) rồi sau đoạn kết thúc bằng dấu hết câu; **tránh** cắt ngay sau đoạn kết thúc bằng `：`/`:` hoặc có ngoặc thoại chưa đóng. Là cách dùng ý tưởng `END_LINE_PUNCTUATION` của LinguaGacha làm *ưu tiên chỗ cắt*, không phải *cổng chặn ngữ cảnh* như họ làm. Không được làm lô vượt ngân sách vì ưu tiên này. Cần đo trước khi tin nó có ích; hỏng vì lý do gì cũng nên rơi về cắt thường.

**C5. Ngữ cảnh liền trước là cặp (nguồn, bản dịch) của *k* đoạn cuối, chỉ đọc.** Khác LinguaGacha (chỉ nguồn): với tiếng Việt, **bản dịch đã chọn xưng hô nào** là thông tin quyết định; nguồn chỉ cho biết ai nói. Khởi điểm: *k* ≤ 3–8 và trần ~500 token, theo AiNiee, GalTransl, LectuLibre. Không vào `contextHash` (D5 của `context-core` đã chốt). Hai điểm mở:
   - **Đầu chương:** lô đầu của chương có lấy đoạn cuối chương trước không? LinguaGacha dừng ở ranh giới tệp. Với truyện, chương nối nhau liên tục nên nghiêng về *có, nếu chương trước đã có bản dịch*; tóm tắt song ngữ ở tầng B cũng phục vụ chỗ này.
   - **Khi chạy song song** (chưa có ở lát cắt đầu): bản dịch của lô liền trước chưa có. Hạ về nguồn như LinguaGacha, hoặc giữ tuần tự trong một chương. Ghi nhận ở thiết kế JobRunner, không giải ở đây.

**C6. Thang leo thang khi lỗi *nội dung*, tách khỏi lỗi hạ tầng.** Khuôn gần giống đã có ở [công cụ dịch AI](ai-translation-tools.md) (gửi lại ID lỗi → chia đôi → đánh dấu), thêm các chi tiết rút từ các issue:
   - Gửi lại ID thiếu như hiện nay (LinguaGacha cũng nhận từng mục), **không** thu nhỏ khi lỗi là 429/timeout (#832).
   - Khi lặp lỗi, **đổi cỡ lô**, không thử lại cùng cỡ (#404).
   - Mục lẻ vẫn hỏng thì **đánh dấu đoạn cần soát**, không làm hỏng cả chương (LinguaGacha để mục `ERROR` không có chữ; với Mira, ghi phần còn lại của chương là hợp §6.1).
   - Thu nhỏ bằng chia đôi và bằng hệ số mỗi vòng của LinguaGacha (768 → 291 → 140 → …) cho số vòng khác nhau; nên đo xem cách nào tốn ít lượt gọi hơn trên một mục hỏng.

**C7. Kiểm ngay khi dịch, không để sang màn soát.** LinguaGacha dồn mọi kiểm chất lượng sang trang soát lại. Danh sách ở [công cụ dịch AI](ai-translation-tools.md) mục 3 đã mạnh hơn; bổ sung từ GalTransl: **đầu ra dài hơn nguồn khoảng 30%** (cần đo lại ngưỡng cho tiếng Việt), lặp từ, mất/thừa xuống dòng.

**C8. Không làm (chưa có bằng chứng đủ):**
   - Gửi **cả chương** làm ngữ cảnh mỗi lô như Translation-Agent: chi phí bậc hai; tầng B (tóm tắt) là cách thay.
   - Chạy song song nhiều lô trong cùng một chương khi chưa chọn nguồn ngữ cảnh (C5).
   - Mô hình hai lượt "dịch rồi tinh chỉnh" làm mặc định: AiNiee-Next ghi lượt sau không sửa được lỗi dịch nặng, và chi phí tối thiểu gấp đôi; tùy chọn sau.
   - Sao chép công thức hay hằng số của LinguaGacha: giấy phép chưa xác nhận.

## Bước kiểm chứng

Một spike trên fixture thật (cùng fixture ZH/JA/EN mà Q3 của ADR-005 và spike của [ngữ cảnh truyện](story-context.md) cần): ít nhất hai chương ZH (thoại dày và nhiều thuật ngữ), một JA, một EN. Mỗi điều kiện lặp nhiều lần vì đầu ra không xác định.

1. **Cỡ lô.** Cùng chương, lần lượt: trần token nguồn 500 / 1.000 / 2.000 / 4.000, trần số đoạn 20 / 50 / không trần, và **cả chương một lượt** làm đối chứng. Đo: tỷ lệ phản hồi hỏng ID, **đoạn bỏ sót hoặc gộp**, đầu ra bị cắt, tuân thủ glossary, thời gian, `usage` thực. Đây là phép đo cho C1/C2 và cũng cho câu "cả chương một lượt có thua không" mà bằng chứng 2023–2025 chưa trả lời cho model mới.
2. **Ngữ cảnh liền trước.** *k* = 0 / 3 / 8, và ba dạng: nguồn, bản dịch, cả hai. Đo: nhất quán đại từ và xưng hô chéo lô, độ trôi tên riêng, chủ ngữ ẩn; có ghi `usage` của khối ngữ cảnh. Phép đo cho C5, và kiểm lại kết luận DelTA (câu liền trước tự nó không giúp nhất quán) với cặp ZH/JA→VI.
3. **Điểm cắt.** Cùng ngân sách, chia thường và chia theo ưu tiên C4; đếm lỗi quanh ranh giới lô (lệch đại từ, thoại bị tách khỏi câu dẫn).
4. **Thang lỗi.** Chủ ý chèn một đoạn "độc" (rất dài, hoặc dễ làm model gộp dòng) vào lô, so các cách thu nhỏ ở C6: số lượt gọi thêm, token tốn, đoạn còn lại có được ghi không.
5. **Ước lượng token.** Với đoạn thoại ngắn, so ước lượng `chars/2` và `usage` thực để xem lô thật chứa bao nhiêu đoạn (kiểm phép tính ở Quan sát 4) và hệ số đầu ra tiếng Việt.

Chưa chốt cỡ lô, trần số đoạn, *k*, hay thang lỗi trước khi có các số này.

## Giới hạn của bằng chứng

- **Chưa chạy** LinguaGacha hay công cụ nào; mọi hành vi là từ đọc mã/tài liệu. Với LinguaGacha chỉ `translation-planner.ts` và các mặc định được tôi đọc lại; bộ kiểm đầu ra, scheduler, định dạng prompt là qua agent.
- Phần công cụ khác và bài báo do **một agent** tìm web và đọc trang chính, không phải tôi; nhiều trang GitHub/DeepWiki lỗi 403/404/429 nên có chỗ chỉ là đoạn trích tìm kiếm (đã gắn "chưa xác minh"). Tôi chưa mở lại từng trang; các bài báo ở Quan sát 3 là trang tóm tắt/abstract, **chưa đọc toàn văn**.
- **Số liệu tự báo** của các dự án nhỏ (LectuLibre "70–80% ít lỗi", beyonder "89% so với DeepL 41%", translate-book) **không dùng để quyết định**.
- Hầu hết cỡ lô trong bảng là mặc định của model đời cũ hoặc model local nhỏ; chưa thấy bài nào đo cỡ lô tối ưu cho model đời 2026 hay cho tiếng Việt.
- Giấy phép LinguaGacha chưa xác nhận.
- **Chỗ cần sửa ở tài liệu cũ** (không sửa trong lần này): [công cụ dịch AI](ai-translation-tools.md) ghi LinguaGacha "chưa tài liệu hóa chi tiết" chia đoạn, nay đã có ở Quan sát 1. [Ngữ cảnh truyện](story-context.md) (dựa trên wiki) nói LinguaGacha có Auto Glossary tự thêm tên khi dịch; agent **không thấy** việc đó trong đường dịch của bản mã hiện tại (trích thuật ngữ nằm ở một skill Agent do LLM điều khiển, ghi glossary vào dự án). Có thể wiki mô tả bản cũ hơn; chưa đối chiếu.

## Nguồn (đọc 2026-10-03)

**Mã LinguaGacha (bản local `D:\personal\LinguaGacha`, v0.125.0, commit `5a0058d5`), đọc lại bởi tôi:** `src/backend/batch-translation/planning/translation-planner.ts` (L70–300), `src/domain/setting.ts` (L42, L117), `src/domain/model.ts` (L100, L122), `src/backend/batch-translation/core/batch-translation-runner.ts` (L36). **Đọc qua agent:** `…/work-unit/runners/translation-runner.ts`, `…/work-unit/work-unit-prompt-builder.ts`, `…/response/response-decoder.ts`, `…/core/translation-request-scheduler.ts`, `…/core/request-rate.ts`, `src/shared/quality/glossary.ts`, `src/shared/text/translation-quality-rules.ts`, `builtin/translation_prompt/template/{zh,en}/`.

**Mã Mira (đọc trực tiếp):** [`openAiCompatible.ts`](../../../src/main/infra/providers/openAiCompatible.ts).

**Công cụ (đọc qua agent):** [Translation-Agent](https://github.com/andrewyng/translation-agent) · [GalTransl README](https://github.com/GalTransl/GalTransl/blob/main/README_EN.md) · [AiNiee](https://github.com/NEKOparapa/AiNiee), [issue #509](https://github.com/NEKOparapa/AiNiee/issues/509), [AiNiee-Next guide](https://github.com/ShadowLoveElysia/AiNiee-Next/blob/main/Docs/TRANSLATION_WORKFLOW_GUIDE.md) · [llm-subtrans](https://github.com/machinewrapped/llm-subtrans), [wiki GUI](https://github.com/machinewrapped/llm-subtrans/wiki/GUI), [issue #404](https://github.com/machinewrapped/llm-subtrans/issues/404), [issue #446](https://github.com/machinewrapped/llm-subtrans/issues/446), [instructions.txt](https://raw.githubusercontent.com/machinewrapped/llm-subtrans/main/instructions/instructions.txt) · [SakuraLLM](https://github.com/SakuraLLM/SakuraLLM), [Sakura-GalTransl-7B-v3.7](https://huggingface.co/SakuraLLM/Sakura-GalTransl-7B-v3.7) · [LunaTranslator](https://docs.lunatranslator.org/zh/guochandamoxing.html) · [Ebook-Translator-Calibre-Plugin](https://github.com/bookfere/Ebook-Translator-Calibre-Plugin/wiki/English) · [translate-book](https://github.com/deusyu/translate-book) · [ai-novel-translation](https://github.com/darkautism/ai-novel-translation) · [local-translator](https://github.com/Khaibec/local-translator) · [novel-publisher-agy](https://github.com/tritamk14/novel-publisher-agy) (chỉ đoạn trích) · [MTLS](https://github.com/thang97-21/MTLS) (chỉ đoạn trích) · [LectuLibre trên dev.to](https://dev.to/jacob_gong/translating-entire-books-with-llms-our-chunking-strategy-for-context-preservation-357n) · LinguaGacha issue [#832](https://github.com/neavo/LinguaGacha/issues/832), [#927](https://github.com/neavo/LinguaGacha/issues/927), [#930](https://github.com/neavo/LinguaGacha/issues/930) · [DeepL API](https://developers.deepl.com/api-reference/translate/request-translation) · [Google Cloud translateText](https://docs.cloud.google.com/translate/docs/reference/rest/v3/projects/translateText).

**Bài báo (đọc qua agent, trang tóm tắt):** liên kết ở bảng Quan sát 3. Ngoài ra [Lost in the Middle](https://arxiv.org/abs/2307.03172), [Translating Step-by-Step (WMT 2024)](https://arxiv.org/abs/2409.06790), [Findings of WMT 2024 Discourse-Level Literary Translation](https://arxiv.org/abs/2412.11732), [Cui et al. 2024](https://arxiv.org/abs/2406.07081), [BWB, ACL 2023](https://aclanthology.org/2023.acl-long.435/), [Tiedemann & Scherrer 2017](https://aclanthology.org/W17-4811/): đã tìm thấy nhưng không dùng làm căn cứ cho đề xuất nào ở trên.

---

[Mục lục handbook](../README.md)
