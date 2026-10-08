# Những gì nên đặt ở thanh bên

Cập nhật: 2026-10-08 · Trạng thái: **Quan sát** (phần 1–3), **Đề xuất** (phần 4–5), **Đã chốt** (phần 6).
Chủ trì: chủ sản phẩm.

## Câu hỏi chương này trả lời

Thanh bên (rail) của Mira sẽ chứa những mục nào khi giao diện được dựng lại? Mục nào luôn có, mục nào
chỉ có khi đang mở một tác phẩm, và các app gần với Mira sắp xếp thanh bên ra sao?

## Nguồn

| Nguồn | Đọc ngày | Độ tin |
| --- | --- | --- |
| LinguaGacha v0.127.1: [`navigation/schema.ts`](https://github.com/neavo/LinguaGacha/blob/main/src/frontend/app/navigation/schema.ts), [`app-sidebar.tsx`](https://github.com/neavo/LinguaGacha/blob/main/src/frontend/app/shell/app-sidebar.tsx), `PRODUCT.md`, file ngôn ngữ zh-CN; bản cũ [v0.60](https://github.com/neavo/LinguaGacha/blob/MANUAL_BUILD_v0.60.0/frontend/AppFluentWindow.py) | 2026-10-08 | Đọc mã nguồn |
| Ảnh chụp LinguaGacha v0.104.0 chủ sản phẩm gửi | 2026-10-08 | Quan sát |
| Novelcrafter: [bố cục app](https://www.novelcrafter.com/help/docs/app/app-layout), [quick start](https://www.novelcrafter.com/help/getting-started/quick-start/novelcrafter-layout) | 2026-10-08 | Tài liệu chính thức |
| Sudowrite: [Story Bible](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/what-is-story-bible/jmWepHcQdJetNrE991fjJC) | 2026-10-08 | Tài liệu, một phần |
| Crowdin: [giới thiệu](https://support.crowdin.com/crowdin-intro/); Smartcat: [workspace](https://smartcat-company.helpjuice.com/understanding-smartcat-workspaces); Phrase: [quick start cho người dịch](https://phrase.com/wp-content/uploads/2023/11/phrase-tms-quick-start-guide-linguists.pdf) | 2026-10-08 | Tài liệu, một phần |
| Obsidian: [Ribbon](https://obsidian.md/help/ribbon) và [phân tích Obsidian](../design-system/obsidian-comparison.md) | 2026-10-08 | Tài liệu cho đáy ribbon; phần đầu ribbon theo trí nhớ |
| Scrivener, memoQ, QuickTranslator | — | **Theo trí nhớ, chưa kiểm**; chỉ dùng làm đối chiếu |

## 1. LinguaGacha (quan sát)

LinguaGacha làm việc trên **một tệp dự án `.lg`** tạo từ các tệp nguồn kéo vào, không có thư viện tác
phẩm. Màn "工程主页" (trang dự án: tạo, mở, dự án gần đây) không nằm trên thanh bên. Khi chưa mở dự án,
các mục theo dự án bị **khoá chứ không ẩn**.

| Nhóm | Mục | Làm gì | Phạm vi |
| --- | --- | --- | --- |
| Dự án | 模型管理 Quản lý model | Model dựng sẵn và model tự thêm (OpenAI, Responses, Gemini, Anthropic), đăng nhập ChatGPT | Toàn app |
| Tác vụ | Agent | Chat trích thuật ngữ, dịch, hiệu đính; chỉ ghi vào dự án khi được duyệt (tay hoặc tự động); có skill, ảnh đính kèm, hàng đợi | Theo dự án |
| Tác vụ | 校对 Hiệu đính | Lưới nguồn/bản dịch có ngữ cảnh; sửa bản dịch và quy tắc | Theo dự án |
| Tác vụ | 工作台 Bàn làm việc | Dịch hàng loạt, tiến độ, lỗi, phân tích, xuất tệp | Theo dự án |
| Cài đặt | 基础设置 / 专家设置 Cơ bản / Nâng cao | Ngôn ngữ nguồn/đích; tham số nâng cao | Cơ bản theo dự án; nâng cao chưa rõ |
| Chất lượng | 技能 Skill (mới, không có trong ảnh v0.104) | Skill và tính cách của Agent | Có lẽ toàn app |
| Chất lượng | 术语表 Thuật ngữ | Tên riêng, thuật ngữ | Theo dự án |
| Chất lượng | 文本保护 Bảo vệ văn bản | Giữ nguyên mã, thẻ, biến | Theo dự án |
| Chất lượng | 文本替换 Thay thế: 译前 / 译后 | Thay chữ trước và sau khi gửi AI | Theo dự án |
| Chất lượng | 自定义提示词 Prompt tuỳ chỉnh | Thêm bối cảnh truyện, văn phong vào prompt (bản v0.60 tách prompt dịch và prompt phân tích) | Theo dự án |
| Khác | 实验室 Phòng thí nghiệm | Bật tắt tính năng thử: mức suy luận tự thích nghi, tăng cường prompt, bỏ qua câu nguồn trùng | Toàn app |

**Đáy thanh bên:** Nhật ký (chấm đỏ khi có mục mới), giao diện/theme, ngôn ngữ, hồ sơ và cập nhật.

**Đã bỏ từ v0.60:** trang Dịch và Phân tích riêng (gộp vào Bàn làm việc), và 百宝箱 Hộp công cụ (trích
trường tên vào glossary, chuyển phồn/giản).

## 2. Các app khác (quan sát)

| App | Thanh bên / điều hướng | Toàn app hay theo dự án |
| --- | --- | --- |
| **Novelcrafter** | Chuyển chế độ Lên ý / Viết / Chat / Duyệt. Thanh bên: Codex (bách khoa nhân vật, địa danh), Snippets, Chats; ghim được vào vùng làm việc. Đáy: Trợ giúp, Prompt, Xuất, trạng thái đồng bộ. Có nút về thư viện truyện | Theo truyện; thư viện prompt dùng chung |
| **Sudowrite** | Danh sách tài liệu/chương; dưới là Story Bible: ý tưởng, thể loại, văn phong, tóm tắt, nhân vật, thế giới, dàn ý, cảnh | Theo truyện |
| **Crowdin** | Cấp tài khoản: Dự án, Hoạt động, Việc của tôi. Trong dự án: Bảng điều khiển, Việc, Báo cáo, Hoạt động, Thảo luận; người quản lý thêm Nguồn, Bản dịch, Thành viên, Cài đặt (TM, glossary, AI) | Hai tầng |
| **Smartcat, Phrase** | Menu toàn app: Dự án, Việc, Bộ nhớ dịch, Thuật ngữ; cài đặt ở đáy hoặc hồ sơ | Hai tầng |
| **Obsidian** | Ribbon trên: chuyển nhanh, đồ thị, canvas, ghi chú ngày, mẫu, lệnh. Đáy: đổi vault, trợ giúp, cài đặt. Thanh bên trái: Tệp, Tìm, Đánh dấu | Theo vault |
| **Scrivener, memoQ** (chưa kiểm) | Binder Bản thảo / Tư liệu / Thùng rác; memoQ: Tổng quan, Bản dịch, TM, Thuật ngữ, Cài đặt trong dự án | Theo dự án |
| **QuickTranslator** (chưa kiểm) | Không có thanh bên; các khung Trung / Hán Việt / VietPhrase / Việt, từ điển sửa trong hộp thoại | Từ điển chung, Names theo truyện |

## 3. Mẫu lặp lại (quan sát)

- **Hai tầng là phổ biến nhất.** Một màn chính (thư viện, dashboard, chọn vault) để chọn dự án; sau đó
  thanh bên chỉ chứa mục của dự án đó. Novelcrafter, Crowdin, Phrase, memoQ, Obsidian đều vậy.
  LinguaGacha trộn mục toàn app (Quản lý model) với mục theo dự án; ổn vì chỉ có một dự án mở, nhưng
  người dùng khó biết mục nào thuộc phạm vi nào.
- **Động từ trước, danh từ sau.** Mục làm việc (viết, dịch, duyệt, chat) đứng trên; tư liệu (thuật ngữ,
  codex, prompt) đứng dưới; công cụ phụ và thí nghiệm ở cuối.
- **Đáy luôn là thứ toàn app.** Cài đặt, nhật ký, theme, ngôn ngữ, tài khoản, trợ giúp, đổi dự án.
- **Model và nhà cung cấp AI luôn toàn app.** Không app nào đặt theo dự án; LinguaGacha chỉ cho dự án
  chọn model nào dùng.
- **Kho tri thức truyện luôn theo truyện.** Glossary, Codex, Story Bible; CAT tool thì dùng chung rồi gắn
  vào dự án.
- **Cảnh báo cũ của Obsidian:** quá nhiều icon không nhãn trên ribbon gây "hiệu ứng buồng lái" cho người
  mới ([phân tích Obsidian](../design-system/obsidian-comparison.md#4-những-chỗ-không-nên-chép-từ-obsidian)).
  Rail của Mira cần tooltip và nên giữ ít mục.

## 4. Mira có những gì để đặt lên thanh bên

| Chức năng | Hiện trạng ngày 2026-10-08 | Phạm vi |
| --- | --- | --- |
| Thư viện tác phẩm | Giao diện đã gỡ để dựng lại; dữ liệu còn | Toàn app |
| Chương (danh sách + editor) | Chạy | Theo tác phẩm |
| Chat AI, đề xuất sửa | Chạy, nằm cạnh editor của từng chương | Theo chương |
| Thuật ngữ | Chạy | Theo tác phẩm |
| Nhân vật và xưng hô | Chạy | Theo tác phẩm |
| Văn phong | Ảnh mẫu | Theo tác phẩm |
| Nguồn (truyện gốc, tải chương) | Ảnh mẫu | Theo tác phẩm |
| Tác vụ (hàng đợi dịch nhiều chương) | Ảnh mẫu; thiết kế ở [phiên và tác vụ](../proposals/sessions-and-jobs.md) | Theo tác phẩm |
| Hàng duyệt trích xuất (AI đề xuất thuật ngữ, nhân vật) | Lộ trình, lát 4 của [Ngữ cảnh](../context/roadmap.md) | Theo tác phẩm |
| Nhập .txt, Xuất | Xuất chạy; nhập một phần | Theo tác phẩm |
| Model, kết nối AI | Chạy, nằm trong Cài đặt | Toàn app |
| Cài đặt, theme | Chạy | Toàn app |
| Nhật ký | Chưa có | Toàn app |

## 5. Đề xuất (chưa chốt)

Theo mẫu hai tầng: Thư viện là màn chính; khi mở một tác phẩm, rail hiện các mục của tác phẩm đó.

| Vị trí | Mục | Ghi chú |
| --- | --- | --- |
| Đầu rail | **Thư viện** | Về danh sách tác phẩm; có thể kèm ô chuyển nhanh tác phẩm (như đổi vault của Obsidian), thay cho dải tab đã gỡ |
| Nhóm làm việc | **Chương** | Danh sách chương + editor + chat AI. Không tách Chat thành mục riêng vì chat của Mira gắn với chương đang mở |
| | **Duyệt** | Tất cả đề xuất AI chưa duyệt của tác phẩm, gom từ mọi chương (tương đương 校对 của LinguaGacha và Review của Novelcrafter) |
| | **Tác vụ** | Hàng đợi dịch nhiều chương, tiến độ, lỗi (tương đương 工作台) |
| Nhóm ngữ cảnh | **Thuật ngữ** | |
| | **Nhân vật & xưng hô** | |
| | **Văn phong** | Hướng dẫn văn phong, prompt riêng của truyện (tương đương 自定义提示词) |
| | **Nguồn** | Nơi lấy chương gốc, nhập .txt |
| Đáy rail | **Cài đặt** (có Model và Kết nối AI bên trong), **theme**, **Nhật ký** (khi có), **Trợ giúp** | Mọi thứ toàn app |

**Chưa nên đặt bây giờ:**
- **Bảo vệ văn bản, thay thế trước/sau dịch:** LinguaGacha cần vì dịch game có mã và biến; truyện chữ ít
  cần. Nếu cần, gộp thành mục "Quy tắc" trong nhóm ngữ cảnh.
- **Phòng thí nghiệm, hộp công cụ:** LinguaGacha đã bỏ hộp công cụ. Tính năng thử để trong Cài đặt.
- **Bảng lệnh (command palette):** hữu ích nhưng là phím tắt, không cần icon trên rail.
- **Model như một mục riêng ở đầu rail** (cách của LinguaGacha): Mira đã có Model trong Cài đặt; đưa ra
  rail sẽ lặp lại chỗ trộn toàn app với theo tác phẩm.

**Câu hỏi cho chủ sản phẩm:**

1. Khi chưa mở tác phẩm nào, các mục theo tác phẩm **ẩn** hay **khoá** (như LinguaGacha)?
2. Rail chỉ có icon (44 px, tooltip) hay mở rộng được thành thanh có nhãn như ảnh LinguaGacha?
3. Chuyển giữa các tác phẩm đang làm bằng gì, khi dải tab đã bỏ: danh sách trong Thư viện, ô chuyển
   nhanh ở đầu rail, hay phím tắt?
4. "Duyệt" và "Tác vụ" có cần là mục riêng ngay từ đầu, hay chờ đến khi hàng đợi dịch được làm?

## 6. Kết luận

**Chốt ngày 2026-10-08:** Mira **không dùng rail điều hướng**. Đề xuất ở phần 5 không làm.

Lý do:

- **Ngoài một tác phẩm chỉ có hai đích:** Thư viện và Cài đặt. Cài đặt và đổi theme là nút ở cuối
  thanh trên; đường về Thư viện nằm trong từng màn (nút quay lại), vì breadcrumb cũng đã gỡ. Một cột 44 px cho hai ba icon là thừa.
- **Mọi việc còn lại nằm trong một tác phẩm.** Màn tác phẩm đã có các khu vực Chương, Ngữ cảnh, Nguồn,
  Tác vụ; đưa chúng lên rail chỉ là chuyển chỗ cùng một menu.
- **Người dịch ở trong màn Chương gần như suốt.** Thứ họ cần là thuật ngữ, xưng hô, đề xuất AI ngay
  cạnh editor, tức là panel bên cạnh, không phải nút rời khỏi chương.

Giữ lại: thanh trên (nút riêng của màn, theme, Cài đặt), cột danh
sách chương ở màn Chương, panel phải cho chat AI. Cân lại rail khi có thứ dùng chung vượt khỏi một
truyện và hay mở, như hàng đợi dịch cho nhiều truyện, nhật ký hay kho thuật ngữ dùng chung.

Đã triển khai trong [`AppShell.tsx`](../../../src/renderer/src/app/AppShell.tsx).

---

[Phiên làm việc theo tác phẩm](README.md) · [Mục lục module](../README.md) ·
[Hệ thiết kế](../design-system/README.md)
