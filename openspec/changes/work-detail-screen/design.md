## Context

Lý do và phạm vi: xem `proposal.md`. Hiện trạng liên quan:

- Tệp tác phẩm đã có bảng `chapter (id, position, title, created_at, updated_at)` và `work.last_chapter_id` (khóa ngoại `ON DELETE SET NULL`), cùng chỉ mục thư viện có `chapter_count` và chương gần nhất. Chưa có mã ghi hay đọc chương.
- `App.tsx` điều hướng bằng một union `View`; nhánh `work` đang trả `PendingScreen`. Màn tạo (`CreateWorkScreen`) đã có form đầy đủ và `CoverPicker`.
- IPC theo mẫu đã có: kênh trong `shared/channels.ts`, schema valibot trong `shared/library.ts`, handler thuần ở `main/ipc/`, trả `Result`.
- Tham khảo thực tế: trang truyện trên Hako có bìa, tên, thể loại, tình trạng, nút "Đọc tiếp", tóm tắt, tác giả, nhóm dịch và mục lục **nhóm theo Tập** với "Xem tiếp (N chương)" để gập danh sách dài. Chỉ đọc qua kết quả tìm kiếm của một trang thật, chưa xác nhận từng chi tiết giao diện.

Quyết định đã chốt liên quan: SQL thuần + repository, valibot, IPC tự viết, không thêm thư viện ([ADR-003](../../../docs/handbook/decisions/0003-technology-stack.md)).

## Goals / Non-Goals

**Goals:**
- Màn chi tiết là điểm vào rõ ràng của một tác phẩm, dùng được bằng bàn phím, không tràn ở 940 px.
- Chương bền, đúng thứ tự, số thứ tự không bao giờ trùng hay thiếu, chỉ mục thư viện luôn khớp.
- Danh sách vẫn mượt với ít nhất 2.000 chương mà không thêm dependency.

**Non-Goals:** nội dung chương và editor, trạng thái dịch từng chương, số từ, nhóm theo tập, xóa tác phẩm, kéo thả, nhập nhiều chương một lần, lịch sử thay đổi/hoàn tác xóa chương.

## Decisions

### D1. Bố cục màn chi tiết

```text
 Thư viện › Hiệu thuốc trên núi
 ┌────────────────────────────────────────────────────────────────────────┐
 │ ┌──────┐  Hiệu thuốc trên núi                       [ ▶ Tiếp tục ] ⋯   │
 │ │ bìa  │  山中药铺 · Lý Minh · Tiên hiệp, cổ đại        [ Sửa thông tin ] │
 │ │ 2:3  │  (Đang dịch) Trung giản thể → Việt · 48 chương · sửa hôm nay    │
 │ └──────┘  Mô tả… (thu gọn, "Xem thêm")                                    │
 ├────────────────────────────────────────────────────────────────────────┤
 │  Chương (48)     [ Tìm chương hoặc nhập số… ]        [ + Thêm chương ]   │
 │  ┌─────┬──────────────────────────────────────────┬────────────┬──────┐ │
 │  │  1  │ Mở đầu                                   │ hôm nay    │  ⋯   │ │
 │  │  2  │ Chương 2                                 │ hôm qua    │  ⋯   │ │
 │  │ …   │                                          │            │      │ │
 │  └─────┴──────────────────────────────────────────┴────────────┴──────┘ │
 │                        [ Hiện thêm 100 chương ]                          │
 └────────────────────────────────────────────────────────────────────────┘
```

Ở cửa sổ hẹp, bìa xếp trên thông tin và các nút xuống hàng riêng. Nút chính là "Tiếp tục" khi có chương gần nhất, ngược lại "Thêm chương". Menu `⋯` của tác phẩm dùng lại các hành động của thư viện (tạm dừng/tiếp tục, lưu trữ, đổi/gỡ bìa).

### D2. Dữ liệu chương và IPC

Kiểu mới trong `shared`: `ChapterSummary { id, number, title, createdAt, updatedAt }` (`number` suy ra từ vị trí). Kênh và kết quả, thay đổi luôn kèm `WorkSummary` mới để header và thư viện cập nhật mà không phải hỏi lại:

| Kênh | Vào | Ra |
| --- | --- | --- |
| `chapters:list` | `{ workId }` | `{ chapters }` |
| `chapters:create` | `{ workId, title? }` (thêm vào cuối) | `{ work, chapter }` |
| `chapters:rename` | `{ workId, chapterId, title }` | `{ work, chapter }` |
| `chapters:move` | `{ workId, chapterId, to }` (`to` từ 1 tới số chương) | `{ work, chapters }` |
| `chapters:delete` | `{ workId, chapterId }` | `{ work, chapters }` |
| `chapters:open` | `{ workId, chapterId }` | `{ work }` |

`create` và `rename` chỉ trả chương bị ảnh hưởng; `move` và `delete` trả cả danh sách vì nhiều số thứ tự đổi cùng lúc. Danh sách 2.000 chương ~ 200 KB qua IPC, chấp nhận được cho thao tác hiếm; đo trước khi tối ưu.

Phương án khác: trả cả danh sách cho mọi thao tác (đơn giản nhưng lãng phí với đổi tên); hoặc renderer tự tính lại thứ tự sau `move` (nhanh nhưng dễ lệch với dữ liệu thật).

### D3. Kho: vị trí liền mạch và thao tác nguyên tử

Bất biến: `chapter.position` là hoán vị liền mạch `0..n-1`. Không đặt ràng buộc `UNIQUE` (để bước trung gian khi dồn vị trí không xung đột); thay vào đó mọi thao tác đổi vị trí chạy trong **một transaction** với hai câu lệnh dồn có điều kiện, và test kiểm tra bất biến sau mỗi thao tác.

- `create`: `position = count`. `rename`: một `UPDATE`.
- `move(from → to)`: nếu `from < to` thì `position = position - 1` cho `(from, to]`, ngược lại `position + 1` cho `[to, from)`, rồi đặt chương di chuyển vào `to`.
- `delete`: xóa (các bảng con và `last_chapter_id` xử lý bằng khóa ngoại), rồi `position = position - 1` cho các chương sau nó.
- Mọi thao tác chương cập nhật `work.updated_at` (coi là làm việc trên tác phẩm) và làm mới chỉ mục thư viện sau khi commit, dùng đường `syncIndex` đã có. Chỉ mục vẫn dựng lại được từ tệp tác phẩm.
- ID chương là UUID v4; chương được tra **trong tệp của đúng tác phẩm**, nên ID thuộc tác phẩm khác tự nhiên cho `not_found`.

### D4. Chương gần nhất và trạng thái

`chapters:open` đặt `work.last_chapter_id`, cập nhật `updated_at`, và chuyển `not-started` thành `in-progress` (không đụng `paused`). Không tạo cột mới: "chương gần nhất" và "lần sửa gần nhất" dùng chung `updated_at` cho đến khi có editor. Đánh đổi: chỉ mở xem một chương cũng đẩy tác phẩm lên đầu mục "Gần đây". Chấp nhận ở giai đoạn này; nếu gây phiền, thêm cột `last_opened_at` bằng migration v4.

### D5. Sửa thông tin: hộp thoại dùng chung form với màn tạo

Tách phần thân của `CreateWorkScreen` thành `WorkForm` (tên, ngôn ngữ, tên gốc, tác giả, thể loại, mô tả, `CoverPicker`) dùng cho cả tạo và sửa; ở chế độ sửa, ngôn ngữ nguồn hiển thị nhưng bị khóa. Sửa mở trong hộp thoại (không phải trang riêng) để giữ ngữ cảnh. Để lưu thông tin và bìa **nguyên tử**, mở rộng `workPatchSchema` bằng `cover` (`null` để gỡ, vắng mặt để giữ) và xử lý trong cùng transaction của `library.update`; kênh `works:cover:set` vẫn dùng cho menu đổi/gỡ bìa nhanh.

### D6. Danh sách nhiều chương: hiển thị dần, không thêm thư viện ảo hóa

Hiển thị 100 hàng đầu, thêm 100 hàng khi người dùng bấm "Hiện thêm" hoặc cuộn tới cuối (`IntersectionObserver`). Lọc chạy trên toàn mảng trong bộ nhớ (2.000–5.000 phần tử là không đáng kể) rồi hiển thị dần phần kết quả. "Nhảy tới số N" nâng số hàng hiển thị lên tối thiểu N rồi `scrollIntoView` và làm nổi bật hàng. Hàng dùng `React.memo` để thêm/đổi tên một chương không vẽ lại cả danh sách.

Phương án khác: thư viện ảo hóa như TanStack Virtual (mượt hơn ở hàng chục nghìn hàng nhưng thêm dependency, chiều cao hàng phải cố định, khó với focus và tìm bằng trình duyệt). Chưa cần; **đo với 2.000 và 5.000 chương** ở task 6 và chỉ đổi nếu không đạt.

### D7. Thao tác trên một chương

- **Thêm:** nút "Thêm chương" mở hàng nhập ở đầu danh sách; Enter thêm chương vào cuối và giữ hàng nhập để thêm tiếp; Esc đóng. Sau khi thêm, danh sách cuộn tới chương mới.
- **Đổi tên:** tại chỗ (menu → Đổi tên, hoặc nhấp đôi vào tên); Enter lưu, Esc hủy, rỗng đưa về "Chương N".
- **Chuyển vị trí:** menu có Chuyển lên, Chuyển xuống, Lên đầu, Xuống cuối và "Chuyển tới vị trí…" (hộp thoại nhập số). Không kéo thả (khó dùng với hàng nghìn chương và không truy cập được bằng bàn phím).
- **Xóa:** hộp xác nhận nêu tên chương, cảnh báo không hoàn tác. Khi chưa có nội dung chương, việc này chỉ mất tên và vị trí; khi có nội dung (change sau) hộp thoại phải nêu rõ sẽ mất bản gốc và bản dịch và gợi ý sao lưu.
- **Mở:** bấm tên chương hoặc Enter gọi `chapters:open` rồi tới màn "editor chưa xây" của chương (có nút về màn chi tiết).

### D8. Điều hướng

`View` thêm `{ name: 'work', workId }` (màn chi tiết) và `{ name: 'chapter', workId, chapterId }` (chỗ giữ chỗ editor). "Mở tác phẩm", mục thanh bên và breadcrumb tới `work`; "Tiếp tục" gọi `chapters:open` rồi tới `chapter`. Trạng thái màn chi tiết nằm trong hook `useWorkDetail(workId)` (tác phẩm + chương + hành động), tách khỏi `useLibrary` vì chu kỳ sống khác nhau; khi đóng màn, thư viện tải lại để chỉ mục hiển thị đúng.

### D9. Kiểm thử

- Test kho: bất biến vị trí liền mạch sau mỗi thao tác, **test ngẫu nhiên so với mô hình đơn giản** (dãy thao tác thêm/đổi tên/chuyển/xóa ngẫu nhiên; kết quả kho phải bằng kết quả trên một mảng thuần), chương gần nhất bị xóa, ID thuộc tác phẩm khác, chỉ mục khớp sau mỗi thao tác, và mở rộng test kill tiến trình sang thao tác chương.
- Test IPC như mẫu hiện có (đầu vào sai kiểu, người gửi không tin cậy).
- Hàm thuần của renderer (lọc không dấu theo tên chương, phân tích ô "tìm hoặc nhảy tới") có test riêng.
- Chạy trong Electron thật với tác phẩm 2.000 và 5.000 chương để đo thời gian mở màn, thêm chương và chuyển vị trí, và chụp màn hình các trạng thái chính.

## Risks / Trade-offs

- **Số thứ tự suy ra từ vị trí không biểu diễn được đánh số theo nguồn** (bắt đầu từ chương 101, "Ngoại truyện", chương gộp) → người dùng ghi vào tên chương; nếu thực tế cần, thêm trường "số chương gốc" bằng migration sau. Đây là quyết định cần chủ sản phẩm xác nhận.
- **`updated_at` dùng chung cho "sửa" và "mở"** → xem D4; có đường thoát rẻ.
- **Hiển thị dần có thể lộ giật khi cuộn nhanh xuống hàng nghìn hàng** → đo; nếu không đạt thì ảo hóa.
- **Trả cả danh sách sau `move`/`delete`** → đo; nếu chậm thì trả phần thay đổi.
- **Xóa chương không hoàn tác** → hiện chưa có nội dung nên chi phí thấp; khi có nội dung phải thêm cảnh báo mạnh hơn hoặc thùng rác tạm thời.

## Migration Plan

Không đổi schema, không cần migrate. Triển khai theo thứ tự: kho và test → IPC → giao diện. Hoàn tác: revert commit; dữ liệu chương đã tạo vẫn hợp lệ với bản cũ (bảng đã có từ v1).

## Open Questions

Cần chủ sản phẩm xác nhận trước khi làm (đổi câu trả lời sẽ đổi spec hoặc tasks):

1. **Nhóm chương theo Tập?** Hako nhóm mục lục theo tập; truyện dài kiểu web novel thường phẳng. Đề xuất: phẳng ở change này, thêm nhóm sau khi có nhu cầu thật.
2. **Số chương gốc:** giữ số thứ tự theo vị trí, ghi số nguồn vào tên chương (đề xuất), hay thêm trường riêng ngay?
3. **Có cho xóa chương** ở change này không (đề xuất có, kèm xác nhận)?
4. **Mở chương đưa "Chưa bắt đầu" thành "Đang dịch"** như D4 có ổn không?
