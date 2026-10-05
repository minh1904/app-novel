# Fixture ja-irene (riêng tư)

Bộ chương thử tiếng Nhật cho module **Bộ đo** ([lộ trình](../../../docs/handbook/delivery/roadmap.md), [chất lượng dịch](../../../docs/handbook/research/translation-quality.md) E1). Thư mục `fixtures/private/` bị `.gitignore`: raw có bản quyền, **không đưa vào repo**.

**Trạng thái:** nháp, soạn ngày 2026-10-03.
- Raw do chủ sản phẩm dán vào hội thoại.
- Glossary và ma trận xưng hô do Claude soạn; ngày 2026-10-04 chủ sản phẩm chọn phương án (a) cho mọi lựa chọn văn phong. Quy tắc kiểm vẫn là nháp.
- Chưa có bản dịch tham chiếu.

## Tệp

| Tệp | Nội dung |
| --- | --- |
| `work.json` | Thông tin tác phẩm. Tên, tác giả, URL **chưa có** |
| `glossary.json` | 49 mục: tên, tước vị, xưng hô thân tộc, thuật ngữ. `decision: true` là lựa chọn văn phong cần chốt (11 mục) |
| `pronouns.json` | Ngôi kể theo điểm nhìn, và 18 cặp người nói → người nghe (10 chỗ cần chốt) |
| `chapters/NN/source.txt` | Nguyên văn như bản dán. Dòng liền nhau và dòng có dòng trống ngăn được giữ đúng; số dòng trống giữa hai đoạn có thể khác trang gốc |
| `chapters/NN/meta.json` | Ngôn ngữ, tên chương, điểm nhìn, số đoạn theo định nghĩa ADR-005, thẻ đặc điểm |
| `chapters/NN/assertions.json` | Quy tắc kiểm viết tay, neo bằng chuỗi nguồn (`where`) hoặc cả dòng (`line`), không neo bằng số thứ tự đoạn. `pair` là cặp xưng hô để giám khảo/người chấm soát, không so chuỗi |

## Đặc điểm đáng đo

| Chương | Điểm nhìn | Đoạn | Ca khó |
| --- | --- | --- | --- |
| 01 | Irene | 87 | Lời tác giả nằm liền dòng với đoạn truyện cuối; quan hệ "mợ"; ngắt cảnh `＊＊＊` |
| 02 | Irene | 69 | Lời dẫn lồng 『』 trong 「」; chơi chữ "nghe nhầm / nhìn nhầm"; 29 dòng thoại liền nhau |
| 03 | Irene | 99 | "けいさつ" (từ lạ của kiếp trước); câu meme; người nói không nêu tên ở cuối |
| 04 | Tilda | 73 | Đổi điểm nhìn `◇`; hồi tưởng; lão phu nhân khinh miệt |
| 05 | Wilhelm | 53 | Quan hệ "bác"; văn thư trang trọng; dòng cuối chỉ có U+3000 |

Định nghĩa cũ (cụm dòng ngăn bởi dòng trống) sẽ gộp 95 trên 381 dòng của 5 chương. Định nghĩa của ADR-005 (mỗi dòng không trống) giữ chúng tách riêng.

## Còn thiếu cho bộ fixture đầy đủ

- 2 chương tiếng Trung (một thoại dày, một dày thuật ngữ) và 1 chương tiếng Anh.
- Chủ sản phẩm duyệt các mục `decision: true`.
- Tùy chọn: bản dịch tham chiếu cho vài chương.
