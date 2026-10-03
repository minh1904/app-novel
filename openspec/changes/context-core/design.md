## Context

Xem [proposal.md](proposal.md) — Why. Ba ràng buộc từ code hiện có định hình thiết kế:

- **Dữ liệu tác phẩm là một tệp SQLite riêng** (`works/<id>.mira`, `workSchema.ts` đang ở version 5; version kế tiếp là của change gỡ segment), SQL thuần, không ORM ([ADR-003](../../../docs/handbook/decisions/0003-technology-stack.md)); renderer không chạm dữ liệu, chỉ đi qua IPC (`work-storage`).
- **Hợp đồng provider đã tồn tại** với `TranslateRequest.context?: string` chưa ai dùng, và `MockProvider` đang gánh toàn bộ test luồng AI.
- **Chương có `position` đổi được** (`chapters:move` trong `work-detail-screen`), nên bất kỳ thứ gì "hiệu lực từ chương N" phải chịu được việc người dùng sắp lại mục lục.

Căn cứ nội dung: [nghiên cứu ngữ cảnh truyện](../../../docs/handbook/research/story-context.md). Ba lớp bắt buộc (thuật ngữ, xưng hô, văn phong) và quy tắc "thuật ngữ theo đoạn, xưng hô theo chương" lấy từ đó.

## Goals / Non-Goals

**Goals:**

- Lắp ngữ cảnh là **hàm thuần**: không thời gian, không ngẫu nhiên, không mạng, băm được.
- Thêm một lớp dữ liệu mà **không đổi hành vi nào đang chạy**: tác phẩm cũ mở lên có bảng rỗng và mọi luồng hiện tại giữ nguyên.
- Mọi quy tắc chọn/cắt/kiểm tra đều **kiểm được bằng vitest với fixture**, không cần provider thật và không cần UI.

**Non-Goals:**

- Tối ưu hiệu năng tầng khớp trước khi có số đo. Chọn cách đơn giản nhất chạy đúng, giữ interface để đổi thuật toán sau.
- Đếm token chính xác. Change này dùng **ước lượng** và nói rõ là ước lượng.
- Khai `cache_control` cho nhà cung cấp. Ba tầng ở đây chỉ **xếp đúng thứ tự** để sau này bật caching được.

## Decisions

### D1. Một bảng cho sáu kiểu, không phải sáu bảng

`context_entry` một bảng, cột riêng theo kiểu để `NULL`, ràng buộc bằng `CHECK` theo `kind` (ví dụ `kind = 'dyad'` thì `speaker_id`/`addressee_id` phải có; `kind = 'term'` thì `source` phải có). Thêm `context_alias (entry_id, form)` với `UNIQUE (form)` trong phạm vi tệp.

*Vì sao:* bốn trường dùng chung (hiệu lực, trạng thái, nguồn gốc, mức dùng cho AI) là lý do tồn tại của mô hình này; tách sáu bảng thì mỗi truy vấn "mục hiệu lực tại chương N" thành sáu câu `UNION` và mỗi lần thêm trường chung phải sửa sáu chỗ. *Đã loại:* sáu bảng (nhân CRUD và nhân migrate); một cột JSON cho phần riêng theo kiểu (mất khả năng truy vấn và `CHECK`, trái với lối SQL thuần của repo).

### D2. Hiệu lực lưu theo `chapter_id`, so sánh theo `position` lúc truy vấn

`from_chapter_id` và `to_chapter_id` tham chiếu `chapter (id)` với `ON DELETE SET NULL`; truy vấn join `chapter` để lấy `position` rồi so sánh.

*Vì sao:* lưu số chương dạng số nguyên là cái bẫy — người dùng sắp lại mục lục hoặc chèn một chương là mọi mốc hiệu lực lệch đi, mà lệch âm thầm (bản dịch vẫn chạy, chỉ sai xưng hô). *Quy ước cho `NULL`:* `from_chapter_id` null nghĩa là **hiệu lực từ đầu**, `to_chapter_id` null nghĩa là **còn hiệu lực**; chương bị xóa làm mốc trở về null, và đó là hành vi an toàn hơn so với giữ một số chương trỏ vào khoảng trống. *Đánh đổi:* mỗi truy vấn hiệu lực phải join; không đáng lo ở quy mô vài trăm mục.

### D3. Dàn nhân vật của chương tính tại chỗ, cache trong bộ nhớ

Không thêm bảng dẫn xuất. Tính bằng cách quét văn bản nguồn của chương một lần, cache theo khóa `(chapter_id, chapter_text.rev, entriesRev)` trong main process; `entriesRev` là một bộ đếm tăng mỗi lần có mục ngữ cảnh bị ghi.

*Vì sao:* một bảng dẫn xuất cần vô hiệu hóa đúng ở **hai** nguồn thay đổi (văn bản chương và danh sách mục), và vô hiệu hóa sai sẽ cho bản dịch sai mà không ai thấy. Một chương vài nghìn từ quét một lần cho cả job là chi phí nhỏ. *Lối ra nếu chậm:* khóa cache đã có sẵn ba thành phần, nên hạ cache xuống đĩa là thay đổi cục bộ.

### D4. Khớp bằng một regex alternation sắp theo độ dài giảm

Dựng một regex từ mọi từ khóa và dạng viết đã escape, sắp dài trước; bọc `\b…\b` khi `source_lang = 'en'`; không bọc với `zh-Hans`/`zh-Hant`/`ja`. Một lần quét cho cả đoạn, trả về mục kèm vị trí.

*Vì sao:* JavaScript chọn nhánh alternation **đầu tiên khớp được**, nên "dài trước" thành ra đúng quy tắc "khớp dài trước" mà không cần logic riêng; không thêm dependency. *Đã loại:* Aho–Corasick (đúng hơn về độ phức tạp nhưng là một thư viện hoặc ~150 dòng tự viết cho một bài toán chưa đo); vòng lặp `indexOf` theo từng mục (O(mục × độ dài) và phải tự xử lý chồng lấp). *Ngưỡng độ dài tối thiểu* chặn mục một ký tự, có cờ cho phép ép khớp — đây là bản có tên của mẹo "họ và tên trên hai dòng" của GalTransl.

### D5. `contextHash` **không** gồm văn bản nguồn và **không** gồm các đoạn liền trước

Băm trên chuỗi đã tuần tự hóa của: tầng A, tầng B, và danh sách mục thuật ngữ đã khớp của tầng C (id + nội dung đã duyệt). `sha256`, lấy 16 ký tự hex đầu; hàm băm do người gọi tiêm vào (D12).

*Vì sao đây là quyết định quan trọng nhất của change:* nếu băm gồm văn bản nguồn thì mọi lần sửa lỗi chính tả bản raw cũng làm đoạn "ngữ cảnh đã đổi" — sai nghĩa. Nếu băm gồm các đoạn liền trước (vốn là **bản dịch** của đoạn trước) thì dịch đoạn 5 làm đổi băm của đoạn 6, đoạn 6 làm đổi đoạn 7 — một làn sóng đánh dấu lan vô hạn không mang thông tin nào. Băm phải trả lời đúng một câu: *"ngữ cảnh do người dùng quản đã đổi chưa?"* Khối đoạn liền trước vẫn được gửi cho provider, chỉ không vào băm.

### D6. Ngân sách tính bằng **ước lượng** token, có biên an toàn

Hệ số theo ngôn ngữ (CJK ≈ 1 token/ký tự, Latin ≈ 4 ký tự/token — lấy làm mặc định, khai báo được), trần nhận từ người gọi, cắt khi vượt `trần × (1 − biên)`.

*Vì sao:* tokenizer thật nghĩa là thêm một phụ thuộc wasm vào main process cho một con số dùng để **cắt bớt**, không phải để tính tiền. Giá và `limit.context` thật đã có trong registry model của [ADR-004](../../../docs/handbook/decisions/0004-ai-provider-layer.md). *Đánh đổi:* ước lượng lệch, nên phần "báo lại cái gì bị cắt" là bắt buộc, và `usage` thực sau mỗi lần gọi là nguồn để hiệu chỉnh hệ số về sau.

### D7. Thuật ngữ bị cấm **không** đi vào prompt

Cờ `forbidden` chỉ dùng cho kiểm tra sau dịch, không bao giờ xuất hiện trong khối ngữ cảnh.

*Vì sao:* nói với model "đừng dịch là *khí linh*" là đưa đúng chuỗi cần tránh vào ngữ cảnh — một dạng priming, và kinh nghiệm CAT cũng chỉ dùng forbidden term ở phía QA (memoQ: "Warn if forbidden term is used"), không ở phía gợi ý. Mục bị cấm vẫn hữu ích: nó biến một lỗi hay lặp thành một cờ tự động.

### D8. Change này chỉ **sinh cờ**, không chặn gì

Kiểm tra tuân thủ trả cờ; việc cờ đó chặn lưu, chặn xuất, hay kích hoạt dịch lại là quyết định của job dịch (bậc 2 của thang leo thang) và của change giao diện. Mặc định đề nghị: cờ hiện ra, không chặn lưu.

### D9. `MockProvider` ghi lại ngữ cảnh đã nhận

Thêm vào mock một chỗ đọc lại các khối đã nhận theo thứ tự. *Vì sao:* không có UI trong change này nên đây là **đường nghiệm thu chính** — test khẳng định được "mục chưa duyệt không rời máy", "thứ tự A→B→C", "hai đoạn cùng chương có tầng B giống từng ký tự".

### D10. Đổi kiểu `TranslateRequest.context` ngay, không thêm trường song song

`context?: string` → `context?: ContextBlocks`. Không có dữ liệu người dùng nào phụ thuộc trường này (chưa provider thật nào dùng), nên để lại cả hai dạng chỉ tạo hai đường code phải nuôi.

### D11. `contextHash` lưu ở `proposal` và `job_item`, không ở `provenance`

ADR-005 gỡ `provenance`. Theo [kiến trúc AI-first §5.3](../../../docs/handbook/engineering/ai-first-architecture.md) mỗi lần gọi AI đã có bản ghi riêng: `job_item` (một chương của một tác vụ dịch, đã ghi `contextHash` trong sơ đồ) và `proposal` (đề xuất từ chat hoặc từ ngoài). Change này **không tạo bảng nào cho việc đó**: nó dùng hai bảng ấy và thêm cột `context_hash` vào `proposal` nếu module đề xuất chưa có (sơ đồ §5.3 mới liệt kê cột này ở `job_item`; P4 "mỗi lần gọi AI tái hiện được" đòi cả hai). `NULL` nghĩa là **không có ngữ cảnh**, còn ngữ cảnh rỗng có mã băm thật — để giữ được phép phân biệt mà spec `content-model` yêu cầu.

*Hệ quả, ghi rõ để không ai ngạc nhiên:* các task lưu băm (5.4) và đánh dấu đoạn chịu ảnh hưởng (7.2) **phụ thuộc module đề xuất và module tác vụ dịch** (thứ tự ở [lộ trình](../../../docs/handbook/delivery/roadmap.md)). Lõi khớp, lắp, kiểm tra và IPC (mục 1–4, 6) không phụ thuộc và nghiệm thu được bằng mock provider.

*Độ mịn là điểm hở:* sơ đồ §5.3 có một `contextHash` mỗi `job_item` (mỗi chương), trong khi tầng C đổi theo đoạn nên băm khác nhau giữa các lô. Spec `content-model` viết ở mức **đoạn** (đúng năm đoạn bị đánh dấu); muốn đạt mức đó thì module tác vụ phải lưu băm theo lô (hoặc theo vùng dấu AI). Nếu nó chỉ lưu theo chương, hạ spec xuống mức chương. Chốt khi thiết kế module tác vụ, không chốt ở đây.

### D12. Hàm băm được tiêm vào `buildContext`

`buildContext` nằm ở `src/shared/algorithms/` để tác vụ dịch (main) và chat dùng chung, mà luật lint cấm `shared/**` import `node:*` — nên không gọi được `node:crypto`. `buildContext` nhận thêm tham số `hash: (input: string) => string`; main truyền `sha256` của `node:crypto` (lấy 16 ký tự hex đầu), test truyền một hàm băm giả đơn giản. Hàm vẫn **thuần**: cùng đầu vào và cùng hàm băm cho cùng đầu ra.

## Risks / Trade-offs

- **Ước lượng token lệch nhiều với tiếng Việt** → biên an toàn mặc định 15%, luôn báo phần bị cắt, và ghi `usage` thực để hiệu chỉnh; không dùng con số này cho ước lượng chi phí (đã có registry model cho việc đó).
- **Khớp quá nhiều với glossary lớn** → ngưỡng độ dài tối thiểu, khớp dài trước, một dạng viết thuộc đúng một mục, và trần số mục mỗi đoạn; bước kiểm chứng 4 trong nghiên cứu là phép đo cho rủi ro này.
- **Schema version đụng nhau với change khác** (change gỡ segment, module đề xuất và module tác vụ cũng nâng version của tệp tác phẩm; `segment-auto-align` đã hủy, `ai-connection` đã archive) → đọc lại `workSchema.ts` ngay trước khi viết migrate và lấy số kế tiếp thực tế; không hardcode số version trong tasks.
- **Lõi không có UI nên không soát được bằng mắt** → nghiệm thu bằng test với fixture hai chương thật (một ZH nhiều thuật ngữ, một nhiều hội thoại) và bằng mock provider ghi lại ngữ cảnh; chấp nhận rằng change này không chứng minh được gì về trải nghiệm.
- **`entriesRev` làm cache sai nếu quên tăng** → đặt việc tăng bộ đếm trong cùng một chỗ ghi duy nhất của tầng storage, không rải ở các handler.
- **Băm loại bỏ khối đoạn liền trước** nghĩa là hai bản dịch có cùng `contextHash` vẫn có thể nhận prompt khác nhau ở khối đó → ghi rõ trong tài liệu rằng băm trả lời "ngữ cảnh do người dùng quản", không phải "toàn bộ prompt"; nếu sau này cần tái hiện bit-exact thì lưu thêm một băm prompt đầy đủ, không sửa nghĩa của băm này.

## Migration Plan

1. Version mới của tệp tác phẩm chỉ gồm `CREATE TABLE` cho hai bảng mới và một `CREATE INDEX` cho truy vấn hiệu lực — không `ALTER` bảng cũ, không sửa dữ liệu cũ.
2. Tác phẩm tạo bởi bản trước: mở lên nâng cấp một bước nguyên tử, bảng rỗng, mọi luồng hiện có không đổi hành vi.
3. **Không có đường lùi về bản app cũ** sau khi tệp đã nâng cấp: theo `work-storage`, bản cũ sẽ từ chối mở tệp có version cao hơn. Vì vậy migrate phải đi kèm test `migrate.test.ts` và `schemaSnapshot.test.ts` xanh trước khi ship.
4. Hoàn tác ở mức tính năng: `ai_context` mặc định và việc chưa có UI nghĩa là bảng rỗng không ảnh hưởng gì — tắt tính năng bằng cách không truyền `context` vào `TranslateRequest`.

## Open Questions

- **Trần token mặc định** cho ngữ cảnh (đề xuất ~40% của một lần gọi) và **biên an toàn** (đề xuất 15%): tinh chỉnh được sau khi có số đo, không đổi spec hay task.
- **Hệ số ước lượng token cho tiếng Việt**: chờ `usage` thực từ lần gọi đầu tiên.
- **Ngưỡng độ dài tối thiểu của từ khóa** (một hay hai ký tự Hán): chọn mặc định rồi đo ở bước kiểm chứng 4.
- **Độ mịn của băm lưu** (theo chương, theo lô hay theo vùng dấu AI): xem D11; phụ thuộc thiết kế module tác vụ dịch.
- **Định nghĩa đoạn** (mỗi dòng không trống, chờ xác nhận trên fixture ZH/JA/EN, Q3 của ADR-005): quyết định "đoạn liền trước" là gì và hai đoạn có thật sự khớp một-một giữa nguồn và bản dịch hay không.
