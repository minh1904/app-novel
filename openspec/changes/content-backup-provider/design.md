## Context

Lý do và phạm vi: xem `proposal.md`. Nền đã có (change `m0-storage-foundation`, đã archive): adapter SQLite với `transaction()` lồng được, migration theo `user_version`, tệp tác phẩm `.mira` với đủ bảng `chapter_text`, `segment`, `link`, `link_member`, `provenance`, `cover`, thư viện có chỉ mục dựng lại được, IPC có kiểu trả `Result`, kiểm tra người gửi.

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

## Risks / Trade-offs

- **`VACUUM INTO` chưa kiểm chứng với tệp WAL lớn và ổ đích khác** → task đo bằng tệp vài chục MB.
- **Hộp thoại chọn tệp chạy ở main** → cần cửa sổ cha; hủy hộp thoại phải trả `cancelled`, không phải lỗi.
- **Khôi phục tệp từ nguồn không tin cậy** → luôn làm việc trên bản sao trong `.tmp`, không mở tệp gốc tại chỗ, và kiểm tra `application_id` trước khi chạy bất kỳ câu lệnh nào khác.

## Migration Plan

Không đổi schema; không cần migrate. Hoàn tác: revert commit.

## Open Questions

- Tên tệp gợi ý khi sao lưu (đề xuất: `<tên tác phẩm> — <ngày>.mira`, bỏ ký tự không hợp lệ trên Windows).
