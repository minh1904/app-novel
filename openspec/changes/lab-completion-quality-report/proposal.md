## Why

Mira Lab đang trộn hai câu hỏi khác nhau vào một bảng: bản dịch **có hoàn thành** không (đoạn bị
từ chối, thiếu do lỗi, lời gọi chết vì 400) và bản dịch **tốt** đến đâu (cấu trúc, glossary, tên,
xưng hô). Hệ quả đã thấy: lần chạy `v5-nothink+lite35` chết ngay vì 400 vẫn nằm ngang hàng lần chạy
hợp lệ với `$0.000` và toàn dấu “–”; `compare.run.ts` chỉ lấy giao **chương** chứ không loại các
đoạn bị từ chối ở một bản, nên bản “may mắn” qua bộ lọc được lợi; và mọi kết luận hiện dựa trên một
lần chạy, trong khi bộ lọc và model không tất định. Trước khi đo các thay đổi tiếp theo (snapshot
ngữ cảnh, structured output, sửa có chủ đích), Lab cần cách báo cáo mà các thử nghiệm đó tin được.

## What Changes

- Lab ghi **kết cục từng đoạn** của mỗi lần dịch: thành công, bị từ chối (kèm lý do nếu có), thiếu do
  lỗi, lỗi cấu hình/yêu cầu, hoặc chưa chạy; kèm chi phí và độ trễ đã có.
- Báo cáo và lệnh so sánh tách **hai trục**:
  - *Hoàn thành* — tính trên toàn tập đoạn định dịch.
  - *Chất lượng* — chỉ trên tập đoạn có đầu ra hợp lệ ở **mọi** bản đang so, công bố số đoạn bị
    loại và lý do. Lỗi hoàn thành không bị quy thành 0 điểm chất lượng.
- **Đo lặp**: chạy cùng cấu hình N lần trên một tập chương cố định với ngữ cảnh đóng băng; báo
  min/max/độ lệch của từng chỉ số; phép so chỉ ghi “khác biệt” khi chênh vượt dao động đo được của
  chính hai cấu hình.
- **Phân lớp phép kiểm**: lỗi chứng minh được bằng code (id thiếu/trùng, phản hồi không đọc được) là
  cổng; heuristic (xưng hô, độ dài, CJK sót, glossary) chỉ là cờ; T1 judge là tham khảo; chấm mù của
  người cho nghĩa và văn phong. Báo cáo ghi rõ lớp của từng chỉ số.
- Bảng `history.md` đánh dấu lần chạy **hỏng/không có chỉ số** và tách khỏi hàng lần chạy hợp lệ.
- `compare.run.ts` (bộ đo cũ) áp cùng quy tắc loại đoạn, hoặc báo rõ là không áp được khi dữ liệu
  không có kết cục từng đoạn.

## Capabilities

### New Capabilities
- `lab-measurement-report`: hợp đồng báo cáo của Mira Lab — kết cục từng đoạn, hai trục hoàn thành và
  chất lượng, đo lặp với độ phân tán, phân lớp phép kiểm, và cách lịch sử trình bày lần chạy hỏng.

### Modified Capabilities

(không có — chưa có main spec cho Lab)

## Impact

- Mã: `scripts/lab/cli.ts` (translate, report, compare, history), `src/shared/algorithms/runRegistry.ts`
  (schema sổ đăng ký tăng lên 2, đọc được bản ghi schema 1), `scripts/bench/compare.run.ts`.
- Dữ liệu: `fixtures/private/lab/registry/*.jsonl` thêm trường mới; bản ghi cũ vẫn đọc được và được
  ghi nhãn “không có kết cục từng đoạn”.
- Tài liệu: `docs/modules/measurement/` (metrics-and-judging, running-experiments) cập nhật khi
  triển khai; `history.md` là tệp sinh tự động.
- Không đổi hành vi sản phẩm, schema `.mira` hay IPC. Đo lặp tốn tiền model: N lần chi phí, Lab phải
  báo ước tính trước khi chạy.
