# Kế hoạch kiểm chứng sản phẩm

Cập nhật: 2026-10-03 (bộ bài và corpus đổi theo [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md): không còn mode Từng câu, segment hay liên kết) · Trạng thái: **kế hoạch đề xuất; chưa có kết quả benchmark/phỏng vấn**. Chủ trì: research + engineering.

## Kiểm chứng nhu cầu

Đề xuất bắt đầu với 5–8 dịch giả cá nhân: người dịch thủ công, người hậu biên tập và người làm Trung–Việt bằng bộ từ điển. Cần có trải nghiệm Anh/Trung/Nhật, không suy rộng từ một người hoặc một cặp ngôn ngữ. Đây là nghiên cứu định tính, không đại diện thống kê thị trường.

Cho họ kể và làm lại một chương gần nhất: lấy bản gốc từ đâu, viết ở đâu, tra tên thế nào, lưu và xuất thế nào, lỗi gì khiến phải làm lại. Quan sát thao tác trước khi giới thiệu Mira. Hỏi lúc nào cần nhìn toàn chương, lúc nào cần soi từng chỗ; không hỏi dẫn dắt “bạn có thích duyệt đề xuất của AI không?”.

Sau demo, dùng cùng bài trên công cụ hiện dùng và Mira theo thứ tự luân phiên: sửa đoạn thoại, đổi tên riêng, phát hiện thiếu ý, đóng/mở, xuất. Ghi thời gian thao tác, lỗi còn lại, công sửa lại chữ AI viết và lý do chọn công cụ.

### Thí nghiệm mở của ADR-005: người dịch bằng AI có soát theo câu không?

ADR-005 bỏ mode Từng câu và chỉ theo dõi *vùng nào AI viết mà chưa ai đụng tới*, khi **chưa chạy thí nghiệm này**. Thí nghiệm là câu hỏi cũ đã nằm trong [câu hỏi mở](../product/open-questions.md), nay gắn với mục [Điều có thể làm đảo quyết định](../decisions/0005-ai-first-proposals-no-sentence-mode.md#điều-có-thể-làm-đảo-quyết-định) của ADR-005. Quan sát: với bản AI dịch cả chương, họ nhận/bỏ theo khối, đọc lướt toàn văn, hay tự lập danh sách câu để soát? Có ai đòi đánh dấu "đã soát" cho **từng câu**? Nếu có, Q2 của ADR-005 sai và mức dấu AI phải mở lại. Chưa thực hiện. Với mức sẵn sàng trả tiền, ghi phương án đang trả và lựa chọn cụ thể; chưa lấy lời khen demo làm bằng chứng mua.

## Corpus đề xuất

| Nhóm | Trường hợp bắt buộc |
| --- | --- |
| Ngôn ngữ | EN, ZH-Hans, ZH-Hant, JA nguồn; VI đích; báo kết quả từng nhóm |
| Ranh giới đoạn và câu | Đoạn là một dòng, không có dòng trống xen giữa (dạng raw truyện mạng thường gặp); đoạn ngăn bằng dòng trống; đoạn rất dài (cắt lô theo câu); thoại, ngoặc kép, viết tắt, dấu ba chấm, tên, tiêu đề, đoạn ngắn |
| Quan hệ số đoạn gốc ↔ dịch | Một-một, AI gộp hai đoạn, AI tách một đoạn, AI bỏ đoạn, AI thêm đoạn, đảo đoạn, viết lại thoát ý |
| Văn bản | Tiếng Việt có dấu, emoji/surrogate, ký tự tổ hợp, newline LF/CRLF, file rỗng |
| Markdown | Heading, emphasis, separator; các cấu trúc ngoài scope phải có xử lý rõ |
| Quy mô | Đề xuất fixture 2k/10k/50k ký tự để đo; điều chỉnh theo chương thật, chưa phải ngưỡng hỗ trợ công bố |

Mỗi fixture ghi nguồn/quyền sử dụng, ngôn ngữ, độ dài, phiên bản, bản gốc/dịch chuẩn, số đoạn mong đợi mỗi bên và ca mơ hồ. Không tải truyện riêng của người tham gia lên repo. Dùng người thứ hai kiểm tra tập mẫu khi có thể; không giả vờ văn học luôn chỉ có một cách chia đoạn đúng.

## Bộ bài nghiệm thu

| Test ID / liên quan | Thao tác | Kết quả cần đạt |
| --- | --- | --- |
| V01 / MIR-01,06 | Nhập TXT/MD, preview, lưu, xuất | Nội dung/định dạng trong scope được giữ; chuẩn hóa nếu có phải theo spec |
| V02 / MIR-02 | Gõ trong editor Toàn văn, nhận/bỏ từng khối đề xuất AI, `Ctrl+Z`, lưu, đóng, mở lại | Không mất/nhân đôi chữ; một lần `Ctrl+Z` trả cả lượt nhận về nguyên trạng; chữ sau khi mở lại khớp chữ trước khi đóng |
| V03 / MIR-07 | Gõ vào, xóa và dán đè lên vùng đang có dấu AI; bấm “đã soát” cho một đoạn và cho cả chương | Chữ không bao giờ mất vì dấu; dấu chỉ mất ở chỗ người dùng gõ vào hoặc bấm đã soát; vùng còn là chữ AI chưa ai đụng tới nhìn thấy được |
| V04 / MIR-08 | Sửa nguồn bằng thao tác riêng và hoàn tác | Có lịch sử (snapshot), bản dịch nguyên vẹn; đề xuất AI đang chờ trên đoạn đó bị đánh dấu *cũ* |
| V05 / MIR-05 | Đóng cưỡng bức trước/trong/sau điểm lưu | Khôi phục trạng thái nhất quán cuối đã xác nhận lưu; không báo lưu thành công trước khi bền vững |
| V06 / MIR-05 | Backup → mở trên profile sạch → restore; thử gói lỗi/schema không hỗ trợ | Khôi phục văn bản và metadata; từ chối an toàn, không ghi đè kho đang dùng khi lỗi |
| V07 / MIR-04 | Tên giống nhau ở hai tác phẩm, sửa glossary | Phạm vi đúng; không thay hàng loạt bản dịch âm thầm |
| V08 / P0 | Tắt mạng, chạy toàn vòng sau cài đặt | Đọc/sửa/lưu/nhập/xuất/restore hoạt động; không cần đăng nhập hoặc AI |
| V09 / UX | Nhập tiếng Việt IME, bàn phím, zoom, chương dài | Không mất composition/focus; đo độ trễ và vùng cuộn |
| V10 / brand | Build sạch, kiểm tra title, bridge, installer/profile khi có build phát hành | Mira nhất quán; ghi riêng kết quả nâng cấp bản cũ nếu có |
| V11 / MIR-02 | AI ghi vào chương đã có chữ: dịch lại chương có bản dịch (tác vụ dịch), chat “Sửa”; thử cả với pane bản dịch trống | Không có chữ nào đổi trước khi người dùng nhìn thấy phần khác biệt; bỏ hết đề xuất thì chữ như cũ từng byte; chỉ pane trống được ghi thẳng, và có dấu AI |
| V12 / MIR-08 | Tạo đề xuất rồi sửa tay đoạn đó trước khi mở nó: chữ gốc còn nguyên chỗ cũ, chữ gốc dời chỗ, chữ gốc bị sửa hoặc xóa | `rev` chưa đổi thì áp thẳng; `rev` đã đổi thì tìm lại chữ gốc theo nội dung; không tìm được thì đánh dấu *cũ* và cho chạy lại, **không bao giờ đoán vị trí** |
| V13 / tác vụ dịch | Chạy tác vụ dịch nhiều chương, giết app giữa chừng một lô, mở lại | Tiếp tục đúng chương và đúng lô; không dịch lại đoạn đã ghi; không chương nào ghi dở; mọi khóa đang hạ nhiệt thì tác vụ tạm dừng có hẹn giờ, không báo lỗi |
| V14 / Q3 | Fixture ZH, JA, EN: định nghĩa đoạn là mỗi dòng không trống; cho AI dịch rồi đếm đoạn hai bên | Số đoạn hai bên khớp ở cả ba nhóm; ca không khớp được ghi lại để quyết định giữ hay đổi định nghĩa đoạn (ADR-005, quyết định 3) |
| V15 / storage | Mở tệp `.mira` v5 (có segment, liên kết, hàng “Đã soát”) bằng bản v6, dùng snapshot schema đóng băng v5 | Mở được; chữ và ảnh giữ nguyên từng byte; thông tin “Đã soát” theo câu mất là hệ quả đã chấp nhận trong ADR-005, còn chữ không mất |
| V16 / Bộ đo | Chạy cùng một điều kiện dịch hai lần trên fixture rồi cho giám khảo LLM so hai bản (A/A) | Tỷ lệ thắng nằm quanh 50%; độ rộng khoảng nhiễu được ghi lại và dùng làm nền cho mọi thí nghiệm sau |
| V17 / Bộ đo | Người chấm mù và giám khảo LLM cùng chấm 50–100 cặp đoạn | Đồng thuận judge–người được đo và ghi lại; ngưỡng tin judge chỉ đặt sau bước này |
| V18 / Thuật ngữ | Fixture có glossary viết tay; dịch có và không có glossary | Tỷ lệ đoạn chứa đúng `target` của mục đã khớp tăng, có khoảng tin cậy; mục chưa duyệt không xuất hiện trong bất kỳ request nào |
| V19 / Xưng hô | Chương thoại dày, ba điều kiện: không ma trận / ma trận theo dàn nhân vật / ma trận + nhãn người nói–người nghe | Đếm đại từ sai cặp (V3 của [hệ thống ngữ cảnh](../research/context-system.md)); điều kiện có ma trận phải ít lỗi hơn không ma trận |

## Cách đo và quyết định

Không mất nội dung đã xác nhận lưu là điều kiện bắt buộc. So sánh text và metadata version với oracle fixture; không chỉ nhìn screenshot. Ghi mọi khác biệt newline/normalization đã cho phép, không tùy tiện coi mọi byte khác là lỗi hoặc bỏ qua mọi byte khác.

Đối với căn chỉnh: bản đầu **không có** (ADR-005 bỏ liên kết giữa câu gốc và câu dịch), nên các chỉ số precision/coverage của nhóm tự đề xuất không còn áp dụng. Nếu sau này có căn chỉnh tạm cho văn phong từ bản dịch cũ (S3.2, S3.5 — [chưa có thiết kế](../decisions/0005-ai-first-proposals-no-sentence-mode.md)), mới phải đo lại: precision của nhóm tự đề xuất, coverage, số vùng cần sửa và thời gian review; precision cao nhưng coverage rất thấp chưa chứng minh hữu ích, và chưa khóa ngưỡng số trước khi có baseline.

Đối với đề xuất của AI: đo tỷ lệ `Ctrl+Z` trong 30 giây sau mỗi lần nhận (cao nghĩa là phần khác biệt hiện quá muộn, không phải đường ghi sai), tỷ lệ đề xuất bị đánh dấu *cũ*, và số đoạn lệch giữa hai bên sau khi AI dịch. V11–V15 là điều kiện qua cổng của từng module trong [lộ trình](roadmap.md), không phải bài đo sau cùng.

Đối với chất lượng bản dịch: đo ba tầng như ở [chất lượng dịch](../research/translation-quality.md) E2–E6:
- **Kiểm tất định:** số đoạn, chữ nguồn còn sót, tỷ lệ độ dài, vòng lặp, tuân thủ thuật ngữ.
- **Giám khảo LLM so cặp mù**, khác họ với model dịch, chạy cả hai thứ tự.
- **Người chấm mù:** 60–80 cặp đoạn mỗi thí nghiệm.

Mỗi điều kiện chạy 3 lần, phân tích theo cặp ở mức chương. Một cải tiến chỉ được giữ khi kiểm tất định không xấu đi **và** cận dưới khoảng tin cậy 95% của tỷ lệ thắng trên 50%. BLEU và COMET không dùng để quyết định. Kết quả âm cũng phải ghi lại.

Đối với UX/performance: thời gian hoàn thành vòng, lỗi cần hỗ trợ, thời gian mở/chuyển chương, độ trễ gõ/cuộn, RAM và kích thước installer trên máy ghi cấu hình. Không gộp tiến độ dịch với phần chữ AI chưa được soát.

Mỗi lần chạy ghi build/commit, OS/phần cứng, fixture, điều kiện mạng, bước tái hiện, actual/expected, log và kết luận pass/fail/blocked. Dùng [mẫu kiểm chứng](../maintenance/templates.md). Chỉ mở mốc tiếp khi có bằng chứng; chưa thực thi các bài này trong lần đóng handbook.

## Kết quả đã chạy

Các số đo dưới đây là của **bản MVP** (editor và kho còn theo segment). Module nào được làm lại theo [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md) phải đo lại bằng cùng cách đo; số cũ chỉ là mức tham chiếu, không phải ngưỡng đã đạt cho bản mới.

### Editor chương (V09, change `source-editor`) — 2026-10-01

Build `out/` của Electron 44.4.5 trên Windows 11, dữ liệu tạm. Số đo và cách đo ở [design của change](../../../openspec/changes/source-editor/design.md) (mục “Số đo trong Electron thật”). Chương 5.000 segment, 205.999 ký tự: mở 95–117 ms; xử lý mỗi phím p95 1,7 ms; cuộn khung hình tệ nhất 14 ms; lưu 179 ms, giao diện không đứng. Bảng ca IME (Telex, VNI, Pinyin) ở `src/renderer/src/features/editor/imeCases.md`: lần 1 trên bản editor tối thiểu đạt (chủ sản phẩm báo); lần 2 trên bản hoàn chỉnh ghi ở đó.

### Màn editor hai pane (V09, change `translation-editor`) — 2026-10-01

Cùng build và cách đo như mục trên. Chương mà mỗi bên 5.000 segment (bản gốc 206.000 ký tự, bản dịch 421.000 ký tự): mở cả hai editor 123–141 ms; xử lý mỗi phím p95 3,7 ms ở cả hai bên; lưu cả hai bên 214 ms, không có tác vụ dài. Số đo đầy đủ và danh sách kiểm tra chức năng ở [design của change](../../../openspec/changes/translation-editor/design.md). Bảng ca IME cho pane dịch (Telex, VNI, ca bản dịch trống đang hiện gợi ý, ca chuyển giữa hai pane): chờ người dùng thử tay, ghi ở `src/renderer/src/features/editor/imeCases.md`.

### Mode Từng câu — kết quả MVP của một mode đã bỏ (V09, change `sentence-mode`) — 2026-10-01

Mode này bị bỏ theo ADR-005 (đang tạm ẩn, sẽ gỡ); mục này giữ lại số đo làm lịch sử. Cùng build và cách đo như các mục trên. Chương 5.000 hàng (bản gốc 206.000 ký tự, bản dịch 625.000 ký tự, 5.000 liên kết): mở mode 180–199 ms; đổi trang 111–114 ms; xử lý mỗi phím trong ô p95 7 ms; ghi một hàng 135–143 ms; ghép 5.000 cặp 464–562 ms. Chương 500 hàng: ghi một hàng 16 ms. Đo lộ ra và đã sửa hai chỗ chậm bậc hai ở kho liên kết (ghép 5.000 cặp từ 191 giây xuống 0,5 giây). Số đo đầy đủ nằm trong `design.md` của change `sentence-mode`, đã xóa cùng change theo ADR-005 (còn trong lịch sử Git). Bảng ca IME cho ô hàng (Telex, VNI) **không còn cần**: mode đã bỏ, xem `src/renderer/src/features/editor/imeCases.md`.

---

[Mục lục handbook](../README.md)
