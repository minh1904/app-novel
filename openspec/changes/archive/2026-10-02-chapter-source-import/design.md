## Context

Lý do và phạm vi: xem `proposal.md`. Nền đã có: bảng `chapter_text`/`segment`, `text:get`/`text:save` với `expectedRev`, vùng segment tính theo UTF-16 và giới hạn 2.000.000 đơn vị / 50.000 segment mỗi bên (`content-backup-provider`); khung màn chi tiết, danh sách chương có cờ `hasSource`/`hasTarget`, nhánh `chapter` của `App.tsx` đang trả `PendingScreen` (`work-detail-screen`). [Scope](../../../../docs/handbook/product/scope.md) S1.1 và S1.2 đặt phạm vi: nhập một tệp TXT/MD hoặc dán cho một chương, tách câu theo ngôn ngữ, giữ ranh giới đoạn và thoại.

Đã đo trước khi viết spec (Node 24.14.1, ICU 78.2, cùng ICU với Chromium trong Electron):

- `TextDecoder` có sẵn utf-8, utf-16le/be, gb18030, gbk, big5, shift_jis, euc-jp, windows-1252 và giải mã đúng byte mẫu; chế độ `fatal` từ chối được byte GBK khi đọc như UTF-8. Không cần thư viện giải mã.
- `Intl.Segmenter` (câu) **đúng** cho tiếng Trung, chấm lửng, số thập phân, thoại nhiều câu và ký tự ngoài mặt phẳng cơ bản; **sai** ở ba chỗ: dính dấu mở thoại `「` vào cuối câu trước (tiếng Nhật), tách sau `Mr.`/`Dr.` (Anh) và sau `TP.`/`Th.S.` (Việt). Hai lỗi đầu cần bước sửa sau tách.

## Goals / Non-Goals

**Goals:**
- Đưa được một chương thật vào Mira bằng dán hoặc tệp, mà người dùng thấy rõ văn bản sẽ lưu là gì và đã đổi gì so với nguồn.
- Chia segment đủ đúng để AI dịch và người soát làm việc trên đơn vị hợp lý, có bộ hồi quy giữ cho đúng.
- Không thêm kênh IPC, schema hay dependency chỉ để nhập.

**Non-Goals:** nhập nhiều chương/cả tập/EPUB, người dùng chỉnh quy tắc tách, sửa văn bản, job dịch, tự nhận tên chương từ dòng đầu, nhận bảng mã ngoài danh sách hỗ trợ.

## Decisions

### D1. Chạy ở renderer bằng hàm thuần chung, lưu qua kênh có sẵn

Tệp chọn bằng `<input type="file">` và kéo thả (như `CoverPicker`), đọc bằng `File.arrayBuffer()`; không có hộp thoại ở main, không truyền đường dẫn, không IPC mới. Giải mã, nhận bảng mã, chuẩn hóa và chia câu là các hàm thuần trong `src/shared/` (`rawText.ts`, `segmenter.ts`), không phụ thuộc DOM để test bằng Vitest trong Node. Lưu bằng `text:save` với `expectedRev` đã đọc. Kết quả từ renderer vẫn được main kiểm tra lại (vùng hợp lệ, giới hạn) nên một renderer sai không ghi được dữ liệu hỏng.

```text
 File/Dán ─▶ bytes ─▶ detectEncoding ─▶ decode ─▶ normalize ─▶ segment ─▶ Xem trước
                              ▲ đổi tay                                     │ xác nhận
                                                                            ▼
                                                 text:get (rev) ─▶ text:save(rev, content, segments)
```

Phương án khác: đọc tệp ở main qua hộp thoại. Thêm kênh và bề mặt tấn công mà không đem lại gì: tệp đã nằm ở máy người dùng và renderer đọc được qua `File`.

### D2. Nhận bảng mã: có thứ tự, giải thích được, đổi tay được

Thứ tự: BOM → UTF-8 nghiêm ngặt → danh sách theo ngôn ngữ nguồn (giản thể: gb18030; phồn thể: big5, gb18030; Nhật: shift_jis, euc-jp; Anh: windows-1252), lấy cái đầu tiên giải mã không lỗi; nếu không có, lấy cái ít ký tự thay thế (U+FFFD) nhất và cảnh báo. Windows-1252 giải mã được mọi byte nên luôn "thành công": vì vậy nó chỉ đứng cuối danh sách tiếng Anh và không bao giờ được thử cho tiếng Trung/Nhật. Màn xem trước luôn nêu bảng mã và có danh sách chọn lại. Dán văn bản không qua bước này.

Rủi ro đã biết: nhiều chuỗi byte hợp lệ ở cả GBK lẫn Big5/Shift_JIS, nên đoán có thể sai mà không báo lỗi. **Đã gặp thật khi viết test:** byte EUC-JP cũng là Shift_JIS hợp lệ (thành katakana nửa chiều rộng), nên thứ tự cố định nhận nhầm. Sửa bằng cách, khi nhiều bảng mã cùng giải mã sạch tệp tiếng Nhật, chọn bảng mã cho ít katakana nửa chiều rộng (U+FF61–FF9F) nhất. Với Big5/GB18030 chưa có tín hiệu tương tự, giữ thứ tự (Big5 trước cho phồn thể) và dựa vào xem trước. Hai bảo đảm: người dùng thấy văn bản trước khi lưu, và đổi bảng mã tính lại ngay.

### D3. Chuẩn hóa chỉ làm những việc liệt kê, và báo lại

`normalizeRaw(text)` trả `{ text, changes }` với `changes` là danh sách `{ kind, count }` (`bom`, `newline`, `control`, `trim`). Không có chuẩn hóa Unicode, dấu câu, khoảng trắng trong dòng hay chữ Hán. Lý do: bản gốc là căn cứ của AI và người soát; mọi thay đổi ngầm là một nguồn lỗi khó tìm, nên cái gì đổi thì phải liệt kê được. Quy tắc này thực hiện câu "chỉ chuẩn hóa khi nhập theo quy tắc đã ghi" của `content-model`.

### D4. Chia câu: `Intl.Segmenter` cộng bước sửa, không thêm `sentencex` ở bước này

Quy trình: tách dòng → với mỗi dòng, `Intl.Segmenter(lang, { granularity: 'sentence' })` → sửa: (1) chuyển ký tự mở thoại ở cuối một mảnh sang đầu mảnh sau; (2) gộp mảnh kết thúc bằng từ viết tắt trong danh sách (tiếng Anh/Việt) với mảnh sau; (3) cắt khoảng trắng hai đầu để vùng chỉ phủ ký tự không phải khoảng trắng. Danh sách viết tắt là dữ liệu trong `segmenterData.ts`.

`sentencex` là lựa chọn nêu trong [nghiên cứu](../../../../docs/handbook/research/technical-feasibility.md) và scope. Mình chưa chọn nó vì: số đo trên cho thấy ICU đã đúng ở phần lớn ca và hai lỗi còn lại sửa được bằng quy tắc nhỏ; thêm dependency cần đánh giá giấy phép, cỡ và bảo trì; và chưa có bộ ca thật để chứng minh nó tốt hơn. Cách quyết định: task 1.4 chạy cả hai trên bộ hồi quy; chỉ thêm `sentencex` nếu ICU + sửa không đạt.

**Kết quả so sánh** (2026-10-01, `sentencex` 1.0.32, cùng 25 ca của `segmenterCorpus.ts`, cho `sentencex` từng dòng như bộ của Mira): Mira 25/25, `sentencex` 23/25. `sentencex` sai ở viết tắt tiếng Việt ("Th.S." thành "Th." + "S.") và gộp lời thoại nhiều câu thành một segment (hợp lý ở góc nhìn khác, nhưng khác spec). Tốc độ ngang nhau: 41 ms so với 40 ms cho 300.000 ký tự tiếng Nhật. Hai điều cần nhớ khi đọc con số: bộ ca do chính mình viết nên 25/25 không phải bằng chứng độc lập, và `sentencex` là **addon Rust gốc** (gói `sentencex-win32-x64/index.node`), tức là phải đóng gói theo từng nền tảng cho Electron. Với kết quả này không thêm dependency; xem lại nếu bộ ca thật cho thấy ICU kém hơn. Chuẩn đạt cho cả hai là bộ hồi quy trong `segmentation`. Hàm `segment` có chữ ký ổn định nên đổi bên trong không đụng chỗ gọi.

Giới hạn đã chấp nhận: ranh giới câu là heuristic; "Wait... what?" tách sau "Wait..." theo ICU, và sau từ viết tắt không có trong danh sách sẽ tách sai. Người dùng chưa chỉnh được quy tắc (ngoài phạm vi); segment sai được sửa ở editor (mốc sau).

### D5. Thay bản gốc: giữ bản dịch, để trigger đánh dấu liên kết

Thay = đọc `text:get` lấy `rev`, rồi `text:save` bên `source` với nội dung và danh sách segment **không mang ID cũ**. Repository đã xóa các segment cũ và trigger `segment_delete_flags_links` đặt các liên kết chứa chúng thành `needs_review`; bản dịch và segment dịch không bị chạm (chúng thuộc `side = 'target'`). Hộp xác nhận hiển thị hệ quả đó bằng số liệu thật (số liên kết bị ảnh hưởng nếu có), nên cần một lượt đọc liên kết khi mở hộp. Không có IPC đọc liên kết (đã quyết định ở `content-backup-provider`), nên hộp xác nhận hiện thông tin theo cờ `hasTarget` và nói chung "các liên kết với segment cũ sẽ cần kiểm tra" thay vì đếm chính xác. Mở IPC đọc liên kết chỉ để đếm là không đáng; nếu sau này cần, thêm khi làm mode Từng câu.

### D6. Màn chương và dữ liệu

`useChapterScreen(workId, chapterId)` nạp: tác phẩm (ngôn ngữ nguồn, tiêu đề), chương (tên, số, cờ) qua `chapters:list`, văn bản nguồn qua `text:get`. Sau khi lưu, cập nhật cả cờ trong thư viện bằng `works:get` + `applyWork` để thanh bên và danh sách phản ánh `updated_at` mới. Danh sách segment phân trang (200 hàng/trang) tái dùng cách của danh sách chương (hàm thuần cắt trang). Phông chữ theo `lang` của tác phẩm (đã dùng ở bìa).

Màn chương nằm ở `features/chapter/`; nhánh `chapter` trong `App.tsx` trỏ vào nó thay `PendingScreen`. Chỗ này là nơi hai mode soát mở rộng ở mốc sau, nên cấu trúc để thêm vùng nội dung mà không đổi phần đầu.

### D7. Hộp thoại nhập

Một hộp thoại rộng, ba trạng thái trong cùng chỗ: **Nhập** (ô dán + chọn tệp/kéo thả) → **Xem trước** (bảng mã, thống kê, chuẩn hóa, mẫu đầu/cuối, cảnh báo, segment dài) → **Đang lưu**. Hủy ở bất kỳ bước nào không đổi dữ liệu. Lỗi lưu giữ nguyên trạng thái xem trước để thử lại. Xem trước chỉ tính khi người dùng bấm "Xem trước" hoặc đổi bảng mã, không tính theo từng phím gõ, nên ô dán không bị giật và không cần `useDeferredValue`. Khi chuyển sang bước xem trước, focus đặt vào nút xác nhận; đóng hộp thoại trả focus về nút đã mở nó.

### D8. Kiểm thử

- Hàm thuần: giải mã và nhận bảng mã (byte thật của GB18030/Big5/Shift_JIS/EUC-JP/UTF-16), chuẩn hóa (từng loại và báo cáo), chia câu (bộ hồi quy theo ngôn ngữ, các bất biến bằng kiểm thử ngẫu nhiên: không mất chữ, không chồng, không cắt cặp surrogate, xác định).
- Tích hợp qua kho: nhập vào chương thật, đóng mở lại; thay bản gốc khi có bản dịch và liên kết; xung đột revision.
- Hiệu năng hàm thuần với 300.000 ký tự (mục tiêu < 500 ms cho chia câu).
- Chạy trong Electron thật: nhập từ tệp mẫu từng bảng mã, chương 5.000 segment, bàn phím, 940 px, chụp màn hình.

### Số đo trong Electron thật

Đo ngày 2026-10-01 trên bản build (`out/`), dữ liệu tạm qua `MIRA_DATA_DIR`, Electron 44.4.5, Windows 11.

| Phép đo | Kết quả |
| --- | --- |
| Chia câu hàm thuần, 300.000 ký tự (32.433 segment tiếng Trung, 12.500 segment tiếng Anh) | 46–60 ms (zh), 22–26 ms (en) |
| Dán 300.000 ký tự vào ô, bấm "Xem trước" | 140 ms, một tác vụ dài 101 ms |
| Lưu 300.000 ký tự (32.433 segment) | 2,07 giây, hộp thoại giữ ở trạng thái đang lưu |
| Mở chương 5.000 segment (43.889 ký tự) | 83 ms đến khi hiện hàng đầu |
| Đổi trang 200 segment | 99 ms |

Nhập từ tệp: UTF-8 có và không BOM, UTF-16 LE có BOM, GB18030 (tác phẩm giản thể) và Shift_JIS (tác phẩm Nhật) đều nhận đúng bảng mã, lưu rồi đọc lại đúng văn bản và số segment. Tệp Big5 trong tác phẩm giản thể bị đoán thành GB18030 và ra chữ sai ("㎡") **mà không có cảnh báo** vì mọi byte đều hợp lệ trong GB18030; chọn lại "Big5" trong bước xem trước đọc đúng. Đúng như rủi ro đã ghi ở trên; ghi `encoding-detect-cjk` vào backlog.

Bàn phím: mở hộp thoại bằng Enter trên nút, gõ, Ctrl+Enter sang xem trước, Tab quay vòng trong hộp thoại, Escape đóng và không đổi dữ liệu, Enter trên nút xác nhận thay bản gốc; bản dịch giữ nguyên. Hộp thoại chạy được ở 940 px.

## Risks / Trade-offs

- **Đoán sai bảng mã mà không báo lỗi** → luôn xem trước và đổi tay được (D2); ghi rõ ở màn xem trước.
- **Chia câu sai ở ca chưa lường** → bộ hồi quy tăng dần; sai được sửa ở editor sau; không khóa người dùng vì segment là dữ liệu, không phải hình thức.
- **Ngưỡng 8 MB và 2.000.000 đơn vị** là giả định (xem câu hỏi mở); văn bản UTF-8 tiếng Trung 3 byte/ký tự nên 8 MB ≈ 2,7 triệu ký tự, hơi vượt giới hạn chương, và giới hạn của kho sẽ chặn trước.
- **Chạy nặng ở renderer** → chỉ chặn trong lúc xem trước văn bản rất dài; đo ở task 5.
- **Thay bản gốc làm mất liên kết** → hộp xác nhận nêu rõ và gợi ý sao lưu; liên kết chỉ bị đánh dấu, không bị xóa.

## Migration Plan

Không đổi schema, IPC hay dữ liệu hiện có; chương chưa có bản gốc vẫn hợp lệ. Hoàn tác: revert commit; văn bản đã nhập vẫn hợp lệ với bản cũ (bảng có sẵn).

## Open Questions

Cần chủ sản phẩm xác nhận trước khi làm (đề xuất ghi kèm):

1. **Có tự đặt tên chương từ dòng đầu** (ví dụ "第一章 山中薬舗") không? Đề xuất: **không** ở change này; ghi vào backlog (`chapter-title-from-text`).
2. **Giới hạn tệp 8 MB** có ổn không? Chương truyện thường dưới 100 KB; 8 MB đủ rộng mà vẫn chặn được việc chọn nhầm tệp lớn.
3. **Dùng ICU + quy tắc, chưa dùng `sentencex`** như D4 có ổn không? Đề xuất: ổn, quyết định lại sau khi có số liệu từ bộ hồi quy.
4. **Khi thay bản gốc, giữ bản dịch** (đề xuất) hay hỏi người dùng giữ/xóa? Giữ là lựa chọn an toàn vì xóa không hoàn tác được; cho xóa bản dịch là việc riêng.
