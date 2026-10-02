# ADR-004 — Tầng kết nối AI: một adapter tương thích OpenAI, gateway do người dùng dựng, nhiều key

Ngày: 2026-10-02 · Trạng thái: **Accepted** · Người quyết định: chủ sản phẩm uỷ quyền chốt scope trong trao đổi ngày 2026-10-02 (“tôi vẫn muốn áp dụng cli proxy, và sử dụng apikey chính thống hoặc dùng openrouter… chốt scope cho tôi”).

Chi tiết hoá phần “Kết nối model” của [ADR-002](0002-ai-first-translation.md) — vốn chốt *được phép nối kiểu nào* nhưng để mở *provider mặc định, giới hạn chi phí và cách lưu khóa*. Không thay đổi ràng buộc nào của ADR-002.

## Bối cảnh

Yêu cầu người dùng ngày 2026-10-02 gồm ba phần: (a) **vẫn muốn dùng CLI proxy**, (b) nhưng chạy bằng **API key chính thống hoặc OpenRouter**, (c) tham khảo thêm opencode rồi **chốt scope**.

Bằng chứng từ [nghiên cứu cùng ngày](../research/ai-provider-integration.md):

- **Một adapter tương thích OpenAI phủ gần hết thị trường.** OpenRouter, DeepSeek, Qwen, Ollama, LM Studio, llama.cpp, mọi gateway tự dựng, và cả Gemini (`/v1beta/openai/`) lẫn Anthropic (lớp compat) đều nói được giao thức này.
- **opencode (MIT) chứng minh hình dạng cấu hình khai báo là đủ** cho 75+ nhà cung cấp: mỗi provider là một entry `{ npm, name, options.baseURL, options.apiKey, models{} }`, provider lạ dùng `@ai-sdk/openai-compatible`, model lạ khai tay `limit.context`/`limit.output`.
- **models.dev (MIT) đã là catalog giá/giới hạn/năng lực sẵn dùng** (`api.json`), nên Mira không cần tự nuôi bảng giá — thứ mà nghiên cứu đã cảnh báo là rủi ro sai số lớn nhất.
- **CLIProxyAPI (MIT) coi nhiều key cho một provider là tính năng hạng nhất**, với chiến lược có tên (`fill-first`, `round-robin`, `weighted`), `cooldown` và trần thử lại. Cộng với bằng chứng từ [cộng đồng Voz](../research/vietnam-ecosystem.md) (job ~1.000 chương chết vì quota), đây là điều kiện để job dịch chạy nổi, không phải tính năng xa xỉ.
- **Kênh OAuth thuê bao đã bị chặn và cấm** (Anthropic 2026-01-09 và 2026-04-04; Google tháng 2/2026, cưỡng chế 2026-03-25). Nhưng CLIProxyAPI là **dual-use**: dùng với API key hoàn toàn hợp lệ.

## Các lựa chọn

1. **Một adapter riêng cho mỗi hãng ngay từ đầu** (native Anthropic + Gemini + OpenAI). Tối ưu nhất về giá (batch 50%, prompt caching) và chắc nhất về schema, nhưng nhân chi phí ×N *trước khi* biết người dùng thật dùng hãng nào. **Loại ở lát cắt đầu.**
2. **Một adapter `openai-compatible` duy nhất; ai cần nhiều hãng/nhiều tài khoản cùng lúc thì tự dựng gateway bằng key của mình.** **Chọn.**
3. **Đóng kèm gateway (LiteLLM/CLIProxyAPI) vào installer.** Loại: nuôi thêm một process ngoài, mở cổng, thêm một tầng auth thứ hai cho chính proxy, plugin loader, và kèm luôn server OAuth callback — tức đóng kèm cả cơ chế vi phạm điều khoản dù Mira không gọi tới.
4. **Lấy Vercel AI SDK làm tầng provider ngay.** Hoãn: phụ thuộc lớn vào `main` process, v6 vừa có bốn trục breaking change, và job dịch theo lô không cần streaming — thứ chính mà SDK đó giải quyết.

## Quyết định

### Trong scope — làm cùng job dịch AI (S-AI-1)

| Mục | Chốt |
| --- | --- |
| **Adapter** | **Duy nhất một** `openai-compatible`, gọi `POST {baseUrl}/chat/completions`. Mọi nhà cung cấp đi qua đây, không ngoại lệ. |
| **Preset** | Chỉ là **baseUrl điền sẵn + ghi chú**, không có code riêng cho preset nào: OpenRouter `https://openrouter.ai/api/v1`; Gemini `https://generativelanguage.googleapis.com/v1beta/openai/`; Anthropic `https://api.anthropic.com/v1`; OpenAI `https://api.openai.com/v1`; DeepSeek `https://api.deepseek.com/v1`; Ollama `http://127.0.0.1:11434/v1`; LM Studio `http://127.0.0.1:1234/v1`; **Gateway tự dựng** (ô trống, gợi ý `http://127.0.0.1:8317/v1`). Kèm một ô **URL tùy chỉnh** tự do. |
| **Registry model** | **Snapshot đã lọc từ [models.dev](https://models.dev/api.json) (MIT), vendor vào repo kèm ngày đọc và script refresh.** Trường dùng: `limit.context`, `limit.output`, `cost.input`, `cost.output`, `cost.cache_read`, `cost.cache_write`, `structured_output`, `tool_call`, `reasoning`. Model không có trong catalog thì người dùng khai tay (`name` + `limit` + giá tùy chọn), như opencode. **Alias**: tên hiển thị tách khỏi id upstream. |
| **Nhiều key một provider** | `keys: Credential[]`; chiến lược **`fill-first` cố định** (dùng cạn key 1 rồi sang key 2 — đúng ca free tier); `cooldown` một key sau lỗi `rate_limited`, dùng `retryAfterMs` đã có trong `ProviderError`; một trần số lần thử lại cho cả job. **Không** weight, **không** session affinity, **không** để người dùng chọn chiến lược. |
| **Lưu khóa** | Electron `safeStorage` **API async**; nếu không khả dụng thì **báo lỗi rõ và từ chối lưu**, không bao giờ ghi plaintext. UI nói rõ giới hạn DPAPI: chặn người dùng khác trên cùng máy, không chặn app khác cùng tài khoản. |
| **Chế độ gửi** | Chỉ **tương tác** (gọi thường). Batch để sau. |
| **Định dạng và kiểm tra** | JSON có ID cho provider cloud, dòng đánh số `[n]` cho model local. **Tầng kiểm tra ID luôn chạy** bất kể provider khai có structured output hay không. |
| **Chi phí** | Ước lượng trước khi chạy từ giá trong registry; ghi `usage` thực sau khi chạy. UI ghi “giá tham khảo, cập nhật ngày …”. |
| **Nhiều hãng cùng lúc** | **Bằng tài liệu, không bằng code**: hướng dẫn người dùng tự dựng CLIProxyAPI hoặc LiteLLM với **API key của họ**, rồi trỏ ô “Gateway tự dựng” vào đó. Kèm cảnh báo không dùng các kênh OAuth thuê bao của công cụ đó. |

### Hoãn — có điều kiện kích hoạt rõ (S-AI-2+)

| Mục | Kích hoạt khi |
| --- | --- |
| Adapter native `anthropic` / `gemini` | Đo được batch + prompt caching tiết kiệm đáng kể trên job thật, **hoặc** tỷ lệ phản hồi hỏng ID qua lớp compat vượt ngưỡng chấp nhận |
| Batch API (giảm 50%) | Dịch cả bộ (hàng trăm chương một lần) trở thành ca dùng thường, không phải ngoại lệ |
| OpenRouter OAuth PKCE | Có phản hồi cho thấy việc dán key là rào cản thật; trước đó chỉ dán key |
| Panel “Hỏi AI” gọi provider thật | **Sau khi** job dịch chạy được end-to-end. Tới đó vẫn là minh họa (`ai-chat-panel`) |
| Tự dò runtime local (`:11434`, `:1234`) | Sau khi preset tay đã dùng được |
| `weighted-round-robin`, session affinity | Có người dùng nhiều tài khoản trả phí cùng lúc |

### Ngoài scope — không làm, đổi ý cần ADR mới

- **Đóng kèm** bất kỳ gateway hoặc runtime model nào (CLIProxyAPI, LiteLLM, Ollama, llama.cpp) vào installer; Mira cũng **không tự chạy hay điều phối** process gateway.
- **Mọi luồng OAuth thuê bao**, và **mọi preset đặt tên theo một CLI thuê bao** (Claude Code, Gemini CLI, Codex, Antigravity, Devin…). Ô “Gateway tự dựng” là trung lập và không nêu tên công cụ nào trong UI.
- **Agent mode** (AI tự chạy nhiều bước trên dữ liệu truyện).
- **Registry dịch theo cặp `(from, to)`** kiểu CLIProxyAPI: Mira chỉ có một định dạng nội bộ nên chỉ cần adapter một chiều.
- Vercel AI SDK trong tầng job dịch.

## Hệ quả và kiểm chứng

**Đánh đổi đã chấp nhận.** Đi qua lớp tương thích OpenAI của Anthropic thì mất `strict` (không bảo đảm schema) và mất prompt caching. Bù lại: tầng kiểm tra ID vốn **đã là bắt buộc** trong pipeline, và lát cắt đầu chưa dùng caching/batch nên chưa mất gì thật. UI phải nói rõ provider nào cho bảo đảm schema để người dùng hiểu vì sao tỷ lệ lỗi khác nhau.

**Phụ thuộc mới: models.dev.** Đổi rủi ro “tự nuôi bảng giá sẽ sai” thành rủi ro “nguồn ngoài ngừng hoạt động”. Giảm thiểu bằng snapshot vendored vào repo (app chạy offline không cần gọi mạng để biết giá) và script refresh thủ công. Giấy phép MIT nên việc vendor là hợp lệ; ghi attribution trong repo.

**Hai lớp `fill-first` không xung đột.** Ai dựng gateway thì khai một key trong Mira và để gateway xoay vòng; ai không dựng thì Mira tự xoay. Không cần cờ bật/tắt.

**Điều kiện xem lại ADR này:** chính sách nhà cung cấp đổi (đọc lại trước mỗi lần thêm kiểu kết nối, theo ADR-002); models.dev ngừng cập nhật; hoặc số đo từ spike cho thấy batch/caching tiết kiệm đủ lớn để kéo adapter native vào lát cắt đầu.

**Kiểm chứng:** tám bước ở cuối [nghiên cứu](../research/ai-provider-integration.md). Hai bước quyết định ADR này đúng hay sai: (1) tỷ lệ phản hồi hỏng ID qua lớp compat so với API gốc; (2) ca hai key Gemini free với `fill-first` — job phải sống qua lúc key 1 hết quota mà không dịch lại segment đã xong.

## Liên kết

[ADR-002](0002-ai-first-translation.md) · [nghiên cứu nhà cung cấp AI](../research/ai-provider-integration.md) · [công cụ dịch AI](../research/ai-translation-tools.md) · [quyết định hiện hành](../product/decisions.md) · [câu hỏi còn mở](../product/open-questions.md)

---

[Mục lục handbook](../README.md)
