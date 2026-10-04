## Why

Trong dịch truyện dài và tiểu thuyết nhiều chương (đặc biệt từ tiếng Trung, tiếng Nhật sang tiếng Việt), đại từ nhân xưng và cách xưng hô đối thoại là nguồn sai sót lớn nhất và dễ gây khó chịu nhất cho độc giả nếu không nhất quán qua các chương ([ADR-002](../../../docs/handbook/decisions/0002-ai-first-translation.md), [nghiên cứu ngữ cảnh đợt 1 & 2](../../../docs/handbook/research/story-context.md)). Mối quan hệ giữa các nhân vật mang tính định hướng ($A \to B$ khác $B \to A$), biến đổi theo tình tiết (theo khoảng chương), và cần tôn trọng các lựa chọn kính ngữ Nhật (giữ `-san`, `-kun`, `-chan`, `-sama` hoặc Việt hóa) đã được ghi nhận trong quyết định sản phẩm ngày 2026-10-04.

Hiện tại tab "Xưng hô" trong khu vực Ngữ cảnh vẫn là mock tĩnh (`ContextAreaMock`), chưa có cấu trúc lưu trữ quan hệ nhân vật và chưa được đưa vào prompt dịch của AI.

Module 4: Xưng hô (Lát 2 của `context-core` theo [Roadmap](../../../docs/handbook/delivery/roadmap.md)) giải quyết bài toán này bằng cách:
1. Lưu trữ danh sách nhân vật (`character`) và ma trận cặp xưng hô có chiều (`dyad`) với hiệu lực theo chương trong cơ sở dữ liệu tác phẩm (`.mira`).
2. Cung cấp màn hình Xưng hô thật trong khu vực Ngữ cảnh để người dịch thiết lập dàn nhân vật và ma trận xưng hô $A \leftrightarrow B$.
3. Tự động đưa các cặp xưng hô có hiệu lực trong chương vào Tầng B của prompt Lõi dịch (Layer B - ổn định trong phạm vi chương).
4. Kiểm tra sơ bộ tính tuân thủ xưng hô trên bản dịch ở mức cảnh báo để hỗ trợ người dịch soát lỗi.

## What Changes

- **Lưu trữ nhân vật và cặp xưng hô (SQLite `.mira`)**: Sử dụng bảng `context_entry` (schema v6), mở rộng xử lý kiểu `character` (tên, giới tính, vai vế, bí danh qua `context_alias`) và kiểu `dyad` (cặp quan hệ: nhân vật A, nhân vật B, A tự xưng là gì, A gọi B là gì, mức độ/thái độ, hiệu lực từ chương đến chương, trạng thái duyệt).
- **Tầng B của Prompt Lõi dịch (`formatAddressingLayerB`)**: Lọc các cặp `dyad` đã duyệt (`approved`) có hiệu lực trong chương hiện tại giữa các nhân vật thuộc chương đó, định dạng chuẩn đưa vào Tầng B của `buildTranslateSystemPrompt()`. Các mục chưa duyệt (`pending`, `rejected`) tuyệt đối không bao giờ được gửi ra ngoài thiết bị.
- **Bộ kiểm tra xưng hô (`addressingCompliance.ts`)**: Hàm kiểm tra thuần phân tích thoại trên bản dịch theo ma trận xưng hô đã khai để phát hiện các cặp đại từ bất thường ngoài ma trận ở mức cảnh báo nhẹ.
- **Kênh IPC cho Xưng hô**: Các kênh `addressing:*` (danh sách nhân vật, tạo/sửa/xóa nhân vật, danh sách cặp xưng hô, cập nhật quan hệ xưng hô $A \to B$).
- **Giao diện Màn Xưng hô (`AddressingScreen`)**: Thay thế minh họa tĩnh trong tab "Xưng hô" bằng màn hình thật, cho phép quản lý danh sách nhân vật và xem/chỉnh sửa ma trận xưng hô tương tác theo chương.

## Capabilities

### New Capabilities
- `characters-and-addressing`: Lưu trữ và truy vấn danh sách nhân vật (`character`) và ma trận quan hệ xưng hô có chiều (`dyad`) cấp tác phẩm, có hiệu lực theo chương, trạng thái duyệt.
- `addressing-screen`: Màn hình giao diện Xưng hô thật trong khu vực Ngữ cảnh: quản lý danh sách nhân vật, ma trận quan hệ xưng hô $A \leftrightarrow B$, lọc theo chương.

### Modified Capabilities
- `translation-core`: Tiếp nhận ma trận xưng hô có hiệu lực của chương để chèn vào Tầng B của prompt, cập nhật tính toán `contextHash` tương ứng.

## Impact

- **Storage**: Cài đặt module `addressingEntries.ts` (hoặc mở rộng `contextEntries.ts`) quản lý các bản ghi kiểu `character` và `dyad` trong bảng `context_entry` và `context_alias`.
- **Core Algorithms**: Bổ sung `src/shared/algorithms/addressingCompliance.ts`.
- **Prompt Builder**: Bổ sung hàm `formatAddressingLayerB` vào `src/main/services/ai/translate/promptBuilder.ts`.
- **Services & IPC**: Bổ sung `src/main/services/context/addressingService.ts`, tích hợp kênh IPC `addressing:*` vào `channels.ts`, `desktop-api.ts`, và `preload`.
- **Renderer**: Thêm `src/renderer/src/features/addressing/AddressingScreen.tsx` và nối vào `ContextAreaMock.tsx` thay thế giao diện mock.
