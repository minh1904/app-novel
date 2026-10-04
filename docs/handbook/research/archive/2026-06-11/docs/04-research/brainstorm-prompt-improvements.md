# Brainstorm: Cải thiện Prompt Pipeline

> Dựa trên phân tích ecosystem (`prompt-injection-analysis.md`).  
> Mỗi idea có: mô tả, nguồn cảm hứng, lợi ích dự kiến, độ phức tạp, rủi ro.

---

## Tier A — Ít code, impact cao

### A1. Empirical Chunk Coefficient per Language

**Ý tưởng**: Thay vì dùng compression_factor cố định, đo thực tế ratio output/input tokens từ N chapter đầu tiên rồi dùng ratio đó để tính `MAX_PROMPT_TOKEN` cho các chapter sau.

**Nguồn**: GPT-LN-Translator  
```python
# Cố định:
MAX_PROMPT_TOKEN = total_tokens * COMPRESSION_FACTOR

# Đề xuất:
measured_ratio = sum(output_tokens_history) / sum(input_tokens_history)
MAX_PROMPT_TOKEN = ceil(TOKEN_BUDGET / (1 + measured_ratio))
```

**Lợi ích**: Pack tối đa context vào mỗi chunk — giảm số API calls, giảm chi phí, giảm ngắt quãng ngữ cảnh  
**Độ phức tạp**: Thấp — chỉ cần track token counts, tính ratio, điều chỉnh splitter  
**Rủi ro**: Ratio dao động chapter đầu → cần minimum sample (ví dụ: đo từ chapter 3 trở đi)

---

### A2. Auto-Growing Term Memory

**Ý tưởng**: Sau khi dịch xong mỗi chapter, regex-extract proper nouns từ bản dịch → lưu `{source_term: translated_term}` → inject vào prompt chapter sau dưới dạng `CONSISTENCY_TERM_MEMORY` (bổ sung, không thay thế glossary).

**Nguồn**: ebook-GPT-translator  
```python
# Sau mỗi chapter translation:
new_terms = extract_proper_nouns(translated_text)  # regex: CamelCase, ALL_CAPS, quoted names
term_memory.update(new_terms)

# Trong user message của chapter sau:
if term_memory:
    user_prompt += "\nCONSISTENCY_TERM_MEMORY:\n"
    user_prompt += "\n".join(f"- {src} => {tgt}" for src, tgt in relevant_terms.items())
```

**Lợi ích**: Tự động build glossary từ output — giúp truyện không có glossary sẵn vẫn nhất quán thuật ngữ  
**Độ phức tạp**: Trung bình — cần extraction regex phù hợp  
**Rủi ro**: False positives từ regex (extract nhầm common nouns); cần threshold tần suất xuất hiện

---

### A3. Genre-Specific System Prompt Presets

**Ý tưởng**: Thêm sub-preset theo genre trong cùng ngôn ngữ nguồn: xianxia cultivation, isekai, manhwa action, romance, historical.

**Nguồn**: SpiraMirabilis  
```
profiles/
  korean_action.txt       — hunter/dungeon terminology
  korean_romance.txt      — speech register, 존댓말/반말 handling
  japanese_isekai.txt     — skill names, level-up UI, guild ranks
  chinese_xianxia.txt     — cultivation stages, sect names, qi terms
  chinese_historical.txt  — classical honorifics, imperial titles
```

**Lợi ích**: Prompt phù hợp genre → ít lỗi domain-specific  
**Độ phức tạp**: Thấp — chủ yếu là viết prompt text, không thay đổi code  
**Rủi ro**: Khó classify genre tự động; để user chọn thủ công trong project settings

---

### A4. Labeled Section User Prompt

**Ý tưởng**: Thay vì chỉ truyền raw text vào user turn, wrap bằng labeled sections.

**Nguồn**: ebook-GPT-translator  
```
CHAPTER: 3
BOOK_TITLE: The Return of the Sword King

PREVIOUS_CONTEXT:
[Context 1] ... [Translation 1] ...

CURRENT_TEXT:
[PART 1/2]
{content}
```

**Lợi ích**: Ranh giới rõ ràng → AI ít bị nhầm lẫn giữa "đọc để hiểu" vs "dịch nội dung này"  
**Độ phức tạp**: Thấp — thay đổi format string  
**Rủi ro**: Một số model có thể phản ứng khác nhau với label; cần A/B test

---

## Tier B — Impact cao, cần thiết kế kỹ

### B1. Entity Classifier Pass (Second-Pass Glossary Cleanup)

**Ý tưởng**: Sau khi auto-extract glossary từ chapter, gọi một cheap model (temperature=0) để lọc: "trong danh sách này, cái nào là proper noun thực sự?"

**Nguồn**: SpiraMirabilis  
```python
# Sau extraction:
candidates = auto_extracted_glossary

classifier_response = cheap_model.chat([
    {"role": "system", "content": CLASSIFIER_PROMPT},
    {"role": "user",   "content": json.dumps(candidates)}
])
# classifier_response: ["张三", "诛仙剑", ...] — chỉ proper nouns

glossary = {k: v for k, v in candidates.items() if k in classifier_response}
```

**Lợi ích**: Giảm false positives trong auto-generated glossary → prompt ngắn hơn  
**Độ phức tạp**: Trung bình — cần thêm 1 API call per glossary extraction  
**Rủi ro**: Chi phí thêm 1 call; kết quả phụ thuộc model chọn

---

### B2. CJK Residual Repair Pass

**Ý tưởng**: Sau khi dịch xong chapter, scan output tìm dòng còn chứa ký tự CJK. Gom lại, gọi 1 API call để dịch fragments còn sót.

**Nguồn**: SpiraMirabilis  
```python
import re
CJK_PATTERN = re.compile(r'[一-鿿぀-ゟ가-힯]')

residual_lines = [
    (i, line) for i, line in enumerate(output_lines)
    if CJK_PATTERN.search(line)
    and not is_glossary_marker(line)
]

if residual_lines:
    repaired = repair_model.translate_fragments(residual_lines)
    for i, repaired_line in repaired:
        output_lines[i] = repaired_line
```

**Lợi ích**: Tự động catch các line mà AI không dịch; targeted repair thay vì retry toàn chunk  
**Độ phức tạp**: Trung bình  
**Rủi ro**: Có thể flag nhầm intentional CJK (title display); cần whitelist

---

### B3. Relationship & Honorific Context Tracking

**Ý tưởng**: Build structured "relationship context" song song với glossary. Track: ai gọi ai bằng gì, mức độ thân thiết, speech register thay đổi theo chapter.

**Không có tool nào trong ecosystem làm điều này hiện tại** — đây là khoảng trống lớn nhất.

```json
{
  "강지훈": {
    "calls": {
      "박민준": {"form": "야 민준아", "register": "informal", "chapter_first": 1},
      "이소라": {"form": "소라 씨", "register": "polite", "chapter_first": 2}
    }
  }
}
```

Inject vào system prompt:
```
CHARACTER SPEECH CONTEXT:
- Jihoon → Minjun: informal (야 민준아)
- Jihoon → Sora: polite (-씨 suffix)
- Sora → Jihoon: neutral (full name only)
```

**Lợi ích**: Nhất quán speech register qua toàn bộ truyện — gap lớn nhất của cả ecosystem  
**Độ phức tạp**: Cao — cần extraction logic, UI để review/correct  
**Rủi ro**: Auto-extraction honorifics sẽ có nhiều errors; user cần có khả năng edit

---

### B4. RAG Context cho Truyện Dài

**Ý tưởng**: Thay vì rolling window N chapter (linear), dùng semantic search để tìm chapters trước có nội dung liên quan.

**Nguồn**: Large-Light-Novels  
```python
# Setup:
db = VectorDB("./translation_memory")

# Sau mỗi chapter dịch xong:
db.store(chapter_num, source_text, translated_text, summary)

# Trước khi dịch chapter mới:
related = db.query(current_source, k=3)
# Inject related chapters thay vì chỉ N chapter liền trước
```

**Lợi ích**: Chapter 400 tham chiếu lại nhân vật/sự kiện từ chapter 50 → RAG tìm đúng context  
**Độ phức tạp**: Cao — dependency mới (vector DB, embeddings), index management  
**Rủi ro**: Overhead storage; embedding quality ảnh hưởng recall accuracy

---

## Tier C — Thử Nghiệm / Dài Hạn

### C1. Adaptive Prompt Tuning

**Ý tưởng**: Theo dõi retry rate, artifact rate, ratio anomaly per model per genre. Tự động điều chỉnh prompt instructions cho combinations có chất lượng kém.

**Lợi ích**: Self-improving pipeline không cần user intervention  
**Độ phức tạp**: Rất cao — cần feedback loop, metric collection, A/B framework  

---

### C2. Cross-Chapter Retroactive Correction

**Ý tưởng**: Khi phát hiện inconsistency ở chapter N (tên dịch khác chapter N-5), flag và suggest re-translate các đoạn liên quan trong chapters cũ.

**Lợi ích**: Consistency toàn bộ truyện, không chỉ từ điểm hiện tại trở đi  
**Độ phức tạp**: Rất cao — cần change tracking, selective re-translation  

---

### C3. Multi-Model Ensemble cho Difficult Passages

**Ý tưởng**: Với passages có retry count cao hoặc ratio anomaly, gửi đến 2-3 models và dùng voting/selection để chọn output tốt nhất.

**Lợi ích**: Giảm failure rate cho nội dung khó (archaic language, complex metaphors)  
**Độ phức tạp**: Cao — chi phí tăng đáng kể, cần scoring function  

---

## Lộ Trình Ưu Tiên

```
Now (ít code, impact rõ):
  A1 — Empirical chunk coefficient
  A3 — Genre-specific prompt presets

Next (cần thiết kế):
  A2 — Auto-growing term memory
  A4 — Labeled section user prompt
  B2 — CJK residual repair pass

Later (phức tạp nhưng high-value):
  B1 — Entity classifier pass
  B3 — Relationship/honorific tracking
  B4 — RAG context cho truyện dài
```

---

## Câu hỏi mở cần quyết định

1. **Term memory vs glossary**: Nếu có auto-growing term memory (A2), khi nào nên promote entry lên glossary chính thức? Threshold tần suất bao nhiêu?

2. **RAG vs rolling window**: RAG phức tạp hơn nhưng tốt hơn cho truyện dài. Có nên làm RAG là tùy chọn (opt-in) thay vì thay thế hoàn toàn?

3. **Relationship tracking**: Auto-extract hay user-defined hoàn toàn? Auto sẽ có noise; manual sẽ ít được dùng.

4. **Second-pass cost**: Entity classifier (B1) và CJK repair (B2) đều thêm API calls. Nên bundle thành 1 "quality pass" hay để độc lập?

5. **Cheap model selection**: SpiraMirabilis dùng `--cleaning-model` riêng. app-novel có nên thêm `QUALITY_PASS_MODEL` setting để user chọn model rẻ cho classifier/repair?
