# provider-transports Specification

## Purpose
Quy định các transport mà Mira dùng để gọi model ngoài Chat Completions: Responses API (Codex, Copilot
gpt-5+), Anthropic Messages, và Chat Completions với header Copilot. Đồng thời quy định cách chọn transport
và cách mọi transport trả về cùng một dạng.

## Requirements

### Requirement: Một dạng nội bộ cho mọi transport

Mọi transport SHALL nhận tin nhắn và tool theo dạng nội bộ hiện có của Mira (vai trò system/user/assistant/
tool, tool kiểu function với tham số JSON Schema). Mọi transport SHALL trả về cùng các sự kiện stream:

- các `delta` chữ;
- đúng một kết thúc: `done` hoặc `tool-calls`;
- usage gồm token vào, token ra và token đọc từ cache;
- lý do kết thúc thuộc `stop`, `length`, `tool_calls`, `filter`.

Chat, dịch và tool chat SHALL không cần biết kết nối dùng transport nào.

#### Scenario: Dịch bằng Anthropic
- **WHEN** người dùng dịch một lô bằng kết nối Anthropic
- **THEN** lô chạy cùng luồng như với OpenRouter, và usage cùng chi phí được ghi như thường

#### Scenario: Tool chat qua Codex
- **WHEN** model Codex gọi `read_chapter` trong một lượt chat
- **THEN** vòng tool chạy như với Chat Completions, và kết quả tool được gửi lại đúng cuộc gọi đó

### Requirement: Chọn transport

Mỗi kết nối SHALL có chế độ API: `chat_completions`, `responses` hoặc `anthropic_messages`.

| Kết nối | Chế độ |
| --- | --- |
| Codex | Luôn `responses` |
| Anthropic | Luôn `anthropic_messages` |
| Copilot | Theo từng model: id `gpt-N` với N ≥ 5 (trừ `gpt-5-mini`) dùng `responses`, còn lại dùng `chat_completions` |
| Endpoint tùy chỉnh, chế độ "Tự nhận" | `anthropic_messages` khi host là `api.anthropic.com` hoặc đường dẫn kết thúc bằng `/anthropic`; còn lại `chat_completions` |

#### Scenario: Copilot với Claude
- **WHEN** người dùng chọn `claude-sonnet-4.6` qua Copilot
- **THEN** request đi tới `/chat/completions` của Copilot, không phải `/responses`

### Requirement: Transport Responses

Transport Responses SHALL gửi `POST {base}/responses` có stream. Thân request gồm:

- `instructions` lấy từ tin nhắn system;
- `input` là các mục có kiểu: `message` với phần `input_text` / `output_text`; `function_call` có `call_id`
  ≤ 64 ký tự và `arguments` dạng chuỗi JSON; `function_call_output`;
- `tools` dạng `{type:"function", name, description, strict:false, parameters}`, bỏ hẳn khóa khi không
  có tool;
- `store:false`;
- `reasoning:{effort, summary:"auto"}` khi có mức suy luận.

Với Codex, thân request SHALL có thêm `include:["reasoning.encrypted_content"]` và `prompt_cache_key`, và
SHALL NOT có `max_output_tokens`.

Transport SHALL đọc các sự kiện SSE:

| Sự kiện | Cách xử lý |
| --- | --- |
| `response.output_text.delta` | Chữ trả lời; bỏ qua phần thuộc phase commentary |
| `response.output_item.added` / `.done` | Mở và chốt lời gọi tool |
| `response.function_call_arguments.delta` / `.done` | Tham số tool |
| `response.completed` / `.incomplete` / `.failed` | Usage và trạng thái; không đọc `response.output` |
| `error` | Ném lỗi |

Lời gọi tool mở mà không có `.done` SHALL được chốt với tham số `{}`.

#### Scenario: Câu trả lời có tool
- **WHEN** stream có một `function_call` rồi `response.completed`
- **THEN** transport trả `tool-calls` với đúng tên, `call_id` và tham số đã ghép

#### Scenario: Chữ không phải chuỗi trần
- **WHEN** lịch sử có một lượt assistant là chuỗi
- **THEN** request gửi nó dưới dạng `{type:"message", role:"assistant", content:[{type:"output_text"}]}`,
  không gửi chuỗi trần

### Requirement: Header và danh sách model của Codex

Request tới Codex SHALL có các header sau, cùng `session_id` theo phiên chat:

- `Authorization: Bearer <access token>`;
- `ChatGPT-Account-ID`, lấy từ claim `https://api.openai.com/auth.chatgpt_account_id` của JWT;
- `x-openai-internal-codex-residency` khi JWT có claim residency;
- `originator: mira` và `User-Agent: Mira/<phiên bản>`.

Danh sách model SHALL lấy từ `GET {base}/models?client_version=99.0.0`. Nếu không có model, thử lại với
`client_version=0.0.0`. Bỏ các mục có `visibility` là `hide` / `hidden`, rồi sắp theo `priority`. Khi không
lấy được, dùng danh sách dự phòng tĩnh.

#### Scenario: Thiếu account id
- **WHEN** JWT không có `chatgpt_account_id`
- **THEN** kết nối báo "Tài khoản ChatGPT chưa có quyền dùng Codex" thay vì một danh sách model rỗng

### Requirement: Header và danh sách model của Copilot

Mọi request tới Copilot SHALL có:

- `Authorization: Bearer <token Copilot>`;
- `Editor-Version`;
- `Copilot-Integration-Id: vscode-chat`;
- `Openai-Intent: conversation-edits`;
- `x-initiator`: `user` cho request đầu của mỗi lượt người dùng, `agent` cho các vòng tool tiếp theo.

Request có ảnh SHALL có thêm `Copilot-Vision-Request: true`. Base URL SHALL lấy từ `endpoints.api` của
token Copilot, mặc định là `https://api.githubcopilot.com`.

Danh sách model SHALL lấy từ `GET /models`. Chỉ giữ mục có `capabilities.type == "chat"` và endpoint được
hỗ trợ.

Khi gặp lỗi `model_not_available_for_integrator`, `model_not_supported` hoặc 401, Mira SHALL đổi lại token
Copilot và thử lại một lần.

#### Scenario: Vòng tool
- **WHEN** một lượt chat Copilot gọi tool hai lần
- **THEN** request đầu có `x-initiator: user`, hai request sau có `x-initiator: agent`

### Requirement: Transport Anthropic Messages

Transport Anthropic SHALL gửi `POST {base}/v1/messages` có stream, với các header:

- `x-api-key`;
- `anthropic-version: 2023-06-01`;
- `anthropic-beta: interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14`.

Thân request gồm `system`, `messages`, `tools` dạng `{name, description, input_schema}`, và `max_tokens`
(bắt buộc). Mức suy luận SHALL đổi như sau:

| Model | `thinking` |
| --- | --- |
| Claude 4.6 trở lên | `{type:"adaptive"}` cùng `output_config.effort` |
| Model cũ hơn | `{type:"enabled", budget_tokens}` theo mức (thấp 4.000 … rất cao 32.000), với `temperature: 1` và `max_tokens` ≥ ngân sách + 4.096 |
| Haiku | Không gửi |

Prompt cache SHALL đánh dấu system prompt và các tool bằng `cache_control`. Danh sách model SHALL lấy từ
`GET /v1/models`, theo trang. Khóa không bắt đầu bằng `sk-ant-api` SHALL bị từ chối kèm giải thích.

#### Scenario: Khóa OAuth
- **WHEN** người dùng dán một token `sk-ant-oat…` vào thẻ Anthropic
- **THEN** Mira không lưu, và báo "Đây là token đăng nhập Claude, không phải khóa API. Lấy khóa API ở
  console.anthropic.com"

#### Scenario: Suy luận với Claude cũ
- **WHEN** người dùng chọn mức Cao cho một model Claude 4.5
- **THEN** request có `thinking:{type:"enabled", budget_tokens:16000}` và `max_tokens` ít nhất 20096

### Requirement: Chế độ API của endpoint tùy chỉnh

Form endpoint tùy chỉnh SHALL cho chọn Tự nhận, Chat Completions, Responses hoặc Anthropic Messages. Nút
Kiểm tra SHALL thăm dò route của chế độ đã chọn: `/chat/completions`, `/responses` hoặc `/v1/messages`.

#### Scenario: Gateway phục vụ Responses
- **WHEN** người dùng chọn Responses cho một gateway rồi bấm Kiểm tra
- **THEN** Mira gửi request 1 token tới `{base}/responses`, và báo phục vụ được trừ khi nhận 404/405/501
