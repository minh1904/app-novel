## Context

Đường lỗi hiện tại, đọc ngày 2026-10-07:

- `classifyError.ts:75-83` (`kindForStatus`): 401/403 → `auth`, 402 → `quota`, 429 → `rate_limited`, 408 và 5xx → `network`. Mọi 4xx còn lại → `refused`. Riêng 400 có `API_KEY_INVALID` thì đổi thành `auth`.
- `types.ts`: `ProviderErrorKind` có 8 loại. `RETRYABLE.refused = false`.
- `gateway.ts:96` (`isKeyTrouble`) chỉ đổi khóa khi gặp `rate_limited`, `quota`, `auth`. `keyPool.ts:94-107` chỉ đóng băng hay đánh dấu khóa với ba loại đó. Vì vậy thêm một loại lỗi mới sẽ tự rơi vào nhánh "không phải lỗi của khóa", nhưng cần test để giữ đúng như vậy.
- `openAiChatTransport.ts:199` (`mapFinishReason`) đổi mọi dạng `content_filter…` thành `filter` và bỏ phần hậu tố.
- `translationCore.ts`:
  - Lỗi ném ra ở lượt chính được trả nguyên `error.kind`.
  - Đoạn bị lọc vẫn còn sau khi chia nhỏ thì được trả `kind: 'refused'` cho cả lô.
- `useParagraphTranslate.ts:14-16`: tập `STOPS` gồm `refused`, nên một lô có đoạn bị lọc làm dừng cả lượt (dòng 170).
- `useAiChat.ts:387`: mọi lỗi của lệnh bắt đầu chat bị gán `kind: 'refused'`.
- `connectionService.ts:71`: `auth` và `refused` → `validation`.
- `modelCapability.ts`: mức hợp lệ lấy từ catalog cộng bảng `MODEL_CAPABILITY_OVERRIDES` (chỉ thêm mức). Chỉ form ở renderer (`modelSettingsForm.ts:71`) kiểm mức. Main và Lab (`scripts/lab/cli.ts:689`, `setupConnection`) ghi thẳng.

## Goals / Non-Goals

**Goals:**
- Lỗi cấu hình và nội dung bị chặn không còn chung một tên.
- Chính sách xử lý lỗi theo tác vụ nằm ở main và kiểm được bằng unit test.
- Lý do chặn đi tới tận đoạn, để làm được bảng ở `content-refusals.md` mục 5 về sau.

**Non-Goals:**
- Kết nối dự phòng, hoặc chuyển đoạn bị từ chối sang model khác.
- Adapter Gemini gốc (`generateContent`), `safetySettings`, đọc `promptFeedback`.
- Đổi chiến lược chia nhỏ lô, đổi vòng gửi lại không kèm ngữ cảnh, đổi ngân sách lời gọi. Ngân sách thuộc change riêng.
- Bảng sửa tay **bớt** mức thinking (xem Open Questions).
- Giao diện cờ theo đoạn trên editor. Change này chỉ đưa dữ liệu tới hồ sơ đề xuất và thông báo của lượt.

## Decisions

### D1. Thêm `invalid_request` thay vì đặt lại nghĩa cho `refused`

`ProviderErrorKind`, `TranslateErrorKind` và `ChatErrorKind` có thêm `invalid_request`, với `RETRYABLE = false`. `refused` vẫn giữ nghĩa nội dung bị chặn.

Phương án khác là giữ `refused` và thêm một trường `cause`. Không chọn vì mọi chỗ đang đọc `kind === 'refused'` sẽ tiếp tục hiểu sai trong im lặng. Một loại lỗi mới thì TypeScript buộc mọi `switch` và bảng `Record<Kind, …>` phải xử lý.

`kindForStatus` đổi phần cuối thành `invalid_request`. 413 → `invalid_request`, kèm `requestProblem: 'too_large'`. Một 400 có thông điệp kiểu "exceeds the maximum number of tokens" cũng được gán như vậy. Phép đổi sang `auth` khi gặp `API_KEY_INVALID` giữ nguyên.

### D2. `refused` cấp HTTP chỉ khi có bằng chứng

Sau khi đọc thân lỗi, một 4xx được nâng thành `refused` khi thân lỗi chứa dấu hiệu chặn an toàn. Dấu hiệu gồm `blockReason`, `PROHIBITED_CONTENT`, `SAFETY` hoặc `HARM_CATEGORY_`. Lý do chặn đọc theo cùng bảng với D4.

Bảng dấu hiệu là danh sách đóng, có test cho từng mục. Một dạng lạ sẽ rơi về `invalid_request` và hiện thông điệp gốc của nhà cung cấp. Nghiêng về phía đó an toàn hơn, vì ngược lại sẽ gắn nhầm nhãn "nội dung xấu" cho tác phẩm.

### D3. Lỗi mang theo tham số đã gửi

`ProviderErrorDetails` có thêm `sent?: SentParameters`. Transport điền trường này từ `Generation`, chỉ ghi tên khóa và giá trị không bí mật:
- `reasoningEffort`, `temperature`, `topP`, `maxTokens`,
- `extraBodyKeys`, tức tên khóa chứ không ghi giá trị,
- `responseFormat: boolean`.

Câu thông báo do một hàm thuần dựng (`describeInvalidRequest`), để chat, dịch và kiểm tra kết nối dùng chung. Tên header không được đưa vào; header có thể mang token.

### D4. Lý do lọc: `FinishReason` giữ `filter`, thêm trường riêng

`mapFinishReason` trả về `{ reason: FinishReason, filter?: { group, raw } }`. Cách đặt tên trong code có thể khác. Các nhóm:

| Chuỗi gốc | Nhóm |
| --- | --- |
| `PROHIBITED_CONTENT` | `prohibited` |
| `SAFETY` | `safety` |
| `RECITATION` | `recitation` |
| `BLOCKLIST`, `SPII`, `OTHER`, khác, không có hậu tố | `other` |

`BLOCKLIST` và `SPII` không được nhập vào `prohibited`. Hai lý do này là danh sách chặn và thông tin cá nhân, không phải nhóm nội dung mà chính sách sản phẩm cấm chuyển model. Giữ chuỗi gốc để sau này đổi bảng mà không mất dữ liệu.

`splitFiltered` ghi nhóm lý do của lời gọi bị lọc **cuối cùng** cho mỗi đoạn được khoanh. Nếu đoạn đó qua được ở vòng không kèm ngữ cảnh thì bỏ lý do. Kết quả lõi dịch có thêm `refusals: Array<{ id, group, raw }>`. `refusedIds` giữ nguyên để không vỡ đường cũ, và luôn bằng `refusals.map(r => r.id)`.

### D5. Chính sách theo tác vụ ở main: `taskErrorPolicy(task, failure)`

Một hàm thuần trong `src/main/services/ai/errorPolicy.ts` trả về `{ haltsRun, userRetryable, message }`. Bảng có hai loại khóa: loại lỗi provider, và hai loại kết quả lõi dịch (`refused_segments`, `missing_segments`).

| Loại | Dịch chương: dừng lượt | Chat: `retryable` | Kiểm tra kết nối |
| --- | --- | --- | --- |
| `invalid_request` | có | không | `validation` |
| `auth` | có | không | `validation` |
| `quota`, `rate_limited` (hết khóa) | có | có (sau `recoverAt`) | `io` |
| `network`, `timeout`, `invalid_response` | không | có | `io` |
| `refused` (cả lời gọi bị chặn) | không | không | `validation` |
| đoạn bị lọc trong lô (`refused_segments`) | **không** | — | — |
| `conflict`, `cancelled` | có | không | — |

`TranslateFailure` có thêm `haltsRun: boolean`. Renderer bỏ `STOPS` và đọc cờ này. Như vậy chính sách đổi được mà không phải sửa renderer, và test nằm ở main.

Một lô có cả đoạn bị lọc lẫn đoạn thiếu dùng `kind: 'refused'` với `haltsRun: false`, như hiện nay, nhưng thông báo đếm theo nhóm lý do.

Phương án khác là giữ `STOPS` ở renderer và bỏ `refused` khỏi đó. Không chọn vì quyết định vẫn nằm ở hai nơi, và `refused` cho cả lời gọi bị chặn với `refused` cho vài đoạn bị lọc lại cần hành vi khác nhau.

### D6. Kiểm mức thinking ở main, tại một chỗ dùng chung

Hàm `checkThinkingLevel(info: ModelInfo | undefined, level)` trả về `ok`, hoặc `{ invalid, allowed, nearest }`. `nearest` là mức hợp lệ gần nhất theo thứ tự `THINKING_LEVELS`; nếu cách đều thì lấy mức thấp hơn.

Hàm được gọi ở ba chỗ:
1. `connectionService.updateEntry`: ném `StorageError('validation')`.
2. Ngay trước khi dựng `Generation` cho dịch và chat: ném `ProviderError('invalid_request')` có `sent`, không gọi mạng.
3. `scripts/lab/cli.ts` sau `addModels`: dừng biến thể đó.

Model ngoài catalog (`info === undefined`) luôn `ok`. Đó là phạm vi của `extra_body` và của D1.

Không chọn quy tự động về mức gần nhất, vì trái nguyên tắc đã ghi ở `modelCapability.ts`: không âm thầm bỏ hay đổi tham số. Một lần đo với mức đã bị đổi ngầm sẽ ghi sai biến thể trong Lab.

Không mã hóa luật "none chỉ cho 2.5" của tài liệu Google. Bản ghi `probe-gemini-3.5-flash-effort-none.json` cho thấy `gemini-3.5-flash` nhận `none`. Dữ liệu từng model, có bằng chứng, thắng luật theo họ model.

## Risks / Trade-offs

- **Bảng dấu hiệu chặn bỏ sót một dạng mới, nên nội dung bị chặn thật hiện ra là `invalid_request`.** → Thông báo luôn kèm thông điệp gốc, nên người dịch vẫn đọc được. Lab báo riêng số `invalid_request` để thấy bất thường. Mỗi dạng mới thêm một dòng bảng kèm fixture.
- **Bỏ dừng lượt khi gặp đoạn bị lọc làm lượt tốn thêm lời gọi cho chương có nhiều đoạn bị chặn.** → Chấp nhận. Trần lời gọi theo chương là việc của change ngân sách riêng. Hiện mỗi lô vẫn có trần riêng.
- **Thêm loại lỗi làm đổi hợp đồng IPC.** → Main và renderer phát hành cùng nhau. Không có dữ liệu bền nào lưu `TranslateErrorKind`. Cần kiểm lại hồ sơ đề xuất: nếu có lưu `error.kind` thì loại lạ phải hiển thị được.
- **Dòng đo thật có thể lỗi thời khi nhà cung cấp đổi hành vi.** → Lỗi 400 lúc đó vẫn được D1 báo đúng là lỗi cấu hình, kèm mức đã gửi.

## Migration Plan

Không có migration dữ liệu. Cài đặt đã lưu với mức không còn hợp lệ không bị sửa; chúng bị chặn khi gửi (D6) với thông báo rõ. Rollback bằng cách revert change. Renderer và main đi cùng một bản build.

## Open Questions

- Có thêm dòng sửa tay **bớt** mức thinking không? Mỗi dòng sẽ cần một bản ghi HTTP 400, ví dụ `probe-gemini-2.5-pro-effort-invalid.json`. Câu này chỉ quyết định thêm dữ liệu vào bảng; không đổi spec, vì spec đã cho phép "dòng đo thật có bằng chứng".
- Chuỗi lý do của Gemini khi chặn ngay ở prompt, qua endpoint tương thích OpenAI, trả HTTP 200 với `finish_reason` hay trả 4xx? Cần một bản ghi thật. Cả hai trường hợp đều đã được D2 và D4 xử lý.
