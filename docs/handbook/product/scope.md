# Scope bản đầu — Mira

Cập nhật: **2026-10-03** (v0.3, theo [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md); trước đó v0.2 theo [ADR-002](../decisions/0002-ai-first-translation.md)) · Trạng thái: **thứ tự ưu tiên đã chốt**, nay đi theo **module** ([lộ trình](../delivery/roadmap.md)); chi tiết hành vi từng hạng mục cần spec riêng trước khi làm. Chủ trì: chủ sản phẩm.

Trang này trả lời câu hỏi **làm gì trước, làm gì sau, và cái gì chưa làm**. Căn cứ đã chốt nằm ở [quyết định hiện hành](decisions.md); lý do chọn ở [nghiên cứu](../research/feature-map.md). Repo hiện tại là **bản MVP để thử nghiệm**: nhiều hạng mục dưới đây đã có bản MVP, nhưng chỉ tính là xong khi module tương ứng được làm lại hoàn chỉnh (spec, test, nghiệm thu). Hiện trạng từng phần ở [current-state](../engineering/current-state.md).

## 1. Bản đầu giải bài toán gì

Dịch giả truyện dài (Anh/Trung/Nhật → Việt) muốn **AI dịch từ raw theo chương, rồi cùng AI duyệt và sửa ngay trong editor** trên máy, giữ tên riêng, xưng hô và văn phong nhất quán xuyên chương, và mang bản dịch đi đăng. Mọi thứ trừ bước gọi AI chạy offline.

Vòng hoàn chỉnh:

```text
Tạo tác phẩm → nhập raw chương → AI dịch theo đoạn → đề xuất chờ duyệt
            → duyệt từng khối ngay trong pane, hỏi/sửa cùng AI → kiểm tra nhất quán
            → xuất TXT/MD → đóng/mở lại, backup/restore
```

## 2. Nguyên tắc ưu tiên

1. **Không mất chữ** đứng trên mọi tính năng: dữ liệu bền trước, tính năng sau.
2. **Một chương xuyên suốt trước nhiều chương**; nhiều chương trước nhiều nguồn/văn phong.
3. **Giao diện xem được sớm nhưng trên dữ liệu thật**; AI thật đến sau provider giả lập.
4. **AI chỉ đề xuất, người ghi**, kể cả pane trống ([quyết định Module Đề xuất](../../modules/proposals/decisions.md)); đơn vị là chương, bên trong là đoạn (ADR-005).
5. **Làm hoàn chỉnh từng module**: một module chỉ xong khi qua nghiệm thu, và chỉ sang module kế khi module trước xong.

## 3. Bảng ưu tiên

Mức: **S0** nền bắt buộc · **S1** lát cắt một chương · **S2** AI thật và nhất quán · **S3** khác biệt nâng cao · **Sau** ngoài bản đầu. Hạng mục gạch bỏ đã bị ADR-005 hủy; mã S-ID giữ nguyên để các trang khác không trỏ sai.

### S0 — Nền dữ liệu

| ID | Hạng mục | Làm tối thiểu | Chưa làm | MIR |
| --- | --- | --- | --- | --- |
| S0.1 | Kho lưu trữ | `library.db` + một file SQLite mỗi tác phẩm; WAL; transaction trong main process; IPC có kiểu | Đồng bộ, tài khoản | 05 |
| S0.2 | Mô hình nội dung | Tác phẩm → chương → văn bản theo bên (raw/dịch) có revision; **dấu AI, đề xuất, snapshot** (schema v6); **không segment, không liên kết** | Nhiều nguồn raw (S3) | 02 |
| S0.3 | Thư viện thật | Tạo/đổi tên/lưu trữ tác phẩm, danh sách chương, “tiếp tục chương gần nhất” đọc từ kho | Tìm/lọc nâng cao | 01 |
| S0.4 | Provider giả lập | Interface provider + provider mock offline (độ trễ, lỗi giả lập) | — | 09 |
| S0.5 | Backup/restore một tác phẩm | Xuất một file tác phẩm, mở trên profile sạch; từ chối an toàn gói lỗi | Backup toàn thư viện theo lịch | 05 |

### S1 — Một chương AI xuyên suốt

| ID | Hạng mục | Làm tối thiểu | Chưa làm | MIR |
| --- | --- | --- | --- | --- |
| S1.1 | Nhập raw | Dán hoặc nhập một tệp TXT/MD cho một chương; preview; chuẩn hóa newline/encoding theo spec | Nhập cả tập, EPUB | 06 |
| S1.2 | Chuẩn hóa và định nghĩa đoạn | **Đoạn = mỗi dòng không trống**, kiểm trên fixture ZH/JA/EN; nhập raw chỉ chuẩn hóa và lưu. Câu chỉ được cắt tạm để chia lô gửi AI (`Intl.Segmenter`; sentencex cho ZH/JA đã cân nhắc) | Người dùng chỉnh quy tắc tách | 03 |
| S1.3 | Tác vụ dịch AI | Gửi theo đoạn có ID tạm `[n]`, kiểm tra ID khớp, thử lại phần lỗi, lưu bền theo lô, dừng/tiếp tục, tiến trình; kết quả thành đề xuất chờ duyệt | Chạy nhiều chương song song | 09 |
| ~~S1.4~~ | ~~Mode Từng câu~~ | **Đã bỏ (ADR-005)** | — | ~~02, 07~~ |
| S1.5 | Editor Toàn văn | Hai pane độc lập; bản dịch sửa bằng CodeMirror (Source, Live Preview nhẹ, nhúng ảnh); undo/redo | Live Preview đầy đủ kiểu Obsidian; Reading view (đã bị gỡ khỏi giao diện, chưa có quyết định về việc làm lại) | 02 |
| ~~S1.6~~ | ~~Chuyển mode an toàn~~ | **Đã bỏ (ADR-005):** không còn hai mode | — | ~~02, 03~~ |
| S1.7 | Autosave + phục hồi | Lưu bền trước khi báo đã lưu; phục hồi sau đóng cưỡng bức; **snapshot trước khi áp dụng đề xuất AI** | Lịch sử phiên bản có giao diện | 05 |
| S1.8 | Xuất | TXT/MD bản dịch của chương | Kiểu lời thoại, xuất nhiều chương (S2) | 06 |
| S1.9 | Duyệt đề xuất tại chỗ | Đề xuất AI hiện trong pane bản dịch dạng diff, Accept/Deny/Accept all theo chương; có hàng chờ và lịch sử phiên theo tác phẩm. Xem [Module Đề xuất](../../modules/proposals/README.md) | Duyệt toàn lượt dịch là hành động riêng khi có Module 7 | 09 |
| S1.10 | Hỏi / Sửa cùng AI | Panel chat theo tác phẩm: hỏi (chỉ đọc) và sửa (đề xuất khối thay thế), stream, hủy giữa dòng, lịch sử phiên tiếp tục được; hiện token và chi phí | Tool đọc ngữ cảnh truyện | 09 |

### S2 — AI thật và nhất quán

| ID | Hạng mục | Làm tối thiểu | Chưa làm | MIR |
| --- | --- | --- | --- | --- |
| S2.1 | Provider thật | **Một adapter tương thích OpenAI** cho mọi nhà cung cấp (Gemini, OpenRouter, DeepSeek, Ollama/LM Studio, gateway tự dựng); nhiều khóa `fill-first`; khóa lưu bằng `safeStorage` ([ADR-004](../decisions/0004-ai-provider-layer.md)) | Adapter native Anthropic/Gemini, Batch API, OpenRouter PKCE; OAuth thuê bao (bị cấm) | 09 |
| S2.2 | Chi phí và giới hạn | Ước lượng token/chi phí trước khi chạy; **sổ `usage`** ghi lượng dùng thật; backoff theo `Retry-After`; trần chi phí mỗi tác vụ (Q4) | Ngân sách theo tháng | 09 |
| S2.3 | Glossary | Tạo/sửa/tìm theo tác phẩm; import `Names.txt`/`VietPhrase.txt`; chỉ gửi mục xuất hiện trong đoạn | AI tự trích thuật ngữ (S3) | 04 |
| S2.4 | Ma trận xưng hô — xem | Màn xem/sửa tay: người nói, người nghe, cách xưng, từ chương nào; gửi vào prompt | AI đề xuất cập nhật (S3) | 14 |
| S2.5 | QA nhất quán | Cảnh báo: tên sai glossary, xưng hô lệch ma trận, đoạn trống, số đoạn hai bên lệch, tỷ lệ độ dài bất thường, còn chữ nguồn (Hán/kana) | Tự sửa | 04, 14 |
| S2.6 | Nhiều chương | Danh sách chương, sắp xếp, tác vụ dịch nhiều chương bền, chạy nền trong main | Tự nhận ranh giới chương khi nhập | 01 |
| ~~S2.7~~ | ~~Gộp/tách segment~~ | **Đã bỏ (ADR-005)** | — | ~~03~~ |
| S2.8 | Sửa lỗi raw | Thao tác riêng có lịch sử, hoàn tác được | — | 08 |
| S2.9 | Dấu AI và hồ sơ lần gọi | Vùng do AI viết được đánh dấu (`ai_mark`); mỗi lần gọi ghi provider, model, lượng dùng, `contextHash` (`proposal`, `job_item`, `usage`). **Mức vùng, không mức câu** | Biết model nào viết câu nào | 09 |
| S2.10 | Xuất để đăng | Xuất “dán sạch” nhiều chương, tiêu đề chương, chọn kiểu lời thoại (gạch đầu dòng / ngoặc kép) | EPUB/DOCX | 06 |

### S3 — Khác biệt nâng cao

| ID | Hạng mục | Làm tối thiểu | MIR |
| --- | --- | --- | --- |
| S3.1 | Nhiều nguồn raw | Thêm nguồn phụ, người dùng chọn nguồn chính; ghép chương N:M có xác nhận; nguồn phụ gửi AI dạng khối tham khảo | 13 |
| S3.2 | Văn phong từ bản dịch cũ | Nhập bản cũ, truy xuất ví dụ tương tự làm mẫu; bản hướng dẫn văn phong người dùng duyệt. **Cách ghép bản cũ với raw chưa có thiết kế** sau khi bỏ liên kết bền (ADR-005) | 15 |
| S3.3 | Xưng hô tự cập nhật | AI đề xuất thay đổi ma trận sau mỗi chương; người dùng duyệt | 14 |
| S3.4 | Glossary tự trích | AI phát hiện thuật ngữ/nhân vật mới mỗi chương; duyệt trước lô lớn | 04 |
| S3.5 | Căn chỉnh bản dịch có sẵn | **Chưa có thiết kế**: liên kết bền và `segment-auto-align` đã bị hủy (ADR-005). Mở lại khi có cách không cần liên kết lưu bền | 03 |

### Sau bản đầu

Tài khoản và đồng bộ; cộng tác; web/macOS/mobile; EPUB/DOCX/PDF/OCR; crawler/uploader nền tảng; Live Preview đầy đủ kiểu Obsidian; translation memory quy mô CAT; dịch docs/MDX nhiều tệp; **AI ngoài (Claude Code, Cursor… qua MCP/CLI)**, cần ADR riêng và chỉ được đề xuất. Đây là hoãn, không phải “không bao giờ làm”.

## 4. Module và hạng mục

Mỗi module là một change openspec, làm hoàn chỉnh rồi mới sang module kế. Thứ tự kỹ thuật, điều kiện xong và trạng thái nằm ở [kiến trúc AI-first mục 10](../engineering/ai-first-architecture.md#10-lộ-trình-theo-module); bảng này chỉ ánh xạ.

| Module | Hạng mục |
| --- | --- |
| 0 Chat Hỏi/Sửa | S1.10 (MVP đã có; còn kiểm chứng) |
| 2 Đoạn | S1.1, S1.2 |
| 3 Đề xuất | S1.3 (một chương), S1.7 (snapshot), S1.9, S2.9 |
| 4 Tác vụ | S1.3, S2.2, S2.6 |
| 5 Kho v6, gỡ Từng câu | S0.1, S0.2, S0.5; xóa S1.4, S1.6, S2.7 |
| 6 Ngữ cảnh | S2.3, S2.4, S3.3, S3.4 |
| 7 QA | S2.5 |
| 8 Xuất | S1.8, S2.10 |
| Đã có bản MVP, sửa theo nhu cầu | S0.3, S0.4, S1.5, S2.1, S2.8 |

## 5. Luồng phải chạy trọn trước khi thử với người dùng

1. Tạo tác phẩm, chọn cặp ngôn ngữ, nhập raw chương, xem trước.
2. Chạy AI dịch chương (mock trước, provider thật sau); ngắt app giữa chừng rồi tiếp tục đúng chương, đúng lô, không dịch lại đoạn đã ghi.
3. Với chương đã có chữ: nhận một vài khối đề xuất, bỏ vài khối, `Ctrl+Z` hoàn tác cả lượt; hỏi AI về một đoạn và áp dụng bản sửa.
4. Glossary/xưng hô được áp dụng; QA bắt lỗi cài sẵn.
5. Xuất chương; đóng app, mở lại; backup, restore trên profile sạch; đọc/sửa/xuất khi offline.

## 6. Nghiệm thu bản đầu

- Không mất hoặc nhân đôi nội dung đã báo lưu, qua đóng/mở, crash, backup/restore và khi nhận/bỏ đề xuất.
- Bản dịch AI không bao giờ gắn sai đoạn âm thầm; phản hồi hỏng ID được thử lại hoặc đánh dấu.
- AI không ghi đè chữ đã có khi người dùng chưa duyệt; đề xuất đã cũ bị từ chối chứ không đoán vị trí.
- Người dùng phân biệt được **vùng chưa dịch**, **vùng AI viết mà chưa ai đụng tới** và **vùng đã soát**; không gộp thành một phần trăm.
- Đọc, sửa, lưu, nhập/xuất, backup chạy không cần mạng.
- Bộ bài chi tiết ở [kế hoạch kiểm chứng](../delivery/validation.md).

## 7. Spec cần viết theo thứ tự

Theo thứ tự module ở [kiến trúc AI-first mục 10](../engineering/ai-first-architecture.md#10-lộ-trình-theo-module): đoạn → đề xuất → tác vụ → kho v6 và gỡ Từng câu → ngữ cảnh → QA → xuất. Mỗi module có spec riêng trước khi làm; spec của phần MVP đã triển khai nằm ở `openspec/specs/` và được thay bằng delta khi module làm lại.

## 8. Định hướng dịch tài liệu (sau bản đầu)

Mô hình dữ liệu nên giữ đường sang **project → document → content blocks** để hỗ trợ docs về sau: nhãn UI “tác phẩm/chương” không buộc tên trong schema; khi hỗ trợ Markdown docs phải giữ link, hình, code fence, inline code, placeholder và frontmatter, không đưa phần không cần dịch vào đoạn gửi AI. MDX và cú pháp framework docs cần quyết định riêng.

Tham khảo luồng: [Smartcat editor](https://help.smartcat.com/editor-functionalities-overview/), [Crowdin editor](https://support.crowdin.com/online-editor/), [memoQ nhập bản đã review](https://docs.memoq.com/12-2/en/Workspace/import-reviewed-document.html), [Obsidian views](https://obsidian.md/help/edit-and-read). Các sản phẩm CAT này là nguồn tham khảo cho luồng soát theo hàng, thứ Mira đã chọn **không** làm (ADR-005).

---

[Mục lục handbook](../README.md)
