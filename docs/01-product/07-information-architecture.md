# Information Architecture — NovelFlow

📅 06/2026  
📌 Cấu trúc màn hình, navigation, và mô hình dữ liệu của app.

---

## 1. Cấu trúc màn hình

```
App Shell
├── Activity Bar (left rail, 48px)
│   ├── 📚 Library           — danh sách truyện
│   ├── 📖 Translator        — màn hình dịch (active novel)
│   ├── 🔍 Search            — tìm kiếm toàn truyện
│   ├── ⚙️  Settings         — cài đặt app
│   └── [Novel indicator]    — tên truyện đang mở, luôn visible
│
├── Sidebar (240px, collapsible)
│   └── Nội dung thay đổi theo Activity Bar active:
│       Library:    Novel list
│       Translator: Chapter list (= ChapterSidebar hiện tại)
│       Search:     Search results
│
└── Main content area
    └── Màn hình theo route active
```

---

## 2. Màn hình và routes

### 2.1 Library — `/`

**Mục đích:** Quản lý danh sách truyện, thêm truyện mới

**Layout:**
```
[Header: "Thư viện" + "+ Thêm truyện"]
[Grid cards: Novel covers]
  Card = [Cover] [Title] [Progress: 47/342 ch] [Status badge] [▶ Tiếp tục]
[Empty state nếu chưa có truyện]
```

**Actions:**
- Click card → mở Translator tại chương đang dịch dở
- `+ Thêm truyện` → Import sheet/dialog
- Right-click card → Edit metadata / Archive / Delete

---

### 2.2 Translator — `/novel/:id/translate`

**Mục đích:** Core working screen — 90% thời gian ở đây

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ChapterSidebar (240px)     │ TopBar                             │
│                            ├────────────────────────────────────┤
│ ▶ Tiếp tục · Ch.47         │         [ Pane RAW ] │ [ Pane DỊCH ] │
│ ────────────────────       │                      │               │
│ 🔍 Tìm / nhảy... (Ctrl+G) │ < scroll sync >      │               │
│                            │                      │               │
│ Vol 1 · Phế vật trỗi dậy  │                      │               │
│   ✓  001 · Thiên tài...   │ ────────────────────────────────────│
│   ✓  002 · Hủy hôn...     │ [ActionBar: Translate button cluster] │
│   ⚠  003 · Dược Lão...    └────────────────────────────────────┤
│   ◐  047 · Bái sư          │ ContextPanel (320px, collapsible)  │
│   ○  048 · Đấu khí...      │ Glossary / Characters / Style...   │
│                            │                                    │
│ 🧠 Ngữ cảnh: 5·21·29      │                                    │
└────────────────────────────────────────────────────────────────┘
│ Status bar: [Novel title] · Ch.47/342 · ✓ 46 đã dịch · AI: claude  │
```

**Chapter status icons:**
```
○  — todo (chưa dịch)
◐  — active (đang dịch dở)
⚠  — review (AI done, chờ review)
✓  — done (đã approve)
```

**Pane RAW:**
- Display raw source text (CJK font)
- Selection → popover: [+ Glossary] [+ Nhân vật] [+ Xưng hô]
- Highlight terms có trong glossary (subtle underline)

**Pane DỊCH:**
- Paragraph-by-paragraph
- AI-generated paragraphs: subtle background
- Reviewed paragraphs: normal background
- Editable inline (contenteditable)
- AI stream: hiện token real-time trong paragraph đang dịch

**ActionBar:**
- Left: Translate button cluster (state machine — xem F-P0-03)
- Right: ⚡ Dịch cả chương (secondary)

---

### 2.3 Context — `/novel/:id/context`

**Mục đích:** Quản lý toàn bộ context của một truyện (định kỳ, không phải hằng ngày)

**Sub-tabs:**
```
[Thuật ngữ] [Nhân vật] [Xưng hô] [Thế giới] [Phong cách]
```

**Thuật ngữ (Glossary):**
- Table: Raw | Dịch | Ghi chú | Inject | Nguồn
- Inline edit
- Bulk import CSV
- "AI đề xuất từ ch.47" → side panel với list suggestions

**Nhân vật:**
- Grid cards: Tên + Role + Alias
- Expand card → full profile + address phases

**Xưng hô:**
- Table các cặp nhân vật + danh sách phases
- Matrix view option: "A gọi B" theo chương

**Thế giới / Phong cách:**
- Free-text textarea (autosave)
- Được inject vào system prompt khi có nội dung

---

### 2.4 Novel Detail — `/novel/:id`

**Mục đích:** Metadata và overview của một truyện

**Sections:**
- Cover, title, metadata (author, source language, genre)
- Progress summary: chapters done / total
- Quick actions: ▶ Tiếp tục · ⚙ Context · 📤 Export

---

### 2.5 Settings — `/settings`

**Sub-sections:**
```
AI Provider        — API key, model selection, temperature
Translation        — default target language, style presets
Export             — default format, file naming
Keyboard shortcuts — xem và tùy chỉnh
About              — version, changelog
```

---

## 3. Mô hình dữ liệu

### Novel
```typescript
Novel {
  id: string
  title: string
  originalTitle: string
  coverImage?: string
  author?: string
  sourceLanguage: 'zh' | 'ja' | 'ko' | 'en'
  targetLanguage: 'vi'          // v1: luôn là VN
  genre?: NovelGenre
  status: 'active' | 'paused' | 'done' | 'archived'
  totalChapters: number
  createdAt: string
  updatedAt: string
  resumeChapterId?: string       // chapter đang dịch dở
}
```

### Chapter
```typescript
Chapter {
  id: string
  novelId: string
  number: number
  title: string
  volumeTitle?: string
  volumeNumber?: number
  status: 'todo' | 'active' | 'review' | 'done'
  paragraphs: TranslationParagraph[]
  translationMd: string          // compiled output
  wordCountRaw?: number
  translatedAt?: string
  reviewedAt?: string
}
```

### TranslationParagraph
```typescript
TranslationParagraph {
  id: string
  rawText: string
  translatedText: string
  aiGenerated: boolean           // true = chưa ai sửa tay
  reviewed: boolean              // true = editor đã approve
  note?: string                  // annotation từ editor
}
```

### GlossaryTerm
```typescript
GlossaryTerm {
  id: string
  novelId: string
  rawText: string                // text gốc (CJK)
  translatedText: string
  note?: string
  injectEnabled: boolean         // có inject vào prompt không
  source: 'manual' | 'ai'
  aiSourceChapter?: number       // nếu source = 'ai'
}
```

### Character
```typescript
Character {
  id: string
  novelId: string
  rawName: string
  translatedName: string
  aliases: string[]              // tên phụ / biệt hiệu
  role?: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  description?: string           // inject vào prompt
}
```

### AddressFormFull (xưng hô)
```typescript
AddressFormFull {
  id: string
  novelId: string
  characterAId: string
  characterBId: string
  kind: 'gia tộc' | 'sư môn' | 'tình cảm' | 'bằng hữu' | 'địch' | 'thế lực'
  phases: AddressPhase[]
}

AddressPhase {
  fromChapter: number
  toChapter?: number             // undefined = đến hết truyện
  relationship: string           // mô tả quan hệ
  note?: string
  aToB: { call: string; self: string }   // A gọi B + A tự xưng với B
  bToA: { call: string; self: string }   // B gọi A + B tự xưng với A
}
```

---

## 4. Navigation flows

### F1 — First open (fresh install)
```
App open → Library (empty state) → "+ Thêm truyện" → Import dialog
→ [scrape / paste / upload] → Chapter list → AI suggest context
→ Review context → Translator (ch.1) → First translation
```

### F2 — Daily return (existing novel)
```
App open → Library (resume chip) → "▶ Tiếp tục Ch.47" (1 click)
→ Translator at ch.47 → Ctrl+D → streaming...
```

### F3 — Context quick add
```
Translator → bôi đen text trong RAW pane → popover
→ "+ Nhân vật" → inline form (2 ô) → Enter
→ tiếp tục dịch (không navigate)
```

### F4 — Full context edit
```
Translator → Activity bar "📖" context panel open
OR
Novel detail → "⚙ Context" → Context screen (full page)
```

### F5 — Export
```
Library / Novel detail → "📤 Export"
→ Select chapters → Select format → Preview → Download
```

---

## 5. AI injection flow (kỹ thuật)

Mỗi lần gọi AI để dịch, system prompt được build như sau:

```
[System prompt layers]
1. Base translation instruction (language pair, role)
2. Genre preset (xianxia / isekai / romance / manhwa)  ← từ novel genre
3. Style guide                                          ← novel-level free text
4. Filtered glossary (only terms in current chapter)   ← per-chapter filter
5. Character list (active characters)                  ← từ characters
6. Address phases (cho chapter hiện tại)               ← per-chapter phase lookup

[User message]
- Previous N paragraphs (context window)
- Current paragraph to translate
```

Filter logic:
- Glossary: chỉ inject terms xuất hiện trong `chapter.paragraphs.map(p => p.rawText).join()`
- Address phases: chỉ inject phases cover chapter number hiện tại
- Limit: tổng system prompt ≤ 4000 tokens (adjustable)
