## Why

Vòng chính của Mira là **nhập raw → AI dịch → soát/sửa hai mode** ([ADR-002](../../../docs/handbook/decisions/0002-ai-first-translation.md)), nhưng hiện chỉ có `MockProvider`: `src/main/providers/` có hợp đồng `TranslationProvider` và một provider giả lập, không có đường nào gọi ra ngoài và không có chỗ nào khai khóa. Màn Toàn văn đã hiển thị và lưu được bản dịch (`translation-editor`), nên thiếu đúng một mảnh để vòng chính chạy thật: **kết nối tới một nhà cung cấp và một điểm gọi**.

Người dùng chốt phạm vi ngày 2026-10-02: *“trước tiên tôi cần AI qua cliproxy + APIkey của Google trước”*. [ADR-004](../../../docs/handbook/decisions/0004-ai-provider-layer.md) đã chốt kiến trúc cho việc này — **đúng một adapter tương thích OpenAI**, nhiều khóa với `fill-first`, bảng giá từ snapshot models.dev, khóa lưu bằng `safeStorage` — nên change này là lát hiện thực đầu tiên của ADR đó, không phải một quyết định mới.

Hai cách đọc của đề (“proxy cấu hình bằng khóa Google” hay “proxy *và* khóa Google là hai đường”) **đi qua cùng một adapter và cùng một biểu mẫu**, chỉ khác giá trị ô URL, nên change này phục vụ cả hai mà không cần chọn.

## What Changes

- **Màn cài đặt “Kết nối AI”** (mới — app chưa có màn cài đặt nào): danh sách kết nối, mỗi kết nối có tên, địa chỉ URL, **nhiều khóa (mỗi khóa một dòng, có trạng thái riêng)**, danh sách model đang dùng và model mặc định. Preset điền sẵn URL cho **Gateway tự dựng** và **Google Gemini** (`/v1beta/openai/`); ô URL tự do cho mọi endpoint khác.
- **“Kiểm tra kết nối” gọi `GET {baseUrl}/models`** — một request rẻ, không tính tiền ở hầu hết nhà cung cấp — và một lần bấm làm hai việc: xác nhận URL + khóa, và lấy danh sách model để chọn. Lỗi hiện **ngay cạnh ô gây ra nó**, phân loại theo `ProviderErrorKind` đã có.
- **Adapter `openai-compatible` thật** trong main process, cài vào hợp đồng `TranslationProvider` hiện có: gửi JSON có segment ID, parse và **luôn chạy tầng kiểm tra ID** (đủ/thiếu/thừa/trùng) bất kể nhà cung cấp khai có structured output hay không.
- **Nhiều khóa cho một kết nối** với chiến lược **`fill-first` cố định**: dùng cạn khóa 1 rồi sang khóa 2; khóa báo `rate_limited` bị **đóng băng** theo `retryAfterMs`; một trần số lần thử lại cho cả job. Không weight, không session affinity, không cho người dùng chọn chiến lược.
- **Lưu khóa bằng `safeStorage` API async**; không khả dụng thì **từ chối lưu và nói rõ**, không bao giờ ghi plaintext.
- **Registry model là snapshot đã lọc từ models.dev** vendored trong repo (kèm ngày + script refresh), cung cấp `limit.context`/`limit.output`, `cost.input`/`cost.output` và cờ năng lực; model không có trong snapshot thì người dùng khai tay. Dùng cho **ước lượng chi phí trước khi chạy**.
- **Điểm gọi tối thiểu — “Dịch bằng AI” cho một chương** trên màn chương: hộp thoại cho chọn model, hiện số segment và **ước lượng token/chi phí**, chạy theo đoạn, có tiến độ theo segment và **hủy**; kết quả ghi vào bản dịch kèm **nguồn gốc** (provider, model, thời điểm) và **không ghi đè** segment người dùng đã sửa.

Không thuộc change này: job dịch bền vững (tiếp tục sau crash, hàng đợi nhiều chương), **Batch API**, adapter native Anthropic/Gemini, prompt caching, OpenRouter OAuth PKCE, panel “Hỏi AI” gọi thật, ngữ cảnh (glossary / ma trận xưng hô / văn phong) đưa vào prompt, nhiều nguồn raw, dò tự động runtime local, mode Từng câu, xuất tệp.

## Capabilities

### New Capabilities

- `ai-connection`: khai báo và kiểm tra kết nối tới nhà cung cấp AI — danh sách kết nối, URL, nhiều khóa với `fill-first` và đóng băng, kiểm tra bằng `/models`, danh sách và model mặc định, lưu khóa an toàn, registry model cho ước lượng chi phí.
- `ai-translate-chapter`: dịch một chương bằng AI từ màn chương — ước lượng trước khi chạy, tiến độ theo segment, hủy, ghi nguồn gốc, không ghi đè bản người dùng đã sửa, chạy lại phần lỗi.

### Modified Capabilities

- `translation-provider`: hợp đồng hiện chỉ có provider giả lập; thêm yêu cầu cho **provider thật tương thích OpenAI** (định dạng gửi/nhận theo ID, tầng kiểm tra ID bắt buộc, chọn khóa theo `fill-first`, phân loại lỗi theo mã HTTP của nhà cung cấp).

## Impact

- **Phụ thuộc change khác:** cần bản dịch hiển thị và lưu được — có từ `translation-editor` (chưa archive). Thứ tự archive: `source-editor` → `translation-editor` → `ai-connection`.
- **Code:** `src/main/providers/` (adapter thật, chọn khóa, registry model), `src/main/ipc/` (kênh mới cho cài đặt kết nối và dịch), `src/main/storage/` (bảng cài đặt trong `library.db`, **không** trong tệp `.mira` của tác phẩm — kết nối thuộc cả app), `src/renderer/src/features/settings/` (mới), `src/renderer/src/features/chapter/` (nút và hộp thoại dịch), `src/renderer/src/App.tsx` (nhánh `View` mới), `src/shared/channels.ts`.
- **Dữ liệu và IPC:** schema `library.db` tăng version (bảng kết nối + khóa đã mã hóa + model đã chọn); **khóa không bao giờ đi qua IPC về renderer** sau khi lưu — renderer chỉ nhận dạng che và trạng thái.
- **Nguyên tố giao diện mới:** công tắc bật/tắt kết nối, badge trạng thái, khối rỗng — dựng theo khuôn `Button`/`Panel`/`TextField` đang có, không thêm dependency.
- **Chờ quyết định trước khi dựng:** chỗ đặt màn cài đặt và việc có vẽ wireframe hay không — hai lựa chọn ở cuối [thiết kế màn kết nối AI](../../../docs/handbook/experience/ai-connection-settings.md).
- **Tài liệu:** `current-state.md`, `roadmap.md`, `backlog.md`, `validation.md` (ca hai khóa Gemini free hết quota), `changelog.md`.
