# Repo dịch tiếng Việt: bằng chứng và bài học cho Nhật → Việt

Ngày đọc: **2026-10-04** · Trạng thái: **Quan sát + đề xuất, chưa chốt** · Chủ trì: research/product.

Liên quan: [nghiên cứu Nhật → Việt](ja-vi-translation.md), [sổ nguồn](sources.md).

## Mục tiêu và phương pháp

Tìm thực hành có thể học từ cộng đồng dịch Việt Nam, không lấy bản AI làm mẫu văn phong.
Phân biệt ba loại: bản dịch có nhân sự chịu trách nhiệm; hạ tầng phục vụ người dịch; công cụ AI.
Repo nhắm tới tiếng Việt không tự chứng minh quốc tịch tác giả, chất lượng hay nguồn người dịch.

Đã đọc metadata, cây tệp và các tệp chọn lọc ở những revision dưới đây, cùng trang chính chủ nhóm
dịch. Không chạy code bên ngoài, không gọi model, không clone kho truyện, không nhập nội dung truyện
vào Mira. Nhận xét code là phân tích tĩnh, chưa phải kết quả thực nghiệm. Không khảo sát toàn bộ repo.

**Nguồn người dịch cũng cần thẩm định từng mẫu:** credit là bằng chứng xuất xứ công khai, không phải
chứng nhận mọi câu đúng hoặc kiểm toán tuyệt đối việc dùng công cụ. Một mẫu đủ điều kiện tham khảo
chưa tự trở thành gold reference. Cần nguyên tác đúng phiên bản, người đọc biết tiếng Nhật kiểm
nghĩa, ngữ cảnh và quyền sử dụng trước khi đưa vào bộ chuẩn.

## 1. Repo của nhóm dịch người: ưu tiên và giới hạn

| Nguồn | Bằng chứng đã đọc | Được dùng để làm gì |
| --- | --- | --- |
| [vnkeyfc/primadoll](https://github.com/vnkeyfc/primadoll/tree/3b69af9a1f716194e21c637debd981352c47acb7) | `.translate/novel_01.txt` có ID, JP, VN; cuối tệp ghi người dịch Tennouji Akane, hiệu đính Minata Hatsune | Ứng viên khảo sát trực tiếp Nhật–Việt; chưa nhập làm tập chuẩn |
| [vnkeyfc/clannad-ngoai-truyen](https://github.com/vnkeyfc/clannad-ngoai-truyen/tree/2d5eb0ab65de07b58cc29f4b6971359927ce9a89) | README phân công bốn người theo truyện, báo dịch/QC hoàn tất; phần đầu `SEEN0001.utf` ghép Việt–Anh | Học quản lý tiến độ và định danh; không dùng suy luận chuyển nghĩa Nhật–Việt |
| [vnkeyfc/air-viet-hoa](https://github.com/vnkeyfc/air-viet-hoa/tree/c1b70e2a9a899e27e9297447b269a805b63e4486) | Cây tệp script, README chỉ có tên repo | Chỉ là đầu mối; chưa đủ metadata để đánh giá mẫu người dịch |

### Prima Doll Encore: có nguồn–đích, không chỉ lời giới thiệu

Đã đọc phần đầu [tệp chương 01](https://github.com/vnkeyfc/primadoll/blob/3b69af9a1f716194e21c637debd981352c47acb7/.translate/novel_01.txt)
và credit cuối tệp. Trang [dự án của nhóm](https://vnkeyfc.com/projects/) xác nhận Encore là dự án
lite novel; không nhầm với manga hay game Prima Doll Episode 1.

Quan sát trong phần đã đọc: văn bản dùng ID để giữ cặp nguồn–đích; có tên phiên âm, thuật ngữ Việt
kèm ruby Latin và chú thích đơn vị tiền. Lời kể dùng “tôi” cho `ボク` ở đoạn ID 7. Đây là lựa chọn
trong ngữ cảnh này, không phải luật `boku = tôi` cho mọi nhân vật.

**Đề xuất cho Mira:** giữ ID ổn định, phân biệt lời kể/thoại, giữ được ruby và liên kết chú thích.
Chỉ lưu trong nghiên cứu vị trí và loại hiện tượng; không sao chép chương. Còn cần xác minh phiên
bản nguyên tác, lịch sử hiệu đính và quyền tái sử dụng nếu muốn tạo tập chấm.

### CLANNAD: người dịch rõ, nhưng cặp ngôn ngữ chưa đạt điều kiện

[Trang phát hành của nhóm](https://vnkeyfc.com/resource/patch/clannad-ngoai-truyen-viet-hoa/)
ghi dịch thuật và hiệu đính riêng. Tuy nhiên, các mục đầu của
[`SEEN0001.utf`](https://github.com/vnkeyfc/clannad-ngoai-truyen/blob/2d5eb0ab65de07b58cc29f4b6971359927ce9a89/SEEN0001.utf)
có câu Việt và comment tiếng Anh. Không suy ra toàn bộ dự án dịch vòng, nhưng cũng không được
gọi đây là mẫu song song Nhật–Việt đã xác minh.

README có regex tìm dòng chưa dịch bằng việc so bản đích với dòng nguồn. Học được cách theo dõi
thiếu bản dịch theo ID; không dùng “hai chuỗi giống nhau” làm lỗi chắc chắn vì tên và ký hiệu có
thể được giữ nguyên có chủ ý. Tiến độ dịch xong cần tách khỏi tiến độ hiệu đính.

## 2. Mẫu cộng đồng ngoài GitHub để kiểm lại giả thuyết

[Higurashi trên Baka-Tsuki](https://www.baka-tsuki.org/project/index.php?title=Higurashi_no_Naku_Koro_ni_(Vi%E1%BB%87t_Nam))
ghi WarriorKK là J-Translator và nói dịch từ nguyên tác Nhật; lịch dự án ghi bắt đầu năm 2011.
Đã đọc phần đầu [Hồi 01](https://www.baka-tsuki.org/project/index.php?title=Higurashi_(Viet):Onikakushi-hen_Chapter_01),
không chỉ phần giới thiệu. Chưa đối chiếu nguyên tác nên chỉ nhận xét lựa chọn tiếng Việt:

- Lời kể của Keiichi dùng “tôi”, còn nói với Rena có “tui/bà”; chiều Rena đáp có “mình/cậu”.
- Ngoặc kép tiếng Việt cùng tồn tại với hậu tố tên Nhật. Đây không phải hai chế độ loại trừ nhau.
- Có lời đùa giữa bạn bè dùng vai gia đình; không thể chỉ thấy một từ xưng hô rồi ghi quan hệ
  huyết thống vào hồ sơ nhân vật.

**Giả thuyết cần kiểm:** ma trận phải có chiều người nói → người nghe, phạm vi lời kể/thoại và
ngoại lệ theo cảnh. Khóa một đại từ tự xưng cho toàn bộ nhân vật có thể báo lỗi nhầm. Một bản dịch
không đủ để kết luận cách dùng này phổ biến hay tối ưu; trang còn ghi đang cần editor.

## 3. Repo công cụ: chỉ học kỹ thuật, không học văn phong từ output

### hadeskers/ln-vn-translator

Revision `02c2a893d1b3375e7ae0b106b92f092967e7beda`.
[README](https://github.com/hadeskers/ln-vn-translator/blob/02c2a893d1b3375e7ae0b106b92f092967e7beda/README.md)
mô tả hệ prompt Nhật–Việt. Đáng tham khảo cách tách quy ước tác phẩm khỏi chỉ dẫn chung.
Nhưng thang điểm thân mật quy định cặp xưng hô và ngưỡng sinh tiếng lóng là heuristic tác giả,
không phải kết quả nghiên cứu người dịch. Không đưa thẳng vào rubric.

[`Library_GOLDEN_SAMPLES.md`](https://github.com/hadeskers/ln-vn-translator/blob/02c2a893d1b3375e7ae0b106b92f092967e7beda/Reference/Library_GOLDEN_SAMPLES.md)
có ví dụ nguồn/đích/lý giải, nhưng phần đã kiểm không cung cấp truy xuất dịch giả và ấn bản cho từng
mẫu. Nhãn “vàng” không đủ điều kiện: **loại khỏi nguồn học văn phong của Mira** cho đến khi xác minh.

### thang97-21/MTLS

Revision `fed2f7093eebc27e09e72d1fb10ee4b063ee0b07`.
Đã đọc [bộ kiểm đại từ](https://github.com/thang97-21/MTLS/blob/fed2f7093eebc27e09e72d1fb10ee4b063ee0b07/pipeline/pipeline/translator/pronoun_consistency_checker.py)
và [khóa glossary](https://github.com/thang97-21/MTLS/blob/fed2f7093eebc27e09e72d1fb10ee4b063ee0b07/pipeline/pipeline/translator/glossary_lock.py).

Bộ kiểm gán nhóm đại từ theo nhân vật, trích thoại bằng regex rồi đếm token. Phân tích tĩnh cho
thấy việc đếm chưa phân biệt rõ tự xưng và gọi người nghe. Ví dụ kiểm thử **tự soạn**, không phải
trích bản dịch: `Em chờ anh` có hai từ có thể là đại từ, nhưng không phải hai cách tự xưng.
Mira nên học ý tưởng báo cáo drift, không coi tỷ lệ đếm là xác suất dịch đúng.

Glossary lock dò gần đúng tên và có hàm sửa output. Regex ứng viên thiên về chữ Latin ASCII;
cần thử tên có dấu, tên nhiều thành phần và hai người gần giống nhau trước khi dùng. Với Mira,
sai tên nghi ngờ nên là cảnh báo có bằng chứng, không tự thay mọi tên gần giống.

### windfox1243/TranslateBooksWithLLMs---RAG-context

Revision `bab2ffd6a9aa8f5c4d72f3b5897b96bab2bc6256`.
Các phần đã đọc trong [`novel_context.py`](https://github.com/windfox1243/TranslateBooksWithLLMs---RAG-context/blob/bab2ffd6a9aa8f5c4d72f3b5897b96bab2bc6256/src/utils/novel_context.py)
tách alias, tên, glossary, xưng hô và diễn biến quan hệ. Schema lời thoại có speaker, addressee,
confidence và Unknown; xưng hô tách tự xưng, đại từ người nghe, cách gọi trực tiếp.

Đây là hướng dữ liệu phù hợp để thử, nhưng prompt yêu cầu bám nguồn không chứng minh model làm
đúng. Một số bộ suy giới tính/quy chiếu dùng mẫu tiếng Anh; không mặc định chúng xử lý lược chủ thể
tiếng Nhật. Cần thử trường hợp không đủ chứng cứ, sửa thông tin cũ và chuyển cảnh.

### caoduongle/API_dich_truyen

Revision `54372da54467c00bf516545ae8a97f7dacd43d54`.
[`prompts.ts`](https://github.com/caoduongle/API_dich_truyen/blob/54372da54467c00bf516545ae8a97f7dacd43d54/src/services/ai/prompts.ts)
thể hiện hướng **Trung–Việt**, thay thuật ngữ vào nguồn trước dịch, chia dịch nháp/biên tập/QA và
yêu cầu bảo toàn đoạn. Chỉ tham khảo cách tổ chức giai đoạn; không chuyển mặc định Hán–Việt hay
xưng hô tiên hiệp sang truyện Nhật. Thay chữ nguồn trước khi hiểu câu có nguy cơ mất bằng chứng
đọc tên hoặc chơi chữ; đây là rủi ro cần thử, chưa phải lỗi đã tái hiện của repo.

## 4. Thí nghiệm đề xuất từ khảo sát

Chưa đổi code hoặc prompt. Quyết định sản phẩm ngày 2026-10-04 đã chọn mặc định giữ hậu tố Nhật
khi người dịch không đặt quy ước; các repo dưới đây không phải căn cứ duy nhất cho quyết định đó.
Trước hết xây mẫu người dịch có provenance; sau đó dùng các ca tự soạn để kiểm chính bộ chấm,
không gọi chúng là bản dịch người.

| Ca kiểm | Điều cần phân biệt | Kết quả mong muốn của bộ chấm |
| --- | --- | --- |
| Một người kể và nói bằng hai đại từ | lời kể với lời thoại | không báo drift chỉ vì khác từ |
| A nói B khác B nói A | quan hệ có chiều | không ép cặp đối xứng |
| Đại từ người nghe xuất hiện trong câu | tự xưng với ngôi hai/ba | không đếm tất cả là tự xưng |
| Đùa bằng vai họ hàng | cách gọi tại cảnh với quan hệ thật | không ghi thêm quan hệ huyết thống |
| Người nói chưa rõ | thiếu chứng cứ với lỗi dịch | trả chưa đủ dữ liệu, không đoán |
| Ruby, tên có dấu, alias gần nhau | hình thức với định danh | giữ lớp thông tin; không thay nhầm tên |

So sánh từng biến: không ngữ cảnh / hồ sơ nhân vật / quan hệ có chiều và cảnh. Chấm mù bởi người
biết Nhật–Việt, tách lỗi nghĩa, lỗi quy chiếu và sở thích biên tập. Báo cả báo động nhầm của checker;
không chỉ đếm số lỗi checker tìm được. Không coi một prompt dài hoặc nhiều test là chất lượng dịch.

## 5. Phần chưa đủ bằng chứng

- Chưa có ba tác phẩm fan dịch và ba bản phát hành được kiểm song song đủ sâu để đánh giá hệ quả
  của từng chế độ; mặc định giữ hậu tố là quyết định sản phẩm có thể thay đổi, không phải kết luận
  rằng nghiên cứu đã chứng minh nó tốt nhất.
- Chưa xác minh nguồn do người dịch của “golden samples” trong repo prompt; không sử dụng.
- Chưa có bản Nhật đối chiếu Higurashi và xác minh phiên bản nguyên tác Prima Doll cho corpus.
- Chưa thẩm định quyền tái sử dụng nội dung; repo công khai/giấy phép code không tự cấp quyền cho
  nguyên tác và bản dịch. Đợt này chỉ lưu quan sát và liên kết, không phân phối lại truyện.
- Chưa chạy các công cụ trên cùng fixture, chưa đo chất lượng hoặc xác nhận những rủi ro tĩnh
  bằng thử nghiệm. Không xếp hạng repo nào dịch tốt nhất.

---

[Mục lục handbook](../README.md)
