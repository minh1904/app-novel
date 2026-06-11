# NovelFlow — Ứng dụng dịch truyện

> Trình quản lý và dịch truyện offline, lấy cảm hứng từ Obsidian. Dữ liệu lưu dưới dạng Markdown thuần — AI có thể đọc, sửa, và dịch trực tiếp trên file.

---

## Tầm nhìn

Obsidian cho dịch giả truyện. Mỗi truyện là một vault, mỗi chương là một file `.md`. Bạn có thể mở Obsidian song song và đọc cùng một file — không có vendor lock-in. AI là công cụ hỗ trợ, không phải trung tâm.

---

## Cấu trúc dữ liệu

```
~/NovelFlow/
  Đấu Phá Thương Khung/
    _meta.json              ← bìa, tác giả, ngôn ngữ gốc, tiến độ
    _context/
      glossary.md           ← thuật ngữ: 萧炎 → Tiêu Viêm
      characters.md         ← hồ sơ nhân vật
      world.md              ← bối cảnh thế giới
    raw/
      001.md                ← chương gốc (tiếng Trung/Anh...)
      002.md
    translated/
      001.md                ← bản dịch
      002.md
    exported/               ← PDF, DOCX xuất ra
```

Mọi thứ là file flat — có thể mở bằng bất kỳ text editor nào, commit lên Git, sync qua Dropbox.

---

## Tính năng cốt lõi

### 1. Split-pane Dịch Thuật
Màn hình chính chia đôi:
- **Trái**: chương gốc (read-only hoặc editable)
- **Phải**: bản dịch (full markdown editor)
- Hai pane scroll đồng bộ theo đoạn văn
- Highlight đoạn đang dịch ở cả hai pane

### 2. Markdown Editor
- Hỗ trợ đầy đủ CommonMark + GFM
- Toggle giữa **Edit mode** (raw markdown) và **Preview mode** (rendered)
- Vim keybindings (tùy chọn)
- Format toolbar: bold, italic, heading, quote, code block
- Lưu tự động mỗi vài giây

### 3. AI Dịch Thuật Inline
Trong editor, bấm `Ctrl+Shift+T` hoặc highlight đoạn → gọi AI:
- **Dịch đoạn được chọn**
- **Dịch tiếp từ vị trí con trỏ** (continues mid-sentence)
- **Gợi ý từ/cụm từ** (hover trên từ gốc)
- AI nhận context tự động: glossary + character profiles + 2 chương trước

Context được inject theo template:
```
[SYSTEM]
Bạn là dịch giả chuyên nghiệp. Dưới đây là bối cảnh:
- Thuật ngữ: {glossary.md}
- Nhân vật: {characters.md}
- Phong cách: giữ nguyên văn phong tác giả, không thêm chú thích
[/SYSTEM]

[PREV_CHAPTER]
{translated/N-1.md cuối 500 chữ}
[/PREV_CHAPTER]

[SOURCE]
{đoạn cần dịch}
[/SOURCE]
```

### 4. Context Manager
Panel riêng để quản lý ngữ cảnh inject:
- **Glossary**: bảng thuật ngữ `từ gốc | dịch nghĩa | ghi chú`
- **Characters**: thẻ nhân vật (tên, ngoại hình, tính cách, quan hệ)
- **World**: bối cảnh, địa danh, hệ thống phép thuật/sức mạnh
- **Style guide**: hướng dẫn dịch (xưng hô, văn phong)
- Toggle từng phần context bật/tắt khi gọi AI

### 5. Library View (Bìa Truyện)
Trang chủ hiển thị dạng grid bìa sách:
- Ảnh bìa tải lên hoặc fetch từ URL
- Badge tiến độ dịch (% chương hoàn thành)
- Badge trạng thái: Đang dịch / Tạm dừng / Hoàn thành
- Click vào bìa → mở truyện
- Sort/filter theo: tên, tiến độ, ngày cập nhật, thể loại

### 6. Xuất File
Từ một chương hoặc toàn bộ truyện:
- **PDF**: layout đẹp, có bìa, số trang, header/footer
- **DOCX**: cho editor bên ngoài
- **EPUB**: đọc trên e-reader
- **TXT**: plain text
- Template PDF/EPUB tuỳ chỉnh (font, margin, màu sắc)

### 7. Command Palette
`Ctrl+P` mở command palette kiểu Obsidian:
- Tìm kiếm lệnh: "Dịch chương này", "Xuất PDF", "Mở glossary"
- Tìm kiếm file: nhảy nhanh đến chương bất kỳ
- Recent files

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [≡] NovelFlow                              [─][□][✕]        │ ← TitleBar
├────┬────────────────────────────────────────────────────────┤
│    │ ┌─ Đấu Phá Thương Khung ──────────────────────────┐   │
│ R  │ │  Chương 001  ████████░░  80%                    │   │
│ I  │ │                                                  │   │
│ B  │ │ ┌─────────────────┬────────────────────────┐    │   │
│ B  │ │ │  RAW (ZH)       │  DỊCH (VI)             │    │   │
│ O  │ │ │─────────────────│────────────────────────│    │   │
│ N  │ │ │  第一章 天才还  │  **Chương 1: Thiên...** │    │   │
│    │ │ │  是废材         │                        │    │   │
│    │ │ │                 │  Tiêu Viêm ngồi yên    │    │   │
│    │ │ │  萧炎静静地坐   │  lặng trên phiến đá... │    │   │
│    │ │ │  在石头上...    │  [▶ Dịch tiếp]         │    │   │
│    │ │ │                 │                        │    │   │
│    │ │ └─────────────────┴────────────────────────┘    │   │
│    │ └──────────────────────────────────────────────────┘   │
├────┴────────────────────────────────────────────────────────┤
│ Chương 001/342  •  Đã dịch: 1,240 chữ  •  AI: gpt-4o  [⚙] │ ← StatusBar
└─────────────────────────────────────────────────────────────┘

RIBBON (trái, icon dọc):
  📚  Library (bìa truyện)
  📁  Explorer (file tree)
  🔍  Search
  🧠  Context Manager
  ⚙️  Settings
```

---

## Visual Style — Obsidian Dark

| Token | Giá trị |
|---|---|
| Background | `#0d0d0d` — tối hơn Obsidian gốc |
| Surface (sidebar) | `#111111` |
| Surface (editor) | `#141414` |
| Surface (card) | `#1a1a1a` |
| Border | `rgba(255,255,255,0.06)` |
| Text primary | `#dcddde` |
| Text muted | `#6b7280` |
| Accent | `#7c6af7` — tím Obsidian |
| Accent hover | `#9d8eff` |
| Success | `#4ade80` |
| Warning | `#fbbf24` |
| Font | Google Sans Flex (UI), Geist Mono (code/raw) |
| Radius | 6px (nhỏ, góc cạnh hơn) |

**Đặc trưng visual:**
- Editor background tối hơn sidebar → tạo depth
- Active file trong tree highlight bằng `accent/15` background + border-left accent
- Split pane divider: 1px `rgba(255,255,255,0.08)`, hover sáng lên
- Bìa truyện: card với shadow mạnh, hover scale 1.02
- Tiến độ bar: thin 2px, màu accent
- AI response stream: text xuất hiện dần, cursor nhấp nháy

---

## Tech Stack (đề xuất)

| Layer | Lựa chọn |
|---|---|
| Shell | Electron + electron-forge |
| Renderer | React 19 + Vite |
| Editor | CodeMirror 6 (markdown mode) |
| Preview | remark + rehype pipeline |
| AI | Anthropic SDK / OpenRouter (pluggable) |
| Export | Pandoc CLI hoặc pdfmake (PDF), docx.js (DOCX) |
| State | Zustand |
| Storage | Flat files (fs) + SQLite cho metadata/search |
| Search | MiniSearch (full-text, client-side) |

---

## Luồng dịch điển hình

1. **Import truyện**: paste URL hoặc kéo thả folder txt/md → tự tách chương
2. **Setup context**: điền glossary, nhân vật chính, phong cách dịch
3. **Mở split-pane**: chọn chương → pane trái raw, pane phải trống
4. **Dịch thủ công** hoặc `Ctrl+Shift+T` → AI dịch toàn chương
5. **Chỉnh sửa** bản dịch trực tiếp trong editor
6. **Review**: toggle preview để đọc như reader
7. **Xuất**: chọn định dạng → file xuất ra folder `exported/`

---

## Phạm vi MVP

Thứ tự ưu tiên để ship:

- [ ] Library view + tạo/import truyện
- [ ] File tree + markdown editor cơ bản
- [ ] Split-pane dịch (2 cột scroll sync)
- [ ] Glossary manager
- [ ] AI inline (dịch đoạn, dịch tiếp)
- [ ] Export PDF/DOCX
- [ ] Command palette
- [ ] EPUB export + theme editor
