NovelFlow — Tài liệu Phân tích Nghiệp vụ
📅 Ngày tạo: 13/06/2026
🏷 Phiên bản: 0.9.2
👤 Loại tài liệu: BA / PO Reference
📌 Trạng thái: In Review
1. Giới thiệu sản phẩm
Mô tả tóm tắt
NovelFlow là ứng dụng desktop dành cho dịch giả tiểu thuyết (chủ yếu là tiểu thuyết ngôn tình, tiên hiệp từ tiếng Trung sang tiếng Việt). Ứng dụng cung cấp môi trường dịch thuật chuyên dụng kết hợp AI (Claude API) với bộ quản lý ngữ cảnh giúp đảm bảo tính nhất quán thuật ngữ, tên nhân vật và hình thức xưng hô xuyên suốt toàn bộ tác phẩm.

NovelFlow không phải là một công cụ dịch tự động đơn giản — mục tiêu cốt lõi là hỗ trợ dịch giả làm việc nhanh hơn, nhất quán hơn, trong khi vẫn giữ quyền kiểm soát về chất lượng văn phong.

🎯 Vấn đề đang giải quyết
Dịch giả phải tra cứu thủ công thuật ngữ từ file notes riêng
Xưng hô nhân vật thay đổi theo diễn biến nhưng khó theo dõi
Dùng AI dịch tốn thời gian copy-paste qua lại
Không có cách chuẩn hóa phong cách dịch cho cả nhóm
Khó theo dõi tiến độ dịch từng chương
✅ Giải pháp NovelFlow
Glossary & nhân vật được inject tự động vào prompt AI
Hệ thống xưng hô theo chương (phases) — tự động áp dụng đúng giai đoạn
Split-pane editor ngay trong app, AI stream trực tiếp
Style guide & world-building lưu riêng theo từng truyện
Dashboard tiến độ với trạng thái từng chương
ℹ️
Phạm vi v0.9.2: Đây là phiên bản MVP tập trung vào trải nghiệm dịch đơn (1 dịch giả – 1 máy). Tính năng cộng tác nhóm, sync cloud, và review workflow nằm ngoài phạm vi phiên bản này.
2. Persona & Stakeholder
👩‍💻
Linh — Dịch giả bán chuyên
Persona chính · PRIMARY USER
Bối cảnh: Dịch giả tự do, dịch 2–3 tiểu thuyết cùng lúc. Mỗi tháng xuất bản 60–100 chương.

Mục tiêu: Dịch nhanh mà vẫn giữ phong cách, không bị lẫn thuật ngữ giữa các truyện.

Nỗi đau: Phải mở 3–4 tab browser để tra từ và check cách gọi tên. Quên xưng hô nhân vật khi truyện dài.

🧑‍🏫
Minh — Trưởng nhóm dịch
Persona phụ · SECONDARY USER
Bối cảnh: Quản lý nhóm 5–10 dịch giả, cần đảm bảo tất cả dùng chung bộ thuật ngữ.

Mục tiêu: Tạo chuẩn ngữ cảnh 1 lần, chia sẻ cho toàn nhóm. Theo dõi tiến độ tổng thể.

Nỗi đau: Mỗi dịch giả dùng cách dịch tên nhân vật khác nhau, gây loạn cho độc giả.

Stakeholder	Vai trò	Quan tâm chính	Mức độ ảnh hưởng
Dịch giả	End user chính	Tốc độ dịch, nhất quán thuật ngữ, AI chất lượng	🔴 Cao
Trưởng nhóm dịch	Admin / người tạo template	Chuẩn hóa ngữ cảnh, theo dõi tiến độ nhóm	🔴 Cao
Anthropic (Claude API)	Nhà cung cấp AI	Tuân thủ ToS, giới hạn rate/cost	🟡 Trung bình
Độc giả	Người hưởng lợi gián tiếp	Chất lượng bản dịch	🟢 Thấp (gián tiếp)
3. Bản đồ màn hình (Screen Map)
📚
Thư viện
📖
Biên dịch chương
🧠
Ngữ cảnh
⚙️
Cài đặt
📥
Dialog: Thêm truyện
Ứng dụng sử dụng layout shell cố định: TitleBar trên cùng → Ribbon (icon navigation) bên trái → Content area chiếm phần còn lại → Status Bar dưới cùng. Chuyển màn hình không reload toàn trang.

Màn hình	Trigger điều hướng	Mô tả ngắn	URL/ID nội bộ
Thư viện	Icon 📚 trên Ribbon · Launch mặc định	Grid các truyện đang quản lý, thêm truyện mới	library
Biên dịch chương	Mở truyện → tự động vào chương đang dịch	Split-pane RAW ↔ Dịch + Sidebar danh sách chương	novel
Ngữ cảnh	Icon 🧠 trên Ribbon, nút "Ngữ cảnh truyện" trên Sidebar	Glossary, Nhân vật, Xưng hô, Thế giới, Phong cách	context
Cài đặt	Icon ⚙️ dưới cùng Ribbon	API key, model, editor preferences	settings
Dialog: Thêm truyện	Nút "+" trong Thư viện	Import source (URL / file / folder) + AI scan ngữ cảnh ban đầu	import-dialog
4. Màn hình: Thư viện Truyện
4.1 Duyệt & tìm kiếm
Mô tả tính năng
Màn hình mặc định khi mở app. Hiển thị tất cả tiểu thuyết đã thêm vào dưới dạng grid bìa sách. Mỗi card hiển thị: ảnh bìa (màu gradient + chữ Hán đặc trưng), tiêu đề, tác giả, số chương, trạng thái và thanh tiến độ dịch.

Thành phần UI	Hành vi	Ghi chú
Ô tìm kiếm	Filter real-time theo tên truyện	UI-only, không gọi API
Dropdown "Sắp xếp"	Sắp xếp danh sách (tiêu đề, tiến độ, ngày thêm)	v0.9: UI placeholder
Toggle Grid / List	Chuyển kiểu hiển thị	v0.9: List view chưa implement
Novel Card (hover)	Hiển thị nút "▶ Tiếp tục · Ch. X" hoặc "✓ Mở truyện"	Resume tự động vào chương đang dịch dở
Novel Card (click)	Mở màn hình Biên dịch tại chương resume	Nếu không có resume → chương 001
Badge trạng thái	Hiển thị: Đang dịch / Hoàn thành / Tạm dừng	Màu: tím / xanh / vàng
Thanh tiến độ	% chương đã hoàn thành so với tổng chương	Màu accent nếu chưa xong, xanh nếu 100%
Card "+ Thêm truyện"	Mở Import Dialog	Luôn ở cuối grid
4.2 Nhập truyện mới (Import Dialog)
Luồng 2 bước
1
Chọn nguồn truyện
3 tab: URL (truyenfull.vn, metruyencv, wattpad...) · Upload file (.txt, .md, tự động tách chương) · Thư mục (mỗi file = 1 chương, đặt tên theo số thứ tự)
2
Thiết lập ngữ cảnh ban đầu (AI Scan)
AI đọc 3 chương đầu, tự động đề xuất danh sách thuật ngữ, nhân vật và quan hệ xưng hô. Dịch giả review, bỏ chọn mục không chính xác → Xác nhận → Hệ thống thêm truyện và tạo ngữ cảnh ban đầu.
⚠️
Business Rule: AI Scan chỉ chạy khi có API key hợp lệ trong Cài đặt. Nếu chưa có API key, người dùng có thể bỏ qua Bước 2 và thêm ngữ cảnh thủ công sau.
Hệ thống hỗ trợ nhập nguồn từ URL, file .txt/.md, và thư mục chứa nhiều file chương
Sau khi nhập, hệ thống tự động chạy AI scan 3 chương đầu và hiển thị progress bar
Dịch giả có thể bỏ chọn (deselect) từng mục AI đề xuất trước khi xác nhận
Dịch giả có thể bỏ qua Bước 2 và vào dịch ngay
Mục được chọn sẽ tự động thêm vào Glossary / Nhân vật / Xưng hô của truyện
Hệ thống không kiểm tra trùng lặp khi AI scan đề xuất — BA cần xác nhận business rule này
5. Màn hình: Biên dịch Chương
Màn hình cốt lõi của sản phẩm. Gồm 3 vùng chính: Sidebar danh sách chương (trái) · Split-pane editor (giữa) · Panel ngữ cảnh chương (phải, có thể ẩn/hiện).

5.1 Split-pane Editor
Pane trái — RAW (Nguồn)
Hiển thị nội dung ngôn ngữ gốc (tiếng Trung)
Từ trong Glossary được highlight và underline màu accent
Hover vào từ highlight → tooltip hiện tên dịch + ghi chú
Bôi đen từ bất kỳ → xuất hiện Quick-add Popover
Read-only (không chỉnh sửa nội dung gốc)
Pane phải — Dịch (VI)
Nội dung tiếng Việt — contentEditable, sửa trực tiếp
Đoạn do AI dịch có đường viền trái màu accent (chưa soát)
Khi người dùng sửa tay → đoạn đó mất dấu "chưa soát"
AI stream text từng chữ với blinking cursor
Auto-scroll xuống khi AI đang stream
5.2 Nút hành động AI — Đa trạng thái
ℹ️
Nút "Dịch" là nút chính, thay đổi label và hành vi theo trạng thái hiện tại của quá trình dịch. Đây là design pattern cốt lõi — tránh tạo nhiều nút riêng biệt.
Trạng thái	Label nút chính	Màu sắc	Hành động khi click	Phím tắt
ready (chưa dịch)	▶ Dịch tiếp	Accent (tím)	Bắt đầu stream AI dịch đoạn tiếp theo	Ctrl+D
ready (đã dừng giữa chừng)	▶ Dịch tiếp (từ chỗ dừng)	Accent (tím)	Tiếp tục stream từ vị trí dừng	Ctrl+D
streaming	◼ Dừng	Đỏ (danger)	Dừng stream, giữ lại phần đã dịch	Ctrl+D
done (đã dịch xong)	✓ Xong — Ch. X →	Xanh (success)	Đánh dấu chương hoàn tất → mở chương kế	Ctrl+Enter
Ngoài nút chính, còn có nút phụ "⚡ Dịch cả chương" — kích hoạt stream toàn bộ chương còn lại với tốc độ nhanh hơn (không dừng sau mỗi đoạn).

5.3 Sidebar danh sách chương
Thành phần	Mô tả
Header truyện	Tên truyện, thanh tiến độ (số chương done / tổng), link "← Thư viện"
Nút Resume	Luôn ghim trên cùng — mở chương đang ở trạng thái active → review → todo (ưu tiên theo thứ tự này)
Input lọc / nhảy chương	Lọc real-time theo số hoặc tên chương. Nhập số nguyên + Enter → jump thẳng đến chương đó. Phím tắt mở: Ctrl+G
Danh sách chương	Mỗi dòng: icon trạng thái + số chương + tiêu đề. Chương đang xem được highlight accent.
Ngữ cảnh truyện (pinned)	Nút ghim cuối sidebar: bấm để mở màn hình Ngữ cảnh. Hiển thị số lượng thuật ngữ · nhân vật · quan hệ
Trạng thái chương
Trạng thái	Icon	Ý nghĩa	Màu
todo	○	Chưa bắt đầu dịch	Xám
active	◐	Đang dịch dở	Accent (tím)
review	⚠	Đã dịch, cần soát lại	Vàng (warning)
done	✓	Đã dịch và soát xong	Xanh (success)
✅
Business Rule — Tự động chuyển trạng thái: Khi dịch giả nhấn "✓ Xong", chương hiện tại chuyển sang done, và chương tiếp theo (nếu đang ở todo) tự động chuyển sang active.
5.4 Quick-add ngữ cảnh từ Selection
Khi người dùng bôi đen một đoạn văn bản trong pane RAW (tối đa 20 ký tự), một popover nhỏ xuất hiện gần vị trí bôi đen với 3 lựa chọn:

📖 Thuật ngữ — thêm cặp từ gốc → dịch nghĩa vào Glossary của truyện
👤 Nhân vật — thêm nhân vật mới với tên Hán Việt và vai trò
⇄ Xưng hô — mở màn hình Ngữ cảnh tab Xưng hô để thêm quan hệ phức tạp hơn
Sau khi lưu, hệ thống hiển thị toast notification xác nhận (2.6 giây). Ngữ cảnh được cập nhật ngay lập tức — không cần refresh.

5.5 Panel ngữ cảnh chương (Context Panel)
Panel bên phải, mặc định mở, có thể toggle bằng nút "🧠 Ngữ cảnh" trên toolbar hoặc phím tắt Ctrl+.. Hiển thị 3 phần:

Phần	Nội dung	Logic lọc
Thuật ngữ trong chương	Chỉ hiển thị các term trong Glossary mà xuất hiện trong nội dung RAW của chương đang mở	Match string giữa Glossary.zh và nội dung chương
Nhân vật	Tối đa 6 nhân vật đầu tiên của truyện + tự xưng của mỗi người	Lấy từ danh sách characters của novel
Xưng hô @ chương hiện tại	Hiển thị cách xưng hô đang áp dụng (theo số chương), ghi chú nếu đã đổi hoặc sắp đổi	Áp dụng logic activePhase(phases, ch)
6. Màn hình: Quản lý Ngữ cảnh
ℹ️
Nguyên tắc cốt lõi: Mỗi tiểu thuyết có bộ ngữ cảnh riêng biệt và độc lập. Ngữ cảnh này được tự động inject vào prompt AI mỗi khi gọi dịch. Người dùng có thể chuyển giữa các truyện bằng dropdown ngay trên đầu màn hình.
Màn hình gồm 5 tab:

6.1 Tab Thuật ngữ (Glossary)
Bảng tra cứu thuật ngữ của truyện. Mỗi dòng gồm: Từ gốc (Hán tự / ngôn ngữ nguồn) · Dịch nghĩa · Ghi chú · Toggle AI (bật/tắt inject từng term vào prompt).

Người dùng có thể tìm kiếm theo từ gốc hoặc dịch nghĩa
Toggle AI cho phép tắt inject từng term riêng lẻ (ví dụ: term quá phổ thông không cần nhắc AI)
Có nút "＋ Thêm thuật ngữ" để thêm thủ công
Thiếu tính năng: chỉnh sửa và xóa term trong UI (phiên bản hiện tại chưa có)
6.2 Tab Nhân vật
Grid 2 cột hiển thị card từng nhân vật. Mỗi card gồm: Avatar chữ cái · Tên · Vai trò · Mô tả · Cách tự xưng.

Field	Mô tả	Ví dụ
name	Tên nhân vật (Hán Việt)	Tiêu Viêm
role	Vai trò trong truyện	Nhân vật chính
desc	Mô tả ngắn để AI hiểu bối cảnh	Thiếu niên từng là thiên tài...
self	Đại từ tự xưng của nhân vật	ta / lão phu / bổn tọa
6.3 Tab Xưng hô (Address Forms)
⚠️
Tính năng đặc thù — Killer Feature: Đây là tính năng phân biệt NovelFlow với các công cụ dịch thông thường. Hệ thống theo dõi cách hai nhân vật gọi nhau thay đổi theo từng giai đoạn của câu chuyện (theo số chương).
Mô hình dữ liệu Quan hệ xưng hô
Mỗi quan hệ (Form) gồm:

a, b: Tên hai nhân vật
kind: Loại quan hệ (gia tộc / sư môn / tình cảm / bằng hữu / địch / thế lực)
phases: Mảng các giai đoạn, mỗi giai đoạn gồm:
from: Từ chương bao nhiêu giai đoạn này bắt đầu
rel: Nhãn quan hệ (vd: "Đệ tử – Sư phụ")
aToB.call: A gọi B bằng gì
aToB.self: A tự xưng là gì khi nói với B
bToA.call: B gọi A bằng gì
bToA.self: B tự xưng là gì khi nói với A
Tab Xưng hô có 3 kiểu hiển thị người dùng có thể chuyển đổi:

View	Mô tả	Phù hợp khi
◉ Lược đồ (Graph)	Biểu đồ mạng SVG với các node nhân vật và cạnh quan hệ. Có animation, hover để làm nổi kết nối, click cạnh để xem chi tiết xưng hô	Muốn hình dung tổng quan quan hệ của tất cả nhân vật
▦ Bảng (Table)	Bảng 4 cột: Ai nói → với ai / Gọi đối phương / Tự xưng / Quan hệ hiện tại. Có tìm kiếm theo tên nhân vật	Tra cứu nhanh cách xưng hô khi đang dịch
≡ Timeline	Danh sách từng cặp quan hệ với timeline các giai đoạn (phase), highlight giai đoạn đang active	Hiểu sự thay đổi xưng hô theo diễn biến truyện
✅
Business Rule — Active Phase: Hệ thống tự động xác định giai đoạn xưng hô đang áp dụng bằng cách lấy giai đoạn có from lớn nhất mà vẫn ≤ số chương hiện tại đang mở. Điều này đảm bảo Context Panel và AI prompt luôn dùng đúng cách xưng hô.
6.4 Tab Thế giới & 6.5 Tab Phong cách
Thế giới (World-building)
Textarea tự do mô tả bối cảnh truyện: hệ thống sức mạnh, cấp bậc tu luyện, địa danh, tổ chức... Nội dung được inject vào prompt AI để AI hiểu ngữ cảnh thế giới.

Ví dụ DPTK: "Đấu Khí đại lục — hệ thống cấp bậc: Đấu Giả → Đấu Sư → ... → Đấu Đế"

Phong cách (Style Guide)
Textarea tự do chứa hướng dẫn dịch thuật: cách xưng đại từ (hắn/nàng vs anh/em), quy tắc giữ tên Hán Việt, văn phong (cổ điển/hiện đại), ghi chú cho AI...

Ví dụ: "Xưng hô: hắn/nàng (không dùng anh/em). Văn phong: cổ điển, trang trọng."

7. Màn hình: Cài đặt
Nhóm	Setting	Loại	Mô tả
AI Configuration	API Key	Password input	Anthropic API key. Lưu local, không gửi lên server của NovelFlow
Model	Dropdown	claude-opus-4-7 / claude-sonnet-4-6 / claude-haiku-4-5
Ngôn ngữ nguồn	Dropdown	Tiếng Trung / Tiếng Anh / Tiếng Hàn
Ngôn ngữ đích	Dropdown (disabled)	Chỉ hỗ trợ Tiếng Việt (v0.9)
Editor	Tự động lưu	Toggle	Lưu bản dịch mỗi 2 giây sau khi ngừng gõ
Vim keybindings	Toggle	Bật chế độ Vim cho editor
Font size	Slider 12–18px	Cỡ chữ trong pane RAW và pane Dịch
Giao diện	Theme	Segmented (Dark/Light/Auto)	v0.9: chỉ Dark mode được hỗ trợ
Ngôn ngữ UI	Dropdown	v0.9: chỉ Tiếng Việt
8. User Stories
8.1 Thư viện
US-01 · Dịch giả
Với tư cách là dịch giả, tôi muốn xem danh sách tất cả truyện tôi đang dịch, để tôi có thể nhanh chóng chọn tiếp tục dịch truyện phù hợp.

Acceptance: Hiển thị card bìa, tiêu đề, % tiến độ, trạng thái. Bấm "▶ Tiếp tục" mở đúng chương đang dịch dở.
US-02 · Dịch giả
Với tư cách là dịch giả, tôi muốn nhập một truyện mới từ URL hoặc file, để tôi có thể bắt đầu dịch mà không cần thiết lập thủ công.

Acceptance: AI tự động quét 3 chương đầu và đề xuất thuật ngữ/nhân vật. Tôi có thể review và bỏ chọn trước khi xác nhận.
8.2 Biên dịch
US-03 · Dịch giả
Với tư cách là dịch giả, tôi muốn xem nội dung gốc và bản dịch cạnh nhau, để tôi có thể dịch và kiểm tra song song mà không cần chuyển tab.

Acceptance: Split-pane hiển thị RAW (trái) và VI (phải) cùng lúc. Cả hai pane scroll độc lập.
US-04 · Dịch giả
Với tư cách là dịch giả, tôi muốn gọi AI dịch và thấy kết quả streaming từng chữ, để tôi không phải chờ cả đoạn mới xem được.

Acceptance: Text xuất hiện từng từ với blinking cursor. Tôi có thể dừng stream bất cứ lúc nào và phần đã stream được giữ lại.
US-05 · Dịch giả
Với tư cách là dịch giả, tôi muốn bôi đen một từ trong văn gốc và nhanh chóng thêm vào glossary, để tôi không phải chuyển sang màn hình Ngữ cảnh.

Acceptance: Popover xuất hiện ngay dưới selection. Điền dịch nghĩa → Enter → lưu ngay, hiện toast xác nhận.
US-06 · Dịch giả
Với tư cách là dịch giả, tôi muốn theo dõi trạng thái từng chương và dễ dàng nhảy đến chương bất kỳ, để tôi kiểm soát được tiến độ tổng thể.

Acceptance: Sidebar hiển thị icon trạng thái (✓ ⚠ ◐ ○). Gõ số chương + Enter → jump ngay đến chương đó.
8.3 Ngữ cảnh
US-07 · Dịch giả
Với tư cách là dịch giả, tôi muốn xem cách hai nhân vật gọi nhau tại đúng chương tôi đang dịch, để tôi không dịch sai xưng hô.

Acceptance: Context Panel hiển thị đúng giai đoạn xưng hô của chương hiện tại. Khi xưng hô vừa thay đổi, có ghi chú "↳ đã đổi từ chương X".
US-08 · Trưởng nhóm
Với tư cách là trưởng nhóm dịch, tôi muốn xem toàn bộ quan hệ nhân vật dưới dạng lược đồ trực quan, để tôi kiểm tra và giải thích cho dịch giả mới.

Acceptance: Tab Xưng hô / view Graph hiển thị biểu đồ mạng với đầy đủ nhân vật và loại quan hệ được phân biệt bằng màu sắc.
9. Luồng sử dụng chính
9.1 Luồng: Thêm truyện mới và bắt đầu dịch lần đầu
1
Mở Thư viện → click "＋ Thêm truyện"
Import Dialog xuất hiện dưới dạng modal overlay
2
Chọn nguồn (URL / File / Folder) → Tải về
Hệ thống tải nội dung chương về local
3
AI Scan 3 chương đầu — Progress bar chạy
AI phân tích và trích xuất thuật ngữ, nhân vật, xưng hô. Kết quả hiển thị dưới dạng checklist
4
Dịch giả review checklist → Xác nhận
Bỏ chọn mục không chính xác. Nhấn "Thêm X mục → Dịch thử chương 1"
5
Mở màn hình Biên dịch tại Chương 1
Sẵn sàng dịch. Ngữ cảnh đã được khởi tạo tự động.
9.2 Luồng: Dịch một chương hàng ngày
1
Mở app → Thư viện → click truyện → "▶ Tiếp tục"
App nhớ chương đang dịch dở (resume state)
2
Đọc nội dung RAW, check Context Panel
Review thuật ngữ trong chương và xưng hô đang áp dụng
3
Bấm "▶ Dịch tiếp" (hoặc Ctrl+D) → AI stream
Xem AI dịch từng chữ. Có thể dừng bất cứ lúc nào
4
Chỉnh sửa bản dịch trực tiếp trong pane VI
Click vào đoạn → gõ sửa. Đoạn đã sửa mất viền "chưa soát"
5
Bôi đen từ lạ trong RAW → Quick-add Glossary
Thêm thuật ngữ mới phát sinh khi dịch, không cần rời màn hình
6
Nhấn "✓ Xong" → chuyển sang chương kế
Chương hiện tại thành done, chương tiếp theo thành active
10. Phân tích MoSCoW & Backlog ưu tiên
🔴
Must Have
Không có = không dùng được
🟡
Should Have
Quan trọng nhưng có workaround
🟢
Could Have
Nice to have, không urgent
#	Tính năng	Ưu tiên	Trạng thái v0.9	Ghi chú
1	Split-pane editor RAW ↔ Dịch	Must	✅ Done	
2	AI dịch streaming (Claude API)	Must	✅ Done	UI mock — cần kết nối API thật
3	Glossary per novel + inject vào prompt	Must	✅ Done	Toggle inject từng term
4	Quản lý nhân vật per novel	Must	✅ Done	
5	Trạng thái chương (todo/active/review/done)	Must	✅ Done	
6	Resume về chương đang dịch dở	Must	✅ Done	
7	Hệ thống xưng hô theo phase (chương)	Must	✅ Done	Killer feature
8	Quick-add glossary từ selection	Must	✅ Done	
9	Import truyện (URL / file / folder)	Must	🔶 UI done, logic pending	Cần implement parser thật
10	AI Scan ngữ cảnh ban đầu khi import	Must	🔶 UI done, API pending	
11	Highlight thuật ngữ glossary trong pane RAW	Should	✅ Done	
12	Graph view quan hệ nhân vật	Should	✅ Done	
13	Context Panel (thuật ngữ + xưng hô @ chương)	Should	✅ Done	
14	Dừng stream và tiếp tục từ chỗ dừng	Should	✅ Done	
15	Chỉnh sửa / xóa thuật ngữ trong Glossary	Should	❌ Thiếu	Hiện chỉ có "Thêm"
16	Chỉnh sửa nhân vật	Should	❌ Thiếu	
17	Export bản dịch (txt / docx / epub)	Should	❌ Thiếu (UI placeholder)	
18	Tự động lưu bản dịch	Should	🔶 UI toggle done, logic pending	
19	Tìm kiếm trong thư viện	Should	🔶 UI done, filter pending	
20	Preview bản dịch (đọc chế độ clean)	Could	❌ UI placeholder	
21	Vim keybindings	Could	🔶 Toggle UI, logic pending	
22	Light mode / Auto theme	Could	❌ Dark only	
23	Sync cloud / multi-device	Won't (v1)	—	Ngoài phạm vi MVP
24	Cộng tác nhóm realtime	Won't (v1)	—	Ngoài phạm vi MVP
11. Mô hình dữ liệu (Domain Model)
Sơ đồ quan hệ thực thể (text)
Novel  1 ──────────────── N  Chapter
  │                            └─ id, title, status(todo|active|review|done)
  │
  └─── 1 Context
          ├── N Glossary Term
          │     └─ zh, vi, note, aiEnabled
          ├── N Character
          │     └─ name, role, desc, self
          ├── N Address Form (Relationship)
          │     ├─ a (Character.name)
          │     ├─ b (Character.name)
          │     ├─ kind (gia tộc|sư môn|tình cảm|bằng hữu|địch|thế lực)
          │     └─ N Phase
          │           └─ from(chapter), rel, aToB{call,self}, bToA{call,self}
          ├── 1 World (text)
          └── 1 Style (text)
    
Entity	Thuộc tính chính	Ghi chú
Novel	id, title, author, chapters, progress, status, resume, coverHue, glyph	resume: ID chương đang dịch dở (dạng "004")
Chapter	id, title, status	ID dạng "001" – "342" (3 chữ số, padded)
Context	glossary[], characters[], forms[], world, style	1-to-1 với Novel, key là Novel.id
GlossaryTerm	zh, vi, note, aiEnabled(bool)	zh dùng làm key match trong pane RAW
Character	name, role, desc, self	self: đại từ tự xưng (ta / lão phu / bổn tọa...)
AddressForm	a, b, kind, phases[]	Quan hệ hai chiều giữa 2 nhân vật
Phase	from(int), rel, note, aToB{call,self}, bToA{call,self}	from là số chương bắt đầu giai đoạn này
12. Yêu cầu Phi chức năng
Loại	Yêu cầu	Mức độ
Hiệu năng	Streaming AI phải bắt đầu hiển thị ký tự đầu tiên trong vòng 2 giây sau khi bấm Dịch	Must
Hiệu năng	Chuyển tab trong màn hình Ngữ cảnh không được lag quá 100ms	Must
Hiệu năng	Graph view xưng hô với 20+ nhân vật vẫn animation mượt (≥30fps)	Should
Bảo mật	API key được lưu local (encrypted nếu dùng Electron keychain), không gửi lên server NovelFlow	Must
Bảo mật	Nội dung truyện và bản dịch chỉ gửi đến Anthropic API, không lưu trên server thứ ba	Must
Độ tin cậy	Khi stream AI bị ngắt giữa chừng, phần đã stream phải được giữ lại và có thể tiếp tục	Must
Độ tin cậy	Auto-save bản dịch mỗi 2 giây sau khi ngừng gõ (khi tính năng được bật)	Should
Khả năng dùng	Các hành động thường xuyên có phím tắt: Ctrl+D (dịch), Ctrl+G (jump chương), Ctrl+. (toggle context), Alt+←/→ (nav chương)	Should
Khả năng dùng	Toast notification xuất hiện sau mỗi hành động thêm context và tự ẩn sau 2.6 giây	Should
Tương thích	Hỗ trợ desktop (Windows, macOS). Mobile không trong phạm vi v0.9	Must
Khả năng mở rộng	Cấu trúc ngữ cảnh (Context) phải hỗ trợ thêm ngôn ngữ nguồn mới mà không refactor lớn	Could
13. Bảng thuật ngữ tài liệu
Thuật ngữ	Định nghĩa
Novel / Truyện	Một tiểu thuyết được quản lý trong NovelFlow, có ngữ cảnh và danh sách chương riêng
Context / Ngữ cảnh	Bộ thông tin (glossary, nhân vật, xưng hô, thế giới, phong cách) gắn với một Novel, được inject vào prompt AI
Glossary	Từ điển thuật ngữ của truyện: cặp (từ gốc → dịch nghĩa + ghi chú)
Phase / Giai đoạn	Một khoảng thời gian trong truyện (tính theo số chương) mà cách xưng hô giữa hai nhân vật không thay đổi
Address Form / Xưng hô	Quy tắc hai nhân vật gọi nhau và tự xưng trong một giai đoạn cụ thể
Active Phase	Giai đoạn xưng hô đang áp dụng tại một số chương cụ thể (giai đoạn có from lớn nhất ≤ chương hiện tại)
Stream / Streaming	AI trả về kết quả từng chữ/token thay vì chờ hoàn tất toàn bộ
Quick-add Popover	Menu nhỏ xuất hiện khi người dùng bôi đen văn bản trong pane RAW, cho phép thêm thuật ngữ/nhân vật nhanh
Resume	Trạng thái ghi nhớ chương đang dịch dở, dùng để mở đúng vị trí khi người dùng quay lại
Inject	Hành động đưa thông tin ngữ cảnh (glossary, nhân vật, xưng hô...) vào system prompt trước khi gọi AI
Split-pane	Giao diện chia đôi màn hình: pane trái (văn gốc) và pane phải (bản dịch)
Ribbon	Thanh icon điều hướng hẹp bên trái màn hình (Library / Explorer / Search / Context / Settings)
Status Bar	Thanh thông tin ở cuối màn hình hiển thị thông tin ngữ cảnh của màn hình hiện tại
Toast	Thông báo nhỏ xuất hiện tạm thời (2–3 giây) để xác nhận hành động đã thực hiện thành công
NovelFlow — Tài liệu BA & PO · v0.9.2 · Cập nhật 13/06/2026
Tài liệu này mô tả ý định thiết kế của sản phẩm. Một số tính năng đã implement trong UI mockup nhưng chưa có backend logic thực sự.