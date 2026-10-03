# Bối cảnh thị trường công cụ dịch truyện

Ngày khảo sát: **2026-09-29** · Trạng thái: nghiên cứu tài liệu công khai. Chủ trì: research/product. [Sổ nguồn](sources.md) · [Mapping với Mira](feature-map.md).

## Phạm vi và độ tin cậy

Khảo sát 11 sản phẩm/dự án đại diện và một trường hợp QuickTranslator cần thận trọng khi phân loại. Mẫu chọn theo công việc liên quan: dịch truyện, sửa bản dịch, đọc ebook song ngữ, CAT và công cụ cho Trung–Việt. Đây là bản đồ cạnh tranh định tính, **không phải thống kê toàn thị trường, xếp hạng chất lượng dịch hay dữ liệu thị phần**.

Chỉ dùng website, tài liệu hoặc repository của đơn vị phát triển cho các nhận định chức năng. Chưa cài/chạy đối thủ, chưa trả phí hoặc benchmark trên cùng chương. “Chưa xác minh” không có nghĩa là “không có”. Số sao GitHub, lời quảng cáo và chữ “AI” không được dùng làm thước đo chất lượng dịch Việt.

**Phân loại:** nguồn mở phải có giấy phép công khai, không chỉ có repo; dịch vụ thương mại có thể dùng thành phần nguồn mở. Nhóm “nguồn đóng/dịch vụ thương mại” dưới đây so sánh sản phẩm người dùng tiếp cận, không khẳng định toàn bộ dependency của họ là độc quyền. OpenNovel chưa tìm được giấy phép/repo chính thức cho toàn dịch vụ trong lượt khảo sát; chữ “Open” trong tên không chứng minh nguồn mở.

## Bốn nhóm công việc cạnh tranh

| Nhóm | Người dùng tìm đến để | Mira học gì | Giới hạn so sánh |
| --- | --- | --- | --- |
| Công cụ truyện và convert | Đọc/dịch chương, quản lý tên và thuật ngữ | Ngữ cảnh tác phẩm, xưng hô, chương | Nhu cầu đọc nhanh khác biên tập bản dịch |
| CAT/TMS | Kiểm soát segment, thuật ngữ, bộ nhớ dịch, quy trình | Điều hướng, xác nhận, sửa liên kết | Quy trình doanh nghiệp có thể quá nặng cho cá nhân |
| Dịch ebook | Đưa sách vào, nhận bản dịch/song ngữ | Tiến trình, tiếp tục tác vụ, định dạng đầu ra | Batch translation không chứng minh editor hai mode |
| Editor + công cụ dịch rời | Đọc nguồn, viết trong editor quen, tra cứu bên ngoài | Nhịp viết và quyền kiểm soát văn bản | Chi phí chuyển ứng dụng là giả thuyết cần quan sát |

Nhóm cuối là **phương án thay thế cần phỏng vấn**, chưa có dữ liệu khẳng định mức phổ biến. Không mặc định mọi dịch giả đều muốn một app tích hợp.

## Nguồn đóng / dịch vụ thương mại

| Công cụ | Bối cảnh và chức năng được tài liệu hóa | Mạng / chi phí / giới hạn bằng chứng | Bài học cho Mira |
| --- | --- | --- | --- |
| **OpenNovel** | Dịch truyện theo chương; glossary tách nhân vật, danh xưng, thuật ngữ; có sửa bản dịch và nhập EPUB. [Glossary](https://www.opennovel.co/docs/glossary), [editor](https://www.opennovel.co/docs/editing-translations), [EPUB](https://www.opennovel.co/docs/translating-epubs). | Dịch vụ có gói và credits; chưa xác minh editor offline hoặc giấy phép mã toàn sản phẩm. [Pricing](https://www.opennovel.co/pricing). | Ngữ cảnh xuyên chương đáng ưu tiên; không đưa dịch AI hàng loạt vào P0 chỉ vì đối thủ có. |
| **Immersive Translate** | Công cụ đọc/dịch song ngữ; tài liệu mô tả đọc ebook và tạo EPUB song ngữ. [EPUB](https://immersivetranslate.com/docs/features/epub/). | Tài liệu license Android phân biệt phần độc quyền và thành phần mở; không suy rộng sang mọi phiên bản. Mạng và chi phí dịch tùy engine/gói, chưa đo. [License](https://immersivetranslate.com/docs/android-license/). | Tham khảo trải nghiệm đọc; chưa có bằng chứng cho round-trip Markdown tự do ↔ segment như Mira cần. |
| **Smartcat** | CAT editor độc quyền: nguồn/đích theo segment, xác nhận, TM, AI, glossary, QA và lịch sử. [Editor](https://help.smartcat.com/editor-functionalities-overview/). | Truy cập qua workspace dịch vụ; chưa kiểm tra quyền theo gói hoặc offline. | Học điều hướng/xác nhận và phân biệt nguồn gợi ý; giảm phần quản trị nhóm trong UI cá nhân. |
| **memoQ** | CAT desktop thương mại; Alignment Editor cho xem/sửa các liên kết nguồn–đích. [Alignment](https://docs.memoq.com/current/en/Workspace/alignment-editor.html). | Cần license; tài nguyên server và điều kiện sử dụng phụ thuộc cách cấp phép. Chưa kiểm tra một phiên làm việc offline. [License](https://support.memoq.com/hc/en-us/articles/16294778225810-Choose-your-memoQ-translator-pro-license). | Căn chỉnh là tác vụ có review, không phải thao tác vô hình. |
| **Phrase TMS** | Editor segment và preview; Desktop Editor có làm việc offline nhưng bị giới hạn tài nguyên TM/TB/MT/QA. [Desktop](https://support.phrase.com/hc/en-us/articles/5709683873052-CAT-Desktop-Editor-TMS), [segments](https://support.phrase.com/hc/en-us/articles/5709678012828-Segments-TMS). | Sản phẩm TMS thương mại; quyền truy cập desktop cần kiểm tra theo tài khoản. | Không thể định vị Mira bằng khẳng định “CAT không offline”; cần đo sự đơn giản và vòng biên tập. |
| **Crowdin** | Editor localization với nhiều cách xem và in-context preview. [Editor](https://support.crowdin.com/online-editor/). | Dịch vụ online; chưa xác minh đầy đủ chi phí/gói. Open-source integrations không đồng nghĩa toàn nền tảng mở. | Tham khảo chuyển vùng đang sửa ↔ ngữ cảnh; preview không tự đồng nghĩa editor toàn văn tự do. |

## Nguồn mở

| Công cụ / giấy phép công bố | Bối cảnh và chức năng | Triển khai / giới hạn | Bài học cho Mira |
| --- | --- | --- | --- |
| **OmegaT — GPL-3.0** | CAT desktop Windows/macOS/Linux; fuzzy matching, TM, glossary, nhiều định dạng. [Dự án](https://omegat.org/). | Phần mềm miễn phí; dịch vụ MT tích hợp là phụ thuộc riêng. Chưa benchmark cặp Việt hoặc hai mode theo yêu cầu Mira. | Offline/local và glossary không phải khoảng trống mới; học khả năng mang dữ liệu dịch đi. |
| **MateCat — LGPL** | CAT web nguồn mở; editor phân biệt translation unit với segment, tìm/lọc, xuất tài liệu/TMX/XLIFF. [Editor](https://guides.matecat.com/translationeditor), [repo](https://github.com/matecat/MateCat), [license](https://site.matecat.com/terms). | Tự host cần vận hành stack; không đồng nghĩa có app desktop offline sẵn. Tài liệu giới hạn gộp lại các phần từng tách. [Split/merge](https://guides.matecat.com/splitting-and-merging-segments). | Tách khối tài liệu với câu; không sao chép giới hạn gộp của CAT vào văn học. |
| **Ebook Translator / Bookfere — GPL-3.0** | Plugin Calibre; advanced/batch, nhiều engine, cache kết quả khi gián đoạn. [Repo](https://github.com/bookfere/Ebook-Translator-Calibre-Plugin). | App host local nhưng engine có thể cần mạng và phí; hỗ trợ định dạng dựa trên Calibre. | Học phục hồi tiến trình và không mất kết quả; EPUB vẫn để sau P0. |
| **Bilingual Book Maker — MIT** | Pipeline tạo sách song ngữ từ EPUB và các dạng văn bản, cấu hình engine/prompt. [Repo](https://github.com/yihong0618/bilingual_book_maker). | Công cụ Python/CLI, phụ thuộc môi trường và endpoint; mã nguồn mở không đảm bảo miễn phí inference hoặc offline. | Tham khảo pipeline dịch/xuất ở P1+, không dùng làm bằng chứng về UX editor. |
| **NovelKit — GPLv3** | Web/desktop Trung–Việt: format văn bản, chia chương, dịch từ điển VietPhrase/Name/Hán Việt. [Repo](https://github.com/thiendiepdt/novelkit). | README ghi đang phát triển, chưa release chính thức. Công cụ local và chức năng kết nối nền tảng cần phân biệt; chưa chạy thử. | Đối chiếu gần với người dùng Việt; học quản lý tên và thao tác trên văn bản, không đưa uploader vào P0. |

Giấy phép trên là nhãn dự án công bố tại thời điểm đọc, không phải quyết định tích hợp code. Nếu chọn reuse, phải kiểm tra LICENSE tại commit được chọn và từng dependency/dataset; hiện chưa lấy code đối thủ vào Mira.

### QuickTranslator và các bản tái hiện

Chưa đủ nguồn chính chủ để gắn một nhãn nguồn đóng/mở chung cho mọi bản QuickTranslator lưu hành. Không gọi bản decompile là nguồn mở chỉ vì tải được mã. Repository [quick-translator-engine](https://github.com/thiendiepdt/quick-translator-engine) tự mô tả là bản tái hiện Rust của QT2025: code Rust GPL-3.0-only, còn dữ liệu và mã tham chiếu có nguồn gốc riêng; chưa hoàn tất golden test đối chiếu đầy đủ. Đây là nguồn nghiên cứu cơ chế từ điển, **không phải xác nhận chất lượng hoặc quyền phân phối của QuickTranslator gốc**.

## Hàm ý cạnh tranh — suy luận cho Mira

1. **Ngữ cảnh là giá trị thực dụng:** tên và danh xưng cần nhất quán xuyên chương. Từ điển tác phẩm thủ công phù hợp P0 hơn việc xây AI memory trước khi editor ổn định.
2. **Hai mode là điểm khó cần chứng minh:** tài liệu đối thủ chứng minh segment, preview hoặc batch; chưa chứng minh chính tổ hợp round-trip tự do mà Mira đặt ra. Không được nâng điều này thành tuyên bố “duy nhất thị trường”. *(Cập nhật 2026-10-03, [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md): Mira bỏ mode Từng câu và không còn đặt cược vào round-trip giữa hai mode; điểm khó nay là duyệt đề xuất AI ngay trong một editor Toàn văn. Nhận xét về tài liệu đối thủ vẫn đúng.)*
3. **Niềm tin dữ liệu là điều kiện dùng lâu:** lưu/mở lại, export và restore phải có demo kiểm chứng; UI đẹp không bù được mất bản dịch.
4. **Đừng cạnh tranh bằng số engine:** AI sau P0 vẫn phù hợp mục tiêu hiện tại. *(Cập nhật: từ 2026-09-29 [ADR-002](../decisions/0002-ai-first-translation.md) đã đưa AI dịch từ raw thành luồng chính của bản đầu; ý "đừng cạnh tranh bằng số engine" vẫn đúng.)* Nếu người dùng chủ yếu cần đọc dịch ngay, Mira có thể không phải lựa chọn đúng; phỏng vấn phải cho phép kết luận đó.
5. **Thị trường Việt cần quan sát riêng:** chất lượng xưng hô, tên Hán Việt, tiếng Việt IME và bản dịch thoát ý phải có corpus; hỗ trợ một ngôn ngữ trên danh sách không chứng minh chất lượng văn học.

## Kinh tế sản phẩm và khoảng trống nghiên cứu

Chi phí cần so sánh gồm license/subscription, credits/API, thời gian thiết lập, công sửa bản dịch/liên kết và vận hành backup. Không ghi bảng giá số vì chưa đồng nhất gói, thuế, hạn mức, cặp ngôn ngữ hoặc cùng khối lượng công việc. Chưa có căn cứ TAM/SAM/SOM hoặc khả năng trả tiền của dịch giả Việt.

Đợt tiếp theo: chạy cùng corpus trên một CAT desktop, một công cụ truyện và một pipeline ebook; đo thời gian hoàn thành và công sửa, kiểm tra mất mạng/export, ghi đúng phiên bản/gói. Mở rộng Trados, Wordfast và công cụ cộng đồng Việt khác khi có đối tượng phỏng vấn dùng chúng; không coi danh sách hiện tại là đầy đủ. [Kế hoạch kiểm chứng](../delivery/validation.md).

---

[Mục lục handbook](../README.md)
