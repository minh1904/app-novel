## Context

Xem [proposal.md](proposal.md) — Why. Nền có sẵn từ change [`ai-gateway`](../ai-gateway/design.md) và từ việc đọc mã LinguaGacha (`model-capability.ts`, `model-selection-menu.tsx`, `agent-composer-model-controls.tsx`, `dialogs/model-*-dialog.tsx`, `model-item-menu.tsx`, `translation-request-scheduler.ts`, `request-rate.ts`, `AGENT_RUNTIME.md`; clone 2026-10-03; giấy phép chưa xác nhận nên chỉ học ý tưởng):

- **Tầng gọi đã nhận tham số sinh.** `ChatRequest` có `maxTokens`, `temperature`, `reasoningEffort`, `extraBody`; `buildChatBody` chỉ đưa vào thân thứ nào được đặt. Chưa có chỗ nào đặt chúng, chưa có `top_p`, chưa có header thêm.
- **Model hiện chỉ là một tên.** `ai_model(connection_id, model_id, ord)` khóa chính `(connection_id, model_id)`; `ConnectionView.models: string[]`; `defaultModel` là một tên model trên `ai_connection`. Hộp thoại dịch lập danh sách (kết nối, model) từ đó (`targetsOf`), ô soạn chat lấy `connection.models`. `translatePlan`, `translateBatch`, `chatSend` nhận `model: string`.
- **Cỡ lô và đồng thời là hằng số.** `splitIntoBatches(segments, targetTokens = 1500)` đã nhận tham số cỡ lô nhưng `chapterTranslation.ts` gọi không truyền. Gateway giữ **một `Limiter` mỗi kết nối** (`GatewayRegistry.runtimeFor`, mặc định 4, dùng chung cho dịch và chat) và một `KeyScheduler` mỗi kết nối; chưa có giãn nhịp theo thời gian.
- **Dữ liệu khả năng có sẵn nhưng bị vứt.** models.dev có `reasoning_options` cho 4.997 trong 8.385 model, ba loại: `effort` (giá trị trong `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`), `toggle`, `budget_tokens`; và cờ `temperature` (6.196 true, 1.644 false, 545 vắng). `scripts/refresh-model-catalog.mjs` chỉ giữ `reasoning: true`.
- **Đo thật (Gemini 2.5 Flash):** `reasoning_effort: "none"` nhận được và có tác dụng; `max_tokens` nhỏ khi thinking bật ra câu cụt một token. Với Gemini: 2.5 Flash có `toggle`, 2.5 Pro chỉ có `budget_tokens` tối thiểu 128 (không tắt được), 3.x có `effort` từ `minimal` đến `high` (không có `none`).
- **LinguaGacha:** model là *mục* có id riêng, nhân bản được, trỏ cùng một model thật với cấu hình khác nhau. Menu "…" của mục có Cơ bản / Tác vụ / Nâng cao / Sao chép / Xóa; ba hộp thoại riêng; một hộp thoại chọn model có ô lọc; một menu "mục → mức suy luận" dùng ở nơi dùng model; ô soạn chat chỉ có một nút "tên · mức"; hàng chờ đồng thời và giãn nhịp RPM **theo từng model**, khóa thì theo kết nối; cấu hình được chốt theo từng lần chạy; không có ghi đè theo lần chạy.
- **Giao diện AI hiện tại là demo** (xác nhận của chủ sản phẩm). Chủ sản phẩm chọn **theo y hệt LinguaGacha** và không thêm gì thừa.

## Goals / Non-Goals

**Goals:**

- Người dùng chọn model và kiểm soát cách nó sinh văn bản như ở LinguaGacha, và **không đặt gì thì hành vi không đổi**.
- Chỉ đưa ra những gì model hỗ trợ; chỗ nào dữ liệu không chắc thì có lối thoát (`extra_body`, nút Kiểm tra), không chặn.
- Cấu trúc và màn hình giống LinguaGacha; không thêm khái niệm mà họ không có.

**Non-Goals:**

- Chế độ **tự động** của đồng thời (thăm dò, giảm một nửa khi 429): chỉ có nghĩa khi nhiều lô chạy song song, thuộc module Tác vụ. Hôm nay đồng thời chỉ là **trần** do người dùng đặt.
- `speed_level` (chỉ giao thức Responses), model dựng sẵn "đặt lại", đăng nhập ChatGPT.
- Penalty, `seed`, bản tóm tắt "sẽ gửi", ghi đè theo lần chạy, cảnh báo động, ước lượng chi phí nói về thinking, % ngữ cảnh. LinguaGacha không có hoặc Mira chưa có chỗ dùng.
- Đổi cách dịch (prompt, parse, `reconcile`), adapter native cho từng hãng.

## Decisions

### D1. Mục model có id riêng (hồ sơ)

Mỗi dòng của `ai_model` là một **mục**: `id` (uuid), `connection_id`, `name` (tên hiển thị), `model_id` (tên thật gửi cho nhà cung cấp), `ord`, `settings` (JSON). Hai mục cùng `model_id` hợp lệ. Dịch và chat chọn một mục; "chế độ" là chọn mục nào.

*Vì sao:* đây là cách LinguaGacha làm và nó trả lời đúng điều chủ sản phẩm muốn (chọn model và chế độ như client OpenAI) mà không thêm khái niệm. Hồ sơ cũng cho trần token, đồng thời và RPM riêng cho dịch và chat (mỗi bên chọn một mục khác) mà không cần thiết kế riêng. *Đã loại:* cài đặt theo cặp (kết nối, model) cộng ghi đè theo lần chạy — thêm ba thứ (ghi đè, `null` = "về mặc định", "lưu làm mặc định") mà hồ sơ làm thừa.

### D2. Migration v5 viết bằng hàm: dựng lại `ai_model`, đổi `default_model` thành id mục

SQLite không đổi khóa chính tại chỗ, nên migration dựng bảng mới và chép sang:

1. Tạo `ai_model_v5(id TEXT PRIMARY KEY, connection_id …, name TEXT, model_id TEXT, ord INTEGER, settings TEXT NOT NULL DEFAULT '{}')` cùng chỉ mục `(connection_id, ord)`.
2. Mỗi hàng cũ thành một mục: `id` mới (`crypto.randomUUID()`), `name = model_id`, `settings = '{}'`, `ord` giữ nguyên.
3. Với mỗi kết nối có `default_model` mà **không** có trong `ai_model` (hôm nay `targetsOf` vẫn đưa nó vào danh sách), tạo thêm một mục cho nó.
4. `ai_connection.default_model` đổi thành id của mục tương ứng (cột giữ tên, kiểu TEXT, nay chứa id).
5. Xóa bảng cũ, đổi tên bảng mới.

Cả năm bước chạy trong transaction của `migrate`. Snapshot schema v5 được đóng băng và test nâng cấp chạy từ snapshot v4. Không có đường lùi về bản app cũ (bản cũ từ chối mở `library.db` version cao hơn).

*Đã loại:* thêm cột `settings` vào bảng cũ rồi cho phép trùng bằng khóa phụ (SQLite không cho đổi khóa chính, và khóa `(connection_id, model_id)` chặn đúng điều D1 cần: hai mục cùng model).

### D3. Cài đặt: ba nhóm, cờ bật tách khỏi giá trị, vắng nghĩa là không gửi

```
ModelSettings = {
  // Cơ bản (tên hiển thị và model thật là cột của mục, không nằm trong JSON)
  thinking?:         'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'   // vắng = Mặc định

  // Tác vụ — 0 hoặc vắng = mặc định / tự động / không giới hạn
  inputTokenLimit?:  number     // mỗi lô dịch; 0 = 1.500
  outputTokenLimit?: number     // 0 = không gửi trường giới hạn
  concurrencyLimit?: number     // 0 = 4
  rpmLimit?:         number     // 0 = không giãn nhịp

  // Nâng cao — mỗi cái có cờ bật riêng, giữ giá trị khi tắt
  temperature?:      { enabled: boolean, value: number }
  topP?:             { enabled: boolean, value: number }
  extraHeaders?:     { enabled: boolean, value: Record<string, string> }
  extraBody?:        { enabled: boolean, value: Record<string, unknown> }
}
```

"Mặc định" của suy luận **không phải một giá trị** mà là trường vắng: hai cách biểu diễn cho cùng một ý là chỗ sinh lỗi. Các số tác vụ dùng **0 làm "mặc định"** (không phải vắng) vì đó là cách LinguaGacha hiện ra ở ô nhập và người dùng hiểu ngay; đọc vào, vắng và 0 cùng nghĩa.

Giới hạn (mỗi cái ở spec): nhiệt độ 0–2; `topP` 0–1; token vào/ra số nguyên 0–2.000.000; đồng thời 0–64; RPM 0–10.000; header và `extra_body` là đối tượng JSON ≤ 4 KB (giá trị header là chuỗi). Ngoài giới hạn thì **từ chối**, không kẹp (kẹp là sửa âm thầm). Cờ bật tách khỏi giá trị là cách LinguaGacha làm (`temperature_custom_enable`): người dùng tắt tạm mà không mất con số đã gõ.

`settings` là JSON kiểm bằng valibot ở **mọi** biên; trường lạ khi đọc bị bỏ qua (bản sau thêm trường mà không cần migration); một trường hỏng bị bỏ **riêng trường đó** (không mất cả bộ cài đặt vì một giá trị) và được báo ở `dropped` của `readModelSettings`, JSON hỏng cả chuỗi cho `{}`; không bao giờ ném và không chặn dịch. Kho (`infra/storage`) không có chỗ ghi log nên ở đó trường hỏng bị bỏ **lặng lẽ**: người dùng thấy mặc định thay cho giá trị họ đã đặt. Đó là đúng cho dữ liệu hỏng (không thể gửi giá trị hỏng cho nhà cung cấp), và chỉ xảy ra khi tệp bị sửa tay hay do một bản khác ghi. Ghi thì chặt hơn đọc: trường lạ bị từ chối, vì lúc ghi nó là lỗi gõ. *Đã loại:* penalty, `seed` (không có ở LinguaGacha, `extra_body` đủ cho ai cần); mười cột riêng (tham số sinh là tập mở).

### D4. Khả năng của model lấy từ catalog; chỉ hiện mức được hỗ trợ

`modelCapability(info)` trả `{ thinkingLevels: Level[], temperature: boolean }` từ dữ liệu catalog:

| `reasoning_options` | Mức được đưa ra |
| --- | --- |
| có `effort` với `values` | đúng các giá trị đó (`none` đổi tên thành `off`) |
| có `toggle` | thêm `off` |
| có `budget_tokens` với `min` = 0 | thêm `off` |
| có `budget_tokens`, không có `effort`, và model là `gemini-*` | thêm `low`, `medium`, `high` (cách Gemini 2.5 ánh xạ `reasoning_effort` sang ngân sách; đúng cho cả 2.5 Pro, vốn không có `off`) |
| không có, hoặc `reasoning` false, hoặc model không có trong catalog | không mức nào |

Hàng thứ tư chỉ áp cho Gemini vì ánh xạ ngân sách đó là của Gemini; hãng khác có `budget_tokens` (Claude dùng một đối tượng `thinking` riêng) chỉ có "Mặc định" cho tới khi có bằng chứng, phần còn lại đi qua `extra_body`. Các hàng cộng dồn: Gemini 2.5 Flash (có `toggle` và ngân sách tối thiểu 0) ra `off`, `low`, `medium`, `high`.

"Mặc định" luôn có và không nằm trong bảng. `temperature` là `false` chỉ khi catalog nói rõ `false`; khi đó thanh trượt nhiệt độ bị khóa kèm lý do, còn vắng thì để mở. Tra theo đúng id (qua `lookupModel` đã có, kể cả khi biết `providerId`), **chưa** khớp mờ kiểu LinguaGacha (id chuẩn dài nhất theo ranh giới ký tự); ghi ở Open Questions.

Hai chỗ khó, nói thẳng: (1) catalog là dữ liệu cộng đồng, nên mức *được đưa ra* là gợi ý có căn cứ chứ không phải bảo đảm — nhà cung cấp từ chối thì lỗi nói rõ (D7), nút **Kiểm tra** (D10) cho biết ngay, và `extra_body` luôn dùng được; (2) chỉ Gemini 2.5 Flash `off` được kiểm bằng gọi thật. Task 2 thêm kịch bản cho 2.5 Pro và 3.x vào tập lệnh chụp dữ liệu; kết quả trái catalog thì thêm một bảng sửa tay nhỏ theo id model (như `MODEL_CAPABILITY_OVERRIDES` của LinguaGacha), mỗi dòng ghi ngày và "xóa khi catalog đúng".

**Kết quả đo (2026-10-03, `scripts/capture-provider-fixtures.mjs --model …`, bản ghi ở `__fixtures__/live/probe-*`).** Một yêu cầu cho mỗi ô; "tổng" là `total_tokens` của một câu dịch ngắn (21 vào).

| Model | none (Tắt) | minimal | low | medium | high | nhiệt độ | top_p | Khớp catalog? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `gemini-3.5-flash` | **nhận**, tổng 32 | nhận, tổng 32 | nhận, 201 | nhận, 235 | nhận, 261 | nhận | nhận | **Không**: catalog thiếu `none` |
| `gemini-3.1-pro-preview` | từ chối: "Budget 0 is invalid. This model only works in thinking mode." | từ chối: "Thinking level MINIMAL is not supported for this model." | nhận, 279 | nhận, 281 | nhận, 298 | nhận | nhận | Khớp |
| `gemini-2.5-pro` | không đo được: 404 "no longer available to new users" | | | | | | | — |

Hai điều rút ra. (1) Với 3.5 Flash, "Tắt" và "Tối thiểu" cùng cho tổng 32 token (không suy luận), trong khi `low` đã là 201: mức suy luận là chỗ tiền đi, nên việc catalog giấu "Tắt" là một mất mát thật. Sửa bằng bảng `MODEL_CAPABILITY_OVERRIDES` (một dòng, có ngày đo và tên bản ghi). (2) `capabilityProbes.test.ts` giữ bảng khả năng khớp các bản ghi này: một mức được đưa ra **đúng khi** nhà cung cấp nhận nó, và một dòng sửa tay mà catalog đã tự khai thì test đỏ để xóa dòng.

### D5. Một hàm đổi cài đặt thành yêu cầu, và khóa của nó

`buildGeneration(entry)` trả các tham số cho `ChatRequest`: chỉ những cái đã bật (`temperature`, `topP`, `extraHeaders`, `extraBody` khi `enabled`; `outputTokenLimit` khi > 0), và mức suy luận đổi thành `reasoning_effort` (`off → "none"`, còn lại giữ tên); vắng thì không có trường. Hàm cũng tính `settingsKey` = **SHA-256** của JSON chuẩn tắc (khóa sắp thứ tự, đệ quy) của tên model thật cùng mọi tham số **ảnh hưởng nội dung hay cách chia lô** (suy luận, nhiệt độ, `top_p`, token vào/ra, header, `extra_body`). Là mã băm chứ không phải chính cấu hình để IPC không chở một `extra_body` 4 KB theo mỗi lô; schema nhận đúng 64 ký tự hex. Đồng thời và RPM **không** nằm trong khóa: đổi chúng giữa chừng không làm lô sau khác đi về nội dung, và có hiệu lực ngay ở lô kế tiếp (D6). Cùng một hàm cho dịch và chat nên hai bên không thể lệch.

`ChatRequest` thêm `topP` và `extraHeaders`. Header đi vào lời gọi HTTP chứ không vào thân; transport gộp chúng **trước** header xác thực để header xác thực luôn thắng (D8).

### D6. Dịch chốt cấu hình bằng `settingsKey`, theo khuôn `expectedRev`

`translatePlan` trả `settingsKey`; mỗi `translateBatch` gửi lại nó; main tính lại từ mục hiện tại, **lệch thì không gửi lô** và trả `conflict` (loại lỗi đã có ở `TranslateFailure`) kèm câu "Cấu hình model đã đổi giữa lúc đang dịch; hãy lập kế hoạch lại". Lô đã xong vẫn được giữ. Mục bị xóa giữa chừng thì `not_found`. Đây là điều LinguaGacha đạt bằng `config_snapshot` trong mỗi yêu cầu; Mira không có tác vụ lưu bền nên dùng khuôn đã có thay vì mang cả cấu hình qua IPC.

`inputTokenLimit` được dùng ở `plan` (chia lô) nên đổi nó đương nhiên đòi kế hoạch mới: nó nằm trong khóa. Đồng thời và RPM đọc **ở lúc gọi** từ mục hiện tại (D9), nên chỉnh tốc độ giữa chừng là được phép.

Chat đọc mục **một lần ở đầu lượt** (`ConnectionService.translator` được gọi một lần trong `start`) và dùng cho mọi vòng đọc công cụ, nên không cần cơ chế này.

### D7. Không âm thầm bỏ tham số; bỏ `compat.reasoningEffort`

Bản `buildChatBody` hiện tại **không gửi** `reasoning_effort` khi `compat.reasoningEffort` là `false`. Người dùng đã chọn thì Mira gửi; `compat.reasoningEffort` bị bỏ khỏi `Compat` (không còn gì đọc nó, và để lại là một cách bỏ âm thầm đang chờ). `compat` vẫn quyết định *tên* trường (`max_tokens` hay `max_completion_tokens`) và việc xin `usage` khi stream — đó là hình dạng yêu cầu, không phải ý người dùng. Nhà cung cấp từ chối thì lỗi đi lên với thông điệp gốc (đã có: `refused` mang thân đã che khóa). **Không** "thử lại không kèm tham số đó": Jan làm vậy, Cherry Studio ghi ba lỗi "rơi tham số âm thầm"; đó là lý do không bắt chước.

### D8. `extra_body` và header thêm gộp sau cùng, trừ phần lõi

`extraBody` gộp vào thân **sau cùng** để người dùng có tiếng nói cuối với tham số riêng của hãng. Ngoại lệ: `model`, `messages`, `stream`, `stream_options`, `tools`. Header thêm gộp vào header yêu cầu nhưng **không** ghi đè `authorization`, `x-api-key`, `x-goog-api-key`, `api-key`, `host`, `accept`, `content-type`, `content-length` (so không phân biệt hoa thường). `accept` có trong danh sách vì Mira tự đặt nó: cho người dùng đặt thì hoặc thắng (và làm hỏng việc đọc phản hồi) hoặc bị bỏ âm thầm; từ chối lúc lưu là cách duy nhất không rơi vào hai ngả đó. Tên header phải là một "token" hợp lệ và giá trị không được có ký tự điều khiển (trừ tab), vì `fetch` ném giữa lượt dịch nếu không. Chứa trường hay header bị cấm thì bị từ chối **lúc lưu**, kèm tên; `buildChatBody` và bước dựng header cũng loại chúng như hàng rào thứ hai.

*Vì sao cấm khóa:* khóa của kết nối là bí mật được giữ ở một chỗ (`SecretVault`) và đi qua một đường duy nhất; một header thêm mang khóa khác sẽ vòng qua bộ lập lịch khóa và qua chỗ che khóa khỏi lỗi (`redactSecrets` chỉ biết khóa nó đã phát ra).

### D9. Đồng thời và RPM theo từng mục, khóa theo kết nối

LinguaGacha giữ hàng chờ đồng thời và nhịp RPM theo model, trạng thái khóa theo kết nối. Mira làm cùng cách:

- `GatewayRegistry` giữ hai loại trạng thái: `ConnectionRuntime` (chỉ còn `KeyScheduler`) theo kết nối và `EntryRuntime { limiter, pacer }` theo **id mục**. Dịch và chat dùng cùng một mục thì dùng chung hàng chờ và nhịp (hạn mức của khóa không phân biệt tính năng); hai mục khác nhau trên cùng kết nối có hàng chờ riêng, còn 429 vẫn đóng băng khóa dùng chung nên mục kia thấy ngay.
- Mỗi lần dựng provider, `ConnectionService` đọc `concurrencyLimit` và `rpmLimit` của mục hiện tại và đưa vào runtime của mục (`Limiter.setLimit`, `RatePacer.setRpm`); sửa cài đặt có hiệu lực ở lời gọi kế tiếp, không cần khởi động lại. `Limiter.setLimit` hạ trần thì lời gọi đang chạy không bị cắt, chỉ không cấp thêm chỗ tới khi số đang chạy xuống dưới trần mới; nâng trần thì cấp ngay cho người đang chờ.
- `RatePacer` đặt chỗ theo thời gian: lời gọi lấy `slot = max(now, nextAt)`, `nextAt = slot + 60000/rpm`, rồi chờ tới `slot`. Chờ hủy được ngay; hủy khi đang chờ trả lại chỗ nếu đó là chỗ cuối, còn không thì để lại một khoảng trống (chỉ làm thưa hơn, không bao giờ dày hơn mức đã đặt). Đồng hồ và giấc ngủ tiêm vào được để test không tốn thời gian thật. `rpm = 0` thì `wait` trả về ngay, không đụng gì.
- Thứ tự trong `Gateway.call`: lấy chỗ ở hàng chờ → **chờ nhịp** → lấy khóa → gọi. Chờ nhịp đặt **trong `acquireKey`** để mọi lần thử (lần đầu, sau khi đổi khóa, sau khi thử lại) đều đi qua nó, vì lần nào cũng là một yêu cầu thật tới nhà cung cấp; và để lời gọi đang chờ nhịp chưa cầm khóa nào (khóa đang "thăm dò" không bị giữ oan).

*Đã loại:* (a) giữ một hàng chờ theo kết nối và chỉ thêm RPM — không cho đồng thời riêng từng mục và lệch với LinguaGacha; (b) chế độ tự động (AIMD) — xem Non-Goals.

### D10. "Kiểm tra" một mục: một yêu cầu nhỏ bằng đúng cài đặt của mục

Nút **Kiểm tra** ở hộp thoại Cơ bản gửi một yêu cầu không streaming (`transport.complete`) với tin nhắn cố định ngắn, dùng `buildGeneration(entry)` của **mục đã lưu** (không phải bản đang gõ dở: người dùng lưu rồi mới kiểm, như LinguaGacha kiểm theo cấu hình mục). Đi qua gateway như mọi lời gọi (hàng chờ, nhịp, khóa), nên cũng kiểm luôn việc đồng thời và RPM không làm treo. Kết quả: thành công kèm thời gian (ms) và token (vào/ra, theo `Usage` đã có); thất bại là `ProviderError.message` gốc đã che khóa. Không đổi cài đặt, không lưu gì.

Kiểm tra có tốn token (ít). Nhận xét này hiện ở chữ mô tả của nút, không có cảnh báo động. *Vì sao cần:* catalog chỉ là gợi ý (D4); đây là cách duy nhất để người dùng biết nhà cung cấp có nhận cài đặt của họ hay không mà không phải mở một lượt dịch thật.

### D11. Giao diện: ba hộp thoại, hộp thoại chọn model, menu mục

Đúng cấu trúc LinguaGacha, ánh xạ sang Base UI và token của Mira:

1. **Thẻ kết nối (Cài đặt):** danh sách mục model (tên, model thật, mức suy luận); nút thêm; menu "…" mỗi mục: **Cơ bản, Tác vụ, Nâng cao, Sao chép, Xóa**; đặt mặc định.
2. **Hộp thoại Cơ bản:** tên hiển thị; tên model thật kèm ba nút **Nhập** (gõ tay), **Lấy** (mở hộp thoại chọn model), **Kiểm tra** (D10); mức suy luận (chỉ mức hỗ trợ).
3. **Hộp thoại Tác vụ:** bốn ô số (token vào, token ra, đồng thời, RPM), mỗi ô có chữ mô tả tĩnh nói 0 nghĩa là gì; ô token ra nói thêm "khi suy luận bật, token suy luận dùng chung trần này; trần nhỏ có thể ra câu rỗng hoặc cụt" (đã đo).
4. **Hộp thoại Nâng cao:** nhiệt độ và `top_p` (thanh trượt, mỗi cái một công tắc), header thêm và `extra_body` (JSON, mỗi cái một công tắc, báo lỗi JSON tại chỗ).
5. **Hộp thoại chọn model:** danh sách lấy từ endpoint, ô lọc, chọn một thì ghi vào tên model thật.
6. **Menu "mục → mức suy luận" dùng chung:** hộp thoại dịch (thay ô chọn model) và nút trong ô soạn chat. Chọn mức là ghi vào mục. Ô soạn chat chỉ có đúng một nút "tên · mức". Không % ngữ cảnh (LinguaGacha có vì Agent cần nén ngữ cảnh; chat của Mira không có việc đó).

Không có phần "Chế độ" riêng, không bản tóm tắt "sẽ gửi", không cảnh báo động. Bố cục chi tiết quyết lúc dựng; chủ sản phẩm xem ảnh chụp thật. Bản kế hoạch trước gộp ba hộp thoại thành một; đã bỏ theo ý chủ sản phẩm ("y hệt").

### D12. IPC: cài đặt đi bằng bản vá, mặc định đi bằng id mục

Sửa cài đặt gửi một **bản vá** (`modelSettingsPatchSchema`): chỉ trường được nêu thay đổi, `null` là "bỏ trường này" (về mặc định), khóa vắng thì giữ. Ba hộp thoại và menu chọn mức cùng sửa một mục; nếu mỗi nơi gửi cả bộ, nơi nào mở lâu hơn sẽ ghi đè phần của nơi kia bằng bản đã cũ. Main ghép bản vá lên cài đặt đang lưu (`applySettingsPatch`), và mỗi giá trị trong bản vá đi qua đúng giới hạn của cài đặt đầy đủ, nên không có đường vòng qua giới hạn.

Hợp đồng đổi tên `ConnectionView.defaultModel` thành `defaultEntryId` (nó chứa id mục, không phải tên model); đặt mặc định vẫn qua `ai:connections:update`, và main từ chối id không thuộc kết nối. Kênh mới nằm dưới `ai:models:*`: `add` (nhiều mục một lần, trong một transaction), `update`, `duplicate`, `delete`, `reorder` (từ chối danh sách không khớp thay vì đoán), `test`. Lỗi kiểm giới hạn đi về với `code: 'validation'` và `details` mang đường dẫn tới trường sai, để hộp thoại đặt lý do cạnh đúng ô.

## Risks / Trade-offs

- **Catalog sai hoặc thiếu** (dữ liệu cộng đồng; alias của gateway tự dựng không có) → mức chỉ là gợi ý; `extra_body` và nút Kiểm tra là lối thoát; task 2 đối chiếu bằng gọi thật và có bảng sửa tay; model lạ chỉ có "Mặc định" nên không bao giờ gửi mức sai.
- **Đổi khóa chính và hợp đồng IPC** là thay đổi lớn hơn một cột JSON → renderer là bên dùng duy nhất, đổi cùng lúc; `tsc` hai project bắt chỗ sót; migration có test nâng cấp và fixture.
- **Phạm vi giao diện lớn** (ba hộp thoại, chọn model, menu mục, menu chọn, nút chat) → chia nhóm task theo bề mặt, mỗi bề mặt có kiểm riêng; phần đổi ô nhập ↔ `ModelSettings` là hàm thuần có test.
- **Bộ giãn nhịp thêm một chỗ chờ trong đường gọi** → mặc định `rpm = 0` không làm gì; chỉ đặt khi người dùng bật; test với đồng hồ giả bao gồm hủy giữa chừng và hai tính năng cùng một mục.
- **Hai mục cùng model dễ nhầm trong menu** → tên hiển thị là của người dùng (mặc định bằng tên model); menu hiện tên trước, model thật phụ.
- **Chốt cấu hình bằng `settingsKey` làm lô thứ N bị từ chối khi người dùng sửa giữa chừng** → đúng ý (không trộn cấu hình); thông điệp nói rõ vì sao và lô đã xong được giữ; đồng thời và RPM không nằm trong khóa nên chỉnh tốc độ không gây xung đột.
- **`reasoning_effort` mang nghĩa khác giữa các hãng** → chỉ mức catalog liệt kê được đưa ra; hãng không rõ chỉ có "Mặc định" và `extra_body`.
- **Header thêm là chỗ có thể rò hay vòng qua phần che khóa** → cấm các header xác thực, lưu trong cùng cột `settings` (không phải bí mật), và chữ mô tả của ô nói không nhập khóa ở đây.

## Migration Plan

1. `library.db` v4 → v5 theo D2, có test nâng cấp từ snapshot v4 giữ nguyên kết nối, khóa, danh sách model và model mặc định.
2. Mọi mục sinh ra có `settings = '{}'` nên **hành vi không đổi** cho tới khi người dùng đặt gì đó (cỡ lô 1.500, đồng thời 4, không RPM).
3. Không có đường lùi về bản app cũ sau khi tệp đã nâng cấp; vì vậy migration phải đi kèm test xanh trước khi ship, như mọi lần nâng version.
4. Hoàn tác ở mức tính năng: người dùng không đặt gì thì mọi thứ như cũ.

## Open Questions

- **Khớp mờ id model** (id chuẩn dài nhất theo ranh giới ký tự, như LinguaGacha) để alias như `my-gemini-2.5-flash` nhận khả năng của `gemini-2.5-flash`: chưa làm, vì hôm nay chưa có người dùng cần; làm khi có.
- **Gemini 2.5 Pro không còn cho người dùng mới** (đo 2026-10-03: 404 "no longer available to new users", Google đề nghị `gemini-3.1-pro-preview`). Hàng 2.5 Pro của D4 vẫn đúng theo catalog nhưng **không kiểm được** bằng khóa mới; với người dùng cũ còn truy cập thì nút Kiểm tra là cách biết. Lớp tương thích của Gemini tự kiểm giá trị `reasoning_effort` và nói rõ các giá trị hợp lệ chung (`none`, `minimal`, `low`, `medium`, `high`), nên một mức catalog đưa ra mà model từ chối sẽ hiện đúng câu đó ở Kiểm tra.
- **Mức cho hãng ngoài Gemini 2.5 Flash:** chỉ có catalog làm căn cứ. Không đổi spec hay task; sửa bảng sửa tay khi có người dùng hãng đó.
- **Chọn mục ghi nhớ theo mục đích** (như `model_selection` của LinguaGacha): hôm nay hộp thoại dịch mặc định là mục mặc định của kết nối; chưa thêm vì chưa ai cần.
- **Đồng thời tự động (AIMD):** hoãn tới khi có module chạy nhiều lô song song; khi đó thêm một chế độ "tự động" cho `concurrencyLimit` mà không đổi dữ liệu đã lưu (0 vẫn là "mặc định").
