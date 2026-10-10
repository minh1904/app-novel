# Cập nhật chương mới: đối thủ làm gì, Mira nên làm gì

Cập nhật: 2026-10-09 · Trạng thái: **Fact hiện trạng**, **quan sát có nguồn** và **đề xuất chưa chốt**;
chưa có quyết định về cách lấy chương. Phần pháp lý chỉ phục vụ đánh giá sản phẩm, không phải ý kiến luật.
Chủ trì: chủ sản phẩm.

## Câu hỏi chương này trả lời

Trang **Cập nhật** trên thanh bên ([tính năng toàn app](../workspace/app-level-features.md)) hiện là màn
minh hoạ: chương gốc mới của các truyện đang theo dõi, gom theo ngày, dịch ngay hoặc tải về. Muốn làm
thật thì Mira phải biết chương mới từ đâu ra. Chương này trả lời ba câu: các app khác phát hiện chương
mới ra sao; lấy raw có hợp pháp và làm được về kỹ thuật không; và Mira nên chọn cách nào.

Hai điểm cần nhớ từ trước:

- Phạm vi cũ ghi **crawler/uploader nền tảng là "hoãn, không phải không bao giờ làm"**
  ([scope.md ở `501be2a`](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/product/scope.md)).
- Khu vực **Nguồn** trong màn tác phẩm (mock) mang nghĩa **nhiều bản raw của cùng một truyện** (S3.1:
  nguồn chính, nguồn phụ để đối chiếu), không phải tải chương từ web. Hai nghĩa cần tách tên khi làm.

## Nguồn

Đọc ngày 2026-10-09. **[mã]** đọc mã nguồn; **[docs]** tài liệu chính thức; **[báo]** báo chí, văn bản
luật, bài phân tích; **[chưa kiểm]** chưa đọc được trang gốc.

| Nhóm | Nguồn |
| --- | --- |
| Mihon | [`SyncChaptersWithSource.kt`](https://raw.githubusercontent.com/mihonapp/mihon/main/app/src/main/java/eu/kanade/domain/chapter/interactor/SyncChaptersWithSource.kt), [`LibraryUpdateWorker.kt`](https://raw.githubusercontent.com/mihonapp/mihon/main/app/src/main/java/eu/kanade/tachiyomi/data/library/LibraryUpdateWorker.kt), [`LibraryUpdateNotifier.kt`](https://raw.githubusercontent.com/mihonapp/mihon/main/app/src/main/java/eu/kanade/tachiyomi/data/library/LibraryUpdateNotifier.kt), [`FetchInterval.kt`](https://raw.githubusercontent.com/mihonapp/mihon/main/domain/src/main/java/tachiyomi/domain/manga/interactor/FetchInterval.kt), [`UpdatesViewModel.kt`](https://raw.githubusercontent.com/mihonapp/mihon/main/app/src/main/java/eu/kanade/tachiyomi/ui/updates/UpdatesViewModel.kt) [mã]; [smart update](https://mihon.app/docs/faq/updates/smart), [extensions](https://mihon.app/docs/faq/browse/extensions) [docs] |
| Legado (阅读) | Repo gốc [`gedoor/legado`](https://raw.githubusercontent.com/gedoor/legado/main/README.md) đã bị xoá mã; đọc qua [bản mirror](https://gitea.com/wys1310/legado), [`ruleHelp.md`](https://gitea.com/wys1310/legado/raw/branch/master/app/src/main/assets/web/help/md/ruleHelp.md) [mã] |
| LNReader, Kotatsu | [`updates/index.ts`](https://raw.githubusercontent.com/lnreader/lnreader/master/src/services/updates/index.ts), [lnreader-plugins](https://github.com/lnreader/lnreader-plugins) [mã]; [`TrackWorker.kt`](https://cdn.jsdelivr.net/gh/kotatsuapp/kotatsu@devel/app/src/main/kotlin/org/koitharu/kotatsu/tracker/work/TrackWorker.kt), [README Kotatsu](https://cdn.jsdelivr.net/gh/kotatsuapp/kotatsu@devel/README.md) [mã] |
| lncrawl, FanFicFare, Readwise | [README lncrawl](https://raw.githubusercontent.com/lncrawl/lightnovel-crawler/dev/README.md), [chế độ cập nhật FanFicFare](https://github.com/JimmXinu/FanFicFare/wiki/UpdateModes), [Reader feed](https://docs.readwise.io/reader/docs/faqs/feed) [docs] |
| Nền tảng raw | [API Syosetu](https://dev.syosetu.com/man/api/) và [guideline](https://dev.syosetu.com/site/guideline) [docs]; [ToS Kakuyomu](https://kakuyomu.jp/legal/tos); RSS Royal Road `/fiction/syndication/<fiction-id>` [chưa kiểm ToS]; 字体反爬 của 起点: [fishc](https://fishc.com.cn/archiver/tid-185495.html), [Tencent Cloud](https://cloud.tencent.com/developer/news/622804) [báo] |
| Pháp lý | Luật SHTT sửa đổi 2022 ([bản tiếng Anh](https://thuvienphapluat.vn/van-ban/EN/So-huu-tri-tue/Law-07-2022-QH15-amendments-to-some-Articles-of-Law-Intellectual-Property/531773/tieng-anh.aspx)), [Berne](https://tapchitoaan.vn/index.php/cong-uoc-berne-va-su-tuong-thich-voi-luat-so-huu-tri-tue-viet-nam), [ngoại lệ Điều 25](https://lsvn.vn/bo-sung-cac-truong-hop-ngoai-le-khong-xam-pham-quyen-tac-gia1657018953-a120831.html); Tachiyomi: [TorrentFreak](https://torrentfreak.com/tachiyomi-manga-reader-how-threats-can-motivate-pirates-boost-engagement-240113/), [Anime Corner](https://animecorner.me/tachiyomi-team-stops-app-development-after-cease-and-desist-by-kakao-entertainment/); vụ 书源 ở 闵行: [澎湃](https://www.thepaper.cn/newsDetail_forward_32966194); crawler và Điều 285 BLHS Trung Quốc: [secrss](https://www.secrss.com/articles/7518), [allbrightlaw](https://www.allbrightlaw.com/CN/10475/3a742750e4a53fcc.aspx); Yuewen kiện: [chinawriter 2021](https://www.chinawriter.com.cn/n1/2021/0415/c404023-32078978.html), [2023](https://www.chinawriter.com.cn/n1/2023/0617/c404023-40016017.html); JJWXC kiện 番茄: [ithome](https://www.ithome.com/0/984/270.htm) [báo] |

## 1. Các app phát hiện chương mới ra sao (quan sát)

| App | Khoá nhận diện chương | Phát hiện | Lịch | Hiển thị |
| --- | --- | --- | --- | --- |
| **Mihon** [mã] | URL | URL mới là chương mới; URL cũ mà tên, số chương hay ngày khác thì cập nhật; có trong DB mà mất trên nguồn là bị gỡ; gỡ rồi xuất hiện lại thì khôi phục trạng thái và giữ ngày cũ để không lọt vào feed | Chu kỳ N giờ; bỏ qua truyện đã hoàn thành, còn chương chưa đọc, chưa bắt đầu; "smart interval" = trung vị khoảng cách 10 chương gần nhất, kẹp 1–28 ngày; song song 5, cùng nguồn chạy tuần tự | Tab Updates gom theo ngày, giữ 3 tháng; lọc; chọn hàng loạt; kéo để làm mới; một thông báo mỗi truyện; tệp log lỗi nhóm theo lỗi → nguồn → truyện |
| **Legado** [mã] | URL (chỉ mục phụ theo thứ tự) | So mục lục; badge `lastCheckCount` = số chương mới lần gần nhất | Bật/tắt theo dõi từng sách; pool luồng, hàng chờ, đếm số sách đang chờ; tải trước N chương | Nhãn lỗi theo nguồn ("目录失效", "正文失效") gắn vào nhóm để lọc; "换源" tìm cùng tên sách ở nguồn khác |
| **LNReader** [mã] | `path` | `path` mới là chương mới | Bỏ qua như Mihon; tối đa 3 nguồn song song, nghỉ 1 giây giữa các truyện | Lỗi là toast, không dừng cả lượt |
| **Kotatsu** [mã] | — | — | Chu kỳ 2–18 giờ theo số truyện; mỗi lượt 46 truyện xoay vòng; song song 6 | Lỗi Cloudflare chuyển sang bước giải captcha |
| **FanFicFare** [docs] | Số thứ tự | So **số lượng** chương, chỉ tải phần dư; không thấy chương bị sửa | Theo lệnh | Tuỳ chọn tải lại X chương cuối để bắt bản sửa, giữ chương đã bị gỡ, gắn "(new)" vào tiêu đề |
| **Readwise Reader** [docs] | — | — | Khoảng 5 phút; feed ít người theo dõi chỉ kiểm khi mở app | Tách "đã xem" khỏi "đã xử lý"; "đánh dấu mọi mục phía trên đã xem" |
| **lncrawl** [docs] | Meta JSON [chưa kiểm khoá] | `--resume` chỉ tải chương chưa có | Theo lệnh | ~361 nguồn, mỗi nguồn một tệp Python |

Công cụ dịch (LinguaGacha nhập lại "kế thừa bản dịch", AiNiee "xuất văn bản tăng dần", Tiên Dịch,
sangtacviet "Dịch trang web"): **chưa tìm được tài liệu về cơ chế** [chưa kiểm].

**Quan sát trong mẫu đã kiểm:** Mihon dùng URL chương để loại trùng và đồng bộ; LNReader dùng `path`;
FanFicFare ở chế độ mặc định chủ yếu so số lượng chương. Chưa đủ bằng chứng để khái quát mọi app crawler
đều dùng URL làm khóa. Các luồng đã khảo sát tập trung vào danh sách/metadata chương; nghiên cứu chưa
tìm thấy cơ chế lưu hash nội dung để cảnh báo raw đã dịch bị sửa. Với Mira đó là trường hợp quan trọng.

## 2. Raw nằm ở đâu và lấy được không (quan sát)

- **Nền tảng Trung Quốc chính thống** (起点, 晋江, 番茄, 纵横, 17K, 刺猬猫): vài chương đầu miễn phí, phần
  còn lại VIP phải đăng nhập và trả tiền. Không có API hay RSS công khai. 起点 dùng **字体反爬** (font tuỳ
  biến, mã ký tự trong HTML khác chữ hiện ra, đổi theo trang); 番茄 mã hoá chữ trên web, nội dung đủ nằm
  trong app; 晋江 có chế độ chống trộm do tác giả bật. Các nguồn thứ cấp ghi nhận tranh chấp và hoạt động
  bảo vệ quyền của Yuewen; JJWXC công khai cáo buộc Fanqie và nói đã khởi động thủ tục bảo vệ quyền,
  nhưng nguồn đã đọc chưa chứng minh đã nộp đơn kiện. Điều khoản cấm crawler chưa được kiểm nguyên văn.
- **Nhật:** Syosetu có API metadata chính thức nhưng không trả nội dung chương. Guideline giới hạn mục
  đích sử dụng, yêu cầu tài khoản và cấm lấy tự động dữ liệu API không cung cấp; adapter chỉ khả thi sau
  khi xác định cách Mira được phân phối. Chưa tìm thấy API công khai của Kakuyomu; ToS không đủ để kết
  luận mọi hình thức kiểm cập nhật tự động đều bị cấm.
- **Anh:** Royal Road có RSS tại `/fiction/syndication/<fiction-id>`, gồm tiêu đề, URL, GUID và thời gian;
  chưa kiểm chứng riêng điều khoản dùng feed trong sản phẩm bên thứ ba.
- **Trang mirror lậu** (69书吧, uukanshu, họ 笔趣阁): gom cả chương VIP, HTML đơn giản, nên người dịch
  hay dùng; đổi tên miền liên tục, nhiều quảng cáo xấu và redirect, nội dung có thể bị cắt hay chèn rác.
  Hệ sinh thái convert ở Việt Nam có dùng raw từ các trang này hoặc qua các dịch vụ trung gian; nghiên
  cứu chưa đo được tỷ lệ. Một tính năng cho người dùng tự cấu hình nguồn có nguy cơ bị trỏ vào nguồn lậu.

## 3. Pháp lý (quan sát, không phải tư vấn luật)

- **Việt Nam:** luật xem bản dịch là tác phẩm phái sinh và quyền làm tác phẩm phái sinh thuộc nhóm quyền
  tài sản. Việc tạo hoặc phổ biến bản dịch của tác phẩm còn được bảo hộ thường cần sự cho phép, trừ ngoại
  lệ hoặc giấy phép áp dụng cho trường hợp cụ thể. Không thu tiền hay chỉ dùng cá nhân không tự động hợp
  pháp hóa nguồn raw, hành vi truy cập hoặc bản dịch.
- **Trung Quốc:** các nguồn đã đọc cho thấy một số trường hợp vượt biện pháp bảo vệ, truy cập trái phép
  và đủ mức độ nghiêm trọng có thể bị xử lý theo Điều 285. Chúng không chứng minh mọi đổi IP, giả UA hoặc
  giải font đều mặc nhiên phạm tội; phải đánh giá hành vi và nguồn cụ thể.
- **Bên làm công cụ:**
  - Tachiyomi dừng ngày 13/01/2024 sau thư của Kakao Entertainment; bị nhắm là **danh sách nguồn đi kèm**.
  - Kotatsu cũng đã ngừng vì sức ép từ Kakao và chính sách sideload của Google.
  - Repo Legado chỉ còn README thừa nhận hành vi xâm phạm và dẫn thông báo của 阅文. Vụ 闵行 nói về app
    ẩn danh dùng tệp 书源 và cộng đồng phân phối rule; nguồn không định danh đó là Legado.
  - Mihon, LNReader **không kèm nguồn nào**, người dùng tự thêm repo. Cách tách engine khỏi nguồn có thể
    giảm nhưng không xóa rủi ro; nghiên cứu chưa có căn cứ nối vụ app ẩn danh ở trên với Legado.

## 4. Ràng buộc kỹ thuật (quan sát)

- `fetch`/`net.request` trong main bị Cloudflare chặn; một `WebContentsView` ẩn chạy được JS challenge,
  captcha thì phải hiện cho người dùng giải. Chủ động giả fingerprint chính là hành vi bị coi là cố ý.
- Nhiều trang Trung Quốc dùng **GBK/GB18030**; phải đọc charset, không mặc định UTF-8.
- Ít trang trả `ETag`/`Last-Modified`; phải tự băm mục lục.
- Mục lục có **chương thông báo** (请假条 xin nghỉ, 上架感言 cảm nghĩ lên kệ) trông như chương mới, không
  nên đưa vào hàng dịch.
- Selector và cách chống crawl đổi thường xuyên; Mihon, Legado cần cả cộng đồng để giữ nguồn chạy được.
- Kho chương của Mira còn lưu nội dung nguồn/bản dịch, revision, thời gian và cờ có nội dung; phần thiếu
  cho module này là danh tính nguồn, URL/ID chương ở nguồn, hash raw, lần kiểm và trạng thái phát hiện/gỡ.
  Nhập `.txt` chia chương cho cả tác phẩm vẫn là mock (`MOCK_FEATURES.importTxt`).

## 5. Năm cách làm, từ ít rủi ro tới nhiều (đề xuất)

| # | Cách | Trang Cập nhật làm được gì | Phơi nhiễm pháp lý/vận hành tương đối — giả thuyết cần tư vấn | Công bảo trì |
| --- | --- | --- | --- | --- |
| **A** | **Không lấy từ mạng: nhập lại .txt hoặc dán, có so khác** | Người dùng nhập lại tệp đã tải bằng công cụ khác; Mira tách chương, so với bản đã có, báo "12 mới, 2 raw đã sửa, 1 bị gỡ". Thêm **thư mục theo dõi**: tệp trong thư mục đổi thì tự so | Thấp hơn vì Mira không tự truy cập nguồn; không loại bỏ trách nhiệm với tệp nhập | Thấp; bộ tách chương và so khác dùng lại cho mọi cách khác |
| **B** | **Trình duyệt trong app, người dùng tự lấy trang** | Lưu URL mục lục của truyện, mở trong `WebContentsView`; người dùng thấy chương mới, bấm "Lấy chương này" (trích nội dung kiểu reader mode). Mỗi lần lấy do người dùng bấm. Chữ bị làm rối font thì báo "không đọc được", không giải mã | Phải kiểm ToS, bản quyền và biện pháp kỹ thuật từng trang; thao tác do người dùng bấm không tự tạo ngoại lệ | Thấp–vừa: webview, trích nội dung chính, tách tiêu đề; không cần luật riêng từng trang |
| **C** | **Chỉ API/RSS chính thức** (Syosetu, Royal Road) | Tự **phát hiện** chương mới; khả năng lấy nội dung tùy feed/API | Phụ thuộc giấy phép/guideline; “chính thức” không đồng nghĩa dùng được cho mọi sản phẩm | Thấp, nhưng **không phủ nguồn tiếng Trung**, tức phần lớn công việc |
| **D** | **Luật nguồn do người dùng nhập** (kiểu 书源), Mira không kèm luật nào | Kiểm mục lục theo lịch, tự tải chương, tự xếp hàng dịch | Phơi nhiễm cao hơn A–C vì hệ rule có thể được dùng với nguồn lậu và phải chạy code/cấu hình bên thứ ba; cần tư vấn và threat model riêng | Cao: ngôn ngữ luật, sandbox JS, Cloudflare, encoding, lịch và chẩn đoán nguồn hỏng |
| **E** | **Kèm sẵn scraper cho từng trang** | Tự động với trang được hỗ trợ | Mira trực tiếp chọn và duy trì nguồn; mỗi adapter phải được đánh giá theo ToS, giấy phép nội dung và biện pháp truy cập, không suy rằng mọi trang đều hợp pháp hoặc đều phạm luật | Rất cao và liên tục |

**Đề xuất của nghiên cứu này, chưa phải quyết định:** làm **A trước, rồi B**, thêm **C** như adapter nhỏ.
Để **D** ở trạng thái hoãn với ba điều kiện: không kèm luật/kho luật mặc định, không giải mã chống crawl,
không giả fingerprint. **Loại E.** Không phương án nào tự bảo đảm tuân thủ; nguồn dữ liệu, ToS, biện pháp
truy cập, giấy phép tác phẩm và cách sử dụng bản dịch phải được đánh giá riêng.

## 6. Bộ so khác dùng chung (đề xuất)

Mọi cách ở phần 5 đều cần cùng một bộ máy: nhận danh sách chương mới từ một nguồn bất kỳ (tệp, trang,
API) rồi so với chương đã có.

**Khoá nhận diện theo tầng** (vì A không có URL):

1. `sourceKey` khi có: URL chương (B, C) hoặc ID do nguồn cấp.
2. Không có thì: tiêu đề đã chuẩn hoá cộng số chương nhận ra từ tiêu đề ("第123章", "Chương 123").
3. Cuối cùng mới là vị trí.

Lưu thêm **băm nội dung raw** (sau khi chuẩn hoá khoảng trắng) để biết raw bị sửa.

| Loại | Nhận ra bằng | Mira làm gì |
| --- | --- | --- |
| **Mới** | Khoá chưa có | Thêm chương, chưa dịch; vào trang Cập nhật |
| **Đổi tiêu đề** | Khoá có, tiêu đề khác | Cập nhật tiêu đề, không đụng bản dịch |
| **Raw đã sửa** | Khoá có, băm khác | **Không ghi đè bản dịch**: gắn cờ, cho xem khác biệt raw cũ/mới, nút "Dịch lại đoạn đổi". Đây là điểm khác biệt của Mira so với app đọc truyện |
| **Bị gỡ khỏi nguồn** | Có ở Mira, không còn ở nguồn | Giữ chương và bản dịch, chỉ đánh dấu |
| **Xuất hiện lại** | Khoá từng bị gỡ quay lại | Bỏ dấu gỡ, giữ ngày phát hiện cũ để không nổi lên như chương mới |
| **Chương thông báo** | Tiêu đề khớp mẫu 请假 / 感言 / 公告 | Đánh dấu "không dịch", không xếp hàng |

## 7. Trang Cập nhật khi làm thật (đề xuất)

Thứ tự theo giá trị; mỗi dòng ghi cách nào ở phần 5 làm được.

| # | Tính năng | Có ở | Cách |
| --- | --- | --- | --- |
| 1 | Danh sách chương mới gom theo ngày phát hiện, giữ 3 tháng | Mihon | A–D |
| 2 | Số chương mới lần gần nhất trên từng truyện, cũng hiện ở thẻ Thư viện | Legado | A–D |
| 3 | Chọn tất cả, đảo chọn, chọn dải → "Xếp N chương vào hàng dịch" | Mihon | A–D |
| 4 | Nhãn **Raw đã sửa** kèm khác biệt và "Dịch lại đoạn đổi" | (riêng Mira) | A–D |
| 5 | Nhãn **Bị gỡ khỏi nguồn**, giữ bản dịch | FanFicFare, Mihon | A–D |
| 6 | Tách "đã xem" khỏi "đã xếp hàng" và "đã dịch"; "Đánh dấu tất cả đã xem" | Readwise, Mihon | A–D |
| 7 | Lọc: chưa xem, chưa dịch, đã xếp hàng, theo tác phẩm | Mihon | A–D |
| 8 | Màn xem trước khi nhập lại: "12 mới, 2 sửa, 1 gỡ", bỏ chọn từng chương | — | A |
| 9 | Thư mục theo dõi cho từng tác phẩm | — | A |
| 10 | "Kiểm lần cuối …" và "Kiểm ngay", tiến độ có nút huỷ | Mihon, Legado | B–D |
| 11 | Bật/tắt theo dõi từng truyện; bỏ qua truyện đã xong hoặc còn nhiều chương chưa dịch, **ghi lý do bỏ qua** | Legado, Mihon | C–D |
| 12 | Chu kỳ dự đoán từng truyện (trung vị khoảng cách, 1–28 ngày), cho tự đặt | Mihon | C–D |
| 13 | Tự xếp hàng dịch chương mới cho truyện chọn, **có trần N chương mỗi lượt** để không đốt chi phí AI | Mihon, Legado | C–D |
| 14 | Lỗi theo nguồn: ổn / lỗi tạm / hỏng; log nhóm theo lỗi → nguồn → truyện, nút thử lại | Mihon, Legado | B–D |
| 15 | Một thông báo Windows gộp mỗi lượt ("3 truyện, 12 chương mới"), tuỳ chọn ẩn tên truyện | Mihon | C–D |

Màn minh hoạ hiện tại ([`UpdatesScreenMock`](../../../src/renderer/src/features/updates/UpdatesScreenMock.tsx))
thể hiện tự kiểm theo lịch và có thể tải/dịch chương từ website. UI không cho biết nguồn do Mira kèm sẵn
hay do người dùng cấu hình, nên chưa thể phân loại chắc chắn là D hay E. Đây là concept cũ, không phải
target đã chốt. Nếu chọn A/B/C, cần OpenSpec riêng rồi mới sửa mock và data model.

## 8. Nhật ký quyết định

- **Đã chốt:** giữ tạm trang Cập nhật trên thanh bên dưới dạng màn “Sắp có”.
- **Chưa chốt:** A/B/C/D/E; tên “Nguồn” và “Bản raw”; trang Cập nhật có tồn tại nếu chỉ hỗ trợ nhập tệp;
  cách xử lý raw đã sửa.
- **Không được suy từ mock:** nguồn được hỗ trợ, chu kỳ sáu giờ, tự tải, tự dịch hoặc cơ chế sửa nguồn.

## 9. Câu hỏi cho chủ sản phẩm

1. Chọn hướng nào ở phần 5? Nghiên cứu đề xuất A → B → C, hoãn D, loại E.
2. Tách tên hai khái niệm: khu vực **Nguồn** của tác phẩm (nhiều bản raw, S3.1) và **nơi lấy chương**
   (tệp, URL). Gợi ý: giữ "Nguồn" cho nơi lấy chương, đổi S3.1 thành "Bản raw".
3. Khi raw của chương đã dịch bị sửa: chỉ gắn cờ và để người dùng quyết, hay tự tạo đề xuất dịch lại các
   đoạn đổi (đi qua luồng duyệt đề xuất sẵn có)?
4. Trang Cập nhật có ở lại thanh bên nếu chỉ làm A (không có lịch kiểm tự động), hay gộp vào Thư viện
   thành bộ lọc "Có chương mới"?

---

[Nguồn và cập nhật](README.md) · [Tính năng toàn app](../workspace/app-level-features.md) ·
[Mục lục module](../README.md)
