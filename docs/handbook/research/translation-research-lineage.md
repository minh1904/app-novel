# Kế thừa tài liệu dịch thuật ban đầu và mở rộng Nhật → Việt

Ngày: **2026-10-04** · Trạng thái: **quan sát lịch sử + nghiên cứu + đề xuất chưa chốt**.
Chủ trì: research/product. Liên quan: [Nhật → Việt](ja-vi-translation.md),
[repo Việt Nam](vietnamese-translation-repos.md), [chất lượng dịch](translation-quality.md).

## 1. Đã tìm lại đúng bộ tài liệu nào?

Commit thêm đầu tiên cho `docs/03-ai/` và `docs/04-research/` là
`9244b076b6e1d5f2f1ffd63d2b36b4c60a6911e2` ngày 11/06/2026. Tám tài liệu bị xóa ở
`45eb7e9ebada60a3cdab5ea0d452f1989407e8d3` ngày 23/09/2026; không phải thất lạc khỏi Git.
Đã khôi phục nội dung vào [bản lưu có chỉ mục](archive/2026-06-11/README.md).

Đã đọc toàn bộ tám tệp, không chỉ tìm theo tiêu đề. Đã fetch và pull fast-forward-only; remote
không có cập nhật mới. Không checkout lại phiên bản ứng dụng cũ. Tài liệu được lưu để tham chiếu,
còn phân tích mới nằm ở đây và chương chuyên đề, không tạo hai nguồn quyết định song song.

**Đính chính tính mới:** hướng A→B, biến thể theo cảnh, chỉ cảnh báo thay vì tự sửa và phân tầng
glossary/ngữ cảnh đã có từ bản tháng 6. Khảo sát tháng 10 cung cấp thêm bằng chứng, giới hạn và ca
kiểm; không nên trình bày những hướng này như phát hiện hoàn toàn mới.

## 2. Đối chiếu: kế thừa có điều kiện, không phục hồi mọi quy tắc

| Nội dung bản tháng 6 | Nhận định sau đối chiếu | Hướng nghiên cứu hiện tại |
| --- | --- | --- |
| Xưng hô theo speaker→listener, có mặc định và biến thể | Kế thừa được về mô hình; không chứng minh tự trích xuất đúng | Thêm phạm vi cảnh, bằng chứng và trạng thái chưa biết |
| Mặc định bỏ `-san/-kun/-chan` | Bị thay bởi quyết định 2026-10-04: người dịch chọn, mặc định giữ hậu tố khi không có yêu cầu | So sánh các chế độ; chấm chức năng xã hội riêng với tuân style guide |
| `tôi/anh/chị/bạn` là phương án trung tính khi thiếu ngữ cảnh | Không có lựa chọn hoàn toàn vô thông tin; có thể tự thêm giới/vai/thái độ | Lược khi tự nhiên, nếu bắt buộc chọn mà thiếu chứng cứ thì cần duyệt |
| Quan hệ chỉ inject khi người dùng xác nhận | Điểm kiểm soát tốt, nhưng chưa đo mức thiếu coverage và công duyệt | Tách đã duyệt / ứng viên / mâu thuẫn; không âm thầm nâng ứng viên thành sự thật |
| Không ai trong ecosystem theo dõi xưng hô/quan hệ | Không dùng làm kết luận hiện tại; đã có repo với trạng thái quan hệ | Chuyển câu hỏi thành độ đúng, khả năng sửa và diễn biến theo thời gian |
| Glossary vào system là đồng thuận; memory ở assistant tốt hơn | Tài liệu cũ không có phép đo chứng minh ưu thế | Chỉ là biến thí nghiệm, không phải chuẩn chất lượng |
| Auto-growing memory từ tên lấy trong output | Không đủ để xác lập cặp Nhật–Việt; có nguy cơ lặp lại lỗi model | Mỗi ứng viên cần neo vào nguồn và có bước duyệt |
| CJK repair tự thay output | Có thể phá ruby/chơi chữ; không phù hợp quy tắc người duyệt văn bản đã có | Phát hiện → giải thích → đề xuất sửa, không sửa ngầm |
| Độ dài quá ngắn là critical | Tín hiệu nghi ngờ không tự chứng minh mất nghĩa | Chấm mất nội dung khi có bằng chứng nguồn–đích; báo anomaly riêng |
| MQM-lite và vòng đời issue | Hữu ích về tổ chức nhưng ví dụ/ngưỡng chưa được hiệu chuẩn | Phân biệt lỗi đã xác nhận, cờ tự động và sở thích biên tập |

Các bảng tuổi, giới, thể loại và ví dụ dịch trong bản lưu là hướng dẫn tác nghiệp chưa có truy xuất
nguồn mẫu người dịch. Không nhập chúng vào corpus. Những đoạn Hàn/Trung/Anh chỉ là lịch sử thiết kế;
đợt mở rộng này vẫn tập trung **Nhật → Việt**.

## 3. Bằng chứng bổ sung từ nghiên cứu gốc

### 3.1. Có quan hệ chưa có nghĩa là biết người nghe từng câu

Tài liệu [CEJC của NINJAL](https://www2.ninjal.ac.jp/conversation/cejc/data_relation.html) nói rõ
không cung cấp nhãn người nhận cho từng phát ngôn. Thông tin quan hệ chỉ được tổng hợp khi xác định
được từ thành phần hội thoại; có trường hợp biết nhóm lớn nhưng không biết nhóm nhỏ, và người tham
gia tạm thời chưa được tính. Đây là giới hạn của nguồn, không phải lỗi corpus.

**Suy luận cho Mira:** tách độ chắc chắn của nhận diện người nghe khỏi độ chắc chắn của quan hệ.
Trong cảnh ba người, biết A là anh B không đủ kết luận mọi câu A nói đều nhắm B. Bộ chấm phải có
trạng thái “không đủ căn cứ”, không coi một ma trận đầy đủ là nhãn người nghe đầy đủ.

### 3.2. Kính ngữ cần cả cấu trúc câu và ngữ cảnh xã hội

[Liu và Kobayashi, 2022 — KeiCO](https://aclanthology.org/2022.dclrl-1.3/) mô tả corpus kính ngữ
gắn thông tin địa vị xã hội và kiểm bằng tác vụ phân loại. Chỉ dùng nó làm căn cứ cho nhu cầu
metadata; đây không phải tập bản dịch văn học Nhật–Việt.

[Sekizawa và Yanaka, 2024](https://www.jstage.jst.go.jp/article/jnlp/31/3/31_1292/_article/-char/en)
tách đánh giá chấp nhận được và chuyển đổi kính ngữ; tóm tắt nghiên cứu báo mô hình còn khó với câu
phức hơn câu đơn trong tác vụ chuyển đổi. Không ngoại suy thành điểm chất lượng của model hiện tại.

**Suy luận cho Mira:** thêm lát cắt câu lồng, người được nhắc tới không phải người nghe, lời thuật
lại và chuyển cảnh. Một cặp tự xưng–gọi đủ đúng cho thoại trực tiếp chưa chắc đủ cho kính ngữ nói
về người thứ ba. Chưa chọn corpus hay chạy lại nghiên cứu này.

### 3.3. Làm rõ phần bị lược không đồng nghĩa thêm sự kiện

[Nghiên cứu minh thị hóa Nhật–Việt, 2016](https://www.jstage.jst.go.jp/article/its/16/0/16_1603/_article/-char/ja/)
khảo sát tám phiên dịch có kinh nghiệm; phân loại phục hồi phần bị lược, chia câu, thêm từ nối,
thêm thông tin, làm rõ đối tượng quy chiếu và tên riêng. Miền là **phiên dịch**, không phải tiểu
thuyết; không dùng để khuyến khích viết thêm hoặc suy tỷ lệ chuẩn cho truyện.

**Suy luận cho rubric:** phải phân biệt nói rõ thông tin đã được ngữ cảnh chứng minh với bịa thêm
thông tin mới. Không gắn nhãn hallucination chỉ vì bản Việt nhiều từ hơn; cũng không tha việc đoán
chủ thể chỉ vì câu đọc trôi chảy.

Phạm vi đọc: trang metadata/tóm tắt của ba bài nghiên cứu và toàn trang hướng dẫn CEJC; chưa đọc
toàn văn ba bài, chưa kiểm dữ liệu hoặc tái hiện thực nghiệm. Đây là bổ sung nguồn có định danh
để kiểm tiếp, không khẳng định chúng chính là những bài không có URL được bản tháng 6 nhắc đến.

## 4. Mô hình nghiên cứu mở rộng: ba lớp cần tách

Đây là **đề xuất mô hình khái niệm**, chưa phải schema triển khai.

| Lớp | Nội dung | Ví dụ rủi ro nếu gộp |
| --- | --- | --- |
| Sự kiện nguồn | danh tính, quan hệ, cấp bậc; ai biết điều gì ở thời điểm nào | lời đùa “má/con” bị ghi thành quan hệ mẹ–con |
| Hành vi lời nói tại cảnh | người nói, người nghe, người được nhắc, cách gọi, mức chắc chắn | nhầm kính trọng người thứ ba thành kính trọng người nghe |
| Quyết định bản Việt | cặp xưng hô, biến thể, giữ hậu tố, giọng kể, người duyệt | thay preset làm thay cả quan hệ nguồn |

Mỗi nhận định nên mang vị trí nguồn, phạm vi có hiệu lực, trạng thái duyệt và căn cứ. Không dùng
confidence do model tự cho làm bằng chứng duy nhất. Khi thiếu một vai, lưu chưa biết; không điền
giới/tuổi từ tên hoặc kiểu nhân vật.

**Tránh biết trước nội dung:** snapshot chương N chỉ dùng thông tin được phép biết tới N. Một tiết
lộ ở chương sau có thể giúp người biên tập rà lại, nhưng không được tự đẩy vào lời kể hay thoại
của chương trước. Phải tách “thời điểm sự thật có hiệu lực” và “thời điểm văn bản tiết lộ”.

**Sửa một quyết định không tự sửa toàn truyện:** biết tên đúng ở chương sau tạo danh sách vị trí
bị ảnh hưởng và đề xuất; không thay cả alias trong lời dẫn, trò đùa hoặc giả danh bằng một lượt
thay chuỗi. Phù hợp quy tắc hiện hành người duyệt bản dịch đã có chữ.

## 5. Thiết kế mở rộng tập nghiên cứu người dịch

Mỗi mẫu được chọn cần: tác phẩm và phiên bản Nhật, bản Việt tương ứng, dịch giả/nhóm và hiệu đính,
vị trí hai phía, đoạn trước/sau đủ hiểu cảnh, nguồn công khai hoặc bản được phép dùng, ghi chú quyền
sử dụng, và người kiểm tra provenance. Có credit không đồng nghĩa đã kiểm chính xác nghĩa.

Tách hai tập:

- **Tập quan sát phong cách người dịch:** mô tả cách giải quyết một hiện tượng và các lựa chọn hợp
  lệ; không lấy một câu làm đáp án duy nhất cho toàn thể loại.
- **Tập đánh giá:** mẫu đã đối chiếu Nhật–Việt, có lỗi/đặc tính được người biết hai ngôn ngữ xác nhận.
  Chấp nhận nhiều cách diễn đạt đúng; chấm nghĩa và hiệu ứng, không chỉ khớp chuỗi reference.

Không đưa ví dụ tự soạn hoặc output AI vào hai tập trên. Ca tự soạn được gắn nhãn riêng và chỉ
dùng kiểm bộ phát hiện, chẳng hạn kiểm phân biệt ngôi hai với tự xưng. Không trộn đoạn đã dùng
để chỉnh prompt vào tập giữ lại đánh giá; chia theo tác phẩm để giảm việc học thuộc văn phong mẫu.

## 6. Các phép thử ưu tiên sau khi có mẫu đủ điều kiện

| Phép thử | Chỉ thay một yếu tố | Đo chính và đối chứng |
| --- | --- | --- |
| T1: ngữ cảnh quan hệ | cùng nguồn, không ma trận so với ma trận đã người duyệt | sai vai/người nghe; số ca thiếu căn cứ |
| T2: phạm vi cảnh | mặc định A→B so với có ngoại lệ theo cảnh | giữ chuyển giọng có chủ ý, báo nhầm drift |
| T3: người thứ ba | hồ sơ chỉ A/B so với thêm đối tượng được nhắc | ai được kính trọng; sai tác thể trong câu lồng |
| T4: kính ngữ | giữ / Việt hóa / lai với cùng glossary | nghĩa quan hệ trước, sở thích trình bày sau |
| T5: ký ức có lỗi | cùng nguồn, thêm một mục chưa duyệt sai | khả năng từ chối mâu thuẫn; lỗi lan sang chương sau |
| T6: giới hạn tri thức | snapshot đúng mốc so với bị lẫn tiết lộ tương lai | thêm thông tin, phá dụng ý che danh tính |
| T7: kiểm lỗi | cùng mẫu đúng và biến thể có lỗi được người xác nhận | precision, recall và tỷ lệ không đủ căn cứ |

Với T7, không chia cho không khi không có ca áp dụng: báo N/A cùng số mẫu, không báo điểm tuyệt đối.
Các ngưỡng độ dài, trôi đại từ và fuzzy tên cần hiệu chuẩn riêng; không dùng ngưỡng tháng 6 như
định luật. Chưa có kết quả số cho các phép thử này; chưa chạy model hoặc benchmark trong đợt này.

## 7. Thứ tự tiếp nối

1. Hoàn tất thẩm định provenance và phiên bản nguyên tác của nguồn người dịch đã tìm được.
2. Đọc thêm bản phát hành có dịch giả và mẫu hợp pháp; chưa đủ căn cứ chọn mặc định từ fan-trans.
3. Annotate mẫu theo ba lớp, cho người đọc Nhật–Việt kiểm cả lỗi lẫn trường hợp đúng dễ bị báo nhầm.
4. Chỉ sau đó mới thử các giả thuyết của tài liệu tháng 6 và các repo công cụ trên cùng tập giữ lại.

Skill `openspec-explore` được dùng để giữ đợt này ở mức nghiên cứu: không thay code, schema,
prompt chạy thật, tasks hay quyết định sản phẩm. Tài liệu gốc được khôi phục theo yêu cầu người dùng.

---

[Mục lục handbook](../README.md)
