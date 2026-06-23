# User Journeys — NovelFlow

📅 06/2026  
📌 5 journey chính, mỗi journey có: steps → điểm đau hiện tại → trạng thái lý tưởng

---

## J1 · Onboarding truyện mới

**Persona:** Linh (solo translator)  
**Trigger:** Quyết định dịch một truyện mới  
**End goal:** Bắt đầu dịch chương đầu tiên với context cơ bản đã sẵn sàng  
**Tần suất:** 1–2 lần/tháng

### Các bước hiện tại (trước NovelFlow)

```
1. Tìm source text          [~10 min]
   → Copy-paste từ wattpad/boxnovel/truyenfull thủ công từng chương

2. Setup "workspace"        [~30 min]
   → Tạo folder, tạo file glossary.xlsx, tạo file characters.txt

3. Đọc 3–5 chương đầu      [~45 min]
   → Ghi chú thuật ngữ, tên nhân vật, xưng hô vào Excel thủ công

4. Config AI               [~15 min]
   → Viết system prompt "tùy chỉnh" trong chat, paste glossary vào

5. Dịch thử chương 1       [~30 min]
   → Kết quả: AI sai tên, sai xưng hô vì glossary chưa đủ

6. Sửa lại glossary        [~20 min]
   → Nhận ra thiếu 10+ thuật ngữ, quay lại Excel bổ sung

TOTAL: ~2.5 giờ trước khi có bản dịch chương 1 tạm ổn
```

### Trạng thái lý tưởng (với NovelFlow)

```
1. Import source            [~3 min]
   → Paste URL hoặc paste text → app tách chương tự động
   → Preview: "Tìm thấy 342 chương · ~1.2M chữ · Bắt đầu?"

2. AI quét & đề xuất       [~5 min auto, ~5 min review]
   → App tự chạy AI quét 3 chương đầu
   → Đề xuất: 12 nhân vật + 23 thuật ngữ + xưng hô cơ bản
   → Dịch giả review nhanh: duyệt / sửa / bỏ qua

3. Dịch chương 1            [~20 min]
   → Có context, AI dịch đúng tên và thuật ngữ từ lần đầu
   → Dịch giả chỉ chỉnh văn phong, không phải sửa tên

TOTAL: ~35 phút, bản dịch ch.1 chất lượng tốt hơn
```

### Điểm gãy cần giải quyết
- **Import**: Không cần copy-paste thủ công từng chương
- **Context bootstrap**: AI quét tự động, user chỉ review không phải nhập
- **First impression**: Bản dịch đầu tiên phải tốt để build trust

---

## J2 · Vòng lặp dịch hằng ngày (CORE LOOP)

**Persona:** Linh (solo translator)  
**Trigger:** Mở app để dịch  
**End goal:** Dịch xong N chương và đăng  
**Tần suất:** Hàng ngày, chiếm 90% thời gian trong app

### Các bước hiện tại (trước NovelFlow)

```
1. Mở app / ChatGPT         [~5 min]
   → "Hôm qua đến đâu rồi nhỉ?" → mở file, tìm chương cuối cùng

2. Warm up AI              [~5 min]
   → Paste system prompt + glossary + character list vào chat mới
   → Mỗi ngày lặp lại, không có cách tránh

3. Dịch từng đoạn          [~20 min/chương]
   → Copy raw text → paste vào chat → copy dịch → paste vào Doc
   → Context AI mất sau ~10 đoạn vì context window

4. Check thuật ngữ          [~5 min/chương]
   → Mở Excel riêng → tìm thuật ngữ → đối chiếu → quay lại Doc

5. Format và đăng           [~15 min/chương]
   → Sửa markdown → copy → paste vào hako → sửa lại format hako
   → Đăng bài

TOTAL: ~50 min/chương thực tế
```

### Trạng thái lý tưởng (với NovelFlow)

```
1. Mở app                  [~3 sec]
   → Tự động mở đúng chương đang dịch dở: "▶ Tiếp tục Ch.47"

2. Bắt đầu dịch           [1 click / Ctrl+D]
   → AI đã có full context (glossary + characters + style)
   → Stream từng đoạn ngay trong split pane

3. Sửa tay                 [~10 min/chương]
   → Sửa trực tiếp trong pane DỊCH, không cần chuyển app
   → Hover lên thuật ngữ → tooltip hiện glossary reference
   → Phát hiện tên lạ → bôi đen → "+ Thêm vào glossary" ngay tại chỗ

4. Xong chương             [1 click / Ctrl+Enter]
   → Đánh dấu Done + tự động mở chương tiếp theo

5. Export batch            [~2 min cho 5 chương]
   → Chọn 5 chương → Export → file markdown đúng format hako

TOTAL: ~30 min/chương, không mất mạch làm việc
```

### Điểm gãy cần giải quyết
- **Resume**: Mở app phải ngay lập tức biết tiếp tục ở đâu
- **Context persistence**: AI không được "quên" glossary giữa các session
- **In-flow**: Tra thuật ngữ, thêm context — phải làm được mà không rời pane dịch

---

## J3 · Nuôi ngữ cảnh trong dòng chảy

**Persona:** Linh (solo translator)  
**Trigger:** Gặp tên nhân vật mới hoặc thuật ngữ mới khi đang dịch  
**End goal:** Thêm vào glossary/character list mà không mất mạch đọc  
**Tần suất:** 3–8 lần/chương

### Các bước hiện tại (trước NovelFlow)

```
1. Gặp tên mới trong raw text
2. Dừng dịch
3. Chuyển qua tab Context
4. Click "Nhân vật" → click "+ Thêm"
5. Điền form (tên gốc, tên dịch, mô tả, xưng hô)
6. Lưu
7. Quay lại tab Translator
8. Tìm lại đoạn đang đọc (đã mất vị trí scroll)
9. Tiếp tục dịch

TOTAL: 6–8 steps, mất ~2 phút, mất hoàn toàn mạch đọc
```

### Trạng thái lý tưởng (với NovelFlow)

```
1. Gặp tên mới trong raw text
2. Bôi đen tên đó
3. Popover hiện ngay tại chỗ: [+ Glossary] [+ Nhân vật] [+ Xưng hô]
4. Click "+ Nhân vật" → form 2 ô: Tên dịch + Ghi chú
5. Enter → lưu
6. Tiếp tục dịch từ đúng chỗ cũ

TOTAL: 2 steps, ~20 giây, không mất vị trí scroll
```

### Điểm gãy cần giải quyết
- **Selection popover**: UI in-place, không phải navigate đến screen khác
- **Minimal form**: Chỉ 2 ô bắt buộc, các ô khác optional và có thể fill sau
- **Context screen**: Vẫn tồn tại nhưng chỉ dành cho cleanup/review định kỳ

---

## J4 · Review và export

**Persona:** Thu (editor) / Linh (self-review)  
**Trigger:** Bản dịch AI đã xong, cần QC trước khi đăng  
**End goal:** Bản dịch đã approved, sẵn sàng publish  
**Tần suất:** Mỗi chương, sau khi AI translate xong

### Các bước hiện tại (trước NovelFlow)

```
1. Đọc bản dịch trong Doc   [~10 min]
   → Không biết đoạn nào AI generate, đoạn nào đã được sửa tay

2. Cross-check raw           [nhiều lần/chương]
   → Mở file raw riêng → scroll → tìm đoạn tương ứng → so sánh
   → 30–60 giây mỗi lần cross-check

3. Mark đoạn cần sửa        [không có tool]
   → Paste vào Google Docs → Comment → nhưng mất liên kết với workflow

4. Export                    [~15 min]
   → Copy từ Doc → paste vào hako/docln → sửa format → đăng
```

### Trạng thái lý tưởng (với NovelFlow)

```
1. AI-generated paragraphs có visual indicator
   → Màu nền khác nhẹ: "đoạn này AI chưa ai chỉnh"
   → Sau khi sửa: indicator mờ đi

2. Cross-check một click     [< 3 giây]
   → Hover lên đoạn dịch → raw tương ứng highlight trong pane trái
   → Hoặc: click nút sync scroll — hai pane scroll cùng nhau

3. Annotation inline         [trong pane DỊCH]
   → Click đoạn → Ctrl+K → ghi note "cần check lại xưng hô"
   → Đoạn có note có icon nhỏ, editor chạy qua được nhanh

4. Mark as reviewed          [checkbox hoặc shortcut]
   → Ctrl+Space → đoạn chuyển từ "pending" sang "approved"

5. Export                    [2 click]
   → Export → chọn format (hako / docln / markdown) → download
```

### Điểm gãy cần giải quyết
- **AI-generated indicator**: Visual cue để biết đoạn nào cần review kỹ
- **Paragraph-level sync**: Cross-check raw không cần scroll thủ công
- **Export formats**: Phải đúng format ngay, không cần sửa lại

---

## J5 · Handoff trong nhóm dịch

**Persona:** Minh (lead) → Thu (editor)  
**Trigger:** Minh hoặc thành viên dịch xong, cần chuyển cho Thu review  
**End goal:** Thu nhận được bản dịch kèm context đầy đủ, có thể review ngay  
**Tần suất:** Mỗi ngày, với mỗi chương hoàn thành

### Các bước hiện tại

```
1. Dịch giả export ra Google Docs
2. Share link cho Thu qua Discord
3. Thu mở Docs, không có raw để đối chiếu
4. Thu hỏi qua Discord: "Cho tôi file raw chương này"
5. Minh gửi file raw
6. Thu mở thêm tab, scroll song song
7. Thu comment trong Docs
8. Minh nhận email notification
9. Minh mở Docs, đọc comment, sửa
10. Thu approve

TOTAL: Async, mất 1–2 ngày/chương, không ai biết trạng thái thực tế
```

### Trạng thái lý tưởng (với NovelFlow — Phase 2)

```
1. Minh dịch xong, click "Gửi review → Thu"
   → Chapter status: dịch xong → chờ review

2. Thu nhận notification (trong app hoặc email)
   → Mở app → thấy chương trong queue "Cần review"

3. Thu review với full context
   → Split pane: raw | dịch
   → Glossary sidebar tự động theo context
   → Annotation inline

4. Thu mark done → Minh nhận notification
   → Merge annotations → Export

TOTAL: Async nhưng có state rõ ràng, không cần hỏi qua Discord
```

### Điểm gãy cần giải quyết (Phase 2)
- **Chapter assignment**: Ai đang làm gì, trạng thái thực tế
- **Shared context**: Glossary/characters chia sẻ toàn nhóm
- **Review workflow**: Queue rõ ràng, không qua email/Discord

---

## Tóm tắt điểm đau theo mức ưu tiên

| Journey | Điểm đau | Priority |
|---------|---------|----------|
| J1 | Import source thủ công | P1 |
| J1 | Context bootstrap nặng (nhập 20+ nhân vật) | P1 |
| J2 | Session resume (mất chỗ dịch dở) | P0 |
| J2 | AI "quên" context giữa session | P0 |
| J2 | Warm up AI mỗi ngày (paste lại hết) | P0 |
| J3 | Thêm context phải rời màn hình dịch | P1 |
| J4 | Không biết đoạn nào AI generate | P1 |
| J4 | Cross-check raw không thuận tiện | P1 |
| J4 | Export format sai | P1 |
| J5 | Chapter assignment & tracking | P2 |
| J5 | Shared context giữa thành viên | P2 |
