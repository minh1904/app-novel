## Context

Lý do và phạm vi: xem `proposal.md`; yêu cầu: xem `specs/`. Nền đã có:

- **Kho** (`linkFile.ts`): bảng `link` (n:m, `kind` `ai|user`, `confidence`, `status` `ok|needs_review|broken`, `reviewed_at`) và `link_member` (segment nào, thứ tự), `provenance` (nguồn gốc theo segment). `createLink`, `listLinks`, `setProvenance` đã có và có test nhưng **không có IPC**. Có trigger: xóa một segment đánh dấu `needs_review` cho liên kết `ok` dùng nó. `saveText` giữ ID segment nào còn trong danh sách, cấp ID cho segment không có `id`, xóa phần còn lại, kiểm `expectedRev`.
- **Chia lại và ánh xạ** (`segmentMap.ts`): `applyEdits`, `resegment` thuần, dùng chung giữa renderer và main (đã dùng ở editor).
- **Màn editor** (`ChapterWorkspace`): hai pane Toàn văn, tab "Từng câu" đang tắt, chặn rời xét hai editor.
- Chưa có job AI nên chưa có liên kết nào được tạo: mọi hàng bắt đầu *Chưa dịch*, hoặc cần ghép bản dịch viết ở Toàn văn.
- Quyết định sản phẩm: văn bản dịch là gốc, liên kết nằm bên trong; không ép 1:1 (decisions, "Nguyên tắc đi cùng quyết định"). Trạng thái hàng theo scope S1.4: Chưa dịch / AI đã dịch / Đã soát / Cần kiểm tra.

## Goals / Non-Goals

**Goals:**
- Soát và viết bản dịch từng hàng, trên **cùng một văn bản dịch** với mode Toàn văn: viết ở hàng thì hiện ở Toàn văn và ngược lại (qua ghép).
- Giữ dữ liệu nhất quán: văn bản, segment và liên kết đổi cùng nhau hoặc không đổi.
- Mô hình sẵn sàng cho job AI: chỉ cần ghi segment dịch và liên kết `ai` theo từng segment nguồn là hàng hiện đúng, trạng thái đúng.

**Non-Goals:** gộp/tách hàng; sửa liên kết nhiều–nhiều từ giao diện; căn chỉnh tự động bằng thuật toán thật; dùng chung lịch sử hoàn tác giữa hai mode; job dịch.

## Decisions

### D1. Hàng dựng ở renderer từ ba thứ có sẵn, bằng hàm thuần

`buildRows(source, target, links)` (trong `src/shared/contracts/rows.ts`) nhận hai `TextRecord` và danh sách liên kết, trả: `rows` (một hàng cho mỗi segment nguồn: `index`, `sourceId`, văn bản nguồn, `targetIds`, văn bản dịch của hàng, `state`, `linkIds`), cùng `unlinkedTargets` (segment dịch không thuộc liên kết nào) và `counts` theo trạng thái. Hàm thuần nên kiểm thử được độc lập, và dùng lại ở main khi cần tra một hàng.

Văn bản dịch của hàng lấy từ đầu segment dịch đầu tới cuối segment dịch cuối trong `target.content` (kể cả ký tự ngăn cách giữa chúng), vì với hàng nhiều câu đó là cách chữ nằm trong văn bản.

### D2. Bốn kênh IPC mới, hợp lệ hóa bằng valibot như các kênh hiện có

| Kênh | Vào | Ra |
| --- | --- | --- |
| `links:list` | `{ workId, chapterId }` | `{ links: LinkRecord[] }` |
| `rows:save` | `{ workId, chapterId, sourceId, text, expectedRev }` | `{ target: TextRecord, links: LinkRecord[] }` |
| `rows:review` | `{ workId, chapterId, sourceId }` | `{ links: LinkRecord[] }` |
| `rows:autopair` | `{ workId, chapterId }` | `{ links: LinkRecord[], paired: number }` |

`rows:save` trả cả văn bản dịch mới (để màn cập nhật revision và Toàn văn) lẫn danh sách liên kết hiện tại của chương. Mỗi kênh một transaction qua `changeChapters` (cũng làm mới chỉ mục thư viện). `LinkRecord` có thêm `reviewedAt`.

Phương án khác: đưa việc tính vùng văn bản về renderer rồi gọi `text:save` và `links:create` hai lần. Hai lần gọi không nguyên tử: lỗi giữa chừng để lại văn bản mới mà liên kết cũ hoặc không có; main đã có transaction và đủ dữ liệu (cả hai bên văn bản) nên đặt ở đó.

### D3. `saveRow` ở main: thay đúng vùng, chia lại đúng dòng, nối lại liên kết

Trong một transaction:

1. Đọc văn bản dịch (kiểm `expectedRev`, sai thì `conflict`), đọc segment và văn bản nguồn, đọc liên kết của chương.
2. Tìm các liên kết chứa `sourceId`. Liên kết có nhiều hơn một segment nguồn (n:m) làm thao tác bị từ chối với lỗi `validation` nêu lý do, vì chưa có cách sửa nó từ giao diện.
3. Vùng của hàng `[from, to)` = từ đầu segment dịch đầu tới cuối segment dịch cuối trong các liên kết đó. Nếu không có: vị trí chèn theo quy tắc spec (sau bản dịch của hàng gần nhất phía trước có bản dịch; không có thì trước hàng gần nhất phía sau; không có nữa thì cuối văn bản), với ký tự ngăn cách là `\
` nếu đoạn văn bản nguồn giữa hai segment nguồn tương ứng có xuống dòng, ngược lại một dấu cách.
4. Chuẩn hóa văn bản thành một đoạn. Dựng `Edit { from, to, insert }` (thay vùng; hoặc chèn kèm ngăn cách; hoặc, với văn bản trống, xóa vùng cùng một ký tự ngăn cách liền kề).
5. `applyEdits` rồi `resegment(newContent, segs, 'vi')`: ID segment ngoài vùng, kể cả cùng dòng, giữ nguyên.
6. Các segment dịch của hàng = segment nằm trong `[from, from + insert.length)` sau khi chia lại. Xóa liên kết cũ của hàng **trước** `saveText` (để trigger đánh dấu liên kết không chạm tới nó), `saveText`, rồi tạo liên kết mới `{ kind: 'user', status: 'ok', reviewedAt: now, members: [sourceId, ...segment dịch] }`, và `setProvenance` origin `human` cho segment dịch của hàng.

Phương án khác: lưu hàng thành "ô" riêng rồi ghép lại thành văn bản dịch khi cần. Hai nguồn sự thật cho cùng một chữ; quyết định sản phẩm là văn bản dịch toàn văn luôn hợp lệ và là gốc.

### D4. Trạng thái hàng là hàm của liên kết, không lưu riêng

`rowState(links)`: không segment dịch → `untranslated`; có liên kết `needs_review` hoặc `broken` → `check`; có liên kết `ai` mà `reviewedAt` null → `ai`; còn lại `reviewed`. Nhiều liên kết cho một hàng lấy trạng thái đáng chú ý nhất. Không thêm cột hay bảng: chỉ cần `reviewedAt` có sẵn trong schema. Hàng người dùng viết ra có `reviewedAt` ngay.

### D5. Ô bản dịch là `<textarea>` tự co giãn, không phải CodeMirror

Mỗi ô là một đoạn ngắn, không có segment hay lề trong nó, nên không cần cơ chế ánh xạ của editor dài. Một trang 50 hàng dùng 50 editor CodeMirror là quá nặng và vô ích. `<textarea>` bản địa nhận bộ gõ tiếng Việt đúng theo cách trình duyệt làm sẵn; việc "không lùi về textarea" của `source-editor` nói về trình soạn thảo văn bản dài, nơi cần ánh xạ segment. Vẫn phải thử tay Telex và VNI ở ô này (bảng ca riêng).

### D6. Ghi tuần tự, giữ chữ đang gõ

Hook `useSentenceRows` giữ `target` (để có `rev` hiện tại), `links` và hàng đợi ghi: mỗi lần ghi dùng `rev` của lần trả về gần nhất, nên Enter liên tiếp ở nhiều hàng không tự gây xung đột với chính mình. Trong khi ghi, ô giữ chữ đã gõ (trạng thái nháp theo hàng); ghi xong thì nháp bị bỏ và ô hiện chữ từ dữ liệu. Ghi lỗi giữ nháp, hiện lỗi dưới hàng, cho thử lại. Xung đột hiện thông báo riêng với nút "Tải lại" (đọc lại văn bản dịch và liên kết, bỏ nháp sau khi người dùng xác nhận) và nút sao chép chữ trong ô.

### D7. Chuyển mode bằng cách dựng lại editor, không dùng chung trạng thái

Hai mode không chia sẻ trạng thái chưa lưu. Sang Từng câu: nếu Toàn văn còn thay đổi chưa lưu thì `confirmLeave` (ba lựa chọn, `reloadOnDiscard`), rồi mode Toàn văn được gỡ khỏi DOM. Về Toàn văn: ghi hàng đang có nháp trước; `targetEpoch` tăng để `TextEditor` của bản dịch dựng lại trên `target` mới (và `record` của bản gốc đã đúng). Cái giá là lịch sử hoàn tác bắt đầu lại và pane bản gốc trở về trạng thái khóa; chấp nhận vì chia sẻ một `EditorState` giữa hai giao diện không cùng kiểu (hàng ô và văn bản dài) không đáng độ phức tạp, và ghi `shared-undo-modes` vào backlog (scope S1.6 muốn chung một lịch sử).

### D8. Ghép theo thứ tự là nút ở đầu màn, không phải bước bắt buộc

`rows:autopair` lấy các segment dịch chưa liên kết và các hàng chưa có bản dịch, theo thứ tự, nối từng cặp bằng liên kết `kind: 'ai'` (tạo tự động, không phải do người dùng), `status: needs_review`, `confidence` 0 (không có độ tin cậy thật). Trạng thái `needs_review` thắng `ai` ở D4 nên hàng hiện *Cần kiểm tra*, không bị gọi nhầm là "AI đã dịch". Không đổi văn bản, segment hay liên kết đã có. Ghép sai thì người dùng sửa ô (tạo liên kết mới) hoặc xác nhận.

### D9. Điều hướng và phân trang

Phân trang 50 hàng bằng `ChapterPager` có sẵn. "Hàng cần xử lý kế tiếp" tìm trong mảng `rows` (đã dựng sẵn) hàng đầu tiên sau chỉ số hàng đang chọn có `state !== 'reviewed'`, vòng lại; đổi trang và đặt focus bằng một `focusRow` state mà ô tương ứng đọc ở effect khi nó được dựng.

### D10. Cấu trúc mã

```text
src/shared/contracts/rows.ts                  kiểu Row, buildRows, rowState, schema valibot của bốn kênh
src/shared/contracts/rows.test.ts
src/main/infra/storage/sentenceRows.ts    saveRow, reviewRow, autoPair (dùng segmentMap, linkFile, textFile)
src/main/infra/storage/sentenceRows.test.ts
src/renderer/src/features/chapter/
  useSentenceRows.ts                nạp, hàng đợi ghi, xung đột, hành động
  SentenceMode.tsx                  đầu màn (đếm, nút), danh sách trang, hàng
```

### Số đo trong Electron thật

Đo ngày 2026-10-01 trên bản build (`out/`), dữ liệu tạm qua `MIRA_DATA_DIR`, Electron 44.4.5, Windows 11. Chương cực lớn: 5.000 hàng, bản gốc 205.999 ký tự (tiếng Trung), bản dịch 624.999 ký tự, 5.000 liên kết.

| Phép đo | Kết quả |
| --- | --- |
| Mở mode Từng câu (đọc văn bản dịch và 5.000 liên kết, dựng 5.000 hàng, vẽ 50 hàng) | 180–199 ms |
| Đổi trang (50 hàng) | 111–114 ms |
| Gõ trong một ô, xử lý mỗi phím (200 phím) | p50 4,3 ms, p95 7 ms, lớn nhất 8,9 ms |
| Ghi một hàng (IPC, 20 lần) | trung vị 135–143 ms, lớn nhất 164 ms |
| Ghép theo thứ tự 5.000 cặp | 464–562 ms |
| Đọc 5.000 liên kết | 39–43 ms |
| Nhảy tới hàng cần xử lý kế tiếp (đổi trang, đặt focus) | không có tác vụ dài |

Chương cỡ thường (500 hàng, bản dịch 35.599 ký tự, chạy trên kho trong Node): ghi một hàng trung vị 16 ms, lớn nhất 22 ms; ghép 500 cặp 39 ms.

Mục tiêu "dưới 100 ms" cho ghi một hàng đạt ở chương cỡ thường (16 ms) và **không đạt ở chương cực lớn** (135–143 ms): phần lớn là `saveText` ghi lại 5.000 segment (vị trí tuyệt đối của mọi segment sau chỗ sửa đổi) và đưa 5.000 liên kết qua IPC. Chấp nhận vì ghi diễn ra ở nền (ô giữ chữ đã gõ, giao diện không đứng), nhưng ghi lại ở đây nếu về sau cần hạ: trả về phần liên kết thay đổi thay vì cả danh sách.

Hai chỗ chậm do đo lộ ra và đã sửa trước khi đo lại: `createLink` liệt kê lại toàn bộ liên kết của chương sau mỗi liên kết tạo ra nên ghép 5.000 cặp mất **191 giây** (bậc hai), nay không liệt kê lại (0,5 giây); `listLinks` truy vấn thành viên từng liên kết một (5.000 truy vấn), nay một truy vấn (ghi một hàng từ 447 ms xuống 143 ms cùng với việc chuẩn bị câu lệnh một lần trong `saveText` và không đọc lại danh sách liên kết khi không có liên kết nào khác bị đụng tới).

Kiểm tra khác trong Electron thật (đều đạt): viết bản dịch từ chương trống bằng Enter xuống từng hàng (đúng thứ tự, đúng chỗ xuống dòng theo bản gốc, hàng thành *Đã soát*), rời ô không sửa không ghi (revision không đổi), sửa một hàng bằng cách rời ô, xóa trắng một hàng (không dấu cách đôi, hàng về *Chưa dịch*), sang Toàn văn thấy đúng văn bản đã ghi, chuyển Từng câu khi Toàn văn chưa lưu thì hỏi ba lựa chọn và "Lưu rồi tiếp tục" chuyển được, bản dịch viết sẵn ở Toàn văn hiện thông báo chưa ghép và "Ghép theo thứ tự" nối đúng 4 cặp (hàng thừa vẫn *Chưa dịch*, văn bản không đổi), Ctrl+Enter xác nhận rồi nhảy tới hàng cần xử lý kế tiếp, nút "Hàng cần xử lý kế tiếp", xung đột (chữ trong ô còn nguyên, kho không đổi, "Tải lại"), 940 px sáng và tối không cuộn ngang, Tab đi từ ô sang ô. Phát hiện và sửa trong lúc thử: ô tự co giãn tính chiều cao một lần nên cắt chữ khi bố cục chưa có đủ chiều rộng, nay tính lại khi chiều rộng đổi và khi phông tải xong.

## Risks / Trade-offs

- **[Chia lại dòng làm đổi segment của hàng khác cùng dòng]** → Chia lại chỉ chạy trên dòng bị đụng và giữ ID theo vùng trùng; segment đã do cùng bộ chia câu tạo nên được chia lại giống hệt. Có test: hai hàng cùng dòng, sửa một hàng, hàng kia giữ ID, văn bản và liên kết.
- **[Ước đoán của ghép theo thứ tự sai khi hai bên lệch]** → Luôn ghi là *Cần kiểm tra*, không đổi văn bản, người dùng sửa từng hàng; gộp/tách hàng (cách sửa đúng) thuộc `merge-split-rows`.
- **[Ghi một hàng ghi lại cả văn bản dịch dài]** → `saveText` đã ghi cả văn bản mỗi lần; đo thời gian một lần ghi với bản dịch 400.000 ký tự và 5.000 hàng, kỳ vọng dưới 100 ms (đo ở bước kiểm chứng).
- **[Mất lịch sử hoàn tác khi đổi mode]** → Nói rõ trong giao diện không cần thiết; ghi vào backlog `shared-undo-modes`.
- **[Hàng thuộc liên kết nhiều–nhiều không sửa được]** → Từ chối với lý do rõ; hiện tại không có cách nào tạo liên kết như vậy từ giao diện.

## Migration Plan

Không đổi schema và không đổi dữ liệu có sẵn; chương chưa có liên kết vẫn hợp lệ (mọi hàng *Chưa dịch*). Hoàn tác: revert commit; liên kết đã tạo vẫn hợp lệ với bản cũ (bảng có sẵn).

## Open Questions

1. **Kích thước trang** 50 hàng: chốt theo cảm nhận khi thử; không đổi spec.
2. **Có lọc theo trạng thái** (chỉ hiện hàng cần xử lý): hiện có "Hàng cần xử lý kế tiếp"; bộ lọc để sau nếu cần.
