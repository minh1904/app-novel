## Why

"Ghép theo thứ tự" (`autoPair` trong `sentenceRows.ts`, từ change `sentence-mode`) chỉ nối segment dịch chưa liên kết với hàng chưa dịch theo đúng thứ tự xuất hiện, không xét nội dung — hữu ích khi hai bên đúng số câu và đúng thứ tự, nhưng vô dụng ngay khi dịch giả viết tự do ở Toàn văn rồi gộp/tách câu, đảo đoạn, hoặc dịch thoát ý (rất thường gặp ở truyện). `sentence-mode` đã chủ động để "căn chỉnh tự động bằng thuật toán thật" là Non-Goal và ghi backlog chờ milestone **M3**. Đây là change hiện thực hóa M3: ước lượng liên kết dựa trên **ngữ nghĩa câu**, để lần đầu chuyển từ Toàn văn sang Từng câu (và mỗi lần ghép lại sau đó) không bắt dịch giả tự ghép tay toàn bộ.

## What Changes

- Thêm bước **ước lượng liên kết theo bậc thang** (xem [khả thi kỹ thuật §3](../../../docs/handbook/research/technical-feasibility.md)), chạy offline, theo yêu cầu (không realtime theo từng phím gõ — xem [alignment.md](../../../docs/handbook/experience/alignment.md)):
  - **Bậc 0 (không model):** neo rẻ giữa segment nguồn và đích chưa liên kết — thứ tự tương đối, số/ngày giống nhau, thuật ngữ đã có trong glossary xuất hiện ở cả hai câu, tỷ lệ độ dài ký tự. Luôn chạy trước, không cần tải model.
  - **Bậc 1 (embedding):** với các segment Bậc 0 không đủ tin, tính sentence embedding (`multilingual-e5-small` qua `@huggingface/transformers`, offline, đã xác nhận hỗ trợ tiếng Việt) rồi tìm liên kết 1-1 tốt nhất trong một **cửa sổ hẹp quanh vị trí tương đối** (không so toàn bộ ma trận n×n) bằng cosine similarity, lấy cảm hứng từ cách Bertalign tách neo rẻ trước khi mới chạy phần đắt (không lấy mã Bertalign — GPL-3.0; tự viết bằng JS).
  - Mỗi liên kết sinh ra có **confidence thật** (không còn cố định 0): `status: 'ok'` khi confidence vượt ngưỡng, `status: 'needs_review'` khi dưới ngưỡng hoặc không tìm được ứng viên đủ tốt — lúc đó phần còn lại rơi về ghép theo thứ tự (hành vi cũ) làm phương án cuối, được đánh dấu rõ là ước đoán yếu nhất.
- **Thay hành vi `autoPair`**: vẫn một hàm/một kênh (`rows:autopair`), nhưng logic bên trong gọi engine ước lượng mới thay vì chỉ ghép theo thứ tự. Không đổi chữ ký kênh, không đổi schema.
- Thêm phụ thuộc mới: `@huggingface/transformers` (Transformers.js, MIT) và asset model `multilingual-e5-small` (ONNX, MIT) đóng gói/offline cho Electron.
- **Không thuộc change này:** UI mới ngoài việc đổi kết quả của nút "Ghép theo thứ tự" đã có; gộp/tách hàng (`merge-split-rows`); liên kết n:m tự động (engine chỉ sinh 1-1 ở lần đầu); sửa liên kết từ giao diện; dùng chung lịch sử hoàn tác; job dịch AI; chạy căn chỉnh theo thời gian thực khi đang gõ; đối chiếu nhiều nguồn raw.

## Capabilities

### New Capabilities

- `segment-alignment`: engine ước lượng liên kết giữa segment nguồn và đích chưa liên kết — hai bậc (heuristic không model, embedding có cửa sổ), đầu ra là cặp 1-1 kèm confidence và ngưỡng quyết định `ok`/`needs_review`; chạy offline, theo yêu cầu.

### Modified Capabilities

- `segment-links` (định nghĩa ở `openspec/changes/sentence-mode/specs/segment-links/spec.md`, chưa archive): yêu cầu "Ghép theo thứ tự" đổi từ ghép thuần theo thứ tự, confidence cố định 0, sang dùng kết quả của `segment-alignment` trước, chỉ ghép theo thứ tự cho phần `segment-alignment` không giải quyết được.

## Impact

- **Code:** `src/main/alignment/` mới (heuristic Bậc 0, embedding runner Bậc 1, hợp hai bậc thành danh sách cặp + confidence); `src/main/storage/sentenceRows.ts` (`autoPair` gọi engine mới thay vì ghép thứ tự thuần); test cho cả hai.
- **Phụ thuộc:** thêm `@huggingface/transformers` và model ONNX `multilingual-e5-small` (~118 MB) vào gói Electron — ảnh hưởng kích thước bản cài và thời gian tải model lần đầu; cần đo trong Electron thật (model chạy trong main process, không phải renderer).
- **Hiệu năng:** `autoPair` hiện đã đo 464–562 ms cho 5.000 cặp (ghép thuần). Thêm embedding sẽ chậm hơn — cần đo lại ngân sách thời gian cho chương lớn, có thể cần giới hạn số segment chạy Bậc 1 trong một lần gọi.
- **Dữ liệu:** không đổi schema; `confidence` và `status` của liên kết `kind: 'ai'` do `autoPair` tạo ra có giá trị thật thay vì hằng số.
- **Tài liệu:** `technical-feasibility.md` (đánh dấu Bậc 0/Bậc 1 đã có thiết kế cụ thể), `alignment.md`, `backlog.md` (gỡ mục M3 placeholder), `roadmap.md`, `changelog.md`.
