# Công cụ dịch truyện bằng AI, nhiều nguồn và văn phong

Ngày đọc: **2026-09-29** · Trạng thái: Quan sát + đề xuất · Chủ trì: research/engineering · Liên quan: MIR-09, MIR-13, MIR-14, MIR-15, [ADR-002](../decisions/0002-ai-first-translation.md)

## Câu hỏi và phương pháp

Các công cụ dịch truyện/game bằng AI hiện có chia đoạn, giữ ánh xạ dòng, đưa glossary/nhân vật vào prompt, xử lý lỗi và QA thế nào; nhiều nguồn và văn phong bản cũ có tiền lệ không. Đọc README, wiki và một phần mã nguồn; **chưa chạy thử** công cụ nào. Chỉ học ý tưởng: mã (A)GPL không được sao chép vào Mira.

## Quan sát: công cụ hiện có

| Công cụ | Chia đoạn và giữ ánh xạ | Glossary / nhân vật | Điểm đáng học | Giấy phép |
| --- | --- | --- | --- | --- |
| [GalTransl](https://github.com/GalTransl/GalTransl) | Lô đánh số; định dạng JSONLine `{"id","name","src"}` → model trả cùng `id` kèm `dst`; có biến thể TSV | Từ điển `src->dst #ghi chú` chèn vào khối `[Glossary]`; từ điển thay thế trước/sau dịch | Cache dịch tự tiếp tục; ghi engine từng bước; bộ tìm lỗi: sót chữ Nhật, mất/thừa xuống dòng, lặp từ, không theo từ điển, sai ngôn ngữ | GPL-3.0 |
| [AiNiee](https://github.com/NEKOparapa/AiNiee) | Chia theo số dòng, chạy nhiều luồng (định dạng trả về chưa xác minh) | Glossary, danh sách không dịch, **bảng nhân vật** (tên gốc, tên dịch, giới tính, tuổi, mô tả) — chỉ gửi mục xuất hiện trong đoạn | Chế độ hai lượt: trích thông tin rồi dịch; xoay vòng nhiều key; kiểm tra sót ngôn ngữ nguồn theo khối | AGPL-3.0, phi thương mại |
| [LinguaGacha](https://github.com/neavo/LinguaGacha/blob/main/README_EN.md) | Chưa tài liệu hóa chi tiết | Sinh glossary một chạm (KeywordGacha trích thuật ngữ) | Trích thuật ngữ → dịch → tự soát; OpenAI/Google/Anthropic/Sakura | Cần ghi công; thương mại cần xin phép (tên license chưa xác minh) |
| [auto-novel](https://github.com/auto-novel/auto-novel) | Đoạn ~1.500 ký tự / 30 dòng (đọc từ mã, chưa xác minh); gửi kèm các đoạn trước làm ngữ cảnh | Glossary kèm ngữ cảnh | Nhiều translator; logic kiểm số dòng chưa đọc | GPL-3.0 |
| [SakuraLLM](https://github.com/SakuraLLM/SakuraLLM) | Mẫu chat Qwen; glossary `原文->译文 #注释` đầu tin nhắn | — | Model local chỉ Nhật → Trung | Trọng số **CC BY-NC-SA 4.0** |
| [OpenNovel](https://www.opennovel.co/docs/auto-translate) (thương mại) | Không công bố | AI dựng glossary (nhân vật, thuật ngữ, tổ chức, kỹ năng), **người dùng duyệt trước khi dịch**; giới tính nhân vật; phát hiện thuật ngữ mới mỗi chương ([glossary](https://www.opennovel.co/docs/glossary)) | Chạy nền; chương lỗi được liệt kê để dịch lại | Nguồn đóng |

Chưa thấy công cụ nào **ước lượng chi phí trước khi chạy** (chưa đọc hết mã để khẳng định).

## Quan sát: nhiều nguồn

- CAT tool không hỗ trợ nhiều nguồn như một khái niệm gốc: memoQ TM là song ngữ, nguồn khác chỉ là tệp/TM tham khảo ([memoQ TM](https://docs.memoq.com/current/en/Concepts/concepts-translation-memories.html)). Chưa xác minh tính năng pivot chính thức của Trados/memoQ.
- Nghiên cứu LLM: đưa cùng nội dung ở nhiều ngôn ngữ vào prompt cải thiện chất lượng dịch, lợi ích lớn hơn với model mạnh và **tăng theo chất lượng bản phụ** ([Parallel Multilingual Input, EMNLP 2024](https://aclanthology.org/2024.emnlp-main.396.pdf)); lợi ích rõ nhất khi cặp ngôn ngữ xa ([2503.07195](https://awesomepapers.io/speech-audio/papers/2503.07195)). Pivot qua tiếng Anh có ích nhưng đôi khi nhỏ ([2505.14553](https://arxiv.org/html/2505.14553v2), [2311.07439](https://arxiv.org/abs/2311.07439)).
- **Ghép chương giữa các nguồn:** không tìm thấy công cụ nào giải quyết.

## Quan sát: văn phong từ bản dịch cũ

Đưa các cặp câu tương tự đã duyệt từ bộ nhớ dịch vào prompt giúp LLM bám văn phong và miền nội dung; thêm glossary còn tốt hơn ([Moslem et al., 2023](https://arxiv.org/abs/2301.13294)). Công cụ truyện ở trên chỉ có ô prompt “văn phong/bối cảnh” tĩnh, không truy xuất ví dụ theo độ tương tự.

## Quan sát: OpenRouter OAuth PKCE

Luồng chính thức ([tài liệu](https://openrouter.ai/docs/use-cases/oauth-pkce)): mở `https://openrouter.ai/auth?callback_url=…&code_challenge=…&code_challenge_method=S256`; callback localhost chấp nhận mọi cổng; nhận `code`, POST tới `https://openrouter.ai/api/v1/auth/keys` với `code_verifier` để lấy **API key do người dùng kiểm soát**. Mira lưu key này như key thường.

## Đề xuất cho pipeline Mira

1. **Định dạng gửi/nhận có ID:** JSON lines `{"id","src"}` → `{"id","dst"}`, dùng structured output/JSON schema khi provider hỗ trợ; model local dùng dòng đánh số `[n] …`.
2. **Kích thước:** ~1–2k token nguồn, chỉ cắt ở ranh giới đoạn; kèm 2–5 segment trước (nguồn + bản dịch đã duyệt) làm ngữ cảnh chỉ đọc.
3. **Kiểm tra theo thứ tự:** parse → tập ID khớp chính xác (không thiếu/thừa/trùng) → không `dst` rỗng → không sót chữ nguồn (kana/Hán/Latin) quá ngưỡng → tỷ lệ độ dài hợp lý → glossary (cảnh báo) → giữ placeholder/Markdown.
4. **Thử lại:** chỉ gửi lại ID lỗi, 2–3 lần; rồi chia đôi đoạn; cuối cùng đánh dấu segment “cần kiểm tra”, không làm hỏng cả chương.
5. **Giới hạn tốc độ:** backoff theo `Retry-After`; cấu hình đồng thời/RPM/TPM theo provider.
6. **Tiếp tục sau lỗi:** lưu từng segment ngay khi qua kiểm tra, kèm model, phiên bản prompt/glossary, token dùng. Đổi glossary sau đó chỉ đánh dấu segment chịu ảnh hưởng.
7. **Ước lượng chi phí** trước khi chạy: token nguồn × (1 + tỷ lệ đầu ra ~1,2–1,5 cho tiếng Việt, cần đo) + overhead prompt; ghi `usage` thực tế sau khi chạy. Đây có thể là điểm khác biệt.
8. **Glossary/nhân vật:** chỉ gửi mục xuất hiện trong đoạn; mục nhân vật có giới tính và cặp xưng hô tiếng Việt; **duyệt glossary trước lô lớn**; bước “phát hiện thuật ngữ mới” mỗi chương.
9. **Nhiều nguồn:** nguồn chính quyết định segment; nguồn phụ gửi kèm **dạng khối theo dải đoạn** có nhãn “tham khảo”, không ghép từng dòng. Ghép chương giữa nguồn theo số/tiêu đề rồi độ dài và tên riêng trong glossary, cho phép N:M, người dùng xác nhận. Rủi ro: lỗi và chỗ cắt của bản phụ lan sang bản dịch.
10. **Văn phong:** căn chỉnh bản cũ với raw → truy xuất 3–8 cặp tương tự (embedding hoặc BM25) làm ví dụ; AI tóm tắt một bản hướng dẫn văn phong để người dùng duyệt; khởi tạo ma trận xưng hô từ bản cũ.
11. **Giấy phép:** không sao chép mã GalTransl/AiNiee/auto-novel; trọng số Sakura phi thương mại — để người dùng tự tải nếu muốn dùng.

## Bước kiểm chứng

Spike với 2–3 provider (một có structured output, một model local) trên fixture: đo tỷ lệ phản hồi hỏng ID, token thực tế/ước lượng, và chất lượng có/không nguồn phụ, có/không ví dụ văn phong. Chưa khóa kích thước đoạn trước khi có số liệu.

---

[Mục lục handbook](../README.md)
