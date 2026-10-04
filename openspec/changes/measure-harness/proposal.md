## Why

Mira thay prompt, model, thinking, glossary và xưng hô để nâng chất lượng dịch. Nếu không có một
bộ đo tái hiện được, các thay đổi này chỉ được quyết định bằng vài ví dụ đẹp hoặc cảm giác đọc.
Công cụ bench ban đầu đã phát hiện lỗi thật nhưng thiếu hợp đồng fixture, test, ghép đoạn khi model
gộp/tách, chấm nghĩa và quy trình người chấm.

Bộ đo là hạ tầng **cung cấp bằng chứng**. Nó không tự quyết định sản phẩm, không sửa bản dịch và
không sở hữu schema Context hay UX QA.

## What Changes

- Chuẩn hóa fixture công khai/riêng tư, metadata nguồn và quyền sử dụng. Glossary, xưng hô và
  assertion trong fixture là oracle đo, không phải schema lưu của sản phẩm.
- Đưa phép ghép đoạn và kiểm tất định T0 thành hàm thuần có test. Module QA có thể gọi lại analyzer,
  nhưng tự quyết severity và cách hiển thị.
- Chạy thí nghiệm qua đường dịch thật, ghi commit/model/prompt hash/tham số/usage, bảo vệ secret và
  chấm lại output cũ không gọi mạng.
- Cung cấp adapter judge LLM T1 và trang người chấm mù T3. Hai tầng này là tùy chọn và phải báo rõ
  khi chưa được hiệu chuẩn A/A hoặc chưa đủ mẫu đối chiếu người.
- Lệnh so hai lần chạy luôn xuất metrics thô. Policy `legacy-e6` chỉ là khuyến nghị tùy chọn cho
  thí nghiệm bảo toàn cấu trúc cũ; không là cổng chung cho glossary, xưng hô hay văn phong.
- Tài liệu vận hành và kết quả chuẩn nằm ở
  [`docs/modules/measurement/`](../../../docs/modules/measurement/README.md). Handbook cũ chỉ giữ
  dấu lịch sử và liên kết.

## Capabilities

### New Capabilities

- `measure-fixtures`: cấu trúc, provenance, quyền sử dụng và validation của tập đo.
- `translation-checks`: analyzer thuần cho cấu trúc và các cờ kiểm được bằng luật.
- `translation-judging`: judge LLM tùy chọn và người chấm mù, có đo nhiễu/đồng thuận.
- `measure-runs`: chạy, lưu hồ sơ, chấm lại và so số liệu giữa các điều kiện.

### Modified Capabilities

Không đổi hành vi người dùng của app. Bộ đo là công cụ developer; việc tái sử dụng analyzer trong
QA tương lai phải có spec QA riêng.

## Non-Goals

- Không biến `glossary.json` hoặc `pronouns.json` thành database Context.
- Không tự sửa, tự dịch lại hoặc tự áp kết luận `keep/no-keep` vào app.
- Không chạy API trong `check.mjs` hay CI mặc định.
- Không làm COMET/MetricX, embedding alignment hoặc giao diện chấm trong app.
- Không xem output AI là reference người dịch.

## Impact

- Hàm thuần và contract ở `src/shared/`; runner đọc tệp/gọi mạng ở `scripts/bench/`.
- Output chi tiết ở `fixtures/private/runs/` bị Git bỏ qua; báo cáo đưa vào docs không chứa truyện.
- Không đổi `.mira`, IPC, renderer hoặc prompt sản phẩm.
- Judge cần khóa riêng khi chạy; thiếu khóa chỉ bỏ qua T1 và không chặn T0/T3.
