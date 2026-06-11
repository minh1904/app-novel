# Prompt Injection Strategies — Novel Translation Tools

> Nghiên cứu so sánh cách các tool dịch truyện chữ sử dụng LLM inject context vào prompt.  
> Ngày: 2026-05-14.

---

## 1. Repos được phân tích

| Tier | Repo | Stars | Đặc điểm nổi bật |
|------|------|-------|------------------|
| 1 | [yihong0618/bilingual_book_maker](https://github.com/yihong0618/bilingual_book_maker) | 9.3k | Reference implementation rộng nhất, 10+ providers |
| 1 | [SpiraMirabilis/translate](https://github.com/SpiraMirabilis/translate) | ~1 | Entity pipeline tinh vi nhất, genre presets, 3-pass |
| 1 | [jesselau76/ebook-GPT-translator](https://github.com/jesselau76/ebook-GPT-translator) | 1.7k | Auto-growing term memory, SQLite cache |
| 1 | [combobulativedesigns/gptwntranslator](https://github.com/combobulativedesigns/gptwntranslator) | 31 | Scrape → translate → EPUB pipeline |
| 2 | [ogkalu2/comic-translate](https://github.com/ogkalu2/comic-translate) | 2.7k | Page-level JSON context, multimodal |
| 2 | [zyddnys/manga-image-translator](https://github.com/zyddnys/manga-image-translator) | 9.9k | Multi-model chain, inpainting |
| 2 | [openai-translator/openai-translator](https://github.com/openai-translator/openai-translator) | 24.9k | Translate/polish/summarize modes |
| 3 | [Snowad14/GPT-LN-Translator](https://github.com/Snowad14/GPT-LN-Translator) | 18 | Coefficient-based chunking |
| 3 | [marrazy/Large-Light-Novels](https://github.com/marrazy/Large-Light-Novels) | ~0 | RAG với ChromaDB + sentence-transformers |
| 3 | [jb41/translate-book](https://github.com/jb41/translate-book) | 87 | Minimal baseline reference |

---

## 2. Ma Trận So Sánh

| Tiêu Chí | bilingual_book_maker | SpiraMirabilis | ebook-GPT-translator | GPT-LN-Translator | Large-Light-Novels | comic-translate |
|-----------|---------------------|----------------|---------------------|-------------------|--------------------|-----------------|
| **System prompt** | Rỗng mặc định | Genre-specific `.txt` (xianxia/JP/KR) | 7 dòng generic + glossary ở cuối | Template nhúng trong code | 1 dòng prefix | Chi tiết comic context + JSON output |
| **Glossary vị trí** | Không có | System prompt placeholder | System prompt suffix | Không có | Không có | Không có |
| **Glossary format** | N/A | Nested JSON by category | Flat: `- Source => Target` | N/A | N/A | N/A |
| **Glossary lọc** | N/A | Per-chapter (regex scan) | Toàn bộ mọi lúc | N/A | N/A | N/A |
| **Memory type** | Sliding window N paragraphs | Entity glossary thay thế | 3 layer: block pairs + chapter summary + term memory | Không | RAG (ChromaDB) | Không |
| **Memory role** | `user + assistant` pair | N/A | `user` (labeled sections) | N/A | `user` (paste thô) | N/A |
| **Chunking** | Token accumulation | Fixed line batches | Configurable block size | Coefficient empirical | Fixed 1000 chars | Toàn trang 1 lần |
| **Second pass** | Không | 3 passes: translate → entity filter → CJK repair | Không | Không | INFO: extract → re-store | Không |
| **Retry logic** | 3–7x với fallback | Không | Không | Không | Không | Regex parse fallback |

---

## 3. Phân tích Patterns

### Pattern 1 — Glossary thuộc System Prompt (consensus)

Tất cả tool có glossary đều inject vào **system prompt**, không vào user turn.  
Lý do: system prompt là "instruction space" — AI ưu tiên tuân theo hơn user content.

**Khác biệt quan trọng**:
- SpiraMirabilis: **lọc per-chapter** — chỉ inject terms xuất hiện trong chunk hiện tại
- ebook-GPT-translator: dump toàn bộ glossary mọi lúc → đơn giản hơn nhưng tốn token

---

### Pattern 2 — Role cho Memory

| Tool | Role | Cơ chế |
|------|------|--------|
| bilingual_book_maker | `user + assistant` pair | Fake full conversation turn |
| ebook-GPT-translator | `user` | Labeled sections: `PREVIOUS_TRANSLATED_CONTEXT:` |
| Large-Light-Novels | `user` | Paste thô danh sách retrieved docs |

Dùng `assistant` đơn độc (không kèm user turn giả) cho memory injection khiến AI xử lý rolling summary như thể chính nó đã tóm tắt trước — tinh tế hơn các cách còn lại.

---

### Pattern 3 — Consistency Mechanisms

Khi không có static glossary, các tool dùng:

- **Sliding window** (bilingual_book_maker): AI tự suy luận từ N paragraph gần nhất
- **Entity JSON per-chapter** (SpiraMirabilis): Structured "memory" dạng glossary động
- **Auto-growing term memory** (ebook-GPT-translator): Regex extract terms từ output → re-inject chapter sau
- **RAG semantic retrieval** (Large-Light-Novels): Tìm chunks tương tự thay vì exact match

**Khoảng trống toàn ecosystem**: Không ai track **xưng hô giữa nhân vật** (ai gọi ai bằng gì, speech register thay đổi theo context).

---

### Pattern 4 — Multi-Pass Pipeline

Chỉ **SpiraMirabilis** có 3-pass tự động:
1. **Translation pass** — dịch chính với entity glossary
2. **Entity classifier** — cheap model (temperature=0) lọc proper nouns vs generic nouns
3. **CJK repair pass** — phát hiện dòng còn sót ký tự CJK, dịch lại

---

### Pattern 5 — Chunking Sophistication

```
Naive (fixed chars):    Large-Light-Novels (1000 chars)
Coefficient empirical:  GPT-LN-Translator  (JP→EN=0.5, JP→FR=0.7)
Token accumulation:     bilingual_book_maker
```

**GPT-LN-Translator technique** (đáng chú ý dù tool nhỏ):
```python
LANGUAGE_COEF = { "French": 0.7, "English": 0.5 }
MAX_PROMPT_TOKEN = ceil(length_limit / (1 + COEF))
# JP→EN 4000 limit: input = ceil(4000/1.5) = 2667 tokens
```

---

## 4. Messages Array — Cấu trúc điển hình mỗi tool

### bilingual_book_maker (context enabled)
```
[system]    "" (rỗng) hoặc custom sys message
[user]      "prev paragraph 1\nprev paragraph 2"
[assistant] "prev translation 1\nprev translation 2"
[user]      "Please help me to translate,`{text}` to English..."
```

### SpiraMirabilis (chapter N)
```
[system]    Genre prompt (xianxia.txt) với {{ENTITIES_JSON}} replaced
            bởi filtered entity JSON của chapter này
[user]      "Translate the following into English: \n{chunk}"
```

### ebook-GPT-translator
```
[system]    "You are a professional literary translator..."
            + "Use the glossary below:\n- Term => Translation\n..."
[user]      BOOK_TITLE: ...
            CHAPTER_TITLE: ...
            CHAPTER_MEMORY_SUMMARY: ...
            CONSISTENCY_TERM_MEMORY:
            - term | prior source: ... | prior translation: ...
            PREVIOUS_TRANSLATED_CONTEXT:
            [Context 1 Source] ... [Context 1 Translation] ...
            CURRENT_TEXT:
            {actual text to translate}
```

### Large-Light-Novels (RAG)
```
[user]      You are translating a Japanese light novel.

            Here is some previous context:
            ['JP: ... EN: ... INFO: ...', 'JP: ... EN: ... INFO: ...', ...]

            Now translate the following text to English...
            Also extract: Main characters, Relationships, Setting, Key events

            Return Format:
            <Full Translation>
            INFO:
            <Extraction>

            {current chunk}
```

---

## 5. Gaps và Cơ hội

### Thiếu so với ecosystem
- **Auto-growing term memory** (ebook-GPT-translator): tự extract terms từ output, không cần user tạo glossary thủ công
- **Entity classifier pass** (SpiraMirabilis): cheap model lọc false-positive glossary entries tự động
- **RAG context** (Large-Light-Novels): semantic retrieval thay vì fixed rolling window
- **Genre-specific prompts** (SpiraMirabilis): xianxia/JP-LN/KR-WN có prompt khác nhau trong cùng ngôn ngữ nguồn

### Khoảng trống toàn ecosystem (không ai làm)
- Xưng hô / speech register tracking giữa nhân vật
- Character relationship graph
- Retroactive consistency correction (sửa lại chap trước khi phát hiện lỗi nhất quán ở chap sau)
