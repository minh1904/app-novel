# Scope bản đầu — Mira

Cập nhật: **2026-09-29** (v0.2, viết lại theo [ADR-002](../decisions/0002-ai-first-translation.md)) · Trạng thái: **thứ tự ưu tiên đã chốt** theo [roadmap](../delivery/roadmap.md); chi tiết hành vi từng hạng mục cần spec riêng trước khi làm. Chủ trì: chủ sản phẩm.

Trang này trả lời câu hỏi **làm gì trước, làm gì sau, và cái gì chưa làm**. Căn cứ đã chốt nằm ở [quyết định hiện hành](decisions.md); lý do chọn ở [nghiên cứu](../research/feature-map.md).

## 1. Bản đầu giải bài toán gì

Dịch giả truyện dài (Anh/Trung/Nhật → Việt) muốn **AI dịch từ raw theo chương, rồi soát và sửa** trong một workspace trên máy, giữ tên riêng, xưng hô và văn phong nhất quán xuyên chương, và mang bản dịch đi đăng. Mọi thứ trừ bước gọi AI chạy offline.

Vòng hoàn chỉnh:

```text
Tạo tác phẩm → nhập raw chương → AI dịch theo segment → soát ở Từng câu ⇄ sửa ở Toàn văn
            → kiểm tra nhất quán → xuất TXT/MD → đóng/mở lại, backup/restore
```

## 2. Nguyên tắc ưu tiên

1. **Không mất chữ** đứng trên mọi tính năng: dữ liệu bền trước, tính năng sau.
2. **Một chương xuyên suốt trước nhiều chương**; nhiều chương trước nhiều nguồn/văn phong.
3. **Giao diện xem được sớm nhưng trên dữ liệu thật**; AI thật đến sau provider giả lập.
4. Một hạng mục chỉ vào mốc khi mốc trước đã qua nghiệm thu.

## 3. Bảng ưu tiên

Mức: **S0** nền bắt buộc · **S1** lát cắt một chương · **S2** AI thật và nhất quán · **S3** khác biệt nâng cao · **Sau** ngoài bản đầu.

### S0 — Nền dữ liệu (M0)

| ID | Hạng mục | Làm tối thiểu | Chưa làm | MIR |
| --- | --- | --- | --- | --- |
| S0.1 | Kho lưu trữ | `library.db` + một file SQLite mỗi tác phẩm; WAL; transaction trong main process; IPC có kiểu | Đồng bộ, tài khoản | 05 |
| S0.2 | Mô hình nội dung | Tác phẩm → chương → văn bản theo bên (raw/dịch) có revision; segment có ID; link n:m | Nhiều nguồn raw (S3) | 02, 03 |
| S0.3 | Thư viện thật | Tạo/đổi tên/lưu trữ tác phẩm, danh sách chương, “tiếp tục chương gần nhất” đọc từ kho | Tìm/lọc nâng cao | 01 |
| S0.4 | Provider giả lập | Interface provider + provider mock offline (độ trễ, lỗi giả lập) | Provider thật (S2) | 09 |
| S0.5 | Backup/restore một tác phẩm | Xuất một file tác phẩm, mở trên profile sạch; từ chối an toàn gói lỗi | Backup toàn thư viện theo lịch | 05 |

### S1 — Một chương AI xuyên suốt (M1)

| ID | Hạng mục | Làm tối thiểu | Chưa làm | MIR |
| --- | --- | --- | --- | --- |
| S1.1 | Nhập raw | Dán hoặc nhập một tệp TXT/MD cho một chương; preview; chuẩn hóa newline/encoding theo spec | Nhập cả tập, EPUB | 06 |
| S1.2 | Chia segment | Tách câu theo ngôn ngữ (sentencex cho ZH/JA; ICU + viết tắt cho EN/VI); giữ ranh giới đoạn/thoại | Người dùng chỉnh quy tắc tách | 03 |
| S1.3 | Job dịch AI | Gửi theo đoạn có ID, kiểm tra ID khớp, thử lại phần lỗi, lưu từng segment, dừng/tiếp tục, tiến trình | Chạy nhiều chương song song | 09 |
| S1.4 | Mode Từng câu | Hàng nguồn/dịch, sửa hàng, trạng thái Chưa dịch / AI đã dịch / Đã soát / Cần kiểm tra, nhảy hàng tiếp | Gộp/tách hàng (S2) | 02, 07 |
| S1.5 | Mode Toàn văn | Hai pane độc lập; bản dịch sửa bằng CodeMirror (Source); Reading view; undo/redo | Live Preview inline | 02 |
| S1.6 | Chuyển mode an toàn | Hai mode chung một văn bản và một undo stack; sửa ở Toàn văn đánh dấu segment bị chạm là Cần kiểm tra | Neo lại sau khi sửa tệp ngoài app | 02, 03 |
| S1.7 | Autosave + phục hồi | Lưu bền trước khi báo đã lưu; phục hồi sau đóng cưỡng bức; snapshot trước job AI | Lịch sử phiên bản có giao diện | 05 |
| S1.8 | Xuất | TXT/MD bản dịch của chương | Kiểu lời thoại, xuất nhiều chương (S2) | 06 |

### S2 — AI thật và nhất quán (M2)

| ID | Hạng mục | Làm tối thiểu | Chưa làm | MIR |
| --- | --- | --- | --- | --- |
| S2.1 | Provider thật | Adapter tương thích OpenAI (OpenRouter, DeepSeek, Ollama/LM Studio), Anthropic, Gemini; OAuth PKCE OpenRouter; khóa lưu bằng `safeStorage` | OAuth thuê bao (bị cấm) | 09 |
| S2.2 | Chi phí và giới hạn | Ước lượng token/chi phí trước khi chạy; ghi usage thực tế; backoff theo `Retry-After` | Ngân sách theo tháng | 09 |
| S2.3 | Glossary | Tạo/sửa/tìm theo tác phẩm; import `Names.txt`/`VietPhrase.txt`; chỉ gửi mục xuất hiện trong đoạn | AI tự trích thuật ngữ (S3) | 04 |
| S2.4 | Ma trận xưng hô — xem | Màn xem/sửa tay: người nói, người nghe, cách xưng, từ chương nào; gửi vào prompt | AI đề xuất cập nhật (S3) | 14 |
| S2.5 | QA nhất quán | Cảnh báo: tên sai glossary, xưng hô lệch ma trận, segment trống, sót chữ nguồn | Tự sửa | 04, 14 |
| S2.6 | Nhiều chương | Danh sách chương, sắp xếp, dịch hàng loạt có hàng đợi | Tự nhận ranh giới chương khi nhập | 01 |
| S2.7 | Gộp/tách segment | Gộp/tách ở Từng câu, undo được | — | 03 |
| S2.8 | Sửa lỗi raw | Thao tác riêng có lịch sử; link bị ảnh hưởng thành Cần kiểm tra | — | 08 |
| S2.9 | Nguồn gốc bản dịch | Ghi tay/AI/nhập theo segment và tóm tắt theo chương | — | 09 |
| S2.10 | Xuất để đăng | Xuất “dán sạch” nhiều chương, tiêu đề chương, chọn kiểu lời thoại (gạch đầu dòng / ngoặc kép) | EPUB/DOCX | 06 |

### S3 — Khác biệt nâng cao (M3)

| ID | Hạng mục | Làm tối thiểu | MIR |
| --- | --- | --- | --- |
| S3.1 | Nhiều nguồn raw | Thêm nguồn phụ, người dùng chọn nguồn chính; ghép chương N:M có xác nhận; nguồn phụ gửi AI dạng khối tham khảo | 13 |
| S3.2 | Văn phong từ bản dịch cũ | Nhập bản cũ, căn chỉnh với raw (Bậc 0), truy xuất cặp câu tương tự làm ví dụ; bản hướng dẫn văn phong người dùng duyệt | 15 |
| S3.3 | Xưng hô tự cập nhật | AI đề xuất thay đổi ma trận sau mỗi chương; người dùng duyệt | 14 |
| S3.4 | Glossary tự trích | AI phát hiện thuật ngữ/nhân vật mới mỗi chương; duyệt trước lô lớn | 04 |
| S3.5 | Căn chỉnh bản dịch có sẵn | Nhập bản dịch toàn văn không phải do Mira tạo, đề xuất liên kết, hàng đợi kiểm tra; embedding tùy chọn | 03 |

### Sau bản đầu

Tài khoản và đồng bộ; cộng tác; web/macOS/mobile; EPUB/DOCX/PDF/OCR; crawler/uploader nền tảng; Live Preview inline; translation memory quy mô CAT; dịch docs/MDX nhiều tệp. Đây là hoãn, không phải “không bao giờ làm”.

## 4. Luồng phải chạy trọn trước khi thử với người dùng

1. Tạo tác phẩm, chọn cặp ngôn ngữ, nhập raw chương, xem trước.
2. Chạy AI dịch chương (mock ở M1, provider thật ở M2); ngắt mạng giữa chừng rồi tiếp tục đúng chỗ.
3. Soát ở Từng câu, sửa vài hàng; sang Toàn văn viết lại một đoạn; quay lại thấy đúng nội dung, vùng bị viết lại hiện Cần kiểm tra.
4. Glossary/xưng hô được áp dụng; QA bắt lỗi cài sẵn.
5. Xuất chương; đóng app, mở lại; backup, restore trên profile sạch; đọc/sửa/xuất khi offline.

## 5. Nghiệm thu bản đầu

- Không mất hoặc nhân đôi nội dung đã báo lưu, qua đóng/mở, crash, backup/restore và chuyển mode.
- Bản dịch AI không bao giờ gắn sai segment âm thầm; phản hồi hỏng ID được thử lại hoặc đánh dấu.
- AI không ghi đè hàng người dùng đã sửa khi dịch lại; phải so sánh để chọn.
- Người dùng phân biệt được **Chưa dịch**, **AI đã dịch**, **Đã soát** và **Cần kiểm tra liên kết**; không gộp thành một phần trăm.
- Đọc, sửa, lưu, nhập/xuất, backup chạy không cần mạng.
- Bộ bài chi tiết ở [kế hoạch kiểm chứng](../delivery/validation.md).

## 6. Spec cần viết theo thứ tự

1. **Kho dữ liệu + IPC** (S0.1–S0.3, S0.5) — kèm smoke-test `node:sqlite`.
2. **Provider interface + định dạng gửi/nhận segment + job dịch** (S0.4, S1.3).
3. **Nhập raw và chia segment** (S1.1–S1.2) — encoding, newline, Markdown hỗ trợ.
4. **Editor hai mode + đồng bộ + undo** (S1.4–S1.6).
5. **Glossary và ma trận xưng hô** (S2.3–S2.5).

## 7. Định hướng dịch tài liệu (sau bản đầu)

Mô hình dữ liệu nên giữ đường sang **project → document → content blocks** để hỗ trợ docs về sau: nhãn UI “tác phẩm/chương” không buộc tên trong schema; khi hỗ trợ Markdown docs phải giữ link, hình, code fence, inline code, placeholder và frontmatter, không đưa phần không cần dịch vào segment. MDX và cú pháp framework docs cần quyết định riêng.

Tham khảo luồng: [Smartcat editor](https://help.smartcat.com/editor-functionalities-overview/), [Crowdin editor](https://support.crowdin.com/online-editor/), [memoQ nhập bản đã review](https://docs.memoq.com/12-2/en/Workspace/import-reviewed-document.html), [Obsidian views](https://obsidian.md/help/edit-and-read).

---

[Mục lục handbook](../README.md)
