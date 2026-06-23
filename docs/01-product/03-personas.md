# Personas — NovelFlow

📅 06/2026 · Dựa trên: user research, community sources, existing flow.md  
📌 3 personas chính + 1 anti-persona

---

## Persona 1 — Linh · Dịch giả solo (PRIMARY)

> "Tôi dịch vì đam mê, nhưng tôi muốn dịch nhanh hơn để còn thời gian sống."

**Vai trò:** Dịch giả cá nhân, không có nhóm  
**Tần suất:** Dịch đều đặn 2–5 chương/ngày, 5–6 ngày/tuần  
**Kinh nghiệm:** 2–4 năm dịch fan, quen với ChatGPT + Google Docs workflow

### Bối cảnh
Linh là sinh viên năm 3, dịch 1–2 truyện tiên hiệp Trung Quốc song song. Đọc được tiếng Trung ở mức cơ bản, đôi khi dùng EN MTL làm reference. Mỗi tháng xuất bản 80–120 chương lên hako.vn, có lượng độc giả ổn định khoảng 3.000 người.

### Jobs-to-be-done
- Dịch đều đặn mà không bị vấp vì phải tra cứu thuật ngữ
- Đảm bảo tên nhân vật và xưng hô nhất quán xuyên suốt hàng trăm chương
- Xuất bản bản dịch có format đẹp lên hako mà không mất thời gian copy-paste sửa lại

### Điểm đau
1. **Mỗi phiên làm việc phải "warm up" AI** — paste lại glossary, nhân vật, yêu cầu dịch vào ChatGPT
2. **Quên xưng hô** — sau 80 chương không nhớ nhân vật A gọi B là gì từ khi kết nghĩa huynh đệ
3. **Thuật ngữ drift** — chương 1 dịch "Đan Tháp" nhưng chương 60 dịch thành "Luyện Đan Lầu" vì quên
4. **Onboarding mới** — mỗi truyện mới phải tự tạo lại toàn bộ glossary từ đầu
5. **Export pain** — copy bản dịch → paste vào hako → sửa format → đăng bài mất 20 phút/chương

### Thước đo thành công
- Số chương/giờ (hiện tại: ~1.2ch/h, mục tiêu: ≥ 2ch/h)
- Số lần phải quay lại sửa xưng hô sai (hiện tại: ~3 lần/chương, mục tiêu: 0)
- Click từ mở app đến token đầu tiên (mục tiêu: ≤ 3 click)

### Quote
> "Thứ tôi ghét nhất là mở ChatGPT, paste cái đoạn hướng dẫn 500 chữ, paste glossary 200 dòng, rồi mới được dịch. Ngày nào cũng vậy."

---

## Persona 2 — Minh · Trưởng nhóm dịch (SECONDARY)

> "Tôi lo cả nhóm hiểu truyện theo cùng một cách."

**Vai trò:** Lead dịch, đồng thời dịch ~40% chương, phần còn lại phân công  
**Tần suất:** Online mỗi ngày để review và phân công  
**Kinh nghiệm:** 5 năm, từng làm solo rồi scale thành nhóm 5 người

### Bối cảnh
Minh quản lý nhóm dịch 5 người cho một manhwa action Hàn Quốc nổi tiếng. Mỗi tuần nhóm xuất bản 15–20 chương. Minh tự dịch phần lõi, phân công 4 người còn lại dịch song song, rồi tự review tất cả trước khi đăng.

### Jobs-to-be-done
- Đảm bảo 5 dịch giả dịch cùng một kiểu cho cùng thuật ngữ
- Biết ai đang làm gì, ai đang kẹt
- Review nhanh mà không phải đọc từng dòng — focus vào chỗ "nghi ngờ"

### Điểm đau
1. **Inconsistency giữa thành viên** — mỗi người có file Excel riêng, không sync
2. **Không biết ai đang dịch chương nào** — giao tiếp qua Discord, dễ đụng độ
3. **Review tốn công** — phải mở raw + dịch bên cạnh nhau để đối chiếu
4. **Mất người** — dịch giả bỏ giữa chừng, không ai biết họ đã làm đến đâu
5. **Onboarding thành viên mới** — phải giải thích style guide và thuật ngữ riêng cho từng người

### Thước đo thành công
- Số chương lỗi thuật ngữ/tuần (mục tiêu: 0)
- Thời gian review mỗi chương (mục tiêu: < 5 phút/chương)
- Không đụng độ chương (2 người cùng dịch 1 chương)

### Quote
> "Bực nhất là reviewer comment 'sai tên nhân vật' mà dịch giả đó không biết tên đúng là gì vì không có chỗ reference chung."

---

## Persona 3 — Thu · Editor / Proofreader (TERTIARY)

> "Tôi chỉ muốn tập trung vào đoạn chưa ổn, không phải đọc lại từ đầu."

**Vai trò:** Editor trong nhóm dịch, không tự dịch thô  
**Tần suất:** 2–3 buổi/tuần, mỗi buổi 2–3 giờ  
**Kinh nghiệm:** Đọc nhiều, có gu văn học, đọc được ngôn ngữ nguồn ở mức cơ bản

### Bối cảnh
Thu tham gia nhóm dịch của Minh với vai trò editor. Nhận bản dịch thô đã qua AI, chỉnh sửa văn phong và verify thuật ngữ. Đôi khi cần đối chiếu raw để kiểm tra khi nghi ngờ.

### Jobs-to-be-done
- Đọc bản dịch, đánh dấu đoạn "chưa ổn" để xem lại
- So sánh dịch vs raw khi cần verify
- Không sửa những gì không cần sửa

### Điểm đau
1. **Không biết đoạn nào là AI-generated** — không có dấu hiệu nào để biết đoạn nào cần review kỹ hơn
2. **Không thể đối chiếu raw nhanh** — phải mở file khác, tìm đoạn tương ứng thủ công
3. **Không có nơi ghi chú** — phải dùng Google Docs comment, không liên kết với workflow dịch
4. **Không biết context của nhóm** — không biết glossary, style guide là gì

### Thước đo thành công
- Tỷ lệ đoạn "cần review" không bị bỏ sót
- Thời gian tìm raw tương ứng khi cần đối chiếu (mục tiêu: < 3 giây)

---

## Anti-persona — Người dùng KHÔNG phải target

### Dịch giả chuyên nghiệp có hợp đồng
Người dịch sách có publisher, có NDA, có yêu cầu pháp lý về quyền tác giả. NovelFlow không được thiết kế cho workflow có pháp lý, không có audit trail, không có version control chuyên nghiệp.

### Người dùng chỉ muốn "đọc bản dịch nhanh"
Độc giả muốn MTL một chương để đọc chơi, không có ý định đăng hay build glossary. Workflow và UX của NovelFlow tối ưu cho production use, không phải casual read.

### Dịch giả manga / webtoon
Manga cần xử lý bubble text, layer hình ảnh, typesetting — khác hoàn toàn novel. Ngoài phạm vi v1.

---

## Ma trận nhu cầu theo persona

| Feature | Linh (solo) | Minh (lead) | Thu (editor) |
|---------|-------------|-------------|--------------|
| Glossary Manager | P1 | P1 | P2 (view only) |
| Character tracker | P1 | P1 | P2 (view only) |
| AI translation | P1 | P1 | P3 (không dùng) |
| Chapter status tracking | P1 | P1 | P1 |
| Raw text import | P1 | P1 | — |
| Export to publish | P1 | P1 | P2 |
| Split pane (raw + translated) | P1 | P1 | P1 |
| Review mode / annotations | P2 | P1 | P1 |
| Assign chapter to member | — | P1 | — |
| Consistency checker | P2 | P1 | P2 |
| Translation memory | P2 | P2 | — |
| Quick-add from selection | P1 | P2 | — |
| Batch translate | P2 | P1 | — |
| Search across novel | P2 | P1 | P2 |
