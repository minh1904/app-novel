## Context

Lý do của change xem `proposal.md`. Số đo UI của Hermes nằm ở
`docs/modules/ai-connections/hermes-settings-and-adapters.md`, phần 1.

Hiện trạng Mira, đọc ngày 2026-10-08:

- **Màn Cài đặt:** `SettingsScreen.tsx` là một view (`uiStore` có `view.name === 'settings'`), gồm danh
  sách `ConnectionCard`, menu "+ Thêm kết nối" theo `CONNECTION_PRESETS`, và `AppearancePanel` (kính) ở
  cuối.
- **Kết nối:**
  - bảng `ai_connection`, `ai_key`, `ai_model` trong SQLite thư viện;
  - khóa mã hóa bằng `safeStorage`, renderer chỉ thấy 4 ký tự cuối;
  - mỗi kết nối có `providerId` (của preset, hoặc `null`) và `defaultEntryId`.
- **Model:** không có model chính chung cho cả app. Chat và hộp thoại dịch chọn kết nối và mục qua
  `ModelSelectionMenu` (một menu lồng: kết nối → mục → mức suy luận).
- **Thư viện:** có bảng `meta (key, value)`.
- **Kiểm kết nối:** `ai:connections:test` gọi `/models` và lưu danh sách. Không thử biến thể `/v1`, không
  thăm dò route chat.
- **Phân loại lỗi:** `classifyError.ts` cho `ProviderErrorKind` (9 loại) kèm `retryable`. Gateway có
  `keyScheduler`, `retryPolicy`, `limiter`.
- **Theme:** `uiStore` chỉ bật/tắt sáng-tối; theme khởi động theo hệ thống.

## Goals / Non-Goals

**Goals:**

- Giao diện cấu hình giống Hermes: modal, Providers bốn mục, Model chính và Dự phòng, onboarding, menu
  model.
- Giữ nguyên mô hình dữ liệu kết nối của Mira (kết nối → khóa → mục model), chỉ thêm model chính và dự
  phòng.

**Non-Goals:**

- Không làm OAuth, Responses API hay Anthropic Messages: thuộc change `subscription-providers`.
- Không làm các nhóm Hermes mà Mira chưa có nội dung: Chat, Workspace, Safety, Voice, Keybinds, Plugins,
  Billing.
- Không làm nhập/xuất cài đặt JSON.
- Không đổi cách lưu và mã hóa khóa.

## Decisions

### D1. Modal là một lớp của `AppShell`, không phải một view

`uiStore` có thêm `settings: { open: boolean; group; page; focusKey? }`. View `settings` bị bỏ. Modal dùng
`@base-ui/react/dialog` (focus trap, Esc, trả focus) với các lớp `z-(--z-modal)` / `--z-backdrop` đã có.

Link sâu là hàm `openSettings({ group, page, key })`. Không dùng query URL, vì renderer không có router;
đó là khác biệt duy nhất với Hermes.

*Phương án loại:* giữ view toàn màn. Khi đó mở Cài đặt từ màn chương sẽ mất ngữ cảnh. Hermes chọn modal vì
lý do này.

### D2. Bố cục theo Hermes

| Phần | Giá trị |
| --- | --- |
| Lưới | `grid-cols-[13rem_minmax(0,1fr)]`; dưới 47,5rem là một cột và dropdown |
| Mục điều hướng | Cao 28 px, chữ 13 px, icon 16 px. Đang chọn: nền `bg-tertiary`, viền `line` |
| Breadcrumb | 12 px, faint, ngăn bằng ›. Mục cuối dùng màu chữ chính |
| Vùng nội dung | `PAGE_INSET_X = px-[clamp(1.25rem,4vw,4rem)]`, rộng tối đa 75rem |
| Ô tìm | Hình viên thuốc, vắt trên mép thẻ (`absolute -top-3.5 left-1/2`) |

`SettingRow` được viết lại theo `ListRow`: container query `@2xl:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)]`,
`py-3`, không viền. Tailwind 4 hỗ trợ sẵn `@container`.

Tìm kiếm là một chỉ mục tĩnh `settingsIndex` gồm nhóm, mục, khóa, tên và mô tả, cộng các thẻ provider sinh
từ danh sách preset. Kết quả hiện trong một popover dùng `menuSurfaceClass`. Mira chưa có command palette.

### D3. Lưu

Hook `useAutosave(value, save, 550)` giữ hàng đợi tuần tự. Lần lưu sau đợi lần trước xong, giống
`config-settings.tsx:212-266` của Hermes.

Toast là store và component mới (`notify`): thành công 5 giây ở góc dưới phải; lỗi hoặc toast có nút đứng
yên ở giữa trên. Toast thay `Banner` lỗi trong các luồng cài đặt; `Banner` vẫn dùng ở các màn khác.

### D4. Phân loại kết nối vào bốn mục

Một hàm thuần `connectionSection(connection)` quyết định mục:

| Kết nối | Mục |
| --- | --- |
| `providerId` thuộc `{google, openrouter, openai, deepseek, anthropic}` | Khóa API |
| `providerId === 'lmstudio'`, hoặc preset Ollama (`providerId: null` với host `127.0.0.1:11434`) | Trên máy |
| `authKind === 'oauth'` | Tài khoản (cột thêm ở change sau; change này luôn sai) |
| Còn lại | Endpoint tùy chỉnh |

Preset Ollama được gắn `providerId: 'ollama'` để khỏi phải dò host. Kết nối cũ thì một migration nhỏ sửa:
`providerId IS NULL` và base URL đúng mặc định Ollama.

Thẻ Khóa API của provider chưa có kết nối là thẻ "ảo". Dán khóa vào thì tạo kết nối từ preset tương ứng
rồi thêm khóa, trong một lệnh IPC `ai:connections:ensure-with-key`.

Danh sách provider và mô tả (`PROVIDER_CARDS`) là dữ liệu cạnh `CONNECTION_PRESETS`, gồm: id, tên, mô tả,
link lấy khóa, và trạng thái hỗ trợ (`ready` | `soon`). Anthropic là `soon` cho tới change sau.

### D5. Kiểm endpoint hai bước

`probeEndpoint(baseUrl, key)` trong `connectionService`:

1. **Dò `/models`.** Gọi `GET {base}/models`. Nếu không phải 2xx, hoặc 2xx mà không phải JSON hay không
   có model, thử `{base}/v1/models` (khi base chưa có `/v1`) hoặc bản bỏ `/v1`.
   - 401/403 là khóa sai, dừng ngay.
   - 200 với HTML, hoặc JSON không có model, là "URL có thể sai".
2. **Thăm dò route.** Gửi `POST {resolved}/chat/completions` với `max_tokens: 1` và model đã chọn (hoặc
   model đầu tiên). Chỉ 404/405/501 mới là "không phục vụ API chat". Lỗi khác như 400 hay 429 vẫn là
   "phục vụ".

Kết quả: `{ ok, reachable, resolvedBaseUrl, models, message, checked: ['models', 'route'] }`. Khi `ok`
và `resolvedBaseUrl` khác URL đang lưu, Lưu sẽ ghi URL đã giải.

Endpoint `localhost` / `127.0.0.1` đi qua `net.fetch` hiện có, không dùng proxy hệ thống. Cần kiểm trong
`fetchAdapter`.

*Phương án loại:* chỉ dò `/models`. Gateway CLIProxyAPI trả `/models` nhưng có thể không phục vụ đúng route
chat; Hermes thêm bước thăm dò route vì gặp đúng chuyện này.

### D6. Model chính và dự phòng trong `meta`

- Khóa `ai.main`: `{ connectionId, entryId, thinking? }`.
- Khóa `ai.fallbacks`: `[{ connectionId, entryId }]`.
- Kiểm bằng valibot khi đọc. Mục trỏ tới kết nối hoặc mục đã xóa thì bị bỏ khi đọc và khi xóa (dọn trong
  `deleteConnection` / `deleteModelEntry`).

Thứ tự chọn model cho một lượt:

1. lựa chọn riêng của phiên chat hoặc của hộp thoại dịch;
2. `ai.main`;
3. mục mặc định của kết nối bật đầu tiên (hành vi hiện nay).

### D7. Chuyển dự phòng nằm ở lớp dịch vụ, sau retry của gateway

> **Cập nhật khi triển khai (2026-10-08):** luật được viết thành hàm `shouldFallback(error)` trong
> `services/ai/fallback.ts`, không thêm trường vào `ProviderError`, để transport không biết luật sản phẩm.
> Chat đã chạy. Dịch chương **không tự chuyển** (cách A, chủ sản phẩm chọn): đề xuất dịch gắn một model
> (`prior.model` phải khớp) và một chương không nên tự đổi giọng văn. Bảng `errorPolicy` có thêm cột
> `fallback`; khi lượt dừng vì lỗi có cờ này, hộp thoại mời "Dịch tiếp bằng <dự phòng đầu tiên>" cho các
> đoạn còn thiếu, chạy thành một lượt và một đề xuất riêng.

Thêm `ProviderError.fallback: boolean`, tính trong `classifyError`:

| Loại lỗi | `fallback` |
| --- | --- |
| `quota` khi mọi khóa đều hết | true |
| `invalid_request` với mã model không tồn tại / không được phép (404 `model_not_found`, 403 permission) | true |
| `network` / `timeout` sau khi retry đã hết | true |
| `refused`, `auth` (khóa sai: sửa khóa chứ không đổi model), `cancelled`, `invalid_request` khác | false |

`withFallback(run, chain)` bọc một lần gọi model trong `chatService` và trong lô dịch. Khi lỗi có
`fallback`, nó lấy mục kế tiếp còn khóa dùng được, khác model vừa lỗi, rồi gọi lại và ghi bước chuyển
`{ from, to, reason }`. Lượt chat và lô dịch lưu bước chuyển vào cột JSON sẵn có của lượt (`tools`) và vào
metadata của lô.

Một lượt chat đã stream một phần câu trả lời rồi mới lỗi thì **không** chuyển giữa chừng. Lỗi đó báo như
thường, kèm nút "Thử bằng Y".

### D8. Menu model

Viết lại `ModelSelectionMenu` trên `@base-ui/react/menu`:

- **Ô tìm** là một `input` ở đầu popup. Phím mũi tên được quản lý thủ công trên một danh sách phẳng đã lọc,
  vì menu của base-ui không lọc được.
- **Submenu mức** dùng `MenuSubmenu` sẵn có.
- **Yêu thích** lưu `localStorage['mira.model-favorites']` (`connectionId:entryId`), đọc và ghi trong
  try/catch.
- **Nhóm thu gọn** lưu ở `localStorage['mira.model-groups-collapsed']`.

Cả hai là tiện ích riêng của máy, không phải dữ liệu; mất đi thì không sao.

Nhãn catalog (Preview, Flash) lấy từ `modelCatalog.json` nếu có trường tương ứng; không có thì không hiện.

`Ctrl+Shift+M` đăng ký trong panel chat, không đăng ký toàn cục.

### D9. Onboarding

Onboarding là một lớp phủ riêng (`z-(--z-over-modal)`). Máy trạng thái của Hermes, rút gọn cho change này:
`idle → key_form | endpoint_form → connecting → confirm_model → done`, cùng nhánh `error`. Các trạng thái
OAuth (`polling`, `external_pending`) thêm ở change sau.

"Để sau" lưu ở `meta` khóa `ai.onboarding.skipped`. Lưu ở thư viện chứ không ở `localStorage`, để đúng với
từng thư mục dữ liệu.

## Risks / Trade-offs

- **[Đổi chỗ quen thuộc]** Người dùng quen màn "Kết nối AI" toàn trang. → Bánh răng vẫn ở chỗ cũ; modal mở
  thẳng vào Kết nối AI › Khóa API khi chưa có model chính.
- **[Chuyển dự phòng đổi văn phong giữa một chương]** → Bước chuyển hiện rõ trên lô. Dự phòng trống là mặc
  định, nên người dùng phải tự bật. Đề xuất dịch vẫn phải duyệt.
- **[Thăm dò route tốn một request]** → 1 token, chỉ chạy khi bấm Kiểm tra hoặc lúc lưu endpoint mới.
- **[Modal lớn trên cửa sổ nhỏ]** → Cửa sổ tối thiểu 940×600. Dưới 47,5rem thì điều hướng thành dropdown.

## Migration Plan

- **Thư viện:** gắn `providerId = 'ollama'` cho kết nối Ollama cũ. Không đổi bảng.
- **`meta`:** chưa có `ai.main` thì giữ hành vi chọn hiện nay. Không cần di chuyển dữ liệu.
- **Quay lại:** revert code. Các khóa `meta` mới và `providerId = 'ollama'` không làm code cũ hỏng: preset
  Ollama cũ có `providerId: null`, nhưng code cũ chỉ dùng `providerId` để tra giá và `compat`, và cả hai
  đều có mặc định.

## Open Questions

- Có hiện giá trong menu model cho mọi provider không, hay chỉ khi catalog có? Hiện chọn "chỉ khi có". Đổi
  sau không ảnh hưởng spec.
