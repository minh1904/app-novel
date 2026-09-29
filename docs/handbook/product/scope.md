# Scope v0.1 — Mira

Cập nhật: 2026-09-23. **Bản đề xuất để chốt roadmap**, không tự coi mọi mục dưới đây là yêu cầu đã được duyệt. Căn cứ đã chốt: app Windows với biên tập cốt lõi offline, dữ liệu app lưu nội bộ có xuất/backup, hai mode Toàn văn/Từng câu dùng chung nội dung, AI sau bản đầu, đề xuất căn chỉnh offline ngay P0. P0 hỗ trợ Anh/Trung giản thể và phồn thể/Nhật → Việt cho dịch giả truyện; sản phẩm cần có đường mở rộng sang dịch tài liệu về sau. Design system hiện hành nằm ở [design-system-v1.md](../experience/design-system.md), không lấy màu từ mockup gốc.

## 1. Bài toán và người dùng đầu tiên

Dịch giả cá nhân làm việc với truyện nhiều chương, có thể dịch tuần tự từng câu hoặc viết/sửa cả chương dưới dạng Markdown. Họ cần đọc bản gốc, duy trì giọng văn và thuật ngữ xuyên chương, chuyển mode mà không mất chữ hoặc làm sai liên kết câu. Họ có thể bắt đầu từ chỉ bản gốc hoặc nhập một bản dịch toàn văn đã có.

**Giá trị của bản đầu:** một workspace Windows lưu tại máy, cho phép nhập → dịch → kiểm tra → xuất chương; dữ liệu vẫn đọc/sửa/lưu được khi không có internet. AI thuộc giai đoạn sau; bản đầu không phụ thuộc AI hoặc kết nối mạng.

## 2. Scope bản dùng thử lõi (P0 — bắt buộc trước khi coi sản phẩm dùng được)

| Nhóm | Trong scope | Hành vi cần thấy |
| --- | --- | --- |
| Thư viện | Danh sách tác phẩm, tìm kiếm, tạo/đổi tên/lưu trữ; vào lại chương gần nhất | Có trạng thái thư viện trống và đã có dữ liệu; “Mở tác phẩm” khác “Tiếp tục dịch” |
| Cấu trúc truyện | Tác phẩm → danh sách chương; tạo, đổi tên, sắp xếp thủ công | Không bắt nhập cả tập để tạo tác phẩm |
| Nhập liệu | Dán văn bản hoặc nhập một chương TXT/MD cho bản gốc; bản dịch TXT/MD có sẵn là tùy chọn; preview trước khi lưu | Không dịch AI, không ép căn chỉnh lúc nhập |
| Mode Toàn văn | Bản gốc/bản dịch là hai văn bản dài song song; bản dịch sửa được bằng Markdown; xem đọc và sửa, undo/redo, tìm trong chương | Hai cột cuộn/chiều dài độc lập, không có số nối hoặc đường nối |
| Mode Từng câu | Bảng segment kiểu Smartcat: nguồn trái, đích phải; chọn/sửa hàng, tìm/lọc, trạng thái Chưa dịch/Đang dịch/Đã dịch/Cần kiểm tra | Có gộp/tách câu và nhóm 1:n, n:1; không bắt dịch 1:1 |
| Chuyển mode | Hai mode sửa cùng nội dung chương; chuyển qua lại giữ vị trí làm việc hợp lý | Sửa ở một mode hiện đúng ở mode kia, không nhân bản nội dung |
| Sửa lỗi bản gốc | Bản gốc chỉ đọc trong luồng dịch thường; có thao tác sửa lỗi nhập liệu riêng với lịch sử/hoàn tác | Sau khi sửa, liên kết bị ảnh hưởng cần kiểm tra lại; không sửa âm thầm |
| Căn chỉnh | Đề xuất liên kết offline cho bản dịch toàn văn có sẵn, tách câu theo ngôn ngữ, hàng đợi kiểm tra phần không chắc, chỉnh liên kết bằng tay | Văn bản gốc/dịch không bị hệ thống tự viết lại để ép khớp; chỗ chưa chắc hiển thị rõ |
| An toàn dữ liệu | Tự lưu local, lịch sử phiên bản tối thiểu, phục hồi sau đóng/crash, backup và restore, xuất bản dịch MD/TXT | Không mất nội dung đã lưu khi không có mạng |
| Tập trung | Ẩn/hiện điều hướng để vùng đọc rộng hơn; panel AI chỉ xuất hiện ở giai đoạn sau | Có lối trở lại workspace thường |
| Ngữ cảnh cơ bản | Từ điển tác phẩm tạo/sửa/tìm thủ công; tên nhân vật có thể ghi dưới dạng mục ngữ cảnh đơn giản | Gợi ý thuật ngữ theo mục có sẵn, chưa cần tự trích xuất |

**Markdown P0 đã chốt cách xem/sửa và định dạng:** Source editor và Reading view riêng, chưa cần Live Preview inline; nhập/xuất TXT và Markdown. Phạm vi cú pháp trong đề xuất: đoạn văn, tiêu đề, nhấn mạnh, dấu phân cách và lời thoại dạng văn bản. Bản đầu cần giữ nguyên cú pháp khi nhập/xuất trong phạm vi hỗ trợ. “Live Preview như Obsidian” là mục tiêu trải nghiệm, không ngầm cam kết tương thích toàn bộ plugin/cú pháp Obsidian. Obsidian phân biệt Reading, Live Preview và Source mode; UX cụ thể ở đây còn cần prototype. [Obsidian views/modes](https://obsidian.md/help/edit-and-read).

**Căn chỉnh P0 đã chốt mức hành vi:** đề xuất tự động chạy offline và cho phép kiểm tra/chỉnh tay; không tuyên bố chính xác tuyệt đối. Chỗ tự động tạo liên kết cần ghi nguồn gốc và có thể sửa. Tỷ lệ liên kết không phải tỷ lệ hoàn thành bản dịch. Chi tiết: [alignment-flow.md](../experience/alignment.md).

## Mockup để đối chiếu luồng

- [Workspace gốc](../../assets/original-workspace.png): tham khảo bố cục, không dùng palette/logo làm chuẩn.
- [Toàn văn](../../assets/mode-1-full-text.png) và [chế độ tập trung](../../assets/focus-mode.png): tham khảo hai pane độc lập, không có đường nối.
- [Từng câu](../../assets/mode-2-sentence-smartcat-inspired.png) và [ảnh Smartcat](../../assets/smartcat-reference.png): tham khảo editor theo hàng segment.
## 3. Lớp AI và ngữ cảnh mở rộng (P1 — sau khi P0 giữ dữ liệu tin cậy)

- AI Chat theo chương/vùng chọn: dịch, viết lại, giải thích, kiểm tra thuật ngữ. Khi mất mạng, panel hiển thị trạng thái không khả dụng nhưng editor vẫn hoạt động.
- AI chỉ tạo **đề xuất**; người dùng xem phần thay đổi rồi áp dụng/hoàn tác. Bản gốc mặc định chỉ đọc. Không để agent ghi đè âm thầm vào toàn chương.
- Ngữ cảnh có kiểm soát: câu/đoạn lân cận, từ điển, ghi chú nhân vật và hướng dẫn văn phong. Người dùng thấy phạm vi gửi đi; chưa mặc định đưa toàn bộ tác phẩm cho AI.
- Mở rộng hồ sơ nhân vật, thế giới quan, ghi chú văn phong; gợi ý nhất quán và QA. Benchmark cần mục tiêu đo riêng trước khi triển khai.

**Đã chốt:** AI thuộc giai đoạn sau P0. Chưa chốt AI local/offline, model/provider và chi phí của giai đoạn đó.

## 4. Ngoài scope bản đầu

- Cộng tác thời gian thực, tài khoản và đồng bộ nhiều thiết bị.
- Web/PWA, macOS, Linux, điện thoại.
- Tự động xuất bản lên nền tảng truyện, hệ thống bản quyền/đăng nhập nguồn, scraping hàng loạt.
- Dịch AI hàng loạt toàn tác phẩm mặc định, tự áp dụng không xem diff.
- Nhập EPUB/DOCX/PDF/OCR; nhập nhiều chương tự nhận biết cấu trúc; plugin Obsidian; tính năng định dạng Markdown tùy ý.
- Translation memory quy mô CAT chuyên nghiệp, workflow duyệt nhiều vai trò, marketplace dịch giả.
- Cam kết tự căn chỉnh hoàn hảo sau khi bản dịch đảo đoạn/viết lại gần như cả chương.

Các mục này có thể lên roadmap sau khi có nhu cầu và dữ liệu sử dụng; không bị coi là “không bao giờ làm”.

## 5. Luồng chính phải hoàn thành trọn vẹn

1. Từ [thư viện](../experience/first-run.md), tạo tác phẩm, chọn ngôn ngữ, thêm chương gốc; có thể thêm bản dịch toàn văn có sẵn.
2. Mở Toàn văn, viết/chỉnh bản dịch Markdown, đóng app, mở lại và tiếp tục đúng nội dung.
3. Vào Từng câu, xem liên kết được đề xuất, gộp/tách hoặc sửa vùng Cần kiểm tra, dịch một hàng, quay về Toàn văn và thấy bản dịch đúng.
4. Sửa toàn văn làm thay đổi ranh giới câu; hệ thống giữ nội dung, chỉ đánh dấu liên kết bị ảnh hưởng để kiểm tra.
5. Xuất bản dịch ra MD/TXT, backup/restore tác phẩm, làm lại các bước đọc/sửa khi offline.

## 6. Điều kiện nghiệm thu sản phẩm cho P0

- Các luồng ở mục 5 chạy **không cần internet**, trừ tính năng AI P1.
- Sau mỗi lần lưu/đóng/mở và backup/restore, nội dung bản gốc và bản dịch không bị mất/nhân đôi; trạng thái liên kết chưa chắc không tự biến thành đã xác nhận.
- Import → export giữ nội dung và Markdown thuộc phạm vi hỗ trợ; mọi thay đổi định dạng không thể giữ phải được báo trước khi áp dụng.
- Chuyển mode và thao tác gộp/tách có thể undo, hoặc phục hồi từ phiên bản trước trong trường hợp thay đổi lớn.
- UI vẫn dùng được với chương ngắn, chương dài, thoại, dấu ba chấm, tên riêng, bản dịch 1:n/n:1 và bản dịch bỏ/thêm câu. Chưa đặt ngưỡng hiệu năng cụ thể trước khi có bộ chương mẫu.
- Người dùng hiểu được sự khác nhau giữa **Chưa dịch**, **Đã dịch** và **Cần kiểm tra liên kết**. Không dùng một phần trăm mơ hồ để gộp cả ba.

## 7. Chi tiết cần làm rõ trước roadmap kỹ thuật

1. **Cặp ngôn ngữ P0 đã chốt:** Anh → Việt, Trung giản thể/phồn thể → Việt, Nhật → Việt. Còn cần bộ dữ liệu mẫu cho quy tắc tách câu và căn chỉnh của từng ngôn ngữ.
2. **Cách lưu nội bộ:** app quản lý dữ liệu và có xuất/backup đã chốt; còn cần chọn DB/package, cách biểu diễn Markdown và metadata căn chỉnh. Không yêu cầu thư mục Markdown do người dùng tự quản lý làm nguồn chuẩn P0.
3. **Markdown P0 đã chốt:** Source + Reading riêng; còn cần đặc tả phím tắt/chuyển view, cú pháp nhập/xuất và vị trí con trỏ.
4. **Bản gốc P0 đã chốt:** chỉ đọc trong luồng thường, có thao tác riêng để sửa lỗi nhập liệu với lịch sử/hoàn tác; còn cần đặc tả ảnh hưởng đến căn chỉnh.
5. **AI sau P0 đã chốt:** cần thiết kế về sau phạm vi tác vụ, quyền agent và cách duyệt diff; không là điều kiện nghiệm thu bản đầu.
6. **Backup và restore:** định dạng gói, phiên bản schema, phạm vi một tác phẩm/toàn thư viện và cách chọn nơi xuất.
7. **Bộ chương mẫu và ngưỡng chất lượng:** lấy chương thật có thoại/đa ngôn ngữ/bản dịch thoát ý để đánh giá tách câu, căn chỉnh và hiệu năng.

## 8. Mốc ra quyết định

Trước khi triển khai đầy đủ, làm một vertical slice: **một tác phẩm, một chương gốc, bản dịch viết toàn văn, chuyển sang bảng segment, sửa một câu, quay lại toàn văn, đóng/mở, backup/restore**. Nếu lát cắt này chưa giữ dữ liệu ổn định thì không mở rộng AI, nhân vật hay benchmark.

Tham khảo sản phẩm: [Smartcat editor và segment](https://help.smartcat.com/editor-functionalities-overview/) cho mode từng câu; [Crowdin editor](https://support.crowdin.com/online-editor/) cho cách tách editor segment và preview toàn file; [memoQ nhập bản đã review](https://docs.memoq.com/12-2/en/Workspace/import-reviewed-document.html) cho việc đối chiếu văn bản toàn phần với segment. Đây là tham khảo luồng, không sao chép giới hạn của các sản phẩm đó.

## 9. Hướng mở rộng sau P0 — dịch tài liệu

Người dùng xác nhận sản phẩm **có thể dịch docs về sau**, không chỉ novel. Điều này là định hướng mở rộng, **chưa đưa hỗ trợ tài liệu kỹ thuật đầy đủ vào P0**. P0 vẫn cần hoàn thiện luồng truyện nhiều chương, offline và chuyển Toàn văn/Từng câu an toàn trước khi mở loại nội dung mới.

Để không phải thay lõi dữ liệu sau này:

- Mô hình cấp cao nên là **project → document → content blocks**. Với truyện, project là tác phẩm và document là chương; với docs, project có thể là bộ tài liệu và document là trang/file. Nhãn UI đổi theo loại project, không buộc mọi thứ gọi là “tác phẩm/chương” trong schema.
- Văn bản gốc/dịch, ID khối, trạng thái dịch, lịch sử sửa và metadata căn chỉnh vẫn dùng chung. Quy tắc tách/căn chỉnh chọn theo loại nội dung; văn xuôi ưu tiên câu/đoạn, docs có thể cần tiêu đề, danh sách, bảng và khối mã làm ranh giới.
- Khi hỗ trợ Markdown docs, phải giữ cấu trúc, link, hình, code fence, inline code, placeholder và frontmatter. Không tự đưa các phần không cần dịch vào segment hoặc sửa chúng khi xuất. MDX, Docusaurus/VitePress/Docsify và cú pháp plugin cụ thể cần quyết định riêng; không ngầm coi là đã hỗ trợ.
- Luồng nhập/xuất docs có thể cần cây thư mục nhiều file và giữ đường dẫn tương đối. Đây là scope tương lai, không ép UI thư viện P0 phải giả vờ có tính năng đó.

Tên **Mira** đủ rộng cho định hướng translation workspace. Logo và tagline vẫn chưa chốt.

---

[Mục lục handbook](../README.md)
