# Dịch truyện Nhật → Việt: quy ước, rủi ro và cách đo

Ngày đọc: **2026-10-04** · Trạng thái: **Quan sát + đề xuất chưa chốt** · Chủ trì:
research/product · Liên quan: [chất lượng dịch](translation-quality.md),
[hệ thống ngữ cảnh](context-system.md), change `measure-harness`

## Câu hỏi và phạm vi

Đã tìm lại tài liệu dịch thuật từ commit đầu ngày 11/06/2026. Xem
[đối chiếu và mở rộng](translation-research-lineage.md) để phân biệt ý tưởng đã có, quy tắc cũ cần
sửa và các phép thử mới; [bản lưu nguyên gốc](archive/2026-06-11/README.md) không phải spec hiện hành.

Trang này trả lời câu hỏi hẹp: một bản dịch truyện Nhật → Việt tốt cần giữ những gì, Việt hóa
những gì, và Bộ đo của Mira phải chấm được những lỗi nào. Phạm vi đầu là light novel/web novel;
không coi phụ đề, manga hay văn bản hành chính là cùng một miền.

Phương pháp đợt đầu:

- đọc quy định, hướng dẫn và trang giới thiệu dự án Hako; chưa đọc được thân chương Hako qua công cụ;
- tìm bản phát hành có ghi dịch giả/hiệu đính; chưa có mẫu toàn văn từ đơn vị phát hành để đối chiếu;
- đọc nghiên cứu về lược bỏ trong tiếng Nhật, ngôn ngữ vai, kính ngữ và đại từ tiếng Việt;
- đối chiếu với lỗi thật trong B1/B2a của Mira trên 5 chương Nhật riêng tư.

### Luật chọn nguồn học

Chỉ dùng làm mẫu dịch khi xác định được đó là sản phẩm của **người dịch**:

- bản phát hành chính thức có ghi dịch giả và, nếu có, người hiệu đính;
- fan-trans nằm trong mục Truyện dịch, ghi nhóm/người dịch, ưu tiên bản nói rõ dịch trực tiếp từ
  tiếng Nhật; nhãn Truyện dịch tự nó chưa đủ xác minh quy trình do người dịch;
- bài nghiên cứu ngôn ngữ/dịch thuật có tác giả và phương pháp.

Loại khỏi tập học: mục AI dịch, máy dịch/convert, output của công cụ, bản không rõ nguồn tạo, và bản
dịch vòng qua tiếng Anh khi đang rút quy ước đặc thù Nhật → Việt. B1/B2a của Mira chỉ là **bằng chứng
lỗi cần tránh**, không phải mẫu văn phong hay bản dịch chuẩn. Khi chưa xác minh được nguồn do người
dịch, không dùng nó để rút luật.

Không sao chép chương truyện vào repo. Trích đoạn công khai chỉ dùng để quan sát; không tự động làm
bản tham chiếu và không chứng minh toàn bộ bản in dùng cùng một quy ước. Nguồn tập trung ở mục S39
trong [sổ nguồn](sources.md).

## Kết luận ngắn

1. **Xưng hô là dữ liệu quan hệ, không phải phép thay từ.** Tiếng Nhật có thể lược chủ thể và mã
   hóa khoảng cách qua kính ngữ, động từ, cách gọi tên và đuôi câu; tiếng Việt thường phải chọn rõ
   `tôi/cậu`, `anh/em`, `cháu/mợ`... Prompt chung không thể suy ra quan hệ chưa xuất hiện trong
   chương.
2. **Giọng nhân vật phải chấm theo chức năng.** `ore`, `boku`, `watashi`, mức `desu/masu`, đuôi câu
   và cách gọi người khác cùng tạo “ngôn ngữ vai”. Không nên đòi ánh xạ từng dấu hiệu sang một từ
   cố định; phải xem bản Việt còn phân biệt được nhân vật, thái độ và chuyển biến quan hệ hay không.
3. **Thực hành kính ngữ biến thiên; sản phẩm đã chốt quyền chọn.** Một số dự án Hako tự mô tả giữ
   `-sama` hoặc `「」『』`; chưa kiểm chứng thân chương và chưa có mẫu sách phát hành tương ứng.
   Mẫu Higurashi đọc được có ngoặc kép cùng hậu tố Nhật. Không suy rộng thành chuẩn cộng đồng.
   Quyết định sản phẩm ngày 2026-10-04 cho phép người dịch chọn và mặc định giữ hậu tố khi chưa có
   yêu cầu; đây là mặc định an toàn của Mira, không phải kết luận rằng cộng đồng thích nó hơn.
4. **Tên riêng cần bộ nhớ theo tác phẩm.** Tên Nhật, tên phương Tây viết bằng katakana và tên fantasy
   là ba ca khác nhau. “Chọn cách phổ biến nhất” ở mỗi lần gọi vẫn làm `Irene/Irène/Irenne` trôi giữa
   chương; glossary phải giữ cách viết đã duyệt.
5. **Bộ đo phải tách đúng nghĩa khỏi lựa chọn biên tập.** Sót chủ thể, đảo người làm hành động, đổi
   quan hệ hay làm mất chơi chữ là lỗi nghĩa. Giữ `senpai`, dùng ngoặc kép hay `「」`, thứ tự Họ–Tên
   là lựa chọn phong cách nếu nhất quán và không làm mất thông tin.

## Quan sát

### 1. Lược bỏ và quy chiếu người

Quỹ Giao lưu Quốc tế Nhật Bản minh họa rằng câu Nhật có thể không hiện chủ ngữ hoặc tân ngữ, và
một câu đứng riêng còn mơ hồ về ai nghĩ hay ai hành động. Người đọc phải phục hồi thành phần bị
lược từ ngữ pháp và ngữ cảnh. Đây là rủi ro trực tiếp cho dịch theo câu hoặc theo đoạn không có phần
trước/sau.

Ở phía tiếng Việt, nghiên cứu trên 75 cặp `I–you` trong bản dịch văn học cho thấy dịch giả phải chọn
từ một hệ quy chiếu người rất rộng theo tình huống và quan hệ văn hóa, thay vì dùng một đại từ trung
tính. Kết quả B2a của Mira khớp với điều này: prompt sửa được `母様` thành “mẹ”, nhưng không thể biết
`おば様` phải là “mợ” khi quan hệ đó không có trong chương.

**Hệ quả cho Mira:** mỗi đoạn chấm cần ngữ cảnh chương; fixture cần ghi người nói, người nghe và
quan hệ tại thời điểm đó. Judge chỉ được chấm xưng hô khi có ma trận làm căn cứ.

### 2. Kính ngữ và ngôn ngữ vai

Cơ quan Văn hóa Nhật Bản mô tả kính ngữ là lựa chọn dựa trên quan hệ giữa người nói, người nghe và
người được nhắc tới; cùng một người có thể được “nâng” hoặc không tùy phía `uchi/soto` và tình huống.
Nghiên cứu về ngôn ngữ vai trong hư cấu cũng cho thấy đại từ, đuôi câu và kiểu nói góp phần khắc họa
nhân vật, nhưng ngôn ngữ đích không phải lúc nào cũng có dấu hiệu tương đương trực tiếp.

Do đó, luật “mọi `様` = ngài” hay “xóa mọi hậu tố Nhật” đều quá thô. Cần phân biệt:

| Hiện tượng nguồn | Thông tin cần giữ | Cách thể hiện tiếng Việt có thể dùng |
| --- | --- | --- |
| `さん/くん/ちゃん/様` | thân–sơ, trên–dưới, trìu mến, tôn kính | đại từ/vai, tên gọi, tiểu từ; hoặc giữ hậu tố nếu preset chọn |
| `先輩/先生/部長` | vai xã hội và cách người nói định vị đối phương | anh/chị khóa trên, thầy/cô, trưởng phòng; hoặc giữ từ Nhật đã quen |
| `ore/boku/watashi` | hình tượng người nói, giới/tuổi/ngữ vực được gợi ra | cặp xưng hô và giọng câu, không nhất thiết dịch thành một từ cố định |
| chuyển từ lịch sự sang suồng sã | thay đổi khoảng cách, cảm xúc hoặc quyền lực | đổi cặp xưng hô/nhịp câu có chủ ý, ghi theo mốc chương |

**Hệ quả cho Mira:** ma trận xưng hô phải có hiệu lực theo thời gian, không chỉ một cặp cố định cho
toàn truyện. Rubric cần phạt việc san phẳng giọng của các nhân vật dù câu vẫn “trôi chảy”.

### 3. Bản dịch người trong cộng đồng và sách phát hành

- Hướng dẫn dịch của cộng đồng khuyên đọc hết phần, đánh dấu chỗ mơ hồ, cung cấp cả đoạn cùng tính
  cách/tâm trạng nhân vật khi hỏi, rồi dịch kỹ và kiểm duyệt lại. Đây là bằng chứng quy trình, không
  phải chuẩn ngôn ngữ.
- Trang Hako có dự án thuộc mục Truyện dịch, ghi nhóm và tự mô tả dịch trực tiếp từ tiếng Nhật,
  giữ `「」『』` hoặc `-sama`. Đây mới là lời giới thiệu dự án; chưa đủ để chứng nhận toàn bộ chương
  do người dịch hoặc đánh giá chất lượng. Không đưa vào tập chuẩn chỉ dựa vào nhãn trên trang.
- Một dự án khác ghi rõ dịch giả, biên tập/hiệu đính và cố vấn; loại nguồn có chuỗi trách nhiệm rõ này
  được ưu tiên hơn trang không ghi nhân sự.
- Danh mục sách phát hành có trường dịch giả/hiệu đính, nhưng phần mô tả bán hàng có thể do biên tập
  hoặc marketing viết. Chỉ dùng mô tả để tìm tác phẩm; muốn học văn phong phải đọc mẫu toàn văn hợp
  pháp hoặc bản sách, không suy từ lời giới thiệu sản phẩm.

**Hệ quả cho Mira:** “fan-trans” và “bản phát hành” nên là hai tập bản dịch người, không phải hai nhãn
chất lượng. Không trộn bản AI vào corpus học. Mọi lựa chọn tranh cãi phải được đo bằng bản dịch mù
và có thể cấu hình theo tác phẩm.

### 4. Tên riêng và thuật ngữ văn hóa

Không nên gộp mọi chuỗi katakana vào một luật:

- **Tên người/địa danh Nhật:** cần một chuẩn romanization và thứ tự tên ở cấp tác phẩm; alias phục vụ
  tìm kiếm không nhất thiết là cách hiện trong bản dịch.
- **Tên phương Tây viết bằng katakana:** khôi phục spelling theo canon/bối cảnh rồi khóa trong
  glossary. Khi chưa biết, đánh dấu cần duyệt thay vì tự chọn lại mỗi chương.
- **Tên fantasy tự tạo:** không có “dạng gốc” chắc chắn; chọn một dạng ổn định, lưu nguồn quyết định
  và cho phép sửa hàng loạt.
- **Danh xưng có nghĩa:** phải quyết định đang là tên riêng, chức danh hay biệt hiệu trước khi dịch.
- **Chơi chữ trên chữ Hán/kana, ruby hoặc hai cách đọc:** giữ chức năng của chơi chữ; không mặc định
  xóa phần mặt chữ chỉ vì bộ kiểm thấy kana/Hán tự còn lại.

### 5. Nhịp văn và hình thức

Các yếu tố sau không nên bị coi là trang trí thuần túy:

- dấu lửng `……`, gạch kéo dài `――`, câu cụt và khoảng ngắt có thể mang nhịp hoặc sự do dự;
- dòng chỉ có ký hiệu và khoảng trắng toàn khổ có thể là ngắt cảnh;
- độc thoại, lời kể và lời thoại lồng nhau cần còn phân biệt;
- từ tượng thanh/tượng hình có thể dịch, chuyển thành miêu tả hoặc giữ có chủ ý, nhưng không được
  âm thầm bỏ;
- ghi chú của dịch giả là một chế độ biên tập riêng, không được model tự thêm vào thân truyện.

Không nên chấm “giữ nguyên dấu câu nguồn” là tốt. Cần chấm **chức năng** (câu hỏi, ngắt, chen lời,
thoại lồng) và chấm **tính nhất quán trình bày** riêng.

## Đề xuất rubric JA→VI cho Bộ đo

Đây là **đề xuất**, chưa thay spec hiện hành.

| Nhóm | Lỗi nặng | Lỗi nhẹ / cờ chẩn đoán |
| --- | --- | --- |
| Nghĩa và tác thể | sai ai làm gì với ai; sai phủ định; sót/thêm sự kiện; nhầm người nói | sắc thái thời–thể hoặc mức chắc chắn lệch nhỏ |
| Xưng hô và quan hệ | sai vai họ hàng/cấp bậc; đổi cặp vô cớ; bỏ mất bước chuyển quan hệ | lựa chọn hợp lý nhưng lệch preset đã duyệt |
| Giọng nhân vật | san phẳng đặc trưng làm nhầm nhân vật/thái độ; biến lịch sự thành thô lỗ | mức khẩu ngữ hoặc nhịp chưa thật khớp |
| Tên và thuật ngữ | đổi người/thực thể; spelling trôi; dịch sai chức danh thành tên | khác lựa chọn ưu tiên nhưng nằm trong alias cho phép |
| Tự nhiên tiếng Việt | câu khó hiểu, calque làm đổi nghĩa | gượng, lặp, từ đệm kiểu convert |
| Hình thức | mất thoại/độc thoại/ngắt cảnh; ngoặc lệch làm mơ hồ | khác kiểu ngoặc đã chọn; dấu câu chưa nhất quán |
| Hiệu ứng văn học | mất chơi chữ hay thông tin hai lớp quan trọng | hiệu ứng giảm nhưng nghĩa chính còn |

Không cộng tất cả thành một điểm duy nhất ở giai đoạn đầu. Báo riêng tỷ lệ lỗi nặng, lỗi nhẹ và tỷ lệ
thắng so cặp; kiểm tất định chỉ bắt phần có thể chứng minh bằng luật.

## Các chế độ kính ngữ theo lựa chọn người dịch

Phần này kết hợp quyết định sản phẩm ngày 2026-10-04 với các trường hợp cần kiểm. Bốn chế độ là
quy ước cấp tác phẩm; người dịch có thể đặt ngoại lệ hẹp cho nhân vật, quan hệ, thuật ngữ hoặc cảnh.

| Chế độ | Xử lý chính | Khi phù hợp | Điều Mira không được làm |
| --- | --- | --- | --- |
| **Giữ hậu tố Nhật — mặc định** | Giữ `A-san`, `A-chan`, `A-kun`, `A-sama` khi hậu tố gắn tên | Chưa có yêu cầu; truyện coi sắc thái Nhật là quan trọng; chưa đủ tuổi/vai để Việt hóa an toàn | Không thêm “anh/chị/cô” trước tên đã có hậu tố; không san phẳng các hậu tố khác nhau |
| **Việt hóa** | Chuyển chức năng sang anh/chị/em/cô/chú/bác, tên trống, vai hoặc tiểu từ Việt | Người dịch muốn văn bản thuần Việt và có đủ quan hệ, tuổi, hoàn cảnh | Không ánh xạ một-một `-san = chị`, `-kun = em`; không bịa tuổi hoặc giới |
| **Lai theo quy tắc** | Giữ một nhóm, Việt hóa nhóm khác theo bảng người dịch đặt | Muốn giữ dấu ấn Nhật nhưng Việt hóa chức danh hoặc trường hợp quen thuộc | Không tự pha theo từng câu; phải ghi rõ nhóm nào giữ, nhóm nào dịch |
| **Tùy chỉnh** | Quy tắc riêng theo hậu tố, nhân vật, cặp quan hệ hoặc bối cảnh | Tác phẩm có chơi chữ, biệt danh, thế giới riêng hoặc yêu cầu phát hành | Không biến ngoại lệ cục bộ thành luật toàn truyện |

### Phân loại trường hợp

1. **Hậu tố gắn với tên** (`田中さん`, `ミカちゃん`): đi theo chế độ đã chọn. Nếu chưa chọn,
   giữ `Tanaka-san`, `Mika-chan`.
2. **Chức danh hoặc vai đứng độc lập** (`先生`, `先輩`, `部長`): không tự động coi là hậu tố cần
   giữ. Dịch theo vai khi vai đã rõ (`bác sĩ`, `thầy/cô`, `trưởng phòng`), hoặc giữ từ Nhật nếu
   style guide yêu cầu và người đọc mục tiêu hiểu.
3. **Từ thân tộc dùng để gọi người nhà hoặc người ngoài**: ưu tiên quan hệ thực trong cảnh; không
   suy huyết thống chỉ từ cách gọi và không để preset hậu tố quyết định.
4. **Kính ngữ nằm trong động từ/cấu trúc câu**: hậu tố không mang hết độ lịch sự. Phải phản ánh bằng
   nhịp, từ tình thái, cách yêu cầu hoặc cặp xưng hô; giữ `-san` không miễn việc xử lý phần này.
5. **Đổi cách gọi có chủ ý**: `A-san → A`, `A-sama → A-san`, tên đầy đủ → tên riêng hoặc biệt danh
   là sự kiện quan hệ cần giữ. “Thống nhất” không được dùng để sửa ngược mọi biến đổi về một dạng.
6. **Thiếu dữ kiện tuổi, giới hoặc quan hệ**: với mặc định giữ hậu tố, giữ bề mặt nguồn và đánh dấu
   chỗ còn thiếu nếu đại từ Việt vẫn buộc phải chọn. Không đoán “chị” chỉ vì thấy `-san`.
7. **Nhắc tới người thứ ba**: xác định người được tôn kính là ai; không mặc định kính ngữ hướng vào
   người nghe. Đây là ca riêng với lời thoại trực tiếp.
8. **Chơi chữ hoặc phản ứng vào hậu tố**: giữ thông tin làm trò đùa/tình tiết hoạt động; có thể cần
   chú giải do người dịch quyết định, model không tự thêm chú thích vào thân truyện.

### “Thống nhất” được chấm thế nào

- Đúng: cùng loại tình huống tuân cùng quy tắc đã chọn; ngoại lệ có phạm vi; thay đổi từ nguồn được
  bảo toàn; tên và hậu tố không trôi chính tả.
- Không tự động là lỗi: hai nhân vật gọi cùng một người khác nhau; một nhân vật đổi cách gọi vì quan
  hệ thay đổi; lời kể và lời thoại dùng cách quy chiếu khác nhau.
- Lỗi hoặc cảnh báo mạnh: `chị A-san`; cùng một quan hệ lúc `A-san`, lúc `chị A` mà nguồn/ngữ cảnh
  không đổi và không có ngoại lệ; tự đổi chế độ giữa chương; xóa mất bước chuyển quan hệ.
- Nếu chưa có style guide, judge dùng mặc định **giữ hậu tố**. Nếu có style guide, lựa chọn đã duyệt
  thắng mặc định. Judge vẫn chấm đúng nghĩa quan hệ độc lập với việc tuân lựa chọn trình bày.

Đầu vào cộng đồng do chủ sản phẩm cung cấp ngày 2026-10-04 là một thảo luận không kèm URL: nhiều
người tham gia chấp nhận cả giữ hậu tố lẫn Việt hóa, nhưng lặp lại yêu cầu “thống nhất”; một số nêu
giữ hậu tố giúp tránh đoán tuổi/vai, số khác thấy Việt hóa tự nhiên hơn, và có ý kiến tránh dạng
“chị A-san”. Đây là **quan sát sở thích cộng đồng chưa xác minh**, không phải khảo sát đại diện,
không phải bản dịch người để học văn phong, và không tự chứng minh phương án nào chính xác hơn.

## Bổ sung fixture đề xuất

Bộ 5 chương `ja-irene` hiện đo tốt tên phương Tây, gia đình quý tộc và đổi điểm nhìn, nhưng chưa đủ
đại diện cho JA→VI. Đợt fixture Nhật tiếp theo nên có tối thiểu các lát cắt sau:

1. học đường Nhật hiện đại: `senpai`, tên/họ, đổi mức lịch sự;
2. gia đình: nhiều vai họ hàng và người nói bị lược;
3. fantasy không mang bối cảnh Trung Hoa: tên katakana, chức danh, thuật ngữ tự tạo;
4. nhân vật có ngôn ngữ vai rõ: `ore/boku/watashi`, đuôi câu hoặc khẩu khí đối lập;
5. chơi chữ/ruby/tượng thanh và lời thoại lồng;
6. một chương nhiều người cùng giới để kiểm quy chiếu người nói;
7. một đoạn có quan hệ thay đổi giữa hai mốc chương.

Mỗi lát cắt cần assertion về **ý nghĩa cụ thể**, không chỉ chuỗi bắt buộc. TALPCo là đầu mối dữ liệu
song song cần thẩm định riêng về miền và nguồn người dịch trước khi đưa vào fixture; không mặc định
là corpus văn học hay bản dịch chuẩn chỉ vì có giấy phép mở.

## Khảo sát repo Việt Nam và mẫu người dịch

Xem [khảo sát repo phục vụ Nhật → Việt](vietnamese-translation-repos.md): nguồn người dịch có
credit, cặp nguồn–đích và giới hạn; repo AI chỉ dùng tham khảo kỹ thuật. Đây là phần bổ sung có
định vị tệp/commit, không phải kết luận chất lượng của các công cụ.

## Việc cần kiểm chứng tiếp

- Lập mẫu 60–80 đoạn JA→VI có người chấm, phân tầng theo các lát cắt trên.
- So cặp ba chế độ giữ, Việt hóa và lai để đo hệ quả; mặc định sản phẩm đã chốt là giữ hậu tố, nhưng
  thí nghiệm vẫn cần tìm lỗi nghĩa và mức tự nhiên của từng chế độ.
- Đo riêng độ đúng tác thể/người nói và độ nhất quán xưng hô, thay vì gộp vào “nghĩa”.
- Kiểm kê có hệ thống tối thiểu 3 bản fan dịch **do người dịch, trực tiếp từ Nhật** và 3 bản phát hành
  có ghi dịch giả cùng mẫu toàn văn hợp pháp; hiện tại mới đủ để kết luận **có biến thiên**, chưa đủ
  để kết luận mặc định giữ hậu tố cho chất lượng tốt hơn các chế độ khác.
- Thử cho judge nhận hồ sơ nhân vật/người nói nhưng che mọi thông tin về model và preset; đo lại với
  người vì chưa có benchmark judge cho văn học tiếng Việt.

## Câu hỏi còn mở

1. Trong chế độ giữ hậu tố, mặc định cho `senpai/sensei` đứng độc lập là giữ hay dịch theo vai?
2. Thứ tự hiển thị tên Nhật là Họ–Tên hay Tên–Họ, và alias tìm kiếm được lưu ra sao?
3. Có cho phép đổi cặp xưng hô tự động khi quan hệ thay đổi, hay luôn tạo đề xuất để người duyệt?
4. Ruby và chơi chữ được biểu diễn thế nào trong editor/xuất Markdown?
5. Người dùng muốn giọng Việt đương đại đến đâu so với việc giữ dấu ấn Nhật?

Chưa câu nào ở trên là quyết định sản phẩm.

---

[Mục lục handbook](../README.md)
