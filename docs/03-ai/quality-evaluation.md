# Quality Evaluation

> Rubric và workflow kiểm tra chất lượng bản dịch. MVP ưu tiên deterministic checks để giảm chi phí LLM và tránh auto-fix rủi ro.

---

## MQM-Lite Rubric

Rubric rút gọn từ MQM/LQA, tập trung vào lỗi quan trọng nhất với truyện dịch sang tiếng Việt.

| Category | Mô tả | Ví dụ |
|----------|-------|-------|
| `terminology` | Sai hoặc không nhất quán glossary/thuật ngữ/tên riêng | `각성` trong glossary là `Giác Ngộ` nhưng output dùng `Thức Tỉnh` |
| `speech_register` | Sai xưng hô, sai mức thân mật/trang trọng, sai quan hệ A→B | Hai đồng đội thân thiết vẫn dùng `anh/tôi` khi registry yêu cầu `mày/tao` |
| `accuracy` | Thêm, bỏ, hoặc đổi nghĩa so với source | Source có nhân vật chết, output nói chỉ bị thương |
| `fluency` | Tiếng Việt gượng, lỗi ngữ pháp, câu khó đọc | Câu dịch đúng nghĩa nhưng không tự nhiên |
| `style_genre` | Sai văn phong thể loại | Xianxia không dùng cổ phong, LitRPG mất format status screen |
| `format` | Mất xuống dòng, mất markdown/status UI/dialogue markers | `[Skill: Shadow Step]` bị xóa hoặc đổi format |

---

## Severity Levels

| Severity | Khi dùng | Ảnh hưởng trạng thái chapter |
|----------|----------|------------------------------|
| `minor` | Lỗi nhỏ, không làm sai nghĩa chính | Chapter vẫn có thể `done` |
| `major` | Ảnh hưởng hiểu nghĩa, consistency, hoặc trải nghiệm đọc | Chapter chuyển `flagged` |
| `critical` | Sai nghiêm trọng: mất đoạn lớn, hallucination, source không dịch, nhầm nhân vật chính | Chapter chuyển `flagged`, cần review trước khi xem là hoàn tất |

MVP rule: nếu có bất kỳ `major` hoặc `critical` issue đang `open`, chapter status là `flagged`; nếu không, chapter status là `done`.

---

## MVP Quality Gates

Các gate này chạy sau khi translation output được ghép và lưu thành phiên bản chapter.

| Gate | Category | Detector | MVP behavior |
|------|----------|----------|--------------|
| Glossary compliance | `terminology` | Match source terms xuất hiện trong chapter với expected Vietnamese terms trong output | Tạo issue nếu term bắt buộc missing hoặc dùng variant sai đã biết |
| Untranslated residual | `accuracy` | Regex/script detection cho CJK/Hangul/Kana còn lại trong output | `major` nếu còn nhiều source text, `minor` nếu chỉ là tên riêng hợp lệ |
| Speech mapping consistency | `speech_register` | Check cặp speaker/listener có registry và output có dấu hiệu lệch đại từ rõ ràng | Tạo issue khi mapping đủ chắc; nếu không chắc thì bỏ qua |
| Length anomaly | `accuracy` | So output/source length ratio với default threshold theo language | `critical` nếu output quá ngắn, `major` nếu lệch mạnh |
| Format preservation | `format` | So marker/status block/line break quan trọng trước và sau dịch | Tạo issue nếu mất marker hoặc block format |

MVP không tự sửa bản dịch. Gate chỉ tạo issue để user xem, bỏ qua, hoặc sửa thủ công bằng cách dịch lại.

---

## Reviewer Issue Lifecycle

```text
open -> reviewed -> resolved
               \-> ignored
```

| Status | Ý nghĩa |
|--------|---------|
| `open` | Detector hoặc reviewer vừa tạo issue, chưa xử lý |
| `reviewed` | User đã xem và xác nhận issue là thật |
| `resolved` | Issue đã được xử lý bằng retranslation, restore, hoặc edit |
| `ignored` | User xác nhận đây là false positive hoặc acceptable |

Issue do detector tạo phải được xem là suggestion, không phải kết luận tuyệt đối.

---

## Quality Scores

| Score | Công thức gợi ý | Dùng cho |
|-------|-----------------|----------|
| Glossary compliance | `matched_required_terms / source_required_terms` | Đo consistency thuật ngữ |
| Speech mapping consistency | `valid_speech_mapping_checks / applicable_speech_mapping_checks` | Đo xưng hô theo registry |
| Residual source count | Số cụm source-language còn lại | Bắt lỗi chưa dịch |
| Issue count by severity | Count `open` issues theo severity | Quyết định `done` vs `flagged` |

Không dùng COMET/BLEU làm acceptance metric cho MVP vì thiếu reference translation và không bắt tốt lỗi xưng hô/genre.

---

## Phase 2+ Ideas

- **LLM reviewer**: cheap model tạo suggested issues theo MQM-lite JSON, human review là source of truth.
- **Golden regression set**: chọn 3-5 chapter đã duyệt để chạy lại khi đổi prompt/model/chunker.
- **Translation memory**: lưu source-target segments đã được user approve để inject khi gặp đoạn tương tự.
- **COMET or reference metrics**: optional benchmark khi có human reference, không dùng làm gate bắt buộc.
- **Translate-then-refine**: chỉ gọi refinement pass khi glossary/format gate fail, tránh rewrite toàn bộ chapter.
