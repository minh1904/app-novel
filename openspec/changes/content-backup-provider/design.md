## Context

Lý do và phạm vi: xem `proposal.md`. Nền đã có (change `m0-storage-foundation`, đã archive): adapter SQLite với `transaction()` lồng được, migration theo `user_version`, tệp tác phẩm `.mira` với đủ bảng `chapter_text`, `segment`, `link`, `link_member`, `provenance`, `cover`, thư viện có chỉ mục dựng lại được, IPC có kiểu trả `Result`, kiểm tra người gửi. Từ change `work-detail-screen` (đã archive) có thêm: kho chương (`chapterFile.ts`, vị trí liền mạch trong một transaction), kênh `chapters:*`, `works:update` nhận `cover`, khung màn chi tiết với danh mục khu vực, menu tác phẩm ở thư viện và ở màn chi tiết, hộp xóa chương, và `delivery/backlog.md` ghi các mục chỉ-minh-họa. Chương hiện **không có hàng nào trong `chapter_text`**; xóa chương xóa con qua khóa ngoại `ON DELETE CASCADE`.

Quyết định công nghệ đã chốt ở [ADR-003](../../../docs/handbook/decisions/0003-technology-stack.md): `node:sqlite`, SQL thuần + repository, valibot, Vitest, IPC tự viết.

## Goals / Non-Goals

**Goals:**
- Repository nội dung giữ bất biến "văn bản và segment ghi cùng transaction".
- Sao lưu và khôi phục an toàn, nguyên tử, kiểm thử được kể cả khi bị gián đoạn.
- Provider dịch có hợp đồng hẹp và một bản giả lập đủ để kiểm thử mọi tình huống lỗi.

**Non-Goals:** editor và ánh xạ segment qua chỉnh sửa (M1), lịch sử phiên bản/snapshot, job dịch bền vững, provider thật, khóa API.

## Decisions

### D1. Bất biến neo và xung đột revision

Mọi thao tác đổi `chapter_text.content` chạy trong một transaction cùng lúc thay toàn bộ segment cùng `(chapter_id, side)` và đặt `segment.text_rev` bằng `rev` mới. Lớp repository là nơi duy nhất ghi hai bảng này. Ghi nhận `expectedRev`: `UPDATE ... WHERE rev = ?` và kiểm số dòng bị ảnh hưởng, 0 dòng → lỗi `conflict`. Xóa segment có liên kết đã được trigger `segment_delete_flags_links` đánh dấu `needs_review` (có test schema).

Quy tắc ánh xạ vùng khi văn bản đổi (thuộc M1, ghi lại để thiết kế nhất quán): đầu vùng gắn bên phải, cuối vùng gắn bên trái, tự phát hiện vùng co về độ dài 0 là bị xóa; cờ "đã chạm/đã xóa" cần effect nghịch đảo để undo đúng (đã thử ở nghiên cứu editor, không miễn phí).

### D2. Backup = một tệp tác phẩm nhất quán; restore = kiểm tra rồi đổi tên nguyên tử

- **Backup:** `VACUUM INTO` từ kết nối đang mở vào `<đích>.part` (đường dẫn do hộp thoại lưu của main chọn, không nhận từ renderer), kiểm tra bản `.part`, rồi đổi tên thành tệp đích. Tệp backup **chính là một tệp tác phẩm hợp lệ** (đuôi `.mira`), nên không có định dạng thứ hai để bảo trì. Ảnh bìa nằm trong tệp nên đi theo.
- **Restore:** hộp thoại mở → sao chép sang `works/.tmp/<newId>.mira.part` → kiểm tra bản sao (không mở tệp gốc của người dùng tại chỗ): `application_id` khớp, `user_version` ≤ bản app hiểu, `PRAGMA integrity_check` = `ok`, `PRAGMA foreign_key_check` rỗng, các bảng bắt buộc có mặt → nâng cấp schema nếu cần → ghi `work.id` mới → **đổi tên thành `works/<newId>.mira` (điểm cam kết)** → cập nhật chỉ mục. Gián đoạn trước bước đổi tên chỉ để lại tệp trong `.tmp`, được dọn ở lần khởi động sau. Gián đoạn sau bước đổi tên: tệp đã hoàn chỉnh và bước đối chiếu khi khởi động nạp nó vào chỉ mục.
- ID chương/segment chỉ duy nhất trong một tệp nên restore chỉ phải đổi `work.id`; không cần ánh xạ lại ID.
- Cần đo `VACUUM INTO` với tệp vài chục MB; nếu chậm, dùng API `backup()` có tiến trình.

### D3. Provider: giao diện hẹp, đối chiếu ID là hàm thuần

```text
TranslationProvider { id; translate(request, { signal }): Promise<TranslateResponse> }
request  = { sourceLang, targetLang, segments: [{ id, text }], context? }
response = { provider, model, items: [{ id, text }] }
ProviderError = { kind: rate_limited | network | auth | refused | invalid_response | cancelled,
                  retryable, retryAfterMs? }
```

- `reconcile(request, response)` là hàm thuần dùng chung cho mọi provider: gắn kết quả theo ID, trả `{ matched, missing, extra, duplicates }`; ID thiếu là lỗi có thể thử lại, ID thừa bị bỏ, ID trùng lấy kết quả đầu và báo. Kiểm thử độc lập với provider.
- Provider giả lập: dịch xác định (`[giả lập] <nguồn>`), tùy chọn độ trễ và các chế độ lỗi (giới hạn tốc độ, lỗi mạng, thiếu ID, ID trùng, xáo thứ tự, phản hồi rỗng); tôn trọng `AbortSignal`; nguồn gốc luôn là `mock`.
- Change này chỉ kiểm thử provider bằng test đơn vị; chưa có giao diện gọi nó và không đăng ký IPC cho provider (job dịch và UI là M1).

### D4. Hợp đồng IPC cho văn bản: chỉ `text:get` và `text:save`

| Kênh | Vào | Ra |
| --- | --- | --- |
| `text:get` | `{ workId, chapterId, side }` | `{ content, rev, segments: [{ id, start, end, textRev, status }] }` |
| `text:save` | `{ workId, chapterId, side, content, expectedRev, segments: [{ id?, start, end }] }` | `{ rev, segments }` |

`side` là `source` hoặc `target`. Bên chưa từng ghi đọc ra `{ content: '', rev: 0, segments: [] }` (không tạo hàng khi chỉ đọc); lần `text:save` đầu với `expectedRev: 0` tạo hàng và đặt `rev = 1`. `segments[].id` có mặt thì phải là ID của segment cùng `(chapter, side)`, nếu không cả lần ghi bị từ chối (`validation`); vắng mặt thì cấp UUID mới. Xung đột revision trả `conflict` kèm `rev` hiện tại để người gọi tải lại.

Liên kết và nguồn gốc (`link`, `link_member`, `provenance`) là hàm của repository có test đơn vị, **chưa mở IPC**: renderer chưa có việc nào cần chúng cho tới khi có editor và job dịch (M1), và mỗi kênh mở thêm là thêm bề mặt tấn công. Chủ ý này ghi lại để M1 mở đúng thứ cần.

Phương án khác: `text:save` chỉ nhận nội dung và main tự chia segment (đơn giản cho renderer, nhưng chia câu là việc của M1 và cần thử nghiệm; đưa vào đây sẽ khóa sớm một thuật toán chưa kiểm chứng).

### D5. Đơn vị vùng, giới hạn, và cờ "có nội dung"

- **Đơn vị vùng là UTF-16 code unit**, khớp chỉ số chuỗi JavaScript và CodeMirror; `start_offset`/`end_offset` trong schema đã là số nguyên không có đơn vị ràng buộc nên không cần migrate. Kiểm tra trong một hàm thuần: sắp theo `start`, không chồng, `0 ≤ start ≤ end ≤ content.length`, và (cảnh báo, không từ chối) không cắt giữa cặp surrogate. Test với emoji, chữ Hán mặt phẳng phụ, CRLF.
- **Giới hạn** 2.000.000 đơn vị UTF-16 mỗi văn bản và 50.000 segment mỗi bên. Một chương truyện thường vài chục nghìn ký tự, nên đây là trần chống sự cố (dán nhầm cả cuốn) chứ không phải giới hạn dùng thật. **Là giả định cần xác nhận**, xem câu hỏi mở. Kiểm tra ở schema valibot (IPC) và lặp lại ở repository (đường không qua IPC).
- **Cờ có nội dung:** `ChapterItem` thêm `hasSource` và `hasTarget` (văn bản không rỗng), tính trong cùng câu `SELECT` của `listChapters` bằng `EXISTS` trên `chapter_text` nên không tải nội dung. Dùng cho hộp xóa chương; cột trên giao diện vẫn nằm trong backlog (`chapter-content-presence`).

### D6. Giao diện chạm vào: xóa chương, menu tác phẩm, khôi phục

- **Hộp xóa chương** nhận `hasSource`/`hasTarget` của chương: nêu rõ bên nào sẽ mất và gợi ý "Sao lưu tác phẩm trước" (một nút mở hộp lưu, không bắt buộc). Chương không có nội dung giữ câu cũ.
- **"Sao lưu…"** thêm vào `WorkMenu` ở thư viện và `WorkHeader` ở màn chi tiết; cả hai gọi cùng một kênh `backup:export`. Kết quả hiện bằng thông báo (đã lưu ở đâu / lý do lỗi); hủy hộp thoại không báo gì.
- **"Mở tác phẩm có sẵn"** thay `PendingScreen` bằng hành động mở hộp chọn tệp ngay (không có màn trung gian). Thành công: thông báo trên thư viện kèm nút "Mở tác phẩm" tới màn chi tiết, vì tác phẩm giữ mốc thời gian cũ (`updated_at` không đổi khi khôi phục) nên có thể không nằm đầu danh sách. `work.id` mới nhưng `last_chapter_id`, trạng thái và mốc thời gian giữ nguyên.
- Hộp thoại mở/lưu chạy ở main với cửa sổ cha là cửa sổ chính; renderer không bao giờ truyền đường dẫn vào.

## Risks / Trade-offs

- **`VACUUM INTO` chưa kiểm chứng với tệp WAL lớn và ổ đích khác** → task đo bằng tệp vài chục MB.
- **Hộp thoại chọn tệp chạy ở main** → cần cửa sổ cha; hủy hộp thoại phải trả `cancelled`, không phải lỗi.
- **Khôi phục tệp từ nguồn không tin cậy** → luôn làm việc trên bản sao trong `.tmp`, không mở tệp gốc tại chỗ, và kiểm tra `application_id` trước khi chạy bất kỳ câu lệnh nào khác.

## Migration Plan

Không đổi schema; không cần migrate. Hoàn tác: revert commit.

## Open Questions

Cần chủ sản phẩm xác nhận trước khi làm (đề xuất ghi kèm; đổi câu trả lời sẽ đổi spec hoặc tasks):

1. **Giới hạn kích thước:** 2.000.000 đơn vị UTF-16 mỗi văn bản và 50.000 segment mỗi bên có ổn không, hay muốn trần thấp hơn/cao hơn?
2. **Tên tệp gợi ý khi sao lưu:** `<tên tác phẩm> — <ngày>.mira`, bỏ ký tự Windows không cho phép (`\ / : * ? " < > |`) và cắt ở khoảng 100 ký tự.
3. **Khôi phục giữ mốc thời gian cũ** (đề xuất) hay đặt "sửa lần cuối" thành lúc khôi phục để tác phẩm lên đầu danh sách? Đề xuất giữ cũ để không làm sai lịch sử, bù bằng thông báo kèm nút mở.
