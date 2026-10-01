# Backlog tính năng chưa triển khai

Cập nhật: 2026-10-01 · Trạng thái: **đang dùng** · Chủ trì: chủ sản phẩm · Trả lời câu hỏi: *còn tính năng nào chưa làm, cái nào đã có hình trên giao diện, và điều kiện để làm thật?*

Trang này là nơi duy nhất liệt kê các tính năng đã được cân nhắc nhưng chưa có hành vi thật. Thứ tự ưu tiên và mốc nằm ở [roadmap](roadmap.md); ranh giới sản phẩm ở [scope](../product/scope.md). Nguồn so sánh sản phẩm khác: [nghiên cứu màn chi tiết](../research/work-detail-screen.md).

## Quy ước

| Trạng thái | Ý nghĩa |
| --- | --- |
| **Chỉ minh họa** | Có hành động trên giao diện với nhãn “Sắp có” và dữ liệu mẫu cố định; không đọc tệp, không gọi IPC, không ghi dữ liệu. Mỗi mục `id` ở đây khớp một mục trong `mockFeatures` của code. |
| **Backlog** | Chưa có gì trên giao diện. |
| **Không làm (hiện tại)** | Đã cân nhắc và loại, kèm lý do; có thể mở lại. |
| **Đã triển khai** | Chuyển mục sang đây khi code và kiểm tra đã có; dẫn change/commit và gỡ nhãn “Sắp có”. |

Quy tắc: nút hay mục menu “Sắp có” trên giao diện phải có mục ở đây; mục minh họa không tạo tab, khu vực hay màn giữ chỗ (xem requirement “Tính năng chưa triển khai chỉ hiện dưới dạng minh họa” của change `work-detail-screen`).

## Màn chi tiết tác phẩm

| `id` | Tính năng | Trạng thái | Trên giao diện hiện nay | Điều kiện để làm thật / câu hỏi còn mở |
| --- | --- | --- | --- | --- |
| `import-txt` | Nhập nhiều chương từ tệp `.txt` | **Chỉ minh họa** | Nút “Nhập từ .txt” cạnh “Thêm chương” và trong trạng thái trống; hộp thoại minh họa các bước chọn tệp → quy tắc tách chương → xem trước → nhập (vô hiệu). | Quy tắc tách chương (đề xuất kiểu Hako: dòng bắt đầu bằng `***` là tên chương; cần xác nhận định dạng thật), mã hóa tệp, giới hạn kích thước, chương trùng/đã có, xem trước và hoàn tác. Nên tách thành change riêng ngay sau `work-detail-screen`; nguồn raw ở cấp tác phẩm thuộc khu vực Nguồn. |
| `chapter-content-presence` | Cột “có raw / có bản dịch” trên hàng chương | Backlog | Chưa có cột; **dữ liệu đã có** (`hasSource`, `hasTarget` trong danh sách chương, dùng cho cảnh báo ở hộp xóa chương). | Chỉ còn phần giao diện. Là sự kiện (có hay không), không phải trạng thái quy trình, nên không vi phạm loại trừ trạng thái theo chương. |
| `library-backup` | Sao lưu cả thư viện một lần | Backlog | Chưa có (chỉ sao lưu từng tác phẩm). | Cần quyết định định dạng (nhiều tệp hay một gói) và hành vi khôi phục hàng loạt. |
| `auto-backup` | Sao lưu định kỳ / trước thao tác nguy hiểm | Backlog | Chưa có; hộp xóa chương chỉ gợi ý sao lưu thủ công. | Cần nơi lưu mặc định, số bản giữ lại và thông báo khi thất bại. |
| `restore-rename` | Phân biệt bản khôi phục trùng tên | Backlog | Khôi phục bản sao của tác phẩm còn trong thư viện cho hai mục cùng tên và cùng mốc thời gian. | Cân nhắc gắn "(bản khôi phục)" hoặc cho đổi tên ngay trong thông báo; cần chủ sản phẩm chọn. |
| `context-area` | Khu vực **Ngữ cảnh** (Thuật ngữ · Xưng hô · Văn phong) | **Chỉ minh họa** | Tab “Ngữ cảnh · Sắp có” trên màn chi tiết; ba tab con Xưng hô (mặc định, có hàng mẫu “Chờ duyệt” minh họa AI đề xuất đổi cách xưng)/Thuật ngữ/Văn phong, dữ liệu mẫu cố định, không thao tác được (`ContextAreaMock`). | Thuộc change `work-area-navigation`; thay phần minh họa bằng màn thật từng mục khi có (xưng hô là nỗi đau P0 trong [câu hỏi mở](../product/open-questions.md)). |
| `sources-area` | Khu vực **Nguồn** (nhiều bản raw, nguồn chính, nhập raw) | **Chỉ minh họa** | Tab “Nguồn · Sắp có” với danh sách thẻ nguồn mẫu (badge “Nguồn chính”, thanh tiến độ số chương khớp); không nhập được gì (`SourcesAreaMock`). | Cần mô hình nhiều nguồn raw và ghép chương giữa các nguồn (câu hỏi P0 trong [câu hỏi mở](../product/open-questions.md)). |
| `jobs-area` | Khu vực **Tác vụ** (lượt AI dịch, lỗi, lịch sử) | **Chỉ minh họa** | Tab “Tác vụ · Sắp có” với bảng tác vụ mẫu (đang chạy có thanh tiến độ, lỗi có nút “Chạy lại”, hoàn tất có chi phí); không có job thật (`JobsAreaMock`). | Cần provider và hàng đợi dịch (change `content-backup-provider` và sau đó). |
| `chapter-progress` | Tóm tắt tiến độ “N chương, M đã dịch” | Backlog | Chưa có. | Chỉ suy ra từ việc có nội dung bản dịch, không từ trạng thái lưu riêng; cần nội dung chương và đếm đoạn/từ. |
| `chapter-groups` | Nhóm chương theo Tập | Backlog | Chưa có (danh sách phẳng, đã chốt 2026-10-01). | Khi có nhu cầu thật; chương đã có ID riêng nên thêm nhóm không phải làm lại. Hako, Kakuyomu có. |
| `chapter-source-label` | Số chương gốc / nhãn nguồn (101, “Ngoại truyện”) | Backlog | Chưa có (ghi vào tên chương, đã chốt 2026-10-01). | Thêm trường riêng bằng migration nếu việc ghi vào tên gây bất tiện thật. |
| `chapter-trash` | Thùng rác / hoàn tác xóa chương | Backlog | Chưa có (xóa kèm xác nhận, không hoàn tác). | Bắt buộc cân nhắc khi chương có nội dung; Webnovel có Thùng rác, Wattpad xóa vĩnh viễn. |
| `last-opened-at` | Tách “lần mở gần nhất” khỏi `updated_at` | Backlog | Chưa có. | Nếu việc mở xem một chương đẩy tác phẩm lên đầu “Gần đây” gây phiền; cần migration. |
| `chapter-status-label` | Trạng thái / nhãn tự đặt theo chương (kiểu Scrivener) | Không làm (hiện tại) | Chưa có. | Ngoài phạm vi M0; nếu làm thì là văn bản người dùng tự đặt, không phải danh sách cố định. |
| `chapter-drag-drop` | Kéo thả sắp xếp chương | Không làm (hiện tại) | Chưa có; dùng menu và “Chuyển tới vị trí…”. | Khó dùng với hàng nghìn chương và không truy cập được bằng bàn phím. |
| `work-delete` | Xóa tác phẩm | Backlog | Chưa có. | Cần xác nhận mạnh và quy ước sao lưu trước khi xóa. |

## Nhập bản gốc của chương

| `id` | Tính năng | Trạng thái | Trên giao diện hiện nay | Điều kiện để làm thật / câu hỏi còn mở |
| --- | --- | --- | --- | --- |
| `chapter-source-import` | Nhập bản gốc cho một chương (dán hoặc tệp, xem trước, thay bản gốc) | **Đã triển khai** (2026-10-01) | Màn chương và hộp thoại nhập; xem change `chapter-source-import`. | — |
| `chapter-title-from-text` | Tự đặt tên chương từ dòng đầu của văn bản | Backlog | Chưa có; tên chương đặt tay. | Chủ sản phẩm đã đề xuất không làm trong change nhập; cần quy tắc nhận dòng tên (ví dụ “第一章 …”). |
| `import-whole-volume` | Tách một tệp thành nhiều chương | Backlog | “Nhập từ .txt” trên màn chi tiết vẫn là minh họa (`import-txt`). | Phụ thuộc quy tắc tách chương; dùng lại bộ giải mã và chia câu đã có. |
| `segmentation-rules-editor` | Sửa quy tắc chia câu (từ viết tắt, ngoại lệ) | Backlog | Chưa có; danh sách viết tắt là dữ liệu trong mã. | Cần số liệu sai sót từ người dùng thật trước. |
| `encoding-detect-cjk` | Phân biệt Big5 và GB18030 khi cả hai đọc sạch | Backlog | Tệp Big5 trong tác phẩm giản thể bị đoán là GB18030, ra chữ sai không cảnh báo; chọn lại bảng mã ở bước xem trước sửa được. | Thêm kiểm tra theo tần suất chữ phồn thể/giản thể hoặc cảnh báo khi đoán theo ngôn ngữ; tìm tệp mẫu thật trước. |

## Soạn thảo văn bản chương

| `id` | Tính năng | Trạng thái | Trên giao diện hiện nay | Điều kiện để làm thật / câu hỏi còn mở |
| --- | --- | --- | --- | --- |
| `source-editor` | Editor bản gốc của chương (CodeMirror 6, ánh xạ segment, lưu, xung đột) | **Đã triển khai** (2026-10-01) | Màn chương; xem change `source-editor`. | — |
| `autosave` | Tự lưu định kỳ khi đang sửa | Backlog | Chưa có; lưu bằng Ctrl+S hoặc nút “Lưu”, đóng cửa sổ khi chưa lưu chỉ hỏi ở/đóng. | Cần quyết định có tạo bản lưu tạm hay ghi thẳng vào chương, và cách báo lỗi khi tự lưu thất bại. |
| `edited-segment-link-review` | Đánh dấu liên kết `needs_review` khi nội dung segment bản gốc đổi mà ID giữ nguyên | Backlog | Chưa có: kho chỉ đánh dấu liên kết khi segment bị xóa; segment đã sửa vẫn có liên kết `ok`. | Phải đổi kho (`saveText` so nội dung theo ID) và quyết định coi sửa nhỏ như lỗi chính tả có phải đánh dấu không. Giải quyết trước khi có căn chỉnh (M3). |
| `manual-segment-split-merge` | Tách/gộp segment bằng lệnh thủ công | Backlog | Chưa có; ranh giới do bộ chia câu quyết định lại sau mỗi lần sửa. | Dựa vào dữ liệu sai sót thực tế của bộ chia câu. |
| `translation-editor` | Sửa bản dịch trên giao diện (màn Toàn văn hai pane, Reading view, khóa bản gốc) | **Đã triển khai** (2026-10-01) | Màn chương hai pane; xem change `translation-editor`. | — |
| `sentence-mode` | Mode **Từng câu**: hàng nguồn/dịch, trạng thái hàng, nhảy hàng kế | **Đã triển khai** (2026-10-01) | Tab “Từng câu” trên màn editor; xem change `sentence-mode`. Hàng “AI đã dịch” có trong mô hình nhưng chưa có gì tạo ra nó cho tới khi có job dịch. | — |
| `merge-split-rows` | Gộp/tách hàng (segment) ở mode Từng câu, hoàn tác được | Backlog | Chưa có; hàng theo đúng segment bản gốc, liên kết nhiều–nhiều không sửa được từ giao diện. | Scope S2.7. Cần cách gộp/tách segment nguồn và dịch giữ liên kết; là cách sửa đúng khi “Ghép theo thứ tự” ước đoán sai. |
| `shared-undo-modes` | Một lịch sử hoàn tác chung giữa Toàn văn và Từng câu | Backlog | Mỗi lần đổi mode lịch sử hoàn tác bắt đầu lại và bản gốc về trạng thái khóa. | Scope S1.6 muốn chung một lịch sử. Cần một trạng thái chung cho văn bản dịch giữa editor dài và các ô hàng. |
| `reading-view-markdown` | Hiển thị Markdown trong Reading view | Backlog | Reading view đọc văn bản thuần theo đoạn; `#` và `*` hiện nguyên. | Cần đặc tả cú pháp Markdown hỗ trợ (câu hỏi mở của quyết định lưu trữ). |
| `sync-scroll` | Cuộn đồng bộ hai pane theo tỷ lệ hoặc theo vị trí tương ứng | Backlog | Hai pane cuộn độc lập. | Cuộn theo tỷ lệ chỉ đoán được; cuộn theo vị trí tương ứng cần liên kết giữa hai bên. Nghiên cứu ghi câu hỏi mở về cách ít làm mất mạch đọc nhất. |

## Đề xuất redesign workspace (tham khảo mockup 2026-10-01)

Nguồn: [đề xuất redesign workspace](../experience/editor-redesign.md), đối chiếu 5 mockup mới với quyết định hiện hành. Các mục này **chưa lên roadmap** — chờ chủ sản phẩm chốt ba câu hỏi mở (điều hướng cấp tác phẩm, Live Preview, phạm vi AI Chat) trước khi viết spec.

| `id` | Tính năng | Trạng thái | Trên giao diện hiện nay | Điều kiện để làm thật / câu hỏi còn mở |
| --- | --- | --- | --- | --- |
| `ai-chat-panel` | Panel "Hỏi AI" theo ngữ cảnh đoạn/chương, áp dụng/chèn/sao chép gợi ý | **Chỉ minh họa** | Nút "Hỏi AI" (hoặc Ctrl+K) ở mode Toàn văn mở panel chiếm cột thứ ba cạnh hai pane (không che nội dung); thẻ ngữ cảnh, 4 nút nhanh (gồm cả `inline-ai-quick-actions` cũ, gộp vào đây thay vì menu nổi riêng khi bôi chọn), một lượt hỏi/đáp và ô nhập đều là dữ liệu mẫu cố định. | Khác job dịch theo lô (S1.3); cần chốt phạm vi, provider dùng chung hay riêng, yêu cầu mạng. Chưa có ở mode Từng câu. |
| `sentence-mode-toolbar` | Thanh công cụ mode Từng câu: tìm trong bản gốc/bản dịch, lọc trạng thái, lọc người dịch, Kiểm tra liên kết | Backlog | Chưa có; `sentence-mode` hiện không có tìm kiếm hay bộ lọc. | Có thể làm độc lập với câu hỏi điều hướng/Live Preview; cần spec UI lọc/tìm trên tập hàng đã dựng. |
| `sentence-mode-side-panels` | Tab Gợi ý (câu tương tự, % khớp)/Thuật ngữ/Lịch sử/QA dưới bảng Từng câu, theo hàng đang chọn | Backlog | Chưa có. | Gợi ý câu tương tự cần S3.2 (văn phong từ bản dịch cũ); Thuật ngữ cần S2.3; QA cần S2.5 — mục này là nơi hiển thị, không thay thế các mục đó. |
| `rendered-direct-edit-view` | Live Preview nhẹ ở pane bản dịch mode Toàn văn: `#`/`##`/`###` và `**đậm**` hiện có định dạng ngay khi gõ | **Đã triển khai** (2026-10-01) | `TextEditor` bên dịch dùng `livePreviewDecorations` (chỉ mark decoration, không widget, để không phá IME); xem `editor/livePreviewDecorations.ts`. | Chưa đổi `decisions.md`; chỉ hai cú pháp trên, không link/danh sách/nghiêng; Reading view riêng vẫn đọc văn bản thuần (không đổi). |
| `work-area-nav-v2` | Điều hướng cấp tác phẩm theo Dịch thuật/Nhân vật/Từ điển/Thế giới quan/Benchmark thay vì Chương/Ngữ cảnh/Nguồn/Tác vụ | Không làm (hiện tại) | Giữ nguyên bốn khu vực đã chốt. | Quyết định 2026-10-01: Ngữ cảnh có khá nhiều thông tin nên giữ là một khu vực riêng đầy đủ, không rút gọn thành hàng tab trong màn chương (tránh hai nơi cùng nhận "Ngữ cảnh"). Có thể mở lại nếu có lý do mới. |

## Cách dùng khi triển khai

1. Làm thật một mục: đổi trạng thái thành **Đã triển khai**, dẫn change/commit, gỡ nhãn “Sắp có” và mục `mockFeatures` tương ứng.
2. Thêm minh họa mới: thêm hàng ở đây trước (hoặc cùng commit), rồi mới thêm mục `mockFeatures`.
3. Mục ra khỏi backlog vì không còn muốn làm: chuyển sang **Không làm (hiện tại)** kèm lý do, không xóa lịch sử.
