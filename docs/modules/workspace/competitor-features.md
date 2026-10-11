# Tính năng của đối thủ và cách lấp chỗ trống khi không có rail

Cập nhật: 2026-10-08 · Trạng thái: **Quan sát** (phần 1–3), **Đề xuất** (phần 4–6), chưa chốt.
Chủ trì: chủ sản phẩm.

## Câu hỏi chương này trả lời

Sau khi bỏ rail điều hướng ([kết luận ở nghiên cứu thanh bên](sidebar-research.md#6-kết-luận)), giao
diện Mira trông trống: thanh trên chỉ có hai nút, màn Tác phẩm là một cột 960 px giữa màn rộng, Thư
viện đang là placeholder. Đối thủ đặt gì vào khoảng bên cạnh, và tính năng nào của họ đáng đưa vào Mira?

Chương này tiếp nối [nghiên cứu thanh bên](sidebar-research.md): phần đó xếp **mục điều hướng**, phần
này xem **tính năng bên trong từng màn** và các panel phụ.

## Nguồn và độ tin

Đọc ngày 2026-10-08. Ký hiệu: **[mã]** đọc mã nguồn hoặc file i18n trên GitHub; **[docs]** README hoặc
help chính thức; **[thứ ba]** store, review, forum; **[chưa kiểm]** hiểu biết chung, chưa đối chiếu.
Chưa mở app nào để xem ảnh thật; bố cục của app mã nguồn mở được suy ra từ tên trang và chuỗi i18n.

| Nhóm | App | Nguồn chính |
| --- | --- | --- |
| Dịch truyện, text game bằng AI | LinguaGacha | [`PRODUCT.md`](https://github.com/neavo/LinguaGacha/blob/HEAD/PRODUCT.md), `src/frontend/pages/`, `i18n/en-US/*.ts` [mã] |
| | AiNiee | [repo](https://github.com/NEKOparapa/AiNiee), `Resource/Localization/*.json` [mã] |
| | GalTransl | [repo](https://github.com/GalTransl/GalTransl), `desktop/src/components/Sidebar.tsx`, `locales/en/*.json` [mã] |
| | Glossarion, LLM Novel Translator, lncrawl | [Glossarion](https://github.com/Shirochi-stack/Glossarion), [llm-novel-translator](https://github.com/qw02/llm-novel-translator), [lightnovel-crawler](https://github.com/lncrawl/lightnovel-crawler) [docs] |
| Hệ sinh thái Việt | QuickTranslator, TTV Translate, Sáng Tác Việt, Tiên Dịch, AI Translator Pro | [QuickTranslator](https://github.com/dynamotn/QuickTranslator) [docs]; [TTV Translate](https://apps.apple.com/us/app/id1473405169), [sangtacviet.com](https://sangtacviet.com) [thứ ba]; Tiên Dịch, AI Translator Pro [docs, repo nhỏ] |
| App viết truyện | Novelcrafter | [bố cục](https://novelcrafter.com/help/getting-started/quick-start/novelcrafter-layout), [Write](https://novelcrafter.com/help/docs/write/the-write-interface), [Mentions](https://www.novelcrafter.com/help/docs/codex/codex-mentions), [Progressions](https://www.novelcrafter.com/help/docs/codex/progressions-codex-details), [Matrix](https://www.novelcrafter.com/help/docs/plan/planning-with-the-matrix) [docs] |
| | Sudowrite | [Story Bible](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/what-is-story-bible/jmWepHcQdJetNrE991fjJC), [Chapter Continuity](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/chapter-continuity/4KL8gFeLZQ6GSBjDWtSbV6), [Plugins](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/how-do-i-build-plugins/a3iVxJb4UZLKfSxf8BG3mY) [docs] |
| | Scrivener, Ulysses, Atticus | [Snapshots](https://www.literatureandlatte.com/blog/how-to-manage-compare-and-restore-snapshots-in-your-scrivener-projects), [Targets](https://www.literatureandlatte.com/blog/let-me-count-the-ways); [Ulysses library](https://help.ulysses.app/en_US/first-steps-library-editor), [Goals](https://help.ulysses.app/goals); [Atticus goals](https://www.atticus.io/setting-writing-goals-with-atticus/) [docs] |
| | Obsidian, Notion | [Sidebar](https://obsidian.md/help/sidebar), [plugin lõi](https://obsidian.md/help/plugins); [Notion sidebar](https://www.notion.com/help/sidebar) [docs] |
| CAT tool | memoQ | [Translation results](https://docs.memoq.com/current/en/Workspace/translation-results-list.html), [editor](https://docs.memoq.com/current/en/Workspace/translation-editor.html), [QA](https://docs.memoq.com/current/en/Concepts/concepts-quality-assurance-qa-warnings.html), [Concordance](https://docs.memoq.com/current/en/Workspace/mt-concordance.html) [docs] |
| | Crowdin, Phrase, Smartcat, Lokalise, Matecat, OmegaT | [Crowdin editor](https://support.crowdin.com/online-editor/), [Phrase](https://support.phrase.com/hc/en-us/articles/5709700079644), [Smartcat QA](https://smartcat-company.helpjuice.com/1539705-quality-assurance-in-the-editor), [Lokalise](https://docs.lokalise.com/en/articles/6854191-translation-editor), [Matecat](https://site.matecat.com/support/translating-projects/using-tm-matches-mt-suggestions-glossary-terms/), [OmegaT panes](https://omegat.sourceforge.io/manual-latest/en/chapter.panes.html) [docs] |
| | Trados Studio | sách Packt và [community.rws.com](https://community.rws.com/product-groups/trados-portfolio/trados-studio/f/studio/17134/) [thứ ba] |

## 1. Các app làm đúng việc của Mira (quan sát)

### LinguaGacha [mã]

- **Trang chủ dự án:** hai thẻ Tạo / Mở (kéo thả được), danh sách dự án gần đây, và **thẻ xem trước**
  dự án: số tệp, ngày tạo, lần sửa cuối, tiến độ. Màn đầu nhờ vậy không trống.
- **Bàn làm việc (Workbench):** bảng tệp có cột tiến độ; thẻ thống kê Tổng / Xong / Lỗi / Chờ / Bỏ
  qua; khi chạy có thời gian đã chạy và còn lại, tốc độ, token vào / suy luận / ra, **biểu đồ tốc độ
  theo thời gian thực**, số request đang chạy. Hết key thì tự chờ và đếm ngược. Có "Reset Failed Data"
  chỉ dịch lại dòng lỗi, và khi nhập lại tệp trùng tên thì hỏi có **giữ bản dịch cũ** không.
- **Hiệu đính (Proofreading):** lưới Trạng thái / Nguồn / Bản dịch; tìm và thay (regex, chọn phạm vi);
  thao tác hàng loạt (dịch lại, xoá bản dịch, đặt trạng thái); xem ngữ cảnh dòng. **Cảnh báo theo dòng:**
  sót ký tự nguồn, bản dịch quá giống nguồn, glossary không áp hoặc áp một phần, lệch cấu trúc dấu câu,
  lệch số dòng. Lọc theo từng loại cảnh báo, có bộ lọc riêng "Glossary Misses".
- **Trình sửa quy tắc** (glossary, bảo vệ văn bản, thay thế): cột **Hits** đếm số dòng khớp từng mục;
  báo **mục là chuỗi con của mục khác**; preset, nhập/xuất, cảnh báo trùng.
- **Agent:** skill dựng sẵn (glossary, dịch, hướng dẫn văn phong…), tìm web, ghi vào dự án qua duyệt
  tay hoặc tự động với lựa chọn "chỉ lần này" / "cả phiên".
- **Phòng thí nghiệm:** mức suy luận tự thích nghi; **câu nguồn trùng chỉ dịch một lần**.
- **Prompt tuỳ chỉnh:** tiền tố, hậu tố, preset văn phong "文言文" (văn cổ), "文学措辞" (văn chương).

### AiNiee [mã]

- **Dịch rồi nhuận sắc (Translation / Polishing Mode):** lượt AI thứ hai làm mượt văn, cột Nhuận sắc
  tách khỏi cột Bản dịch và đặt lại riêng được.
- **Phân tích toàn văn:** AI đọc cả truyện, sinh bảng Nhân vật và bảng Thuật ngữ, mỗi mục kèm câu nguồn
  chứa nó; chuyển mục giữa hai bảng hoặc đẩy lên bảng dùng chung. Có thêm trích tên bằng NER.
- **Prompt chia mục:** bối cảnh thế giới, giới thiệu nhân vật, văn phong, **câu mẫu dịch**.
- **Kiểm tra:** tỉ lệ ngôn ngữ đích theo khối, dùng đúng glossary và danh sách không dịch, sót số thứ
  tự, **AI chép lại câu mẫu của prompt**; từ trang kết quả bấm "Dịch lại mục đã chọn".
- **Bảng không dịch (Do Not Translate)**, thay thế trước/sau dịch, **bảng dùng chung** giữa các dự án.

### GalTransl [mã]

- **Thanh bên** (gần mẫu thư viện của Mira nhất): trên là Trang chủ, Agent; giữa là **từng dự án đang
  mở**, chấm báo đang dịch, mỗi dự án có Dịch / Xem văn bản / Từ điển dự án / Dịch tên / Cấu hình và nút
  Xuất; đáy là Model (cảnh báo khi chưa cấu hình), Từ điển chung, Cài đặt.
- **Trang chủ có số liệu:** dự án gần đây, số job đang chạy, số đã xong.
- **Trình tạo dự án:** chọn thư mục → nhập → trích tên → AI dịch tên → **dịch thử một phần** → xem kết
  quả và lỗi, rồi mới chạy hết.
- **Xem văn bản:** mỗi câu hiện các tầng nguồn trước/sau tiền xử lý, bản dịch, bản hiệu đính; tìm toàn
  dự án; từ một lỗi bấm thêm vào "từ khoá dịch lại"; hoàn tác thay đổi theo tệp.
- **Hướng dẫn chung (Common Guidelines)** dùng cho mọi dự án.

### Các app khác [docs]

- **Glossarion:** dịch nhiều chương song song với **cửa sổ ngữ cảnh trượt**, phát hiện chương dịch
  trùng, QA Scanner xuất báo cáo HTML/JSON/CSV, dựng lại EPUB giữ bìa.
- **LLM Novel Translator:** glossary tự học tên, địa danh, **cảnh giới tu luyện**; **mỗi bước chọn một
  model** (rẻ cho trích glossary, mạnh cho dịch).
- **lncrawl:** khoảng 361 nguồn, tìm truyện trên nhiều nguồn, tải theo khoảng chương, **chỉ tải chương
  mới**, chạy tiếp khi đứt.

## 2. Hệ sinh thái Việt (quan sát)

- **QuickTranslator** [docs; phần UI chưa kiểm]: khung Trung / Hán Việt / VietPhrase / Việt; thứ tự tra
  Names > VietPhrase > Hán Việt, cụm dài khớp trước; thêm Name hay VietPhrase ngay tại chỗ; luật nhân
  (LuatNhan) cho mẫu đảo ngữ như `{0}之{1}`.
- **TTV Translate, tiện ích QT/VietPhrase trên Chrome** [thứ ba]: hiện song song Hán Việt / VietPhrase /
  VietPhrase một nghĩa để so; sửa Names trong app.
- **Sáng Tác Việt** [thứ ba]: bộ name có Tải / Upload / **Chia sẻ**, cộng đồng dùng chung bộ name; nghe
  chương bằng TTS.
- **Tiên Dịch** [docs, repo nhỏ]: từ điển 7 lớp convert thô rồi AI làm mượt; Ctrl+E thêm name; popup
  tra Thiều Chửu / Lạc Việt; cấu hình xưng hô; tự tìm nút chương trước/sau trên site nguồn.
- **AI Translator Pro** [docs]: đếm token và **ước tính chi phí theo model**; tự dừng sau nhiều lần lỗi.

Xu hướng 2025–2026: **convert bằng từ điển trước, LLM viết lại sau**, và giữ thống nhất tên + xưng hô.
Người dịch Việt đã có sẵn tệp Names.txt / VietPhrase.txt; nhập được chúng là một lý do để chuyển sang.

## 3. Đối thủ đặt gì vào khoảng bên cạnh (quan sát)

| Vùng | Đối thủ đặt gì | Ví dụ |
| --- | --- | --- |
| **Màn đầu** | Gần đây, đang chạy, tiến độ từng dự án, thẻ xem trước | LinguaGacha, GalTransl, Notion Home |
| **Panel phải theo câu** (inspector) | Thuật ngữ khớp trong câu, gợi ý TM/MT, tra cứu, ghi chú, lịch sử, QA của câu đang chọn | memoQ, Crowdin, Phrase, Lokalise, Smartcat, Scrivener Inspector |
| **Panel dạng tab, ghim được** | Codex, Snippets, Chat ghim cạnh editor; nhóm tab kéo thả | Novelcrafter, Obsidian, Trados |
| **Cột trái mảnh** | Danh sách chương có trạng thái, outline của chương, dải mốc cảnh | Atticus, Obsidian Outline, Novelcrafter Story Timeline |
| **Thanh trạng thái** | % xong, số câu theo trạng thái, số lỗi QA, số từ so với mục tiêu | memoQ, OmegaT, Scrivener, Ulysses |
| **Bộ lọc lưu sẵn** | Chưa dịch, có lỗi QA, có ghi chú | Crowdin, Lokalise, Ulysses Filters |

Mẫu chung: CAT tool không cần rail vì **panel phải đổi theo câu đang chọn** đã lấp chỗ; app viết truyện
lấp bằng **kho tri thức truyện** (Codex, Story Bible) ghim cạnh editor. Cả hai đều có **thanh trạng thái
tiến độ** ở đáy.

## 4. Tính năng Mira chưa có, xếp theo giá trị (đề xuất)

Thứ hạng là nhận định của nghiên cứu này, cân giữa mức phổ biến ở đối thủ, độ khớp với lộ trình sẵn có
của Mira và công làm. Cột "Lấp chỗ nào" cho biết tính năng đó cũng giải quyết cảm giác trống ở đâu.

| # | Tính năng | Có ở | Lấp chỗ nào | Nối với lộ trình Mira |
| --- | --- | --- | --- | --- |
| 1 | **Panel ngữ cảnh theo câu:** gạch chân thuật ngữ và tên trong câu nguồn, panel hiện bản dịch chuẩn, nhân vật, xưng hô hiện hành | memoQ, Crowdin, Lokalise, Trados, OmegaT | Panel phải màn Chương, tab cạnh Chat | Dùng glossary và xưng hô đã chạy; thay mock "Gợi ý · Thuật ngữ" ở chế độ câu |
| 2 | **Kiểm tra chất lượng (QA) và lọc theo lỗi:** sót chữ Hán, dấu câu Trung (。，「」), glossary không áp, lệch số câu, bản dịch giống nguồn, sót số, xưng hô sai cặp | LinguaGacha, AiNiee, GalTransl, memoQ, Crowdin | Tab QA ở panel phải; số lỗi ở thanh trạng thái và từng dòng chương | Khớp "cờ cảnh báo" ở [lộ trình Ngữ cảnh](../context/roadmap.md) câu hỏi 7 |
| 3 | **Thanh trạng thái tiến độ:** câu chưa dịch / AI nháp / đã duyệt, % chương, lỗi QA, đề xuất chờ | memoQ, OmegaT, Ulysses | Đáy màn Chương; tổng ở màn Tác phẩm | Đã có `ChapterStatusBar`, cần thêm số liệu |
| 4 | **Trang chủ Thư viện có số liệu:** đang dịch dở (mở tiếp), gần đây, tiến độ từng truyện, tác vụ đang chạy | LinguaGacha, GalTransl, Notion | Màn Thư viện đang placeholder | Đang dựng lại theo hệ thiết kế |
| 5 | **Dịch lại theo lỗi:** chọn câu lỗi rồi dịch lại, "chỉ dịch lại câu lỗi" | GalTransl, AiNiee, LinguaGacha | Hành động trong tab QA | Cần luồng dịch đoạn đã có |
| 6 | **Phân tích toàn truyện để trích nhân vật và thuật ngữ,** kèm câu nguồn làm bằng chứng, vào hàng duyệt | AiNiee, GalTransl, LinguaGacha | Khu vực Ngữ cảnh | Chính là lát 4 của [lộ trình Ngữ cảnh](../context/roadmap.md) |
| 7 | **Xuất hiện ở đâu (Mentions) và tên chưa có trong glossary:** mỗi mục có danh sách chương nhắc tới; danh sách tên lặp nhiều mà chưa vào glossary | Novelcrafter, Obsidian unlinked mentions, LinguaGacha Hits | Chi tiết mục glossary, nhân vật | Bổ trợ hàng duyệt trích xuất |
| 8 | **Bảng tác vụ:** thời gian còn lại, tốc độ, token, **ước tính chi phí**, tự chờ khi hết hạn mức | LinguaGacha, AiNiee, AI Translator Pro | Khu vực Tác vụ đang mock | [Giai đoạn tác vụ nhiều chương](../proposals/agent-roadmap.md#2-tác-vụ-dịch-nhiều-chương) |
| 9 | **Hiệu lực từ chương N (Progressions):** xưng hô, danh hiệu, cảnh giới đổi từ một chương trở đi | Novelcrafter | Chi tiết nhân vật | Khớp câu hỏi 2 của lộ trình Ngữ cảnh (tiết lộ muộn, mốc chương) |
| 10 | **Tra cứu (concordance):** tìm một cụm nguồn hoặc dịch trong mọi chương đã dịch: "trước đây dịch 道友 thế nào" | memoQ, Trados, Phrase, Matecat | Tab Tra cứu ở panel phải | Cần chỉ mục tìm kiếm theo tác phẩm |
| 11 | **Tìm và thay trên cả truyện** (regex, chọn cột nguồn/dịch, nhảy tới câu) | LinguaGacha, AiNiee, GalTransl | Hộp thoại hoặc khu vực trong màn Tác phẩm | Mới |
| 12 | **Nhập Names.txt / VietPhrase.txt, khung Hán Việt cạnh câu nguồn** | QuickTranslator, TTV, Tiên Dịch, Sáng Tác Việt | Panel ngữ cảnh; nhập vào glossary | Mới; cần quyết định có lớp từ điển convert hay không |
| 13 | **Hướng dẫn văn phong có cấu trúc:** bối cảnh, giọng văn, câu mẫu dịch, preset | AiNiee, LinguaGacha, Sudowrite Story Bible, Crowdin Style guides | Mục Văn phong đang mock | Lát 5 của lộ trình Ngữ cảnh |
| 14 | **Bản chụp chương (Snapshots) và so sánh** trước khi áp đề xuất hoặc dịch lại | Scrivener, Novelcrafter, Phrase, Smartcat | Tab Lịch sử ở panel phải | Bổ trợ luồng duyệt đề xuất |
| 15 | **Mục tiêu và hạn chót:** "dịch xong 300 chương trước 31/12", chia chỉ tiêu ngày | Scrivener, Ulysses, Atticus | Thẻ ở màn Tác phẩm, Thư viện | Mới, công nhỏ |

**Đáng cân nhắc sau:** lượt nhuận sắc tách cột (AiNiee); mỗi bước một model và câu trùng chỉ dịch một
lần (LinguaGacha, LLM Novel Translator); trình tạo tác phẩm có bước dịch thử (GalTransl); bảng không
dịch và thay thế trước/sau dịch; từ điển dùng chung giữa các truyện (GalTransl, AiNiee, Sáng Tác Việt);
lệnh AI tự định nghĩa (Sudowrite Plugins); phương án dịch thay thế cho câu khó (OmegaT); nghe chương
bằng TTS; ma trận nhân vật × chương (Novelcrafter).

**Không nên làm bây giờ:** chấm điểm LQA (memoQ) vì Mira chỉ có một người dùng; dịch manga và text game
(BallonsTranslator, MTool), ngoài phạm vi truyện chữ.

## 5. Ba cách lấp chỗ trống (đề xuất)

Các cách dưới đây không loại trừ nhau. Cách A và B giữ kết luận "không rail"; cách C đổi lại kết luận đó.

**A. Lấp bằng nội dung, giữ không rail.** Theo mẫu CAT tool:

- Thư viện: trang chủ có "Đang dịch dở" (thẻ lớn, mở tiếp chương cuối), lưới tác phẩm có thanh tiến độ,
  tác vụ đang chạy (khi có).
- Màn Tác phẩm: hai cột, cột chính là khu vực Chương / Ngữ cảnh / Nguồn / Tác vụ; cột phải 280 px là
  thẻ tổng quan: tiến độ dịch, đề xuất chờ duyệt, lỗi QA, mục tiêu, nhân vật hay xuất hiện.
- Màn Chương: panel phải thành nhóm tab **Chat · Ngữ cảnh · QA · Lịch sử**; thanh trạng thái có tiến độ
  câu và số lỗi.

**B. Cột trái theo màn, không phải rail.** Màn Chương đã có cột danh sách chương. Thêm cột tương tự ở
màn Tác phẩm (danh sách khu vực có số đếm: Chương 120/300, Ngữ cảnh 45 mục, 3 lỗi QA, 12 đề xuất chờ)
và ở Thư viện (bộ lọc: Đang dịch, Tạm dừng, Lưu trữ, Gần đây). Cột này là nội dung của màn, không phải
menu toàn app.

**C. Quay lại rail theo mẫu GalTransl.** Trên: Thư viện. Giữa: các tác phẩm đang mở, mỗi tác phẩm có
mục con và chấm báo đang dịch hoặc có lỗi. Đáy: Cài đặt, theme. Hợp khi người dùng dịch song song vài
truyện, nhưng lặp lại menu khu vực của màn Tác phẩm, lý do đã nêu ở phần 6 của nghiên cứu thanh bên.

Nghiên cứu này nghiêng về **A**: các tính năng hạng 1–4 vừa có giá trị dịch thật vừa lấp đúng chỗ trống,
còn B và C chỉ chuyển chỗ các mục đã có.

## 6. Câu hỏi cho chủ sản phẩm

1. Chọn cách lấp chỗ trống: A, B, C hay kết hợp?
2. Làm trước tính năng nào trong nhóm 1–4 (panel ngữ cảnh theo câu, QA, thanh trạng thái, trang chủ
   Thư viện)?
3. Mira có làm lớp từ điển kiểu QuickTranslator (Names, VietPhrase, Hán Việt), hay chỉ nhập Names.txt
   vào glossary?
4. QA chạy lúc nào: sau mỗi lượt dịch, khi mở chương, hay chỉ khi bấm kiểm tra?

---

[Phiên làm việc theo tác phẩm](README.md) · [Những gì nên đặt ở thanh bên](sidebar-research.md) ·
[Mục lục module](../README.md)
