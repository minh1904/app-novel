## Why

Ngày 2026-10-08 chủ sản phẩm chốt: cách cấu hình provider làm giống Hermes Desktop, kể cả modal Cài đặt,
trừ Nous Portal (`docs/modules/ai-connections/README.md`, mục "Quyết định 2026-10-08"). Màn "Kết nối AI"
hiện nay là một trang dài, gồm một danh sách thẻ kết nối và menu "+ Thêm kết nối". Mira chưa có:
- model chính cho cả app;
- model dự phòng;
- onboarding;
- tìm kiếm trong menu chọn model;
- kiểm endpoint đúng cách: base URL gõ sai `/v1` chỉ lộ ra khi dịch hỏng.

Change này dựng **phần giao diện và cấu hình**. Đăng nhập subscription (Codex, Copilot) cùng các transport
mới nằm ở change `subscription-providers`, dựng trên khung này.

## What Changes

**Modal Cài đặt như Hermes.**

- Một thẻ lớn phủ lên app, gồm:
  - điều hướng dọc 13rem bên trái;
  - breadcrumb thay cho tiêu đề trang;
  - ô tìm kiếm hình viên thuốc vắt trên mép thẻ, gõ phím chữ là bắt đầu tìm;
  - nút đóng; Esc hoặc bấm ra ngoài cũng đóng;
  - link sâu bằng tham số (nhóm, mục, khóa) để mở thẳng một mục và làm mục đó nhấp sáng.
- **BREAKING:** màn "Kết nối AI" cũ (view `settings`) được thay bằng modal. Nút bánh răng trên thanh trên
  mở modal.

**Nhóm của modal.** Chỉ có nhóm Mira có nội dung thật:

| Nhóm | Mục |
| --- | --- |
| **Model** | Model chính; Dự phòng |
| **Kết nối AI** | Tài khoản; Khóa API; Endpoint tùy chỉnh; Trên máy |
| **Giao diện** | Theme; Kính |
| **Về Mira** | Phiên bản |

Mục "Tài khoản" có khung và thẻ đầy đủ. Thẻ đăng nhập thì bấm được khi `subscription-providers` xong.
Trước đó thẻ ghi "Sắp có".

**Hàng cài đặt như `ListRow`.** Không kẻ đường giữa các hàng. Control nằm ở cột phải rộng 15–22rem và
rơi xuống dưới mô tả khi pane hẹp. Mọi bật/tắt là Switch. Trường văn bản tự lưu sau 550 ms; khóa API,
model chính và endpoint có nút riêng.

**Khóa API.**

- Mỗi provider một thẻ, theo danh sách provider của Mira, cộng Anthropic. Anthropic bấm được khi có
  transport ở change sau.
- Thẻ có chấm trạng thái, ô khóa hiện `••••` (bấm để sửa, có Lưu và Xóa), và link "Lấy khóa ↗".
- Mở thẻ ra thì có các mục model của kết nối, dùng lại `ModelEntries`.
- Có ô tìm provider.
- Nhiều khóa cho một kết nối vẫn giữ nguyên như hiện nay.

**Endpoint tùy chỉnh.**

- Danh sách endpoint có nhãn "Đang dùng".
- Form: tên, URL, chế độ API (chỉ Chat Completions ở change này), model mặc định lấy từ danh sách tự dò,
  khóa. Có hai nút Kiểm tra và Lưu.

**Kiểm endpoint như Hermes.**

1. Gọi `/models`, thử biến thể có hoặc không có `/v1`, rồi **lưu base URL đã giải ra**.
2. Gửi một request chat 1 token. Chỉ 404/405/501 mới kết luận là "không phục vụ API này".
3. 200 mà không có model nào thì cảnh báo URL sai.
4. Kiểm khóa: 401/403 là khóa sai; lỗi mạng vẫn cho lưu nhưng có cảnh báo.

**Model chính.** Chọn kết nối, mục model và mức suy luận cho cả app, với nút Áp dụng. Chat mới, hộp
thoại dịch và hàng chờ dịch dùng model chính khi người dùng chưa chọn model khác. Kết nối chưa có khóa thì
hiện ngay ô dán khóa và nút Kích hoạt.

**Model dự phòng.**

- Danh sách có thứ tự gồm kết nối và mục model.
- Khi một lượt chat hoặc một lô dịch thất bại vì lý do mà đổi model có thể giải quyết (hết hạn mức, model
  không tồn tại, lỗi máy chủ kéo dài), Mira thử mục kế tiếp.
- Mira ghi rõ "Đã chuyển sang Y vì X" trên lượt hoặc lô đó.

**Onboarding lần đầu.** Khi chưa có kết nối nào, một thẻ giữa màn hiện ra như Hermes, gồm:
- dòng nổi bật (gateway tự dựng);
- "Nhà cung cấp khác";
- "Tôi có khóa API";
- "Để sau".

Sau khi kết nối xong là màn xác nhận model mặc định, có giá vào/ra và nút "Bắt đầu".

**Menu chọn model trong ô chat**, như ảnh chụp Hermes ngày 2026-10-08:

- pill tên model;
- ô "Tìm model";
- nhóm Yêu thích (sao, Shift+Enter);
- nhóm theo kết nối;
- nhãn mức suy luận đang dùng;
- submenu "Tùy chọn: Suy luận (công tắc)" và "Mức: Tối thiểu…Tối đa", chỉ hiện các mức model hỗ trợ;
- cuối menu: "Dùng mặc định trong Cài đặt", "Tải lại model", "Thêm model tùy chỉnh…", "Sửa danh sách
  model…";
- phím tắt `Ctrl+Shift+M`.

Hộp thoại dịch dùng chung menu này.

## Capabilities

### New Capabilities

- `settings-modal`: modal Cài đặt, gồm điều hướng, breadcrumb, tìm kiếm, link sâu, hàng cài đặt, cách lưu
  và nhóm Giao diện, Về Mira.
- `provider-settings`: các mục Tài khoản (khung), Khóa API, Endpoint tùy chỉnh, Trên máy, cùng cách kiểm
  endpoint và khóa.
- `model-defaults`: model chính, chuỗi dự phòng và cách chúng được dùng khi chat và dịch.
- `ai-onboarding`: luồng kết nối lần đầu.
- `model-picker`: menu chọn model trong ô chat và hộp thoại dịch.

### Modified Capabilities

<!-- openspec/specs/ chưa có capability nào về kết nối hay cài đặt; các spec cũ nằm trong archive. -->

## Impact

**Renderer.**

- `features/settings/` được viết lại thành modal. `SettingsScreen` và view `settings` của `uiStore` bị
  bỏ; nút bánh răng trong `AppShell` mở modal.
- `features/models/ModelSelectionMenu.tsx` được viết lại.
- Thêm `features/onboarding/`.
- `connectionStore` có thêm model chính, dự phòng và yêu thích.

**Main.**

- `services/ai/connectionService.ts` có thêm kiểm endpoint hai bước và lưu base URL đã giải.
- Model chính và dự phòng lưu ở bảng `meta` của thư viện.
- `chatService` và luồng dịch thêm bước chuyển dự phòng.
- `classifyError` có thêm cờ "nên chuyển dự phòng".

**Contract.** Kênh IPC mới cho model chính, dự phòng, kiểm endpoint và danh sách model gộp cho menu.

**Không đổi:** cách lưu khóa (`safeStorage`, chỉ trả 4 ký tự cuối), adapter OpenAI-compatible, đề xuất,
và hành vi của từng mục model.

**Tài liệu:** `docs/modules/ai-connections/`.
