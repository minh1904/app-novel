## Context

Xem [proposal.md](proposal.md) phần Why cho động cơ, và [nghiên cứu phương thức](../../../docs/handbook/research/ai-chat-panel.md) cho tám quyết định Q1–Q8 đã chốt. Bốn ràng buộc của kho này quyết định hình dạng thiết kế:

1. **Repo chỉ có `invoke`/`handle`.** `src/shared/channels.ts` có 32 kênh, tất cả đều `invoke`; `grep webContents.send` trong `src/main/` ra rỗng. Change này mở bề mặt main → renderer **đầu tiên**, nên nó cũng đặt khuôn cho mọi kênh sự kiện sau này.
2. **Khóa API không ra khỏi main** (D2 của change `ai-connection` đã archive). Mọi lời gọi nhà cung cấp nằm trong main; renderer không bao giờ tự `fetch`.
3. **Editor là bản thật, kho là bản đã lưu.** `TextEditor` giữ chữ chưa lưu. Bất kỳ ngữ cảnh nào đọc từ kho đều có thể **cũ hơn** cái người dùng đang nhìn.
4. **`OpenAiCompatibleProvider` đã có đủ phần khó của một lời gọi** — chọn khóa qua `KeySource`, `classifyHttpError` đọc thân thô trước khi parse, `send()` biết gắn `Authorization` và biết phân biệt hủy với lỗi mạng. Phần thiếu chỉ là một lối gọi không đi qua `splitIntoBatches`/`reconcile`.

Panel đã có vỏ hoàn chỉnh (`AiPanel` · `AiComposer` · `AiTurn`), vừa được thêm kéo đổi bề rộng thật. Mọi nội dung trong đó là hằng số của `aiChatSample.ts`.

## Goals / Non-Goals

**Goals:**

- Một lối gọi hội thoại dùng lại **toàn bộ** tầng kết nối/khóa/phân loại lỗi đã có, không nhân bản thứ gì.
- Một giao thức chunk đủ hẹp để test được **không cần Electron thật**, và đủ tổng quát để kênh sự kiện sau này dùng lại được khuôn.
- Áp dụng đề xuất là một thao tác hoàn tác được, không phải một lời ghi mới xuống kho.
- Mọi thứ panel nói "đã gửi kèm" là thứ hệ thống thật sự gửi, và dựng lại được.

**Non-Goals:**

- Không dựng tầng streaming tổng quát cho mọi kênh tương lai — một kênh, một ca dùng, mở rộng khi có ca thứ hai.
- Không dựng tầng diff tổng quát theo segment; diff ở đây là so hai khối văn bản để **hiện cho người đọc**, không phải dữ liệu được lưu.
- Không giữ nguồn gốc `ai` cho chữ áp dụng qua chat (đánh đổi đã nhận trong proposal).
- Không đổi schema, không đổi `TranslateRequest`, không đụng `chapterTranslation.ts`.

## Decisions

### D1 — `chat()` là một method của `OpenAiCompatibleProvider`, không phải class mới

Cùng `baseUrl`, cùng `KeySource`, cùng `send()`, cùng `classify()`. Khác ở body (`messages` thật, `stream: true`) và ở việc đọc thân phản hồi theo dòng.

*Đã cân:* một `ChatProvider` riêng. Bỏ vì nó phải chép lại `send()`, `classify()` và vòng lấy khóa — ba chỗ đã có test, và là ba chỗ dễ lệch nhau nhất về sau. Lý do giữ `TranslationProvider` làm interface riêng vẫn đúng: `chat()` **không** nằm trong interface đó, nó là một method công khai thêm vào lớp cài đặt. Provider giả lập không cần biết tới `chat()`.

### D2 — Ba kênh, và `requestId` do main sinh

- `ai:chat:send` (`invoke`) → kiểm dữ liệu, dựng request, **trả ngay** `{ requestId }`. Không trả nội dung.
- `ai:chat:chunk` (`webContents.send`) → từng chunk, **mỗi chunk mang `requestId`**.
- `ai:chat:cancel` (`invoke`, nhận `requestId`) → bỏ lượt đó.

`requestId` do **main** sinh bằng cùng `newId` mọi chỗ khác dùng, không do renderer tự đặt: renderer tự đặt thì hai cửa sổ (hoặc một bug) có thể trùng id, và main là chỗ giữ sổ `AbortController` nên nó phải là chủ của không gian id đó.

**Phát hiện lúc triển khai — kênh sự kiện phải tách khỏi `CHANNELS`.** `src/main/ipc/library.ts` lặp qua **mọi** giá trị của `CHANNELS` để gọi `ipcMain.handle`, và `createLibraryHandlers` khai kiểu trả về là `Record<Channel, RawHandler<unknown>>` — nên quên một kênh là lỗi biên dịch, một bảo đảm đang có giá trị thật. Một kênh sự kiện **không có** handler `invoke`, nên để nó trong `CHANNELS` vừa đăng ký một handler vô nghĩa vừa phá bảo đảm đó. Vì vậy `aiChatChunk` nằm trong một export riêng `EVENT_CHANNELS` với kiểu `EventChannel` riêng: hai nhóm, hai kiểu, cả hai vẫn đầy đủ.

*Đã cân:* `MessageChannelMain` (một cặp port cho mỗi lượt, không cần `requestId`). Bỏ vì ba lý do cụ thể, không phải vì khẩu vị: `send`/`invoke` **không chuyển được MessagePort** nên nó buộc preload mang thêm `postMessage` làm cơ chế thứ hai; vòng đời port là mã thật phải viết và phải dọn, trong khi `requestId` là một chuỗi; và ưu thế của port chỉ trả tiền ở luồng dữ liệu liên tục, còn một lượt chat là vài chục đến vài trăm chunk.

### D3 — Giao thức chunk: ba kiểu, kết thúc đúng một lần

```
{ requestId, kind: 'delta', text }
{ requestId, kind: 'done',  usage: {input,output} | null, usd: number | null, keyTail: string | null }
{ requestId, kind: 'error', error: { kind, message, retryable, recoverAt }, partial: boolean }
```

Ba luật bất biến, và chúng là nội dung của test:

- Một `requestId` nhận **đúng một** chunk `done` **hoặc** `error`, không bao giờ cả hai, không bao giờ hai lần.
- `delta` không bao giờ đến sau `done`/`error`.
- `error.partial` nói đã nhận được chữ nào trước đó chưa — đây là thứ panel cần để biết có giữ chữ lại hay không, và không suy ra được từ phía renderer một cách đáng tin.

`usd` tính trong main (ở đó mới có `modelCatalog`/`costEstimate`), `null` nghĩa là **chưa biết giá**, không phải 0 — cùng quy ước với hộp thoại dịch.

### D4 — Hủy: một sổ `AbortController` trong main, và hủy **không** báo cho tầng khóa

`Map<requestId, AbortController>`, xóa khi lượt kết thúc theo bất kỳ đường nào. Thêm hai mốc dọn mà nếu thiếu sẽ thành rò: `webContents` bị hủy (đóng cửa sổ, reload) thì hủy mọi lượt của nó; và panel unmount thì renderer gọi `cancel`.

Chỗ tinh tế: khi hủy, **đừng gọi `keys.report()` gì cả**. `report` hiện nhận `'ok' | ClassifiedError`, nên báo gì cũng sai — `'ok'` là nói dối về một lần dùng chưa xong, còn báo lỗi sẽ đóng băng một khóa hoàn toàn lành. Không báo là đúng nghĩa "lần dùng này không kết luận được gì". Không cần đổi interface `KeySource`.

### D5 — Parser SSE tự viết, và nó là một hàm thuần trên một `ReadableStream`

`parseSseStream(stream) → AsyncIterable<SseEvent>`: gom byte vào bộ đệm, cắt ở `\n\n`, bỏ dòng `:` comment, dừng ở `data: [DONE]`. Tách khỏi provider nên test được bằng một stream dựng tay, không cần HTTP.

Hai thứ ép buộc phải làm đúng vì chúng là nguồn lỗi kinh điển: **một chunk mạng có thể chứa nửa event** (bộ đệm phải sống qua các lần đọc), và **một chunk có thể chứa nhiều event** (phải lặp cho hết bộ đệm, không chỉ lấy event đầu).

Gửi `stream_options: { include_usage: true }` **tường minh**, kể cả khi [diễn đàn Gemini](https://discuss.ai.google.dev/t/gemini-openai-compatibility-does-it-support-the-stream-options-parameter/92785) nói chunk cuối vẫn có `usage` khi không truyền. Lý do: đó là nguồn diễn đàn, không phải tài liệu, và lối gọi này cũng sẽ chạy trên gateway tự dựng — khai tường minh thì đúng ở cả hai.

### D6 — Ngữ cảnh dựng ở **renderer**, không ở main

`buildChatContext(rows, range, radius)` là hàm thuần trong renderer, lấy dữ liệu từ **bản đang mở trong editor**.

Đây là quyết định phản trực giác nên nói rõ lý do: main đọc kho thì chỉ thấy bản **đã lưu**, trong khi người dùng vừa gõ sửa mấy câu và đang hỏi về chính mấy câu đó. Ngữ cảnh đọc từ kho sẽ gửi đi chữ cũ, rồi model trả lời về chữ không còn tồn tại — một lỗi im lặng, khó lần ra. Renderer là nơi duy nhất biết sự thật.

Hệ quả phải xử: payload của `ai:chat:send` mang văn bản, nên **valibot phải chặn trần kích thước** (ngữ cảnh + lịch sử + câu hỏi) ở tầng IPC như mọi kênh khác. Và khi `context-core` xong, phần ngữ cảnh cấp tác phẩm (thuật ngữ, xưng hô) **sẽ dựng ở main** vì nó đọc kho — lúc đó request mang hai nguồn ngữ cảnh ghép lại, và đó là lý do kiểu dữ liệu ngữ cảnh trong `aiChat.ts` phải là **một danh sách khối có nhãn** từ đầu, không phải một chuỗi.

### D7 — Chế độ Sửa: stream chữ thường, khối thay thế nằm trong một hàng rào ở cuối

Prompt yêu cầu: giải thích ngắn trước, rồi khối văn bản thay thế trong một hàng rào ```` ``` ````. Panel stream toàn bộ cho người dùng đọc; khi `done`, tách khối trong hàng rào ra làm bản đề xuất và dựng diff.

*Đã cân:* `response_format` JSON `{explain, replacement}`. Bỏ vì nó phá chính thứ đang làm: stream một JSON đang dở ra màn hình thì người dùng đọc được dấu ngoặc và chuỗi escape, nên phải chờ nhận xong mới hiện được gì — tức mất streaming ở đúng chế độ dùng nhiều nhất. Hàng rào cho cả hai: chữ đọc được ngay, và vẫn tách được khi xong.

*Đã cân:* hai lời gọi riêng cho giải thích và bản sửa. Bỏ: tốn gấp đôi, và hai lời gọi có thể nói hai điều khác nhau.

Khi không tách được hàng rào (model không tuân), panel hiện câu trả lời như chế độ Hỏi và **không** bày nút Áp dụng — không đoán, không tự coi cả câu trả lời là bản thay thế.

### D8 — Áp dụng: một transaction, và chống đề xuất cũ bằng **so chữ**, không bằng vị trí

`TextEditorHandle` thêm hai việc: đọc phạm vi đang nhắm, và áp dụng một thay thế.

Lúc gửi, panel giữ `{ from, to, text }` — trong đó `text` là **nguyên văn** đoạn đã gửi đi. Lúc Áp dụng:

1. Nếu chữ hiện tại ở `[from, to]` **đúng bằng** `text` → thay, xong.
2. Nếu không, tìm `text` trong tài liệu. Thấy **đúng một lần** → thay ở đó (người dùng đã gõ thêm ở nơi khác làm trôi vị trí; nội dung vẫn còn nguyên).
3. Còn lại → **báo "văn bản đã đổi kể từ lúc hỏi"** và không ghi.

So chữ chứ không map vị trí, vì panel không nhận được `ChangeSet` của editor; và vì đây là ca mà một lỗi im lặng sẽ ghi đè chữ người dùng vừa gõ — chỗ duy nhất trong change này có thể làm **mất chữ của người dùng**, nên nó được chọn cách thận trọng nhất.

Thay bằng **một** `dispatch` duy nhất mang annotation `userEvent`, nên lịch sử CodeMirror coi đó là một bước và `Ctrl+Z` trả lại nguyên trạng. Resegment và lưu đi đường sẵn có (`resegmentNow` sau composition, rồi `editorSession`) — không có đường lưu riêng cho chữ do AI sinh, đó chính là điều làm yêu cầu "chịu cùng luật như chữ người dùng gõ" thành thật thay vì thành lời hứa.

### D9 — Preload phơi một hàm hẹp, không phơi `on(channel, …)` tổng quát

```ts
chat: {
  send(input): Promise<Result<{ requestId: string }>>
  cancel(requestId: string): Promise<Result<void>>
  onChunk(listener: (chunk: ChatChunk) => void): () => void   // trả về hàm bỏ đăng ký
}
```

`onChunk` **đóng cứng** tên kênh bên trong preload. Phơi một `on(channel, cb)` tổng quát là mở cho renderer nghe mọi kênh main gửi — đúng thứ `contextIsolation` tồn tại để chặn. `onChunk` trả về hàm bỏ đăng ký để chỗ gọi không cần biết tên kênh để gỡ, và để `useEffect` dọn được bằng chính giá trị trả về.

### D10 — Lịch sử: renderer giữ, gửi kèm mỗi lượt, có trần

Hội thoại là state của `useAiChat` trong renderer. Mỗi lượt gửi kèm các lượt trước. Trần theo ước lượng token của `costEstimate`; vượt trần thì **bỏ từ lượt cũ nhất** và panel nói rõ đã bỏ bao nhiêu lượt — cắt im lặng làm người dùng tin AI còn nhớ thứ nó đã quên.

### D11 — Test không cần Electron thật

Ba tầng, ba cách:

- `parseSseStream`: stream dựng tay, kể cả ca nửa event và nhiều event trong một chunk.
- `chat()` của provider: `fetchImpl` giả trả `Response` có `body` là stream dựng tay — cùng khuôn `openAiCompatible.test.ts` đang dùng.
- Handler IPC: một `webContents` giả chỉ có `send()` đẩy vào một mảng, cộng một `isDestroyed()`. Kiểm ba luật bất biến của D3, kiểm hai lượt chồng nhau không trộn, kiểm hủy không gọi `report`.

Phần **không** test tự động được, phải lái tay và ghi vào backlog: thấy chữ chảy thật trong Electron, và hình dạng chunk/lỗi thật của Gemini.

### D12 — Tool **chỉ đọc**, thêm ngày 2026-10-02: đảo Q3, và lý do đảo

Q3 chốt "lắp sẵn bằng luật, không tool call". Dùng thật một buổi cho thấy phải đảo, nhưng chỉ đảo một nửa — nên ghi rõ nửa nào và vì sao.

**Lý do của Q3 không áp dụng cho chương.** Nghiên cứu chốt "không tool call" với hai căn cứ: *dữ liệu để tra chưa tồn tại* (thuật ngữ/xưng hô nằm ở `context-core`, chưa làm) và *tool call phá tính tái hiện* mà `contextHash` cần. Căn cứ thứ nhất **đúng với thuật ngữ, sai với chương** — chương có đủ trong kho ngay từ đầu. Căn cứ thứ hai vẫn đúng, nhưng `contextHash` là thứ của **job dịch theo lô**, không phải của một lượt chat; chat chưa bao giờ ghi `contextHash` vào đâu cả.

**ADR-004 cấm "Agent" theo nghĩa AI tự chạy nhiều bước *trên dữ liệu người dùng* — tức cấm ghi.** Đọc không nằm trong đó. Ranh giới giữ nguyên và thành luật một câu: **tool được đọc và được trỏ; chỉ người dùng mới được ghi.** Mọi thay đổi bản dịch vẫn đi qua `applyProposal`, vẫn hiện diff trước, vẫn là một transaction hoàn tác được.

Vòng lặp tool đặt ở `chatService`, **không** ở provider: provider không được biết `LibraryStore` là gì. Provider trả thêm một loại sự kiện `tool-call`; service thi hành rồi gọi lại provider với kết quả nối vào `messages`. Trần số vòng cho một lượt, vì một model vòng vo là một hóa đơn vòng vo.

Ngữ cảnh lắp sẵn **không bị bỏ**: chương đang mở vẫn đi kèm mọi lượt như cũ. Tool là để với sang chỗ **không ở trên màn hình** — chương khác của cùng tác phẩm. Hai cơ chế chồng lên nhau chứ không thay nhau, nên ca thường gặp nhất vẫn không tốn một vòng tool nào.

### D13 — Ghi thẳng khi không có gì để mất

Chủ sản phẩm muốn "dịch thẳng vào panel bản dịch hoặc ấn Áp dụng". Hai đường, phân biệt bằng **rủi ro mất chữ**, không bằng tùy chọn:

- Bản dịch **rỗng**: ghi thẳng. Không có chữ nào để ghi đè, `Ctrl+Z` vẫn hoàn tác, và người dùng nhìn thấy kết quả ngay trong pane. Bắt xem diff với một pane trống là nghi thức thừa.
- Bản dịch **đã có chữ**: vẫn diff + Áp dụng. Đây là lúc một lần ghi sai làm mất việc đã làm.

Cùng một ranh giới mà `applyProposal` đã dùng cho neo rỗng (D8), nên không có luật thứ hai phải nhớ.

### D14 — Diff về đúng chỗ chữ sẽ sống (đảo Q7, 2026-10-03)

Panel tự dựng diff rồi cho một nút Áp dụng cả khối. Dùng thật xong, phản hồi là *"tương tác với editor khá kém"* — và đó là chẩn đoán đúng: so sánh ở **một nơi** rồi chữ hạ xuống **nơi khác**, nhận thì nhận tất.

`unifiedMergeView` của `@codemirror/merge` làm phần khó: editor so nội dung của chính nó với một `original`, bôi sáng chunk đã đổi, chữ cũ hiện trong widget phía trên chữ mới, **mỗi chunk một cặp nút nhận/bỏ**. Hai lựa chọn cấu hình đáng nói: bật `allowInlineDiffs` (văn xuôi sửa một câu không nên hiện thành xóa-cả-khối rồi thêm-cả-khối — mặc định của thư viện tắt, và mặc định đó sai với editor này) và tắt `gutter` (hai pane đang phẳng, thêm gutter sẽ xô chữ sang ngang ngay khi bắt đầu duyệt).

Review mode nằm trong một `Compartment` chứ không dựng lại editor: dựng lại sẽ **vứt mất lịch sử undo**, đúng thứ người dịch cần khi thấy cả đề xuất là sai.

Tín hiệu "duyệt xong" dùng **API công khai**, không thò vào trạng thái chunk bên trong thư viện: nhận một chunk kéo `original` lên bằng chữ mới, bỏ một chunk kéo chữ mới về bằng `original` — nên **"hai bên bằng nhau"** phủ cả nhận-hết, bỏ-hết và mọi pha trộn.

Ranh giới cũ giữ nguyên: pane **rỗng** thì ghi thẳng (không có gì để so), pane **có chữ** thì vào review. Cùng một câu hỏi "có gì để mất không", như D8 và D13.

## Risks / Trade-offs

- **Tầng này chưa từng gọi nhà cung cấp thật** (`ai-provider-live-verification` còn mở). Hình dạng chunk, hình dạng lỗi giữa dòng, `usage` ở chunk cuối đều là giả định rút từ tài liệu → **việc đầu tiên của task 1 là một lượt `curl` thật, lưu nguyên văn**, rồi mới viết test theo hình dạng đó. Không viết test theo hình dạng tưởng tượng rồi gọi là đã kiểm chứng.
- **Rò listener khi panel mở–đóng nhiều lần** → `onChunk` trả hàm bỏ đăng ký và `useEffect` dọn bằng nó; thêm một test khẳng định mở rồi đóng panel hai lần không để lại listener.
- **Ghi đè chữ người dùng vừa gõ** → D8 ba bậc, và bậc cuối là từ chối chứ không phải đoán. Đây là rủi ro duy nhất trong change này có thể làm **mất dữ liệu**.
- **Payload phình vì ngữ cảnh + lịch sử đi qua IPC** → trần ở valibot (D6) và trần lịch sử (D10), cả hai báo rõ khi cắt.
- **Lớp tương thích OpenAI của Gemini còn beta** theo chính tài liệu Google → không dùng tính năng nào ngoài `messages` + `stream` + `stream_options`; không `tools`, không `response_format`.
- **Model không tuân hàng rào ở chế độ Sửa** → không đoán, hạ về như chế độ Hỏi (D7). Trade-off: có lúc người dùng phải hỏi lại. Chấp nhận, vì phương án kia là đoán bản thay thế rồi ghi sai.
- **Mất nguồn gốc `ai`** cho chữ áp dụng qua chat (đánh đổi đã nhận trong proposal). Hệ quả thực tế: không trả lời được "đoạn này model nào viết". Nếu sau này cần, đường đi là một bảng ghi riêng, **không** phải đổi `provenance` của segment.

## Migration Plan

Không có di trú dữ liệu: không bảng mới, không version schema mới, không đổi kiểu dữ liệu nào đang được lưu. Triển khai là cộng thêm — ba kênh mới, một method mới, một hàm preload mới.

Gỡ bỏ cũng sạch: panel quay lại trạng thái minh họa bằng cách không mount `useAiChat`; không có dữ liệu người dùng nào phụ thuộc vào change này. `aiChatSample.ts` chỉ còn giữ phần thực sự là mẫu (nếu còn), không giữ phần đang đóng vai dữ liệu thật.

## Open Questions

- **Trần chi phí cho chế độ hỏi** (vẫn mở trong [câu hỏi còn mở](../../../docs/handbook/product/open-questions.md)). Trả lời sau không đổi spec hay task: nó là một lớp kiểm trước khi gửi, thêm vào được mà không sửa gì đã có. Đo trước, đặt trần sau.
- **`radius` của ngữ cảnh** — mấy câu trước và sau là đủ. Bắt đầu bằng một con số khai ở một chỗ, chỉnh sau khi có bước kiểm chứng 6 của nghiên cứu.
- **Nhãn của khối "đã gửi kèm"** khi `context-core` xong và có mục thật: lúc đó danh sách dài hơn, có thể cần nhóm. Không chặn change này.
