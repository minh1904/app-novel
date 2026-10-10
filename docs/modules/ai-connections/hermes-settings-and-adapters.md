# Cài đặt và lớp provider của Hermes: học được gì

Cập nhật: 2026-10-09 · Trạng thái: **Quan sát Hermes** (phần 1–2), **snapshot lịch sử Mira**
(phần 3) và **đề xuất lịch sử** (phần 4–5). Quyết định và implementation mới nằm ở
[Kết nối AI](README.md) và [rà flow](hermes-ux-flow-review.md).

## Câu hỏi chương này trả lời

Chủ sản phẩm muốn màn Cài đặt và cách Mira tích hợp nhà cung cấp AI cũng theo hướng Hermes. Hermes dựng
màn Cài đặt ra sao, nó khai và gọi provider thế nào, và phần nào Mira nên lấy?

Đường dẫn Hermes bên dưới: `ds/` là `apps/desktop/src`, `S/` là `ds/app/settings/`; còn lại tính từ gốc
repo `D:\personal\hermes-agent`.

## 1. Màn Cài đặt của Hermes (quan sát)

**Khung.**

- Cài đặt là một **thẻ lớn phủ lên app**, không phải một trang (`ds/app/overlays/overlay-view.tsx`).
- Nền phủ đen 22 % có blur. Thẻ bo `rounded-xl`, viền stroke-secondary, `shadow-md`, có nút X; Esc hoặc
  bấm ra ngoài thì đóng.
- **Điều hướng dọc rộng 13rem** ở trái (`overlay-split-layout.tsx`):
  - mục cao 28 px, chữ 13 px, icon 16 px;
  - mục con thụt vào, icon 14 px, chữ màu tertiary;
  - mục đang chọn có nền tertiary và viền mảnh.
  - Dưới 47,5rem, cột điều hướng thành một dropdown.
- **Đầu trang là breadcrumb** "Settings › Nhóm › Mục" (12 px, tertiary). Vì breadcrumb đã nói tên trang,
  trang không lặp tiêu đề.
- **Tìm kiếm:** một ô hình viên thuốc nằm vắt trên mép thẻ. Gõ bất kỳ phím chữ nào khi không ở trong ô
  nhập là mở bảng lệnh, lọc sẵn theo cài đặt.
- **Link sâu:** dùng query `?tab=`, `?page=`, `?pview=`, `?key=`. Mục được trỏ tới nhấp sáng 1,6 giây.

**Hàng cài đặt.** Một component dùng chung `ListRow` (`S/primitives.tsx:146-202`):

- Tên 13 px medium; mô tả 12 px tertiary.
- Control nằm ở cột phải rộng 15–22rem. Khi pane hẹp, control rơi xuống dưới mô tả (container query).
- Các hàng **không có đường kẻ**, chỉ cách nhau bằng khoảng trắng (`py-3`).
- Mọi giá trị bật/tắt là Switch, không dùng segmented control hai lựa chọn.
- Nhóm hàng có `SectionHeading` 13 px kèm icon.
- Nội dung rộng tối đa 75rem, lề `clamp(1.25rem, 4vw, 4rem)`.

**Lưu.**

- Phần lớn cài đặt tự lưu sau 550 ms không gõ, không có nút Áp dụng.
- Có nút rõ ràng cho model chính (Apply), khóa (Save tại chỗ) và endpoint tùy chỉnh (Test, Save).
- Toast: thành công hiện 5 giây ở góc dưới phải; lỗi hoặc toast có nút thì đứng yên ở giữa trên.

**Nhóm Providers.** Có bốn mục con:

- **Accounts:** dòng nổi bật, nhóm "Connected", nút "Connect another provider". Dòng đã kết nối có thẻ
  "✓ Connected" nền accent 10 % và nút thùng rác; khi đang gỡ, thùng rác thành spinner.
- **API keys:**
  - Trên cùng là một dòng "Local / custom endpoint" và ô tìm kiếm.
  - Mỗi provider là một thẻ có chấm trạng thái (accent khi có khóa, xám khi chưa).
  - Ô khóa hiện `••••` như chữ thường; bấm vào thì thành ô sửa, có nút Save và nút xóa.
  - Mở thẻ ra thì có mô tả, các trường phụ (base URL…) và link "Get key ↗".
- **Custom endpoints:**
  - Danh sách endpoint, mỗi dòng có nhãn "✓ Active" và nút "Use".
  - Form gồm tên, URL, **API Mode** (Auto / Chat Completions / Responses / Anthropic Messages), model mặc
    định lấy từ danh sách tự dò, context, khóa, cùng hai nút Test và Save.
- **Local.**

**Nhóm Model.**

- **Main:** select provider, select model và nút Apply. Provider chưa có khóa thì hiện ngay ô dán khóa
  và nút Activate. Dưới đó là mức suy luận và tốc độ, chỉ hiện khi model hỗ trợ.
- **Auxiliary:** model riêng cho từng việc phụ, mặc định đi theo model chính.
- **Fallbacks:** danh sách model dự phòng có thứ tự.
- **MoA.**

**Nhóm Appearance.**

- Theme: Light / Dark / System cùng thư viện skin dạng thẻ có ảnh xem trước.
- Cỡ giao diện và cỡ chữ chat: các mức 90–175 %.
- Font chat, có dòng xem trước.
- Kính: Clear / Glass, các thanh trượt Tint và Fade, và phạm vi kính. Trong lúc kéo thanh trượt, thẻ cài
  đặt mờ đi để thấy cửa sổ phía sau.

## 2. Lớp provider của Hermes (quan sát)

**Khai provider bằng dữ liệu.**

- `ProviderProfile` (`providers/base.py:41-435`) là một dataclass, gồm:
  - tên, `api_mode`, `base_url`, `env_vars`, `auth_type`;
  - `fallback_models`, `default_headers`, `model_capabilities`.
- Có các hook tùy chọn:
  - `build_api_kwargs_extras` (tham số suy luận);
  - `build_extra_body`;
  - `fetch_models`;
  - `classify_api_error`;
  - `supported_reasoning_efforts`;
  - `create_client`.
- Mỗi provider là một plugin nhỏ trong `plugins/model-providers/<slug>/`.
- Thêm một provider OpenAI-compatible chỉ cần khai tên, URL và biến khóa. Liệt kê model, kiểm tra sức
  khỏe và transport tự nối.

**Transport theo `api_mode`.**

- Bốn mode: `chat_completions`, `codex_responses`, `anthropic_messages`, `bedrock_converse`.
- Mode được chọn theo thứ tự (`hermes_cli/runtime_provider.py:142-180`):
  1. cấu hình;
  2. host bắt buộc, ví dụ `api.anthropic.com`;
  3. khai báo của provider;
  4. mặc định là `chat_completions`.
- Mỗi transport (`agent/transports/base.py`) có năm việc: `convert_messages`, `convert_tools`,
  `build_kwargs`, `normalize_response`, `map_finish_reason`.

**Một định dạng nội bộ duy nhất.**

- Bên trong luôn là tin nhắn và tool theo chuẩn OpenAI; chỉ đổi định dạng ở rìa.
- Mọi phản hồi về một kiểu `NormalizedResponse`, gồm nội dung, tool call, `finish_reason`, suy luận và
  usage.
- Phản hồi stream được gom lại thành đúng hình dạng của phản hồi không stream, rồi đi qua cùng một hàm
  chuẩn hóa.
- Tool call bị cắt hoặc JSON hỏng được sửa và đánh dấu (`_assemble_tool_calls`).
- Gemini native **không** có transport riêng: Hermes giữ `chat_completions` và thay client OpenAI bằng
  một client giả cùng hình dạng (`agent/gemini_native_adapter.py`).

**Suy luận.**

- Thang chung `none, minimal, low, medium, high, xhigh, max`.
- `clamp_effort` chọn mức gần nhất **yếu hơn**, không bao giờ nâng.
- Từng hãng có cách gửi riêng: OpenRouter `reasoning{effort}`, DeepSeek `thinking{type}`, Anthropic
  `thinking` adaptive hoặc `budget_tokens`, Gemini `thinkingConfig`.

**Lỗi, khóa, dự phòng.**

- **Lỗi:** `FailoverReason` có khoảng 20 lý do. Mỗi lý do mang cờ `retryable`, `should_rotate_credential`,
  `should_fallback`, `should_compress`. Thứ tự phân loại: hook của provider → mã lỗi → nội dung thông báo
  → HTTP status.
- **Pool khóa:**
  - Bốn chiến lược: fill_first, round_robin, random, least_used.
  - Thời gian nghỉ: 401 nghỉ 5 phút, 429 nghỉ 60 phút.
  - Có thời gian nghỉ **theo từng model**, để một model bị giới hạn không khóa cả khóa.
- **Chuỗi dự phòng:** `fallback_providers` thử lần lượt từng model và báo người dùng bằng một dòng
  "Model fallback: X không dùng được (lý do); chuyển sang Y".

**Kiểm endpoint tùy chỉnh** (`hermes_cli/web_routers/config_env.py:852-1053`). Hermes làm ba bước:

1. Gọi `{base}/models`, rồi thử biến thể có hoặc không có `/v1`. Ghi lại **base URL đã giải ra**.
2. Gửi một request 1 token tới route của mode đã chọn. Chỉ 404/405/501 mới kết luận là "host không phục
   vụ API này".
3. Khi 200 mà không có model nào, coi như URL sai, ví dụ trỏ vào một trang web.

Kiểm khóa trước khi lưu: 401/403 nghĩa là khóa sai; 200 hoặc 429 nghĩa là khóa đúng; lỗi mạng thì vẫn cho
lưu nhưng có cảnh báo.

## 3. Mira hiện có gì (đối chiếu lại 2026-10-09)

| Hermes | Mira hiện tại |
| --- | --- |
| `ProviderProfile` khai bằng dữ liệu | `compat.ts`: bảng khác biệt theo `providerId` (`maxTokensField`, `streamUsage`), cùng tinh thần "dữ liệu, không dò URL" (design D10 của `ai-gateway`). Preset ở `aiConnections.ts`. |
| Transport theo `api_mode` | Ba transport: Chat Completions, Responses và Anthropic Messages; Codex, Copilot và custom endpoint chọn mode qua `transportFactory.ts`. Không có Gemini native hay Bedrock. |
| Thang suy luận và clamp | `modelCapability.ts` cùng `nearestThinkingLevel`: mức lấy từ catalog models.dev; model lạ chỉ có "Mặc định". Khác Hermes ở chỗ mức bị từ chối thì báo lỗi rõ, không lặng lẽ hạ. |
| `FailoverReason` | `ProviderErrorKind` cùng `errorPolicy.ts` quyết định retry, dừng run và fallback. Mira dùng policy function thay vì đặt mọi cờ trên enum lỗi. |
| Pool khóa | `keyPool.ts`, `gateway/keyScheduler.ts`, `limiter`, `ratePacer`, `retryPolicy`. Chưa có thời gian nghỉ theo model. |
| Chuỗi dự phòng | Đã có cho chat trong `fallback.ts`; dịch chương không tự đổi model mà mời người dùng tiếp tục bằng model khác. |
| Catalog và giá | `modelCatalog.json`, bản chụp models.dev. |
| Kiểm endpoint | `endpointProbe.ts` thử `/models`, biến thể `/v1` và route theo API mode, rồi lưu base URL đã giải. |

## 4. Đề xuất lịch sử cho màn Cài đặt

> Phần này giải thích thiết kế trước khi triển khai. Modal, nav, toast, endpoint form và Model List đã
> có; `ModelEntries` không còn nằm trong thẻ provider.

Làm theo khung Hermes, nhưng chỉ có những nhóm mà Mira có nội dung thật:

- **Khung:** thẻ phủ lên app như Hermes, điều hướng dọc 13rem, breadcrumb, có tìm kiếm.
- **Nhóm:**

  | Nhóm | Gồm |
  | --- | --- |
  | **Model** | Model mặc định cho dịch và cho chat; mức suy luận |
  | **Kết nối AI** | Tài khoản; Khóa API; Endpoint tùy chỉnh; Trên máy (Ollama, LM Studio) |
  | **Giao diện** | Theme sáng/tối/hệ thống; sau này là cỡ chữ (kính đã gỡ ngày 2026-10-08) |
  | **Về Mira** | Phiên bản |

  Không vẽ nhóm chưa có nội dung, giữ nguyên tắc của màn hiện tại.
- **Hàng:** dùng `SettingRow` của Mira, sửa theo `ListRow`: không kẻ đường, control rơi xuống dưới khi
  pane hẹp.
- **Lưu:** tự lưu sau 550 ms cho trường văn bản. Khóa API giữ nút Lưu tại chỗ, vì dán nhầm khóa là chuyện
  phải xác nhận.
- **Thẻ provider:** theo kiểu "API keys" của Hermes, có chấm trạng thái, ô khóa `••••` bấm để sửa và link
  lấy khóa. Danh sách model đã được tách sang trang Model › Danh sách model.

## 5. Trạng thái các đề xuất lớp provider

- **Đã triển khai:** endpoint probe, ba transport, OAuth Codex/Copilot, fallback chat và lỗi theo policy.
- **Đã chốt khác đề xuất:** dịch chương không tự đổi model; nó mời người dùng dịch tiếp phần thiếu bằng
  model khác để tránh đổi giọng âm thầm.
- **Chưa triển khai:** cooldown theo từng model trong pool khóa và hook/profile tổng quát cho tham số
  suy luận theo hãng.
- **Không lấy:** Bedrock, Gemini native, plugin provider từ thư mục người dùng và lưu token không mã hóa.

---

[Kết nối AI](README.md) · [Mục lục module](../README.md)
