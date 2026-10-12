## ADDED Requirements

### Requirement: Đăng nhập Kimi Code và xAI Grok bằng mã thiết bị

Bấm thẻ Kimi Code hoặc xAI Grok ở mục Tài khoản, hoặc trong onboarding, Mira SHALL bắt đầu đăng nhập bằng mã
thiết bị, với cùng các trạng thái `FlowPanel` như Codex và Copilot:

1. xin mã;
2. hiện mã dạng OTP và mở trang xác minh;
3. hỏi lại;
4. kết thúc ở thành công, bị từ chối, hết hạn, hủy hoặc lỗi.

Mọi trao đổi mạng SHALL chạy ở main process. Mira SHALL chỉ mở trang xác minh có scheme `https` và host
nằm trong danh sách của nhà cung cấp đó. Với xAI, Mira SHALL lấy endpoint qua OIDC discovery và từ chối
endpoint không phải `https` trên `x.ai` hoặc `*.x.ai`. Hỏi lại SHALL theo `interval` nhà cung cấp cho, tối
thiểu 5 giây, và cộng thêm 5 giây khi nhận `slow_down`. Đăng nhập Codex và Copilot SHALL giữ nguyên hành vi
hiện có.

#### Scenario: Đăng nhập Kimi thành công
- **WHEN** người dùng bấm thẻ Kimi Code, nhập mã ở trang của Kimi và xác nhận
- **THEN** Mira lưu token đã mã hóa, tạo kết nối Kimi Code, thêm model vào danh sách và hiện màn chọn model
  mặc định

#### Scenario: Discovery trả endpoint lạ
- **WHEN** discovery của xAI trả `token_endpoint` có host không thuộc `x.ai`
- **THEN** Mira dừng đăng nhập, báo lỗi và không gửi mã thiết bị tới host đó

#### Scenario: Codex không đổi
- **WHEN** người dùng đăng nhập Codex sau khi change này được áp dụng
- **THEN** request, header và trạng thái giống hệt trước change

### Requirement: Lưu, làm mới và gọi model của Kimi và xAI

Token Kimi và xAI SHALL chỉ được lưu đã mã hóa bằng `safeStorage`. Token SHALL không bao giờ về renderer.
Mira SHALL làm mới khi còn dưới 300 giây trước hạn, và làm mới một lần rồi thử lại khi API trả 401. Mỗi kết
nối SHALL chỉ có một lần làm mới chạy cùng lúc, và refresh token mới SHALL được ghi ngay. Làm mới bị từ
chối hẳn SHALL chuyển kết nối sang "Cần đăng nhập lại".

Kimi SHALL dùng Chat Completions tại `https://api.kimi.com/coding/v1`. xAI SHALL dùng Responses tại
`https://api.x.ai/v1`. Mira SHALL tự xưng là Mira và SHALL NOT gửi danh tính của Kimi CLI, Grok CLI hay
client khác. Mira SHALL NOT gửi hostname của máy.

#### Scenario: Refresh token Kimi bị từ chối
- **WHEN** làm mới token Kimi nhận HTTP 401
- **THEN** thẻ Kimi ghi "Cần đăng nhập lại", và lượt đang chạy báo lỗi kèm nút "Đăng nhập lại"

#### Scenario: Hai lượt cùng cần làm mới
- **WHEN** hai lượt dịch cùng thấy token xAI sắp hết hạn
- **THEN** Mira chỉ gửi một request làm mới, và cả hai lượt dùng token mới

### Requirement: Claude Pro/Max và Antigravity chỉ qua gateway

Mục Tài khoản và onboarding SHALL có thẻ Claude Pro/Max và thẻ Antigravity. Mỗi thẻ ghi "Chỉ qua gateway tự
chạy, rủi ro khóa tài khoản" và có link hướng dẫn dựng gateway. Mira SHALL NOT tự chạy OAuth và SHALL NOT
lưu, đọc hay tải về token của hai loại tài khoản này. Thẻ SHALL chỉ có nút "Đăng nhập qua gateway" khi đã
có một kết nối CLIProxyAPI loopback có khóa quản lý. Trước lần đăng nhập đầu tiên qua gateway cho mỗi nhà
cung cấp, Mira SHALL hỏi xác nhận rủi ro. Thẻ Claude SHALL giữ link sang Khóa API › Anthropic.

#### Scenario: Chưa có gateway
- **WHEN** người dùng bấm thẻ Claude Pro/Max khi chưa có kết nối CLIProxyAPI
- **THEN** Mira hiện cảnh báo rủi ro, link hướng dẫn dựng gateway và link sang khóa API Anthropic, và không
  mở trang đăng nhập nào

#### Scenario: Có gateway
- **WHEN** đã có gateway CLIProxyAPI loopback có khóa quản lý, và người dùng bấm "Đăng nhập qua gateway" ở
  thẻ Antigravity rồi xác nhận rủi ro
- **THEN** Mira bắt đầu đăng nhập qua Management API của gateway, và token chỉ nằm trong gateway

### Requirement: Nhận diện gateway CLIProxyAPI và luật loopback

Với một kết nối gateway, Mira SHALL tính gốc quản lý từ base URL. Mira SHALL coi gateway là CLIProxyAPI khi
`GET <gốc>/v8/management/config` trả về header `X-CPA-VERSION`, kể cả khi mã trạng thái là 401. Onboarding
và preset "Gateway tự dựng" SHALL thử `http://127.0.0.1:8317` một lần.

Base URL có host không phải `127.0.0.1`, `::1` hay `localhost` SHALL hiện cảnh báo. Với base URL đó, Mira
SHALL tắt mọi tính năng quản lý: không lưu khóa quản lý, không đăng nhập, không đọc trạng thái. Gọi model
qua gateway SHALL vẫn chạy như một endpoint thường.

#### Scenario: Gateway trên máy
- **WHEN** CLIProxyAPI chạy ở `127.0.0.1:8317` và người dùng mở form gateway
- **THEN** form ghi "CLIProxyAPI <phiên bản>" và mời nhập khóa quản lý

#### Scenario: Gateway ở máy khác
- **WHEN** base URL là `http://192.168.1.20:8317/v1`
- **THEN** form cảnh báo gateway không ở máy này, và không hiện ô khóa quản lý hay nút đăng nhập

### Requirement: Khóa quản lý gateway

Khóa quản lý SHALL được lưu đã mã hóa bằng `safeStorage`. Nếu máy không mã hóa được, Mira SHALL từ chối
lưu. Khóa SHALL không bao giờ về renderer; renderer chỉ nhận "đã có khóa" và 4 ký tự cuối. Main SHALL chỉ
gửi khóa tới đúng origin loopback của kết nối, SHALL kiểm lại origin trước mỗi request và SHALL NOT đi theo
redirect. Xóa kết nối SHALL xóa khóa.

#### Scenario: Redirect sang host khác
- **WHEN** một request quản lý nhận phản hồi 302 trỏ tới host khác
- **THEN** Mira không gửi lại request, báo lỗi, và khóa không rời máy

### Requirement: Đăng nhập tài khoản trong gateway qua Management API v8

Mira SHALL đăng nhập tài khoản trong gateway như sau:

1. gọi `GET /v8/management/oauth/auth-url?provider=<p>`;
2. mở `url` trả về, chỉ khi scheme là `https`;
3. hỏi `GET /v8/management/oauth/status?state=<state>` mỗi 2 giây cho tới khi nhận `ok` hoặc `error`.

Bấm Hủy SHALL gửi `DELETE /v8/management/oauth/session?state=<state>`. Provider được chọn SHALL nằm trong
`claude`, `codex`, `antigravity`, `kimi`, `xai`. Mira SHALL NOT đọc hay tải về file credential của gateway.

#### Scenario: Hủy đăng nhập qua gateway
- **WHEN** người dùng bấm Hủy khi gateway đang trả `wait`
- **THEN** Mira gửi `DELETE /v8/management/oauth/session` với `state` đó, ngừng hỏi lại và quay về danh sách
  thẻ

#### Scenario: Gateway báo lỗi
- **WHEN** `oauth/status` trả `{status: "error", error: "unknown or expired state"}`
- **THEN** `FlowPanel` hiện lỗi đăng nhập kèm Chi tiết, cùng các nút Thử lại và Chọn cách khác

### Requirement: Trạng thái, hạn mức và cảnh báo của gateway

Với gateway CLIProxyAPI có khóa quản lý, Mira SHALL đọc `GET /v8/management/credentials` và hiện mỗi tài
khoản gồm nhà cung cấp, email, trạng thái, thông báo trạng thái, và việc bị tắt hoặc tạm không dùng được.
Hạn mức SHALL chỉ hiện khi trường `quota.signals` không rỗng; ngược lại Mira SHALL ghi "Hạn mức: không rõ".
Mira SHALL NOT tự tính phần trăm hạn mức từ dữ liệu không có trường đó. Usage gateway không trả về SHALL hiện
"không rõ", không phải 0.

Khi `server.host` trong `GET /v8/management/config` rỗng hoặc vắng, Mira SHALL cảnh báo gateway đang nghe
trên mọi giao diện mạng, và chỉ cách đặt `server.host: "127.0.0.1"`. Mira SHALL NOT tự sửa cấu hình gateway.

#### Scenario: Không có dữ liệu hạn mức
- **WHEN** credential Claude trong gateway có `quota.signals` rỗng
- **THEN** thẻ ghi "Hạn mức: không rõ", không ghi 0 % hay 100 %

#### Scenario: Gateway mở ra LAN
- **WHEN** cấu hình gateway có `server.host: ""`
- **THEN** khối gateway hiện cảnh báo nghe trên mọi giao diện mạng, kèm dòng sửa cấu hình

### Requirement: Hết hạn mức không tự chuyển, nhiều tài khoản chỉ trong một nhà cung cấp

Khi lượt gọi qua kết nối tài khoản hoặc gateway CLIProxyAPI hết hạn mức, Mira SHALL dừng lượt và báo mốc
đặt lại nếu biết. Mira SHALL NOT tự chuyển sang khóa API trả tiền, nhà cung cấp khác, model khác hay kết nối
khác.

Nhiều tài khoản SHALL chỉ dùng được khi người dùng bật "Dùng nhiều tài khoản" trên thẻ của nhà cung cấp, và
chỉ trong nhà cung cấp đó. Mira SHALL chọn và đóng băng tài khoản bằng `KeyScheduler`. Khi mọi tài khoản đều
bị đóng băng, Mira SHALL dừng lượt với mốc hồi sớm nhất. Khi công tắc tắt, Mira SHALL chỉ dùng tài khoản
đầu tiên.

#### Scenario: Hết hạn mức tài khoản duy nhất
- **WHEN** tài khoản Kimi duy nhất trả lỗi hết hạn mức và chuỗi dự phòng có một model khóa API
- **THEN** lượt dừng với lỗi hết hạn mức kèm mốc đặt lại, Mira không gọi model dự phòng, và lượt có nút "Thử
  bằng <model dự phòng>"

#### Scenario: Hai tài khoản cùng nhà cung cấp
- **WHEN** người dùng đã bật nhiều tài khoản cho xAI, và tài khoản 1 hết hạn mức
- **THEN** lượt sau đi bằng tài khoản 2 của xAI; khi tài khoản 2 cũng hết, lượt dừng với mốc hồi sớm nhất
