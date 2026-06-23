# Feature Specification — NovelFlow

📅 06/2026  
📌 Xếp theo priority P0 → P1 → P2 → P3. Mỗi feature có: problem, solution, acceptance criteria, AI role.

---

## Nguyên tắc ưu tiên

- **P0** — Blocker: app không dùng được nếu thiếu (hoặc gây frustration mỗi phiên)
- **P1** — Core value: differentiator so với dùng ChatGPT + Google Docs
- **P2** — Quality of life: tốt hơn đáng kể nhưng có thể workaround
- **P3** — Future: team collaboration, advanced features

---

## P0 — Nền tảng bắt buộc

### F-P0-01 · Session Resume

**Problem:** Mở app phải tự nhớ "hôm qua đến đâu", mất 3–4 click và 30 giây để tìm lại chỗ dịch dở.

**Solution:**
- App ghi nhớ chương đang active + scroll position theo từng truyện
- Library card hiển thị: `▶ Tiếp tục · Chương 47` làm action mặc định
- Sidebar luôn có chip `▶ Tiếp tục` ở trên cùng (trước cả ô tìm kiếm)
- Keyboard: `Enter` trên card = mở thẳng chương đang dịch dở

**Acceptance criteria:**
- [ ] Mở app → 1 click → đang ở đúng chương đang dịch
- [ ] Sau khi tắt app và mở lại → trạng thái giữ nguyên
- [ ] Nếu chưa có chương active → mở chương đầu tiên chưa dịch

**AI role:** Không có.

---

### F-P0-02 · Context persistence across sessions

**Problem:** AI "quên" toàn bộ glossary và nhân vật khi bắt đầu session mới — phải paste lại mỗi ngày.

**Solution:**
- Glossary + characters + style được lưu per-novel trong local storage
- Mỗi lần gọi AI → inject tự động vào prompt (không cần user làm gì)
- Visual indicator: status bar hiện "AI: 23 thuật ngữ · 12 nhân vật · đang inject"

**Acceptance criteria:**
- [ ] Tắt app, mở lại, dịch chương mới → AI vẫn dùng đúng thuật ngữ từ glossary
- [ ] User không cần làm bất kỳ bước nào để inject context
- [ ] Khi context rỗng (truyện mới) → AI vẫn chạy, chỉ thiếu constraints

**AI role:** Nhận context injection, không tự tạo context mới nếu không được yêu cầu.

---

### F-P0-03 · Translate button với full state machine

**Problem:** Nút dịch không có trạng thái "Dừng" khi đang stream → mất kiểm soát, tốn token nếu AI dịch sai hướng.

**Solution:**
```
idle      → [▶ Dịch tiếp] primary
streaming → [■ Dừng] destructive + spinner ở paragraph label
paused    → [▶ Tiếp tục] primary
done      → [✓ Xong → Ch.48 →] primary
error     → [↻ Thử lại từ đoạn 7] secondary
```
- Giữ fixed width để layout không nhảy khi state thay đổi
- Lưu đoạn đã dịch khi dừng giữa chừng — tiếp tục được từ đúng đoạn

**Acceptance criteria:**
- [ ] Có thể dừng stream bất cứ lúc nào, phần đã dịch được giữ lại
- [ ] Sau lỗi mạng: "Thử lại từ đoạn N" không dịch lại từ đầu chương
- [ ] Ctrl+D = Dịch tiếp từ bất kỳ state nào

**AI role:** Stream token-by-token, dừng sạch khi nhận stop signal.

---

## P1 — Core value (differentiator)

### F-P1-01 · Raw text import

**Problem:** Dịch giả phải copy-paste thủ công từng chương từ web novel site — mất 30+ phút để import một truyện mới.

**Solution:**
- **Tab 1 — URL**: Paste URL của chapter list / trang nguồn → app scrape tự động
  - Supported: truyenfull.vn, wattpad, boxnovel, syosetu (list mở rộng theo demand)
  - Preview trước khi import: "342 chương · ~1.2M chữ · bắt đầu từ chương nào?"
- **Tab 2 — Paste text**: Paste nội dung raw → AI detect và tách chương tự động
- **Tab 3 — File upload**: Upload .txt / .epub / .docx
- Sau import: AI quét 3 chương đầu → đề xuất glossary + nhân vật (xem F-P1-02)

**Acceptance criteria:**
- [ ] Import thành công tối thiểu 1 nguồn (truyenfull.vn)
- [ ] Tách đúng chương, không mất text, giữ định dạng đoạn văn
- [ ] Preview hiện số chương tìm được trước khi bắt đầu download
- [ ] Nếu import fail → thông báo rõ lý do, không crash

**AI role:** Detect chapter breaks từ paste text, đề xuất initial glossary sau import.

---

### F-P1-02 · Glossary Manager

**Problem:** Fan groups thiếu glossary thống nhất → thuật ngữ drift across chapters là pain point #2 từ research.

**Solution:**

**Tạo và quản lý:**
- Table với columns: Gốc (raw) | Dịch | Ghi chú | Inject (toggle) | Nguồn (manual / AI)
- Click vào ô để sửa inline (không mở form riêng)
- Dòng mới = blank row cuối bảng
- Import/export CSV

**Injection behavior:**
- Chỉ inject terms có Inject=ON vào prompt
- Lọc per-chapter: chỉ inject terms xuất hiện trong raw text chương hiện tại (giảm token)
- Limit tự động: nếu > 50 terms matched → chỉ inject top 50 theo frequency

**AI-assisted:**
- Nút "AI đề xuất" → AI scan raw text chương hiện tại → đề xuất terms chưa có trong glossary
- Mọi AI suggestion phải có source rõ ("AI · ch.47") và nút xóa ngay tại chỗ
- Không auto-apply: user phải approve từng term

**Acceptance criteria:**
- [ ] Term trong glossary được inject đúng vào prompt AI
- [ ] AI dịch đúng thuật ngữ khi có glossary, không tự đổi
- [ ] Có thể tắt injection cho term cụ thể mà không cần xóa
- [ ] AI suggestions không override manual entries

**AI role:** Đề xuất terms khi được yêu cầu, inject glossary như constraint không phải suggestion.

---

### F-P1-03 · Character & Address tracker

**Problem:** Xưng hô giữa nhân vật thay đổi theo diễn biến (từ địch → bạn → tình nhân) — không tool nào trong ecosystem hiện tại track điều này.

**Solution:**

**Character card:**
- Tên gốc + Tên dịch + Alias list
- Role (protagonist / antagonist / supporting...)
- Mô tả ngắn (để AI hiểu context)

**Address phase (điểm khác biệt):**
- Mỗi cặp nhân vật (A ↔ B) có danh sách "phases":
  ```
  Phase 1 (ch.1–30):   A gọi B: "ngươi" · B gọi A: "tiểu tử"
  Phase 2 (ch.31–80):  A gọi B: "huynh" · B gọi A: "đệ"
  Phase 3 (ch.81+):    A gọi B: "anh ấy" · B gọi A: "anh"
  ```
- AI tự động nhận đúng phase dựa trên chương đang dịch
- Warning khi có conflict: "Chapter hiện tại không match phase nào"

**Acceptance criteria:**
- [ ] Xưng hô inject đúng phase theo chapter number
- [ ] Có thể thêm / sửa phase mà không ảnh hưởng phase khác
- [ ] AI không tự ý đổi cách xưng hô ngoài scope được define

**AI role:** Nhận address constraints per chapter, không sáng tạo thêm.

---

### F-P1-04 · Selection quick-add

**Problem:** Gặp tên mới khi đang dịch → phải rời màn hình, 6–8 steps, mất hoàn toàn mạch đọc.

**Solution:**
- Bôi đen bất kỳ text trong pane RAW → popover xuất hiện ngay tại chỗ
- Popover: `[+ Glossary]` `[+ Nhân vật]` `[+ Xưng hô]`
- Form inline tối giản: 2 ô (dịch nghĩa + ghi chú), Enter để lưu, Esc để hủy
- AI tự động dùng term vừa thêm từ đoạn tiếp theo (không cần restart)

**Acceptance criteria:**
- [ ] Bôi đen → popover trong < 100ms
- [ ] Lưu term → AI inject ngay lần gọi tiếp theo
- [ ] Không cần navigate, không scroll mất vị trí

**AI role:** Nhận real-time glossary update, áp dụng ngay.

---

### F-P1-05 · Export to publish

**Problem:** Không có workflow từ bản dịch hoàn chỉnh → format đúng để đăng lên platform. Copy-paste + sửa format mất 15–20 phút/chương.

**Solution:**
- Chọn 1 hoặc nhiều chương đã Done → Export
- Formats:
  - **Markdown** (hako.vn compatible)
  - **HTML** (docln.net, website riêng)
  - **Plain text** (generic, với paragraph breaks)
- Mỗi format có template có thể customize (header, footer, separators)
- Preview trước export
- Output: 1 file/chương hoặc bundle nhiều chương vào 1 file

**Acceptance criteria:**
- [ ] Export markdown đúng format hako.vn không cần sửa thêm
- [ ] Export nhiều chương vào 1 file với separator rõ ràng
- [ ] Preview trước khi export

**AI role:** Không có trong export flow.

---

## P2 — Quality of life

### F-P2-01 · AI-generated paragraph indicator

**Problem:** Không biết đoạn nào AI chưa được sửa — reviewer phải đọc toàn bộ.

**Solution:**
- Paragraphs AI-generated + chưa ai edit: background hơi khác (subtle, không flashy)
- Sau khi user edit: indicator mờ đi tự động
- Filter: "Chỉ hiện đoạn chưa review" → scroll qua nhanh

---

### F-P2-02 · Consistency checker

**Problem:** Cùng một raw term có thể được dịch nhiều cách khác nhau across chapters.

**Solution:**
- Scan cross-chapter: "Raw '玄铁' được dịch là 'Huyền Thiết' ở ch.1-30 nhưng 'Sắt Đen' ở ch.31-45"
- Highlight conflicts trong glossary manager
- One-click normalize: "Đổi tất cả thành..."

---

### F-P2-03 · Style guide per novel

**Problem:** AI không biết tone và style mong muốn của dịch giả cho từng truyện (formal/casual, archaic/modern, genre conventions).

**Solution:**
- Free-text style guide per novel (autosave, char indicator)
- AI presets: Xianxia / Isekai / Romance / Manhwa action — template gợi ý
- Custom instructions được inject vào system prompt

---

### F-P2-04 · Full-text search across novel

**Problem:** "Từ này đã dịch là gì ở chương 12?" — hiện không có cách nào tìm ngoài mở từng chương.

**Solution:**
- Ctrl+Shift+F → search panel
- Search trong raw text hoặc bản dịch hoặc cả hai
- Kết quả: list đoạn match với preview, click để navigate
- Đặc biệt hữu ích cho editor khi verify consistency

---

### F-P2-05 · Translation memory

**Problem:** Những câu lặp đi lặp lại (battle cries, catchphrases, format câu) phải dịch lại từ đầu mỗi lần.

**Solution:**
- Lưu lại các cặp (raw, translated) khi dịch giả approve
- Khi AI gặp đoạn tương tự (fuzzy match ≥ 80%) → suggest từ TM trước khi generate mới
- User có thể accept suggestion bằng 1 click hoặc ignore

---

### F-P2-06 · Batch translate queue

**Problem:** Dịch giả muốn để app chạy dịch 10 chương trong khi đi làm việc khác.

**Solution:**
- Shift-click chọn nhiều chương → "⚡ Dịch 10 chương"
- Hàng đợi hiện ở status bar: "Đang dịch ch.47 / 10 · ▪▪▪▪▫▫▫▫▫▫"
- Có thể hủy bất cứ lúc nào
- Kết quả: các chương được đánh dấu "AI done, chờ review" — không tự mark Done

---

## P3 — Team collaboration (Phase 2)

### F-P3-01 · Chapter assignment

Phân công chương cho thành viên, track ai đang làm gì.

### F-P3-02 · Shared context

Glossary + characters chia sẻ toàn nhóm, sync real-time.

### F-P3-03 · Review workflow

Queue review, comment inline, approve/reject với notification.

### F-P3-04 · Cloud sync (optional)

Backup và sync qua cloud storage (Dropbox, Google Drive) — không yêu cầu server riêng.

---

## Feature map theo persona

| Feature | Linh | Minh | Thu |
|---------|------|------|-----|
| F-P0-01 Session resume | ✅ Must | ✅ Must | — |
| F-P0-02 Context persistence | ✅ Must | ✅ Must | — |
| F-P0-03 Translate button | ✅ Must | ✅ Must | — |
| F-P1-01 Import | ✅ Must | ✅ Must | — |
| F-P1-02 Glossary | ✅ Must | ✅ Must | 👁 View |
| F-P1-03 Characters | ✅ Must | ✅ Must | 👁 View |
| F-P1-04 Quick-add | ✅ Must | ⚡ Nice | — |
| F-P1-05 Export | ✅ Must | ✅ Must | ⚡ Nice |
| F-P2-01 AI indicator | ⚡ Nice | ⚡ Nice | ✅ Must |
| F-P2-02 Consistency | ⚡ Nice | ✅ Must | ⚡ Nice |
| F-P2-03 Style guide | ⚡ Nice | ✅ Must | 👁 View |
| F-P2-04 Search | ⚡ Nice | ✅ Must | ✅ Must |
| F-P2-05 Translation memory | 🔮 Later | ⚡ Nice | — |
| F-P2-06 Batch translate | ⚡ Nice | ✅ Must | — |
| F-P3 Team features | — | 🔮 Phase 2 | 🔮 Phase 2 |
