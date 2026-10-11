## Purpose

Quy định usage hiển thị trong Mira phải bắt nguồn từ số token provider thực sự báo, giữ được cache/reasoning khi có và không biến phép ước lượng cục bộ thành số tiêu tốn thực tế.

## ADDED Requirements

### Requirement: Chỉ usage provider báo được xem là token đã dùng

Hệ thống SHALL chỉ ghi và hiển thị token đã dùng khi response của provider có usage hợp lệ. Usage SHALL mang nguồn `provider`. Nếu provider không báo đủ usage, giá trị SHALL là không có dữ liệu; hệ thống SHALL NOT thay bằng ước lượng từ ký tự hoặc tokenizer cục bộ rồi trình bày như số thật.

#### Scenario: Provider báo usage
- **WHEN** provider trả số token đầu vào và đầu ra hợp lệ
- **THEN** lượt lưu các số đó với nguồn provider và UI được phép hiển thị chúng

#### Scenario: Provider không báo usage
- **WHEN** stream kết thúc mà không có usage hợp lệ
- **THEN** lượt lưu usage rỗng và UI hiện “Nhà cung cấp không báo lượng dùng” hoặc dấu `—`

### Requirement: Cộng usage của toàn operation

Khi một lượt hoặc operation có nhiều lời gọi provider, hệ thống SHALL cộng usage của mọi lời gọi đã báo usage, gồm vòng tool, lô dịch, retry và fallback đã thực sự tính phí. Kết quả tổng SHALL không chỉ lấy lời gọi cuối. Lời gọi không báo usage SHALL làm tổng được đánh dấu chưa đầy đủ thay vì được tính là 0.

#### Scenario: Chat có ba vòng tool
- **WHEN** ba lời gọi provider lần lượt báo usage
- **THEN** usage của lượt bằng tổng ba lời gọi

#### Scenario: Một lô không báo usage
- **WHEN** sáu lô báo usage và một lô không báo
- **THEN** tổng sáu lô vẫn được lưu nhưng UI ghi rõ tổng chưa đầy đủ, không coi lô thứ bảy là 0 token

### Requirement: Giữ chi tiết cache và reasoning khi provider báo

Usage đi qua IPC/storage SHALL dùng `inputTokens` cho tổng input provider báo và `uncachedInputTokens` cho phần input không cache khi xác định được; `cacheReadTokens` và `cacheWriteTokens` là các phần còn lại giải thích tổng. Usage SHALL giữ output và reasoning khi provider cung cấp hoặc khi reasoning ẩn được suy ra chắc chắn từ tổng provider. Reasoning SHALL là một phần của output, không được cộng hai lần. Khi provider không cho phép tách đủ các phần, trường chi tiết tương ứng SHALL vắng mặt thay vì suy đoán.

#### Scenario: Anthropic có cache
- **WHEN** Anthropic báo input, cache read, cache creation và output
- **THEN** hệ thống lưu `inputTokens` bằng tổng các phần đầu vào, lưu riêng phần không cache/cache read/cache write và không đếm phần cache hai lần khi tính chi phí

#### Scenario: OpenAI báo reasoning token
- **WHEN** completion token đã bao gồm reasoning và response báo chi tiết reasoning
- **THEN** output giữ nguyên completion token, reasoning được lưu làm chi tiết và không cộng thêm vào tổng

### Requirement: Chi phí từ usage thật vẫn là ước tính

Chi phí hiển thị SHALL được tính từ usage provider báo và bảng giá model đã biết. Nhãn SHALL nói “Chi phí ước tính theo bảng giá”; hệ thống SHALL NOT mô tả đó là hóa đơn thực tế. Khi thiếu usage hoặc giá, chi phí SHALL là không biết, không phải 0.

#### Scenario: Có usage và bảng giá
- **WHEN** provider báo usage và catalog có đủ giá
- **THEN** UI hiện chi phí với nhãn ước tính theo bảng giá

#### Scenario: Thiếu giá
- **WHEN** provider báo usage nhưng model không có bảng giá
- **THEN** UI vẫn hiện token và ghi chi phí chưa biết

### Requirement: Không hiện token giả trước khi chạy hoặc trong dữ liệu mẫu sản phẩm

Các màn sản phẩm SHALL NOT hiện token tiêu tốn hoặc chi phí hard-code. Trước operation, UI SHALL hiện đơn vị công việc xác định được như số chương, số đoạn hoặc số lô; token ước lượng nội bộ dùng để lập batch SHALL không xuất hiện như usage. Trong lúc stream, UI SHALL không chạy bộ đếm token giả; usage chính xác chỉ xuất hiện khi provider báo.

#### Scenario: Kế hoạch dịch chưa chạy
- **WHEN** người dùng xem kế hoạch dịch một chương
- **THEN** UI hiện số lô và số đoạn, không hiện “Token ước lượng” như lượng sẽ tiêu tốn

#### Scenario: Operation đang stream
- **WHEN** provider chưa gửi usage cuối
- **THEN** UI hiện tiến độ công việc nhưng không tăng một bộ đếm token suy đoán
