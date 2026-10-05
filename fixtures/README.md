# Fixture cho Bộ đo

Bộ chương mẫu dùng làm đầu vào và oracle cho module **Bộ đo**. README này chỉ là danh mục dữ liệu;
contract, cách chạy và cách diễn giải nằm ở:

- [Fixture và oracle](../docs/modules/measurement/fixtures.md)
- [Chạy thí nghiệm](../docs/modules/measurement/running-experiments.md)
- [Metric và judge](../docs/modules/measurement/metrics-and-judging.md)

Schema được kiểm bằng `src/shared/contracts/fixture.ts` và
`src/shared/algorithms/fixtureCheck.ts`. Trạng thái `draft/reviewed/approved` trong từng tệp là trạng
thái oracle; việc qua schema không có nghĩa nội dung đã được người dịch xác minh.

## Hai thư mục

| Thư mục | Trong repo | Dùng cho |
| --- | --- | --- |
| `public/` | **Có** | Văn bản thuộc phạm vi công cộng hoặc có giấy phép mở. Ai cũng chạy lại được |
| `private/` | **Có** từ 2026-10-06 (chủ sản phẩm bỏ khỏi `.gitignore`) | Raw có bản quyền (truyện mạng hiện đại), thư viện và kết quả của Mira Lab. Không chia sẻ repo ra ngoài khi còn thư mục này |

Khi chạy thí nghiệm, văn bản của cả hai thư mục được gửi tới nhà cung cấp AI đã chọn.

## Bộ hiện có

| Tác phẩm | Ngôn ngữ | Chương | Đoạn | Nguồn và quyền | Đặc điểm để đo |
| --- | --- | --- | --- | --- | --- |
| `public/zh-kongyiji` | Trung giản thể | 1 | 15 | 《孔乙己》, Lỗ Tấn 1919, [Wikisource](https://zh.wikisource.org/wiki/孔乙己) rev 2605389; phạm vi công cộng | Thoại nằm liền trong đoạn; xưng hô quán rượu; câu văn ngôn chen lời nói thường |
| `public/zh-hant-xiyouji` | Trung phồn thể | 1 (hồi 2) | 54 | 《西遊記》, Ngô Thừa Ân, [Wikisource](https://zh.wikisource.org/wiki/西遊記/第002回) rev 2449088; phạm vi công cộng | Dày thuật ngữ tu luyện, tên Hán-Việt quen thuộc; thơ chen văn xuôi; chương dài |
| `public/en-fight-above-the-trees` | Anh | 1 | 57 | WMT24++ `en-vi_VN`, miền literary, hai tài liệu `fight_above_the_trees`; **Apache-2.0** (xem `LICENSE-Apache-2.0.txt`) | Fantasy nhiều thoại, tên tự đặt, lời in hoa; **có bản tham chiếu tiếng Việt** |
| `private/ja-irene` | Nhật | 5 | 381 | Truyện mạng do chủ sản phẩm dán; có bản quyền | Thoại liền dòng, xưng hô gia đình quý tộc, đổi điểm nhìn, lời tác giả, dòng chỉ có U+3000 |

**Giới hạn của phần công khai:**
- Hai chương tiếng Trung là văn cổ điển và cận đại, không phải văn truyện mạng hiện đại: thoại nằm liền trong đoạn, không phải mỗi lượt một dòng. Muốn đo đúng truyện mạng Trung hiện đại thì cần thêm raw vào `private/`.
- Bản tham chiếu tiếng Việt của WMT24++ có lỗi (xem `work.json` của tác phẩm đó). Chỉ dùng cho metric cần tham chiếu, không làm chuẩn vàng.

## Tệp của một tác phẩm

| Tệp | Nội dung |
| --- | --- |
| `work.json` | Ngôn ngữ, tên, tác giả, nguồn, bản sửa (revision), quyền sử dụng, những gì đã chỉnh so với nguồn |
| `glossary.json` | Mục thuật ngữ `{src, tgt, type, aliases?, alternatives?, forbidden?, note?, decision?}`. `decision: true` là lựa chọn văn phong cần chốt |
| `pronouns.json` | Ngôi kể theo điểm nhìn, và các cặp người nói → người nghe `{speaker, listener, self, address, fromChapter, …}` |
| `chapters/NN/source.txt` | Nguyên văn. Đoạn là **mỗi dòng không trống** (ADR-005 Q3); dòng chỉ có khoảng trắng, kể cả U+3000, là trống |
| `chapters/NN/meta.json` | Số đoạn, số ký tự, thẻ đặc điểm, ghi chú |
| `chapters/NN/assertions.json` | Quy tắc kiểm viết tay, neo bằng chuỗi nguồn (`where`, phải khớp đúng một dòng) hoặc cả dòng (`line`). `pair` là cặp xưng hô để giám khảo hay người chấm soát |
| `chapters/NN/reference.vi.txt` | Tùy chọn: bản dịch tham chiếu, cùng thứ tự đoạn |

Git lưu LF và checkout ra CRLF (`.gitattributes`), nên Bộ đo phải chuẩn hóa xuống dòng trước khi đếm đoạn.
