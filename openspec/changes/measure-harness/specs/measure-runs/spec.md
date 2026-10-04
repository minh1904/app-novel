## Purpose

Chạy và tái hiện thí nghiệm dịch, chấm lại output cũ và so metrics giữa các điều kiện mà không tự
biến một policy thành quyết định sản phẩm.

## ADDED Requirements

### Requirement: Chạy qua đường dịch thật

Runner SHALL dùng normalize/chia lô/provider/parse của app tại revision được ghi. Cấu hình thí
nghiệm MAY thay prompt/model/thinking nhưng SHALL ghi biến đã đổi và tham số thực gửi.

#### Scenario: Thay một biến
- **WHEN** condition chỉ thay prompt
- **THEN** report ghi prompt hash mới và các cấu hình còn lại của baseline

### Requirement: Hồ sơ tái hiện và secret

Mỗi run SHALL ghi commit, fixture, model, prompt hash, tham số, repeat, usage, thời gian, HTTP status
và lỗi. Khóa chỉ ở memory/env hoặc `.env` ignored; output SHALL được quét secret trước khi ghi.
`check.mjs` SHALL không gọi provider.

#### Scenario: Kiểm tra thường
- **WHEN** chạy `node scripts/check.mjs`
- **THEN** không có request dịch/judge live

### Requirement: Dữ liệu riêng tư không vào report chia sẻ

Output và report chi tiết SHALL ở `fixtures/private/runs/`. Bảng dùng trong docs SHALL chỉ có metric,
nhãn và định danh chương/tác phẩm không tiết lộ câu truyện.

#### Scenario: Chép bảng kết quả
- **WHEN** tạo summary từ private run
- **THEN** summary không chứa source/translation excerpt

### Requirement: Chấm lại không mạng và không ghi đè

Rescore SHALL dùng analyzer/oracle hiện tại trên output lưu sẵn, giữ usage/thời gian/lỗi gốc và ghi
kết quả mới cạnh bản cũ mà không gọi mạng.

#### Scenario: Oracle được duyệt lại
- **WHEN** glossary fixture đổi trạng thái/nội dung
- **THEN** rescore tạo kết quả mới và bảo toàn report gốc

### Requirement: So sánh luôn xuất metrics thô

Compare SHALL chỉ dùng chương chung, từ chối khi không có phần giao và ghi cấu hình judge nếu dùng.
Mặc định SHALL xuất T0/T1/T3 cùng giới hạn mà không phán giữ/bỏ.

#### Scenario: Không khai decision profile
- **WHEN** chạy compare không có policy
- **THEN** report ghi metrics và “chưa áp policy”, không tạo kết luận sản phẩm

### Requirement: Policy quyết định là tùy chọn và có tên

Một policy MAY sinh khuyến nghị `keep/no-keep/insufficient`, nhưng SHALL ghi tên/version/primary
metric. `legacy-e6` SHALL chỉ được dùng để tái hiện các quyết định lịch sử B2a/B3, không làm mặc định
cho Context.

#### Scenario: Tái hiện B3
- **WHEN** chạy với `MIRA_BENCH_DECISION_PROFILE=legacy-e6`
- **THEN** report ghi rõ đây là khuyến nghị E6 lịch sử và liệt kê số liệu cấu thành

#### Scenario: Đánh giá xưng hô
- **WHEN** experiment đặt mục tiêu xưng hô
- **THEN** strict glossary hoặc tổng bead không tự đủ để kết luận; policy cần metric vai/người nghe

### Requirement: Adapter Context không làm đổi fixture contract

Experiment Context MAY cung cấp snapshot/mục đã dùng và oracle đặc thù. Runner SHALL ghi chúng như
input của phép đo mà không bắt Context dùng file/schema fixture bên trong sản phẩm.

#### Scenario: Context foundation
- **WHEN** app dịch cùng nguồn với/không glossary hoặc ma trận
- **THEN** hai run so được trên cùng chapter và report biết snapshot nào đã dùng
