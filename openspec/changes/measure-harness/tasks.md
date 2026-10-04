> Kiểm tra bằng `node scripts/check.mjs`. Không dùng `pnpm test/lint/typecheck`: pnpm toàn cục mới
> hơn bản ghim có thể thoát mã 0 mà không chạy gì. Chỉ gọi provider trong lệnh bench được người chạy
> cấu hình; bộ kiểm tra thường phải chạy hoàn toàn offline.

## 1. Fixture và analyzer

- [x] 1.1 Định nghĩa và kiểm schema/provenance cho work, glossary, pronouns, meta và assertions.
- [x] 1.2 Ghép đoạn theo nội dung với bead 1–1, 1–0, 0–1, 2–1, 1–2 và tie-break tất định.
- [x] 1.3 Kiểm T0 cho cấu trúc, chữ nguồn, dấu thoại, độ dài, lặp, glossary và assertion viết tay.
- [x] 1.4 Giữ analyzer thuần, dùng chung được nhưng không gán severity hay sở hữu UX QA.

## 2. Chạy và tái hiện

- [x] 2.1 Chạy dịch qua đường thật của app, ghi config/prompt hash/model/thinking/usage/thời gian.
- [x] 2.2 Chấm lại output cũ không mạng, không ghi đè và bảo toàn metadata gốc.
- [x] 2.3 Quét secret trước khi ghi; report chia sẻ chỉ chứa metric và nhãn.
- [x] 2.4 Chạy được khi không có `fixtures/private/` và khai rõ tập fixture đã dùng.

## 3. Đánh giá tùy chọn

- [x] 3.1 Judge so cặp mù hai chiều, kiểm họ model, parse khoan dung và thử lại output hỏng một lần.
- [x] 3.2 Adapter judge retry hữu hạn 429/5xx theo `Retry-After`, không ghi body lỗi có thể chứa dữ liệu.
- [x] 3.3 Tài liệu ghi T1 chưa hiệu chuẩn cho tới khi có A/A live và đối chiếu người; việc này không chặn
  phần offline.
- [x] 3.4 Trang T3 chạy offline, lấy mẫu tất định theo chương và các tầng
  ordinary/glossary/addressing khi oracle cho phép.
- [x] 3.5 Import T3 giữ mọi mục đã chấm, báo ca bị cờ và subgroup; luôn báo agreement/kappa thật cùng
  cảnh báo cỡ mẫu.

## 4. So sánh và kết quả lịch sử

- [x] 4.1 Compare mặc định xuất T0/T1/T3 thô trên chương chung và không kết luận sản phẩm.
- [x] 4.2 Chỉ áp `legacy-e6` khi người chạy chọn rõ; report gọi đây là khuyến nghị lịch sử.
- [x] 4.3 Bảo toàn kết quả B1/B2a/B3 và V14 như bằng chứng lịch sử, kèm giới hạn diễn giải.

## 5. Tài liệu và hoàn tất

- [x] 5.1 Tạo tài liệu chuẩn tại `docs/modules/measurement/` cho fixture, metric/judge, cách chạy và kết quả.
- [x] 5.2 Thu gọn phần handbook/fixture README trùng lặp thành tóm tắt lịch sử và liên kết tài liệu chuẩn.
- [x] 5.3 Kiểm liên kết, chạy `openspec validate measure-harness` và sửa mọi lỗi.
- [x] 5.4 Chạy `node scripts/check.mjs --build`, ghi số test thực tế vào nhật ký.

## Nghiên cứu tiếp theo, không chặn hoàn tất

- Chạy A/A bằng judge ngoài họ model dịch khi có khóa phù hợp, rồi đối chiếu tối thiểu 50 mục người
  chấm trước khi đề xuất ngưỡng T1.
- Tạo policy riêng cho experiment xưng hô dựa trên vai/người nghe; không tái dùng strict glossary
  hoặc tổng bead làm kết luận thay thế.
