## Purpose

Quy định cách người dùng khai và kiểm các nhà cung cấp AI trong modal Cài đặt theo Hermes Desktop: tài
khoản, khóa API, endpoint tùy chỉnh và model chạy trên máy.

## ADDED Requirements

### Requirement: Bốn mục của nhóm Kết nối AI

Nhóm Kết nối AI SHALL có bốn mục:

- **Tài khoản:** đăng nhập bằng gói thuê bao.
- **Khóa API:** một thẻ cho mỗi provider đã biết.
- **Endpoint tùy chỉnh:** gateway tự dựng và mọi URL tương thích OpenAI.
- **Trên máy:** Ollama, LM Studio.

Mỗi kết nối hiện có SHALL hiện ở đúng một mục, theo loại của nó.

#### Scenario: Kết nối cũ
- **WHEN** người dùng có sẵn một kết nối Google Gemini và một gateway ở `127.0.0.1:8317`
- **THEN** Gemini hiện ở Khóa API, gateway hiện ở Endpoint tùy chỉnh, cả hai giữ nguyên khóa và mục model

### Requirement: Mục Tài khoản

Mục Tài khoản SHALL có:

- nhóm "Đã kết nối";
- nhóm "Nhà cung cấp khác";
- liên kết "Có khóa API?" sang mục Khóa API.

Mỗi thẻ SHALL có tên, cách đăng nhập (mở trình duyệt, hoặc nhập mã thiết bị) và trạng thái. Khi chưa có
luồng đăng nhập chạy được, thẻ SHALL ghi "Sắp có" và nút bị khóa. Thẻ Claude SHALL nói rõ Mira không đăng
nhập bằng gói Claude Pro/Max, và dẫn tới thẻ Anthropic ở Khóa API.

#### Scenario: Trước khi có đăng nhập thuê bao
- **WHEN** người dùng mở mục Tài khoản trước khi change `subscription-providers` xong
- **THEN** thẻ ChatGPT/Codex và GitHub Copilot ghi "Sắp có" với nút bị khóa; thẻ Claude dẫn sang Khóa API

### Requirement: Thẻ khóa API

Mỗi provider trong danh sách của Mira SHALL có một thẻ. Danh sách gồm Google Gemini, OpenRouter, OpenAI,
DeepSeek và Anthropic.

**Thẻ đóng** gồm:

- chấm trạng thái: accent khi có khóa dùng được, xám khi chưa có;
- tên;
- ô khóa hiện `••••` cùng 4 ký tự cuối.

Bấm vào ô khóa SHALL chuyển sang sửa. Gõ vào thì hiện nút Lưu và Xóa. Enter lưu, Esc hủy.

**Thẻ mở ra** gồm: mô tả, link "Lấy khóa ↗", danh sách khóa của kết nối, các mục model, và các trường phụ
(base URL).

Một ô tìm kiếm SHALL lọc các thẻ theo tên. Khóa SHALL tiếp tục chỉ được lưu mã hóa và không bao giờ trả
đầy đủ về renderer.

#### Scenario: Dán khóa lần đầu
- **WHEN** người dùng mở thẻ OpenRouter chưa có kết nối, dán khóa rồi nhấn Enter
- **THEN** Mira tạo kết nối OpenRouter với khóa đó, kiểm khóa, và chấm trạng thái chuyển accent nếu khóa
  đúng

#### Scenario: Thẻ Anthropic
- **WHEN** chưa có transport Anthropic
- **THEN** thẻ Anthropic hiện ở danh sách nhưng ghi "Sắp có" và không nhận khóa

### Requirement: Kiểm endpoint và khóa

Kiểm một endpoint tương thích OpenAI SHALL gồm các bước:

1. Gọi `{base}/models`. Nếu không được, thử biến thể thêm hoặc bỏ `/v1`. Biến thể trả về danh sách model
   SHALL được ghi lại làm base URL của kết nối.
2. Gửi một request chat 1 token tới `{base}/chat/completions` với model đã chọn. Chỉ HTTP 404, 405 hoặc
   501 mới được kết luận là endpoint không phục vụ API chat.
3. HTTP 200 mà không có model nào SHALL được báo là URL có thể sai.

Kết quả kiểm khóa:

| Phản hồi | Kết quả |
| --- | --- |
| 401 / 403 | Khóa bị từ chối |
| 200 / 429 | Khóa đúng |
| Lỗi mạng | Không kết luận; vẫn cho lưu kèm cảnh báo |

Lỗi SHALL được báo bằng lời của Mira, không phải mã HTTP trần.

#### Scenario: Gõ thiếu /v1
- **WHEN** người dùng khai `http://127.0.0.1:8317` cho một gateway chỉ trả model ở `/v1/models`
- **THEN** Kiểm tra thành công và base URL được lưu thành `http://127.0.0.1:8317/v1`

#### Scenario: URL trỏ vào trang web
- **WHEN** URL trả HTTP 200 với một trang HTML và không có model
- **THEN** Kiểm tra báo "Địa chỉ trả về trang web chứ không phải danh sách model; kiểm lại URL"

#### Scenario: Mất mạng
- **WHEN** người dùng dán khóa OpenAI lúc mất mạng
- **THEN** khóa được lưu, và thẻ ghi "Chưa kiểm được: không có mạng"

### Requirement: Endpoint tùy chỉnh

Mục Endpoint tùy chỉnh SHALL liệt kê mọi endpoint không thuộc provider đã biết. Mỗi dòng gồm: tên, URL
(chữ mono), nhãn "Đang dùng" nếu đó là kết nối của model chính, model mặc định, và nút Dùng và Xóa.

Form thêm/sửa SHALL gồm:

- tên;
- URL;
- chế độ API: Tự nhận / Chat Completions. Các chế độ khác thêm ở change `subscription-providers`;
- model mặc định, chọn từ danh sách dò được hoặc gõ tay;
- context, để trống là tự động;
- khóa: khi sửa, để trống là giữ khóa cũ.

Form có hai nút Kiểm tra và Lưu. Kiểm tra thành công SHALL tự điền model và base URL đã giải.

#### Scenario: Thêm gateway
- **WHEN** người dùng điền URL gateway, bấm Kiểm tra rồi Lưu
- **THEN** endpoint mới hiện trong danh sách với model đầu tiên dò được làm mặc định

### Requirement: Mục Trên máy

Mục Trên máy SHALL có Ollama và LM Studio. Mỗi mục có địa chỉ mặc định, nút Kiểm tra, và danh sách model
đang có trên máy. Mục này SHALL không đòi khóa.

#### Scenario: Ollama chưa chạy
- **WHEN** người dùng bấm Kiểm tra Ollama khi Ollama chưa chạy
- **THEN** mục báo "Không kết nối được tới Ollama ở 127.0.0.1:11434; hãy mở Ollama rồi thử lại"
