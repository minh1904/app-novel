# Repo crawler novel Nhật, Hàn và Trung: cơ chế thực tế

Cập nhật: 2026-10-10 · Trạng thái: **Quan sát mã nguồn** và **đề xuất chưa chốt**. Chưa chạy crawler
trên website thật, chưa đăng nhập tài khoản và chưa kiểm chứng điều khoản cho từng cách truy cập. Việc
một repo công khai làm được điều gì không chứng minh Mira được phép làm điều đó.

## Câu hỏi chương này trả lời

Các downloader, reader và framework nguồn đang lấy mục lục, nội dung và cập nhật chương ra sao? Mẫu
kiến trúc nào phù hợp với Mira, và phần nào chỉ nên ghi nhận vì dễ vỡ hoặc phụ thuộc kiểm soát truy cập?

Khảo sát đọc README và mã adapter tại các repo được dẫn bên dưới. Repo chỉ có frontend hoặc chỉ tải
metadata không được dùng làm bằng chứng cho khả năng lấy nội dung.

## 1. Nhật Bản

### `whiteleaf7/narou`: hệ quản lý và cập nhật đầy đủ nhất

[`whiteleaf7/narou`](https://github.com/whiteleaf7/narou) hỗ trợ Narou/Syosetu, Kakuyomu và Hameln qua
các tệp định nghĩa site. Mỗi tác phẩm có database và `toc.yaml`; mỗi chương giữ index, URL, tiêu đề,
ngày đăng và ngày sửa.

Luồng cập nhật tải lại mục lục rồi ghép chương. Chương được lấy lại khi mới xuất hiện, metadata đổi,
file cục bộ thiếu hoặc timestamp sửa thay đổi. Khi mục lục co lại hay đảo thứ tự, công cụ hỏi người dùng
thay vì tự xóa. Lệnh clean riêng mới dọn file mồ côi. Đây là mẫu gần nhất với yêu cầu “không đồng bộ
phá hủy” của Mira.

Giới hạn: một số adapter dùng index thứ tự làm định danh; timestamp do website cấp có thể không đổi khi
thân bài đổi. Repo không tự lập lịch; `update` vẫn là lệnh do người dùng hoặc công cụ ngoài gọi.

Mã liên quan:

- [`lib/downloader.rb`](https://github.com/whiteleaf7/narou/blob/27fb741fd561e2f26aba9fdf9d9b7b4384792be4/lib/downloader.rb)
- [`lib/command/update.rb`](https://github.com/whiteleaf7/narou/blob/27fb741fd561e2f26aba9fdf9d9b7b4384792be4/lib/command/update.rb)
- [`lib/command/clean.rb`](https://github.com/whiteleaf7/narou/blob/27fb741fd561e2f26aba9fdf9d9b7b4384792be4/lib/command/clean.rb)
- [định nghĩa Syosetu](https://github.com/whiteleaf7/narou/blob/develop/webnovel/ncode.syosetu.com.yaml),
  [Kakuyomu](https://github.com/whiteleaf7/narou/blob/develop/webnovel/kakuyomu.jp.yaml),
  [Hameln](https://github.com/whiteleaf7/narou/blob/develop/webnovel/syosetu.org.yaml)

### Downloader Nhật khác

| Repo | Cơ chế đáng chú ý | Cập nhật và giới hạn |
| --- | --- | --- |
| [`kanasimi/work_crawler`](https://github.com/kanasimi/work_crawler) | Adapter JavaScript cho Syosetu, Kakuyomu, Hameln, Alphapolis; phần lõi dùng chung lo tải, cache và EPUB | Có cache và tiếp tục công việc; adapter Alphapolis chủ động nghỉ lâu vì từng gặp trang rỗng. Kiến trúc adapter rộng, nhưng API lõi lớn và JavaScript chạy cùng quyền host |
| [`safirex/WNovelArchiver`](https://github.com/safirex/WNovelArchiver) | Adapter Python cho Syosetu/Kakuyomu; lưu archive cục bộ rồi cập nhật | So mục lục online với archive và thêm chương thiếu; có chế độ cập nhật toàn bộ. Không thấy hash raw đủ mạnh để phát hiện mọi sửa đổi |
| [`minouejapan/alphapolis-downloader2`](https://github.com/minouejapan/alphapolis-downloader2) | Downloader Alphapolis đang được bảo trì; retry nhiều tầng, nghỉ sau mỗi 20 trang, xuất Aozora Bunko | Có thể bắt đầu từ một chương chỉ định nhưng không có database diff đầy đủ; README nói rõ không tải tác phẩm thuê/trả phí |
| [`ttk1/nepub`](https://github.com/ttk1/nepub) | Narou/Kakuyomu → EPUB; nhúng metadata và episode trong EPUB | Đọc EPUB cũ, giữ episode không đổi và chỉ lấy episode mới/đã sửa theo `updated_at`; không xử lý tốt chương bị xóa nếu nguồn không báo rõ |
| [`porinkey/narou_rust`](https://github.com/porinkey/narou_rust) | Database YAML, tải/cập nhật/sửa chữa/chuyển EPUB; Kakuyomu dùng episode ID | ID ổn định hơn ordinal, nhưng Kakuyomu đang dùng ngày đăng cho cả ngày sửa nên có thể bỏ sót sửa thân bài |
| [`alpenmilch411/syosetsu-downloader`](https://github.com/alpenmilch411/syosetsu-downloader) | Store theo N-code, `meta.json` và file từng chương; ghi atomically | Mặc định chỉ lấy chương thiếu; refresh chương cũ là lựa chọn riêng. Đây là resume tốt nhưng cần hash để nhận ra raw sửa |
| [`XHLin-gamer/kakuyomub`](https://github.com/XHLin-gamer/kakuyomub) | Dùng episode ID và tải song song rồi đóng EPUB | Downloader một lượt, không có store bền để cập nhật hoặc tombstone |

### Framework đa nguồn có adapter Nhật

- [`lncrawl/lightnovel-crawler`](https://github.com/lncrawl/lightnovel-crawler) có lớp crawler typed, adapter
  theo domain, queue/concurrency ở lõi, resume và nhiều output. Phần server giữ chapter trong database và
  ghép bằng URL/ID; phù hợp nhất để học backend đa nguồn.
- [`LNReader/lnreader-plugins`](https://github.com/LNReader/lnreader-plugins) dùng contract TypeScript nhỏ
  (`parseNovel`, `parseChapter`, tìm kiếm và phân trang). Kakuyomu đọc state JSON nhúng; Syosetu đọc HTML
  và mục lục nhiều trang. Bộ `check:plugin` kiểm tra live site và phân biệt pass/fail/inconclusive.
- [`dteviot/WebToEpub`](https://github.com/dteviot/WebToEpub) có pipeline tốt cho mục lục nhiều trang,
  chương nhiều trang, làm sạch DOM, ảnh và EPUB. Parser nằm trong cùng extension nên cập nhật một nguồn
  vẫn phải phát hành extension.
- [`Shosetsu`](https://gitlab.com/shosetsuorg/extensions) phân phối extension Lua độc lập và có network
  policy ở host. Lua tải ngoài vẫn cần chuỗi tin cậy và sandbox nếu áp dụng vào Mira.

## 2. Hàn Quốc

### Novelpia Hàn Quốc

[`SpazzTL/NovelpiaDownloader`](https://github.com/SpazzTL/NovelpiaDownloader) đọc metadata từ trang tác
phẩm, gọi endpoint phân trang cho mục lục và dùng chapter ID từ bookmark. Nội dung đến từ endpoint viewer
JSON. Request dùng cookie phiên `LOGINKEY`; chương yêu cầu đăng nhập, xác minh tuổi hoặc quyền mua được
nhận ra khi endpoint từ chối.

Repo có retry, khoảng nghỉ và giới hạn luồng nhưng không cập nhật gia tăng thật: mỗi lượt dựng lại thư
mục làm việc. Bài học cho Mira là giữ chapter ID làm khóa và phân loại riêng `login_required`,
`age_verification`, `not_entitled` và lỗi tạm thời; không coi tất cả là lỗi mạng.

Mã liên quan:

- [`MainWin.Download.cs`](https://github.com/SpazzTL/NovelpiaDownloader/blob/master/MainWin.Download.cs)
- [`MainWin.Helpers.cs`](https://github.com/SpazzTL/NovelpiaDownloader/blob/master/MainWin.Helpers.cs)

### Novelpia Global

[`mbayue/pia-scrap`](https://github.com/mbayue/pia-scrap) là mẫu incremental hoàn chỉnh nhất trong nhóm
Hàn. Nó tách hai bước:

1. đồng bộ metadata và mục lục theo `episode_no`;
2. xin ticket ngắn hạn rồi lấy nội dung chương.

Cache lưu riêng từng `episode_no`; update chỉ tải chương thiếu, commit ngay sau mỗi chương và giữ
`failed_chapters.jsonl` để retry. Khi URL/ticket nội dung hết hạn, công cụ xin ticket mới thay vì dùng URL
đó làm định danh. Trạng thái premium và quảng cáo được phân biệt bằng mã API.

Mira nên học cách tách catalog khỏi content, cache atomically và coi signed URL/ticket là capability tạm,
không phải khóa chương. Mira không nên tự mô phỏng xem quảng cáo hoặc mua quyền; adapter chỉ nên trả
trạng thái truy cập cho UI.

Mã liên quan:

- [`src/api/client.py`](https://github.com/mbayue/pia-scrap/blob/master/src/api/client.py)
- [`src/chapter_cache.py`](https://github.com/mbayue/pia-scrap/blob/master/src/chapter_cache.py)
- [`src/chapter_pipeline.py`](https://github.com/mbayue/pia-scrap/blob/master/src/chapter_pipeline.py)

### Các nguồn Hàn khác

| Repo | Quan sát | Giá trị đối với Mira |
| --- | --- | --- |
| [`Kamikadashi/joara_scraper`](https://github.com/Kamikadashi/joara_scraper) | Puppeteer, auto-scroll mục lục, mở browser cho người dùng xử lý CAPTCHA, nghỉ giữa chương | Cho thấy Joara có thể cần browser adapter; CAPTCHA phải thành trạng thái chờ người dùng, không retry vô hạn |
| [`software-engineer-mj/novel-crawler`](https://github.com/software-engineer-mj/novel-crawler) | Selenium cũ chỉ lấy truyện/chương mới nhất từ Munpia miễn phí | Selector và API quá cũ; không đủ làm adapter production |
| [`apersomany/kpapi`](https://github.com/apersomany/kpapi) | API KakaoPage cũ, token/ticket và resource dạng ảnh | Repo đã archive và tự nhận lỗi thời; nguồn ticket/DRM chỉ nên hỗ trợ metadata hoặc viewer chính thức nếu không có API được phép |
| [`nykrphguy123/WebNovelScraper`](https://github.com/nykrphguy123/WebNovelScraper) | Naver Web Novel `.nhn` cũ, không phải Naver Series | Chỉ có giá trị lịch sử; chưa tìm được downloader Naver Series novel hiện đại đáng tin cậy |

## 3. Trung Quốc

### `404-novel-project/novel-downloader`: adapter rộng nhất

[`404-novel-project/novel-downloader`](https://github.com/404-novel-project/novel-downloader) tách
`bookParse()` và `chapterParse()`; base class giữ charset, concurrency, delay, retry, ảnh và hook. Router
chọn adapter theo hostname. Đây là mẫu rõ nhất về adapter theo nguồn, nhưng công cụ chủ yếu dựng snapshot
và tải toàn bộ, chưa có engine đồng bộ bền qua nhiều lần chạy.

Các adapter cho thấy độ khác nhau giữa nguồn:

| Nguồn | Quan sát từ adapter |
| --- | --- |
| Qidian | Mục lục theo volume; đánh dấu VIP/đã mua; nội dung public từ HTML, phiên được phép đọc có thể cần trang render và xử lý font/pseudo-element; concurrency 1 |
| JJWXC | `GB18030`; cookie hoặc token phiên do người dùng cung cấp; chương khóa/VIP không có quyền bị bỏ qua; nội dung có thể đến từ API hoặc trang render |
| Fanqie | Mục lục theo volume; nội dung trang render; font-map phụ thuộc font ID và dễ vỡ khi nguồn đổi font |
| Zongheng | API mục lục có book/chapter ID, giá và trạng thái; đường VIP chưa hoàn chỉnh |
| 17K | Public HTML; nhận biết VIP nhưng login/purchase còn TODO |
| Ciweimao | API mục lục; nội dung dùng access key/payload; chương có quyền có thể được lưu dạng ảnh; concurrency 1 |

Mã contract và adapter:

- [`src/rules.ts`](https://github.com/404-novel-project/novel-downloader/blob/20c7b2d0d3acff1669f43d5dc48b6dc1689e1b6e/src/rules.ts)
- [Qidian](https://github.com/404-novel-project/novel-downloader/blob/20c7b2d0d3acff1669f43d5dc48b6dc1689e1b6e/src/rules/special/original/qidian.ts)
- [JJWXC](https://github.com/404-novel-project/novel-downloader/blob/20c7b2d0d3acff1669f43d5dc48b6dc1689e1b6e/src/rules/special/original/jjwxc.ts)
- [Fanqie](https://github.com/404-novel-project/novel-downloader/blob/20c7b2d0d3acff1669f43d5dc48b6dc1689e1b6e/src/rules/special/original/fanqie.ts)
- [Ciweimao](https://github.com/404-novel-project/novel-downloader/blob/20c7b2d0d3acff1669f43d5dc48b6dc1689e1b6e/src/rules/special/original/ciweimao.ts)

### Repo Trung khác

| Repo | Cơ chế đáng chú ý | Giới hạn |
| --- | --- | --- |
| [`naiyQAQ/fanqie-assistant`](https://github.com/naiyQAQ/fanqie-assistant) | Pipeline metadata → mục lục → batch chapter ID → kiểm completeness → retry đúng ID thiếu; xử lý payload nén/mã hóa và font-map | Dedupe trong một job, chưa phải resume bền qua lần chạy; không nên chép đường truy cập ngoài quyền người dùng |
| [`hcoona/qidian-book-downloader`](https://github.com/hcoona/qidian-book-downloader) | Playwright dùng phiên đã đăng nhập, token bucket và retry navigation | Không có resume/dedupe; selector cũ. Mẫu đáng học là browser session cho nội dung tài khoản được phép xem |
| [`dev-chenxing/jjwxc-crawler`](https://github.com/dev-chenxing/jjwxc-crawler) | Scrapy cho chương non-V, tôn trọng `robots.txt`, xuất từng chương | Phạm vi public rõ, không login/VIP; không có update engine |
| [`ma6254/FictionDown`](https://github.com/ma6254/FictionDown) | Cache YAML, chỉ tạo job khi text chương còn trống | Resume tốt nhưng ghép đa nguồn bằng tiêu đề dễ sai; một số workflow dùng nguồn sao chép nên không phù hợp với Mira |
| [`deepink-app/booksource`](https://github.com/deepink-app/booksource) | Mỗi nguồn là file JS có manifest/version và hàm search/detail/catalog/chapter | Adapter nhỏ, cập nhật độc lập; contract ngầm và chạy JS rộng quyền nên cần sandbox nếu học theo |
| [`AlexiaAshford/HedgehogCatAppNovelDownload`](https://github.com/AlexiaAshford/HedgehogCatAppNovelDownload) | Ciweimao API, cache theo `chapter_id`, update chỉ lấy file chưa có, retry hữu hạn | File tồn tại không phát hiện chương sửa; mặc định nhiều thread quá cao cho thiết kế chung |

## 4. Những mẫu lặp lại

### Tách catalog khỏi content

Repo bền hơn luôn lấy metadata/mục lục trước, rồi mới quyết định chương nào cần nội dung. Mục lục nhẹ có
thể kiểm thường xuyên; nội dung nặng chỉ lấy khi mới, thiếu cache hoặc được xác nhận đã đổi.

### ID nguồn quan trọng hơn URL tạm và tiêu đề

Khóa nên là `(sourceId, remoteBookId, remoteChapterId)`. URL ticket, signed URL và URL CDN có thể hết
hạn. Tiêu đề và số thứ tự chỉ là fallback có cảnh báo vì chương có thể đổi tên hoặc được chèn vào giữa.

### Resume phải lưu theo từng chương

Các mẫu tốt (`pia-scrap`, `syosetsu-downloader`, downloader Ciweimao) commit từng chương ngay khi hoàn
thành. EPUB/TXT chỉ là output được dựng lại, không phải kho trạng thái nguồn.

### HTTP thành công chưa có nghĩa là lấy được chương

Một số nguồn trả HTTP 200 nhưng thân là trang login, challenge, quảng cáo hoặc payload thiếu. Adapter cần
assertion semantic: chapter ID đúng, body không rỗng, không phải challenge và độ dài hợp lý. Nếu mục lục
đột ngột rỗng, phải dừng thay vì đánh dấu mọi chương đã bị gỡ.

### Quyền truy cập là trạng thái, không phải retry

Nên phân biệt:

- `public`;
- `login_required`;
- `age_verification_required`;
- `entitlement_required`;
- `manual_intervention_required`;
- `temporarily_unavailable`;
- `parser_broken`.

Chỉ lỗi mạng, 429 và 5xx mới retry với backoff/jitter. 401/403, chương khóa, font-map lạ hoặc invariant
parser hỏng phải dừng hay yêu cầu người dùng, không retry mù.

## 5. Đề xuất kiến trúc cho Mira — chưa chốt

### Hai tầng adapter

1. **Rule khai báo**, dùng mặc định: HTTP/API, CSS/XPath/JSONPath, regex có timeout, pagination và phép
   biến đổi dữ liệu giới hạn. Không cho arbitrary JavaScript.
2. **Code adapter cách ly**, chỉ dùng khi nguồn cần ký request hoặc thuật toán riêng. Chạy worker/process
   riêng với deadline, quota, origin allowlist và không có filesystem, environment, clipboard hay database
   của Mira.

Contract tối thiểu:

```text
identify(url)
fetchBook(remoteBookId)
fetchCatalog(remoteBookId, cursor)
fetchChapter(remoteChapterId, cursor)
checkSession()
normalize()
```

Manifest khai `sourceId`, version adapter/schema, origin được phép, charset, rate limit, loại pagination,
khả năng cần browser và các trạng thái truy cập hỗ trợ.

### Network broker ở lõi

Adapter không tự giữ HTTP client toàn quyền. Lõi Mira áp:

- allowlist origin và kiểm lại sau redirect;
- cookie/token theo origin qua handle bí mật;
- timeout, response-size limit, retry budget và concurrency theo nguồn;
- chặn localhost/private network;
- redact secret khỏi log;
- cache partition theo nguồn và tài khoản.

### Đồng bộ

1. Lấy snapshot catalog.
2. Upsert theo remote ID.
3. Diff thành `added`, `renamed`, `moved`, `locked`, `missing_remote`, `reappeared`.
4. Không tombstone từ một snapshot lỗi; chỉ xác nhận bị gỡ sau nhiều lần catalog hợp lệ.
5. Enqueue nội dung mới, thiếu hoặc stale.
6. Lưu content revision/hash, ETag/Last-Modified nếu có, lỗi cuối và `retryAfter`.
7. Commit từng chương rồi mới dựng output hoặc xếp hàng dịch.

### Bảo trì adapter

- fixture HTML/JSON đã khử dữ liệu nhạy cảm;
- golden test cho metadata/catalog/chapter;
- live smoke test trả `healthy`, `broken` hoặc `inconclusive`;
- canary trước khi phát hành adapter mới;
- artifact ký số, SHA-256, chống downgrade và giữ signing-key continuity;
- khi selector/API đổi, tạo patch candidate để test và review, không tự phát hành rule do AI đoán.

## 6. Kết luận cho lộ trình Nguồn/Cập nhật

Khảo sát repo củng cố hướng dùng **một bộ catalog diff chung** nhưng thay đổi đề xuất ban đầu ở hai điểm:

1. Không nên chỉ làm bộ nhập tệp rồi sau này gắn scraper trực tiếp. Ngay từ đầu, schema chương cần
   `sourceId`, `remoteBookId`, `remoteChapterId`, access state, catalog checkpoint và content hash để
   không phải migration lại khi thêm API/browser.
2. Nếu Mira hỗ trợ nguồn mạng, nên làm **adapter do Mira kiểm soát và ký**, không mở ngay kho rule tùy ý.
   Rule tùy ý kiểu Legado/LNReader tăng độ phủ nhanh nhưng đưa network, cookie và dữ liệu tác phẩm vào mã
   bên thứ ba rộng quyền.

Lộ trình đề xuất vẫn là:

- A: nhập tệp/thư mục và catalog diff;
- C nhỏ: API/RSS chính thức;
- B: browser do người dùng chủ động, dùng phiên đăng nhập hợp lệ;
- sau đó mới cân nhắc rule adapter khai báo;
- không kèm đường tự mua, giả quảng cáo, phá DRM hoặc dùng mirror/API bên thứ ba để thay chương bị khóa.

## 7. Câu hỏi cần chốt

1. MVP có tạo schema nguồn đầy đủ ngay cả khi chỉ nhập tệp không?
2. Adapter mạng chỉ do Mira ký, hay cho cài adapter bên thứ ba trong sandbox?
3. Cookie/token được lấy qua browser profile do Mira quản lý hay chỉ mở viewer rồi người dùng xuất tệp?
4. Một chương mất khỏi catalog cần bao nhiêu snapshot hợp lệ trước khi đánh dấu “bị gỡ”? 
5. Có cho lấy lại raw của chương cũ theo lịch để phát hiện sửa đổi, hay chỉ khi metadata/timestamp đổi?
6. Nguồn cần font động, payload riêng hoặc nội dung dạng ảnh được đánh dấu “không hỗ trợ”, hay được phép
   có code adapter đã audit?

---

[Nguồn và cập nhật](README.md) · [Nghiên cứu cơ chế Cập nhật](updates-research.md) ·
[Mục lục module](../README.md)
