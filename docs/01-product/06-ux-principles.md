# UX Principles — NovelFlow

📅 06/2026  
📌 Những nguyên tắc thiết kế cốt lõi, áp dụng cho mọi quyết định UI/UX.  
Đây là "tại sao" — `ux.md` là "như thế nào" (patterns cụ thể).

---

## Nguyên tắc 1 · Translator là tác giả, AI là công cụ

**Nghĩa là:**
- AI output luôn hiển thị như "bản nháp", không bao giờ tự động replace text đã có
- Mọi AI action phải visible và reversible
- UI không được ẩn việc "AI đang làm gì" — status rõ ràng, có thể dừng bất cứ lúc nào

**Không được:**
- Auto-apply AI suggestions im lặng
- Hide AI output trong quá trình generate
- Quyết định thay user (ví dụ: auto-mark Done sau khi AI translate xong)

**Được:**
- Suggest, propose, đề xuất — với action accept/reject rõ ràng
- Batch suggest với "Accept all" nếu user muốn nhanh

---

## Nguyên tắc 2 · Context là tài sản, không phải setup

**Nghĩa là:**
- Mọi context (glossary, nhân vật, xưng hô, style) được xây dựng dần trong quá trình dịch, không phải thiết lập một lần rồi thôi
- Công cụ phải khuyến khích thêm context in-flow (không rời màn hình, không interrupt)
- Context ngày càng làm AI dịch tốt hơn — user phải nhận ra điều này

**Không được:**
- Bắt user điền full form trước khi có thể dịch
- Thiết kế context screen như một "settings page" tách biệt khỏi workflow dịch

**Được:**
- Quick-add từ selection popover (2–3 ô, Enter để lưu)
- AI đề xuất context từ chương đang dịch
- Context screen đầy đủ chỉ dành cho periodic cleanup

---

## Nguyên tắc 3 · 90% thời gian trong vòng lặp dịch

**Nghĩa là:**
- Translator screen là màn hình quan trọng nhất — tối ưu UX ở đây trước tiên
- Library, Settings, Context là màn hình phụ trợ
- Mỗi click thêm trong vòng lặp `đọc raw → dịch → sửa → next` là technical debt UX

**Metrics:**
- Click từ mở app đến token đầu tiên: ≤ 3
- Click để thêm term vào glossary mà không rời màn hình dịch: ≤ 3
- Click để sang chương tiếp khi xong: 1

**Không được:**
- Thêm confirmation dialog trong vòng lặp (trừ destructive actions)
- Modal / popover phủ toàn màn hình trong khi đang dịch
- Force user navigate đến screen khác để làm task cơ bản

---

## Nguyên tắc 4 · Một primary action mỗi màn hình

**Nghĩa là:**
- Mỗi screen chỉ có 1 nút primary (màu accent, filled)
- Hành động phụ là secondary (outlined) hoặc ghost
- Destructive actions ở tầng riêng (red outline, chỉ xuất hiện khi cần)

**Button hierarchy:**
```
Primary    — 1/screen — nền accent đặc    — "Dịch tiếp" / "Tiếp tục" / "Import"
Secondary  — 2–3/screen — viền sáng     — "Dịch cả chương" / "Export"
Ghost      — nhiều — viền mờ             — Nav, utilities, "Thêm thuật ngữ"
Destructive — situational — viền đỏ     — "Dừng dịch" / "Xóa truyện"
```

---

## Nguyên tắc 5 · Progressive disclosure

**Nghĩa là:**
- Mặc định simple — chỉ hiện những gì cần cho task hiện tại
- Advanced options ẩn đi nhưng accessible (không phải "buried")
- Onboarding dùng defaults tốt, không force user cấu hình trước

**Áp dụng cụ thể:**
- Character form: chỉ 2 ô bắt buộc (tên gốc, tên dịch), các ô khác collapsible
- AI settings: defaults hoạt động tốt, advanced prompt editing ở tab riêng
- Export: preset mặc định (markdown) một click, custom options expandable

---

## Nguyên tắc 6 · Keyboard-first cho power users

**Nghĩa là:**
- Mọi action trong core loop phải có keyboard shortcut
- Shortcuts phải nhất quán và discoverable (tooltip khi hover)
- Mouse không bị phạt — nhưng keyboard users phải nhanh hơn đáng kể

**Core shortcuts (immutable):**
```
Ctrl+D          Dịch tiếp (bất cứ state nào)
Ctrl+Enter      Xong + sang chương tiếp
Ctrl+.          Toggle context panel
Ctrl+G          Focus ô nhảy chương
Ctrl+Shift+F    Search toàn truyện
Alt+←/→         Prev/next chương
```

---

## Nguyên tắc 7 · Trạng thái rõ ràng, không im lặng

**Nghĩa là:**
- User luôn biết app đang làm gì (AI đang stream, đang save, đang import)
- Không có "spinner mà không biết là làm gì"
- Sau khi lưu: confirm nhỏ (không modal, không interrupting)
- Sau khi lỗi: message rõ ràng + action để recover

**Patterns:**
- Autosave: "Đã lưu ✓" mờ dần trong 2 giây
- AI streaming: spinner ở paragraph label + token count
- Context inject: status bar "AI: 23 thuật ngữ · 12 nhân vật"
- Import progress: progress bar với % + "Đang tải chương 45/342"

---

## Nguyên tắc 8 · Multi-language không phải afterthought

**Nghĩa là:**
- UI phải handle được cả CN/JP/KR source text — không bị layout break với CJK characters
- Xưng hô system phải support được đặc thù từng ngôn ngữ nguồn
- Font rendering: system font stack, đảm bảo CJK characters display đẹp

**Không được:**
- Hardcode CN-only assumptions (ví dụ: chỉ có "cultivation terms", không có JP honorifics)
- Ignore text direction issues khi show source text

---

## Thiết kế thị giác

### Không gian nhìn (Visual hierarchy)

```
[ Sidebar - chương ]  [ Pane RAW ]  [ Pane DỊCH ]  [ Context panel ]
  240px fixed           flex-1         flex-1          320px collapsible
```

- Dark theme by default (dịch giả làm việc nhiều giờ → dễ mắt)
- Minimal chrome — không decorative borders, không gradient
- Content area là focal point, không phải chrome

### Typography

- Source text (CJK): System font (Noto Serif CJK, fallback system-ui)
- Translated text: UI font, có thể tăng line height cho dễ đọc
- UI labels: UI font, smaller scale

### Spacing

- Dense enough to show content, not so dense to cause strain
- Consistent 4px grid
- Sidebar: compact (dịch giả cần thấy nhiều chương cùng lúc)

---

## Anti-patterns cần tránh

| Anti-pattern | Tại sao | Thay bằng |
|-------------|---------|-----------|
| Modal cho mọi form | Interrupt flow, force focus | Popover inline / side panel |
| Confirmation cho non-destructive | Friction trong loop | Auto-save, undo thay thế |
| Empty state không có action | User bị bỏ lại | Empty state + CTA rõ ràng |
| Settings page dài | User không tìm được | Group theo domain, progressive |
| AI "thinking" spinner không có info | User lo lắng | "Đang dịch đoạn 3/8 · ~15 giây" |
| Glossary toàn bộ không filter | Token bloat, slow | Filter per-chapter by occurrence |
