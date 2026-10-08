# Tính năng toàn app cho thanh bên chung

Cập nhật: 2026-10-08 · Trạng thái: **Quan sát** (phần 1–2), **Đề xuất** (phần 3–4), chưa chốt.
Chủ trì: chủ sản phẩm.

## Câu hỏi chương này trả lời

Ngày 2026-10-08, [nghiên cứu thanh bên](sidebar-research.md#6-kết-luận) chốt không dùng rail, vì ngoài
một tác phẩm Mira chỉ có hai đích là Thư viện và Cài đặt. Kết luận đó cũng ghi: cân lại khi có thứ dùng
chung vượt khỏi một truyện và hay mở. Chủ sản phẩm muốn có thanh bên chung, nên câu hỏi là: **tính năng
toàn app** nào (nằm ngoài mọi tác phẩm) đáng làm, để thanh bên có lý do tồn tại?

Tính năng bên trong một tác phẩm nằm ở [tính năng của đối thủ](competitor-features.md).

## Nguồn

Đọc ngày 2026-10-08. **[mã]** đọc mã nguồn; **[docs]** tài liệu chính thức; **[chưa kiểm]** hiểu biết
chung, chưa đối chiếu.

| App | Nguồn |
| --- | --- |
| GalTransl desktop | [`Sidebar.tsx`](https://github.com/GalTransl/GalTransl/blob/main/desktop/src/components/Sidebar.tsx), [`zh-CN/common.json`](https://github.com/GalTransl/GalTransl/blob/main/desktop/src/i18n/locales/zh-CN/common.json) [mã] |
| AiNiee | [`AppFluentWindow.py`](https://github.com/NEKOparapa/AiNiee/blob/main/UserInterface/AppFluentWindow.py) [mã] |
| LinguaGacha | [`navigation/schema.ts`](https://github.com/neavo/LinguaGacha/blob/main/src/frontend/app/navigation/schema.ts) [mã] |
| Mihon (Tachiyomi) | [`HomeScreen.kt`](https://github.com/mihonapp/mihon/blob/main/app/src/main/java/eu/kanade/tachiyomi/ui/home/HomeScreen.kt), `MoreScreen.kt` [mã] |
| Novelcrafter | [Prompt library](https://www.novelcrafter.com/help/docs/prompts/prompt-library), [Series codex](https://www.novelcrafter.com/help/docs/codex/series-codex) [docs] |
| Sudowrite | [Plugins](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/how-do-i-use-plugins/vuk8oVgWv5K7ZAE68D5Smi) [docs] |
| Ulysses, Notion, Readwise Reader | [Ulysses library](https://help.ulysses.app/ulysses-library), [Notion sidebar](https://www.notion.com/help/navigate-with-the-sidebar), [Reader navigation](https://docs.readwise.io/reader/docs/faqs/navigation) [docs] |
| Crowdin, memoQ, Smartcat, Phrase, Trados | [Crowdin](https://support.crowdin.com/crowdin-intro/), [memoQ resources](https://memoquickies.substack.com/p/they-aint-heavy-theyre-my-resources), [Smartcat assets](https://smartcat-company.helpjuice.com/understanding-linguistic-assets), [Phrase](https://support.phrase.com/hc/en-us/articles/5709748435484), [Trados](https://web.atanet.org/webinars/ataWebinar173_trados_handout.pdf) [docs] |
| Calibre, Claude/ChatGPT desktop, Cursor, Kindle | [chưa kiểm] |

## 1. Đối thủ đặt gì ở cấp app (quan sát)

- **GalTransl** [mã], gần Mira nhất vì cũng có nhiều dự án. Trên: **Trang chủ** (dự án gần đây, tạo
  mới) và **Agent** (chat ngoài mọi dự án, chấm xanh khi agent đang chạy). Giữa: **các dự án đang mở**,
  mỗi dự án bung ra Dịch / Văn bản / Từ điển dự án / Bảng tên / Cấu hình và có chấm "đang dịch". Đáy:
  **Model** (chấm cảnh báo khi chưa cấu hình), **Từ điển chung** cho mọi dự án, Cài đặt. Repo còn có
  trang mẫu prompt và hướng dẫn chung, nhưng không có link trên thanh bên.
- **AiNiee** [mã], một dự án: nhóm **Bảng dùng chung** (thuật ngữ, bảng không dịch, thay thế trước/sau
  dịch), nhóm Prompt (nền, nhân vật, bối cảnh, văn phong, câu mẫu), đáy có **Nhật ký chạy** và Cài đặt.
- **LinguaGacha** [mã], một dự án: Model, Agent, Hiệu đính, Bàn làm việc, Skills, các bảng quy tắc,
  Phòng thí nghiệm.
- **Novelcrafter** [docs]: **thư viện prompt** với mặc định ba tầng tài khoản → series → truyện; **codex
  của series** dùng chung cho mọi cuốn, mục codex chuyển qua lại giữa series và cuốn. Kết nối AI nằm
  trong menu hồ sơ, không phải mục thanh bên.
- **Mihon** [mã], app đọc truyện: thanh chính **Thư viện, Cập nhật, Lịch sử, Duyệt nguồn, Thêm**; "Thêm"
  chứa **Hàng đợi tải**, Danh mục, **Thống kê**, Cài đặt. "Cập nhật" gom chương mới của mọi bộ truyện,
  chạy theo lịch.
- **Ulysses, Notion, Readwise** [docs]: bộ lọc toàn cục (7 ngày gần đây, Thùng rác), Trang chủ có mục
  gần đây và việc cần chú ý, Tìm kiếm là mục cố định ở đầu.
- **CAT/TMS** [docs]: Crowdin có Dự án, Hoạt động, Việc của tôi; TM, glossary, style guide là tài nguyên
  cấp tài khoản. memoQ gom TM, termbase, QA profile vào **Resource Console**, có cột "đang dùng ở dự án
  nào" và "lần dùng cuối".
- **Calibre** [chưa kiểm]: thư viện ảo lưu bằng truy vấn; chỉ báo **Jobs** ở góc dưới mở danh sách tác
  vụ nền.

## 2. Mẫu lặp lại (quan sát)

- Mục toàn app hay gặp nhất: **Trang chủ**, **tài nguyên dùng chung** (từ điển, prompt), **tác vụ nền**,
  **cập nhật từ nguồn** (ở app đọc truyện).
- **Chấm trạng thái thay cho thêm mục:** GalTransl đặt chấm "đang chạy" lên dự án và Agent, chấm cảnh
  báo lên Model; Mihon và Calibre báo số tác vụ trên icon.
- **Model, nhật ký, thùng rác** hiếm khi có chỗ riêng ở đầu thanh bên; nếu có thì ở đáy.
- **Tìm kiếm** là thao tác gõ phím (Notion, Obsidian), không phải nơi để đến.

## 3. Mục ứng viên cho Mira (đề xuất)

Tần suất là đánh giá cho một người dịch làm một mình với nhiều tác phẩm.

| Mục | Đối thủ có | Làm gì ở Mira | Tần suất | Hiện trạng Mira |
| --- | --- | --- | --- | --- |
| **Trang chủ** | GalTransl, Notion, Readwise, Trados | Tiếp tục chương dở, tác vụ đang chạy hoặc lỗi, chi phí tuần này, hoạt động gần đây | Cao, màn mở app mỗi ngày | Chưa có |
| **Thư viện** | Tất cả | Lưới tác phẩm, tiến độ, bộ lọc lưu sẵn (Đang dịch, Có chương mới, Tạm dừng, Lưu trữ) | Cao | Dữ liệu có, giao diện đang dựng lại |
| **Tác vụ** | Mihon, Calibre, GalTransl, Cursor | Hàng đợi chung mọi truyện: dịch nhiều chương, trích thuật ngữ, nhập/xuất; tạm dừng, thử lại, lỗi, chi phí từng việc | Cao khi dịch hàng loạt; số trên icon có ích cả khi không bấm | Mock trong từng tác phẩm; Module 7 trong [phiên và tác vụ](../proposals/sessions-and-jobs.md) |
| **Kho dùng chung** | GalTransl, AiNiee, Novelcrafter, memoQ, Crowdin | Thuật ngữ, tên, bảng thay thế dùng cho nhiều truyện (cùng tác giả, cùng thể loại tu tiên); thấy "đang dùng ở truyện nào"; nhập Names.txt / VietPhrase.txt | Trung bình, sửa theo đợt nhưng là tài sản tích luỹ | Chưa có; glossary hiện theo từng tác phẩm |
| **Prompt & văn phong** | Novelcrafter, AiNiee, LinguaGacha, GalTransl, Sudowrite | Hồ sơ văn phong (cổ trang, đô thị, xưng hô), mẫu prompt, hướng dẫn chung mà tác phẩm kế thừa rồi ghi đè | Trung bình đến thấp: nhiều lúc đầu, sau hiếm | Văn phong theo tác phẩm đang mock |
| **Trợ lý AI** | GalTransl, Notion | Chat ngoài tác phẩm: hỏi điển cố, thành ngữ; nhờ agent làm việc trên cả thư viện | Trung bình, chỉ đáng khi agent làm được việc cấp thư viện | Chat hiện gắn chương |
| **Cập nhật** | Mihon, Readwise, lncrawl | Chương gốc mới của các truyện đang theo dõi; đưa vào hàng đợi dịch | Rất cao nếu có nguồn, không có nguồn thì bỏ | Nguồn đang mock |
| Thống kê & chi phí | Mihon, Sudowrite, Smartcat | Token và tiền theo model, truyện, ngày; số chương đã dịch | Trung bình; thẻ trên Trang chủ đủ cho hằng ngày | Chưa có |
| Nhật ký | AiNiee, LinguaGacha | Request, lỗi API, rate limit | Thấp, mở khi có sự cố | Chưa có |
| Thùng rác | Ulysses, Notion | Khôi phục tác phẩm, chương, thuật ngữ đã xoá | Rất thấp | Chưa có |
| Tìm toàn thư viện | Notion, Readwise, Obsidian | Tìm tên, thuật ngữ trong mọi bản gốc và bản dịch | Trung bình | Chưa có |
| Tra Hán Việt | Tiên Dịch, QuickTranslator | Âm Hán Việt, nghĩa | Cao nhưng là tra ngay trong editor | Chưa có |

## 4. Xếp chỗ (đề xuất)

**Thanh bên chung:**

| Vị trí | Mục | Ghi chú |
| --- | --- | --- |
| Đầu | Tìm (Ctrl+K) | Ô hoặc nút mở bảng lệnh; tìm tác phẩm, chương, thuật ngữ và nhảy lệnh |
| Chính | **Trang chủ** | Gộp Lịch sử và tóm tắt Thống kê |
| | **Thư viện** | Bộ lọc lưu sẵn có thể nằm ngay dưới, như Ulysses |
| | **Tác vụ** | Số việc đang chạy, chấm đỏ khi lỗi |
| | **Cập nhật** | Chỉ khi có Nguồn; có số chương mới |
| Tài nguyên | **Kho dùng chung** | Thuật ngữ và tên chung; muốn gọn thì gộp với mục dưới thành "Tài nguyên" có tab, như Resource Console của memoQ |
| | **Prompt & văn phong** | |
| | **Trợ lý AI** | Khi agent làm được việc cấp thư viện |
| Giữa (tuỳ chọn) | Tác phẩm đang mở | Theo GalTransl: vài tác phẩm gần nhất, chấm đang dịch hoặc có đề xuất chờ; thay dải tab đã gỡ |
| Đáy | Cài đặt, theme | Chấm cảnh báo trên Cài đặt khi chưa có kết nối AI |

**Để trong Cài đặt:** model và kết nối AI; trang **Sử dụng** (chi phí chi tiết, mở được từ thẻ Trang chủ);
nhật ký và chẩn đoán (thông báo lỗi dẫn thẳng tới đây); thùng rác (Cài đặt › Dữ liệu, hoặc cuối Thư
viện); sao lưu, nhập/xuất cả thư viện.

**Để trong bảng lệnh:** tìm toàn thư viện, tra Hán Việt (cũng có trong panel editor), nhảy nhanh tới tác
phẩm hoặc "chương kế chưa dịch".

**Thứ tự làm gợi ý:** bản đầu của thanh bên chỉ cần **Trang chủ, Thư viện, Tác vụ** và đáy Cài đặt; hai
mục đầu dùng dữ liệu đã có. Kho dùng chung, Prompt & văn phong, Cập nhật và Trợ lý AI thêm vào khi tính
năng tương ứng chạy thật. Không đặt mục "Sắp có" lên thanh bên, để tránh lại cảm giác trống.

## 5. Câu hỏi cho chủ sản phẩm

1. Mở lại quyết định "không rail" ngày 2026-10-08 và dùng thanh bên chung theo phần 4?
2. Thanh bên có nhãn chữ (khoảng 200 px, như GalTransl) hay chỉ icon (44 px, tooltip)?
3. Có hiện "tác phẩm đang mở" ở giữa thanh bên không?
4. Glossary dùng chung kế thừa thế nào: tác phẩm tự gắn kho chung, hay kho chung áp cho mọi tác phẩm
   rồi tác phẩm ghi đè?
5. Mira có làm Nguồn (tải chương từ web) không? Câu trả lời quyết định mục Cập nhật.

---

[Phiên làm việc theo tác phẩm](README.md) · [Những gì nên đặt ở thanh bên](sidebar-research.md) ·
[Tính năng của đối thủ](competitor-features.md)
