# Panel Hỏi AI chạy thật: phương thức và quyết định cần chốt

Ngày đọc: **2026-10-02** · Trạng thái: Quan sát (code + tài liệu nhà cung cấp) + suy luận; **sáu quyết định Q1–Q6 đã chốt ngày 2026-10-02**, chưa triển khai dòng mã nào · Chủ trì: research/engineering · Liên quan: [ADR-004](../decisions/0004-ai-provider-layer.md), [chế độ AI và nhà cung cấp](ai-provider-integration.md), [hai hướng provider](provider-gemini-gateway.md), [ngữ cảnh truyện](story-context.md), [câu hỏi còn mở](../product/open-questions.md) (UX panel Hỏi AI), backlog `ai-chat-panel`

## Câu hỏi và phương pháp

Khóa Gemini đã nối được và màn Cài đặt đã tạo được kết nối thật. Vỏ panel "Hỏi AI" đã dựng xong theo wireframe `man=hoi-ai&v=a` nhưng **mọi chữ trong đó là dữ liệu mẫu cố định** (`aiChatSample.ts`). Yêu cầu mới: panel phải **chat thật**, **sửa được bản dịch**, **dịch được truyện**. Trước khi viết spec, sáu câu hỏi:

1. Trong code hiện nay, cái gì dùng lại được cho chat và cái gì **chưa tồn tại**?
2. Lớp tương thích OpenAI của Gemini có đủ cho chat (streaming, tool, usage khi stream) hay phải đổi sang API gốc?
3. Chữ chảy từ main process về renderer bằng đường nào, khi kho này **chỉ có `invoke`/`handle`**?
4. "Sửa được bản dịch" nghĩa là gì ở mức cơ chế: sao chép tay, ghi một hàng, hay diff cả chương có duyệt?
5. Ngữ cảnh gửi kèm câu hỏi: để model **tự gọi tool** đi tra, hay **lắp sẵn** rồi gửi?
6. Chat "dịch truyện" khác gì job dịch theo lô đã có, và hai thứ chia nhau ở đâu?

Phương pháp: đọc code trong repo (đường dẫn cụ thể ở từng quan sát), đọc tài liệu Gemini và Electron, đọc cách một sản phẩm cùng hình dạng (Obsidian Smart Composer) giải bài "áp dụng đề xuất vào tài liệu". **Chưa gọi thử provider nào trong lúc viết trang này**, chưa dựng thử kênh streaming.

## Quan sát 1 — Ba phần tư hạ tầng đã có, phần thiếu nằm đúng chỗ khó

Đọc code ngày 2026-10-02:

| Thành phần | Đường dẫn | Dùng lại được cho chat? |
| --- | --- | --- |
| Kho kết nối, khóa, `safeStorage` | `src/main/storage/connections.ts`, `secretStore.ts` | **Có, nguyên vẹn.** Chat không cần thêm một khái niệm kết nối nào. |
| Xoay khóa, hai mức đóng băng, `fill-first` | `src/main/providers/keyPool.ts`, `connectionKeySource.ts` | **Có.** `KeySource` là interface, chat dùng đúng instance đó. |
| Phân loại lỗi HTTP theo nhà cung cấp | `src/main/providers/classifyError.ts` | **Có.** Đã trả `ProviderErrorKind` + `retryAfterMs`. |
| Catalog model, giá, giới hạn ngữ cảnh | `src/main/providers/modelCatalog.{ts,json}`, `costEstimate.ts` | **Có.** Menu model trong composer hiện là mảng cứng (`aiChatSample.ts`), thay bằng catalog thật là việc nối dây. |
| Gọi HTTP tới endpoint tương thích OpenAI | `src/main/providers/openAiCompatible.ts` | **Một nửa.** `send()` và `classify()` dùng được; nhưng `callOnce()` là `private` và **hardcode `SYSTEM_PROMPT` dịch** cùng định dạng `[{id,src}] → [{id,dst}]`. Không có đường nào gửi một hội thoại tự do. |
| Ghi một hàng dịch nguyên tử, có kiểm revision, có nguồn gốc | `src/main/ipc/rowHandlers` → `saveRow`, `provenance.ts` (`originFor`) | **Có, và đây là chỗ "Áp dụng" nên đi qua.** Đã biết văn bản, segment, liên kết, tác giả (`RowAuthor`). |
| Luật AI không ghi đè bản người dùng | `src/main/providers/chapterTranslation.ts` (`isProtectedRow`) | **Có** — nhưng là hàm thuần nằm trong module dịch chương; chat muốn tuân cùng luật thì phải nâng nó lên chỗ dùng chung. |
| Kênh main → renderer để đẩy từng chunk | — | **Không có một dòng nào.** `src/shared/channels.ts` chỉ có 32 kênh `invoke`; `grep webContents.send` trong `src/main/` ra **rỗng**. Đây là lý do job dịch được thiết kế thành "renderer điều phối từng lô" (ghi rõ trong doc-comment của `src/shared/aiTranslate.ts`). |
| Hội thoại: kiểu dữ liệu, lưu trữ, lịch sử | — | **Không có.** Không bảng, không kênh, không kiểu. `aiChatSample.ts` là hằng số. |
| Ngữ cảnh truyện thật (thuật ngữ, xưng hô, văn phong) | `ContextAreaMock.tsx` | **Không có.** Lõi nằm ở change `context-core` — **0/n task, chưa triển khai gì**. Ba chip "segment 88 / Thuật ngữ / Xưng hô" trong composer không trỏ vào dữ liệu nào. |

Panel hiện mount trong `ChapterWorkspace.tsx` bằng `Ctrl+K` ở mode Toàn văn, và `contextLabel` được **ghép bằng chữ cứng** `headingTitle(chapter) + ' · Đoạn văn 2'` — tức panel chưa biết con trỏ đang ở đâu.

## Quan sát 2 — Lớp tương thích OpenAI của Gemini đủ cho chat, kể cả usage khi stream

[Tài liệu Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai) (đọc 2026-10-02), base URL `https://generativelanguage.googleapis.com/v1beta/openai/`:

| Thứ chat cần | Trạng thái theo tài liệu |
| --- | --- |
| `stream: true` (SSE) | Có, có ví dụ |
| `tools` + `tool_choice` (function calling) | Có |
| `response_format` JSON schema | Có |
| `reasoning_effort` | Có, map sang mức thinking của Gemini |
| Ảnh đầu vào | Có |
| `stream_options: {include_usage: true}` | Có; theo [diễn đàn Gemini](https://discuss.ai.google.dev/t/gemini-openai-compatibility-does-it-support-the-stream-options-parameter/92785) (đọc 2026-10-02) chunk cuối **mang `usage` kể cả khi không truyền tham số** — chưa xác minh |

Tài liệu tự ghi: *"Support for the OpenAI libraries is still in beta while we extend feature support."*

Hệ quả cho Mira: **không cần API gốc, không cần SDK nhà cung cấp.** Đúng kết luận đã chốt ở [ADR-004](../decisions/0004-ai-provider-layer.md) cho job dịch, và lần này mạnh hơn vì chat còn cần streaming — thứ mà SSE của lớp tương thích làm được. Khác biệt đáng chú ý so với Anthropic: lớp tương thích của Anthropic **bỏ `strict`** và **không có prompt caching** ([đã ghi](ai-provider-integration.md)), nên nếu sau này chat chạy trên Claude thì ràng buộc schema của tool call không được bảo đảm. Đó là lý do nữa để **không đặt cược vào tool call** ở lát cắt đầu (xem Quan sát 5).

## Quan sát 3 — Streaming trong Electron: bốn lựa chọn, ba cái chạy được

Tài liệu Electron ([IPC](https://www.electronjs.org/docs/latest/tutorial/ipc), [MessagePorts](https://www.electronjs.org/docs/latest/tutorial/message-ports), đọc 2026-10-02):

| Phương án | Cách làm | Đánh đổi |
| --- | --- | --- |
| **A. Không stream** | Thêm một kênh `invoke` trả **cả câu trả lời** một lần | Rẻ nhất, khớp hệt kiến trúc đang có, test bằng `fetchImpl` giả như mọi test provider hiện tại. Đổi lại: câu trả lời 300 từ của Gemini Flash là **5–15 giây màn hình trống**; không hủy được giữa chừng (chỉ bỏ kết quả); đúng điều UX chat 2026 coi là lỗi cơ bản |
| **B. `webContents.send`** | Main đẩy từng chunk qua một kênh sự kiện, preload `ipcRenderer.on` | Mẫu phổ biến nhất, ít mã. Phải tự đặt `requestId` để phân biệt hai lượt hỏi; mỗi chunk đi qua Structured Clone; preload phải phơi một hàm `on` — bề mặt API mới đầu tiên của repo theo hướng main → renderer |
| **C. `MessageChannelMain`** | Main tạo cặp port, `postMessage` chuyển quyền sở hữu port cho renderer, mỗi lượt hỏi một port | Kênh riêng cho từng lượt nên **không cần `requestId`**, đóng port là hủy, ít overhead hơn cho chuỗi chunk dày. Đổi lại: `send`/`invoke` **không chuyển được MessagePort** — buộc dùng `postMessage`, tức thêm một cơ chế thứ hai vào preload và nhiều mã vòng đời hơn |
| **D. Renderer tự `fetch`** | Renderer gọi thẳng endpoint, dùng `ReadableStream` của web | **Không làm.** Khóa API sẽ phải đi vào renderer — phá thẳng D2 của change `ai-connection` ("khóa vào rồi không ra nữa") và phá cả `safeStorage` |

Một điểm nên nói thẳng: **phương án A không phải lựa chọn tồi**. Nó giữ nguyên tính chất đang làm job dịch chạy được tử tế — mỗi lời gọi là một `invoke` kiểm được bằng test, không có trạng thái sống giữa hai tiến trình. Nếu lát cắt đầu chấp nhận "gửi xong chờ một lúc rồi hiện cả khối", panel chat thật có thể xong trong một change nhỏ. Streaming là việc nâng cấp **không phá kiểu dữ liệu nào**: cùng một request, chỉ khác đường trả về.

## Quan sát 4 — "Sửa bản dịch": mẫu đã có sẵn trong ngành và trong repo

Obsidian Smart Composer ([forum](https://forum.obsidian.md/t/new-plugin-obsidian-smart-composer-cursor-ai-like-editing/90016), [repo](https://github.com/glowingjade/obsidian-smart-composer), đọc 2026-10-02) là sản phẩm gần hình dạng Mira nhất: chat ở sidebar, `@tên-ghi-chú` để chọn ngữ cảnh, và điểm phân biệt nó với các plugin AI khác là **"Apply Edit" sinh ra một diff để người dùng nhận hoặc bỏ**, đúng mẫu Cursor. Đây là nguồn cộng đồng/tài liệu sản phẩm, **chưa cài chạy**.

Trong repo, ba mức "sửa" khả thi, khác nhau rất xa về chi phí:

1. **Chỉ sao chép** — nút "Sao chép" trong `AiTurn.tsx` hoạt động thật, người dùng tự dán. Chi phí: gần bằng không. Nhưng chính đây là thứ panel minh họa đã hứa nhiều hơn.
2. **Ghi một hàng** — đề xuất của AI thay một segment, đi qua `saveRow` đã có: nguyên tử, kiểm `expectedRev`, ghi `by: RowAuthor` nên hàng hiện là "AI đã dịch" chứ không phải "đã soát", và `originFor()` ghi provider + model. Phải tuân `isProtectedRow`: hàng người dùng đã viết hoặc đã soát thì **bày cạnh nhau cho chọn**, không ghi đè — luật này job dịch đã thi hành, chat không được phá.
3. **Diff cả đoạn/cả chương** — AI trả lại nhiều segment hoặc cả khối văn bản, panel hiện diff, người dùng nhận từng chỗ. Cần một tầng diff theo segment chưa tồn tại; `text.save` hiện thay **cả một side** kèm segment, nên "nhận một phần" phải tự dựng.

Mức 2 là mức rẻ nhất: đường ghi đã có, luật bảo vệ đã có, nguồn gốc đã có.

### Quan sát 4b — Nếu "Áp dụng" tác động cả editor thì **đừng ghi xuống kho, hãy ghi vào editor**

Chủ sản phẩm chốt ngày 2026-10-02: đề xuất của AI **được phép tác động toàn bộ editor**, không giới hạn một segment (hiện chỉ có mode Toàn văn nên "toàn bộ editor" = cả pane bản dịch). Đọc kho để xem cái giá của hai đường ghi:

Đường **qua kho** (`text.save` cả một side) có ba hệ quả đọc được thẳng trong schema:

- `saveText()` trong `src/main/storage/textFile.ts` **xóa mọi segment không được mang theo `id`** rồi insert lại.
- Trigger `segment_delete_flags_links` trong `workSchema.ts` lật `link.status` thành `needs_review` cho mọi liên kết có segment bị xóa — comment trong schema nói đúng chủ ý: *"Deleting a segment must not silently drop the alignment it took part in."* Không mất im lặng, nhưng một lần "áp dụng cả chương" sẽ **đánh dấu lại toàn bộ căn chỉnh của chương**.
- Bảng `provenance` khóa theo `segment_id` với `ON DELETE CASCADE` — segment bị dựng lại thì **mất nguồn gốc** (ai dịch, provider nào, model nào).

Đường **qua editor** không có ba hệ quả đó, vì nó không phải một lời ghi mới: AI trả văn bản thay thế, panel dispatch **một transaction CodeMirror** vào pane bản dịch đang mở, rồi để nguyên đường lưu sẵn có làm việc của nó. `applyEdits` trong `src/shared/segmentMap.ts` map segment qua `ChangeSet`, nên **đoạn không bị sửa giữ nguyên `id`** — liên kết và nguồn gốc của chúng sống sót; chỉ vùng thật sự bị thay mới được dựng lại. Thêm ba thứ đến miễn phí:

- **`Ctrl+Z` hoàn tác được**, vì nó nằm trong history của CodeMirror. Đường ghi xuống kho không có lưới an toàn này.
- Không cần kênh IPC ghi mới, không cần luật `isProtectedRow` — người dùng là người bấm Áp dụng trên một diff họ đã nhìn thấy.
- Quy tắc IME, resegment sau composition, trần kích thước, kiểm `expectedRev` đều **đã đúng** ở đường lưu hiện tại.

Đánh đổi phải nói rõ: một đoạn do AI viết rồi người dùng nhận sẽ **không mang nguồn gốc `ai`** — nó đi vào kho như chữ người dùng gõ. Có thể bảo vệ cách đó (người dùng đã đọc và nhận, nên đó là chữ của họ), nhưng nghĩa là **không trả lời được câu "đoạn này do model nào viết"** cho các sửa đổi qua chat. Muốn có nguồn gốc thì phải đi đường `saveRow` theo từng segment, tức quay về mức 2.

Về cách hiện diff: `@codemirror/merge` **không có trong `package.json`** (chỉ có `state`, `view`, `commands`). Hai lựa chọn — tự dựng diff trong panel (không thêm dependency, nhận/bỏ cả khối), hoặc thêm `@codemirror/merge` để nhận/bỏ từng chỗ ngay trong editor.

## Quan sát 5 — Tool call hay lắp sẵn: panel minh họa đang hứa thứ đắt hơn cần thiết

`aiChatSample.ts` vẽ ba "bước tool" (`Tra Thuật ngữ của tác phẩm`, `Tra ma trận Xưng hô`, `Đọc ví dụ Văn phong`) và `AiTurn.tsx` dựng hẳn khối gập cho chúng. Điều đó **ngụ ý một vòng lặp tool call**: model quyết định gọi gì, main thi hành, trả kết quả, model trả lời.

Hai lý do để không làm vòng lặp đó ở lát cắt đầu:

- **Dữ liệu để tra chưa tồn tại.** Thuật ngữ, xưng hô, văn phong nằm ở `context-core`, chưa triển khai một task nào. Tool call vào kho rỗng là mã chết.
- **Nghiên cứu ngữ cảnh đã kết luận ngược hướng.** [story-context.md](story-context.md) mục 7 chốt `buildContext(snapshot, chapter, chunk) → { blocks, contextHash }` là **hàm thuần, có băm, không ngẫu nhiên** — chọn lọc theo luật, xếp theo ba tầng quanh điểm cắt cache. Nếu để model tự gọi tool, cái vào prompt thành **không tái hiện được**, mất luôn `contextHash` và mất luôn khả năng "đổi glossary → đánh dấu segment chịu ảnh hưởng".

Có một đường giữa, và nó giữ được đúng giao diện đã vẽ: **lắp sẵn ngữ cảnh bằng luật, rồi hiện ra dưới dạng danh sách gập "đã gửi kèm"**. Người dùng vẫn thấy "đã tra 14 mục thuật ngữ, 3 cặp xưng hô" — chỉ khác là Mira quyết định, không phải model. Khối UI đã dựng dùng nguyên, chỉ đổi nguồn dữ liệu và đổi tiêu đề từ "đã dùng công cụ" sang "đã gửi kèm".

Ở lát cắt đầu, khi `context-core` còn trống, ngữ cảnh lắp sẵn được **chỉ gồm những gì đang mở**: segment đang đặt con trỏ, N segment liền trước và sau, bản dịch hiện có của chúng, tên chương, cặp ngôn ngữ. Tất cả đọc được ngay từ `library.readText` + `buildRows`.

## Quan sát 6 — Chat và job dịch là hai contract, không phải một

[ADR-004](../decisions/0004-ai-provider-layer.md) và [nghiên cứu provider](ai-provider-integration.md) mục 1 đã chốt điều này, và CLIProxyAPI xác nhận bằng cấu trúc mã của nó: nó tách `Response(...) [][]byte` (stream) khỏi `ResponseNonStream(...) []byte` ngay ở tầng dịch giao thức. Cụ thể cho Mira:

| | Job dịch theo lô | Chat |
| --- | --- | --- |
| Đơn vị | Chương, chia lô ~1500 token | Một lượt hỏi |
| Khớp kết quả | Theo segment ID, có `reconcile`, thử lại ID thiếu | Chữ tự do, không khớp gì |
| Prompt | `SYSTEM_PROMPT` cố định, JSON vào JSON ra | Hệ thống + lịch sử hội thoại + ngữ cảnh |
| Trả về | Một lần, không stream | Stream (hoặc một lần — Quan sát 3) |
| Ghi dữ liệu | Tự ghi từng lô qua `saveRow` | **Chỉ ghi khi người dùng bấm Áp dụng** |
| Bền vững | Phải tiếp tục được sau lỗi, ước lượng chi phí trước | Hỏng thì hỏi lại; chi phí mỗi lượt nhỏ |

Nghĩa là "chat dịch truyện" **không nên** thay job dịch. Việc của chat là **dịch lại chỗ đang nhìn theo một yêu cầu cụ thể** ("dịch tự nhiên hơn", "giữ giọng cổ trang", "câu này sai nghĩa, sửa lại") — đúng thứ hộp thoại dịch theo lô không làm được vì nó không có ô để gõ yêu cầu. Dịch cả chương, cả bộ vẫn đi `ai:translate:plan` + `ai:translate:batch`.

Về việc dùng SDK: [Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6) có `createOpenAICompatible` và `ToolLoopAgent` đúng hình dạng cần cho chat, nhưng nghiên cứu trước đã khuyến nghị **chỉ cân nhắc nếu panel phát triển thành có tool call**. Theo Quan sát 5 thì lát cắt đầu không có tool call, nên kết luận giữ nguyên: **tự viết, thêm một method vào provider đã có**. Việc phải viết tay chỉ là một parser SSE — vài chục dòng, và nó là chỗ `classifyError` đã có đầu vào sẵn.

## Quan sát 7 — Lưu hội thoại: chưa có bảng nào, và có một lựa chọn rẻ

Không có bảng chat ở cả `library.db` lẫn tệp `.mira`. Hai hướng:

- **Giữ trong bộ nhớ renderer**: đóng panel hoặc đóng app là mất. Không cần đổi schema. Nút "Hội thoại mới" trong header thành thật ngay.
- **Lưu vào tệp tác phẩm**: thêm bảng `chat_thread` / `chat_message`, nâng schema. Hội thoại thuộc tác phẩm (giống ngữ cảnh, khác kết nối AI thuộc cả app). Được lịch sử, được mở lại, nhưng kéo theo một nâng cấp schema — và hiện đã có **ba** change cùng muốn tăng version (`context-core`, `segment-auto-align`, và `ai-usage-persisted` trong backlog).

Đáng lưu ý: `ai-usage-persisted` trong [backlog](../delivery/backlog.md) cũng cần một bảng mới cho lượng token đã dùng. Nếu phải nâng schema, **nâng một lần cho cả hai** rẻ hơn hai lần.

## Suy luận và đề xuất cho Mira

1. **Một lát cắt đầu hẹp, nhưng thật từ đầu đến cuối.** Nối đúng ba thứ: một kênh chat thật có streaming trên kết nối đã có → chữ chảy ra trong panel → nút Áp dụng dispatch một transaction vào pane bản dịch đang mở. Bỏ hết: tool call, lưu hội thoại qua phiên, ảnh đính kèm, chọn model riêng cho chat, và mode Từng câu (đang tạm ẩn).
2. **Thêm `chat()` vào `OpenAiCompatibleProvider`, không tạo class mới.** Cùng `baseUrl`, cùng `KeySource`, cùng `classify()`, cùng `send()`. Khác: body mang `messages` thật thay vì JSON segment, và không đi qua `splitIntoBatches`/`reconcile`. Lợi thế vòng xoay khóa và phân loại lỗi đến **miễn phí**.
3. **Streaming làm ngay, bằng `webContents.send` + `requestId` (phương án B).** Chọn B thay vì C vì ba lý do cụ thể: `requestId` là một chuỗi, trong khi vòng đời `MessagePortMain` là mã thật phải viết và phải dọn; `send`/`invoke` **không chuyển được MessagePort** nên C buộc thêm `postMessage` làm cơ chế IPC thứ hai của preload, trong khi B chỉ thêm một hàm `on`; và chuỗi chunk của **một lượt chat** (vài chục đến vài trăm chunk) không đủ dày để overhead Structured Clone thành vấn đề đo được — ưu thế của C chỉ trả tiền ở luồng dữ liệu liên tục.

   Ba thứ phải thiết kế cùng lúc, vì chúng là chỗ streaming hay hỏng: **một kênh `invoke` để bắt đầu** (trả `requestId` ngay, không trả nội dung), **một kênh `invoke` để hủy** (`AbortController` sống trong main, khóa theo `requestId`), và **mọi chunk đi kèm `requestId`** để hai lượt hỏi chồng nhau không trộn chữ vào nhau. Renderer phải tự dọn listener khi panel unmount, nếu không mỗi lần mở panel lại là một listener nữa. Chunk cuối mang `usage` và `keyTail`; lỗi giữa dòng là **một chunk kiểu `error`**, không phải một promise bị reject — phải vậy vì promise của lời gọi `invoke` đã resolve từ lúc bắt đầu.
4. **Hai chế độ của composer giữ nguyên, nhưng định nghĩa lại bằng quyền ghi.** `Hỏi` = không có nút Áp dụng trong câu trả lời. `Sửa` = model bị yêu cầu trả **đúng một khối văn bản thay thế** cho phạm vi đang nhắm (cộng một dòng giải thích ngắn), panel hiện diff kèm Áp dụng. Khác biệt là **ở prompt và ở nút**, không phải ở model hay ở contract.

   Phạm vi nhắm tới cần một quy tắc một câu, vì nó là thứ người dùng phải đoán đúng mà không cần đọc tài liệu: **đang bôi chọn thì sửa vùng bôi chọn; không bôi chọn thì sửa đoạn chứa con trỏ; muốn cả chương thì phải nói ra** (`Ctrl+A` hoặc một chip "cả chương"). Mặc định "cả pane" khi không bôi chọn là bẫy — một câu hỏi vô hại như "chỗ này dịch cứng quá" sẽ viết lại cả chương.
5. **Áp dụng đi qua editor, không qua kho — và vì thế không cần `isProtectedRow`.** Chi tiết ở Quan sát 4b. Luật bảo vệ của job dịch tồn tại vì job dịch **tự ghi hàng loạt mà không ai nhìn**; chat thì ngược lại — người dùng đọc diff rồi bấm, nên "bảo vệ" ở đây là **cái diff**, cộng `Ctrl+Z`. Hai thứ phải làm đúng để điều đó thành thật: diff phải hiện **trước** khi ghi, không bao giờ áp dụng ngầm; và một lần Áp dụng phải là **một transaction duy nhất**, để một lần `Ctrl+Z` trả lại nguyên trạng chứ không phải gỡ từng câu.
6. **Panel phải biết con trỏ ở đâu — đây là điều kiện tiên quyết, không phải chi tiết.** `contextLabel` đang là chữ cứng và chip "segment 88" là hằng số. Không có segment thật thì cả chế độ `Sửa` lẫn ngữ cảnh "2–5 câu liền trước" đều không tồn tại. `TextEditor` đã có `TextEditorHandle` và decoration theo segment, nên đường lấy "segment chứa con trỏ" là có; phải nối nó lên `ChapterWorkspace` rồi truyền xuống `AiPanel`.
7. **Ngữ cảnh: lắp sẵn bằng luật, hiện ra để người dùng thấy.** Lát cắt đầu chỉ cần hàm thuần `buildChatContext(rows, cursorSegmentId, radius)`. Khi `context-core` xong, hàm này gọi `buildContext()` thật và chip "Thuật ngữ"/"Xưng hô" thành thật — **không đổi một dòng nào ở tầng provider hay IPC**. Đổi tiêu đề khối gập trong `AiTurn.tsx` từ giọng "đã dùng công cụ" sang "đã gửi kèm" để không nói sai về cơ chế.
8. **Hội thoại giữ trong bộ nhớ renderer ở lát cắt đầu.** Panel vẫn gửi được nhiều lượt có lịch sử trong một phiên; đóng panel là mất, và header nói rõ. Lý do: lưu được thì phải nâng schema, và nếu nâng thì nên nâng **một lần** cùng `ai-usage-persisted`. Hoãn một nâng cấp schema rẻ hơn làm hai lần.
9. **Chi phí: hiện số, chưa đặt trần.** Mỗi câu trả lời hiện token thật từ `usage` và quy ra tiền bằng `costEstimate` + `modelCatalog` đã có. Trần chi phí cho chế độ hỏi vẫn là [câu hỏi còn mở](../product/open-questions.md) — nhưng một lượt chat là chi phí làm tròn so với một job dịch nghìn chương, nên **đo trước, đặt trần sau** là đúng thứ tự.
10. **Model: dùng `defaultModel` của kết nối, bỏ menu model cứng.** `AI_MODELS` trong `aiChatSample.ts` là năm nhóm bịa với giá mẫu — nó phải biến mất khỏi mã chạy thật, thay bằng danh sách model của kết nối đang chọn (đã có qua `connections.test()` và `setModels`). Mặc định model riêng cho chat là câu hỏi còn mở; mặc định ban đầu: giống kết nối.
11. **Điều có thể bác bỏ phần "áp dụng" của đề xuất này:** nếu khi dùng thật hóa ra gần như mọi lần Áp dụng đều bị `Ctrl+Z` ngay sau đó, thì vấn đề không phải đường ghi mà là **diff hiện quá muộn** — người dùng chỉ thấy hậu quả sau khi chữ đã vào editor. Khi đó thứ phải làm là `@codemirror/merge` để nhận/bỏ **từng chỗ** trước khi vào văn bản, không phải sửa prompt. Dấu hiệu đo được: tỷ lệ hoàn tác trong 30 giây sau mỗi lần Áp dụng.

    Và một điều có thể bác bỏ phần "chỉ đọc chỗ đang nhìn": nếu phần lớn câu hỏi hóa ra là về **nhất quán xuyên chương** ("tên này chương trước dịch là gì?"), thì ngữ cảnh một-đoạn không đủ và `context-core` trở thành việc chặn trước, không phải việc sau.

## Quyết định — chủ sản phẩm chốt 2026-10-02

| | Câu hỏi | Đã chốt | Ghi chú |
| --- | --- | --- | --- |
| Q1 | Streaming ngay hay sau? | **Làm ngay** | Chủ sản phẩm chọn làm ngay; chọn đường **`webContents.send` + `requestId`** (phương án B) thay vì `MessageChannelMain` — lý do ở mục 3 phần Suy luận |
| Q2 | "Sửa" được ghi tới đâu? | **Tác động cả pane bản dịch**, không giới hạn một segment | Đi **đường editor** (một transaction CodeMirror vào pane đang mở), **không** ghi thẳng xuống kho — Quan sát 4b. Hệ quả nhận: sửa qua chat vào kho như chữ người dùng, không mang nguồn gốc `ai` |
| Q3 | Ngữ cảnh lấy bằng cách nào? | **Mira lắp sẵn bằng luật** | Không tool call. Hiện ra dạng "đã gửi kèm"; khi `context-core` xong thì gọi `buildContext()` thật mà không đổi tầng provider/IPC |
| Q4 | Lưu hội thoại? | **Bộ nhớ phiên** | Không nâng schema trong lát cắt này; nâng một lần cùng `ai-usage-persisted` khi tới lúc |
| Q5 | Chat có thay job dịch chương không? | **Không** | Hai contract, theo [ADR-004](../decisions/0004-ai-provider-layer.md). Chat sửa chỗ đang nhìn; cả chương, cả bộ vẫn đi `ai:translate:plan` + `ai:translate:batch` |
| Q6 | Model cho chat | **Theo kết nối** | Bỏ mảng `AI_MODELS` cứng trong `aiChatSample.ts`, dùng model của kết nối đang chọn |

Hai điều Q2 mở ra, chốt cùng ngày:

| | Câu hỏi | Đã chốt | Ghi chú |
| --- | --- | --- | --- |
| Q7 | Hiện diff bằng gì? | ~~Panel tự dựng~~ → **`@codemirror/merge`, nhận/bỏ từng chỗ trong pane** (đảo ngày 2026-10-03) | Điều kiện mở lại là "đo được tỷ lệ hoàn tác cao". Thực tế đến bằng đường khác và sớm hơn: chủ sản phẩm dùng thử rồi nói thẳng *"tương tác với editor khá kém"*. Khảo sát [Cursor](https://cursor.com/docs/inline-edit/overview), [Notion](https://www.notion.com/help/suggested-edits) và [tổng kết mẫu AI UX](https://www.shapeof.ai/patterns/inline-action) cho cùng một kết luận: kết quả AI phải hiện **trong tài liệu** như một lớp đề xuất, nhận/bỏ **tại chỗ**, không phải so hai nơi rồi nhận cả khối |
| Q8 | Phạm vi một lần Áp dụng | **Bôi chọn → vùng bôi chọn; không bôi chọn → đoạn chứa con trỏ; cả chương phải nói ra** | `Ctrl+A` hoặc một chip "cả chương". Mặc định "cả pane" bị loại vì nó biến một câu hỏi vô hại thành viết lại cả chương |

Còn mở sau khi chốt: **trần chi phí** cho chế độ hỏi (mục 9 phần Suy luận).

## Bước kiểm chứng

Làm **trước** khi tin trang này, và phần lớn trùng với `ai-provider-live-verification` đang nằm trong [backlog](../delivery/backlog.md):

1. **Một lần gọi chat thật bằng khóa Gemini đã nối**, không qua Mira: `curl` tới `.../v1beta/openai/chat/completions` với `messages` thật. Lưu nguyên văn phản hồi. Đây là mẫu để viết `fetchImpl` giả cho test.
2. **`stream_options: {include_usage: true}`**: xác minh chunk cuối có `usage`, và xác minh cả trường hợp **không** truyền tham số (Quan sát 2 nói có nhưng nguồn là diễn đàn). Nếu không có usage khi stream thì phương án A được thêm một điểm.
3. **Hình dạng lỗi khi đang stream**: 429 giữa dòng trả về như thế nào — một chunk lỗi, hay đứt kết nối? `classifyError` hiện chỉ biết đọc một `Response` hoàn chỉnh.
4. **Hủy**: `AbortSignal` cắt giữa stream thì khóa đó bị `keyPool` tính là lỗi hay không — `report()` hiện nhận `'ok' | ClassifiedError`, chưa có khái niệm "chưa xong".
5. **Đếm phạm vi câu hỏi** (kiểm chứng mục 11): 20 lượt hỏi đầu khi dùng thật, bao nhiêu lượt về một câu, bao nhiêu lượt về cả đoạn.
6. **Đo độ hữu dụng của ngữ cảnh lát cắt đầu**: cùng một yêu cầu "dịch tự nhiên hơn", có và không có 3 segment liền trước — bản nào dùng được mà không phải sửa tay.
7. **Tỷ lệ hoàn tác sau Áp dụng** (kiểm chứng mục 11): bao nhiêu lần `Ctrl+Z` trong 30 giây sau khi áp dụng. Cao thì diff đang hiện quá muộn, và câu trả lời là `@codemirror/merge`, không phải sửa prompt.
8. **Hai lượt hỏi chồng nhau**: gửi lượt thứ hai khi lượt đầu chưa xong, xác nhận chữ không trộn vào nhau và hủy lượt đầu không giết lượt sau. Đây là ca mà `requestId` tồn tại để xử lý, nên phải có test cho nó chứ không chỉ thử tay.

## Không làm (và vì sao)

- **Agent mode**: đã chốt không làm ([nghiên cứu provider](ai-provider-integration.md) Quan sát 1) — không có nhu cầu nào trong scope cần AI tự chạy nhiều bước trên dữ liệu người dùng.
- **Vòng lặp tool call**: Quan sát 5 — dữ liệu để tra chưa có, và nó phá tính tái hiện mà `contextHash` cần.
- **Vercel AI SDK**: Quan sát 6 — không có tool call thì không đủ lý do thêm một cây phụ thuộc lớn vào main process.
- **Renderer tự gọi provider**: Quan sát 3 phương án D — phá luật khóa không ra khỏi main.
- **`MessageChannelMain`**: Suy luận mục 3 — ưu thế của nó chỉ trả tiền ở luồng dữ liệu liên tục, còn chi phí là một cơ chế IPC thứ hai trong preload.
- **Ghi đề xuất của AI thẳng xuống kho**: Quan sát 4b — mất nguồn gốc của segment bị dựng lại, lật căn chỉnh cả chương sang `needs_review`, và không có `Ctrl+Z`.
- **Ảnh đính kèm trong composer**: endpoint hỗ trợ, nhưng chưa có ca dùng nào trong scope dịch truyện; nút giữ `disabled`.
- **Chat ở mode Từng câu**: mode đó hiện đang **tạm ẩn** khỏi giao diện (`ChapterWorkspace.tsx`), chờ `segment-auto-align`.
- ~~**`@codemirror/merge` ở lát cắt đầu** (Q7)~~ — **đã mở ngày 2026-10-03**, xem Q7. Chi phí thật: +62 kB vào bundle renderer, và một dependency nữa phải sống chung với live preview, nhúng ảnh và luật IME đã có.

---

[Mục lục handbook](../README.md)
