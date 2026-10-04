## Context

Công cụ bench cũ chạy được B1/B2a/B3 nhưng chấm theo số dòng, thiếu validation fixture và không có
test cho phép kiểm. Change này đã dựng lại lõi đo trong `src/shared/` và các runner độc lập ở
`scripts/bench/`. Sau khi nghiên cứu module Context, ranh giới được siết lại: Bộ đo xuất bằng chứng,
không sở hữu quyết định sản phẩm hoặc schema nghiệp vụ.

## Goals / Non-Goals

**Goals:** tái hiện lần chạy; phát hiện lỗi cấu trúc đáng tin hơn; giữ dữ liệu có bản quyền ngoài
Git; hỗ trợ T0/T1/T3; so điều kiện trên cùng fixture; cho Context khai oracle riêng.

**Non-goals:** alignment sản phẩm, QA UI, auto-fix, context database, một ngưỡng chung cho mọi thay
đổi, hoặc huấn luyện/tinh chỉnh model.

## Decisions

### D1. Lõi analyzer thuần, adapter ở runner

Schema và hàm không I/O nằm trong `src/shared/`; đọc tệp, HTML và gọi mạng ở `scripts/bench/`.
Analyzer có thể được QA tái sử dụng nhưng kết quả chỉ là cờ/số liệu. QA không kế thừa severity hay
quyền chặn save/export từ Bộ đo.

### D2. Ghép đoạn chỉ phục vụ đo

Quy hoạch động cho phép 1–1, 1–0, 0–1, 2–1, 1–2; dùng tỷ lệ độ dài và điểm neo. Kết quả tất định,
không lưu vào tác phẩm và không hồi sinh ID câu/segment bền vững. Ca B2a chương 03 xác nhận phép
ghép chặn lỗi trôi vị trí dây chuyền, nhưng không chứng minh mọi cặp ngắn đều ghép đúng.

### D3. Runner dùng Vitest riêng và đường dịch thật

`translate.run.ts`, `rescore.run.ts`, `judge.run.ts`, `rate.run.ts`, `compare.run.ts` chạy bằng
config bench. `check.mjs` chỉ chạy unit/integration không mạng. Thay prompt ở biên request là cơ chế
thí nghiệm tạm; khi Lõi dịch có injection point chính thức, runner chuyển sang interface đó.

### D4. Judge là adapter dev độc lập

Judge gọi endpoint tương thích OpenAI từ runner, không phụ thuộc service lifecycle hoặc storage của
app. Adapter phải retry có giới hạn với 429/5xx, tôn trọng `Retry-After`, quét secret trước khi ghi,
ghi model/prompt hash/tham số/usage và từ chối cùng họ model trừ override có dấu vết.

Prompt nhận nguồn và hai candidate ẩn danh; chạy A/B và B/A. Output hỏng được hỏi lại một lần, sau
đó ghi không chấm được. T1 chưa đáng dùng làm cổng tới khi có A/A và đối chiếu người.

### D5. Người chấm dùng mẫu phân tầng và giữ ca khó

Trang HTML tĩnh chạy offline, xáo candidate theo từng mẫu và tách key. Mẫu phân tầng theo chương;
khi oracle cho phép, ưu tiên có đủ ca thường, glossary và xưng hô. Ca bị T0 gắn cờ hoặc judge bất
đồng được báo thành tầng/nhóm chẩn đoán, không bị loại im lặng khỏi kết quả người chấm.

### D6. Metrics trước, policy sau

`compare.run.ts` mặc định chỉ báo số liệu. `legacy-e6` giữ để tái hiện quyết định B2a/B3:

- tổng 1–0/0–1/2–1/1–2 không tăng;
- strict glossary không giảm quá 1 điểm phần trăm;
- judge CI và ngưỡng mẫu theo thiết kế lịch sử.

Đây là **policy khuyến nghị**, không luật chung. Glossary dùng acceptable adherence và báo nhầm;
xưng hô dùng ca có nhãn vai; văn phong dựa người chấm cùng kiểm soát nghĩa. Experiment mới phải ghi
primary metric và trade-off trước khi chạy.

### D7. Fixture là oracle, không là model sản phẩm

`glossary.json`, `pronouns.json`, assertion và reference mô tả điều kiện chấm của corpus. Context
tương lai xuất snapshot qua adapter; không ép database theo file fixture. Draft/rejected/private
không được hiểu như trạng thái gửi AI của sản phẩm.

### D8. Tài liệu theo module

Tài liệu chuẩn ở `docs/modules/measurement/`. Handbook giữ vai trò lịch sử; các bảng kết quả dài,
hướng dẫn lệnh và quyết định mới không tiếp tục nhân bản vào nhiều chương handbook.

## Risks / Trade-offs

- Judge có thể yếu ở tiếng Việt → báo chưa hiệu chuẩn, đo A/A và người chấm trước khi tin.
- Fixture ít chương → bootstrap rộng là kết quả trung thực; không hạ chuẩn để ép kết luận.
- Alignment có thể sai ở thoại rất ngắn → điểm neo, cờ độ tin và kiểm mẫu thật.
- Oracle nháp làm metric glossary sai lệch → ghi trạng thái, ưu tiên acceptable rate và người duyệt.
- Runner phụ thuộc code app đang đổi → giữ adapter mỏng, không cho fixture contract phụ thuộc schema
  nội bộ của một module.

## Validation

- Unit test cho schema, fixture check, alignment, T0, secret guard, parser judge, family, thống kê và
  policy lịch sử.
- `node scripts/check.mjs --build` phải sạch trước khi hoàn tất.
- T1 live/A-A là nghiên cứu tùy khóa, không chặn việc nghiệm thu phần offline.
- Kết quả lịch sử và giới hạn được ghi tại
  [`results.md`](../../../docs/modules/measurement/results.md).
