# 01-product — Tài liệu sản phẩm

Tầng product documentation của NovelFlow. Đọc theo thứ tự này:

| File | Nội dung | Đọc khi |
|------|----------|---------|
| [`01-vision.md`](01-vision.md) | Vision, positioning, triết lý "AI là tool" | Muốn hiểu tại sao sản phẩm tồn tại |
| [`02-user-research.md`](02-user-research.md) | Verified research findings, pain points, landscape | Trước khi thiết kế feature mới |
| [`03-personas.md`](03-personas.md) | 3 personas với JTBD, pain points, success metrics | Khi cần evaluate feature cho đúng user |
| [`04-user-journeys.md`](04-user-journeys.md) | 5 journeys: hiện tại vs lý tưởng | Khi thiết kế screen/flow mới |
| [`05-feature-spec.md`](05-feature-spec.md) | Feature spec P0→P3 với acceptance criteria | Khi implement feature |
| [`06-ux-principles.md`](06-ux-principles.md) | 8 nguyên tắc UX với rationale | Khi có quyết định design trade-off |
| [`07-information-architecture.md`](07-information-architecture.md) | Screens, navigation, data model, AI injection | Khi thêm screen mới hoặc thay đổi data |

---

## Tóm tắt một trang

**NovelFlow là gì:** Bàn làm việc dịch thuật cho dịch giả fan tiểu thuyết VN. AI là integration (draft tool), không phải engine thay thế dịch giả.

**User chính:** Solo translator dịch 2–5 chương/ngày, đăng lên hako.vn/docln.net.

**Pain point số 1:** Mỗi session phải warm up AI lại từ đầu (paste glossary, nhân vật, hướng dẫn). Context không persist.

**Pain point số 2:** Thuật ngữ và tên nhân vật drift giữa các chương vì không có glossary được enforce.

**Core loop:** đọc raw → AI draft → sửa tay → next chapter. Mọi thứ khác là phụ trợ.

**Differentiator so với ChatGPT + Google Docs:**
1. Context persistence (glossary/characters inject tự động mỗi session)
2. Xưng hô tracking theo phases (không tool nào trong ecosystem làm)
3. Import/export native (không copy-paste)
4. Chapter-centric workflow (không phải file-centric)
