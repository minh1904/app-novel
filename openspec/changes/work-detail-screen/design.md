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

**Non-Goals:** nội dung chương và editor, trạng thái dịch từng chương, số từ, nhóm theo tập, xóa tác phẩm, kéo thả, nhập nhiều chương một lần (chỉ có bản minh họa), lịch sử thay đổi/hoàn tác xóa chương.

## Decisions

### D1. Bố cục màn chi tiết

```text
 Thư viện › Hiệu thuốc trên núi
 ┌────────────────────────────────────────────────────────────────────────┐
 │ ┌──────┐  Hiệu thuốc trên núi                       [ ▶ Tiếp tục ] ⋯   │
 │ │ bìa  │  山中药铺 · Lý Minh · Tiên hiệp, cổ đại        [ Sửa thông tin ] │
 │ │ 2:3  │  (Đang dịch) Trung giản thể → Việt · 248 chương · sửa hôm nay   │
 │ └──────┘  Mô tả… (thu gọn, "Xem thêm")                                    │
 ├────────────────────────────────────────────────────────────────────────┤
 │  Chương (248)    [ Tìm chương hoặc nhập số… ]        [ + Thêm chương ]   │
 │  ┌─────┬──────────────────────────────────────────┬────────────┬──────┐ │
 │  │  1  │ Mở đầu                                   │ hôm nay    │  ⋯   │ │
 │  │  2  │ Chương 2                                 │ hôm qua    │  ⋯   │ │
 │  │ …   │                                          │            │      │ │
 │  └─────┴──────────────────────────────────────────┴────────────┴──────┘ │
 │            1–50 trong 248 chương          [ ‹  1  2  3  …  5  › ]      │
 └────────────────────────────────────────────────────────────────────────┘
```

Ở cửa sổ hẹp, bìa xếp trên thông tin và các nút xuống hàng riêng. Nút chính là "Tiếp tục" khi có chương gần nhất, ngược lại "Thêm chương". Menu `⋯` của tác phẩm dùng lại các hành động của thư viện (tạm dừng/tiếp tục, lưu trữ, đổi/gỡ bìa).

Thanh năm tab trong [mockup nghiên cứu](../../../docs/handbook/research/work-detail-screen.md) là bản phác trước quyết định ngày 2026-10-01. Cấu trúc đã chốt là **Chương · Ngữ cảnh · Nguồn · Tác vụ**, với Thuật ngữ, Xưng hô và Văn phong trong Ngữ cảnh ([change điều hướng](../work-area-navigation/proposal.md)). Change này xây **khung** (D10) và vùng **Chương**; chưa vẽ thanh tab một mục và không tạo tab rỗng dẫn tới màn chưa có. Các khu vực khác được đưa vào khung khi có màn và luồng làm việc thật.

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

**Số đo ở tầng kho** (2026-10-01, Windows, trung vị của 5 lần, mở tệp + transaction + đọc lại tác phẩm cho mỗi lần gọi; "chuyển" và "xóa" có thêm một lần liệt kê trong phép đo):

| Thao tác | 2.000 chương | 5.000 chương |
| --- | --- | --- |
| Liệt kê | 3,3 ms | 6,8 ms |
| Thêm / đổi tên / mở | ≈5 ms | ≈5 ms |
| Chuyển cuối → đầu (dồn nhiều nhất) | 16 ms | 49 ms |
| Chuyển một bậc ở giữa | 4,6 ms | 7,2 ms |
| Xóa chương đầu | 15 ms | 41 ms |
| Kích thước JSON của danh sách | 231 KB | 579 KB |

Chấp nhận được; chưa cần trả phần thay đổi thay vì cả danh sách cho `move`/`delete`. Độ trễ IPC và vẽ giao diện đo riêng ở task 7.1.

### D4. Chương gần nhất và trạng thái

`chapters:open` đặt `work.last_chapter_id`, cập nhật `updated_at`, và chuyển `not-started` thành `in-progress` (không đụng `paused`). Không tạo cột mới: "chương gần nhất" và "lần sửa gần nhất" dùng chung `updated_at` cho đến khi có editor. Đánh đổi: chỉ mở xem một chương cũng đẩy tác phẩm lên đầu mục "Gần đây". Chấp nhận ở giai đoạn này; nếu gây phiền, thêm cột `last_opened_at` bằng migration v4.

### D5. Sửa thông tin: hộp thoại dùng chung form với màn tạo

Tách phần thân của `CreateWorkScreen` thành `WorkForm` (tên, ngôn ngữ, tên gốc, tác giả, thể loại, mô tả, `CoverPicker`) dùng cho cả tạo và sửa; ở chế độ sửa, ngôn ngữ nguồn hiển thị nhưng bị khóa. Sửa mở trong hộp thoại (không phải trang riêng) để giữ ngữ cảnh. Để lưu thông tin và bìa **nguyên tử**, mở rộng `workPatchSchema` bằng `cover` (`null` để gỡ, vắng mặt để giữ) và xử lý trong cùng transaction của `library.update`; kênh `works:cover:set` vẫn dùng cho menu đổi/gỡ bìa nhanh.

### D6. Danh sách nhiều chương: phân trang, không thêm thư viện ảo hóa

Hiển thị mặc định 50 chương mỗi trang, cho chọn 50 hoặc 100. Thanh cuối danh sách cho biết khoảng đang xem, tổng kết quả và trang hiện tại, kèm chuyển trang bằng bàn phím. `chapters:list` vẫn trả toàn bộ tóm tắt chương; renderer lọc trên toàn mảng trong bộ nhớ rồi cắt trang hiển thị. Khi đổi bộ lọc hoặc cỡ trang, về trang 1. "Nhảy tới số N" xác định trang chứa chương N, chuyển tới đó và làm nổi bật hàng. Sau khi thêm chương, xóa bộ lọc nếu đang bật, mở trang cuối và làm nổi bật chương mới (focus ở lại ô nhập); sau khi xóa chương cuối của một trang, quay về trang trước. Khi chuyển vị trí chương qua ranh giới trang, mở trang chứa vị trí mới. Hàng dùng `React.memo` để đổi tên một chương không vẽ lại cả trang.

Phân trang thay phương án “Hiện thêm 100 chương” sau phản hồi người dùng ngày 2026-10-01. Phương án khác: thư viện ảo hóa như TanStack Virtual (mượt hơn ở hàng chục nghìn hàng nhưng thêm dependency, chiều cao hàng phải cố định, khó với focus và tìm bằng trình duyệt). Chưa cần. **Số đo trong Electron thật** (2026-10-01, đo từ lúc thao tác tới lúc giao diện đã đổi, kèm PerformanceObserver cho tác vụ dài > 50 ms):

| Thao tác | 2.000 chương | 5.000 chương |
| --- | --- | --- |
| Mở màn chi tiết → trang đầu hiện | 81 ms | 57 ms |
| Sang trang kế | 38 ms | 34 ms |
| Nhảy tới chương gần cuối | 50 ms | 39 ms |
| Gõ "gap go" → kết quả lọc | 72 ms | 57 ms |
| Thêm chương (Enter → số chương đổi) | 31 ms | 86 ms |
| Chuyển chương cuối → đầu (qua menu) | 110 ms | 97 ms |
| Đổi tên tại chỗ | 16 ms | 24 ms |
| Xóa chương đầu (xác nhận → số chương đổi) | 72 ms | 78 ms |

Không có tác vụ dài nào ở cả hai cỡ; không cần ảo hóa.

### D7. Thao tác trên một chương

- **Thêm:** nút "Thêm chương" mở hàng nhập ở đầu danh sách; Enter thêm chương vào cuối và giữ hàng nhập để thêm tiếp; Esc đóng. Sau khi thêm, danh sách chuyển tới trang cuối và làm nổi bật chương mới; focus ở lại ô nhập để thêm tiếp mà không rời bàn phím. Hàng nhập dính ở đầu danh sách (sticky) nên vẫn thấy khi danh sách cuộn tới chương mới.
- **Đổi tên:** tại chỗ (menu → Đổi tên, hoặc F2 khi đang ở tên chương); Enter hoặc rời ô thì lưu, Esc hủy, rỗng đưa về "Chương N". Không dùng nhấp đôi vì nhấp một lần đã mở chương.
- **Chuyển vị trí:** menu có Chuyển lên, Chuyển xuống, Lên đầu, Xuống cuối và "Chuyển tới vị trí…" (hộp thoại nhập số). Không kéo thả (khó dùng với hàng nghìn chương và không truy cập được bằng bàn phím).
- **Xóa:** hộp xác nhận nêu tên chương, cảnh báo không hoàn tác. Khi chưa có nội dung chương, việc này chỉ mất tên và vị trí; khi có nội dung (change sau) hộp thoại phải nêu rõ sẽ mất bản gốc và bản dịch và gợi ý sao lưu.
- **Mở:** bấm tên chương hoặc Enter gọi `chapters:open` rồi tới màn "editor chưa xây" của chương (có nút về màn chi tiết).

### D8. Điều hướng

`View` thêm `{ name: 'work', workId }` (màn chi tiết) và `{ name: 'chapter', workId, chapterId }` (chỗ giữ chỗ editor). "Mở tác phẩm", mục thanh bên và breadcrumb tới `work`; "Tiếp tục" gọi `chapters:open` rồi tới `chapter`. Trạng thái đầu trang nằm trong hook `useWorkDetail(workId)` (tác phẩm + hành động tác phẩm), còn danh sách chương và hành động chương nằm trong hook của `ChaptersArea` (xem D10); cả hai tách khỏi `useLibrary` vì chu kỳ sống khác nhau. Thao tác chương trả `work` mới để đầu trang cập nhật. Khi đóng màn, thư viện tải lại để chỉ mục hiển thị đúng.

### D9. Kiểm thử

- Test kho: bất biến vị trí liền mạch sau mỗi thao tác, **test ngẫu nhiên so với mô hình đơn giản** (dãy thao tác thêm/đổi tên/chuyển/xóa ngẫu nhiên; kết quả kho phải bằng kết quả trên một mảng thuần), chương gần nhất bị xóa, ID thuộc tác phẩm khác, chỉ mục khớp sau mỗi thao tác, và mở rộng test kill tiến trình sang thao tác chương.
- Test IPC như mẫu hiện có (đầu vào sai kiểu, người gửi không tin cậy).
- Hàm thuần của renderer (lọc không dấu theo tên chương, phân tích ô "tìm hoặc nhảy tới", tính trang chứa chương và cắt trang) có test riêng.
- Chạy trong Electron thật với tác phẩm 2.000 và 5.000 chương để đo thời gian mở màn, đổi trang, thêm chương và chuyển vị trí, và chụp màn hình các trạng thái chính.

### D10. Khung màn: đầu trang + danh mục khu vực

`WorkDetailScreen` chỉ làm khung: lấy tác phẩm bằng `useWorkDetail(workId)` cho **đầu trang** (breadcrumb, thông tin, nút chính, menu, hộp thoại sửa), và render **vùng nội dung** từ một danh mục khu vực.

```ts
type WorkArea = {
  id: 'chapters' | 'context' | 'sources' | 'jobs'  // thứ tự cố định, theo work-area-navigation
  label: string
  render: (props: { workId: string }) => ReactNode  // khu vực tự nạp dữ liệu của mình
}
const workAreas: WorkArea[] = [chaptersArea]        // chỉ đăng ký khi màn đã dùng được
```

- `ChaptersArea` sở hữu hook chương, phân trang, lọc và hộp thoại của chương; đầu trang chỉ cần `chapterCount`, chương gần nhất và kết quả `work` do thao tác chương trả về. Vì vậy khu vực mới không đụng đầu trang.
- Có một khu vực: render thẳng, không thanh tab. Từ hai khu vực (hiện là bốn, ba khu vực sau là minh họa): thanh tab accessible (Base UI nếu design system đã dùng), mặc định `chapters`, trạng thái chọn nằm trong state của màn (không lưu bền), focus chuyển tới tiêu đề khu vực khi đổi.
- Mỗi khu vực có error boundary riêng, để lỗi một khu vực không làm sập đầu trang.
- Kiểm bằng test với danh mục thử có 2–4 khu vực giả; không thêm khu vực giả vào bản chạy.
- Quan hệ với change `work-area-navigation`: change đó giữ cấu trúc dài hạn (thứ tự bốn khu vực, mục con Ngữ cảnh, quy tắc "chỉ hiện khi sẵn sàng") và không còn sở hữu phần dựng khung.

Phương án khác: để `WorkDetailScreen` render thẳng danh sách chương rồi tách khung sau (rẻ bây giờ, nhưng tách sau đụng cả hook, trạng thái trang và điều hướng cùng lúc); hoặc vẽ đủ bốn tab ngay (trái quyết định 2026-10-01 vì tạo lời hứa chưa thực hiện).

### D11. Minh họa tính năng chưa triển khai và backlog

Theo nguyên tắc roadmap "giao diện xem được sớm", chủ sản phẩm muốn thấy các luồng chưa làm để biết còn việc gì. Mỗi tính năng như vậy là một **mục minh họa** khai báo ở một nơi (`mockFeatures`: `id`, nhãn, mô tả, đường dẫn mục backlog), render nhãn "Sắp có" và hộp thoại minh họa chung với dữ liệu mẫu cố định. Mục minh họa không có IPC, không đọc tệp, không ghi dữ liệu; thiếu mục backlog tương ứng thì test fail (đọc `docs/handbook/delivery/backlog.md` và kiểm `id`). Ngày 2026-10-01 chủ sản phẩm yêu cầu thấy thanh tab ngay, nên Ngữ cảnh, Nguồn và Tác vụ cũng được đăng ký dưới dạng minh họa (`soon: true`, nhãn "Sắp có" trên tab, `MockAreaPanel` chỉ mô tả, không dữ liệu). Việc này **thay** nguyên tắc trước đó là "không vẽ tab chưa có màn"; quyết định gốc ghi ở [decisions](../../../docs/handbook/product/decisions.md). Khi một khu vực thành thật, bỏ `soon` và thay `render`.

Minh họa đầu tiên: **Nhập chương từ tệp .txt** (nút cạnh "Thêm chương" và trong trạng thái trống). Hộp thoại minh họa các bước: chọn tệp (tên mẫu), quy tắc tách chương (đề xuất: dòng bắt đầu bằng `***` là tên chương, như Hako), xem trước danh sách chương mẫu, nhập (vô hiệu). Quy tắc tách và giới hạn chỉ là đề xuất để thảo luận, chưa chốt. Các minh họa khác (cột "có raw/có bản dịch", lối vào glossary/xưng hô) nằm trong backlog, chưa có minh họa trên UI.

Phương án khác: chỉ ghi backlog không minh họa (không thấy được luồng); hoặc làm thật ngay (vượt phạm vi, cần đặc tả định dạng tệp, mã hóa và xử lý lỗi).

## Risks / Trade-offs

- **Số thứ tự suy ra từ vị trí không biểu diễn được đánh số theo nguồn** (bắt đầu từ chương 101, "Ngoại truyện", chương gộp) → người dùng ghi vào tên chương; nếu thực tế cần, thêm trường "số chương gốc" bằng migration sau. Đây là quyết định cần chủ sản phẩm xác nhận.
- **`updated_at` dùng chung cho "sửa" và "mở"** → xem D4; có đường thoát rẻ.
- **Phân trang có thể ngắt mạch duyệt chương liên tục** → giữ tìm và nhảy tới số trên toàn tác phẩm; thử với mục lục dài và đo tốc độ chuyển trang.
- **Trả cả danh sách sau `move`/`delete`** → đo; nếu chậm thì trả phần thay đổi.
- **Xóa chương không hoàn tác** → hiện chưa có nội dung nên chi phí thấp; khi có nội dung phải thêm cảnh báo mạnh hơn hoặc thùng rác tạm thời.

## Migration Plan

Không đổi schema, không cần migrate. Triển khai theo thứ tự: kho và test → IPC → giao diện. Hoàn tác: revert commit; dữ liệu chương đã tạo vẫn hợp lệ với bản cũ (bảng đã có từ v1).

## Open Questions

Đã được chủ sản phẩm xác nhận ngày 2026-10-01 (không còn câu hỏi mở cho change này):

1. **Nhóm chương theo Tập:** danh sách phẳng. Chương có ID riêng nên thêm nhóm sau không phải làm lại.
2. **Số chương gốc:** số thứ tự theo vị trí; số nguồn (101, "Ngoại truyện") ghi trong tên chương. Thêm trường riêng bằng migration nếu thực tế cần.
3. **Xóa chương:** có, kèm xác nhận. Khi có nội dung chương, change đó phải thêm cảnh báo mạnh hơn hoặc thùng rác.
4. **Mở chương đổi "Chưa bắt đầu" thành "Đang dịch":** có, trừ khi đang "Tạm dừng" (D4).
