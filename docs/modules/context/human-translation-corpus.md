# Kho đối chiếu bản dịch người: yêu cầu dữ liệu

Cập nhật: 2026-10-06 · Trạng thái: **Đề xuất**, chưa có dữ liệu, chưa có mã phân tích.
Chủ trì: chủ sản phẩm cung cấp dữ liệu; người phụ trách nghiên cứu dịch thuật phân tích.
Câu hỏi trang này trả lời: cần cung cấp gì để đo cách người dịch xử lý xưng hô và độ linh hoạt khi dịch Nhật → Việt?

## Vì sao cần

Module Ngữ cảnh học cách xử lý của người dịch, không lấy bản AI làm chuẩn ([README](README.md)). Thí nghiệm `v4` cho thấy
model tự điền "em" cho Rion khi nguyên tác lược đại từ
([giả thuyết](vietnamese-addressing.md)). Muốn biết người dịch thật làm gì ở đúng những câu đó cần có
**cả nguyên tác lẫn bản dịch**. Chỉ có bản dịch thì phân tích được thói quen nhưng không phân biệt được lựa chọn
có chủ ý với việc tự thêm.

## Điều sẽ phân tích

1. Câu nguyên tác lược đại từ hoặc chỉ gọi tên + 様/さん: người dịch chọn đại từ nào, hay lược.
2. Kính ngữ: giữ -sama/-san, đổi thành "ngài", "cậu chủ", "tiểu thư", hay bỏ; theo thể loại và quan hệ.
3. Độ trôi xưng hô của người dịch trong cùng một cặp (đường chuẩn để so với lệch của AI).
4. Khi nào người dịch đổi cặp theo cảnh hoặc cảm xúc, và đổi bằng cách nào.
5. Độ linh hoạt ở mức câu: tách, gộp, đảo trật tự, thêm hoặc bớt tiểu từ ("ạ", "nhé", "đấy"), lược chủ ngữ.
6. Tên riêng và thuật ngữ: mức nhất quán, chỗ người dịch tự đổi.

## Cần bạn cung cấp

**Mỗi tác phẩm một thư mục** `fixtures/private/human-corpus/<mã truyện>/` (cùng chỗ với raw có bản quyền hiện có; xem lưu ý ở mục Giới hạn):

| Tệp | Nội dung |
| --- | --- |
| `raw/NNN.txt` | Nguyên tác tiếng Nhật của chương NNN, nguyên văn, UTF-8 |
| `vi/NNN.txt` | Bản dịch tiếng Việt của **cùng chương** NNN, nguyên văn, UTF-8 |
| `meta.json` | Xem bên dưới |

Số chương `NNN` ở `raw` và `vi` phải khớp nhau; chương nào thiếu một bên thì bỏ cả cặp. Không cần ghép từng đoạn, bước
đó sẽ do mã làm (đã có `paragraphAlign`).

`meta.json` ghi: mã/tên truyện, thể loại, nhóm hoặc người dịch, nguồn (trang Hako và URL), ngày đọc,
bản dịch có đủ chương hay một phần, và **ghi chú khác biệt bản**: bản dịch dựa trên bản web hay bản sách, có chương nào
người dịch bỏ hay thêm không.

## Ưu tiên

1. **Truyện đã có raw trong Lab** (n4696dd, n5955en, n0174gy, n1354hz, n5040ce) nếu Hako có bản dịch: giữ nguyên mã.
2. Mỗi truyện lấy tối thiểu **chương 1–10**, hoặc đoạn có nhiều thoại giữa hai nhân vật cố định.
3. Đa dạng thể loại và loại quan hệ: hầu gái–chủ, anh chị em, quý tộc–quý tộc, thầy trò, hôn phu–hôn thê.
4. Nhiều người dịch khác nhau càng tốt, đủ để thấy thói quen riêng và thói quen chung.

Càng nhiều chương càng tốt nhưng không cần cả bộ. Ba đến năm truyện, mười chương mỗi truyện là đủ cho báo cáo sơ bộ.

## Sản phẩm

Báo cáo ghi mỗi con số với số mẫu và đánh dấu **Quan sát**:
- Bảng quan hệ → phân bố cặp (tự xưng, gọi người nghe), kèm tỉ lệ lược đại từ.
- Danh sách câu "linh hoạt" có dẫn nguyên tác và bản dịch để đọc tay.
- Đường chuẩn độ trôi xưng hô của người dịch, để so với `v4`.
- Đề xuất chỉnh bảng mặc định `addressingPresets`; chỉnh là **đề xuất** cho đến khi chủ sản phẩm chốt.

## Giới hạn

- Bản dịch fan có lỗi và thói quen cá nhân. Nó cho biết cộng đồng làm gì, không phải đáp án đúng.
- Chọn truyện ảnh hưởng kết luận; mẫu nhỏ chỉ cho xu hướng.
- Raw và bản dịch là nội dung có bản quyền. Giữ riêng tư; tài liệu và báo cáo chỉ ghi thống kê và trích ngắn, không chép toàn văn.
- **Lưu ý git:** từ commit `5d27551`, `fixtures/private/` được git theo dõi và đã nằm trên remote. Bản dịch của người khác là nội dung
  của họ, không phải của chủ repo. Trước khi thêm `human-corpus/`, cần chủ sản phẩm quyết định có thêm dòng
  `fixtures/private/human-corpus/` vào `.gitignore` hay không (khuyến nghị: có).
- Tôi không tự thu thập từ Hako; dữ liệu do bạn cung cấp.
