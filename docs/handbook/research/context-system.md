# Hệ thống ngữ cảnh, đợt 2: bộ đệm thật, ai nói với ai, văn phong từ đề xuất đã duyệt

Ngày đọc: **2026-10-03** · Trạng thái: **Quan sát** (tài liệu nhà cung cấp, bài báo, README và một phần mã) cộng **đề xuất chưa chốt**, ghi riêng ở "Suy luận" · Chủ trì: research/engineering · Liên quan: [ngữ cảnh truyện (đợt 1)](story-context.md), change [`context-core`](../../../openspec/changes/context-core/), [chia lô dịch truyện](chunking-translation.md), [lõi AI](ai-core-architecture.md), [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md), [câu hỏi còn mở](../product/open-questions.md) (P0 ma trận xưng hô, P1 văn phong)

## Tóm tắt

Đợt 1 ([ngữ cảnh truyện](story-context.md)) đã đặt mô hình: sáu lớp ngữ cảnh, ba tầng prompt A/B/C theo điểm cắt cache, thuật ngữ lọc theo đoạn, xưng hô lọc theo chương. Change `context-core` dựng kế hoạch trên đó (0/41 task). Đợt này kiểm tra sáu giả định mà kế hoạch đang dựa vào nhưng chưa ai soát:

1. **Ba tầng vẫn đúng về thứ tự, nhưng "điểm cắt cache" là khái niệm của Anthropic.** Mira gọi qua Chat Completions tương thích OpenAI (OpenAI, OpenRouter, DeepSeek, Gemini). Ở đó bộ đệm là **tự động theo tiền tố dài nhất**, không đặt điểm cắt được (trừ vài ngoại lệ nêu dưới). Thêm một điều đợt 1 chưa thấy: **có ngưỡng tối thiểu 1.024–4.096 token**, trong khi system prompt dịch của Mira hôm nay chỉ cỡ trăm token. Tầng A đứng một mình sẽ **không bao giờ được cache**.
2. **Gửi cả chương trước hay cả glossary không phải là lối tắt an toàn**, kể cả với model 1M token. Mọi bằng chứng tìm được đều nghiêng về **chọn lọc**: chèn thuật ngữ khớp theo đoạn nâng độ đúng thuật ngữ từ 69,1% lên 81,4% mà không giảm chất lượng; độ tuân thủ giảm khi số chỉ dẫn tăng; và chưa có nghiên cứu nào so trực tiếp "cả chương trước" với "tóm tắt".
3. **Ma trận xưng hô chỉ dùng được khi biết ai nói với ai, mà đây là chỗ hở lớn nhất của thiết kế.** Xác định người nói trong tiểu thuyết đạt ~90–95%. Người nghe kém hơn khoảng 10 điểm (tiếng Trung: GPT-3.5 đúng cả cặp 78,8%; model tinh chỉnh 84,4%). Chưa có công cụ nào lưu cặp xưng hô có chiều theo chương mà kiểm chứng được, và cũng chưa có benchmark xưng hô tiếng Việt nào.
4. **Văn phong không cần căn chỉnh nữa.** Các sản phẩm thương mại đều lấy ví dụ few-shot từ đoạn **người đã duyệt**. Mira có sẵn đúng thứ đó sau ADR-005: mỗi đề xuất được chấp nhận là một cặp (nguồn → bản cuối). Đây là lối ra cho câu hỏi P1, vốn đang "chưa có thiết kế".
5. **AI trích thuật ngữ rất nhiễu.** Một báo cáo LinguaGacha ghi chỉ **122/564 mục (~22%)** sống sót qua soát tay. Đây là lý do mạnh để giữ hàng chờ duyệt và không tự duyệt.
6. **Chưa ai có cờ "đã cũ" bền cho đoạn.** Thiết kế gần nhất là translate-book (MIT): ghi tập thuật ngữ đã áp cho mỗi lô, rồi lập kế hoạch dịch lại đúng các lô dùng mục đã đổi.

## Câu hỏi và phương pháp

Sáu câu hỏi, mỗi câu gắn với một chỗ trong `context-core` hoặc câu hỏi mở:

| # | Câu hỏi | Chỗ phụ thuộc |
| --- | --- | --- |
| Q1 | Với các provider Mira thật sự dùng, tầng A/B có được cache riêng không? Có tốn phí ghi không? Chạy song song có phá cache không? | `context-core` D5, Non-goal "không khai `cache_control`" |
| Q2 | Model ngữ cảnh dài có làm bước chọn lọc trở nên thừa không? | Mục 13 "điều có thể bác bỏ" của đợt 1 |
| Q3 | Làm sao biết người nói và người nghe của từng câu thoại? | Ma trận xưng hô, câu hỏi mở P0 |
| Q4 | Lấy ví dụ văn phong từ đâu khi không còn căn chỉnh? | Câu hỏi mở P1, scope S3.2/S3.5 |
| Q5 | AI trích thuật ngữ/nhân vật đúng tới đâu, và hàng chờ duyệt trình bày thế nào? | Phần "AI tự trích" mà `context-core` để sang change sau |
| Q6 | Khi một mục ngữ cảnh đổi, tìm bản dịch cũ chịu ảnh hưởng bằng cách nào? | `context-core` D11 (độ mịn của băm) |

**Cách làm:** đọc mã Mira trực tiếp, cộng ba nhánh nghiên cứu web song song qua agent. **Mức kiểm** ghi ở từng hàng:
- **đọc** là agent tải trang chính chủ. Công cụ tải trả về bản tóm tắt máy của trang, nên mọi con số cần đối chiếu lại trên trang trước khi dùng để quyết định.
- **snippet** là chỉ thấy đoạn trích của máy tìm kiếm, **chưa kiểm**.

Một số tên model trong tài liệu nhà cung cấp (GPT-5.6, Gemini 3.5–3.8 Flash, DeepSeek V4) **chưa được đối chiếu chéo**. Chưa gọi provider thật để đo cache, chưa chạy công cụ nào, chưa có fixture.

## Quan sát 0 — Mira hôm nay gửi gì

Đọc mã ngày 2026-10-03:

- **Dịch chương chưa gửi chút ngữ cảnh nào.** `ChapterTranslator.runBatch` chỉ truyền `sourceLang`, `targetLang`, `segments` ([`chapterTranslation.ts:134-138`](../../../src/main/services/ai/chapterTranslation.ts)). `TranslateRequest.context?: string` có trong kiểu nhưng không ai điền ([`types.ts:22`](../../../src/main/infra/providers/types.ts)).
- **System prompt dịch là năm câu ngắn** ([`openAiCompatible.ts:59-65`](../../../src/main/infra/providers/openAiCompatible.ts)), dưới 400 ký tự, cỡ một trăm token (ước lượng, chưa đếm bằng tokenizer).
- **Panel Hỏi AI** đặt ngữ cảnh chương vào **một message `user` riêng, trước lịch sử hội thoại** ([`chatPrompt.ts:67-93`](../../../src/main/services/ai/chatPrompt.ts)). Chú thích trong mã nói làm vậy để giữ system prompt làm tiền tố ổn định.
- **Đọc được số token cache** từ `prompt_tokens_details.cached_tokens` (OpenAI/OpenRouter) và `prompt_cache_hit_tokens` (DeepSeek) ([`usage.ts:58-61`](../../../src/main/infra/providers/usage.ts)). Changelog ngày 2026-10-03 ghi `cached_tokens` **chưa từng được thấy** trong một lần gọi thật.

## Quan sát 1 — Bộ đệm prompt ở các provider Mira dùng

| Provider | Bật thế nào | Ngưỡng tối thiểu | Giá đọc / phí ghi | Đặt điểm cắt? | Báo trong `usage` | Mức kiểm |
| --- | --- | --- | --- | --- | --- | --- |
| [OpenAI](https://developers.openai.com/api/docs/guides/prompt-caching) | Tự động | **1.024 token**; model cũ làm tròn xuống bội số 128 | Model cũ: không phí ghi. GPT-5.6+: ghi **1,25×**, đọc **0,1×** | Chỉ GPT-5.6+, chế độ `explicit`, **tối đa 4 điểm**. Mọi ví dụ dùng **Responses API**; **chưa xác nhận** Chat Completions nhận `prompt_cache_breakpoint` | `prompt_tokens_details.cached_tokens` | đọc |
| | Thời hạn: model cũ 5–10 phút (`in_memory`) hoặc `24h`; GPT-5.6+ ít nhất 30 phút. `prompt_cache_key`: quá **~15 request/phút mỗi khóa** thì tràn sang máy khác và trượt cache. Có `prewarm` để làm ấm trước | | | | | đọc |
| [Gemini](https://ai.google.dev/gemini-api/docs/generate-content/caching) | Ngầm định, bật sẵn từ 2.5 | **2.048** (2.5 Flash/Pro), **4.096** (3.x Flash, 3.1 Pro) | Không phí ghi, "**không bảo đảm** tiết kiệm"; bảng giá cho thấy đọc ~0,1× (2.5 Flash: 0,30 → 0,03 $/1M) | Ngầm định: không. Tường minh (`cachedContents`, mặc định 1 giờ, tính phí lưu 0,50–4,50 $/1M token/giờ): mọi ví dụ chỉ dùng **một** cache mỗi request, nên không chồng A và B riêng được (suy từ ví dụ, tài liệu không nói thẳng) | Gốc: `cachedContentTokenCount`. Qua endpoint tương thích OpenAI: **chưa rõ** | đọc |
| [DeepSeek](https://api-docs.deepseek.com/guides/kv_cache) | Tự động | "Đơn vị tiền tố" tạo ở **ranh giới request**, ở tiền tố chung hệ thống tự phát hiện, và theo khoảng cố định với input dài; phải **khớp trọn đơn vị** | Ghi tính giá input thường. Đọc rẻ hơn nhiều; tỉ lệ chính xác lệch giữa hai nguồn (0,1× hay ~1/50), **cần đọc lại** | Không | `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` | đọc |
| [OpenRouter](https://openrouter.ai/docs/features/prompt-caching) | Chuyển qua provider gốc | Theo provider gốc | Gemini qua `cache_control`: ghi = giá input + phí lưu × 5/60 giờ | **Có** cho Anthropic (4 điểm) và Gemini (`cache_control` theo khối, không giới hạn số điểm) | `cached_tokens`, `cache_write_tokens` | đọc |
| | **Định tuyến dính**: sau một request có cache, các request sau cùng model đi cùng provider; hết sau **10 phút nhàn rỗi**; ghim được bằng `session_id` | | | | | đọc |
| CLIProxyAPI | Phụ thuộc upstream | — | — | — | — | chưa nghiên cứu |

**Về gọi song song** (suy luận từ cơ chế, **không có tài liệu nào nói thẳng**): bắn nhiều lô cùng tiền tố cùng lúc, trước khi lô đầu trả về, phần lớn sẽ **trượt**:
- DeepSeek nói dựng cache mất "vài giây";
- OpenAI cache theo máy và tràn ở ~15 request/phút;
- Gemini chỉ khuyên gửi gần nhau.

Việc OpenAI có `prewarm` (làm ấm, tính phí ghi) cũng gợi ý điều này.

## Quan sát 2 — Chọn lọc hay nhồi cả ngữ cảnh dài

| Nguồn | Phát hiện | Giới hạn | Mức kiểm |
| --- | --- | --- | --- |
| [Glossary injection (arXiv 2605.14679)](https://arxiv.org/html/2605.14679) | ES→EN, gemini-3.1-pro-preview, glossary 200 mục (44 mục xuất hiện). Chèn **chỉ mục khớp theo đoạn**: đúng thuật ngữ **81,4%** (không glossary 69,1%, DeepL 64,4%). Điểm chất lượng DA không đổi (85,27 so với 85,24) | **Không thử** "nhồi cả glossary", nên chưa trả lời thẳng mục 13 của đợt 1 | đọc |
| [IFScale (arXiv 2507.11538)](https://arxiv.org/abs/2507.11538) | 500 chỉ dẫn "phải có từ khóa": model tốt nhất chỉ đạt **68%**; có **thiên lệch đầu** (chỉ dẫn đặt trước được tuân thủ tốt hơn); ba kiểu suy giảm (ngưỡng / tuyến tính / mũ) theo họ model | Không phải dịch thuật; là phép thế gần nhất cho "glossary lớn" | tóm tắt (abstract), phần kiểu suy giảm là snippet |
| [Context Rot (Chroma, 2025-07)](https://www.trychroma.com/research/context-rot) | 18 model (gồm Gemini 2.5, GPT-4.1) kém tin cậy dần khi input dài, kể cả việc chép lại; prompt tập trung ~300 token thắng prompt đầy đủ ~113k token trên LongMemEval; thêm chi tiết gây nhiễu làm tệ hơn | Không phải dịch thuật | đọc |
| [NoLiMa (arXiv 2502.05167)](https://arxiv.org/abs/2502.05167) | Ở 32K token, 11/13 model rơi xuống ≤50% điểm ngữ cảnh ngắn; GPT-4o 99,3% → 69,7% | — | snippet |
| [Dịch theo chương (arXiv 2407.08978)](https://arxiv.org/html/2407.08978) | ZH→EN, 160 cuốn: dịch theo chương thắng dịch theo câu; ALMA-7B rơi từ 15,40 BLEU (512 token) xuống **2,70** (2.048 token); **36,7%** đầu ra lặp, tệ hơn sau ~1.000 token | Model 7B, đời 2024 | đọc |
| [Loong (arXiv 2605.30274)](https://arxiv.org/abs/2605.30274) | Chọn ngữ cảnh thích ứng từ bộ nhớ ba phần (tóm tắt / cặp câu mẫu / thực thể), huấn luyện bằng RL; thắng cả "cửa sổ hẹp" lẫn "toàn bộ lịch sử", tới **+13,0 điểm** trung bình trên 3 thước đo, EN↔ZH/DE/FR | Chỉ đọc abstract; cần huấn luyện, Mira không làm được nguyên | tóm tắt |
| [SEGALE (EMNLP 2025)](https://arxiv.org/abs/2509.17249), [WMT25 General](https://aclanthology.org/2025.wmt-1.22.pdf) | Nhiều model mở không dịch nổi tài liệu ở độ dài ngữ cảnh tối đa chúng công bố; WMT25 ghi "khoảng cách lớn giữa độ dài công bố và thực tế" | WMT25 chỉ là snippet | tóm tắt / snippet |

**Cả chương trước so với tóm tắt:** **không tìm thấy** nghiên cứu nào đo trực tiếp với model 1M token. Bằng chứng gián tiếp (Loong, Context Rot, bài dịch theo chương) đều nghiêng về tóm tắt cộng vài đoạn liền trước.

## Quan sát 3 — Ai nói với ai

**Học thuật về xưng hô tiếng Việt:** **không tìm thấy** benchmark hay tỉ lệ lỗi đại từ nào cho Trung→Việt hay bất kỳ hướng →Việt nào. Gần nhất là [IWSLT 2023 Formality Control EN→VI](https://aclanthology.org/2023.iwslt-1.1.pdf) (dựa trên [CoCoA-MT](https://github.com/amazon-science/contrastive-controlled-mt)). Nhưng bài này chỉ phân **hai mức** trang trọng/thân mật ("bạn" / "quý vị … ạ"), baseline đã đạt 98–99%, có đội đạt 100% (**đọc**). Nghĩa là công tắc trang trọng toàn cục là bài đã giải xong và rất thô; chọn từ xưng hô theo cặp là bài khác hẳn. Phía nguồn, **đại từ zero** trong tiếng Trung (chủ ngữ bị lược) là vấn đề gần nhất, với [GuoFeng](https://aclanthology.org/2022.emnlp-main.774/) và DITING. Cả hai không có tiếng Việt (**snippet**).

**Xác định người nói (quote attribution):**

| Nguồn | Dữ liệu | Kết quả | Mức kiểm |
| --- | --- | --- | --- |
| [LLM gán người nói cả chương (arXiv 2406.11380)](https://arxiv.org/html/2406.11380v2) | PDNC, tiếng Anh, 28 tiểu thuyết, ~36K câu thoại | Llama-3-8B, đưa **cả chương**: **90,6% / 88,5%**; câu không có tên người nói gần đó 85,7–89,1%; BookNLP+ 78,5–79,2%; gpt-3.5-turbo 71%; Llama-3-70B sai 3/1.442 câu trên một cuốn chưa thấy | đọc |
| [ModernBERT (arXiv 2608.02359)](https://arxiv.org/html/2608.02359) | PDNC | **94,5%**, 0,43 giây/cuốn; nhưng **chỉ tiếng Anh, không đoán người nghe** | đọc |
| [JY-QuotePlus (NLPCC 2024)](https://arxiv.org/abs/2408.09452) | Tiếng Trung, 8.144 câu thoại, có **cả người nói lẫn người nghe**; hai người gán nhãn đồng thuận ~99% F1 | Model tinh chỉnh: người nói 95,1%, người nghe 85,1%, **đúng cả cặp 84,4%**. GPT-3.5 few-shot: 87,6% / 79,9% / **78,8%** | đọc |
| [Tam Quốc bản Nhật (WNU 2025)](https://aclanthology.org/2025.wnu-1.17/) | Tiếng Nhật | LLaMA-3-70B ~90% người nói, không cần người sửa; ngữ cảnh dài hơn giúp | đọc |

Người nghe khó hơn vì thường chỉ được nhắc bằng đại từ. Cấu hình tốt nhất trong các bài là **đưa cả chương và gán mọi câu thoại một lượt**. Chưa có model đời 2025–2026 nào được đo trên bài người nghe tiếng Trung.

**Cộng đồng Việt:**

| Công cụ | Cách xử lý xưng hô | Mức kiểm |
| --- | --- | --- |
| QT / VietPhrase / STV | Tệp `Pronouns` thay chuỗi cố định, khớp cụm dài trước; không theo cặp, người convert sửa tay | snippet |
| [Donut4055/truyen](https://github.com/Donut4055/truyen) (Python, Gemini, 2026) | System prompt bắt model tự hỏi *"Người nói là ai? Người nghe là ai?"*, giữ cố định một cặp xưng hô hai chiều cho mỗi cặp nhân vật, có bộ cặp mặc định theo thể loại (tiên hiệp, học đường…); "sơ đồ" quan hệ là **Markdown tự do + Mermaid** do LLM viết, **không có cặp có cấu trúc, không có mốc chương**; README tự nhận "nhất quán xưng hô 100%" mà không có số đo | đọc (`prompts/system_prompt.py`, `data/story_context_cache.json`) |
| [caoduongle/API_dich_truyen](https://github.com/caoduongle/API_dich_truyen) | Kiểm bằng luật và bằng AI, có mục "bất nhất tên riêng/xưng hô"; gần nhất với bước kiểm sau dịch của Mira | đọc README |
| tritamk14/novel-publisher-agy | Snippet quảng cáo "ma trận xưng hô phase-based" đổi theo tiến triển quan hệ, tức gần y ý tưởng `dyad` + `fromChapter`; repo nay trả **404** | snippet, chưa kiểm |

**Ngôn ngữ khác:**
- [Kính ngữ tiếng Hàn (IAAI 2026)](https://aclanthology.org/2026.iaai-1.3/) (abstract): model chuyên dịch dùng kính ngữ nhiều hơn mức người đánh giá; khi được nói rõ người nghe là ai, model seq2seq đổi theo. Đây là bằng chứng cho việc **nói rõ cặp trong prompt**.
- KeiCO (tiếng Nhật, 10.007 câu có nhãn quan hệ người nói–người nghe) chỉ thấy qua snippet.
- **Không thấy sản phẩm dịch máy nào** lưu bảng xưng hô theo cặp; tối đa là công tắc trang trọng.

## Quan sát 4 — Ví dụ văn phong lấy từ đoạn người đã duyệt

| Sản phẩm / bài | Tín hiệu | Bao nhiêu, chọn thế nào | Mức kiểm |
| --- | --- | --- | --- |
| [Google Adaptive Translation](https://docs.cloud.google.com/translate/docs/advanced/adaptive-translation) | Cặp câu người dùng cung cấp (5 tới 30k cặp, mỗi cặp ≤512 ký tự) | **5 cặp giống nhất** mỗi request; cách đo giống không công bố | đọc |
| [Phrase Next GenMT](https://support.phrase.com/hc/en-us/articles/14299433827996-Phrase-Next-GenMT) | Fuzzy match từ TM dự án + termbase (từ ưu tiên, từ cấm) | RAG lấy "một tập fuzzy match" làm few-shot; dịch theo **khối nhiều segment**; không công bố số lượng hay mức cải thiện | đọc |
| [Lokalise AI profiles](https://docs.lokalise.com/en/articles/11894216-ai-profiles) | TM, hoặc bản dịch **đã đánh dấu "reviewed"** | Khuyên **≥500 ví dụ** chất lượng, nguồn ≤1.000 ký tự; khớp 100% thì áp thẳng không qua AI | đọc |
| [memoQ AGT](https://docs.memoq.com/helpcenter/Products/memoQ-AGT/index.htm), [Crowdin AI](https://support.crowdin.com/enterprise/crowdin-ai/) | TM, LiveDocs, termbase; Crowdin thêm chuỗi lân cận và style guide | Không công bố số lượng hay ngưỡng | đọc |
| [Moslem et al. 2023](https://arxiv.org/abs/2301.13294) | Fuzzy match theo **embedding** từ TM đã duyệt | Fuzzy match hơn ví dụ ngẫu nhiên, ngẫu nhiên hơn zero-shot; tăng dần từ 1 → 2 → 5 → 10 ví dụ, lợi giảm dần; 5 fuzzy match giúp GPT-3.5 vượt DeepL/Google EN→FR/ES; **EN→ZH cần 10**; thứ tự ví dụ không đáng kể | đọc |
| [Agrawal et al. 2022](https://arxiv.org/abs/2212.02437) | BM25 | Chất lượng và miền của ví dụ quan trọng; **một ví dụ nhiễu có thể gây hỏng nặng** | tóm tắt |
| [CIPHER / PRELUDE (Gao et al. 2024)](https://arxiv.org/abs/2404.15269) | Cặp (bản nháp → bản người sửa) | LLM biến mỗi chỗ sửa thành **mô tả sở thích bằng lời**; lúc sinh, lấy sở thích của k ngữ cảnh gần nhất. Chi phí sửa thấp nhất, overhead nhỏ, người dùng **đọc và sửa được** sở thích đã học | đọc abstract |

Điểm chung: kho ví dụ **chỉ gồm thứ người đã duyệt**, và lấy theo độ giống với nguồn mới. Không tài liệu nào tách "chấp nhận nguyên" khỏi "đã sửa"; chỉ các engine thích ứng (ModernMT/Lara, Smartcat) nói có học từ chỗ sửa, mà không nói cách làm (**snippet**, tài liệu tiếp thị).

## Quan sát 5 — AI trích thuật ngữ và hàng chờ duyệt

| Công cụ | Khi nào trích | Dạng đầu ra / luật | Duyệt thế nào | Mức kiểm |
| --- | --- | --- | --- | --- |
| [OpenNovel](https://www.opennovel.co/docs/glossary) | Theo yêu cầu, từng chương | Ba loại: nhân vật (có giới tính), danh xưng, thuật ngữ | Sửa danh sách phát hiện trong editor glossary, rồi tự dịch lại chương | đọc |
| [KeywordGacha](https://github.com/neavo/KeywordGacha/tree/main/resource/prompt/en) (neavo, **không có tệp LICENSE**, chỉ học ý) | Cả văn bản, trước khi dịch | Prompt đọc được: chỉ mục duy nhất, bỏ từ thông dụng, **không gộp kính ngữ/danh xưng vào biên tên**; 9 loại (tên nam/nữ/chưa rõ, địa danh, gia tộc, tổ chức, vật phẩm, sinh vật, khác); JSONL `{"src","dst","type"}` | Công cụ riêng, nhập vào LinguaGacha | đọc |
| [LinguaGacha](https://github.com/neavo/LinguaGacha/wiki/Glossary) auto glossary | Trong lúc dịch | Thêm tên nhân vật còn thiếu | **Tự thêm không qua duyệt**, chỉ mục có giới tính | đọc |
| [translate-book](https://github.com/deusyu/translate-book/blob/main/SKILL.md) (**MIT**) | Trước khi dịch, lấy mẫu lô đầu, lô cuối và 3 lô giữa | Trường: `source, target, category, aliases, gender, confidence, frequency, evidence_refs`; một bộ đếm tần suất quét mọi lô | Sửa tệp; **cấm một dạng viết (nguồn hoặc alias) thuộc hai mục**; mỗi lô chỉ nhận mục xuất hiện trong lô | đọc |
| [NyaaReader](https://github.com/mughir/NyaaReader) | Học dần khi dịch | — | Người dùng **khóa** mục; mục đã khóa thì bắt buộc, mục chưa khóa gộp không trùng | đọc README |
| [memoQ term extraction](https://docs.memoq.com/current/en/Workspace/term-extraction-editor.html) | Thống kê | Ứng viên + danh sách từ dừng | **Danh sách ứng viên**: Accept (Ctrl+Enter) / Drop; mục đã bỏ vẫn ở danh sách, xuống cuối | snippet |

**Nhiễu đo được:** [LinguaGacha issue #677](https://github.com/neavo/LinguaGacha/issues/677) (**đọc**) báo chỉ **122/564 mục (~22%)** sống qua soát tay. Các nguyên nhân người báo nêu:
- từ phụ thuộc ngữ cảnh bị nâng thành luật toàn cục;
- từ thông dụng;
- biến thể hoa/thường, số nhiều, thì bị trích thành mục riêng;
- cụm hiếm.

Đây là một báo cáo, một tác phẩm, chưa có phản hồi của người bảo trì.

## Quan sát 6 — Tìm bản dịch cũ khi ngữ cảnh đổi

| Công cụ | Cơ chế | Độ mịn | Mức kiểm |
| --- | --- | --- | --- |
| [translate-book](https://github.com/deusyu/translate-book/blob/main/SKILL.md) (MIT) | Ghi **tập thuật ngữ đã áp và băm của chúng** cho mỗi lô; `run_state.py plan` chia lô thành dịch lại / chỉ ghi nhận / không đổi | Đúng các lô có mục đã ghi bị đổi (đích, alias hoặc loại) | đọc |
| NyaaReader | Dịch lại một phần các chương chứa tên đã sửa | Chương | đọc README |
| OpenNovel, darkautism | Chỉ áp cho chương sau; chương cũ phải tự dịch lại | — | đọc |
| LinguaGacha, GalTransl, Trados Terminology Verifier | **Báo cáo QA**: thiếu thuật ngữ, dùng từ cấm, cùng nguồn dịch khác nhau | Dòng/segment, chỉ báo | đọc (LinguaGacha), snippet (còn lại) |
| memoQ | Find & Replace trong TM | Thay chữ hàng loạt | snippet |

Không nguồn nào có cờ "đã cũ" lưu bền trên segment.

## Suy luận và đề xuất cho Mira

Các mục dưới đây là **đề xuất**, sửa hoặc bổ sung cho [đợt 1](story-context.md#suy-luận-và-đề-xuất-cho-mira) và cho `context-core`. Không mục nào là quyết định.

**K1. Giữ thứ tự A → B → C, đổi lý do và đổi cách đo.** Thứ tự vẫn đúng với mọi provider, vì tất cả đều khớp **tiền tố**. Nhưng trên Chat Completions không có điểm cắt, nên tầng B được cache chỉ khi hai điều kiện cùng đúng: (a) **giống từng byte** giữa các lô của một chương, và (b) phần **A + B vượt ngưỡng** (1.024 với OpenAI, 2.048–4.096 với Gemini). Ba hệ quả:
- **Tầng A hôm nay (~100 token) không bao giờ tự cache được.** Đừng tính tiết kiệm cho tầng A riêng. Lợi ích chỉ đến khi chương có đủ ngữ cảnh ở tầng B, hoặc khi glossary nằm ở tầng ổn định.
- **Mọi thứ trong A và B phải tuần tự hóa xác định**: sắp mục theo khóa ổn định, không có thời gian, không có số đếm thay đổi. Yêu cầu này đã có trong `context-core` D5 vì lý do băm. Nay nó có thêm lý do chi phí.
- **Đo bằng `usage` thật**, không bằng giả định. `usage.ts` đã đọc `cached_tokens`; cần một lần gọi thật cho thấy con số khác 0 trước khi kể tiết kiệm cache vào ước lượng chi phí.

**K2. Gửi lô đầu của mỗi chương một mình, rồi mới chạy song song.** Lô đầu ghi cache cho A + B, các lô sau đọc lại. Thêm vào thiết kế module Tác vụ:
- **Với OpenRouter:** gửi `session_id` theo tác vụ để giữ định tuyến dính.
- **Với OpenAI:** dùng `prompt_cache_key` theo chương, giữ dưới ~15 request/phút mỗi khóa.
- **Thời gian:** cố gắng xong mọi lô của một chương trong vòng thời hạn cache (5–10 phút với bộ đệm ngầm định).

Đây là suy luận từ cơ chế; phải đo bằng bước kiểm chứng V1.

**K3. Không dựng `cache_control` hay `cachedContents` ở bản đầu.** Chúng chỉ có ở Anthropic, ở Gemini qua OpenRouter, ở Gemini tường minh (tính phí lưu theo giờ, một cache mỗi request) và ở OpenAI đời mới qua Responses API. Non-goal "không khai `cache_control`" của `context-core` giữ nguyên. Nếu sau này cần, đó là một tùy chọn trong bản ghi `compat` của từng kết nối, không phải một thay đổi ở `buildContext`.

**K4. Chọn lọc là mặc định, nhưng mục 13 của đợt 1 vẫn mở.** Glossary lọc theo đoạn đã có bằng chứng dương (+12,3 điểm đúng thuật ngữ, chất lượng không đổi). Chưa có bằng chứng nào so với "nhồi cả glossary vào tiền tố cache". Hai thay đổi nhỏ:
- **Thiên lệch đầu** (IFScale) gợi ý đặt khối thuật ngữ khớp **ở đầu tầng C**, ngay trước văn bản nguồn, thay vì sau các đoạn liền trước.
- **Không gửi cả chương trước**, kể cả với Gemini 1M: dùng tóm tắt chương trước (tầng B) và vài đoạn liền trước (tầng C), như đợt 1 và [chia lô](chunking-translation.md) đã đề xuất.

**K5. Thêm lượt "ai nói với ai" vào lượt trước chương, cùng chỗ với trích mục mới.** Ma trận xưng hô cần nhãn người nói và người nghe cho từng câu thoại. Đề xuất:
- **Một lượt gọi mỗi chương:** đưa cả chương nguồn, dàn nhân vật của chương làm **danh sách ứng viên**, và yêu cầu trả `{quoteId, speaker, addressee, confidence}`.
- **Ghép vào lượt trích** đã có trong kế hoạch ("trích thuật ngữ/tên/cặp xưng hô mới của chương sắp dịch"). Không thêm lần gọi nào.
- **Dùng nhãn để chọn dòng `dyad`** chính xác hơn "mọi cặp trong dàn nhân vật". Tầng B vẫn ổn định trong chương, vì nhãn tính một lần mỗi chương.
- **Có thể gửi kèm nhãn ở tầng C**, dạng gợi ý "đoạn 12: A nói với B". Chưa chốt, vì nó làm tầng C dài thêm.

Kỳ vọng sai ~10–15% ở người nghe, nặng nhất ở cảnh nhiều người. Hai hệ quả:
- **Bước kiểm tuân thủ xưng hô** (`contextCompliance`) chỉ được gắn cờ **mạnh** khi nhãn của câu thoại có độ tin cậy cao. Câu thoại nhãn yếu chỉ gắn cờ "nên xem", không gắn "sai".
- **Lượt này là đầu vào của bước kiểm**, nên phải có trong cùng change với bước kiểm. Hoặc `context-core` hạ yêu cầu kiểm xưng hô xuống mức "cặp từ xưng hô có nằm trong ma trận của dàn nhân vật hay không", không theo câu thoại.

**K6. Kho ví dụ văn phong là đoạn đã duyệt; chỗ sửa thành ghi chú văn phong chờ duyệt.** Đây là lối ra cho câu hỏi mở P1, và không cần căn chỉnh:
- **Tín hiệu 1, cặp ví dụ:** mỗi đề xuất AI được chấp nhận (nguyên hoặc sau khi sửa) cho một cặp (đoạn nguồn → bản cuối), có sẵn trong bảng `proposal` của [kiến trúc AI-first §5.3](../engineering/ai-first-architecture.md). Lấy **3–5 cặp giống nhất** theo đoạn nguồn bằng BM25 (n-gram ký tự cho CJK, không cần model embedding). Loại cặp bị từ chối hoặc đã cũ, vì một ví dụ xấu gây hỏng nặng. Nằm ở tầng C, có trần token riêng, vì đoạn dài hơn câu nhiều.
- **Tín hiệu 2, chỗ sửa:** với đề xuất bị **sửa** trước khi chấp nhận, so bản AI gốc với bản cuối. Định kỳ (ví dụ sau mỗi chương) nhờ AI rút thành **ghi chú văn phong bằng lời** kiểu CIPHER, ví dụ "dùng 'hắn' cho nhân vật nam phản diện, không dùng 'anh ta'". Ghi chú vào bảng ngữ cảnh dạng `style`, `status: pending`. Đã duyệt thì vào tầng A. Đây đúng luật "AI đề xuất, người ghi" áp cho chính văn phong.
- **Bản dịch cũ nhập từ ngoài** (trường hợp gốc của P1) vẫn chưa có đường. Nhưng nó có thể đi qua cùng cửa: nhập bản cũ → AI rút ghi chú văn phong → người duyệt. Không cần căn chỉnh từng câu.
- **Bộ dữ liệu khởi đầu:** tác phẩm mới không có cặp nào. Lokalise khuyên ≥500 ví dụ, Google chạy từ 5. Cần đo xem cần bao nhiêu chương đã duyệt thì ví dụ mới giúp được (V4).

**K7. Hàng chờ duyệt có bằng chứng, chống trùng và không tự duyệt.**
- **Mỗi mục AI trích mang:** chương và đoạn làm bằng chứng, tần suất trong chương, độ tin cậy, loại (lấy 9 loại kiểu KeywordGacha làm điểm xuất phát, gộp về sáu kiểu của Mira).
- **Chống trùng trước khi vào hàng:** so cả nguồn lẫn alias. Một dạng viết chỉ thuộc một mục, đã có `UNIQUE (form)` của `context_alias` trong `context-core` D1.
- **Trình bày** kiểu danh sách ứng viên của memoQ: Duyệt / Bỏ, mục đã bỏ được **nhớ** để lần trích sau không đề xuất lại.
- **Tách kính ngữ và danh xưng khỏi biên tên** (luật của KeywordGacha). Với tiếng Việt điều này còn quan trọng hơn, vì danh xưng ("sư huynh", "tiền bối") là đầu vào của ma trận xưng hô, không phải một phần của tên.
- **Không tự duyệt ở bản đầu.** Tỉ lệ sống 22% là lý do đủ. Câu hỏi "mục trùng y nguồn có được tự duyệt" mà proposal `context-core` để mở nên trả lời là **không**, cho tới khi có số đo của chính Mira (V5 của đợt 1).

**K8. Đánh dấu "nên xem lại" theo mục đã áp, không theo băm cả khối.** Học translate-book:
- **Khi lưu một lần gọi** (`job_item` hoặc `proposal`), ghi thêm **danh sách id + phiên bản các mục ngữ cảnh đã gửi**, không chỉ `contextHash`.
- **Khi một mục đổi**, tìm đúng các lần gọi đã dùng phiên bản cũ của mục đó. Với đoạn được dịch trước khi có bản ghi này, dùng tìm chuỗi (nguồn cũ hoặc đích cũ) làm dự phòng.
- **Kết quả là một hàng đề xuất**, không phải cờ trạng thái bền trên đoạn:
  - đổi đích của một thuật ngữ → đề xuất thay chữ có diff;
  - đổi xưng hô → đề xuất AI dịch lại đoạn.
- **Tôn trọng hiệu lực:** chỉ đoạn trong khoảng `fromChapter`–`toChapter` của mục mới tính.

Hệ quả cho D11 của `context-core`: điểm hở "độ mịn của băm" bớt quan trọng. Băm vẫn dùng để biết "ngữ cảnh có đổi không"; danh sách mục đã gửi trả lời "đổi **cái gì**, ảnh hưởng **đâu**", và không phụ thuộc cách chia lô.

**K9. Panel Hỏi AI: đặt phần ổn định trước lịch sử, phần đổi theo lượt ở cuối.** Hôm nay khối ngữ cảnh (gồm cả **vùng chọn**, đổi gần như mỗi lượt) đứng **trước** lịch sử. Mỗi lượt đổi vùng chọn làm trượt cache của toàn bộ lịch sử phía sau. Khi `buildContext` vào chat:
- **Đầu:** system prompt → ngữ cảnh truyện (glossary, xưng hô, tóm tắt) → chữ của chương ở lần mở.
- **Giữa:** lịch sử.
- **Cuối:** vùng chọn và câu hỏi hiện tại.

Đây là suy luận từ cơ chế khớp tiền tố; đo cùng V1.

**Không làm:** huấn luyện bộ chọn ngữ cảnh kiểu Loong, tinh chỉnh model trên chỗ sửa (DPO/CPO), embedding cho kho ví dụ trước khi BM25 cho thấy không đủ, và gửi cả chương trước làm ngữ cảnh.

## Bước kiểm chứng

Bổ sung cho [bảy bước của đợt 1](story-context.md#bước-kiểm-chứng), cùng fixture:

1. **V1 — Cache thật:** dịch một chương 5 lô với tầng A + B ~3.000 token, hai cách: tuần tự và song song cả 5. Mỗi cách chạy trên OpenAI, Gemini (qua endpoint tương thích) và DeepSeek. Ghi `cached_tokens` / `prompt_cache_hit_tokens` từng lô. Trả lời: K2 có đúng không; Gemini qua endpoint tương thích có báo số cache không; ngưỡng tối thiểu có đúng như tài liệu không. Lặp với panel chat theo hai thứ tự của K9.
2. **V2 — Người nói/người nghe:** gán nhãn tay ~200 câu thoại của hai chương ZH nhiều hội thoại (một chương có cảnh ≥3 người). Chạy lượt K5 với 2–3 model. Đo đúng người nói, đúng người nghe, đúng cả cặp, và độ tin cậy model tự báo có tách được câu sai hay không. Đây cũng là **bộ kiểm xưng hô tiếng Việt đầu tiên** mà Quan sát 3 nói là chưa tồn tại.
3. **V3 — Ma trận có nhãn so với không nhãn:** cùng chương, ba điều kiện: không ma trận; ma trận theo dàn nhân vật (đợt 1); ma trận + nhãn người nói/người nghe (K5). Đếm lượt đại từ sai cặp.
4. **V4 — Ví dụ văn phong:** sau 1, 3, 10 chương đã duyệt, dịch chương kế với 0 / 3 / 5 ví dụ BM25. Người dịch so mù. Ghi thêm token tầng C.
5. **V5 — Ghi chú văn phong từ chỗ sửa:** chạy bước rút ghi chú của K6 trên các đề xuất đã sửa của 3 chương. Đếm bao nhiêu ghi chú người dùng duyệt thẳng, sửa, bỏ.
6. **V6 — Đánh dấu xem lại:** đổi một thuật ngữ và một dòng xưng hô, xác nhận K8 chỉ đề xuất đúng các đoạn đã dùng phiên bản cũ trong khoảng hiệu lực, kể cả khi cách chia lô đã đổi.

## Giới hạn

- Mọi trang web đi qua công cụ tải có tóm tắt bằng model nhỏ. Con số quan trọng (ngưỡng cache, giá, tỉ lệ đúng) phải đối chiếu lại trên trang gốc trước khi đưa vào ADR hoặc ước lượng chi phí.
- Tài liệu cache đổi nhanh. Đọc lại khi làm module Tác vụ.
- Chưa nghiên cứu CLIProxyAPI có giữ cache của upstream hay không.
- Các công cụ cộng đồng Việt phần lớn chỉ đọc README hoặc snippet. Diễn đàn Voz trả 403/404.
- Mã không có tệp LICENSE (LinguaGacha, KeywordGacha) và mã GPL/AGPL chỉ học ý tưởng. translate-book là MIT.

---

[Mục lục handbook](../README.md)
