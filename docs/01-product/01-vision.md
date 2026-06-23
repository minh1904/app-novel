# Product Vision — NovelFlow

> **Dịch giả kiểm soát chất lượng. Công cụ giữ nhất quán. AI xử lý bản thảo thô.**

📅 Cập nhật: 06/2026 · Phiên bản tài liệu: 1.0  
📌 Trạng thái: Định hướng sản phẩm chính thức (thay thế vision cũ AI-first)

---

## 1. Vấn đề cần giải quyết

Dịch giả fan tiểu thuyết người Việt đang làm việc với một bộ công cụ vá víu:

| Công cụ họ dùng | Vấn đề |
|----------------|--------|
| Google Translate / DeepL | Không có memory, không biết context truyện |
| ChatGPT / Claude | Phải paste lại glossary mỗi phiên, không track tiến độ |
| Google Docs / Notepad | Không có split-pane, kiểm tra thuật ngữ thủ công |
| File Excel riêng | Glossary nằm ngoài workflow, dễ quên tra |
| Không có tool nào | Không export được sang format đăng bài |

Kết quả: **thuật ngữ không nhất quán giữa các chương, dịch chậm, và dịch giả giỏi bỏ cuộc vì quá tốn công quản lý thủ công.**

---

## 2. NovelFlow là gì

**NovelFlow là bàn làm việc dịch thuật chuyên dụng cho dịch giả fan tiểu thuyết người Việt.**

Nó không phải:
- ❌ Một công cụ dịch tự động (DeepL, Google Translate)
- ❌ Một chatbot AI (ChatGPT, Claude)
- ❌ Một CAT tool doanh nghiệp (memoQ, Transifex) — thiết kế cho corporate, không phải fan fiction

Nó là:
- ✅ Môi trường làm việc toàn diện: đọc raw + dịch + quản lý context + export — trong một app
- ✅ Hệ thống ký ức xuyên chương: glossary, nhân vật, xưng hô được lưu và inject tự động
- ✅ AI là **trợ lý soạn thảo**, không phải engine thay thế dịch giả

---

## 3. Triết lý thiết kế

### 3.1 Translator is the author

AI tạo ra bản nháp. Dịch giả là người duy nhất quyết định văn phong cuối cùng. Mọi output của AI đều phải qua tay dịch giả trước khi published.

### 3.2 Context là tài sản, không phải setup

Glossary, nhân vật, xưng hô — những thứ này tích lũy theo thời gian và ngày càng làm AI dịch tốt hơn. Công cụ phải khuyến khích việc xây dựng context thay vì làm nó trở thành gánh nặng.

### 3.3 90% thời gian trong vòng lặp dịch

Library, Settings, Context là màn hình phụ trợ. Mọi tối ưu UX ưu tiên vòng lặp: **đọc raw → AI draft → sửa → next**. Ma sát ở đây trực tiếp ảnh hưởng đến số chương/giờ.

### 3.4 AI nhất quán, không phải sáng tạo

AI không được tự ý đặt tên mới, tạo thuật ngữ mới, hay thay đổi cách gọi nhân vật. AI phải tuân theo glossary của dịch giả. Nếu không có glossary, AI phải nhất quán với cách đã dịch trong session.

---

## 4. Target users

### Primary: Dịch giả solo (chiếm ~75% user)
Cá nhân dịch 2–5 chương/ngày, tự quản lý cả dịch lẫn QC, đăng lên hako.vn / docln.net hoặc website riêng.

### Secondary: Trưởng nhóm dịch (~20% user)
Quản lý nhóm 3–8 người (dịch thô → editor → proofreader), cần phân công chương, track tiến độ, và đảm bảo nhất quán thuật ngữ giữa các thành viên.

### Tertiary: Editor / Proofreader (~5% user)
Nhận bản dịch thô để chỉnh sửa, cần đối chiếu raw, đánh dấu đoạn cần sửa, và verify thuật ngữ.

---

## 5. Nguồn ngôn ngữ được hỗ trợ

| Ngôn ngữ nguồn | Thể loại phổ biến | Ghi chú |
|---------------|-------------------|---------|
| Tiếng Trung (CN) | Xianxia, tiên hiệp, ngôn tình | Ngôn ngữ nguồn chính, nhiều thuật ngữ chuyên biệt |
| Tiếng Nhật (JP) | Isekai, romance, slice-of-life | Có hệ thống xưng hô phức tạp |
| Tiếng Hàn (KR) | Manhwa action, romance | Hệ thống tôn ti xã hội rõ ràng |

Lưu ý về relay translation: Nhiều dịch giả VN dịch theo chuỗi CN/JP/KR → EN (MTL hoặc human) → VN. App phải hỗ trợ cả hai flow: dịch thẳng từ nguồn và dịch từ bản EN trung gian.

---

## 6. Platform & Deployment

- **Electron desktop app** — chạy hoàn toàn local, không cần internet (ngoại trừ gọi AI API)
- **Dữ liệu lưu local** — người dùng sở hữu dữ liệu của mình
- **AI API** — kết nối Claude / OpenRouter / local LLM (Ollama) theo cấu hình của user
- **Target OS** — Windows (chính), macOS (phụ)

---

## 7. Định vị cạnh tranh

```
                      AI-heavy
                          │
     NOVELOUS             │        DeepL / Google
     (commercial)         │        (generic MT)
                          │
 ─────────────────────────┼─────────────────────────
  Fiction-specific        │                 Generic
                          │
       NovelFlow  ←───────┤
       (target)           │        OmegaT / memoQ
                          │        (corporate CAT)
                          │
                      Human-heavy
```

NovelFlow nằm ở góc **fiction-specific + human-controlled**: chuyên biệt cho tiểu thuyết dài kỳ, AI là trợ lý không phải engine, dịch giả giữ quyền kiểm soát văn phong.

---

## 8. Success Metrics (v1.0)

| Metric | Mục tiêu |
|--------|----------|
| Time-to-first-token | ≤ 3 click từ lúc mở app đến khi AI bắt đầu dịch |
| Chapters per hour | Tăng 2× so với workflow thủ công (ChatGPT + Google Docs) |
| Glossary consistency rate | ≥ 95% thuật ngữ nhất quán trong một truyện |
| Session resume friction | 0 click để tiếp tục từ chỗ dịch dở |
| Context build-up | Glossary/characters được thêm in-flow (không rời màn hình dịch) |

---

## 9. Ngoài phạm vi (v1.0)

- Collaboration cloud / real-time sync (→ roadmap)
- Mobile app
- Auto-publish lên hako/docln (cần API của từng platform)
- Video / manga translation
- Dịch sang ngôn ngữ khác ngoài tiếng Việt
