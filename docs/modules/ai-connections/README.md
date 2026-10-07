# Kết nối AI

Cập nhật: 2026-10-08 · Trạng thái: **Đã chốt hướng** (mục "Quyết định 2026-10-08"); phần giao diện **đã
triển khai** (mục "Đã triển khai"), đăng nhập thuê bao chưa. Phần 1–2 là quan sát; phần 3–4 là đề xuất ngày 2026-10-07, đã bị quyết định mới thay ở các
điểm ghi rõ. Chủ trì: chủ sản phẩm, kỹ thuật.

## Câu hỏi chương này trả lời

Người dịch kết nối nhà cung cấp AI, chọn model và đổi model trong lúc chat bằng giao diện nào? Phần nào
của Hermes Desktop nên học theo, phần nào đã có backend để bấm được, và phần nào chỉ dựng giao diện?

## Quyết định 2026-10-08: cấu hình provider như Hermes

Chủ sản phẩm chốt: **toàn bộ cách cấu hình provider và subscription làm giống Hermes Desktop, trừ Nous
Portal**, kể cả Cài đặt dạng modal. Quyết định này **thay ADR-004** (một adapter, không OAuth
subscription, không preset mang tên CLI subscription) ở các điểm sau:

- **Cài đặt là một modal phủ lên app**, như Hermes: điều hướng dọc, breadcrumb, ô tìm kiếm, tự lưu.
  Nhóm Providers có bốn mục: Tài khoản, Khóa API, Endpoint tùy chỉnh, Trên máy. Nhóm Model có: Model
  chính, Dự phòng. Thêm onboarding lần đầu.
- **Đăng nhập subscription ngay trong app** cho **ChatGPT/Codex** và **GitHub Copilot**, bằng device code
  như Hermes. Token lưu bằng `safeStorage` ở main process. Hermes để token dạng chữ thường; Mira không
  làm vậy.
- **Mira có nhiều transport.** Ngoài Chat Completions, thêm Responses API cho Codex và header riêng cho
  Copilot.
- **Menu chọn model trong ô chat** như Hermes: tìm kiếm, yêu thích, submenu Thinking/Effort, cùng các mục
  "Dùng mặc định", "Tải lại model", "Thêm model tùy chỉnh", "Sửa danh sách model".

**Rủi ro chủ sản phẩm chấp nhận:** Codex và Copilot đăng nhập bằng client ID của công cụ chính hãng
(Codex CLI, plugin Copilot), giống Hermes. Nhà cung cấp có thể đổi hoặc chặn cách này, và tài khoản người
dùng có thể chịu rủi ro điều khoản. App phải nói rõ điều này ở thẻ đăng nhập.

**Không làm, dù Hermes có:**

- **Dùng gói Claude Pro/Max bằng token của Claude Code.** Hermes không có nút đăng nhập Claude trong app,
  và tự ghi lý do là trái chính sách OAuth của Anthropic. Khi gọi API, Hermes còn giả làm Claude Code (đổi
  user-agent, câu mở đầu system prompt, tên tool) để request không bị tính vào extra usage. Đó là lách cơ
  chế tính phí. Thẻ Claude của Mira dẫn sang khóa API Anthropic hoặc gateway tự dựng.
- **Nous Portal.**
- **Đăng nhập Google qua Gemini CLI, Antigravity hay Code Assist.** Hermes từng có hai provider này, rồi
  gỡ hẳn ngày 2026-06-21 (commit `7130d60861`, #50492). Lý do: Google đang khóa tài khoản dùng OAuth đó
  qua công cụ bên thứ ba. Lệnh khóa có thể lan ra cả tài khoản Google (Gmail, Drive), và vi phạm lần hai là
  khóa vĩnh viễn. Vì vậy "giống Hermes" nghĩa là không có mục này. Gemini vẫn dùng bằng khóa API
  (`generativelanguage.googleapis.com`) như hiện nay.

Đặc tả sẽ nằm ở change OpenSpec `hermes-provider-settings`. Phần chat tự gọi tool nằm ở
[Học UI chat của Hermes](../proposals/hermes-chat-research.md), mục "Quyết định 2026-10-08".

## Đã triển khai (change `hermes-settings-modal`, 2026-10-08)

Trạng thái: **đã chạy trong working tree**, chưa commit. Phần 1 bên dưới vẫn tả Mira trước change này.

**Modal Cài đặt**
(`src/renderer/src/features/settings/SettingsModal.tsx`)

- Nút bánh răng mở một thẻ phủ lên màn đang xem, không đổi view. Đóng bằng Esc, nút X hoặc bấm ra ngoài.
- Điều hướng dọc 13rem có bốn nhóm:
  - Model: Model chính, Dự phòng.
  - Kết nối AI: Tài khoản, Khóa API, Endpoint tùy chỉnh, Trên máy.
  - Giao diện.
  - Về Mira.
- Breadcrumb ở đầu trang. Ô tìm nằm vắt trên mép thẻ; gõ một phím chữ ở đâu trong thẻ cũng mở được.
- Link sâu (`openSettings({ group, page, key })`) làm hàng được trỏ tới nhấp sáng 1,6 giây.
- Toast mới: báo thành công hiện ở góc dưới phải và tự tắt sau 5 giây; báo lỗi đứng yên ở giữa trên.

**Khóa API**

- Mỗi provider một thẻ: Gemini, OpenRouter, OpenAI, DeepSeek, Anthropic. Anthropic ghi "Sắp có".
- Chấm trạng thái trên thẻ sáng khi có ít nhất một khóa dùng được.
- Ô khóa hiện `••••` + 4 ký tự cuối; dán khóa vào thẻ chưa có kết nối thì Mira tạo kết nối từ preset
  (`ai:connections:ensure-with-key`).
- Một provider có nhiều kết nối (ví dụ hai project Gemini) thì thẻ liệt kê tất cả.

**Kiểm endpoint**
(`src/main/services/ai/endpointProbe.ts`)

- Thử `/models`, rồi biến thể thêm hoặc bỏ `/v1`, và lưu base URL nào trả được danh sách.
- Gửi thêm một request chat 1 token. Chỉ HTTP 404, 405, 501 mới bị coi là "không phục vụ API chat".
- Trang HTML hoặc danh sách model rỗng bị báo là URL sai.
- Khóa bị từ chối (401/403) thì dừng ngay, không thử biến thể khác.

**Model chính và dự phòng**

- Lưu ở bảng `meta` của thư viện, khóa `ai.main` và `ai.fallbacks`.
- Xóa một kết nối hay một mục model thì tham chiếu tới nó cũng bị gỡ.
- Thứ tự chọn model cho chat mới, hộp thoại dịch và hàng chờ dịch:
  1. Model chọn riêng cho phiên.
  2. Model chính.
  3. Mục mặc định của kết nối bật đầu tiên.
- Chat tự chuyển sang dự phòng khi gặp các lỗi: hết hạn mức, bị giới hạn tốc độ, model không tồn tại hoặc
  không được phép, mạng lỗi, quá thời gian chờ, phản hồi hỏng. Luật nằm ở
  `src/main/services/ai/fallback.ts`.
- Không chuyển dự phòng khi câu trả lời đã stream được một phần chữ.
- Mỗi lần chuyển, lượt chat ghi một dòng "Đã chuyển sang Y vì X …". Lượt lỗi có thêm nút "Thử bằng Y".
- **Dịch chương không tự chuyển model** (chủ sản phẩm chọn ngày 2026-10-08): mỗi đề xuất dịch gắn một model
  và một chương không nên tự đổi giọng văn. Khi lượt dừng vì lỗi mà chính sách lỗi đánh dấu `fallback`
  (hết hạn mức, giới hạn tốc độ, mạng, quá giờ, phản hồi hỏng), hộp thoại mời **"Dịch tiếp bằng Y"**. Bấm
  thì Mira dịch riêng các đoạn còn thiếu bằng Y, vào một đề xuất mới; các đoạn đã dịch giữ nguyên.

**Menu model**
(`src/renderer/src/features/models/ModelSelectionMenu.tsx`)

- Ô tìm, nhóm Yêu thích, nhóm theo kết nối (thu gọn được), nhãn mức suy luận đang đặt.
- Submenu "Tùy chọn: Suy luận / Mức" chỉ liệt kê những mức model hỗ trợ.
- Bốn lối tắt ở cuối menu. `Ctrl+Shift+M` mở menu khi panel chat đang mở.
- Yêu thích và trạng thái thu gọn nhóm lưu trong `localStorage` của máy.

**Onboarding**
(`src/renderer/src/features/onboarding/`)

- Tự hiện khi thư viện chưa có kết nối nào và người dùng chưa bấm "Để sau". "Để sau" được lưu vào `meta`.
- Các lựa chọn: Gateway tự dựng (nổi bật), "Nhà cung cấp khác", "Tôi có khóa API".
- Khóa kiểm không qua thì bị gỡ ra, rồi hiện ba nút: Thử lại, Dùng khóa API khác, Chọn nhà cung cấp khác.

**Đã kiểm bằng app thật** (bản build trên Windows 11, dữ liệu fixture và một thư mục dữ liệu trống):

- Mở và đóng modal, điều hướng giữa các nhóm.
- Gõ phím để mở tìm kiếm.
- Trang Khóa API, Endpoint tùy chỉnh, Tài khoản.
- Menu model, submenu mức suy luận, phím `Ctrl+Shift+M`.
- Onboarding đến trạng thái lỗi, dùng một khóa Gemini giả.

Chưa chạy hết luồng onboarding tới bước "Bắt đầu", vì cần một khóa thật.

## 1. Mira hiện có gì (quan sát mã, 2026-10-07)

**Kết nối:**

- Một adapter OpenAI-compatible duy nhất (`src/main/infra/providers/openAiCompatible.ts`), với gateway có
  hàng khóa, giới hạn tốc độ và retry.
- Bảy preset chỉ là dữ liệu (`src/shared/contracts/aiConnections.ts`): gateway tự dựng ở `127.0.0.1:8317`,
  Google Gemini, OpenRouter, OpenAI, DeepSeek, Ollama và LM Studio.
- Mỗi kết nối có nhiều khóa và nhiều **mục model**. Một mục model gồm model cùng các cài đặt của nó.

**Khóa API:**

- Lưu trong SQLite của thư viện, mã hóa bằng Electron `safeStorage`. Nếu máy không mã hóa được thì từ chối
  lưu, không bao giờ ghi khóa dạng chữ thường.
- Renderer chỉ nhận lại 4 ký tự cuối của khóa.

**Giao diện:**

- Cài đặt → "Kết nối AI": menu "+ Thêm kết nối" theo preset và danh sách `ConnectionCard`
  (`src/renderer/src/features/settings/`).
- Các hộp thoại model nằm ở `src/renderer/src/features/models/`.
- `ModelSelectionMenu.tsx` là menu chọn kết nối → mục → mức suy luận. Ô chat và hộp thoại dịch dùng chung
  menu này.

**Giá model:** có sẵn bảng giá `modelCatalog.json`, chụp từ models.dev.

**Không có:**

- Đăng nhập bằng gói thuê bao (subscription).
- Màn onboarding.
- Ô tìm kiếm model và danh sách model yêu thích.
- Chip hạn mức.

ADR-004 (handbook cũ, commit `501be2a`) và spec của change `ai-connection` (đã lưu trữ ngày 2026-10-02)
quyết định:

- Một adapter duy nhất.
- **Không có OAuth subscription.**
- **Không có preset mang tên công cụ CLI subscription.**

## 2. Hermes Desktop làm thế nào (quan sát mã, commit `bf871a5943`, 2026-10-07)

Đường dẫn tính từ gốc `D:\personal\hermes-agent`.

**Kiến trúc.**

- Renderer không tự chạy OAuth và không giữ token của nhà cung cấp.
- Mọi luồng đăng nhập chạy trong backend Python (`hermes_cli/web_routers/oauth.py`).
- Renderer gọi REST qua IPC `hermes:api` và mở trình duyệt qua `hermes:openExternal`.
- Token lưu ở `~/.hermes/auth.json`, quyền 0600, **không mã hóa**.

**Onboarding** (`apps/desktop/src/components/onboarding/`):

- Lớp phủ toàn màn hình với một thẻ ở giữa rộng 45rem.
- Bố cục từ trên xuống:
  - một dòng nổi bật "Recommended" (Nous Portal);
  - nút mở "Other providers" liệt kê các tài khoản OAuth và vài dòng khóa API;
  - dưới cùng là "I'll choose a provider later" và "I have an API key".
- Mỗi dòng ghi cách đăng nhập:

  | Cách đăng nhập | Dòng phụ hiển thị |
  | --- | --- |
  | device code | Mở trang xác minh trên trình duyệt, Hermes tự kết nối |
  | CLI ngoài | Đăng nhập một lần trong terminal rồi quay lại |

- Form khóa API là lưới thẻ hai cột: chọn thẻ, dán khóa, có link "Get a key". Khóa không được kiểm tra
  trước khi lưu.

**Máy trạng thái đăng nhập** (`apps/desktop/src/store/onboarding.ts:32-54`):

| Trạng thái | Giao diện |
| --- | --- |
| `starting` | Spinner |
| `polling` | Mã device hiện như ô OTP, bấm để sao chép; link mở lại trang xác minh; "Waiting for you to authorize…"; nút Hủy |
| `external_pending` | Lệnh CLI trong khối code kèm nút Copy, và nút "I've signed in" |
| `confirming_model` | Tên model mặc định, giá vào/ra, nút "Change", nút "Begin" |
| `error` | Thông báo, Details thu gọn, "Try again" / "Use an API key" / "Pick a different provider" |

**Cài đặt → Providers** (`apps/desktop/src/app/settings/providers-settings.tsx`) có bốn tab:

- **Accounts:** nhóm "Connected" với huy hiệu ✓ và nút Disconnect, cùng nút mở "Connect another provider".
- **Keys:** ô tìm kiếm và các dòng khóa mở rộng được.
- **Custom endpoints.**
- **Local.**

**Đổi model trong ô chat** (`apps/desktop/src/app/chat/composer/model-pill.tsx`,
`apps/desktop/src/app/shell/model-catalog-menu.tsx`):

- Pill ghost hiện tên model ▾ và mở menu rộng 18rem lên phía trên.
- Đầu menu là ô "Search models", điều khiển bằng mũi tên và Enter; Shift+Enter đánh dấu yêu thích.
- Nhóm "Favorites" đứng đầu, sau đó là nhóm theo provider, thu gọn được và có chip hạn mức.
- Mỗi dòng model:
  - sao yêu thích, tên, giá ("free" hoặc `$vào/$ra`), huy hiệu "resets HH:MM";
  - submenu mức suy luận.
- Cuối menu: "Refresh models", "Edit models…", "Add custom model…".
- Hộp thoại đầy đủ "Switch model" có ô lọc và nút "Add provider".
- Phím tắt `mod+shift+m`.

**Chip hạn mức** (`apps/desktop/src/components/provider-status-chip.tsx`):

- Chỉ hiện khi phần còn lại dưới 20 %, chuyển màu cảnh báo khi dưới 10 %, có thanh mảnh hiển thị phần còn
  lại.
- Dữ liệu đọc từ endpoint usage của từng nhà cung cấp, ví dụ OpenRouter `/credits` và `/key`.

**Subscription.**

- **ChatGPT/Codex:** dùng luồng device code của OpenAI với client ID của Codex CLI, gọi
  `chatgpt.com/backend-api/codex`.
- **Claude Pro/Max:**
  - Desktop **không** có nút đăng nhập trong app. Hermes ghi rõ lý do: một nút như vậy sẽ trái chính
    sách OAuth của Anthropic.
  - Đường dùng được là chạy lệnh CLI.
  - Khi gọi API, Hermes giả làm Claude Code: user-agent `claude-code/…`, câu mở đầu system prompt "You are
    Claude Code…", và đổi tên tool. Mục đích là để request không bị tính vào "extra usage".

## 3. Đề xuất cho Mira

**Quyết định của chủ sản phẩm, 2026-10-07.** Dựng giao diện theo Hermes trước. Phần nào Mira đã có
backend thì bấm được; phần chưa có backend chỉ hiện giao diện. ADR-004 vẫn còn hiệu lực: change này
**không** thêm luồng OAuth.

| Màn / phần | Theo Hermes | Trạng thái trong Mira |
| --- | --- | --- |
| Onboarding lần đầu | Thẻ giữa màn, dòng nổi bật, "Nhà cung cấp khác", "Để sau", "Tôi có khóa API" | **Bấm được**: tạo kết nối từ preset bằng `ai:connections:create` |
| Form khóa API | Lưới thẻ preset, ô dán khóa, link lấy khóa, Xóa / Kết nối | **Bấm được**: thêm khóa và kiểm tra kết nối đều đã có IPC |
| Màn chọn model mặc định sau khi kết nối | Tên model, giá vào/ra lấy từ `modelCatalog.json`, "Đổi", "Bắt đầu" | **Bấm được** |
| Cài đặt → Kết nối AI | Bốn nhóm: Tài khoản, Khóa API, Endpoint tùy chỉnh (gateway), Trên máy (Ollama, LM Studio) | Khóa API, Endpoint và Trên máy **bấm được**; Tài khoản **chỉ giao diện** |
| Thẻ tài khoản subscription | Dòng provider và nhãn cách đăng nhập | **Chỉ giao diện**: huy hiệu "Chưa hỗ trợ", nút bị khóa, giải thích dùng gateway tự dựng hoặc khóa API |
| Các trạng thái đăng nhập (`polling`, `external_pending`…) | Như Hermes | **Chưa làm**: không có luồng nào dùng tới |
| Pill model trong ô chat và menu tìm kiếm | Tìm kiếm, yêu thích, giá, submenu mức suy luận, phím tắt `mod+shift+m` | **Bấm được**: viết lại `ModelSelectionMenu`; danh sách yêu thích lưu ở renderer |
| Chip hạn mức | Thanh phần trăm còn lại | **Chỉ giao diện**; OpenRouter `/credits` có thể nối sau |

**Không làm:**

- **Giả danh Claude Code để dùng gói Claude Pro/Max.** Mượn danh tính của client khác để lách cách tính phí
  là trái điều khoản của Anthropic, và rủi ro bị khóa tài khoản rơi vào người dùng.
- **Lưu token dạng không mã hóa như Hermes.** Mira giữ `safeStorage`.

## 4. Câu hỏi còn mở

1. **Thẻ subscription.** Có hiện thẻ "Chưa hỗ trợ" cho ChatGPT/Codex, Claude, GitHub Copilot không?
   - Hiện thì sát Hermes, nhưng trông như một lời hứa sẽ làm.
   - Đề xuất: hiện. Thẻ Claude ghi rõ "Dùng khóa API Anthropic hoặc gateway tự dựng".
2. **OAuth ChatGPT/Codex.** Nếu sau này muốn đăng nhập ChatGPT/Codex trong app thì cần một quyết định mới thay
   ADR-004 và một bản đánh giá điều khoản riêng, vì luồng này dùng client ID của Codex CLI.

---

[Cài đặt và lớp provider của Hermes](hermes-settings-and-adapters.md) ·
[Học thêm từ Hermes: lõi gọi model, dữ liệu, vỏ app](hermes-runtime-research.md) · [Mục lục module](../README.md) ·
[Nghiên cứu chat theo Hermes](../proposals/hermes-chat-research.md) ·
[Design system theo Hermes](../design-system/hermes-comparison.md)
