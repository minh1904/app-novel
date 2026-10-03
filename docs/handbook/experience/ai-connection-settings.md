# Màn cài đặt kết nối AI — lát cắt đầu: CLI proxy + API key Google

Cập nhật: **2026-10-02** · Trạng thái: **Đề xuất, đang chờ hai lựa chọn của chủ sản phẩm** (xem mục cuối) · Chủ trì: design/engineering · Liên quan: [ADR-004](../decisions/0004-ai-provider-layer.md), [nghiên cứu nhà cung cấp AI](../research/ai-provider-integration.md), change OpenSpec `ai-connection`

Người dùng chốt phạm vi ngày 2026-10-02: “trước tiên tôi cần AI qua cliproxy + APIkey của Google trước”. Trang này là phần **nghiên cứu và thiết kế giao diện** cho đúng lát cắt đó; hành vi viết thành yêu cầu ở change `ai-connection`.

*(Cập nhật 2026-10-03, [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md): màn Cài đặt và các kết nối **không đổi**. Chỉ phần **hộp thoại Dịch bằng AI** bên dưới là thiết kế của bản MVP và sẽ được làm lại thành module tác vụ dịch: đơn vị đếm và tiến độ là **đoạn** (không phải segment/câu), tác vụ chạy trong `main` và bền qua khởi động lại, và bản dịch đã có chữ thì kết quả vào dạng **đề xuất** để duyệt trong pane thay cho hai bản cạnh nhau "Dùng bản AI / Giữ bản của tôi". Chữ "segment" trong mục đó đọc là "đoạn" khi làm lại; xem [kiến trúc AI-first](../engineering/ai-first-architecture.md) mục 6.1.)*

*(Cập nhật 2026-10-03, change `ai-model-settings`: phần **danh sách model dạng hàng checkbox** trong thẻ kết nối của các wireframe bên dưới là demo và được thay bằng danh sách "mục model" có cài đặt riêng, làm theo LinguaGacha; xem mục [Cài đặt model — đối chiếu LinguaGacha](#cài-đặt-model--đối-chiếu-linguagacha-2026-10-03) ở cuối. Chỗ đặt màn Cài đặt (phương án F) và các trạng thái của kết nối **không đổi**.)*

## Hiểu đề thế nào

Câu “AI qua cliproxy + APIkey của Google” có hai cách đọc: (a) Mira gọi CLI proxy, proxy đó cấu hình bằng API key Gemini; (b) hai đường song song — một qua proxy, một gọi Google trực tiếp bằng API key. **Thiết kế dưới đây phục vụ cả hai mà không cần chọn**, vì cả hai đi qua đúng một adapter `openai-compatible` và đúng một biểu mẫu: URL + khóa (tùy chọn) + danh sách model. Khác biệt duy nhất là giá trị điền vào ô URL. Nên sự mơ hồ này không chặn gì; nếu ý là (a) thì chỉ cần một kết nối, nếu là (b) thì khai hai.

## Audit trước khi thiết kế

> Audit: Electron 44 + React 19 + **Tailwind v4** + **Base UI 1.8.0**, không shadcn. Component dùng chung đã có: `Banner`, `Button`, `Dialog`, `Menu`, `Panel`, `SearchField`, `Select`, `Slider`, `Tabs`, `TextArea`, `TextField`. **Chưa có**: công tắc/checkbox, badge trạng thái, khối rỗng, bảng — và **chưa có màn cài đặt nào** (`features/` chỉ có `chapter`, `editor`, `library`, `work`). Phong cách: **flat** — đếm ra 0 file dùng `backdrop-blur`, 0 gradient, 0 `shadow-md`+; giữ flat. Điều hướng: **không có router**, `View` là union bốn nhánh trong `App.tsx`; `AppShell` nhận `sidebar` + `title` + `actions`.

Hai hệ quả thiết kế rút ra từ audit, không phải từ khẩu vị:

1. **Màn cài đặt là màn hoàn toàn mới.** Phải quyết định chỗ đặt nó trong `View` và trong điều hướng — đây là lựa chọn số 1 ở mục cuối.
2. **Sẽ phải dựng thêm 2–3 nguyên tố dùng chung** (công tắc bật/tắt một kết nối, badge trạng thái kết nối, khối rỗng “chưa có kết nối nào”) theo đúng khuôn của `Button`/`Panel`/`TextField` đang có, không mượn thư viện mới.

## U1 — Brief

| Dòng | Nội dung | Nguồn |
| --- | --- | --- |
| Sản phẩm | Mira: workspace dịch truyện nhiều chương cho Windows, offline-first; AI dịch từ raw là luồng chính | đọc code + [ADR-002](../decisions/0002-ai-first-translation.md) |
| Cho ai | Một dịch giả cá nhân trên máy của chính mình. **Không có đồng nghiệp, không có admin, không có phân quyền** | [decisions](../product/decisions.md) |
| Việc chính của lát cắt này | (1) Nối được tới AI và **biết chắc là đã nối được** trước khi tốn tiền; (2) dịch thử một chương và thấy kết quả vào đúng segment | người dùng nói 2026-10-02 |
| Nền tảng | Máy tính, cửa sổ desktop ~1280px trở lên; không có bản mobile | [decisions](../product/decisions.md) |
| Điểm khác biệt | **Biết trước chi phí** (ước lượng trước khi chạy) và **sống qua lúc hết quota** (nhiều khóa, `fill-first`) — hai thứ công cụ cộng đồng không có ([nghiên cứu](../research/vietnam-ecosystem.md)) | [ADR-004](../decisions/0004-ai-provider-layer.md) |

Điểm khác biệt phải **hiện trên màn chính**, không nằm trong menu nâng cao: ước lượng chi phí nằm ngay trong hộp thoại dịch, trạng thái khóa nằm ngay trên thẻ kết nối.

## U2 — Việc chính của từng màn

| Màn | Đến để làm gì | Quyết định bằng gì | Hành động cuối | Quy ước các app cùng loại |
| --- | --- | --- | --- | --- |
| **Cài đặt → Kết nối AI** | Khai một kết nối (proxy hoặc Google) và xác nhận nó chạy | Kết nối **đang chạy hay không**, model nào dùng được, còn khóa nào chưa hết quota | Bấm “Kiểm tra kết nối”, thấy xanh, chọn model mặc định | Danh sách provider ở cột/khu riêng; khóa ô mật khẩu có nút hiện; **nút “Kiểm tra kết nối” cạnh nút Lưu**; danh sách model lấy tự động rồi tick chọn; nhiều khóa khai cùng một chỗ |
| **Hộp thoại “Dịch bằng AI”** (trên màn chương) | Dịch chương đang mở, biết trước tốn bao nhiêu | Model, số segment, **ước lượng token và tiền**, cảnh báo nếu chương đã có bản dịch | Bấm “Dịch”, xem tiến độ, hủy được | Hộp thoại xác nhận có số lượng và phạm vi; tiến độ theo đơn vị nhỏ nhất; lỗi liệt kê từng mục để chạy lại |

## Quy ước thật của các app cùng loại (tra 2026-10-02)

| App | Nối provider mới | Khóa | Kiểm tra kết nối | Danh sách model | Nhiều khóa |
| --- | --- | --- | --- | --- | --- |
| [Cherry Studio](https://cherryai.com/docs/en/pre-basic/settings/providers/) | Gom **theo giao thức**: OpenAI-compatible, Anthropic, Gemini, Bedrock, Azure; endpoint lạ (proxy, LiteLLM, OpenRouter) vào nhóm tương ứng | Ô khóa trong trang provider | — | Nút **Manage** lấy toàn bộ model của provider, bấm `+` để thêm vào danh sách dùng | **Nhiều khóa cách nhau bằng dấu phẩy, xoay vòng round-robin**; [PR #21114](https://github.com/CherryHQ/cherry-studio/pull/21114) thêm gán khóa riêng cho từng model |
| [Chatbox](https://chatboxai.app/en/guide/byok/lm-studio) | **“Add Provider” → “OpenAI API Compatible”**, điền API Host | Khóa **để trống được** với endpoint local | — | — | — |
| [LM Studio](https://localaiops.com/posts/lm-studio-api-key-setup-guide-for-local-ai-models-2026/) | Là server, không phải client | “Require Authentication” tùy chọn; token **chỉ hiện một lần** khi tạo | — | — | — |
| [opencode](https://opencode.ai/docs/providers/) | Một entry khai báo `{ baseURL, apiKey, models{} }`; provider lạ và model local **cùng một hình dạng** | Khóa là **tham chiếu** (`{env:VAR}`, `{file:…}`), không phải giá trị nhúng trong cấu hình | — | Catalog từ models.dev; model lạ khai tay `limit.context`/`limit.output` | — |
| Mẫu chung từ PR/issue công khai | Khu **Settings → Providers** riêng, mỗi provider một hàng có công tắc bật/tắt | Ô mật khẩu có nút hiện/ẩn; đã lưu thì **không trả giá trị về giao diện** | **Nút “Test Connection” cạnh Save**, gọi một request **rẻ** là `GET /v1/models` chứ không phải một lần chat (hầu hết nhà cung cấp không tính tiền cho `/models`); lỗi hiện **ngay cạnh ô liên quan**, kèm lý do đã phân loại | Lấy từ `/v1/models` | Khóa theo từng provider, bật/tắt từng provider |

Nguồn mẫu chung: [hermes-agent #39020](https://github.com/NousResearch/hermes-agent/issues/39020) và [PR #38551](https://github.com/NousResearch/hermes-agent/pull/38551), [HyCanvas #46](https://github.com/hyscaler/HyCanvas/issues/46), [mealie #8123](https://github.com/mealie-recipes/mealie/pull/8123), [quoth #58](https://github.com/ryan-stoffel/quoth/issues/58).

**Ba quy ước Mira lấy nguyên:**

1. **`GET /v1/models` là phép kiểm tra kết nối**, không phải một lần chat thử. Nó rẻ, không tính tiền ở hầu hết nhà cung cấp, và **một lần bấm làm luôn hai việc**: xác nhận URL + khóa đúng, và lấy danh sách model để chọn. Đây là phát hiện có giá trị nhất của đợt tra này.
2. **Khóa để trống được.** Proxy chạy trên `127.0.0.1` và Ollama/LM Studio thường không cần khóa. Biểu mẫu **không được bắt buộc** ô khóa — nếu bắt buộc thì ca dùng chính của lát cắt này (CLI proxy local) không khai nổi.
3. **Khóa đã lưu không trả về giao diện.** Sau khi lưu, ô khóa hiện dạng che (`AIza…xxxx`) và chỉ cho **thay**, không cho đọc lại.

**Hai quy ước Mira bỏ:**

- **Nhiều khóa nhập bằng dấu phẩy** (Cherry Studio): tiện cho người gõ nhưng không có chỗ nào hiện khóa nào đang hết quota, khóa nào đang bị đóng băng — mà đó chính là thông tin người dùng cần lúc job dừng giữa 1.000 chương. Mira khai **mỗi khóa một dòng**, mỗi dòng có trạng thái riêng.
- **Gán khóa riêng cho từng model** (PR mới của Cherry Studio): thêm một trục cấu hình nữa cho một ca dùng chưa ai yêu cầu. Giữ `fill-first` tự động theo đúng [ADR-004](../decisions/0004-ai-provider-layer.md).

## Trạng thái phải vẽ (không chỉ ca thành công)

Thiếu một trạng thái ở đây thì bản dựng sẽ phải sửa lại bố cục, nên liệt kê trước khi vẽ:

**Màn Kết nối AI**

| Trạng thái | Phải thấy gì |
| --- | --- |
| Chưa có kết nối nào | Khối rỗng có một câu và một nút “Thêm kết nối”; **không** phải bảng trống |
| Đang kiểm tra | Nút “Kiểm tra kết nối” ở trạng thái chờ, các ô vẫn đọc được, không chặn cả màn |
| Kiểm tra thành công | Badge xanh “Đang chạy”, số model lấy được, thời điểm kiểm tra gần nhất |
| Lỗi xác thực (401/403) | Câu lỗi **ngay dưới ô khóa** — “Khóa không hợp lệ”; không đổ lỗi cho URL |
| Lỗi mạng / URL sai | Câu lỗi **ngay dưới ô URL**; với URL `127.0.0.1` thêm gợi ý “proxy chưa chạy?” |
| Hết quota (429) | Badge hổ phách trên **chính khóa đó** + thời gian còn bị đóng băng; kết nối vẫn “Đang chạy” nếu còn khóa khác |
| Mọi khóa đều đóng băng | Badge đỏ ở cấp kết nối + thời điểm khóa sớm nhất hồi phục |
| Không lưu được khóa | Banner: `safeStorage` không khả dụng, **Mira từ chối lưu** thay vì ghi plaintext ([ADR-004](../decisions/0004-ai-provider-layer.md)) |
| Model trong danh sách đã bị khai tử | Badge xám cạnh tên model (dữ liệu `status` của models.dev) |

**Hộp thoại Dịch bằng AI**

| Trạng thái | Phải thấy gì |
| --- | --- |
| Chưa cấu hình kết nối | Hộp thoại nói thẳng và có nút mở màn cài đặt; **không** hiện nút “Dịch” mờ không giải thích |
| Trước khi chạy | Model, số segment, ước lượng token vào/ra và tiền, kèm chữ “ước lượng” |
| Chương đã có bản dịch | Cảnh báo rõ: AI **không ghi đè** bản người dùng đã sửa, đây là đề xuất |
| Đang dịch | Tiến độ theo **segment** (không theo phần trăm tròn), nút Hủy luôn bấm được |
| Hết quota giữa job | Dòng “đã chuyển sang khóa 2”, job **không dừng** |
| Xong nhưng một phần lỗi | Danh sách segment lỗi + nút “Dịch lại phần lỗi”, phần đã xong **vẫn giữ** |
| Hủy | Nói rõ số segment đã lưu; không có kết quả một phần nào bị coi là hoàn chỉnh |

## Copy (tiếng Việt, khớp giọng app đang có)

Nhãn: “Kết nối AI”, “Thêm kết nối”, “Tên kết nối”, “Địa chỉ (URL)”, “Khóa API — để trống nếu endpoint không cần”, “Thêm khóa”, “Kiểm tra kết nối”, “Model mặc định”, “Đang chạy” / “Chưa kiểm tra” / “Hết quota” / “Không nối được”, “Dịch bằng AI”, “Dịch lại phần lỗi”.

**Không** dùng trong UI: tên công cụ proxy cụ thể (CLIProxyAPI, LiteLLM) — theo ADR-004, ô URL là trung lập; tên đó chỉ xuất hiện trong tài liệu hướng dẫn.

## Wireframe (2026-10-02)

Chủ sản phẩm chọn **phương án A — màn riêng** cho chỗ đặt, và chọn **vẽ wireframe trước khi dựng**. Wireframe nằm ngoài repo (chưa qua cổng chọn phương án nên chưa đụng file dự án):

`…/scratchpad/wf/ket-noi-ai.html` — một tệp, mọi lựa chọn nằm trên tham số URL: `?man=ket-noi|dich&v=a|b|c|d|e&tt=…&mau=xam|mau&theme=dark|light&kho=desktop|mobile`

Dựng bằng **chính token của dự án** (dán nguyên `src/renderer/src/styles/tokens.css`), **chính chuỗi class** của `Button`/`Panel`/`TextField`/`Banner`, và font Google Sans Flex thật — nên nấc “Màu” là bản dựng sẽ ra, không phải bản vẽ gần giống. Icon dùng lucide qua CDN; bản dựng thật đổi sang `@solar-icons/react`.

Ba phương án bố cục, cộng hai biến thể nội dung trên phương án khuyên dùng:

| | Chiến lược | Đánh đổi chính |
| --- | --- | --- |
| **A** *(khuyên dùng)* | Thẻ xếp dọc, mỗi kết nối một `Panel` mở sẵn | Trang dài, phải cuộn khi có 4+ kết nối; bù lại thấy trạng thái mọi kết nối cùng lúc và sửa tại chỗ |
| **B** | Hai cột: danh sách trái + chi tiết phải | Ở 1280 còn 248px thanh bên app + 260px danh sách → chi tiết chỉ ~740px, trong khi khu model cần bề ngang. Với 2–3 kết nối thì cột danh sách gần như rỗng |
| **C** | Một kết nối mỗi lúc, hàng chip ở trên | Tối ưu lần đầu khai, nhưng **không so sánh được trạng thái hai kết nối cùng lúc** — đúng lúc một khóa hết quota thì phải bấm qua từng chip mới biết cái nào còn sống |
| **D** | Như A, gọn chữ: thẻ đóng chỉ còn tên, trạng thái, model mặc định, số khóa/model | Thấy 6–7 kết nối không cuộn; đổi lại sửa URL hay thay khóa phải mở thêm một bước |
| **E** | Như A, bỏ lặp: bỏ tiêu đề trang (mục thanh bên đã nói) | Mỗi thông tin một chỗ; đổi lại thanh tiêu đề app chỉ còn “Mira” nên ảnh chụp gửi đi khó biết đang ở màn nào |

### Kết quả probe và những gì mắt bắt được

Probe ở 1280 và 375, cả hai theme, nấc Xám và Màu. **Đã sửa trong wireframe:** checkbox gốc trình duyệt (8 chỗ) → checkbox `appearance-none` theo mẫu; badge trạng thái 11px → 12px; badge bỏ nền tint vì ở theme sáng `#9a5b00` trên nền tint chỉ đạt **4,20:1** (cần 4,5:1) và `#00793a` đạt 4,25:1; nút “+ Thêm khóa” bị kéo hết hàng do cha là `flex-col` → `self-start`; dòng “Kiểm tra gần nhất” rớt dòng một mình ở khổ hẹp → cho đứng hẳn một dòng.

**Ba phát hiện thuộc về dự án, không phải wireframe** — chưa sửa, cần chủ sản phẩm quyết:

| Phát hiện | Bằng chứng | Ghi chú |
| --- | --- | --- |
| **Nền rê của mục thanh bên gần như không thấy ở theme sáng**: `hover:bg-control` cho ra `#f1f1f1 → #eeefef`, chênh 3 mức | `LibrarySidebar.tsx:60` dùng đúng class này | Đang có trong app, không phải do màn mới. Sửa bằng `hover:bg-selected` là một dòng, nhưng đổi ở đây thì lệch với thanh bên thư viện |
| **Chữ lỗi `--status-error` trên nền popover ở theme tối đạt 4,38:1** (cần 4,5:1) | `#fb2c36` trên `#1e1e1e` | Lộ ra khi đặt badge lỗi trong hộp thoại. Sửa đúng chỗ là nhích token, không phải tránh dùng badge |
| **Viền `--border-subtle` nhạt hơn ngưỡng** (`#cccccc80` ≈ 1,26:1 trên nền trắng) | token của dự án | Đánh đổi có chủ ý của design system hiện tại; ghi lại để không ai “sửa” lẻ ở một màn |

Hai nhóm probe còn báo nhưng **giữ nguyên theo quy ước dự án**: vòng focus (`focus-visible:ring-2` có trong `Button`/`TextField` — dự án tự vẽ vòng focus nên giữ) và vùng bấm dưới 32px ở khổ 375 (`Button` size `xs`/`xxs` là cỡ desktop của dự án; Mira không có bản cảm ứng).

## Hai lựa chọn cần chủ sản phẩm chốt

**Lựa chọn 1 — màn cài đặt đặt ở đâu?** App chưa có màn cài đặt nào nên đây là quyết định cấu trúc, không phải chi tiết.

| | Phương án | Được | Mất |
| --- | --- | --- | --- |
| **A** *(khuyên dùng)* | **Màn riêng** `{ name: 'settings' }` trong `View`, vào bằng nút bánh răng ở đáy thanh bên; thanh bên đổi thành mục con (“Kết nối AI” là mục đầu, chỗ cho Giao diện/Lưu trữ về sau) | Đủ chỗ cho danh sách kết nối + nhiều khóa + danh sách model; dùng lại đúng khuôn `ChapterNavSidebar` đã có; mở rộng được | Thêm một nhánh `View` và một sidebar nữa |
| **B** | **Hộp thoại** dùng `Dialog` đã có | Rẻ nhất, không đụng điều hướng | Danh sách model + nhiều khóa + trạng thái nhồi vào hộp thoại sẽ phải cuộn trong cuộn; sửa cài đặt lúc đang dịch thì bị che mất màn |
| **C** | **Một khu vực trong màn tác phẩm** | Gần nơi dùng | Sai cấp: kết nối AI thuộc cả app, không thuộc một tác phẩm; khai lại cho mỗi truyện là vô lý |

**Lựa chọn 2 — vẽ wireframe hay dựng luôn?** Theo quy trình thiết kế của dự án, bước tiếp là 2–3 wireframe có nội dung thật (nấc Xám/Màu, đủ bốn trạng thái) để chọn rồi mới dựng. Nếu muốn bỏ bước đó thì trả lời **`dựng luôn`**, tôi dựng thẳng theo phương án A và các trạng thái đã liệt kê ở trên.

**Đã trả lời 2026-10-02:** lựa chọn 1 → **màn riêng**; lựa chọn 2 → **vẽ wireframe trước**.

## Đã chốt sau khi xem wireframe (2026-10-02)

**Phương án F — màn riêng, không thanh bên con.** Vào bằng **nút bánh răng ở góc trên bên phải** thanh tiêu đề ứng dụng, cạnh nút sáng/tối; nút này có ở mọi màn. Đóng thì quay lại đúng màn trước đó.

Hai lý do bỏ popup, đo trên chính wireframe chứ không theo khẩu vị:

1. **Chiều cao không đủ.** Một thẻ kết nối cao **~500px** ở khổ 1280. Hộp thoại giữa màn còn cộng header và chân nút (~100px) → **~600px cho đúng một kết nối**, gần bằng toàn bộ chiều cao cửa sổ; hai kết nối là ~1 000px. Cuộn-trong-cuộn ngay từ kết nối đầu tiên.
2. **Bề ngang sát mép.** Một dòng model cần ~450px cho tên mono + ngữ cảnh + giá. Hộp thoại 520px trừ padding còn ~470px — probe đã báo cắt chữ khi thử khung 620px ở phương án C.

Điểm duy nhất popup thắng là **không rời chương đang mở**; giải bằng cách nhớ màn trước và quay lại khi đóng, không đáng đổi lấy hai vấn đề trên.

**Bỏ thanh bên con của phương án A** vì ba mục nó liệt kê — Giao diện, Lưu trữ và backup, Về Mira — **đều chưa tồn tại**; vẽ ra là hứa ba màn chưa có. Còn nếu bỏ ba mục đó thì thanh bên chỉ còn một mục. Khi có mục cài đặt thứ hai mới thêm điều hướng; lúc đó là thay đổi nhỏ, không phải dựng lại.

**Phương án G (panel trượt phải)** giữ lại làm phương án dự phòng nếu sau này "không rời chương" trở nên quan trọng: đo sạch ở 620px, nhưng che gần hết pane bản dịch ở 1280 và không có chỗ cho mục cài đặt khác.

## Cài đặt model — đối chiếu LinguaGacha (2026-10-03)

Cập nhật: **2026-10-03** · Trạng thái: **Đã dựng theo ghi chú này** (nhóm 7 của change `ai-model-settings`); mới xem ô soạn chat trong Electron thật · Chủ trì: design/engineering · Liên quan: change `ai-model-settings`, [nghiên cứu lõi AI](../research/ai-core-architecture.md)

**Câu hỏi:** người dùng chọn model và kiểm soát cách nó sinh văn bản ở những màn nào, bằng thành phần nào? **Chủ sản phẩm chốt (2026-10-03): theo y hệt LinguaGacha, kể cả giao diện chat, không thêm thừa.** Giao diện AI hiện tại là demo nên không ràng buộc; phần danh sách model dạng checkbox ở các wireframe trên bị thay, còn màn Cài đặt (phương án F) giữ nguyên.

**Cách đọc:** chỉ đọc mã, **chưa chạy LinguaGacha**. Hành vi ghi dưới đây suy ra từ mã nguồn tại commit [`5a0058d`](https://github.com/neavo/LinguaGacha/tree/5a0058d) (2026-10-01). Giấy phép của LinguaGacha chưa xác nhận (xem [nghiên cứu lõi AI](../research/ai-core-architecture.md)), nên **chỉ học ý tưởng, không chép mã**.

### Bốn bề mặt của LinguaGacha ánh xạ sang Mira

| LinguaGacha | Mira dùng | Chỗ đọc trong mã của họ |
| --- | --- | --- |
| Danh sách mục model; menu "…" của mỗi mục: **Cơ bản, Tác vụ, Nâng cao, Sao chép, Xóa** | Hàng trong `ConnectionCard` ở màn Cài đặt; `Menu` có sẵn | [`model-item-menu.tsx`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/frontend/pages/model-page/components/model-item-menu.tsx) |
| Hộp thoại **Cơ bản**: tên, tên model thật với nút **Nhập / Lấy / Kiểm tra**, mức suy luận | `Dialog` + `TextField` + `Select` mức suy luận (như họ); URL và khóa **không** có ở đây vì ở Mira chúng thuộc kết nối | [`model-basic-settings-dialog.tsx`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/frontend/pages/model-page/dialogs/model-basic-settings-dialog.tsx) |
| Hộp thoại **Tác vụ**: token vào, token ra, đồng thời, RPM; số 0 là mặc định | `Dialog` + bốn `TextField` số, mỗi ô có chữ mô tả tĩnh nói 0 nghĩa là gì | [`model-task-settings-dialog.tsx`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/frontend/pages/model-page/dialogs/model-task-settings-dialog.tsx) |
| Hộp thoại **Nâng cao**: nhiệt độ và `top_p` (thanh trượt), header thêm và `extra_body` (JSON); mỗi cái một công tắc, giữ giá trị khi tắt | `Dialog` + `Slider` + `Switch` + `TextArea`; cả ba đã có trong `components/` | [`model-advanced-settings-dialog.tsx`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/frontend/pages/model-page/dialogs/model-advanced-settings-dialog.tsx) |
| Hộp thoại **chọn model** từ danh sách lấy về, có ô lọc | `Dialog` + `SearchField` + danh sách | [`model-selector-dialog.tsx`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/frontend/pages/model-page/dialogs/model-selector-dialog.tsx) |
| Menu **"mục → mức suy luận"**, chỉ đưa mức model hỗ trợ | `Menu`, dùng ở hộp thoại dịch và ô soạn chat. Có menu con hay hai cấp trong một popup thì quyết khi dựng (task 7.5) | [`model-selection-menu.tsx`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/frontend/features/model-selection/model-selection-menu.tsx), [`model-capability.ts`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/backend/llm/model-capability.ts) |
| Nút model ở ô soạn chat hiện "tên · mức" | Thay nút chọn model có sẵn trong `AiComposer` (cùng `pickerClass` với nút chế độ) | [`agent-composer-model-controls.tsx`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/frontend/pages/agent-page/agent-composer-model-controls.tsx) |
| Chữ mô tả từng ô; cờ `*_custom_enable` tách bật/tắt khỏi giá trị | Chữ tĩnh dưới ô; `{ enabled, value }` trong `ModelSettings` (design D3) | các tệp hộp thoại ở trên, [`model.ts`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/domain/model.ts) |
| Cấu hình chốt theo từng lần chạy (`config_snapshot`) | `settingsKey` so ở mỗi lô (design D6), vì Mira chưa có tác vụ lưu bền | [`batch-translation-runner.ts`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/backend/batch-translation/core/batch-translation-runner.ts) |
| Hàng chờ đồng thời và nhịp RPM theo từng model; khóa theo kết nối | `EntryRuntime` (limiter + `RatePacer`) theo mục, `KeyScheduler` theo kết nối (design D9) | [`translation-request-scheduler.ts`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/backend/batch-translation/core/translation-request-scheduler.ts), [`request-rate.ts`](https://github.com/neavo/LinguaGacha/blob/5a0058d/src/backend/batch-translation/core/request-rate.ts) |

### Không lấy

| Thứ LinguaGacha có | Vì sao Mira chưa lấy |
| --- | --- |
| Đồng thời **tự động** (thăm dò, giảm một nửa khi 429) | Chỉ có nghĩa khi nhiều lô chạy song song; thuộc module Tác vụ. Hôm nay đồng thời chỉ là trần do người dùng đặt |
| Mức tốc độ dịch vụ `speed_level` | Chỉ giao thức Responses; Mira chưa có |
| Model dựng sẵn với nút "đặt lại", đăng nhập ChatGPT | Mira không có model dựng sẵn hay đăng nhập kiểu đó |
| Nút "model dịch hàng loạt", ghi nhớ chọn model theo mục đích | Chưa ai cần; hộp thoại dịch mặc định là mục mặc định của kết nối |
| % ngữ cảnh ở ô soạn chat | Agent của họ cần nén ngữ cảnh; chat của Mira không có việc đó |
| Penalty, `seed` | Không thuộc bộ cài đặt đã chốt; `extra_body` đủ cho ai cần |

### Khác LinguaGacha có chủ ý

- **Header thêm không ghi đè được header xác thực** (`authorization`, `x-api-key`, `x-goog-api-key`, `api-key`, `host`, `content-type`, `content-length`), và `extra_body` không ghi đè được `model`, `messages`, `stream`, `stream_options`, `tools`: khóa của kết nối đi qua một đường duy nhất để bộ lập lịch khóa và bước che khóa khỏi lỗi còn đúng.
- **Nhà cung cấp từ chối một tham số thì lỗi mang thông điệp gốc, Mira không tự bỏ tham số rồi gọi lại.** Nút **Kiểm tra** là chỗ người dùng biết trước.
- **Mức suy luận lấy từ models.dev**, không phải bảng riêng trong mã; model không có trong đó chỉ có mức "Mặc định".

### Kết quả thật so với ghi chú (2026-10-03)

Đã dựng đúng cấu trúc ở bảng trên. Xem bằng mắt ở **chế độ trình duyệt với `window.mira` giả** (renderer thật, dữ liệu giả; sáng và tối, 1280 × 860), kèm đi bàn phím. Những chỗ **khác** ghi chú:

- **Mức suy luận ở một cấp menu con, "Mặc định" ở cuối** (menu con của Base UI): bấm mục là chọn nó và đóng menu; rê hoặc mũi tên phải để mở các mức. Chạy được bằng bàn phím (Enter mở menu và dồn sẵn vào mục đầu, mũi tên phải mở mức, Enter chọn, trả focus về nút).
- **Nhập / Lấy / Kiểm tra** là ba nút ở hàng "Tên model" của hộp thoại Cơ bản; Nhập mở một hộp thoại nhỏ để gõ tên. Kết quả Kiểm tra hiện **chữ** ("Nhà cung cấp nhận cài đặt này" / "Không dùng được") kèm biểu tượng, không chỉ màu, và tự ẩn khi cài đặt của mục đổi (một kết quả cũ không còn nói về mục này).
- **Mỗi ô lưu ngay**, không có nút Lưu, để Kiểm tra luôn gửi đúng cái đang hiện trên màn. Ô JSON lưu khi rời ô và chỉ khi hợp lệ.
- **Thêm so với LinguaGacha, vì Mira cần:** "Đặt làm mặc định" và "Chuyển lên / Chuyển xuống" trong menu của mục; ô "Thêm model" gõ tay và nút "Chọn từ danh sách…" ở thẻ kết nối; hộp thoại xác nhận khi xóa mục.
- **Hộp thoại chọn model tự lấy danh sách** lần đầu mở (bấm "Lấy" nghĩa là hỏi endpoint); có chế độ nhiều mục (thêm) và một mục (chọn cho mục đang sửa); đánh dấu "Đã có N mục" mà vẫn cho thêm tiếp, vì hai mục cùng model là hợp lệ. Chọn model mới cho một mục còn mang tên cũ tự đặt thì tên đi theo model mới.
- **Mức đã lưu mà model mới không hỗ trợ** vẫn hiện, kèm "(model này không hỗ trợ)", để màn không nói một mức trong khi mục giữ mức khác. Quan sát khi đổi 2.5 Flash (đang "Tắt") sang 2.5 Pro.

Lỗi tìm thấy khi chạy thật mà test không bắt được:

- Hộp thoại chọn model báo "endpoint không liệt kê model" khi chưa hỏi lần nào (đọc `listed` trước khi có lần kiểm tra nào trong phiên). Sửa: "đã hỏi" tính theo việc có kết quả kiểm tra trong phiên.
- Hộp thoại dịch **kẹt ở "Đang đọc cài đặt kết nối…" ở chế độ dev**: `useAiTranslate` đặt cờ `live = false` khi dọn dẹp mà không bật lại khi dựng lại, và StrictMode tháo-lắp hook một lần. Lỗi có từ trước change này; chỉ lộ khi xem bằng mắt. Đã sửa (bật cờ ở thân effect). Bản đóng gói không chạy StrictMode hai lần nên không dính.
- Thông báo lỗi của ô `extra_body` nằm **dưới** đoạn mô tả dài của ô, dễ bỏ sót: `TextArea` đã đổi để lỗi đứng trước mô tả như `TextField`.

**Chưa kiểm:** trong Electron thật mới thấy ô soạn chat (ảnh chủ sản phẩm 2026-10-03), chưa thấy menu "…", ba hộp thoại, hộp thoại chọn model và hộp thoại dịch; chưa có ảnh chụp từ bản đóng gói; không có test DOM nên hộp thoại và menu không nằm trong bộ test (phần thuần nằm trong `modelSettingsForm`, `modelInfoText`, `translateTargets`); thử bằng chuột chỉ qua công cụ tự động nên chưa thử trên cảm ứng; chưa đo tương phản của các màu mới (dùng token có sẵn). Việc menu mức rộng 276 px cắt tên mục rất dài bằng dấu chấm lửng chưa thử với tên 80 ký tự.

---

[Mục lục handbook](../README.md)
