NovelFlow · Tài liệu thiết kế
Phân tích UX & Userflow
Phạm vi: userflow, kiến trúc thông tin (sidebar), hệ thống button & input · Dựa trên prototype hiện tại · 06/2026
NovelFlow là bàn làm việc của người dịch truyện dài kỳ (Trung → Việt) với AI. Khác với một công cụ dịch một-lần, giá trị của app nằm ở sự nhất quán xuyên suốt hàng trăm chương: thuật ngữ, tên nhân vật, và đặc biệt là xưng hô thay đổi theo diễn biến. Mọi quyết định UX cần được đo bằng một câu hỏi: "Nó có giúp dịch nhanh hơn và nhất quán hơn không?"

1 · Nhận định chính
190% thời gian ở màn hình dịch
Library, Context, Settings là màn hình phụ trợ. Mọi tối ưu nên dồn vào vòng lặp "đọc raw → dịch → sửa → next".
2Người dùng nghĩ theo "chương", không theo "file"
Sidebar hiện tách RAW / DỊCH thành 2 cây file trùng nhau — bắt người dùng làm việc theo mô hình kỹ thuật thay vì mô hình tinh thần của họ.
3Ngữ cảnh phải nuôi được "trong dòng chảy"
Gặp nhân vật mới giữa lúc dịch là việc xảy ra mỗi chương. Hiện phải rời màn hình dịch 4–5 bước để thêm — đây là điểm gãy lớn nhất.
4Mỗi màn hình chỉ một nút primary
Cụm nút nổi hiện có "Dịch tiếp" (đúng) nhưng các nút còn lại chưa phân tầng rõ, và trạng thái đang-dịch chưa cho phép dừng.
2 · Người dùng & mục tiêu
Persona	Việc cần làm (JTBD)	Thước đo thành công
Dịch giả solo
vai chính	Dịch đều đặn 2–5 chương/ngày để đăng lên nền tảng; vừa dịch vừa hiệu đính; tự quản lý glossary và xưng hô.	Số chương/giờ · số lần phải quay lại sửa xưng hô sai · số click từ lúc mở app đến token dịch đầu tiên (mục tiêu ≤ 3).
Người hiệu đính
vai phụ	Soát bản AI đã dịch, đối chiếu raw khi nghi ngờ, đánh dấu đoạn đạt/chưa đạt.	Thời gian soát/chương · các đoạn "cần soát" không bị bỏ sót.
3 · Vòng lặp lõi (core loop)
Thêm truyện
1 lần / truyện
→
Thiết lập ngữ cảnh
1 lần, rồi nuôi dần
→
Dịch chương
AI stream + sửa tay
→
Soát & đánh dấu
✓ xong / ⚠ cần soát
→
Export / đăng
theo lô
lặp lại mỗi chương — đây là nơi cần ít ma sát nhất
Hai bước đầu là "setup" — được phép chậm, cần dẫn dắt kỹ. Hai bước giữa là "loop" — cần nhanh, phím tắt, không chuyển màn hình. Thiết kế nên đối xử với hai nhóm này khác nhau thay vì đồng đều.

NovelFlow — Phân tích UX & Userflow
1 / 5
4 · Ba userflow then chốt
F1 — Lần đầu thêm truyện (onboarding của một truyện)
Nhập nguồn
URL / file / thư mục
→
Tách chương
preview: "342 chương"
→
AI quét 3 chương đầu
đề xuất glossary + nhân vật
→
Duyệt nhanh
chấp nhận / sửa từng mục
→
Dịch thử ch. 1
thấy giá trị ngay
Điểm gãy hiện tại: sau khi import, người dùng bị thả vào màn hình dịch với ngữ cảnh trống. Bản dịch đầu tiên sẽ sai tên/xưng hô, và họ phải tự nhập tay 20+ nhân vật — việc nặng nhất bị đặt ở thời điểm động lực thấp nhất.
Đề xuất: chèn bước "AI quét & đề xuất ngữ cảnh" ngay trong dialog import (sau "Tiếp tục →"). Người dùng chỉ duyệt, không nhập. Dialog import hiện đã có 3 tab nguồn — giữ nguyên, thêm bước 2 dạng checklist.
F2 — Vòng lặp dịch hằng ngày (90% thời gian)
Mở app
Library
→
"Tiếp tục Ch. 4"
1 click — không chọn lại từ đầu
→
▶ Dịch tiếp
stream từng đoạn
→
Sửa tay
ngay trong pane DỊCH
→
✓ Xong → Next
tự cuộn về đầu chương mới
Điểm gãy hiện tại: mở truyện luôn vào 001.md; nút card ở Library mở truyện chứ không mở đúng chỗ đang dịch dở. Mỗi phiên làm việc tốn 3–4 click thừa và một lần nhớ "hôm qua đến đâu rồi".
Đề xuất: app ghi nhớ vị trí theo từng truyện. Card ở Library hiển thị "▶ Tiếp tục · Ch. 4" làm hành động mặc định; mở thẳng bằng phím Enter. "Đánh dấu xong + sang chương" gộp thành một hành động (Ctrl ⏎).
F3 — Nuôi ngữ cảnh không rời màn hình dịch
Đang dịch, gặp tên mới
trong pane RAW
→
Bôi đen → popover
"+ Glossary · + Nhân vật · + Xưng hô"
→
Điền 2 ô, Enter
dịch nghĩa + ghi chú
→
Tiếp tục dịch
AI dùng ngay từ đoạn sau
Điểm gãy hiện tại: Translator → ribbon 🧠 Context → tab Nhân vật → "+ Thêm nhân vật" → điền form → quay lại Explorer → tìm lại chỗ đang đọc. 6 bước, mất hoàn toàn mạch đọc.
Đề xuất: selection-popover trong pane RAW là cách rẻ nhất để ngữ cảnh "tự giàu lên" theo thời gian. Panel "Ngữ cảnh chương" bên phải (đã có) trở thành nơi xem; popover là nơi thêm. Màn hình Context đầy đủ chỉ dành cho dọn dẹp định kỳ.
NovelFlow — Phân tích UX & Userflow
2 / 5
5 · Kiến trúc thông tin & Sidebar
5.1 — Vấn đề của cây file RAW / DỊCH
Sidebar hiện mô phỏng file explorer: mục RAW liệt kê 8 file, mục DỊCH liệt kê lại đúng 8 file đó, mục _context liệt kê 4 file .md. Ba vấn đề:

Trùng lặp tinh thần: với người dịch, "chương 4" là một thực thể có hai mặt (gốc + dịch) — không phải hai file. Click vào đâu cũng mở cùng một split-pane, nên hai danh sách không mang lại lựa chọn nào khác nhau.
Không nói lên trạng thái: dấu ✓ chỉ có ở mục DỊCH; không phân biệt được "đang dịch dở" với "đã dịch nhưng chưa soát". Trạng thái là thông tin số 1 mà người dịch dài kỳ cần liếc thấy.
Không co giãn: Võ Luyện Đỉnh Phong có 2.000 chương — hai danh sách phẳng × 2.000 dòng là bất khả dụng. Cần gộp một danh sách, ảo hóa (virtualize), nhóm theo quyển/arc và có ô nhảy nhanh.
5.2 — Trước / sau
Hiện tại — cây file
← Thư viện
Đấu Phá Thương Khung
📁 Raw
001.md
002.md
003.md
004.md
📁 Dịch
001.md
✓
002.md
✓
003.md
✓
004.md
🧠 _context
glossary.md
characters.md
Đề xuất — danh sách chương hợp nhất
← Thư viện
Đấu Phá Thương Khung
▶ Tiếp tục · Chương 004
🔍 Lọc / nhảy đến chương… (Ctrl+G)
Quyển 1 · Phế vật trỗi dậy
✓
001 · Thiên tài hay phế vật
✓
002 · Hủy hôn ước
⚠
003 · Dược Lão xuất hiện
◐
004 · Bái sư
○
005 · Đấu khí tái hiện
○
006 · Rời gia tộc
🧠 Ngữ cảnh truyện
Thuật ngữ · Nhân vật · Xưng hô
5 · 21 · 29
Một dòng = một chương: số + tiêu đề + icon trạng thái (○ chưa dịch · ◐ đang dịch · ⚠ cần soát · ✓ hoàn tất). RAW/DỊCH vẫn tồn tại dưới dạng file trên đĩa — nhưng UI không bắt người dùng nghĩ về điều đó.

5.3 — Quy tắc cho sidebar
Quy tắc	Lý do
Resume luôn ở trên cùng	Hành động xác suất cao nhất của mỗi phiên. Chip "▶ Tiếp tục" đứng trước cả ô tìm kiếm.
Nhóm theo quyển/arc, gập được	2.000 chương cần cấu trúc trung gian; tiêu đề nhóm cho cảm giác tiến độ ("Quyển 3/12").
Đa chọn để dịch theo lô	Shift-click chọn dải chương → "⚡ Dịch 12 chương" — hàng đợi hiển thị ở status bar.
Ngữ cảnh ghim ở đáy, 1 dòng	Đủ để nhảy tới, không chiếm chỗ của danh sách chương. Số đếm (5 · 21 · 29) cho biết "độ giàu" ngữ cảnh.
Rộng 240px, kéo giãn được	Tiêu đề chương tiếng Việt dài; 220px hiện tại hơi chật khi có thêm icon trạng thái.
5.4 — Ribbon trái
Giữ 4 mục nhưng đổi vai: 📚 Thư viện (gốc) · 📖 Đang dịch (= Explorer, mở truyện gần nhất) · 🔍 Tìm kiếm (toàn truyện, Ctrl+Shift+F — hiện đang là nút chết, nên làm hoặc ẩn) · 🧠 Ngữ cảnh. Mục Ngữ cảnh phải luôn mang theo truyện đang mở — hiện đã đúng nhờ NovelSwitcher, giữ nguyên.

NovelFlow — Phân tích UX & Userflow
3 / 5
6 · Hệ thống button
6.1 — Bốn tầng, một primary mỗi màn hình
▶ Dịch tiếp
Tầng 1 · Primary — nền accent đặc, duy nhất 1 nút/màn hình. Translator: "Dịch tiếp" · Import: "Tải về" · Library card: "Tiếp tục".
⚡ Dịch cả chương
⬇ Export
Tầng 2 · Secondary — viền sáng, nền mờ. Hành động thay thế có trọng lượng.
◀ Prev
Next ▶
+ Thêm thuật ngữ
Tầng 3 · Ghost — viền mờ. Điều hướng, tiện ích, thêm-bớt trong bảng.
◼ Dừng dịch
Tầng 4 · Destructive — viền đỏ, chỉ xuất hiện khi có gì để dừng/xóa. Xóa truyện cần confirm 2 bước.
6.2 — Trạng thái nút "Dịch" (quan trọng nhất app)
Trạng thái	Hiển thị	Hành vi
Sẵn sàng	▶ Dịch tiếp (primary)	Dịch đoạn kế tiếp. Phím tắt Ctrl+D.
Đang stream	◼ Dừng (chuyển sang tầng destructive) + spinner ở PaneLabel	Hiện tại label đổi thành "Đang dịch…" nhưng không bấm được — phải cho dừng giữa chừng, giữ phần đã dịch.
Hết chương	✓ Xong — sang Ch. 5 →	Gộp đánh-dấu-xong + next thành một cử chỉ (Ctrl ⏎).
Lỗi / đứt mạng	↻ Thử lại từ đoạn 7	Resume theo đoạn, không dịch lại từ đầu chương (tiết kiệm token).
Quy tắc: nút giữ chiều rộng cố định giữa các trạng thái để cụm nút nổi không nhảy layout; icon + chữ cho hành động chính, icon-only chỉ dùng ở ribbon (có tooltip).

6.3 — Input: gõ ở đâu, gõ thế nào
Input	Mẫu thiết kế
Thêm nhanh từ selection	Bôi đen trong pane RAW → popover 3 lựa chọn (+ Glossary / + Nhân vật / + Xưng hô) → form 2 ô (dịch nghĩa, ghi chú), ⏎ lưu, Esc hủy. Đây là input quan trọng nhất chưa tồn tại.
Sửa inline trong bảng	Bảng Thuật ngữ & Bảng xưng hô: click vào ô để sửa tại chỗ, không mở form riêng. Hàng mới = dòng trống cuối bảng, không phải nút mở dialog.
Nhảy chương	Ô lọc sidebar nhận cả chữ lẫn số: gõ "245" + ⏎ → mở chương 245. Ctrl+G focus ô này từ bất kỳ đâu.
Textarea Thế giới / Phong cách	Autosave + chỉ báo "Đã lưu ✓" mờ dần — hiện không có phản hồi nào nên người dùng không biết đã lưu chưa.
Import URL	Validate khi gõ xong; trước khi "Tiếp tục →" phải hiện preview "Tìm thấy 342 chương · ~1,2 triệu chữ" để người dùng xác nhận nguồn đúng.
Pane DỊCH	Luôn ở chế độ sửa được (contenteditable) — không cần nút "✏️ Sửa" riêng; đoạn do AI viết mà chưa ai chạm vào được đánh dấu nhạt để phục vụ trạng thái "cần soát".
6.4 — Phím tắt tối thiểu
Ctrl+D dịch tiếp · Ctrl ⏎ xong + sang chương · Ctrl+G nhảy chương · Ctrl+Shift+F tìm toàn truyện · Ctrl+. bật/tắt panel ngữ cảnh · Alt+←/→ prev/next chương. Hiển thị tắt gọn trong tooltip của từng nút.

NovelFlow — Phân tích UX & Userflow
4 / 5
7 · Lộ trình ưu tiên
Ưu tiên	Hạng mục	Vì sao
P0	Gộp sidebar thành 1 danh sách chương + trạng thái 4 mức	Sửa mô hình tinh thần sai ở nơi dùng nhiều nhất; điều kiện để mọi thứ khác (resume, batch) đứng được.
P0	Resume "Tiếp tục Ch. N" (Library card + sidebar chip)	Cắt 3–4 click khỏi mọi phiên làm việc; chi phí làm rất thấp.
P0	Nút Dịch có trạng thái Dừng / Thử lại theo đoạn	Stream là tương tác lõi; không dừng được = mất kiểm soát + tốn token.
P1	Quick-add ngữ cảnh từ selection (popover)	Biến việc nuôi ngữ cảnh từ "việc riêng" thành "tiện tay" — chất lượng dịch tăng dần theo thời gian dùng.
P1	AI quét & đề xuất ngữ cảnh trong flow import	Gỡ điểm gãy onboarding; quyết định ấn tượng đầu tiên về app.
P1	Batch dịch nhiều chương + hàng đợi ở status bar	Người dịch 2.000 chương cần làm việc theo lô; status bar đang trống là chỗ lý tưởng.
P2	Tìm kiếm toàn truyện (ribbon 🔍)	Đang là nút chết; cần cho hiệu đính ("từ này đã dịch là gì ở chương 12?").
P2	Chỉ báo context-inject + ước tính token/chi phí	Minh bạch hóa "AI nhận được gì" — tăng niềm tin và kiểm soát chi phí.
P2	Nhóm chương theo quyển/arc, gập được	Chỉ phát huy với truyện rất dài; có thể sau virtualize.
8 · Rủi ro & trường hợp biên
Truyện 2.000+ chương: danh sách chương phải ảo hóa; tiến độ % nên tính theo chương đã ✓, không theo file tồn tại.
Stream đứt giữa chừng: luôn ghi lại theo đoạn; nút "↻ Thử lại từ đoạn N" thay vì dịch lại cả chương.
Xưng hô đổi giữa một chương: mốc "từ chương N" hiện là độ phân giải thô nhất chấp nhận được; nếu người dùng phàn nàn, cho phép mốc phụ "từ đoạn M của chương N" — nhưng đừng làm sớm, nó phức tạp hóa cả bảng lẫn lược đồ.
Đề xuất của AI sai: mọi mục ngữ cảnh do AI tạo phải có nguồn gốc rõ ("AI đề xuất · ch. 2") và một cử chỉ xóa/sửa ngay tại chỗ — không bao giờ auto-apply im lặng.
Nhiều truyện mở song song: ngữ cảnh đã scope theo truyện (đúng) — cần giữ nguyên tắc này cho cả phím tắt, hàng đợi dịch và resume.
9 · Bước tiếp theo
Chốt danh sách P0 ở mục 7 — tôi có thể mock cả ba thay đổi P0 trực tiếp vào prototype hiện tại (sidebar hợp nhất, chip resume, nút Dịch đa trạng thái).
Mock popover quick-add (P1) ở pane RAW để kiểm chứng flow F3 bằng tay.
Quyết định có/không bước AI-quét trong import — ảnh hưởng tới scope dialog.