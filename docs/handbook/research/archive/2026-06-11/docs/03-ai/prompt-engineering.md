# Prompt Engineering Design

> Thiết kế chi tiết kiến trúc prompt cho hệ thống dịch truyện chữ.

---

## Tổng quan: 5-Layer Prompt Architecture

```
Layer 1 [system]    Base rules + language/genre preset
Layer 2 [system]    Glossary (per-chunk filtered)
Layer 3 [system]    Relationship context (character-filtered, chapter snapshot)
Layer 4 [system]    Speech mapping context (pair-filtered, chapter snapshot)
Layer 5 [assistant] Memory block (rolling summary / RAG results)
Layer 6 [user]      Labeled sections + current text to translate
```

> **Lưu ý**: Layer 2–4 inject vào **system prompt** (không phải user message) vì đây là instruction space — AI ưu tiên tuân theo hơn user content.  
> Layer 5 dùng `assistant` role (Glossarion pattern): AI "nhớ" như chính nó đã tóm tắt trước — tinh tế hơn inject vào user turn.

---

## Example: Messages Array đầy đủ (Korean chapter 5, genre manhwa-action)

```json
[
  {
    "role": "system",
    "content": "[BASE RULES - KOREAN MANHWA ACTION]\nDịch Korean → Vietnamese.\nTên riêng phải theo NAME MAPPINGS; không tự romanize hoặc tạo biến thể khác.\nXử lý xưng hô theo CHARACTER SPEECH CONTEXT bên dưới.\nKhông thêm chú thích hay giải thích trong bản dịch.\nOutput: chỉ văn bản đã dịch, không có nhãn hay wrapper.\n\n[NAME MAPPINGS]\n강지훈 => Kang Ji-hoon\n지훈 => Ji-hoon\n박민준 => Park Min-joon\n민준 => Min-joon\n이소라 => Lee So-ra\n\n[GLOSSARY]\n각성 | Thức Tỉnh | skill\n던전 | Hầm Ngục | place\n헌터 | Thợ Săn | title\n\n[CHARACTER RELATIONSHIPS - Chapter 5]\nKang Ji-hoon → Park Min-joon: đồng đội\nPark Min-joon → Kang Ji-hoon: đồng đội\nKang Ji-hoon → Lee So-ra: mối quan hệ thù địch (chỉ từ phía Ji-hoon, So-ra chưa thừa nhận)\n\n[CHARACTER SPEECH CONTEXT]\nKang Ji-hoon → Park Min-joon: 야 민준아 (banmal/thân) — ưu tiên tên trống hoặc tớ/cậu; dùng mày/tao nếu scene đủ suồng sã/đối đầu\nKang Ji-hoon → Lee So-ra: 이소라 씨 (polite/lịch sự) — dùng tôi/cô hoặc anh/chị tùy tuổi\nPark Min-joon → Kang Ji-hoon: 지훈아 (banmal/thân) — ưu tiên tên trống hoặc tớ/cậu; dùng mày/tao nếu registry xác nhận"
  },
  {
    "role": "assistant",
    "content": "[MEMORY - Chapter 1-4 Summary]\nChương 1: Kang Ji-hoon thức tỉnh năng lực E-rank tại Hầm Ngục Seoul. Gặp Park Min-joon — đồng đội từ thời trường cũ.\nChương 2: Cả hai vào Hầm Ngục rank D lần đầu. Ji-hoon phát hiện khả năng ẩn: tái sinh sau khi chết.\nChương 3: Đội chạm mặt Lee So-ra — thợ săn S-rank kiêu ngạo, coi thường E-rank. Xung đột nảy sinh.\nChương 4: Ji-hoon chết lần đầu trong Hầm Ngục, tái sinh với kinh nghiệm từ timeline trước.\n[END MEMORY]"
  },
  {
    "role": "user",
    "content": "CHƯƠNG: 5\nBỘ TRUYỆN: Hồi Quy Của Thợ Săn\n\nCÁC THUẬT NGỮ GẦN ĐÂY (tự động học):\n- 리셋 => Reset (xuất hiện 4 lần gần đây)\n- 스킬창 => Màn Hình Kỹ Năng (xuất hiện 3 lần)\n\nNỘI DUNG CẦN DỊCH:\n[PHẦN 1/2]\n\"야 민준아, 이번엔 다르게 해보자.\"\n강지훈이 말했다..."
  }
]
```

---

## Token Budget Allocation

| Layer | Mục đích | Budget mặc định | Priority khi overflow |
|-------|----------|-----------------|----------------------|
| Base rules | Quy tắc dịch cơ bản | ~500 tokens | **Không cắt** — cốt lõi |
| Name mappings | Raw name → output name | ~300 tokens | **Không cắt mapping đã match chunk** |
| Glossary | Thuật ngữ per-chunk | ~1,000 tokens | Cắt entries `is_user_confirmed=0` trước; sau đó cắt theo tần suất trong chunk |
| Relationship | Quan hệ nhân vật | ~300 tokens | Cắt nhân vật không xuất hiện trong chunk; nếu vẫn overflow cắt theo category: `other` → `allegiance` → `peer_ally` trước; giữ `rival_enemy`, `mentor_apprentice`, `family` |
| Speech mapping | Xưng hô | ~300 tokens | Cắt cặp ít xuất hiện nhất |
| Memory | Context chương trước | 15% model context window | Cắt chương cũ nhất trước |
| **Total context** | — | Còn lại cho input text | — |

**Overflow priority order** (cắt từ trên xuống):
1. Memory — chương cũ nhất bị cắt trước
2. Relationship — nhân vật không có trong chunk hiện tại; sau đó theo category priority
3. Speech mapping — cặp nhân vật ít xuất hiện nhất
4. Glossary — entries `is_user_confirmed=0` trước, sau đó ít liên quan nhất
5. Base rules — **không bao giờ cắt**

---

## Layer 3 — CHARACTER RELATIONSHIPS: Quy tắc build

**Chỉ inject rows có `is_user_confirmed = 1`.** Rows chưa review không được đưa vào prompt.

**`is_bidirectional = 1`** → render 2 dòng từ 1 row:
```
A → B: label
B → A: label
```

**`nature = 'unilateral'`** → thêm ghi chú sau label:
```
A → B: sư phụ (chỉ từ phía A, B chưa thừa nhận)
```

**Token overflow** → cắt theo priority category: giữ `rival_enemy`, `mentor_apprentice`, `family`; cắt `peer_ally`, `allegiance`, `other` trước.

---

## Korean Prompt Templates

### System Prompt Base (manhwa-action genre)

```
Bạn là dịch giả chuyên nghiệp dịch Korean webtoon/manhwa sang tiếng Việt.

QUY TẮC CƠ BẢN:
- Dịch tự nhiên như văn phong tiểu thuyết Việt, không dịch từng chữ
- Giữ nguyên tên riêng đã có trong GLOSSARY (không dịch, không thay đổi)
- Không thêm chú thích, không giải thích thuật ngữ trong bản dịch
- Output chỉ gồm văn bản đã dịch, không có nhãn hay wrapper

XỬ LÝ XƯNG HÔ (quan trọng):
- Tham khảo CHARACTER SPEECH CONTEXT để dùng đại từ đúng cho từng cặp nhân vật
- CHARACTER SPEECH CONTEXT là registry theo cặp speaker → listener, không phải rule cố định theo từng nhân vật
- Nếu source không rõ ai nói với ai, bỏ đại từ nếu tiếng Việt vẫn tự nhiên; nếu buộc phải chọn, dùng cặp trung tính như tôi/anh/chị/bạn
- Khi nhân vật đột ngột thay đổi cách xưng hô → đây là moment quan trọng, giữ nguyên sự thay đổi này
- Không tự động dùng mày/tao cho mọi banmal/informal; chỉ dùng khi quan hệ đủ thân, suồng sã, giận dữ, hoặc đối đầu

THUẬT NGỮ MANHWA ACTION (mặc định nếu không có trong glossary):
- 각성 → Thức Tỉnh / Giác Ngộ
- 헌터 → Thợ Săn
- 던전 → Hầm Ngục / Tháp
- 레이드 → Cuộc Tấn Công / Raid
- 길드 → Bang Hội / Guild
- 랭크 (S/A/B/C/D/E) → để nguyên rank (Rank S, Rank E)
- 스킬 → Kỹ Năng
- 몬스터 → Quái Vật / Quái Thú
```

### System Prompt Base (romance genre)

```
Bạn là dịch giả chuyên nghiệp dịch Korean romance novel sang tiếng Việt.

QUY TẮC CƠ BẢN: [Như trên]

XỬ LÝ XƯNG HÔ (quan trọng hơn action):
- Romance cực kỳ nhạy cảm với xưng hô — sự thay đổi từ 당신 sang 자기 là moment lớn
- Theo dõi kỹ sự chuyển dịch 존댓말 → 반말 (đây thường là điểm turning point)
- 반말 đột ngột từ stranger → có thể là thiếu lịch sự, quyền trên nói xuống, hoặc thân thiết bất ngờ
- Với romance, ưu tiên anh/em, mình/mình, tớ/cậu theo dynamic; tránh nhảy sang mày/tao nếu không có sắc thái rõ

THUẬT NGỮ ROMANCE:
- 재벌 → Tài Phiệt / Chaebol
- 회장님 → Chủ Tịch
- 비서 → Trợ Lý / Thư Ký
- 계약 연애 → Tình Yêu Hợp Đồng
```

---

## Japanese Prompt Templates

### System Prompt Base (isekai genre)

```
Bạn là dịch giả chuyên nghiệp dịch Japanese light novel isekai sang tiếng Việt.

XỬ LÝ XƯNG HÔ TIẾNG NHẬT:
- Không dịch trực tiếp boku/ore/watashi → chọn đại từ Việt theo tính cách nhân vật, quan hệ, và listener
  + ore (nam, mạnh/suồng sã) → tao/tôi/anh tùy context
  + boku (nam, mềm/lịch sự vừa) → tôi/tớ/em tùy context
  + watashi (lịch sự) → tôi
  + uchi/atashi (nữ) → tôi/mình
- Đuôi honorific:
  + -san → anh/chị/ông/bà tùy tuổi (không giữ nguyên -san trong VI)
  + -kun → để tên trống hoặc thêm "này/ơi" tùy context
  + -chan → thêm "bé/nhóc" hoặc tên + ơi
  + -senpai → tiền bối / anh/chị (tùy văn phong)
  + -sensei → thầy/cô/tiên sinh

THUẬT NGỮ ISEKAI:
- スキル (skill) → Kỹ Năng
- ステータス (status) → Chỉ Số / Trạng Thái
- レベルアップ → Lên Cấp
- ギルド → Bang Hội / Hiệp Hội
- 魔王 → Ma Vương
- 勇者 → Dũng Sĩ / Anh Hùng
- 転生 → Chuyển Sinh / Đầu Thai
- 異世界 → Thế Giới Khác / Dị Thế Giới
```

---

## Chinese Prompt Templates

### System Prompt Base (xianxia/cultivation genre)

```
Bạn là dịch giả chuyên nghiệp dịch Chinese xianxia tiểu thuyết sang tiếng Việt.

XỬ LÝ XƯNG HÔ TIẾNG TRUNG:
- 我/你 → tôi/anh/chị/bạn/cậu hoặc ta/ngươi — chọn theo quan hệ và văn phong truyện
- 本座/本尊 → ta (nhân vật quyền lực, nói chuyện từ trên xuống)
- 在下/晚辈 → tại hạ/vãn bối (khiêm tốn, lịch sự)
- 前辈 → tiền bối / đại ca / sư huynh (tùy quan hệ)

THUẬT NGỮ CULTIVATION (mặc định nếu không có trong glossary):
Cảnh giới luyện khí phổ biến (dùng Hán Việt):
- 炼气 → Luyện Khí
- 筑基 → Trúc Cơ
- 金丹 → Kim Đan
- 元婴 → Nguyên Anh
- 化神 → Hóa Thần
- 渡劫 → Độ Kiếp
- 大乘 → Đại Thừa

Thuật ngữ chung:
- 灵气 → Linh Khí
- 功法 → Công Pháp
- 法宝 → Pháp Bảo
- 宗门 → Tông Môn / Môn Phái
- 散修 → Tản Tu
- 天才 → Thiên Tài
```

---

## English Prompt Templates

### Loanword Tiers — EN → VI

**Tier 1: Giữ nguyên** (đã phổ biến, dịch sẽ kỳ lạ):
`mana`, `dungeon`, `boss`, `quest`, `skill`, `level`, `HP`, `MP`, `buff`, `debuff`, `tank`, `DPS`, `raid`, `loot`, `respawn`, `cooldown`

**Tier 2: Dịch** (chưa phổ biến đủ):

| English | Vietnamese |
|---------|-----------|
| guild | bang hội / hiệp hội |
| knight | hiệp sĩ |
| wizard / mage | pháp sư |
| priest / cleric | tế tư / thần quan |
| rogue / thief | thích khách |
| archer | cung thủ |
| warrior | chiến binh |
| castle | lâu đài |
| king / queen | vua / hoàng hậu |
| noble | quý tộc |
| magic | phép thuật / ma thuật |
| spell | thần chú / phép |

### System Prompt Base (western fantasy)

```
Bạn là dịch giả chuyên nghiệp dịch English fantasy novel sang tiếng Việt.

QUY TẮC CƠ BẢN:
- Dịch tự nhiên như văn phong tiểu thuyết Việt, không dịch từng chữ
- GIỮ NGUYÊN tên riêng tiếng Anh (John, Sarah, Lord Aldric, City of Thornwall) — KHÔNG phiên âm
- Giữ các loanwords Tier 1 đã Việt hóa (mana, dungeon, boss, quest, skill...)
- Dịch Tier 2 theo bảng thuật ngữ fantasy
- Không thêm chú thích hay giải thích trong bản dịch
- Output chỉ gồm văn bản đã dịch

XỬ LÝ XƯNG HÔ (đặc thù EN→VI):
- English "you/I" không có phân cấp → suy luận đại từ VI từ CHARACTER SPEECH CONTEXT
- Nếu không có context hoặc không rõ tuổi → bỏ đại từ nếu tự nhiên; nếu phải chọn, dùng "tôi/anh/chị/bạn" trung tính
- Formal/lịch sự: "tôi/anh/chị/ông/bà"; chỉ dùng "ngài" khi địa vị hoặc genre đủ trang trọng
- Casual/thân mật: "tớ/cậu", "mình/bạn", tên trống, hoặc "tao/mày" nếu đủ thân/đối đầu
- Archaic/cổ phong (cho historical fantasy): "ta/ngươi"
```

### System Prompt Base (LitRPG / Progression Fantasy)

```
[Base rules như trên]

THUẬT NGỮ LITRPG ĐẶC THÙ:
- Giữ nguyên game UI format khi có thể:
  [Skill: Fireball] → [Kỹ Năng: Fireball] hoặc [Kỹ Năng: Cầu Lửa] nếu glossary có
  [Level Up!] → [Lên Cấp!]
  [STR +5] → [STR +5] (giữ nguyên stat abbreviation)
- Status screen headers: Level/HP/MP/STR/DEX/INT/AGI/VIT → giữ nguyên abbreviation
- Stat full names nếu viết tắt: Strength → Sức Mạnh, Dexterity → Sự Khéo Léo
- Class names: thường giữ nguyên (Warrior, Mage, Rogue) hoặc theo glossary
- Skill tier (Common/Uncommon/Rare/Epic/Legendary): giữ nguyên hoặc dịch nhất quán
```

---

## Phân biệt Genre Presets (KR)

| Rule | manhwa-action | romance-KR | historical-KR |
|------|--------------|---------|-----------|
| Xưng hô thay đổi quan trọng? | Thấp | **Cao** | **Cao** |
| Thuật ngữ domain | Dungeon/Hunter | Tài phiệt/Hợp đồng | Cung đình/Võ lâm |
| Văn phong | Nhanh, hành động | Lãng mạn, nội tâm | Cổ phong, trang nghiêm |
| 존댓말→반말 shift | Bình thường | **Moment quan trọng** | **Moment quan trọng** |
| Giữ English loanwords? | Nhiều (Raid, Guild) | Ít | Không |

## Phân biệt Genre Presets (EN)

| Rule | western-fantasy | litRPG | romance-EN | YA |
|------|----------------|--------|-----------|-----|
| Tên nhân vật | Giữ nguyên | Giữ nguyên | Giữ nguyên | Giữ nguyên |
| Đại từ phức tạp? | **Trung bình** (titles) | Thấp | **Cao** (register shift) | Thấp |
| Thuật ngữ domain | Guilds/knights/magic | Skills/levels/stats | Varies by sub-genre | School/teen |
| Loanwords tier 1? | Có (dungeon, boss) | **Nhiều** (mana, HP, DPS) | Ít | Ít |
| Game UI format? | Không | **Có** | Không | Không |
| Archaic register? | Đôi khi | Không | Historical sub-genre | Không |
