# Bằng chứng và bản đồ nguồn

Cập nhật: 2026-10-04 · Trạng thái: chỉ mục truy xuất và tổng hợp nguồn đã nghiên cứu.
Chủ trì: nghiên cứu. Câu hỏi: mỗi hướng thiết kế đến từ đâu và đáng tin tới mức nào?

## Phạm vi của đợt tổ chức lại

Bộ này bao phủ các nhánh nghiên cứu liên quan trực tiếp tới module Ngữ cảnh, không chuyển toàn bộ nghiên cứu editor, provider hay thị trường thành chức năng module. Không nghiên cứu web lại trong đợt đóng tài liệu; ngày đọc, phạm vi đọc và revision công khai kế thừa từ báo cáo cũ. Khi chọn thư viện, tích hợp API hoặc làm corpus cần kiểm lại nguồn gốc, license và phiên bản.

Các link tới handbook/OpenSpec dưới đây phục vụ **truy nguồn**; nội dung chắt lọc để đọc theo module nằm trong thư mục này. Không xóa, sửa thành redirect hoặc ghi đè bản cũ trong đợt này.

## 1. Bản đồ tài liệu nội bộ

| ID | Nguồn còn giữ nguyên | Nội dung chuyển thành phần nào |
| --- | --- | --- |
| R01 | [Ngữ cảnh truyện](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/story-context.md) | sáu nhóm dữ liệu, khảo sát công cụ, 13 đề xuất → scope, glossary, style-and-memory, context-assembly |
| R02 | [Hệ thống ngữ cảnh](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/context-system.md) | cache, lọc mục, gán vai, mẫu, hàng duyệt và impact → context-assembly, characters-and-addressing, data-lifecycle |
| R03 | [Chia lô dịch](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/chunking-translation.md) | ngân sách, cảnh, đoạn trước, song song/retry → context-assembly và quality-and-evaluation |
| R04 | [Nhật → Việt](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/ja-vi-translation.md) | quy ước, kính ngữ, loại nguồn, rubric → characters-and-addressing, style-and-memory, quality-and-evaluation |
| R05 | [Repo dịch Việt Nam](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/vietnamese-translation-repos.md) | mẫu người dịch, code công cụ và giới hạn → glossary, characters-and-addressing, các bảng nguồn bên dưới |
| R06 | [Kế thừa nghiên cứu ban đầu](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/translation-research-lineage.md) | ba lớp dữ liệu, chứng cứ, thời gian/tiết lộ, phép T1–T7 → characters-and-addressing, style-and-memory, quality-and-evaluation |
| R07 | [Bản lưu 11/06/2026](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/archive/2026-06-11/README.md) | các nguyên lý còn dùng và giả định cần bỏ → bảng kế thừa bên dưới |
| R08 | [Chất lượng dịch](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/translation-quality.md) | kết quả B1/B2a và giới hạn → quality-and-evaluation; không nhập output AI làm mẫu |
| R09 | [Proposal context-core](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/context-core/proposal.md), [design](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/context-core/design.md), [tasks](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/context-core/tasks.md) | đề xuất triển khai cũ → data-lifecycle, context-assembly và danh sách cần rà lại ở roadmap |
| R10 | [Quyết định](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/product/decisions.md), [AI-first](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/engineering/ai-first-architecture.md), [roadmap cũ](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/delivery/roadmap.md), [hiện trạng cũ](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/engineering/current-state.md) | ràng buộc ứng dụng, phân module và phân biệt kế hoạch/hiện trạng → scope, roadmap |
| R11 | [AI chat](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/ai-chat-panel.md), [kiến trúc AI](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/ai-core-architecture.md), [công cụ dịch AI](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/ai-translation-tools.md), [provider](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/ai-provider-integration.md) | chỉ lấy ranh giới context–chat–provider và nguyên tắc người duyệt; không nhập toàn bộ gateway hay agent workflow |
| R12 | [Sổ nguồn](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/sources.md), [hệ sinh thái Việt Nam](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/vietnam-ecosystem.md) | đầu mối nguồn và bối cảnh, không dùng thống kê thị trường làm bằng chứng chất lượng dịch |

Các spec thành phần của R09 vẫn đọc được tại [story-context](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/context-core/specs/story-context/spec.md), [context-assembly](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/context-core/specs/context-assembly/spec.md), [context-compliance](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/context-core/specs/context-compliance/spec.md), [translation-provider](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/context-core/specs/translation-provider/spec.md), [content-model](https://github.com/minh1904/app-novel/blob/501be2a/openspec/changes/context-core/specs/content-model/spec.md). Chúng là delta của kế hoạch cũ, không phải bản xác nhận module đã chạy.

### Bao phủ các nhóm đề xuất cũ

| Nhóm gốc | Nơi tiếp nhận và cách xử lý |
| --- | --- |
| R01: L1–L6 và đề xuất 1–13 | scope phân sáu nhóm; các trang nghiệp vụ giữ phần hữu ích; phần duyệt, budget, snapshot được làm rõ ở data-lifecycle/context-assembly |
| R02: K1–K4 | context-assembly: thứ tự ổn định, cache, explicit cache và lọc glossary; số liệu provider không thành mặc định |
| R02: K5 | characters-and-addressing: gán vai là ứng viên, người nghe có độ chắc riêng |
| R02: K6 | style-and-memory: truy hồi và style note; tách AI được sửa khỏi corpus người dịch |
| R02: K7–K9 | glossary/data-lifecycle/context-assembly: hàng duyệt, ảnh hưởng đổi mục, context chat và snapshot |
| R02: V1–V6 | quality-and-evaluation E7/E2/E3/E6; kiểm vòng đời/ảnh hưởng ở data-lifecycle; chưa có số đo mới |
| R03: C1–C8 | context-assembly: ranh giới lô, dự phòng, cảnh, lân cận, retry và kiểm đầu ra; ngưỡng để thử, không chốt |
| R06: T1–T7 | quality-and-evaluation E2/E3/E4/E5/E8 và ca người thứ ba; không biến thành test đã chạy |
| R09: D1–D4 | data-lifecycle/glossary: schema logic, mốc, cast/cache, matching; rà unique alias và xóa mốc |
| R09: D5–D8 | data-lifecycle/context-assembly/quality-and-evaluation: hash, budget, từ cấm, cảnh báo; không coi regex là bằng chứng nghĩa |
| R09: D9–D12 | scope/data-lifecycle/context-assembly: recording mock, hợp đồng provider, nơi ghi lần gọi và hàm thuần; không tự tạo bảng hay nối UI |

## 2. Nguồn người dịch: ưu tiên nhưng chưa là gold

| Nguồn và revision đã khảo sát | Đã biết | Chưa được kết luận |
| --- | --- | --- |
| [Prima Doll Encore](https://github.com/vnkeyfc/primadoll/blob/3b69af9a1f716194e21c637debd981352c47acb7/.translate/novel_01.txt) | phần đầu tệp có cặp JP–VN theo ID; credit Tennouji Akane, hiệu đính Minata Hatsune; có tên/ruby/chú thích | chưa kiểm toàn chương, phiên bản nguyên tác và quyền đóng corpus; ID của nguồn mẫu không buộc app có ID câu vĩnh viễn |
| [CLANNAD ngoại truyện](https://github.com/vnkeyfc/clannad-ngoai-truyen/tree/2d5eb0ab65de07b58cc29f4b6971359927ce9a89) | có phân công dịch/QC; phần đầu script đã đọc là Việt–Anh | không gọi là mẫu song song Nhật–Việt đã xác minh, không suy toàn dự án dịch vòng |
| [AIR Việt hóa](https://github.com/vnkeyfc/air-viet-hoa/tree/c1b70e2a9a899e27e9297447b269a805b63e4486) | đầu mối repo và script | chưa đủ metadata để chọn mẫu |
| [Higurashi — dự án Việt](https://www.baka-tsuki.org/project/index.php?title=Higurashi_no_Naku_Koro_ni_(Vi%E1%BB%87t_Nam)) và [Hồi 01](https://www.baka-tsuki.org/project/index.php?title=Higurashi_(Viet):Onikakushi-hen_Chapter_01) | trang ghi người dịch Nhật; phần đầu Việt có lời kể/thoại khác giọng, hai chiều khác nhau, hậu tố cùng tồn tại với dấu thoại Việt | chưa đối chiếu Nhật; không suy quy ước phổ biến/tối ưu từ một mẫu |
| Hako và bản phát hành có bản quyền trong R04 | quy định, mô tả dự án/metadata dịch giả | chưa đọc được thân chương Hako và chưa có mẫu phát hành hợp pháp đủ đối chiếu; không bịa kết luận phong cách NXB |
| Trao đổi `#trans` người dùng cung cấp | nhiều ý kiến ủng hộ lựa chọn linh hoạt và thống nhất | không URL, không mẫu đại diện; không dùng làm thống kê hoặc luật “-san = chị” |

## 3. Repo công cụ tiếng Việt: học kỹ thuật, không lấy output làm mẫu

| Nguồn ghim revision | Bài học giữ lại | Giới hạn |
| --- | --- | --- |
| [ln-vn-translator](https://github.com/hadeskers/ln-vn-translator/tree/02c2a893d1b3375e7ae0b106b92f092967e7beda) | tách quy ước tác phẩm khỏi chỉ dẫn chung | điểm thân mật/archetype là heuristic; “golden samples” chưa có provenance phù hợp |
| [MTLS](https://github.com/thang97-21/MTLS/tree/fed2f7093eebc27e09e72d1fb10ee4b063ee0b07) | báo drift đại từ, khóa thuật ngữ | đếm token/regex không phân vai chắc chắn; fuzzy sửa tên có rủi ro |
| [TranslateBooksWithLLMs — RAG context](https://github.com/windfox1243/TranslateBooksWithLLMs---RAG-context/tree/bab2ffd6a9aa8f5c4d72f3b5897b96bab2bc6256) | dữ liệu nhân vật/alias, tự xưng/cách gọi và trạng thái chưa biết | code trích xuất đã xem thiên về tiếng Anh, chưa xác nhận cho Nhật |
| [API_dich_truyen](https://github.com/caoduongle/API_dich_truyen/tree/54372da54467c00bf516545ae8a97f7dacd43d54) | glossary, kiểm sau dịch, prompt tách phần | miền Trung–Việt; thay trước nguồn không phải mẫu mặc định Nhật–Việt |

Đây là phân tích tĩnh từ đợt nghiên cứu trước, không chạy mã repo bên ngoài trong đợt tổng hợp này. “Nhắm tới tiếng Việt” không tự chứng minh quốc tịch tác giả hoặc chất lượng dịch.

## 4. Nguồn quốc tế: kế thừa cơ chế, không bê kết quả số

- **Glossary:** GalTransl, AiNiee, LinguaGacha, Sakura, OpenNovel trong R01/R02 → mục có ghi chú, lọc theo nguồn, hàng duyệt. Không mặc định tin mục tự sinh.
- **Lore/context:** NovelAI, SillyTavern, Novelcrafter trong R01 → kích hoạt, ngân sách, quan hệ có chiều và diễn biến; không nhập cơ chế roleplay, xác suất hoặc đệ quy chỉ vì sản phẩm khác có.
- **Trích xuất:** KeywordGacha, translate-book, NyaaReader, memoQ trong R02 → bằng chứng, tần suất, khóa mục, nhớ mục đã loại. Tình trạng license cần kiểm lại trước tái sử dụng code; học ý tưởng không đồng nghĩa được sao chép.
- **Truy hồi mẫu:** Google Adaptive Translation, Phrase, Lokalise, memoQ, Crowdin trong R02 → tìm mẫu liên quan/TM; nhãn reviewed không bảo đảm bản người viết độc lập. Số mẫu vendor khuyên không phải ngưỡng Mira.
- **Nghiên cứu memory/few-shot:** DelTA, Moslem, Agrawal, CIPHER và các bài ngữ cảnh dài trong R01/R02 → giả thuyết về chuẩn bị, chọn mẫu và nhiễu. Miền/cặp ngôn ngữ và độ sâu đọc khác nhau; chưa chứng minh hiệu quả Nhật–Việt.
- **Gán vai:** PDNC, JY-QuotePlus và các bài được R02 tổng hợp → phải đo người nói và người nghe riêng; tỷ lệ trên Anh/Trung không là dự báo cho Mira.

Một issue người dùng LinguaGacha báo nhiều ứng viên bị loại là tín hiệu cần hàng duyệt, không phải tỷ lệ nhiễu đại diện. Tuyên bố “nhất quán 100%” ở README hoặc nhận định “không ai làm quan hệ” không phải kết quả đối chứng.

### Nguồn ngôn ngữ bổ sung có định danh

| Nguồn | Mức đọc trong R06 | Hệ quả có thể rút, trong giới hạn |
| --- | --- | --- |
| [CEJC — NINJAL](https://www2.ninjal.ac.jp/conversation/cejc/data_relation.html) | trang hướng dẫn | metadata quan hệ không có nghĩa có người nhận từng phát ngôn |
| [KeiCO, 2022](https://aclanthology.org/2022.dclrl-1.3/) | metadata/tóm tắt | cần xem vai xã hội; không phải corpus văn học Nhật–Việt |
| [Sekizawa và Yanaka, 2024](https://www.jstage.jst.go.jp/article/jnlp/31/3/31_1292/_article/-char/en) | metadata/tóm tắt | đưa câu phức và kính ngữ vào ca kiểm; không ngoại suy điểm model hiện tại |
| [Minh thị hóa Nhật–Việt, 2016](https://www.jstage.jst.go.jp/article/its/16/0/16_1603/_article/-char/ja/) | metadata/tóm tắt | tách phục hồi phần lược có căn cứ khỏi thêm sự kiện; miền phiên dịch khác văn học |

## 5. Kế thừa bản tháng 6 có chọn lọc

Bản lưu bắt nguồn từ commit `9244b076b6e1d5f2f1ffd63d2b36b4c60a6911e2`; tám tài liệu được phục hồi trong R07, không phục hồi code cũ.

| Tệp trong bản lưu | Giữ lại | Không nâng thành quy tắc hiện tại |
| --- | --- | --- |
| [Prompt engineering](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/archive/2026-06-11/docs/03-ai/prompt-engineering.md) | phân lớp chỉ dẫn, glossary, context | ưu thế role message chưa đo, ví dụ không rõ provenance, mặc định bỏ hậu tố |
| [Vietnamese honorifics](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/archive/2026-06-11/docs/03-ai/vietnamese-honorifics.md) | cặp có chiều, biến thể theo cảnh | ánh xạ tuổi/giới cứng và đại từ “trung tính” luôn đúng |
| [Quality evaluation](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/archive/2026-06-11/docs/03-ai/quality-evaluation.md) | MQM-lite, vòng đời issue, bằng chứng | độ dài tự là lỗi critical, auto-repair không duyệt |
| [Brainstorm](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/archive/2026-06-11/docs/04-research/brainstorm-prompt-improvements.md) | A: đo input/output, memory/preset/nhãn; B: thực thể, CJK, quan hệ, truy hồi; C: thích ứng, rà lại, nhiều phương án | auto-memory từ output, thay CJK ngầm, ensemble/agent không thuộc v1; các hướng chưa đo vẫn là ý tưởng |
| [Prompt injection analysis](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/archive/2026-06-11/docs/04-research/prompt-injection-analysis.md) | xem cách công cụ tổ chức dữ liệu đưa vào prompt | “không ai có quan hệ/xưng hô” và đồng thuận về role prompt không đủ bằng chứng |
| [LLM integration](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/archive/2026-06-11/docs/03-ai/llm-integration.md), [README AI](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/archive/2026-06-11/docs/03-ai/README.md), [README research](https://github.com/minh1904/app-novel/blob/501be2a/docs/handbook/research/archive/2026-06-11/docs/04-research/README.md) | lịch sử và đường dẫn truy nguyên | API, cấu hình, chi phí hoặc kiến trúc đời cũ không thành phạm vi module |

## 6. Cách bổ sung nguồn về sau

Ghi URL/revision, ngày thực đọc, phần đã đọc, bằng chứng cụ thể, giới hạn, quyền sử dụng và kết luận nào bị thay. Cập nhật trang nghiệp vụ chịu trách nhiệm, không chỉ thêm link vào bảng. Nghiên cứu mới không tự biến đề xuất thành quyết định; triển khai phải có bằng chứng code/test riêng.

Ưu tiên lấp khoảng trống đối chiếu Nhật–Việt người dịch và đo trên Mira. Không cần tăng số repo để làm tài liệu trông đầy hơn.

[Về mục lục](README.md)
