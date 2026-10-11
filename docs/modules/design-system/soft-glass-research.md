# Phong cách "kính trên nền ảnh" từ ba ảnh tham khảo

Cập nhật: 2026-10-08 · Trạng thái: **Quan sát** (phần 1–5, 9), **Đề xuất** (phần 6–8). **Lịch sử:** cùng ngày
2026-10-08 hướng này được thay bằng token ba tầng theo LMS v3 và style Acme; phần 9 (cỡ chữ của app
dịch) vẫn là dữ liệu tham khảo. Quyết định đang chạy ở [chương chính](README.md). Chủ trì: chủ sản phẩm.

## Câu hỏi chương này trả lời

Hai ảnh trong `assets/` dùng phong cách gì, đo ra được những token nào (màu, chữ, bán kính, bóng, viền),
dựng từ những component nào, và nếu Mira muốn mượn phong cách này thì token và component phải đổi ra sao?

## Nguồn

| Ảnh | Kích thước | Nội dung |
| --- | --- | --- |
| A: [`0adf6700….jpg`](../../../assets/0adf6700f54ab7455c000843ef63a3ca.jpg) | 1200 × 1106 | Cửa sổ hai cột trên nền đá sa thạch lúc hoàng hôn: trái là tài liệu "Current Understanding" có ba nút Context / Plan / Notes; phải là chat với AI, có nhãn suy nghĩ, thanh bước và ô nhập. |
| B: [`b9d45117….jpg`](../../../assets/b9d45117c7db2e829d295f90f577f986.jpg) | 1200 × 900 | Cửa sổ bốn cột trên nền sa mạc: rail icon, sidebar thư mục, chat sinh workflow có card lồng, panel "Workflow Editor" với node và bảng kết quả mẫu. |
| C: [`e3fa7066….jpg`](../../../assets/e3fa7066d4daaf29e647bd1f8059618d.jpg) (thêm sau) | 1200 × 1200 | Hộp thư: rail icon trên nền xám nhạt, logo ô vuông tối, mục đang chọn là ô trắng nổi; tấm trắng có header "Inbox • 14.171 emails", hàng nút (Compose màu than, các tab dạng chip), hai card có viền. |

Cách đo: lấy trung bình vùng điểm ảnh bằng Pillow cho màu nền; lấy điểm tối nhất trong vùng chữ cho màu
chữ. Hạn chế cần nhớ khi đọc số:

- Ảnh là JPEG đã thu nhỏ, nên chữ mảnh bị khử răng cưa: **màu chữ đo được nhạt hơn màu thật**, độ tương
  phản tính ra là mức thấp nhất.
- Không biết tỉ lệ gốc (ảnh mockup thường xuất 2×), nên kích thước tính theo **điểm ảnh của ảnh** và chỉ
  dùng được dưới dạng tỉ lệ.
- Đây là ảnh concept, không có mã nguồn. Cột trái của ảnh A bị cắt; không có theme tối.

## 1. Phong cách tổng thể (quan sát)

Gọi tắt là **kính ấm trên nền ảnh** (soft glass). Năm đặc điểm lặp lại ở cả hai ảnh:

1. **Cửa sổ nổi trên ảnh thiên nhiên.** Cửa sổ là một tấm kính mờ bo góc lớn, có viền sáng 1 px ở mép;
   màu của ảnh nền (hồng hoàng hôn ở A, xanh trời ở B) ngấm nhẹ vào kính.
2. **Panel lồng trong khung.** Mỗi cột là một tấm nền riêng, bo góc nhỏ hơn khung và cách mép khung vài
   px. Khe giữa các tấm để lộ lớp kính bên dưới, thay cho đường kẻ chia cột.
3. **Gần như không có đường viền.** Phân lớp bằng chênh độ sáng 2–6 % giữa các mặt nền và bóng rất mềm.
   Viền chỉ xuất hiện ở control (nút tab của A, ô nhập của B).
4. **Gần như không có màu accent.** A đơn sắc ấm hoàn toàn. B dùng **đen** làm màu hành động (nút dừng,
   icon node) và chỉ dùng màu cho ý nghĩa: link xanh dầu, biến đỏ / xanh lá, badge xanh nhạt, logo app bên
   thứ ba. Gradient pastel chỉ có một chỗ: vầng sáng quanh ô nhập khi AI đang sinh.
5. **Phân cấp bằng độ mờ chữ, không bằng độ đậm.** Chỉ có hai độ đậm (thường và vừa). Tiêu đề chỉ to hơn
   thân chữ chừng 1,15 lần; mô tả, nhãn trạng thái và placeholder lùi về bằng màu nhạt dần.

Hai ảnh khác nhau ở **nhiệt độ màu**: A ấm (giấy kem, hồng phấn), B trung tính hơi lạnh (xám sứ, trắng).
Cấu trúc và tỉ lệ thì giống nhau, nên có thể coi là hai skin của cùng một hệ.

## 2. Màu đo được (quan sát)

### Mặt nền

| Vai trò | Ảnh A (ấm) | Ảnh B (trung tính) |
| --- | --- | --- |
| Ảnh nền sau cửa sổ | `#c4afb8` (trời hồng) | `#7c9bb2` (trời xanh) |
| Khung kính cửa sổ | `#f0dfd7`, mép sáng `#fff4f4` | rail `#e8e5e4`, mép sáng `#ecf5fc` |
| Sidebar | không có | `#f0edeb` |
| Tấm tài liệu / cột chính | `#fef7f1` trên, `#fbf6f2` dưới | chat `#f2f2f1` |
| Cột chat / panel phụ | `#faeeed` trên → `#eee3df` dưới (kính, có chuyển màu) | `#f7f4f3` |
| Card nổi (ô nhập, node) | `#fdf8f2` | `#fefefe`; bảng `#f9f9f9` |
| Card lồng trong chat | không có | card `#f0f0f0`, ô nhập trong card `#f5f5f5`, khối upload `#e6e5e4` |
| Bong bóng người dùng | `#f0e7e3` … `#e2d9d4` | `#e6e6e4` |
| Dòng đang chọn | không có | `#dddee0` trên sidebar `#f0edeb` (≈ chữ 8 %) |
| Nút tròn phụ (gửi) | `#dfdad6` | nút Run `#e8e9ed` |
| Thanh bước: đang / chưa | `#c8bebd` / `#dbd3d1` | không có |

### Chữ

| Vai trò | Ảnh A | Ảnh B |
| --- | --- | --- |
| Chính (tiêu đề, thân) | `#23201b` – `#2f2a27` | `#000100` (tiêu đề), `#4f5052` (mục sidebar), `#505050` (ô bảng) |
| Mô tả | `#87827c` | nhãn nhóm `#606163` |
| Nhãn trạng thái ("Thinking…") | `#938884` | không đo được, nhìn như chữ mô tả |
| Placeholder, giờ, meta | `#999490` – `#bbb6b2` | `#bdbbbc` (nhãn "SAMPLE OUTPUT") |
| Link / hành động phụ | không có | `#27607e` ("Add recipient") |
| Biến trong mẫu thư | không có | đỏ `#893238`; xanh lá (quá mảnh, không đo được) |

### Tương phản đo được

Tính theo WCAG trên màu đo được, nên là mức thấp nhất:

| Cặp | Tỉ lệ | So với quy tắc của Mira (muted ≥ 6,3) |
| --- | --- | --- |
| A: chữ chính trên giấy | 15,3 | Đạt |
| A: mô tả `#87827c` trên giấy | 3,6 | **Không đạt** |
| A: nhãn suy nghĩ trên cột chat | 2,7 | **Không đạt**, dưới cả AA cho chữ lớn |
| A: meta "Updated automatically" | 1,9 | **Không đạt** |
| A: giờ trong bong bóng | 2,0 | **Không đạt** |
| B: mục sidebar | 6,9 | Đạt |
| B: nhãn nhóm sidebar | 5,3 | Gần đạt |
| B: link `#27607e` | 6,0 | Đạt AA |

Ảnh A đẹp một phần vì chữ phụ rất nhạt. Mượn phong cách này thì phải đậm chữ phụ lên (phần 6).

## 3. Chữ, khoảng cách và hình khối (quan sát)

**Font.** Sans grotesk hiện đại, chữ `a` hai tầng, `t` cắt vát, khoảng cách chữ hơi chặt; gần với Inter
hoặc SF Pro. Không có serif, không có chữ đậm (700). Số liệu trong ảnh B dùng chữ số đều nhau.

**Thang chữ** (điểm ảnh của ảnh, lấy thân chữ = 1):

| Bậc | Ví dụ | Cỡ ảnh | Tỉ lệ | Độ đậm |
| --- | --- | --- | --- | --- |
| Tiêu đề khối | "Current Understanding" | ≈ 17 | 1,15 | 500 |
| Tiêu đề mục | "1. Core Idea" | ≈ 16,5 | 1,1 | 400 |
| Thân | tin nhắn chat, mô tả | ≈ 14,5 | 1 | 400 |
| Nhỏ | mục sidebar, nhãn nút | ≈ 13 | 0,9 | 400 / 500 |
| Meta | "Updated automatically", giờ, nhãn nhóm | ≈ 11 – 12 | 0,8 | 400; giờ in nghiêng |

Khoảng dòng của thân chữ khoảng 1,25 – 1,3, khá chặt. Khoảng giữa hai lượt chat lớn (≈ 3 dòng), nên chat
đọc như một văn bản liền chứ không như danh sách bong bóng.

**Bán kính** (ước lượng từ đường chéo góc, sai số ±2 px ảnh), lồng nhau theo quy tắc *bán kính trong =
bán kính ngoài − khe*:

| Lớp | A | B |
| --- | --- | --- |
| Khung cửa sổ | ≈ 22 | ≈ 17 |
| Tấm panel | ≈ 14 | ≈ 12 |
| Card, ô nhập lớn | ≈ 14 | ≈ 12 |
| Bong bóng | ≈ 12 | ≈ 14 |
| Nút, ô nhập nhỏ | ≈ 6 – 8 | ≈ 6 |
| Chip, nút Run, nút gửi | tròn hẳn | tròn hẳn |

**Khoảng cách.** Lề trong panel rộng (≈ 30 px ảnh ở A, ≈ 16 – 24 px ở B); khe giữa khung và panel
≈ 4 – 8 px. Các phần tử dùng bội số 4.

**Bóng và viền.**

- Khung cửa sổ có bóng rất rộng và nhạt, gần như chỉ là vùng tối dịu dưới đáy.
- Card nổi (node workflow, ô nhập) có bóng 1 – 2 lớp rất mềm cộng viền sáng; không có viền xám.
- Viền sáng 1 px ở mép khung (`#fff4f4` ở A, `#ecf5fc` ở B) là chi tiết làm ra cảm giác "kính".
- Nút tab ở A có viền 1 px `#e6e1dd`; nút đang chọn có viền và chữ đậm màu hơn, nền giữ nguyên.

## 4. Component (quan sát)

| Component | Ảnh | Cách dựng |
| --- | --- | --- |
| Nút tab có viền | A | Ba nút Context / Plan / Notes; mỗi nút có icon + chữ, viền mảnh, bo 6 – 8. Nút đang chọn: viền và chữ đậm hơn. Không dùng gạch chân hay nền đặc. |
| Chọn phiên bản | A | "3.1 version ⌄": chữ nhạt + mũi tên, không có khung. |
| Tài liệu tự cập nhật | A | Nhãn meta có icon ("Updated automatically"), danh sách đánh số có tiêu đề + một dòng mô tả nhạt. |
| Đầu cột chat | A | Avatar tròn gradient, tên + dòng phụ nhạt, hai nút icon (soạn mới, thu cột). |
| Tin nhắn AI | A, B | **Không có bong bóng**: chữ chạy thẳng trên nền. Dưới mỗi tin có hàng icon nhỏ nhạt (chia sẻ, chạy lại, chép, thêm). |
| Tin nhắn người dùng | A, B | Bong bóng đặc màu nhạt, căn phải, bo đều; giờ in nghiêng nhỏ ở góc dưới phải trong bong bóng (A). |
| Nhãn suy nghĩ | A, B | Icon + chữ nhạt: "Thinking about the concept…", "Thinking for 30s", "Answering • 21s". |
| Thanh bước | A | "Step 1 of 4: Define the first version" (phần đầu nhạt, phần sau đậm hơn) + bốn gạch ngắn. |
| Ô nhập chat | A, B | Card lớn sáng hơn nền, bo lớn. A: placeholder, nút đính kèm trái, nút gửi tròn phải. B: chip "+", đính kèm, mic, nút dừng tròn **đen**; vầng sáng pastel khi đang sinh. |
| Mention | B | Chip "@automation" chữ xanh trên nền trắng, nằm trong bong bóng người dùng. |
| Card công cụ trong chat | B | Card "Workflow Preview" có nút "Editor ✎" bên phải; bên trong là card thứ hai chứa tab chữ, ô nhập không viền, đường kẻ "Or" chấm, khối upload. |
| Thu gọn câu trả lời | B | "Show all answer ⌄" chữ nhạt. |
| Rail và sidebar | B | Rail icon xám; sidebar có ô tìm, nhãn nhóm nhỏ ("Build", "Folders"), dòng chọn nền xám, danh sách dự án cắt bằng "…", không icon; chân sidebar là workspace có logo cam. |
| Breadcrumb | B | Chip nhạt chứa icon + "Folders > Marketing Automation". |
| Panel phụ | B | Tiêu đề trái, hai nút icon tròn (mở rộng, đóng) phải. |
| Node workflow | B | Card trắng, icon vuông đen hoặc logo, tiêu đề, badge nhỏ bên phải ("Starting Point" xanh, "Decision" xám); nối nhau bằng đường chấm. |
| Bảng mẫu | B | Nhãn in hoa nhạt, tiêu đề cột đậm vừa, hàng có checkbox đen, không kẻ dọc, kẻ ngang rất nhạt. |

## 5. Đối chiếu với Mira (quan sát)

- **Bố cục A gần như trùng màn Chương của Mira:** văn bản bên trái, chat AI bên phải. Ba nút Context /
  Plan / Notes ứng với vùng ngữ cảnh; "tài liệu tự cập nhật" ứng với ghi chú ngữ cảnh mà AI duy trì.
- **Bố cục B ứng với thư viện + phiên làm việc:** rail + sidebar ≈ danh sách tác phẩm; card công cụ trong
  chat ≈ đề xuất của AI hiện ngay trong luồng chat; panel phụ ≈ màn duyệt đề xuất.
- **Xung đột với hướng đã chốt.** Ngày 2026-10-07 chủ sản phẩm chọn học *y hệt* Hermes (nền đặc, góc
  2 – 4 px, accent xanh, chữ 13 px, zoom 90 %). Phong cách này trái Hermes ở gần mọi trục: góc lớn, panel
  nổi, nền ảnh, không accent. Không thể vừa "y hệt Hermes" vừa "như hai ảnh"; cần chủ sản phẩm chọn
  (phần 8).
- **Hạ tầng đã có:** `tokens.css` đã chia ba tầng seed → semantic → kích thước, và đã có kính acrylic
  (`data-glass`) trên Windows 11. Đổi sang phong cách này chủ yếu là thêm một skin, cộng một số component
  mới; không phải dựng lại.

## 6. Bộ token đề xuất (đề xuất)

Viết theo đúng ba tầng trong [`styles/tokens/`](../../../src/renderer/src/styles/tokens/) để có thể thêm
thành skin thứ hai (`data-skin="paper"`). Theme sáng lấy từ ảnh A, đã chỉnh chữ phụ cho đạt quy tắc của
Mira. **Theme tối không có trong ảnh**; giá trị bên dưới là suy ra, phải dựng thử mới chốt được.

### Tầng 1: seed

| Seed | Sáng (ấm, từ A) | Sáng (trung tính, từ B) | Tối (suy ra) |
| --- | --- | --- | --- |
| `--seed-foreground` | `#2a2521` | `#1e1f21` | `#ede6df` |
| `--seed-accent` | `#2a2521` (mực) | `#111111` | `#ede6df` |
| `--seed-link` | `#27607e` | `#27607e` | `#7fb3cc` |
| `--seed-backdrop` (sau cửa sổ) | ảnh, hoặc gradient `#c4afb8 → #f0dfd7` | ảnh, hoặc `#7c9bb2` | ảnh làm tối 60 % |
| `--seed-window` (kính) | `#f0dfd7` | `#e8e5e4` | `#221e1b` |
| `--seed-paper` (cột chính) | `#fef7f1` | `#f2f2f1` | `#1c1917` |
| `--seed-panel` (cột phụ) | `#eee3df` (+ gradient lên `#faeeed`) | `#f7f4f3` | `#24201d` |
| `--seed-raised` (card, ô nhập) | `#fdf8f2` | `#fefefe` | `#2b2622` |
| `--seed-bubble` | `#ece4df` | `#e6e6e4` | `#302a26` |

Accent là màu mực (gần màu chữ) vì cả hai ảnh không có màu thương hiệu: nút chính đen hoặc nâu đen, vòng
focus cũng màu mực. Phần 8 hỏi có muốn thêm một accent đất nung lấy từ đá sa thạch không.

### Tầng 2: vai trò semantic

| Vai trò | Công thức | Ra (sáng ấm) | Tương phản |
| --- | --- | --- | --- |
| `--text-primary` | foreground | `#2a2521` | 14,3 trên giấy; 12,1 trên cột chat |
| `--text-muted` (mô tả) | hex cố định | `#554e49` (đo được `#87827c`) | 7,7 trên giấy; 6,5 trên cột chat và trong bong bóng |
| `--text-faint` (meta, giờ, placeholder) | hex cố định | `#736b66` (đo được `#a49b96`–`#bbb6b2`) | 4,9 trên giấy; 4,2 trên cột chat |
| `--text-decor` | foreground 30 % | | chỉ dùng trang trí |
| `--surface-hover` | foreground 4 % | | |
| `--surface-selected` | foreground 8 % | ≈ `#dddee0` của B | |
| `--border-subtle` | foreground 8 % | ≈ `#e6e1dd` của A | |
| `--border-strong` (nút tab đang chọn) | foreground 40 % | | |
| `--border-glass` (mép kính) | trắng 70 % | ≈ `#fff4f4` | |
| `--status-error` | | `#a83a40` (từ `#893238`) | 5,9 trên giấy |
| `--status-success` | | giữ `#1f8a65` | |
| `--status-info` / link | | `#27607e` | 6,5 trên card |
| `--ai-glow` | gradient | `#d0e1f4 → #e4e2f3 → #e9d3ce` | chỉ cho trạng thái đang sinh |

### Tầng 3: kích thước

| Nhóm | Token | Giá trị gợi ý (px CSS) | Lý do |
| --- | --- | --- | --- |
| Bán kính | `window` 16, `panel` 12, `card` 12, `bubble` 12, `control` 8, `chip` 999 | Ảnh 2× thì chia đôi số đo; lồng theo quy tắc trong = ngoài − khe |
| Khe | `gap-window` 6, `pad-panel` 20 – 24 | Khe để lộ lớp kính thay đường kẻ |
| Chữ | `body` 14, `small` 13, `meta` 11.5, `title` 16, `heading` 16 medium; editor giữ 18 | Tiêu đề chỉ hơn thân 1,15 lần; chỉ dùng 400 và 500 |
| Khoảng dòng | UI 1,3; chat 1,45; editor giữ như hiện tại | Ảnh dùng 1,25 – 1,3, quá chặt cho tiếng Việt có dấu |
| Bóng | `shadow-window` (rộng, ≤ 12 %); `shadow-card` (2 lớp, ≤ 6 %) + `inset 0 0 0 1px` trắng 60 % | Không dùng viền xám cho card |
| Kính | `backdrop-filter: blur(24px) saturate(140%)`; nền kính 72 – 80 % | Chỉ cho khung và cột phụ; giấy đặc để đọc |

Bản nháp CSS cho tầng 1 theme sáng ấm:

```css
html[data-skin='paper'][data-theme='light'] {
  --seed-foreground: #2a2521;
  --seed-accent: #2a2521;
  --seed-link: #27607e;
  --seed-window: #f0dfd7;
  --seed-paper: #fef7f1;
  --seed-panel: #eee3df;
  --seed-raised: #fdf8f2;
  --seed-bubble: #ece4df;
  --text-muted: #554e49;
  --text-faint: #736b66;
  --radius-window: 16px;
  --radius-panel: 12px;
  --radius-control: 8px;
}
```

## 7. Hệ component đề xuất (đề xuất)

Giữ component đang có ở [`components/`](../../../src/renderer/src/components/), chỉ đổi token. Những thứ
cần thêm hoặc đổi cách dựng:

| Component | Việc cần làm | Dùng ở Mira |
| --- | --- | --- |
| `WindowFrame` + `Panel` lồng | Khung kính, các cột là tấm nổi có khe; bỏ đường kẻ chia cột | Mọi màn |
| `SegmentedControl` biến thể outline | Nút rời có viền, đang chọn thì viền và chữ đậm hơn (như A) | Context / Plan / Notes của vùng ngữ cảnh |
| `ChatMessage` | AI không bong bóng + hàng action icon; người dùng có bong bóng + giờ trong bong bóng | Chat chương |
| `ThinkingLabel` | Icon + chữ faint + thời gian ("Đang đọc chương… • 12s") | Trạng thái AI |
| `Composer` | Card lớn, nút gửi tròn, nút dừng màu mực, vầng `--ai-glow` khi đang sinh | Chat chương |
| `ToolCard` | Card lồng trong luồng chat, có nút mở sang panel phụ | Đề xuất sửa của AI |
| `StepProgress` | "Bước 1/4: …" + gạch | Onboarding, tạo tác phẩm |
| `Breadcrumb` dạng chip | | Đầu màn tác phẩm / chương |
| `Badge` nhạt | Nền màu 15 – 20 %, chữ cùng màu đậm | Trạng thái chương, loại đề xuất |

Quy tắc dùng:

- **Một màu hành động.** Màu mực cho hành động chính; xanh dầu chỉ cho link; màu trạng thái chỉ khi có
  nghĩa.
- **Phân lớp bằng nền, không bằng viền.** Viền chỉ dành cho control và mép kính.
- **Kính chỉ ở khung và cột phụ.** Cột văn bản truyện luôn đặc để chữ dịch dễ đọc.
- **Không dùng chữ dưới bậc faint cho nội dung cần đọc.**

## 8. Rủi ro và câu hỏi cần chốt

**Rủi ro:**

- **Đọc lâu.** Mira là công cụ dịch truyện dùng hàng giờ. Nền ảnh và kính đẹp trong ảnh chụp nhưng có thể
  gây mỏi; cần chạy thử một phiên dịch thật.
- **Hiệu năng.** `backdrop-filter` trên cửa sổ lớn tốn GPU; acrylic gốc của Windows rẻ hơn nhưng chỉ có
  từ build 22621.
- **Mật độ.** Lề rộng và chữ 14 px làm vừa ít nội dung hơn Hermes (13 px, zoom 90 %).
- **Không có theme tối mẫu.** Theme tối phải tự thiết kế, rủi ro lệch tinh thần ảnh.

**Câu hỏi cho chủ sản phẩm:**

1. Phong cách này **thay** hướng Hermes, hay chỉ là **skin thứ hai** (`paper`) song song với "nous"?
2. Theo nhiệt độ của ảnh A (ấm) hay ảnh B (trung tính)?
3. Có cho ảnh nền sau cửa sổ không? Nếu có thì ảnh mặc định nào, và người dùng có tự chọn được không?
4. Accent: giữ màu mực như ảnh, hay thêm một màu đất nung (ví dụ `#9a4a2a`, 5,8:1 trên giấy)?
5. Giữ zoom 90 % và chữ 13 px của Hermes, hay lên 14 px như ảnh?

## 9. Cỡ chữ mặc định của app dịch và app đọc

Khảo sát ngày 2026-10-08 trên web. Ít app công bố cỡ chữ mặc định; chỉ ghi những app có nguồn. Đổi
pt sang px theo 96 dpi (1 pt = 1,333 px).

| App | Mặc định | Vùng | Nguồn |
| --- | --- | --- | --- |
| OmegaT | font `Dialog` cỡ 14 (≈ 14 px trên Swing) | Ô gốc và ô dịch | [hằng số OmegaT](https://omegat.sourceforge.io/javadoc-standard/constant-values.html) |
| Trados Studio 2022 | Segoe UI; khoảng tự co 8–12 pt (10,7–16 px); người dùng chỉ được chọn 10/12/14 pt | Lưới soạn dịch | Diễn đàn RWS, ProZ (người dùng kể, không phải tài liệu chính thức) |
| MateCat | 18 px cho chữ gốc và chữ dịch, 14–16 px cho giao diện; dòng 1,4–1,5 | Editor và UI | Mã nguồn MateCat (`_variables.scss`, `SegmentBody.scss`) |
| Weblate | 16 px, dòng 1,5 | UI và ô dịch | Suy ra từ mặc định Bootstrap 5.3 mà Weblate dùng |
| Google Docs, Word | 11 pt (14,7 px) | Văn bản | Nhiều nguồn |
| Obsidian | editor 16 px; UI 12/13/15/20 px; dòng 1,5 / 1,3 | Editor và UI | [tài liệu CSS của Obsidian](https://docs.obsidian.md/Reference/CSS+variables/Foundations/Typography) |
| Notion | 16 px | Trang | Bài viết bên thứ ba, chưa xác nhận |

**Không tìm được** cỡ mặc định của memoQ, Phrase, Smartcat, Crowdin, Lokalise, Wordfast; của các công
cụ dịch truyện cộng đồng (QuickTranslator, Sáng Tác Việt, Wikidich, TruyenConvert); và của các app đọc
(Kindle, Apple Books, Play Books, Wattpad, Webnovel, Moon+ Reader). Các app này đều cho đổi cỡ chữ nhưng
không công bố mặc định.

Tổng hợp:

- **Chữ giao diện:** 12–15 px, phổ biến 13–14 px. CAT tool trên Windows theo font hệ thống (≈ 12 px) và
  bị người dùng chê nhỏ.
- **Chữ soạn dịch:** 14–18 px, trung vị ≈ 16 px.
- **Văn bản dài:** 14,7–17 px.
- **Dòng:** MateCat và Weblate dùng 1,4–1,5. Tiếng Việt chồng dấu (ệ, ẫ, Ệ) nên 1,6–1,7 thì dấu không
  chạm dòng trên.

Mira chọn: chữ giao diện **14 px** (nhãn phụ 13 px); chữ truyện **17 px**, giữa trung vị 16 px của CAT
tool và 18 px của MateCat, vì Mira là nơi đọc truyện lâu chứ không chỉ sửa từng đoạn; dòng truyện
**1,65**. Bỏ zoom 90 % để cỡ ghi trong token là cỡ thấy trên màn hình.

---

[Chương chính](README.md) · [Phân tích Hermes](hermes-comparison.md) · [Mục lục module](../README.md)
