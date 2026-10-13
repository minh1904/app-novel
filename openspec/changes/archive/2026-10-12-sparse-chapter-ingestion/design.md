## Context

Xem `proposal.md` để biết động lực và bối cảnh vấn đề.

Trong Mira, bảng `chapter` sử dụng cột `position INTEGER` dày đặc (hoán vị liên tục từ 0 đến $N-1$, gapless permutation). Bảng `source_catalog_item` lưu danh mục nguồn ngoài với `ordinal_key` dạng chuỗi (ví dụ: `000001`, `000010`) được sắp xếp theo đúng thứ tự phát hành của nguồn raw.

Hiện tại:
- `deps.library.createChapter` luôn dùng `position = count(*)` để append vào cuối danh sách.
- `matching.ts` sử dụng `ch.number` (vốn là `position + 1`) để ghép nối, dẫn tới việc ghép sai khi tác phẩm có các chương ngắt quãng.
- Renderer phụ thuộc hoàn toàn vào `chapter.number` để hiển thị số thứ tự, dẫn tới việc tải lẻ một chương bị hiển thị sai số hiệu thực tế.

## Goals / Non-Goals

**Goals:**
- Đảm bảo thứ tự tương đối của các chương tải về luôn phản ánh đúng `ordinal_key` của nguồn raw mà không sinh các bản ghi chương rỗng (ghost chapters).
- Ngăn chặn việc chương tải sau đè lên các chương mở đầu/chương nhập thủ công nằm trước bản raw.
- Xử lý xung đột trật tự nhất quán khi người dùng đã tự hoán đổi vị trí chương thủ công trước đó.
- Cung cấp tính năng 1-click cho phép người dùng khôi phục trật tự toàn bộ chương đã tải theo đúng nguồn raw gốc.
- So khớp đa nguồn bền vững, không bị lệch (drift) khi có khoảng khuyết và không bắt nhầm số lượng/năm trong tiêu đề.
- Hỗ trợ tải theo dải (`1, 5, 10-25`) xử lý ở backend, độc lập với phân trang 50 mục của giao diện và tuân thủ rate-limit 1 req/giây của network broker.
- Hiển thị chỉ báo khoảng khuyết (Gap Indicator) trực quan và cung cấp điều hướng qua khoảng khuyết thông minh trong Editor mà không làm xáo trộn luồng làm việc.

**Non-Goals:**
- Thay đổi cấu trúc cơ sở dữ liệu phân cấp cây (Act/Volume/Tree): Giữ nguyên schema phẳng hiện tại của SQLite trong `chapterFile.ts`.
- Tự động xóa hoặc đồng bộ ngược từ Mira lên web raw.
- Bỏ qua rate-limit để tải song song hàng loạt: Vẫn tuân thủ nghiêm ngặt 1 request/giây trên Kakuyomu để bảo vệ IP người dùng.

## Decisions

### 1. Chèn vị trí tương đối hai chiều & Xử lý xung đột khi người dùng tự đổi chỗ
- **Quyết định:** Khi tải một `source_catalog_item` ($X$) của một binding:
  1. Tìm trong bảng `source_catalog_item` của cùng binding các mục đã có `chapter_id IS NOT NULL`.
  2. Xác định tiền nhiệm $P$ (mục có `ordinal_key < X.ordinal_key` lớn nhất) và kế nhiệm $S$ (mục có `ordinal_key > X.ordinal_key` nhỏ nhất).
  3. Tính toán `targetPosition`:
     - **Trường hợp có cả $P$ và $S$:**
       - Nếu $P.chapter.position < S.chapter.position$ (trật tự tương đối nhất quán): `targetPosition = S.chapter.position` (chèn ngay trước kế nhiệm $S$, bảo toàn các chương ngoại lai/nhập tay đứng sau $P$).
       - Nếu $P.chapter.position \ge S.chapter.position$ (người dùng đã cố tình đảo ngược vị trí hai mốc này): **Ưu tiên tiền nhiệm $P$**, gán `targetPosition = P.chapter.position + 1` (chương mới luôn nối tiếp diễn biến của chương trước nó).
     - **Trường hợp chỉ có $P$:** `targetPosition = P.chapter.position + 1`.
     - **Trường hợp chỉ có $S$:** `targetPosition = S.chapter.position`.
     - **Trường hợp không có cả $P$ lẫn $S$:** (chương đầu tiên được tải của binding này): chèn vào cuối danh sách hiện tại (`targetPosition = count(*)`).
  4. Thực hiện transaction: dịch chuyển `position = position + 1` cho tất cả các chương có `position >= targetPosition`, sau đó chèn chương mới tại `targetPosition`.
- **Lý do:** 
  - Đảm bảo trật tự tương đối bảo toàn giữa các chương raw.
  - Bảo vệ các chương dẫn nhập thủ công (như "Lời mở đầu" ở vị trí 0) không bị đè lên đầu.
  - Khi người dùng đã tự xếp chương lộn xộn, chương mới luôn bám theo chương đứng trước nó ($P$), tạo luồng đọc liên tục thay vì nhảy về vị trí ngẫu nhiên.
- **Phương án thay thế bị loại:** 
  - Tạo ghost chapters với cờ `is_placeholder = 1`: gây phình to DB, phức tạp hóa logic đếm từ và phân trang.
  - Gán cứng `targetPosition = 0` khi không có $P$: làm đè lên các chương mở đầu tự tạo của người dùng.

### 2. Tính năng "Khôi phục thứ tự theo nguồn raw" (Reorder by Raw Catalog)
- **Quyết định:**
  - Bổ sung IPC handler `sources:catalog:reorder-by-source`: Nhận `{ workId, bindingId }`.
  - Trong transaction SQLite:
    1. Lấy danh sách toàn bộ chương của tác phẩm kèm thông tin `ordinal_key` (nếu có) từ `source_catalog_item` của binding chỉ định.
    2. Sắp xếp lại: Các chương liên kết với binding được sắp xếp tăng dần theo `ordinal_key`. Các chương không thuộc binding này (chương nhập tay, chương từ binding khác) giữ nguyên vị trí tương đối hoặc được bảo toàn ở đầu/cuối theo cấu hình.
    3. Đánh lại chỉ số `position` liên tục từ 0 đến $N-1$ cho toàn bộ bảng `chapter`.
  - Trên UI (`ChaptersArea.tsx`), bổ sung nút "Sắp xếp theo nguồn raw" trong menu thao tác kèm hộp thoại xác nhận.
- **Lý do:** Cung cấp đường lui (escape hatch) an toàn cho người dùng nếu họ đã lỡ tay kéo thả làm xáo trộn danh sách, cho phép đưa toàn bộ tác phẩm về trật tự chuẩn của nguồn gốc chỉ với 1 click.
- **Phương án thay thế bị loại:** Bắt người dùng tự kéo thả thủ công lại từng chương một (cực kỳ mất thời gian khi danh sách có hàng chục chương).

### 3. So khớp đa nguồn bền vững với chuẩn hóa ký tự và regex nghiêm ngặt
- **Quyết định:** Sửa hàm `generateMatchingPreview` và `extractChapterNumber` trong `matching.ts`:
  1. **Chuẩn hóa chữ số full-width:** Chuyển đổi các chữ số dạng full-width tiếng Nhật (`０-９`) sang half-width ASCII (`0-9`) trước khi phân tích.
  2. **Siết chặt regex số chương:** Chỉ nhận diện số khi có tiền tố từ khóa rõ ràng (`chương`, `chapter`, `ch`, `hồi`, `tập`, `thứ`, `第`) hoặc số đứng ở đầu dòng theo sau bởi ký tự phân cách (`^\s*(\d+)[\s.:-]` hoặc `第\s*(\d+)\s*[話章]`). Loại bỏ hoàn toàn tiền tố tùy chọn lơ lửng giữa câu để không bắt nhầm các số như "2024" hay "3 người".
  3. **Tầng Fallback khi tiêu đề thuần chữ:** Nếu tiêu đề chương trong Mira không chứa số (ví dụ: "Khởi hành", "Tái ngộ"), hệ thống sử dụng thứ tự danh mục tương đối (`order`) kèm đánh dấu độ tin cậy để người dùng xác nhận trên preview, thay vì ép đánh dấu `unmatched` toàn bộ.
- **Lý do:** Loại bỏ triệt để hiện tượng ghép nhầm bản raw khi tác phẩm có khoảng khuyết, đồng thời hỗ trợ đầy đủ các định dạng tiêu đề tiếng Nhật từ Kakuyomu.
- **Phương án thay thế bị loại:** 
  - Dùng `ch.number`: bị lệch ngay khi tác phẩm có chương ngắt quãng.
  - Ép người dùng map thủ công 100% khi không có số: làm giảm trải nghiệm sử dụng với tiểu thuyết dài.

### 4. Tải theo dải qua Backend Job độc lập với phân trang Renderer
- **Quyết định:**
  1. Thêm helper `parseRangeString(raw: string): number[]` trong `src/shared/text/rangeParser.ts` hỗ trợ cú pháp `1, 5, 10-25`. Tự động loại bỏ số trùng lặp và sắp xếp tăng dần.
  2. Bổ sung IPC handler `sources:catalog:download-range`: Nhận `{ workId, bindingId, range: string }`.
  3. Handler truy vấn trực tiếp bảng `source_catalog_item` trong SQLite bằng điều kiện `ordinal_key` hoặc chỉ số vị trí, lọc ra danh sách các mục công khai chưa tải.
  4. Thực hiện tải tuần tự từng chương qua network broker, commit từng chương vào DB ngay khi tải xong.
  5. Phát sự kiện tiến độ qua IPC (`sources:download:progress`: `{ current, total, itemTitle }`) để Renderer hiển thị ProgressBar.
- **Lý do:** Bỏ qua giới hạn 50 mục/trang của DOM hiển thị trong `SourcesArea.tsx`. Tiến trình tải được quản lý ở Main process nên người dùng có thể đóng modal hoặc chuyển tab mà không sợ bị đứt gãy tiến trình.
- **Phương án thay thế bị loại:** Chạy vòng lặp tải ở phía Renderer UI (dễ đứt gãy khi đổi màn hình, không thể chọn các chương ở trang sau của phân trang).

### 5. Hiển thị khoảng khuyết và làm sạch số chương nhất quán
- **Quyết định:**
  1. **Làm sạch số chương hiển thị:** Bổ sung hàm tiện ích `formatChapterLabel(chapter: ChapterItem): string`. Nếu `displayTitle(chapter)` đã tự bắt đầu bằng tiền tố số rõ ràng (ví dụ: `^Chương\s+\d+`, `^Chapter\s+\d+`, `^\d+[\s.:-]`), hiển thị nguyên văn tiêu đề. Chỉ khi tiêu đề thuần chữ hoặc rỗng mới gắn tiền tố `{chapter.number}.`. Áp dụng đồng bộ trên cả `ChapterNavSidebar.tsx` và `ChaptersArea.tsx`.
  2. **Tìm kiếm & Nhảy chương thông minh:** Nâng cấp `parseQuery` trong `chapterList.ts` để khi người dùng gõ số $N$ vào ô tìm kiếm: tìm khớp theo cả `chapter.number === N` lẫn số hiệu trích xuất từ tiêu đề `extractChapterNumber(chapter.title) === N`.
  3. **Gap Indicator:** So sánh hai chương liền kề trong danh sách:
     - Nếu trích xuất được số chương từ tiêu đề của cả hai và hiệu số chênh lệch $> 1$ (ví dụ Chương 2 và Chương 10 -> khuyết 7 chương), render thanh phân cách `ChapterGapItem` thông báo số chương khuyết.
- **Lý do:** Giữ giao diện gọn gàng, loại bỏ tình trạng số lặp (`1. Chương 10`), đồng thời không phá vỡ invariant `position` liên tục của SQLite.
- **Phương án thay thế bị loại:** Thay đổi schema SQLite để thêm cột `chapter_number` (đòi hỏi migration toàn bộ work database hiện hữu và cập nhật hàng loạt bảng liên quan).

### 6. Điều hướng qua khoảng khuyết thân thiện trong Editor
- **Quyết định:**
  1. Bổ sung phím tắt chuyển chương trong `ChapterWorkspace.tsx`: `Alt+Down` (chương kế tiếp) và `Alt+Up` (chương trước đó).
  2. Khi người dùng bấm chuyển tới chương kế tiếp từ Chương $A$:
     - Nếu chương kế tiếp có sẵn trong tác phẩm là $B$ mà giữa $A$ và $B$ có khoảng khuyết, đồng thời nguồn raw primary còn chương chưa tải liền kề ($A+1$):
     - Hệ thống **không tự ý nhảy thẳng tới Chương $B$**. Thay vào đó, hiển thị thanh thông báo nhỏ hoặc popover tại chỗ: *"Chương liền kề chưa có trong tác phẩm. [Tải & Mở chương tiếp] hoặc [Chuyển tới {B.title}]"*.
     - Tuân thủ cơ chế `leaveGuard` nếu chương hiện tại đang có nội dung chưa lưu.
- **Lý do:** Tránh việc màn hình giật cục nhảy tới chương xa rồi lại phải nhảy lùi về nếu người dùng muốn đọc/dịch tuần tự.
- **Phương án thay thế bị loại:** Tự động nhảy cóc tới Chương $B$ rồi mới hiển thị thông báo (gây giật màn hình, tốn tài nguyên render chương không mong muốn và dễ gây lỗi mất bản nháp).

## Risks / Trade-offs

- **[Người dùng tự kéo thả đổi vị trí chương (`moveChapter`)]**  
  ➔ *Giảm thiểu:* Khi chèn thêm chương mới, hệ thống ưu tiên bám theo tiền nhiệm $P$. Đồng thời người dùng luôn có nút "Sắp xếp theo nguồn raw" để đưa toàn bộ về trật tự chuẩn của tác giả chỉ bằng 1 thao tác.
- **[Thời gian tải dải lớn kéo dài do rate limit]**  
  ➔ *Giảm thiểu:* Tải tuần tự ở backend có progress bar rõ ràng, cho phép người dùng dừng (cancel) bất cứ lúc nào qua signal. Mỗi chương hoàn thành được commit ngay vào DB, không bị mất dữ liệu đã tải nếu bị gián đoạn giữa chừng.
