# Chỉ Mục Research

> Tổng hợp nhanh các repo và ghi chú research dùng để định hướng app-novel.

---

## Tham Khảo Bên Ngoài

| Repo | Bài Học cho app-novel |
|------|------------------------|
| [bilingual_book_maker](https://github.com/yihong0618/bilingual_book_maker) | Multi-provider support, context paragraph injection, model/key rotation để giảm rate-limit failures. |
| [TranslateBooksWithLLMs](https://github.com/hydropix/TranslateBooksWithLLMs) | Local web UI, Ollama/OpenRouter/Gemini providers, checkpoint/resume, chunking cho tài liệu dài. |
| [Turjuman](https://github.com/abdallah-ali-abdallah/turjuman-book-translator) | Pipeline nhiều mode, terminology unification, critique/revision cho chất lượng cao hơn. |

---

## Tài Liệu Research Nội Bộ

- `prompt-injection-analysis.md`: so sánh cách các tool dịch truyện inject glossary, memory, context và tổ chức multi-pass pipeline.
- `brainstorm-prompt-improvements.md`: backlog ý tưởng từ ecosystem analysis như auto-growing term memory, genre presets, CJK repair, RAG context.

---

## Bài Học Sản Phẩm Hiện Tại

- MVP giữ glossary/context injection deterministic và manual-first.
- Rolling memory dùng summary theo chapter; RAG defer sang Phase 2 cho truyện rất dài.
- Provider abstraction cần hỗ trợ cloud providers và local LLM (Ollama), tất cả qua main process.
- Khoảng trống quan trọng trong ecosystem là registry xưng hô và quan hệ theo thời gian giữa nhân vật — đây là điểm khác biệt có thể đầu tư.
