# User Research — Dịch Giả Fan Tiểu Thuyết

📅 Research date: 06/2026  
🔬 Phương pháp: Deep research (113 agents, 30 sources, 25 claims adversarially verified)  
📌 Lưu ý: Dữ liệu về cộng đồng dịch giả Việt Nam chưa có nguồn peer-reviewed — phần VN dựa trên community inference và forum sources.

---

## 1. Findings đã được xác minh

### Finding 1 — AI output quá literal, cần post-edit nặng
**Confidence: HIGH** (vote 3-0, nguồn: NAACL 2025)

LLM tạo ra bản dịch literal và thiếu đa dạng văn phong so với dịch giả người. Nghiên cứu NAACL 2025 đo 2.184 segment trên 4 cặp ngôn ngữ: human translation có syntactic similarity thấp nhất (0.21) và lexical overlap thấp nhất (18.9%) — nghĩa là con người tự nhiên tạo ra văn phong đa dạng hơn AI.

**Hệ quả cho sản phẩm:**
- AI output phải được coi là "bản nháp thô", không phải bản cuối
- Workflow phải có bước "sửa tay" rõ ràng sau AI
- Không nên ẩn AI output hoặc auto-apply — luôn để dịch giả nhìn thấy và chỉnh sửa

### Finding 2 — Fan groups thiếu glossary thống nhất
**Confidence: MEDIUM** (vote 2-1, nguồn: Middlebury practitioner study + community sources)

Nhóm dịch fan thiếu glossary và style guide thống nhất, dẫn đến tên nhân vật, địa danh, thuật ngữ tu luyện/cultivation system bị dịch khác nhau giữa các chương và giữa các thành viên. Đây là vấn đề cấu trúc, không phải vấn đề kỹ năng cá nhân.

**Hệ quả cho sản phẩm:**
- Glossary Manager là feature P1, không phải nice-to-have
- Glossary phải được inject tự động vào AI prompt — người dùng không cần nhớ
- Cần UI để phát hiện và sửa inconsistency cross-chapter

### Finding 3 — Commercial AI đang tấn công market
**Confidence: HIGH** (vote 3-0, nguồn: ANN, Game Rant, AniTrendz)

Shogakukan ra mắt NOVELOUS (01/2025) dùng Mantra AI, phủ 80+ tiểu thuyết, đầu tư 780 triệu yên (~$5.1M). Commercial AI translation đã chuyển từ thử nghiệm sang production cho light novel.

**Hệ quả cho sản phẩm:**
- Fan translator không thể cạnh tranh về tốc độ với commercial AI
- Differentiator phải là **chất lượng và tính cá nhân hóa** — giọng văn, thuật ngữ cộng đồng, cultural context
- NovelFlow phải giúp dịch giả dịch TỐT HƠN, không chỉ dịch nhanh hơn

---

## 2. Workflow thực tế (inferred từ community sources)

### 2.1 Vòng lặp điển hình của dịch giả VN

```
[Source text]           [MTL / AI draft]         [Edit thủ công]
  CN/JP/KR raw    →    Google/DeepL/GPT    →    Chỉnh văn, check
                                                   thuật ngữ
                                                        ↓
[Publish]               [Review/QC]              [Bản dịch hoàn]
hako/docln/web   ←   Proofreader (nếu có)   ←   Đã chỉnh xong
```

### 2.2 Vietnamese-specific: Relay translation

Nhiều dịch giả VN không đọc được ngôn ngữ nguồn trực tiếp → làm relay:
```
CN raw → EN MTL (Google/DeepL) → VN edit (tay)
JP raw → EN MTL → VN edit
KR raw → EN MTL → VN edit
```

App phải hỗ trợ cả hai flow:
- **Direct**: Source (CN/JP/KR) → VN
- **Relay**: Source → EN intermediate → VN

### 2.3 Pain points tại từng bước

| Bước | Pain Point |
|------|-----------|
| Lấy source text | Copy-paste thủ công từng chương từ web novel site |
| MTL / AI draft | Mỗi session phải paste lại context, glossary, hướng dẫn vào chat |
| Edit thủ công | Không có tool để kiểm tra consistency — phải nhớ hoặc tra file Excel riêng |
| Review/QC | Không có cách đánh dấu "đoạn cần xem lại" hay "đoạn đã approve" |
| Publish | Copy-paste từ editor sang platform, không có format chuẩn |

---

## 3. Pain points theo nhóm người dùng

### Dịch giả solo

1. **Session context loss** — Mỗi lần mở app phải nhớ lại "hôm qua đến đâu", glossary trong đầu không phải trong tool
2. **Thuật ngữ drift** — Chương 1-50 dịch một kiểu, chương 51-100 dịch kiểu khác do không có reference
3. **Onboarding nặng** — Thêm truyện mới → phải tự nhập 20+ nhân vật + 50+ thuật ngữ trước khi dịch
4. **No export** — Bản dịch xong không có cách format cho đúng để đăng lên hako/docln

### Nhóm dịch

5. **Coordination** — Không có tool phân công chương, không biết ai đang dịch gì
6. **Inconsistency giữa thành viên** — Dịch giả A và B dịch cùng một thuật ngữ khác nhau
7. **Handoff friction** — Chuyển bản dịch từ dịch giả sang editor qua Google Docs, mất context

### Cả hai

8. **AI hallucination tên** — AI tự đặt tên mới khi không biết cách dịch, không báo lỗi
9. **Xưng hô sai theo giai đoạn** — Nhân vật A và B xưng hô thay đổi theo diễn biến nhưng AI không biết
10. **Không biết context được inject hay không** — "AI đang dùng glossary của mình không?"

---

## 4. Mental models

### "Dịch giả nghĩ theo chương, không theo file"
Đơn vị làm việc là chương (chapter), không phải file. Sidebar nên hiển thị danh sách chương với trạng thái, không phải cây file RAW/DỊCH tách rời.

### "Ngữ cảnh tích lũy theo thời gian"
Dịch giả kỳ vọng app ngày càng "hiểu" truyện hơn: sau 50 chương, AI nên dịch tốt hơn chương 1 vì đã biết được glossary và nhân vật. Đây là kỳ vọng hợp lý cần được đáp ứng.

### "AI sai là bình thường, nhưng phải sửa được nhanh"
Dịch giả chấp nhận AI sai — họ chỉ cần sửa nhanh và không để lỗi sai lặp lại. Tool phải làm cho "sửa" dễ hơn "để nguyên".

---

## 5. Landscape tools hiện tại

| Tool | Thế mạnh | Điểm yếu cốt lõi |
|------|----------|-----------------|
| Raw MTL (Google/DeepL/Sugoi) | Nhanh, miễn phí | Không có glossary, không có context, output thô |
| ChatGPT / Claude (manual) | Văn xuôi tốt hơn MTL | Phải paste context mỗi session, không track chapter |
| bilingual_book_maker (OSS) | Batch processing | CLI, không có UI, không có character tracking |
| SpiraMirabilis (OSS) | Entity pipeline, genre presets | CLI, không có UI, không có VN support |
| OmegaT / memoQ (CAT tools) | TM, glossary, QA | Thiết kế cho corporate, UX phức tạp, không có fiction context |
| NOVELOUS / OpenNovel | Glossary consistency | Locked ecosystem, không edit được, không phải fan tool |

**Khoảng trống toàn ecosystem (không ai làm):**
- Xưng hô / speech register tracking giữa cặp nhân vật (ai gọi ai bằng gì, thay đổi theo chương)
- Character relationship graph
- Retroactive consistency correction
- Export sang format đăng bài VN (hako, docln)
- Relay translation flow (CN/JP/KR → EN → VN)

---

## 6. Open questions (cần user interview để xác nhận)

1. **Vietnamese relay flow**: Bao nhiêu % dịch giả VN dùng EN MTL làm trung gian? Họ muốn xem cả 3 (source / EN / VN) hay chỉ 2?

2. **Glossary bootstrap**: Dịch giả có sẵn lòng dành 15 phút nhập glossary cho truyện mới không, hay họ muốn AI tự extract?

3. **Publication format**: hako.vn và docln.net có format markup cụ thể không? Có API không?

4. **Novel length distribution**: Trung bình một dự án dịch dài bao nhiêu chương (100? 500? 2000+)? Ảnh hưởng đến architecture cần thiết.

5. **Team size**: Nhóm dịch VN điển hình có bao nhiêu người? 2? 5? 10?

6. **Quality bar**: Dịch giả tự đánh giá "đủ tốt để đăng" theo tiêu chí gì?
