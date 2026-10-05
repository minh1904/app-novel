# ADR-005 — Bỏ mode Từng câu; đơn vị là đoạn; AI chỉ đề xuất

> **Bổ sung 2026-10-04:** ngoại lệ “pane trống thì AI ghi thẳng” ở quyết định 5 và giả định Q5
> “không lưu hội thoại” bên dưới đã bị [quyết định Module Đề xuất](../../modules/proposals/decisions.md)
> thay thế. Mọi kết quả AI có thể thay chữ nay đều chờ duyệt; lịch sử phiên lưu theo tác phẩm.
> Trang ADR này giữ nguyên bối cảnh và lý do lịch sử; các phần khác vẫn có hiệu lực.

Ngày: 2026-10-03 · Trạng thái: **Accepted** · Người quyết định: chủ sản phẩm, qua trao đổi ngày 2026-10-03 (chấp nhận ba mặc định Q1–Q3 và chỉ đạo "hướng kiến trúc theo [Luồng làm việc và kiến trúc AI-first](../engineering/ai-first-architecture.md)").

**Thay thế một phần [ADR-002](0002-ai-first-translation.md):** các ý "hai mode", "AI dịch theo segment có ID", "soát ở Từng câu" và "căn chỉnh sinh ra từ job dịch". Phần còn lại của ADR-002 (AI dịch từ raw là luồng chính, nhiều nguồn raw, văn phong, xưng hô, kết nối API key, offline trừ bước gọi AI) **giữ nguyên**. Thay dòng "Hai mode" và các dòng liên quan trong [quyết định hiện hành](../product/decisions.md).

## Bối cảnh

- Repo tới ngày 2026-10-03 là **bản MVP để thử nghiệm**: dựng nhanh từng lát cắt (thư viện, editor hai pane, mode Từng câu, dịch chương, panel Hỏi AI) để xem ý tưởng chạy thế nào, không phải bản hoàn chỉnh. Chủ sản phẩm chốt: **sắp tới làm lại hoàn chỉnh từng module** theo kiến trúc mới; mã MVP là tham chiếu, không phải ràng buộc.
- Chủ sản phẩm quyết định **bỏ dịch từng câu** vì mục tiêu chính là **làm việc cùng AI**. Ý định ban đầu: *trình gõ như Obsidian, AI tác động được vào văn bản để đọc và sửa.*
- Mode Từng câu đã bị **tạm ẩn** khỏi giao diện (`SENTENCE_MODE_ENABLED = false`) và đang chờ `segment-auto-align`, thứ mà hướng mới không cần. Giữ nửa sống nửa chết buộc mọi tính năng phải tính hai lần.
- Panel Hỏi AI đã chứng minh một mẫu khác chạy được: AI trả đề xuất, **người duyệt từng chỗ ngay trong pane** (`@codemirror/merge`), không cần đơn vị câu, ID câu hay liên kết n:m.
- Phần phức tạp nhất của kho (`segment`, `link`, `link_member`, `provenance` và trigger giữa chúng) chỉ mode Từng câu cần. Đo thô bằng grep: 37 tệp nguồn và 24 tệp test nhắc tới segment, liên kết hoặc hàng (cận trên, vì có chữ trùng nghĩa khác).

## Quyết định

1. **Bỏ mode Từng câu, gồm cả dữ liệu câu** (ID câu, liên kết, nguồn gốc theo câu), không chỉ giao diện. Gỡ trong **change riêng**, không để chế độ ẩn.
2. **Đơn vị làm việc là chương, bên trong là đoạn.** Không lưu ranh giới câu; câu chỉ được cắt tạm để chia lô gửi AI (`segmenter.ts` giữ lại cho việc đó).
3. **Đoạn = mỗi dòng không trống.** Đây là giả định đã chấp nhận, **điều kiện xong của nó là kiểm trên fixture thật ZH/JA/EN** (số đoạn hai bên khớp sau khi AI dịch). Raw truyện mạng thường mỗi đoạn một dòng, không có dòng trống xen giữa; định nghĩa "cụm dòng ngăn bởi dòng trống" (hiện ở `paragraphsOf()`) biến cả chương thành một đoạn. Nếu fixture bác bỏ, sửa ADR này.
4. **Mức vùng là đủ:** Mira ghi *vùng nào AI viết mà chưa ai đụng tới* (`ai_mark`), không theo dõi *câu nào đã soát*. Người dùng bấm "đã soát" cho đoạn hoặc chương thì gỡ dấu.
5. **Một đường ghi duy nhất: người gõ thì ghi, AI thì đề xuất.** Bản dịch đang trống thì AI ghi thẳng kèm dấu AI (không có gì để mất); đã có chữ thì AI tạo **đề xuất** và người duyệt từng khối trong pane. Luật này áp cho mọi nguồn AI: tác vụ dịch, chat, và AI ngoài về sau.
6. **SQLite (`.mira`) là nguồn sự thật duy nhất**, Markdown chỉ là cách chiếu ra (cho editor, prompt, xuất). Không đồng bộ hai chiều với tệp, không CRDT.
7. **Ba động cơ AI dùng chung một bộ dựng ngữ cảnh (`buildContext`, hàm thuần, có `contextHash`) và một sổ chi phí:** tác vụ dịch chạy trong `main` và lưu bền, Hỏi/Sửa, và ngữ cảnh truyện.
8. **Giữ Electron và `node:sqlite`.** Không chuyển Tauri (IME trên WebView2 không ghim được; phải viết lại `main` bằng Rust).
9. **Làm lại theo module, mỗi module hoàn chỉnh trước khi sang module kế** (có spec, test, nghiệm thu), theo thứ tự ở [lộ trình](../delivery/roadmap.md). Một module thay thế mã MVP thì xóa mã MVP cùng change đó.

## Chưa quyết định

| Câu | Trạng thái | Chặn gì |
| --- | --- | --- |
| Q4 Trần chi phí mặc định mỗi tác vụ | Mở (ADR-004 cũng để mở) | Module tác vụ dịch |
| Q5 Lưu hội thoại chat theo chương | Giả định **không** (hội thoại chỉ sống trong phiên) | Không chặn gì |
| Q6 AI ngoài (MCP/CLI) có thuộc bản đầu không | Giả định **không**, làm sau; cần ADR riêng vì ADR-004 cấm agent mode theo nghĩa AI tự chạy nhiều bước | Module AI ngoài |
| Q7 Ảnh khi xuất `.md` | Giả định tách thành tệp rời, cú pháp `![[tên.png]]` | Module xuất |
| Văn phong từ bản dịch cũ và căn chỉnh bản dịch có sẵn (S3.2, S3.5) | **Chưa có thiết kế.** Hai hạng mục này từng dựa vào căn chỉnh và liên kết bền; liên kết bị bỏ nên cần cách khác (ví dụ căn chỉnh tạm khi nhập, không lưu liên kết) | Hai hạng mục S3 đó; không chặn gì ở lát cắt đầu |

## Hệ quả

- **Mất:** khả năng biết *câu nào* đã soát và *model nào viết câu nào* (mức vùng thay mức câu); sửa qua chat vào kho như chữ người dùng, không mang nguồn gốc `ai` (đã chấp nhận ở [panel Hỏi AI](../research/ai-chat-panel.md), Q2). Tệp `.mira` v5 có hàng "Đã soát" sẽ mất thông tin đó khi lên v6.
- **Hủy:** change `segment-auto-align` (cùng model embedding 118 MB) và `sentence-mode`; backlog `merge-split-rows`, `shared-undo-modes`, `edited-segment-link-review`, `sentence-mode-toolbar`, `sentence-mode-side-panels`; mốc căn chỉnh Bậc 0 trong M3. Các spec và change này **bị xóa**, không lưu trữ (lịch sử còn trong Git).
- **Thêm vào kho (schema v6):** `ai_mark`, `proposal`, `text_snapshot`, `job`, `job_item`; `usage` ở `library.db`. **Bỏ:** `segment`, `link`, `link_member`, `provenance`. Migration v5→v6 phải có test và đọc được tệp v5 cũ.
- **Thứ tự bắt buộc:** đường dịch hiện ghi theo hàng (`saveRow`, `isProtectedRow`), nên phải có đường đề xuất trước khi gỡ segment.
- **Chat:** `chatRange.ts` đọc `segmentsField` để tính `targetIds`, trường này chỉ được tạo ra, không nơi nào đọc; gỡ cùng lúc gỡ segment.
- **Hợp đồng IPC mất:** `links:list`, `rows:save`, `rows:review`, `rows:autopair`, và `segments` trong `text:save` (thay bằng `marks`).
- **Giữ:** `reconcile`, `classifyError`, `keyPool`, `modelCatalog`, `chatReview.ts`, editor Toàn văn cùng Live Preview và ảnh, kho thư viện, backup/restore.
- `context-core` (chưa làm) phải đổi "segment liền trước" thành "đoạn liền trước" và đổi chỗ lưu `contextHash` từ `provenance` sang `proposal`/`job_item`.

## Phương án đã cân nhắc và loại

| Phương án | Vì sao loại |
| --- | --- |
| Giữ Từng câu làm chế độ phụ | Mọi tính năng phải tính hai lần; Logseq tách thành hai sản phẩm vì lý do này |
| Chỉ ẩn giao diện, giữ dữ liệu câu | Giữ gần hết độ phức tạp mà không còn giao diện dùng nó |
| Tệp `.md` làm nguồn sự thật (vault kiểu Obsidian) | Trạng thái có cấu trúc *tăng* khi AI-first (đề xuất, tác vụ, chi phí, ngữ cảnh); mất transaction một tệp |
| Đồng bộ hai chiều SQLite ↔ Markdown | Hai nguồn sự thật, chính là thứ Logseq phải bỏ |
| AI ghi thẳng, người hoàn tác sau | Trái luật "AI không âm thầm ghi đè"; hoàn tác không thay được việc *nhìn thấy* trước khi nhận |
| Chuyển Tauri | Rủi ro IME và chi phí viết lại `main`; chi tiết ở [kiến trúc AI-first](../engineering/ai-first-architecture.md) mục 8 |

Phân tích đầy đủ và nguồn (Obsidian, Notion, Logseq, WebView2) nằm ở [Luồng làm việc và kiến trúc AI-first](../engineering/ai-first-architecture.md).

## Điều có thể làm đảo quyết định

Quyết định này **chưa qua bài kiểm chứng người dùng**: câu hỏi "người dịch bằng AI có thực sự soát theo câu, hay chỉ đọc lướt toàn văn?" nằm ở [kế hoạch kiểm chứng](../delivery/validation.md) và chưa chạy. Nếu phiên quan sát với dịch giả cho thấy họ cần soát và đánh dấu theo từng câu, thì Q2 sai và mục "dấu AI mức vùng" phải mở lại. Hai dấu hiệu khác: fixture ZH/JA/EN không cho số đoạn khớp (Q3), và tỷ lệ `Ctrl+Z` ngay sau khi nhận đề xuất cao (diff hiện quá muộn, không phải đường ghi sai).

## Liên kết

[Luồng làm việc và kiến trúc AI-first](../engineering/ai-first-architecture.md) · [ADR-002](0002-ai-first-translation.md) · [ADR-003](0003-technology-stack.md) · [ADR-004](0004-ai-provider-layer.md) · [Quyết định hiện hành](../product/decisions.md) · [Lộ trình](../delivery/roadmap.md) · [Scope](../product/scope.md)

---

[Mục lục handbook](../README.md)
