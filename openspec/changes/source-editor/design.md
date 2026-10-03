## Context

Lý do và phạm vi: xem `proposal.md`; yêu cầu: xem `specs/`. Nền đã có và ràng buộc cách làm:

- **Kho** (`saveText` trong `src/main/infra/storage/textFile.ts`): thay văn bản và toàn bộ segment của một bên trong một transaction, kiểm `expectedRev` (sai thì `conflict`), từ chối vùng chồng nhau hoặc vượt văn bản. Segment gửi kèm `id` thì giữ ID (ID phải đã thuộc chương và bên này, nếu không là `validation`); **segment không có `id` thì kho cấp ID mới**; segment cũ không có mặt trong danh sách bị xóa và liên kết dùng nó chuyển `needs_review`. Mọi segment được ghi `status = 'ok'`. Hệ quả cho thiết kế: editor không tự đặt ID cho segment mới; segment đã sửa nhưng còn giữ ID **không** làm liên kết của nó bị đánh dấu (xem Risks).
- **Chia câu** (`src/shared/algorithms/segmenter.ts`): `segment(text, lang)` trả vùng UTF-16, mỗi segment một câu, không vắt qua dòng, bỏ khoảng trắng hai đầu. Dùng lại cho việc chia lại vùng đã sửa; không viết bộ chia câu thứ hai.
- **Màn chương** (`ChapterScreen`, `SegmentList`) đang hiển thị chỉ đọc; `useChapterScreen` đã giữ `source: TextRecord` (`content`, `rev`, `segments`) và có `applySource`.
- **ADR-003** chọn CodeMirror 6 với một `EditorState` dùng chung, đo 0,3–0,5 ms mỗi phím với 200.000 ký tự và 1.000 segment, và ghi điều kiện xem lại là "IME thất bại trên CM6 nhưng qua trên `<textarea>`". Chủ sản phẩm đã chốt **không** có đường lùi này; xem D8.
- Electron 44 (Chromium 149+ dòng lỗi mất lần gõ IME đầu tiên ở `contenteditable`; chưa loại trừ được cho Chromium 152).
- Segment là **một câu**, nên một dòng (một đoạn) thường chứa nhiều segment. Mọi thứ liên quan hiển thị theo segment phải tính chuyện này.

## Goals / Non-Goals

**Goals:**
- Sửa được bản gốc ngay trên màn chương mà không làm mất ID segment ở những chỗ không đụng tới.
- Biết sớm, bằng thử thật, liệu CM6 trong Electron 44 có chịu được Telex, VNI và Pinyin; dựng để kiểm chứng điều đó trước khi đầu tư phần còn lại.
- Phần quy tắc ánh xạ nằm trong hàm thuần, kiểm thử được mà không cần giao diện.
- Một văn bản, một lịch sử hoàn tác, để mode Từng câu và mode Toàn văn sau này chỉ là hai cách nhìn của cùng một trạng thái.

**Non-Goals:** tự lưu định kỳ; đánh dấu liên kết `needs_review` khi nội dung segment đổi (cần đổi kho); tách/gộp segment bằng lệnh; sửa bản dịch trên giao diện (thành phần nhận `side` nhưng chỉ nối bản gốc); tô màu cú pháp, Markdown hay tìm/thay thế; chế độ nhiều con trỏ.

## Decisions

### D1. Lõi thuần ở `src/shared/`, CodeMirror chỉ là lớp mỏng

`segmentMap.ts` (thuần, không import CodeMirror) làm hai việc: `applyEdits(segments, edits)` dịch chuyển vùng theo danh sách chỉnh sửa `{from, to, insert}` đã sắp theo thứ tự áp dụng và áp quy tắc của `segment-mapping`; `resegment(content, segments, lang)` chia lại vùng đã sửa bằng `segment()` và trả tập đã kiểm bất biến. Lớp CodeMirror đổi `ChangeSet` thành danh sách chỉnh sửa và gọi hai hàm này.

Lý do: quy tắc ở cả hai hàm là chỗ dễ sai nhất và cần kiểm thử ngẫu nhiên hàng nghìn chuỗi chỉnh sửa, việc mà test chạy trong Node làm nhanh và xác định được, như `segmenter.test.ts`. Không có CodeMirror trong test thì test cũng không phụ thuộc phiên bản của nó.

Phương án khác: để mọi thứ trong `StateField`. Gọn hơn lúc đầu nhưng buộc kiểm thử phải dựng `EditorView`, chậm và khó tái hiện khi lỗi.

### D2. Trạng thái segment trong một `StateField`, hoàn tác qua hiệu ứng đảo ngược

`EditorState` giữ một `StateField` `segments: Seg[]` với `Seg = { id: string | null; from: number; to: number; edited: boolean }`, sắp theo `from`, tra bằng tìm nhị phân. Mỗi giao dịch có thay đổi văn bản cập nhật field bằng `applyEdits`.

Hoàn tác phải khôi phục cả ID (mất khi xóa trùm hai segment). Lịch sử của CM6 đảo ngược được văn bản nhưng không biết ID, nên: mọi giao dịch làm đổi cấu trúc segment đính kèm hiệu ứng `setSegments(next)` và khai báo `invertedEffects` trả về `setSegments(trước)`; `history()` của CM6 lưu hiệu ứng đảo ngược cùng giao dịch và áp lại khi hoàn tác hoặc làm lại. Hoàn tác vì vậy là "đặt lại đúng tập segment trước đó" chứ không phải "áp quy tắc ngược".

Chia lại tự động (D3) là giao dịch **không có thay đổi văn bản** và có `addToHistory: false`: nó không tạo bước hoàn tác riêng. Hoàn tác một chỉnh sửa vừa được chia lại đưa văn bản và segment về trước chỉnh sửa bằng một bước, vì hiệu ứng đảo ngược của chính chỉnh sửa đó ghi tập segment trước nó. Làm lại áp lại chỉnh sửa và đặt tập segment về đúng như lúc bắt đầu hoàn tác (hiệu ứng đảo ngược của chính giao dịch hoàn tác ghi lại tập đó), nên làm lại khôi phục cả những ID mà lần lưu gán sau khi chỉnh sửa. Cách này đơn giản hơn so với việc chạy lại chia lại và không cần ID mới.

Phương án khác: lưu snapshot cả mảng segment cho mỗi bước hoàn tác. Chương 5.000 segment thì mỗi phím một snapshot lớn; hiệu ứng chỉ ghi phần đổi cấu trúc (hiếm) là đủ, còn thay đổi vùng do dịch chuyển thường được tái tạo bằng `applyEdits` khi áp lại văn bản.

### D3. Chia lại theo cửa sổ bẩn, chỉ khi rảnh và không có IME

"Cửa sổ bẩn" là hợp của các dòng chứa segment đã sửa (`edited`) hoặc chứa chữ không thuộc segment nào, mở rộng tới ranh giới dòng. `resegment` chạy `segment()` trên văn bản của cửa sổ, ghép lại với phần ngoài cửa sổ (không đụng tới), rồi gán ID theo quy tắc trùng nhiều nhất của `segment-mapping`. Phần ngoài cửa sổ giữ nguyên từng byte của danh sách (ID, vùng đã dịch chuyển), đáp ứng yêu cầu "segment không bị đụng tới giữ ID".

Kích hoạt: khi lưu (bắt buộc, trước khi gửi), và khi người dùng dừng gõ 800 ms (để chỉ báo số segment và lề cập nhật). Cả hai **chỉ chạy khi `view.composing` và `view.compositionStarted` đều sai**; nếu đang soạn thì hẹn lại sau khi đoạn được chốt. Lưu khi đang soạn thì đợi sự kiện kết thúc soạn rồi mới tiếp tục (xem D4). Điều này nhằm vào đúng nhóm lỗi IME của CodeMirror/Chromium: không dựng lại, không thay vùng văn bản chứa đoạn soạn dở.

Chia lại **không được thay văn bản**: nó chỉ đổi tập segment (giao dịch không có `changes`). Văn bản người dùng gõ vì thế không bao giờ bị CodeMirror dựng lại vì lý do của segment.

### D4. Luồng lưu

```text
Ctrl+S / Lưu
   ├─ đang soạn IME? ──▶ đợi compositionend
   ├─ chia lại cửa sổ bẩn (D3)
   ├─ chụp: content, segments (id|undefined), expectedRev, phiên bản tài liệu
   ├─ text:save ──▶ ok: rev mới, gán ID kho cấp cho segment chưa có ID, bỏ cờ edited
   │              └▶ conflict: banner (D5), giữ nguyên bản đang sửa
   │              └▶ lỗi khác: banner lỗi, giữ chưa lưu, cho thử lại
   └─ trong lúc chờ: người dùng vẫn gõ được
```

Văn bản trong editor **không bị thay bằng bản kho trả về**. Kho trả `TextRecord`, ta chỉ lấy `rev` và danh sách segment để gán ID. Segment trả về có cùng thứ tự và vùng với danh sách đã gửi; ghép theo thứ tự rồi dịch chuyển qua các thay đổi xảy ra từ lúc chụp tới lúc xong (cũng bằng `applyEdits`). Nếu trong lúc chờ người dùng đã gõ, segment bị chạm vẫn `edited` và editor vẫn "chưa lưu". Con trỏ và vị trí cuộn không đổi vì không có thay thế văn bản.

Tránh hai lần lưu chồng nhau: một hàng đợi một chỗ; bấm lưu lần hai trong lúc đang lưu sẽ lưu lại một lần nữa sau khi lần đầu xong, với `rev` mới.

Giới hạn kho (2.000.000 đơn vị, 50.000 segment) kiểm trước khi gửi bằng `checkText` đã dùng ở main (đưa phần thuần ra `shared/` nếu chưa có) để báo lỗi nhanh và rõ.

**ID của kho và hoàn tác.** Kho từ chối segment có `id` không thuộc chương, nên sau khi lưu xóa một segment rồi hoàn tác (ID cũ quay lại trong editor), lần lưu kế tiếp gửi segment đó như segment mới (không `id`). Editor giữ danh sách ID mà kho vừa trả (`knownIds`) và đổi mọi ID ngoài danh sách thành mới trước khi gửi. Việc gán ID sau lưu ghép theo **vùng** (từ-đến) giữa segment đã gửi, được dịch qua những thay đổi gõ trong lúc ghi, và segment hiện tại; vì vậy hoàn tác hay gõ xen giữa không làm ID gán sai chỗ. Chia lại tự động bị chặn trong lúc lưu (`isBlocked`).

### D5. Xung đột: báo, không gộp

Kho trả `conflict` khi `rev` đã đổi. Editor hiện banner (`role="alert"`) nêu chuyện gì xảy ra và hai nút: "Sao chép văn bản của tôi" (ghi toàn bộ văn bản hiện tại vào clipboard) và "Tải lại bản đã lưu" (có hộp xác nhận, sau đó nạp `text:get`, đặt lại `EditorState` và xóa lịch sử). Không có gộp ba chiều: văn bản một chương là chuỗi liền, gộp tự động dễ làm hỏng liên kết âm thầm, và đây là cách đơn giản nhất không ghi đè.

Xung đột thật sự chỉ xảy ra khi "Thay bản gốc" hoặc cửa sổ khác đổi văn bản (ứng dụng một cửa sổ nên hiếm); thiết kế vẫn phải đúng vì kho đã chặn và người dùng cần biết.

### D6. Chặn rời khi chưa lưu

`ChapterScreen` đăng ký "có thay đổi chưa lưu" vào một hook `useLeaveGuard` do `App.tsx` dùng để chặn `setView`: mọi chuyển màn trong ứng dụng đi qua một hàm hỏi trước nếu có guard đang bật, mở hộp ba lựa chọn (lưu rồi tiếp tục, bỏ, ở lại). "Thay bản gốc" dùng cùng hàm này.

Đóng cửa sổ: `beforeunload` trả giá trị chặn làm Electron phát `will-prevent-unload` ở main; main bắt sự kiện đó và hiện `dialog.showMessageBoxSync` hai lựa chọn rồi `event.preventDefault()` nếu người dùng ở lại. Không cần kênh IPC mới. Không có lựa chọn "lưu" ở đây vì việc lưu bất đồng bộ không chờ được khi cửa sổ đang đóng (đã ghi vào spec).

### D7. Hiển thị không chèn gì vào văn bản

- ~~Số thứ tự ở lề dùng `gutter()` của CM6~~ *(Cập nhật 2026-10-02: bỏ cột số dòng theo yêu cầu người dùng — pane dịch văn xuôi không cần lề kiểu code editor; `gutter()`/`NumberMarker` đã gỡ khỏi `segmentDecorations.ts`.)*
- Ranh giới câu trong dòng và dấu "đã sửa" dùng `Decoration.mark` (class CSS, nền xen kẽ rất nhẹ, gạch dưới chấm cho segment đã sửa) tính cho viewport bằng `ViewPlugin`. **Không dùng `Decoration.widget` hay phần tử chèn vào dòng**: widget sát con trỏ là nguồn quen thuộc của lỗi IME, và đây là chỗ ta cần tránh rủi ro.
- Phông chữ qua `lang` và `font-family` theo ngôn ngữ (như `SegmentList`); xuống dòng bằng `EditorView.lineWrapping`.
- `tabindex` mặc định: Tab rời editor (không cài keymap Tab); nhãn đọc được qua `contentAttributes` (`aria-label`, `aria-multiline`).
- Không bật `closeBrackets`, `autoIndent`, `autocompletion`, `highlightActiveLine` nặng; keymap chỉ gồm lịch sử, chọn tất cả, di chuyển chuẩn và Ctrl+S.

### D8. IME: dựng để kiểm chứng trước, và không có đường lùi `<textarea>`

Thứ tự công việc đặt kiểm chứng IME lên đầu (xem `tasks.md`): bản tối thiểu của editor (văn bản, lề, lưu) dựng trước, kèm bảng ca của spec, chạy tay trên Electron 44 **trước** khi dựng ánh xạ segment. Mục đích: nếu IME hỏng thì biết ngay, không sau hàng tuần đầu tư.

Nếu ca nào của bảng hỏng, thứ tự xử lý, **không có bước chuyển sang `<textarea>`**:

1. Xác định nguồn: chạy cùng ca trên trang CodeMirror trần (không có mã Mira) và trên Chrome cùng bản Chromium để biết lỗi nằm ở CM6, Chromium hay mã ta.
2. Nếu ở mã ta (dựng lại vùng đang soạn, widget, giao dịch trong lúc soạn): sửa; đó là lý do D3 và D7 cấm các việc đó.
3. Nếu ở CM6 hoặc cách nó dùng DOM: nâng CM6 lên bản mới nhất, thử các tùy chọn về `contenteditable`/`EditContext` của CM6, rồi bản vá hoặc lớp bọc `inputHandler` tại chỗ.
4. Nếu ở Chromium: nâng Electron lên bản có Chromium đã sửa, hoặc tìm cách tránh điều kiện kích hoạt lỗi.

ADR-003 cần sửa: bỏ điều kiện xem lại về `<textarea>`, thay bằng các bước trên. Việc này làm khi triển khai (đã ghi trong tasks).

Ghi chú về cách kiểm chứng: IME thật chỉ chạy được qua bộ gõ của hệ điều hành, tự động hóa gần như không mô phỏng được. Ta dựng trang thử và bảng ca để người dùng gõ tay; bên cạnh đó có test tự động chỉ kiểm phần ta kiểm soát được: giao dịch phát sinh trong lúc `composing`, bằng cách mô phỏng sự kiện `compositionstart`/`compositionend` trong môi trường DOM của kiểm thử và khẳng định không có giao dịch đổi văn bản hay đổi cấu trúc segment nào được phát khi đang soạn. Đó không thay thế gõ tay.

### D9. Hiệu năng

CM6 chỉ dựng viewport, nên văn bản dài không làm chậm. Phần của ta phải tuyến tính hoặc tốt hơn theo số chỉnh sửa: `applyEdits` chạy O(số segment) mỗi giao dịch; với 5.000 segment đó là cỡ chục micro giây và nằm trong ngân sách 16 ms. Hai chi phí thật cần đo, không đoán: (1) khởi tạo `EditorState` với 200.000 ký tự và 5.000 segment và dựng viewport đầu; (2) lưu: gửi chuỗi 200.000 ký tự cùng mảng 5.000 vùng qua IPC và `saveText` ghi từng segment một trong transaction (đã đo nhập 32.000 segment mất 2,1 giây ở change `chapter-source-import`, nên với 5.000 segment kỳ vọng dưới 400 ms ở nền, không chặn giao diện vì lưu bất đồng bộ).

Ngân sách trong spec: mở ≤ 500 ms, phím p95 ≤ 16 ms, đứng hình khi lưu ≤ 200 ms. Đo trong Electron thật, ghi vào `validation.md`.

### D10. Cấu trúc mã

```text
src/shared/algorithms/segmentMap.ts          lõi thuần: applyEdits, resegment, kiểm bất biến
src/shared/algorithms/segmentMap.test.ts     ca cụ thể từ spec + kiểm thử ngẫu nhiên
src/renderer/src/features/editor/
  SourceEditor.tsx                component, nhận { side, lang, record, onSaved, onDirtyChange }
  editorState.ts                  StateField segments, hiệu ứng, invertedEffects, history
  segmentDecorations.ts           lề, nền xen kẽ, dấu đã sửa (viewport)
  useSourceEditor.ts              lưu, hàng đợi, xung đột, rời khi chưa lưu
src/renderer/src/features/editor/imeCases.md   bảng ca (nguồn để copy sang validation.md)
```

`SegmentList` chỉ còn dùng ở bản xem trước của hộp thoại nhập nếu cần, hoặc bị xóa nếu không còn nơi dùng.

### Số đo trong Electron thật

Đo ngày 2026-10-01 trên bản build (`out/`), dữ liệu tạm qua `MIRA_DATA_DIR`, Electron 44.4.5, Windows 11, một chương 5.000 segment gồm 205.999 ký tự (1.000 đoạn, mỗi đoạn năm câu tiếng Trung).

| Phép đo | Ngân sách (spec) | Kết quả |
| --- | --- | --- |
| Mở: từ lúc bấm chương tới khi hiện dòng đầu và nhận phím | ≤ 500 ms | 95–117 ms |
| Gõ giữa chương: xử lý mỗi phím (`execCommand('insertText')` đồng bộ tới khi DOM cập nhật), 300 phím | p95 ≤ 16 ms | p50 0,9 ms, p95 1,7 ms, lớn nhất 4,1 ms |
| Cuộn từ đầu tới cuối (khung chứa dài 50.511 px), bước 500 px mỗi khung hình | không rớt quá 100 ms | khung hình tệ nhất 14 ms, không có tác vụ dài |
| Lưu (Ctrl+S → "Đã lưu") | giao diện đứng ≤ 200 ms | 179 ms cả vòng, không có tác vụ dài (giao diện không đứng) |
| Chia lại một chỉnh sửa, 10.000 segment (hàm thuần, Node) | — | 4,2 ms; `applyEdits` 0,19 ms |

Ghi chú về cách đo: độ trễ "tới khi hiện" ở 60 Hz bị chặn bởi nhịp làm mới màn hình (một khung hình ≈ 16,7 ms) nên không đo được dưới ngưỡng đó; số ở bảng là thời gian xử lý, còn thời gian tới khung hình đã vẽ (hai khung hình liên tiếp) p95 là 22 ms. Đã sửa lời của spec cho đúng cách đo này.

Kiểm tra khác trong Electron thật: lưu bằng Ctrl+S từ bất cứ chỗ nào trên màn, xung đột (kho giữ bản của người kia, editor giữ nguyên chữ đang sửa, sao chép và tải lại), chặn rời (ở lại giữ nguyên chữ chưa lưu), thay bản gốc sau khi lưu (editor mở lại trên văn bản mới, trạng thái "đã lưu", không còn gì để hoàn tác), đóng cửa sổ khi chưa lưu (hộp hai lựa chọn của hệ điều hành: "Ở lại" giữ cửa sổ và chữ, "Đóng và bỏ thay đổi" đóng), 940 px không cuộn ngang, Tab rời editor không chèn ký tự. Chế độ tối kiểm bằng ảnh chụp.

## Risks / Trade-offs

- **[IME hỏng ở Electron 44]** → Kiểm chứng đặt lên đầu (D8), đo cả trên CM6 trần để phân định nguồn lỗi, và các bước xử lý ghi sẵn. Chấp nhận rằng nếu phải nâng Electron thì có thể kéo theo việc kiểm lại phần khác; đó là cái giá của việc chốt không lùi về `<textarea>`.
- **[Sửa nội dung segment không đánh dấu liên kết `needs_review`]** → Kho chỉ đánh dấu liên kết khi segment bị xóa. Segment đã sửa nhưng giữ ID vẫn có liên kết `ok` dù nội dung đã đổi, nên sau này một bản dịch có thể bị coi là còn khớp trong khi bản gốc đã đổi. Đổi kho nằm ngoài change này; ghi vào backlog là `edited-segment-link-review` và nêu rõ trên màn nếu cần. Hiện chưa có liên kết nào được tạo từ giao diện nên rủi ro chưa xảy ra, nhưng phải giải quyết trước khi có căn chỉnh (M3).
- **[Chia lại cho kết quả khác ý người dùng]** (ví dụ gõ "Mr." rồi chấm) → Quy tắc chia câu đã có bộ hồi quy; tách sai không mất chữ, chỉ sai ranh giới, và đó là hạn chế đã biết của chia câu tự động. Chưa có lệnh tách/gộp thủ công (Non-Goal).
- **[Nhập nhằng ở ranh giới]** → Quy tắc "thuộc segment bên trái" là quy ước đơn giản; chia lại ở lúc rảnh sẽ chỉnh lại ranh giới theo quy tắc chia câu nên người dùng ít khi thấy hậu quả.
- **[Hàng đợi lưu và việc gõ trong lúc lưu]** → Gán ID sau lưu phải dịch qua thay đổi xen giữa; có test cho ca "gõ trong lúc đang lưu" và ca "xóa trùm segment vừa lưu".
- **[Hộp xác nhận khi đóng cửa sổ thiếu lựa chọn Lưu]** → Chấp nhận; hai lựa chọn rõ ràng và mất dữ liệu chỉ khi người dùng chủ động chọn đóng. Tự lưu định kỳ (backlog) sẽ giảm rủi ro này.

## Migration Plan

Không đổi schema, IPC hay dữ liệu: văn bản và segment đã lưu mở bình thường trong editor. Hoàn tác: revert commit; không có dữ liệu mới nào cần dọn. Các tùy chọn của CM6 và phiên bản Electron nếu bị nâng ở D8 là thay đổi riêng, đi kèm kết quả kiểm lại.

## Open Questions

1. **Khoảng chờ chia lại khi rảnh** (800 ms) và có cần chỉ báo "đang chia lại" không: chốt theo cảm nhận khi thử; không đổi spec.
2. **Có hiện cảnh báo trên màn khi mở chương mà `segment` trong kho lệch với `segment()` hiện tại** (ví dụ do đổi quy tắc chia câu sau này) hay im lặng: để khi đổi quy tắc đầu tiên; editor hiện không tự chia lại phần chưa sửa.
