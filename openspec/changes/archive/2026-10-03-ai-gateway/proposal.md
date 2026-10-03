## Why

Lớp kết nối AI hiện nằm trong **một class** `OpenAiCompatibleProvider` (567 dòng) làm đủ việc: gọi HTTP, chọn khóa, cầm prompt dịch, chia lô, parse JSON, `reconcile`, thử lại, stream chat. Hai việc sắp tới đều dẫm lên nó: ADR-005 đổi hợp đồng dịch sang đoạn (module 3–4) và `context-core` đổi prompt. Trước khi làm hai việc đó, **phần kết nối và giao tiếp** phải đứng riêng và đúng, vì đó là phần không đổi khi prompt đổi.

[Nghiên cứu lõi AI ngày 2026-10-03](../../../docs/handbook/research/ai-core-architecture.md) và việc đọc mã LinguaGacha, pi-ai, opencode (clone ngày 2026-10-03) chỉ ra các lỗ hổng cụ thể ở lớp này, đều nằm trong mã chứ không phải suy đoán:

- Bộ chọn khóa chỉ đúng khi gọi tuần tự: một lượt `ok` đến muộn gỡ đóng băng do lượt khác vừa đặt (`clearKeyFreeze`), và 6 lỗi 429 đồng thời đóng băng một khóa tốt tới 30 phút (`decideFreeze`).
- Không có thời hạn tổng, không đọc `finish_reason` (chat bị cắt vì hết token vẫn kết thúc "êm"), thử lại không có chờ và dùng chung bộ đếm với việc hỏi lại ID thiếu.
- `fetch` trong main của Electron là `fetch` của Node, **không đọc proxy hệ thống**; `net.fetch` của Electron thì có (tài liệu Electron). Người dùng sau proxy sẽ thấy "không nối được" mà không có đường sửa.
- `usage` chỉ có input/output; không đọc token cache hay reasoning, trong khi bảng giá đã có `cacheRead`/`cacheWrite`.
- Địa chỉ dán cả đường dẫn (`…/chat/completions`) bị nối đôi; thân lỗi có thể mang lại khóa vừa gửi và đi thẳng qua IPC.

Bản dịch chương và chat hiện tại **chỉ là MVP để thử luồng**; change này không đụng prompt hay logic dịch, chỉ làm cho đường ống bên dưới đáng tin.

## What Changes

- **Tách một lượt gọi thành lớp transport.** Một lượt gọi OpenAI-chat (stream hoặc không) nhận khóa từ ngoài, không chọn khóa, không thử lại, không có prompt. Trả về **sự kiện thực tế**: nội dung, `finish_reason`, `usage` chuẩn hóa, trạng thái HTTP; lỗi có kiểu giữ trạng thái, thời gian chờ, phạm vi hạn mức và thân đã che bí mật.
- **Thêm gateway chính sách** giữ trạng thái theo kết nối: chọn khóa theo máy trạng thái `ready/draining/cooling/probing` (học từ scheduler của LinguaGacha, giữ phần đọc `RetryInfo` và đóng băng theo ngày đã có), trần đồng thời theo kết nối, **một chủ thử lại duy nhất** và chỉ trước byte đầu, hủy và thời hạn tổng.
- **`OpenAiCompatibleProvider` giữ vai mặt tiền** (`translate`, `chat`, `listModels` không đổi chữ ký) và chuyển các lời gọi xuống gateway; mã dịch MVP đứng nguyên trên đó. Việc đưa logic dịch lên `services` thuộc module 3, không làm ở đây.
- **Một kiểu `Usage` nội bộ** (`input` chưa gồm cache, `output`, `cacheRead`, `cacheWrite`, `reasoning`); chi phí dùng giá cache khi có. Kiểu qua IPC giữ nguyên (`inputTokens`, `outputTokens`, tổng gồm cache) để không đổi renderer.
- **Bản ghi `compat` theo endpoint** (tên trường giới hạn token, có báo `usage` khi stream không, có `reasoning_effort` không): mặc định theo preset, đè được; **không gửi tham số nào mà người gọi không đặt**. Chưa nối vào prompt dịch.
- **Chuẩn hóa địa chỉ** lúc lưu và lúc gửi; **che bí mật** khỏi mọi lỗi đi ra; **tiêm `fetch`** từ lớp `electron/` (dùng `net.fetch` cho proxy hệ thống), lõi vẫn không import `electron`.
- **Hai loại lỗi mới** `timeout` và `quota` (hết tín dụng, không thử lại được).
- **Bước đầu tiên là gọi thật** một lần để lấy SSE và thân lỗi 429 làm fixture (gỡ giả định đã ghi ở `ai-chat` task 1.x và `ai-connection` task 5.2a).

Không thuộc change này: prompt dịch, chia lô theo đoạn, `[n]`, `reconcile` và thang leo thang, `buildContext`, JobRunner, sổ `usage` lưu bền, adapter native (Anthropic Messages, Gemini), màn cài đặt cho giới hạn đồng thời/RPM, tự điều chỉnh đồng thời (AIMD). Mỗi mục có lý do trong `design.md`.

## Capabilities

### New Capabilities

- `ai-gateway`: kết nối và giao tiếp với một endpoint AI — một lượt gọi trả sự kiện thực tế, lỗi giữ chi tiết và không lộ khóa, thời hạn và hủy, một chủ thử lại, chọn khóa an toàn khi gọi song song, trần đồng thời, địa chỉ và proxy, `usage` chuẩn hóa, tham số chỉ gửi khi được đặt.

### Modified Capabilities

- `translation-provider`: bảng loại lỗi của hợp đồng thêm `timeout` (thử lại được) và `quota` (không thử lại được); yêu cầu "Lỗi có phân loại" đổi tương ứng.

## Impact

- **Code mới:** `src/main/infra/providers/` — transport OpenAI-chat, che bí mật, chuẩn hóa địa chỉ, bản ghi `compat`, kiểu `Usage`; `src/main/services/ai/gateway/` — bộ lập lịch khóa, giới hạn đồng thời, chính sách thử lại; fixture đã làm sạch dưới `__fixtures__`.
- **Code sửa:** `openAiCompatible.ts` (thành mặt tiền), `connectionKeySource.ts` và `keyPool.ts` (báo kết quả theo đợt), `classifyError.ts` (thêm `quota`, `timeout`, đọc `finish_reason`), `types.ts` (`ProviderError`), `connectionService.ts` (giữ một gateway mỗi kết nối thay vì dựng provider mới mỗi lời gọi), `createServices.ts`, `src/main/electron/*` (tiêm `net.fetch`), `aiConnections.ts` (chuẩn hóa địa chỉ), `costEstimate.ts` (giá cache).
- **Dependency:** không thêm. Không dùng SDK nhà cung cấp, không dùng Vercel AI SDK ([nghiên cứu](../../../docs/handbook/research/ai-core-architecture.md), D6).
- **Dữ liệu:** **không đổi schema** (không cột mới, không version mới). Trạng thái `draining/probing/in-flight` chỉ ở bộ nhớ; hạn đóng băng vẫn lưu ở `ai_key` như hiện nay.
- **IPC:** không đổi kênh. `ai:chat:chunk` có thể thêm trường tùy chọn `finishReason` ở chunk `done` (task cuối, không chặn).
- **Giấy phép:** LinguaGacha chưa xác nhận giấy phép (không có tệp LICENSE trong bản clone); chỉ học ý tưởng, không chép mã. pi-ai và opencode cũng chỉ để học thiết kế.
- **Tài liệu:** `engineering/current-state.md`, `research/ai-core-architecture.md` (đánh dấu phần đã làm), `maintenance/changelog.md`; ADR-004 cần một dòng cập nhật lý do loại SDK (không còn "làm mất `error.details`" với Vercel AI SDK) — chờ chủ sản phẩm duyệt, không tự sửa.
- **Rủi ro chính:** lớp này **chưa gọi nhà cung cấp thật lần nào**; hình dạng SSE, lỗi giữa dòng, 429 và `usage` ở chunk cuối đều là giả định từ tài liệu. Vì vậy task 1 là gọi thật và dựng fixture **trước** khi viết test theo hình dạng tưởng tượng. `net.fetch` cũng chưa được thử với stream, hủy và loopback (Ollama) trong Electron thật.
