## 1. Lấy hình dạng thật trước khi viết test

- [ ] 1.1 Gọi một lượt chat thật tới `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` bằng khóa Gemini đã nối, `stream: true` + `stream_options: {include_usage: true}`; lưu **nguyên văn** toàn bộ dòng SSE vào một fixture dùng cho test. Xong khi fixture có trong `src/main/providers/__fixtures__/` và đọc được bằng mắt là một chuỗi event hợp lệ.
- [ ] 1.2 Ghi lại từ fixture ở 1.1: chunk đầu có `role` hay không, `delta.content` thiếu ở chunk nào, chunk cuối có `usage` không, và `finish_reason` nằm ở đâu. Xong khi bốn câu trả lời đó được ghi thành comment ở đầu fixture — đây là nguồn sự thật cho mọi test sau.
- [ ] 1.3 Lấy hình dạng **lỗi giữa dòng**: gửi một lượt với khóa đã cạn hạn mức (hoặc khóa sai), `stream: true`, lưu nguyên văn. Xong khi biết được lỗi về như một event SSE hay như một phản hồi HTTP không `ok` **trước khi** stream bắt đầu — hai ca này cần hai nhánh xử lý khác nhau.
- [ ] 1.4 Thử hủy giữa dòng bằng `AbortController` và ghi lại `fetch` ném lỗi gì. Xong khi biết chắc nhánh "hủy" phân biệt được với nhánh "mạng đứt", vì `send()` hiện phân biệt hai thứ đó bằng `signal?.aborted`.

## 2. Kiểu dữ liệu dùng chung và kênh

- [x] 2.1 Thêm `src/shared/aiChat.ts`: kiểu một lượt (`ChatTurn`), khối ngữ cảnh **có nhãn** (danh sách, không phải chuỗi — D6), `ChatChunk` ba kiểu `delta`/`done`/`error` đúng như D3, và schema valibot cho đầu vào `send` kèm **trần kích thước** cho ngữ cảnh + lịch sử + câu hỏi. Xong khi `typecheck:node` và `typecheck:web` sạch và có test khẳng định payload vượt trần bị từ chối với lỗi `validation`.
- [x] 2.2 Thêm ba kênh vào `src/shared/channels.ts` (`aiChatSend`, `aiChatCancel`, `aiChatChunk`) và khai `ChatApi` trong `src/shared/desktop-api.ts` theo đúng hình dạng D9 (`send`, `cancel`, `onChunk` trả hàm bỏ đăng ký). Xong khi `typecheck` sạch ở cả hai phía.

## 3. Parser SSE

- [x] 3.1 Viết `src/main/providers/chatStream.ts` — `parseSseStream(stream)` trả `AsyncIterable` các event, gom bộ đệm, cắt ở `\n\n`, bỏ dòng comment `:`, dừng ở `data: [DONE]`. Xong khi `chatStream.test.ts` qua với fixture của 1.1.
- [x] 3.2 Thêm test cho hai ca ép buộc của D5: một chunk mạng chứa **nửa** event (bộ đệm sống qua nhiều lần đọc), và một chunk chứa **nhiều** event (lặp cho hết bộ đệm). Xong khi cả hai test qua và cố tình làm hỏng một trong hai luật thì test đỏ.
- [x] 3.3 Thêm test: stream kết thúc **không** có `[DONE]` (nhà cung cấp cắt sớm) không treo, mà kết thúc iterable. Xong khi test qua trong dưới một giây, không dùng timeout thật.

## 4. Lối gọi hội thoại ở provider

- [x] 4.1 Thêm `chat()` vào `OpenAiCompatibleProvider`: lấy khóa qua `KeySource`, gửi `messages` + `stream: true` + `stream_options`, đọc qua `parseSseStream`, trả `AsyncIterable` phần nội dung cộng một kết thúc mang `usage`. Xong khi test với `fetchImpl` giả (body là stream dựng tay từ fixture) cho ra đúng chuỗi chữ và đúng `usage`.
- [x] 4.2 Nhánh lỗi **trước** khi stream bắt đầu: phản hồi không `ok` đi qua `classify()` như lối gọi dịch, và `keys.report()` được gọi với lỗi đã phân loại. Xong khi test khẳng định khóa sai cho ra lỗi `auth` và khóa cạn hạn mức cho ra `rate_limited` kèm `retryAfterMs`, theo hình dạng thật của 1.3.
- [x] 4.3 Nhánh lỗi **giữa** stream: trả phần chữ đã nhận cộng lỗi có phân loại, không ném mất phần đã có. Xong khi test khẳng định cả hai thứ về cùng nhau (yêu cầu "Lỗi của lượt hội thoại là một phần của dòng").
- [x] 4.4 Hủy giữa dòng: kết thúc với loại `cancelled` và **không gọi `keys.report()` lần nào** (D4). Xong khi test khẳng định `report` không được gọi, và một lượt ngay sau đó vẫn lấy được cùng khóa đó.
- [x] 4.5 Cạn mọi khóa lúc bắt đầu: báo `rate_limited` kèm mốc hồi phục nếu biết, cùng thông điệp như lối gọi dịch. Xong khi test qua.

## 5. Vòng đời một lượt trong main

- [x] 5.1 Viết `src/main/providers/chatService.ts`: sinh `requestId`, giữ `Map<requestId, AbortController>`, chạy `chat()` và phát chunk qua một hàm `emit` tiêm vào (không phụ thuộc `webContents`), tính `usd` bằng `costEstimate` + `modelCatalog`, xóa khỏi sổ khi lượt kết thúc theo bất kỳ đường nào. Xong khi test với `emit` giả khẳng định **ba luật bất biến của D3**: đúng một `done` hoặc `error`, không bao giờ cả hai, và không `delta` nào sau khi kết thúc.
- [x] 5.2 Từ chối sớm khi kết nối đang tắt, với cùng thông điệp lối gọi dịch đang dùng. Xong khi test khẳng định không có lời gọi `fetch` nào xảy ra.
- [x] 5.3 Hai lượt chồng nhau: hai `requestId` khác nhau, chữ không trộn, hủy lượt một không dừng lượt hai. Xong khi test dựng hai stream chạy song le và khẳng định cả ba điều.
- [x] 5.4 `usd` là `null` khi model không có giá trong bản chụp, **không phải 0**. Xong khi test qua với một id model không có trong `modelCatalog.json`.

## 6. IPC và preload

- [x] 6.1 Viết `src/main/ipc/aiChatHandlers.ts`: `aiChatSend` kiểm bằng schema của 2.1 rồi trả `{ requestId }` **ngay**, `aiChatCancel` tra sổ và hủy, chunk đi bằng `webContents.send` và **bỏ qua** khi `webContents.isDestroyed()`. Xong khi test với `webContents` giả (chỉ `send` + `isDestroyed`) qua và kiểm được rằng `send` không trả nội dung câu trả lời.
- [x] 6.2 Hủy mọi lượt của một `webContents` khi nó bị hủy (đóng cửa sổ, reload). Xong khi test khẳng định sổ `AbortController` rỗng sau khi `webContents` báo destroyed, và không `send` nào xảy ra sau đó.
- [x] 6.3 Thêm `chat` vào `src/preload/index.ts` theo D9: `onChunk` **đóng cứng** tên kênh bên trong và trả hàm bỏ đăng ký; không phơi `on(channel, …)` tổng quát. Xong khi `typecheck` sạch và đọc lại mã khẳng định renderer không có đường nào nghe một kênh tùy ý.

## 7. Phạm vi đang nhắm và áp dụng vào editor

- [x] 7.1 Thêm vào `TextEditorHandle` cách đọc phạm vi đang nhắm theo đúng ba luật của spec: bôi chọn → vùng bôi chọn; không bôi chọn → đoạn chứa con trỏ; cả chương chỉ khi được yêu cầu rõ. Trả `{ from, to, text }` cộng danh sách segment ID giao với phạm vi. Xong khi test trên một `EditorState` dựng tay qua cho cả ba ca, gồm ca con trỏ ở đoạn trống.
- [x] 7.2 Thêm cách áp dụng một thay thế bằng **một** `dispatch` mang annotation `userEvent`. Xong khi test khẳng định sau một lần `undo` tài liệu trở lại đúng như trước khi áp dụng, kể cả khi thay thế nhiều đoạn.
- [x] 7.3 Cài ba bậc chống đề xuất cũ của D8 (chữ ở `[from,to]` khớp → thay; tìm thấy đúng một lần ở nơi khác → thay ở đó; còn lại → từ chối kèm lý do "văn bản đã đổi kể từ lúc hỏi"). Xong khi có test cho cả ba bậc, gồm ca chữ xuất hiện **hai lần** trong tài liệu phải rơi vào bậc từ chối.
- [x] 7.4 Nối phạm vi đang nhắm lên `ChapterWorkspace` và truyền xuống `AiPanel`, thay chữ cứng `headingTitle(chapter) + ' · Đoạn văn 2'`. Xong khi di chuyển con trỏ sang đoạn khác làm nhãn phạm vi trên panel đổi theo, có test hành vi.

## 8. Ngữ cảnh và vòng hội thoại ở renderer

- [x] 8.1 Viết `buildChatContext(rows, range, radius)` thuần trong renderer, đọc từ **bản đang mở trong editor** chứ không từ kho (D6), trả danh sách khối có nhãn. Xong khi test khẳng định cùng đầu vào cho cùng đầu ra, và ngữ cảnh gồm bản gốc + bản dịch của mấy câu liền trước/sau phạm vi.
- [x] 8.2 Thêm test khẳng định ngữ cảnh lấy **chữ chưa lưu**: sửa editor mà không lưu rồi dựng ngữ cảnh, phải thấy chữ mới. Đây là lý do tồn tại của D6, nên nó cần một test riêng.
- [x] 8.3 Viết `useAiChat.ts`: gửi, nhận chunk, giữ lịch sử trong phiên, hủy, bắt đầu hội thoại mới; đăng ký `onChunk` một lần và **dọn bằng hàm trả về** khi unmount. Xong khi test khẳng định mở rồi đóng panel hai lần không để lại listener nào.
- [x] 8.4 Trần lịch sử theo ước lượng token: vượt trần thì bỏ từ lượt cũ nhất và **nói rõ đã bỏ bao nhiêu lượt** (D10). Xong khi test qua và thông điệp đó hiện trên panel.
- [x] 8.5 Hủy lượt đang chạy khi panel unmount. Xong khi test khẳng định `cancel` được gọi với đúng `requestId`.

## 9. Panel chạy thật

- [x] 9.1 Thay `AiTurn` bằng lượt thật: chữ hiện dần trong lúc nhận, trạng thái đang chạy, nút Hủy, và chữ giữ lại kèm nhãn "đã hủy" khi hủy — không có nút Áp dụng cho phần đã hủy. Xong khi test hành vi qua cho cả ba trạng thái.
- [x] 9.2 Lỗi giữa dòng: giữ phần chữ đã nhận, hiện lỗi kèm loại và mốc thử lại nếu biết, cho thử lại cùng câu hỏi, **không** cho Áp dụng. Xong khi test qua cho ca hết hạn mức và ca mất kết nối.
- [x] 9.3 Đổi khối `ToolSteps` từ giọng "đã dùng công cụ" sang **"đã gửi kèm"**, nội dung lấy từ ngữ cảnh thật của 8.1, gập lại theo mặc định. Xong khi mở ra thấy đúng những khối đã gửi, có test.
- [x] 9.4 Chế độ Hỏi và chế độ Sửa trong `AiComposer`: Hỏi **không có đường nào** ghi vào bản dịch; đổi chế độ không làm mất câu hỏi đang gõ. Xong khi test khẳng định câu trả lời chế độ Hỏi không có nút Áp dụng.
- [x] 9.5 Chế độ Sửa: tách khối trong hàng rào khi `done`, dựng diff trong panel, nút Áp dụng gọi 7.3. Khi không tách được hàng rào thì hạ về như chế độ Hỏi và **không** bày Áp dụng (D7). Xong khi test qua cho cả ca tuân và ca không tuân.
- [x] 9.6 Thay menu model cứng: `AI_MODELS` bỏ đi, danh sách lấy từ model của kết nối đang chọn, mặc định là `defaultModel` của kết nối. Xong khi test khẳng định đổi `defaultModel` trong Cài đặt làm lượt sau dùng model mới.
- [x] 9.7 Trạng thái chưa có kết nối dùng được: panel nói rõ và chỉ đường tới Cài đặt, ô gửi không gửi được. Xong khi test qua cho ca không có kết nối nào và ca mọi kết nối đang tắt.
- [x] 9.8 Hiện token và tiền của lượt vừa chạy; model không có giá thì nói **chưa biết giá**, không hiện 0. Xong khi test qua cho cả hai ca.
- [x] 9.9 Gỡ nhãn "Sắp có" khỏi header panel và xóa phần `aiChatSample.ts` đang đóng vai dữ liệu thật. Xong khi `grep SAMPLE` trong `src/renderer` không còn trỏ vào đường chạy thật của panel.

## 10. Chạy cả vòng và dọn

- [x] 10.1 Chạy `pnpm test`, `typecheck:node`, `typecheck:web`, `eslint`, `electron-vite build` và `openspec validate ai-chat --strict`. Xong khi tất cả sạch (hai lỗi lint có từ trước ở `src/shared/rawText.ts` vẫn ngoài phạm vi, không sửa ở change này).
- [ ] 10.2 **Lái tay trong Electron thật** — việc này không test tự động được: hỏi một câu và xem chữ chảy thật; hủy giữa dòng; gửi lượt thứ hai khi lượt đầu chưa xong; áp dụng một đề xuất rồi `Ctrl+Z`; sửa tay rồi bấm Áp dụng đề xuất cũ để thấy nó **từ chối**; rút mạng giữa dòng. Xong khi cả sáu ca được ghi lại kết quả, kèm ảnh sáng/tối ở 1280 px và không cuộn ngang.
- [ ] 10.3 Đếm số liệu của hai bước kiểm chứng trong nghiên cứu: trong 20 lượt hỏi đầu, bao nhiêu lượt về phạm vi rộng hơn một câu; và tỷ lệ `Ctrl+Z` trong 30 giây sau mỗi lần Áp dụng. Xong khi hai số được ghi vào [nghiên cứu](../../../docs/handbook/research/ai-chat-panel.md) — số thứ hai là thứ quyết định có mở `@codemirror/merge` hay không.
- [x] 10.4 Cập nhật tài liệu: `engineering/current-state.md`, `delivery/backlog.md` (`ai-chat-panel` chuyển trạng thái, và ghi phần nào vẫn chưa làm), `product/open-questions.md` (trần chi phí còn mở), `maintenance/changelog.md`. Xong khi không trang nào còn nói panel là "chỉ minh họa", và changelog ghi rõ cái gì **chưa** được kiểm.

## 11. Ngữ cảnh chương và tool chỉ-đọc (thêm 2026-10-02 sau lần dùng thật)

- [x] 11.1 `buildChatContext` **luôn** gửi bản gốc của chương (và bản dịch hiện có khi có), không phụ thuộc range hay việc hai bên có khớp số đoạn; cắt quá dài thì nói rõ đã cắt. Xong khi test khẳng định chương chưa dịch vẫn gửi bản gốc — đây là lỗi đã gặp trên màn hình.
- [x] 11.2 Bản dịch trống thì phạm vi tự thành **cả chương**, chip khóa lại kèm lý do; `canSend` cho phép chế độ Sửa ở phạm vi cả chương. Xong khi mở một chương trống thì gửi được ngay mà không phải bôi chọn gì.
- [x] 11.3 `applyProposal` chèn vào tài liệu **rỗng** thay vì từ chối (neo rỗng chỉ mơ hồ khi tài liệu có chữ). Xong khi test cho cả ca chèn và ca một lần hoàn tác trả lại pane trống.
- [x] 11.4 `ChatSendInput` mang `workId` + `chapterId`, và schema valibot kiểm chúng. Xong khi `typecheck` sạch và test khẳng định payload thiếu hai trường đó bị từ chối.
- [x] 11.5 Provider `chat()` nhận `tools` và trả thêm sự kiện `tool-call`, gom mảnh `tool_calls` theo `index` qua các khung stream. Xong khi test dựng một stream có tool call bị cắt làm nhiều khung cho ra đúng một lời gọi có tên và tham số đầy đủ.
- [x] 11.6 `chatTools.ts` trong main: `list_chapters` và `read_chapter(chapter, side)` đọc từ `LibraryStore`, **chỉ đọc**, phạm vi khóa trong `workId` của lượt. Xong khi test khẳng định một `workId` khác không đọc được, và không có hàm nào ghi.
- [x] 11.7 Vòng lặp tool trong `chatService` (không ở provider): thi hành tool, nối kết quả vào `messages`, gọi lại, **có trần số vòng**. Xong khi test khẳng định vượt trần thì lượt trả lời bằng những gì đã có thay vì đọc tiếp.
- [x] 11.8 Thêm chunk `tool` vào giao thức và hiện trong panel ("đã đọc Chương 2 · bản gốc"), dùng lại khối gập sẵn có. Xong khi mở ra thấy đúng danh sách đã đọc.
- [x] 11.9 Ghi thẳng khi pane bản dịch trống (D13): chế độ Sửa ở phạm vi cả chương tự áp dụng, có thông báo và `Ctrl+Z` hoàn tác; pane đã có chữ thì giữ nguyên diff + Áp dụng. Xong khi test phủ cả hai nhánh.
- [x] 11.10 Chạy lại toàn bộ cổng kiểm và cập nhật `current-state.md`, `backlog.md`, `changelog.md` cho phần tool. Xong khi không trang nào nói panel chỉ đọc được chương đang mở.

## Ghi chú triển khai (2026-10-02)

Những gì đã làm xong nhưng **chưa được một lượt gọi thật xác nhận**, để không ai đọc dấu `[x]` thành "đã kiểm chứng":

- **Nhóm 4 chạy trên hình dạng khung theo quy ước endpoint tương thích OpenAI**, không trên bản chụp thật của nhóm 1 (`src/main/providers/__fixtures__/` vẫn chưa có). Khung chữ và khung `usage` là quy ước ổn định; phần **chưa biết** là Gemini báo lỗi giữa dòng bằng cách nào. Lối gọi vì vậy cài **cả hai** nhánh — lỗi bằng mã HTTP trước khi stream mở, và lỗi bằng một khung giữa dòng — và test phủ cả hai. Task 1.3 chỉ còn việc xác nhận nhánh nào thật sự xảy ra, không còn là điều kiện để viết mã.
- **Hình dạng 429 trong test lấy từ cùng giả định mà `classifyError` đã dựng trên đó** (`RetryInfo.retryDelay`, `quotaId` chứa `PerDay`) — nguồn là issue và diễn đàn bên thứ ba, đã ghi trong `ai-provider-live-verification`. Lối chat **dùng lại đúng bộ phân loại đó**, nên nó thừa hưởng cùng một điều chưa kiểm chứ không thêm phỏng đoán mới.
- **`typecheck:web` còn 3 lỗi có trước change này**, ở `components/SearchField.tsx` (một lỗi) và `features/chapter/useAiTranslate.ts` (hai lỗi, biến `spent` bị suy ra `never`). `git diff HEAD` cho hai tệp đó rỗng — chúng tồn tại ngay ở HEAD, nằm ngoài phạm vi change này. Task 10.1 phải quyết: sửa kèm hay để riêng.

### Về chữ "có test hành vi" trong nhóm 7–9

Kho này **không có khả năng test component**: `vitest.config.ts` khai `environment: 'node'` và `include: ['src/**/*.test.ts']` — **chỉ `.ts`, không `.tsx`** — và `package.json` không có `jsdom`, `happy-dom` hay `@testing-library/react`. Mọi test renderer đang có đều là test logic thuần.

Cách đã chọn: **không tự thêm dependency**, mà đẩy mọi luật đáng kiểm xuống module thuần rồi test cạn chúng — `chatRange.ts` (phạm vi + ba bậc chống đề xuất cũ, 15 test, gồm undo thật của CodeMirror chạy headless), `chatContext.ts` (16 test, có ca "thấy chữ chưa lưu"), `chatTurns.ts` (26 test: hai lượt chồng nhau, lượt đã đóng không nhận thêm, chỉ lượt Sửa đã xong mới có đề xuất), `lineDiff.ts` (10 test, có tính chất "không mất dòng nào"). Phần còn lại của nhóm 9 là **lắp JSX**, và nó được nghiệm thu bằng task 10.2 (lái tay) — đúng cách `AiTranslateDialog` đã làm, và đó cũng là lý do `ai-settings-visual-check` nằm trong backlog.

Nếu muốn test component thật thì đó là một quyết định riêng: thêm `jsdom` + `@testing-library/react` và mở `include` cho `.tsx`. Chưa làm vì thêm dependency không nằm trong phạm vi change này.

## 12. Diff inline trong pane bản dịch (thêm 2026-10-03, đảo Q7)

- [x] 12.1 Thêm `@codemirror/merge` bằng đúng pnpm repo ghim (corepack → 8.9.0), giữ `lockfileVersion: '6.0'`. Xong khi diff lockfile chỉ là phần thêm gói, không phải viết lại định dạng.
- [x] 12.2 `chatReview.ts`: `ReviewMode` trong một `Compartment` (bật/tắt không dựng lại editor nên lịch sử undo sống sót) và `reviewFinished` dùng API công khai. Xong khi test phủ bật/tắt, giữ lịch sử, và cả hai kết cục nhận/bỏ.
- [x] 12.3 `TextEditorHandle.reviewProposal` đưa đề xuất vào pane dạng chunk, giữ nguyên ba bậc chống đề xuất cũ; `endReview` bỏ phần chưa duyệt; review tự tắt khi hết chunk. Xong khi `typecheck` sạch và review mode tắt được cả hai đường.
- [x] 12.4 Panel bỏ diff tự dựng, còn lại một dòng tóm tắt + nút "Xem trong bản dịch"; thêm trạng thái "đang duyệt" tự rút lui khi pane báo xong. Xong khi không còn diff nào vẽ trong panel.
- [ ] 12.5 **Lái tay**: duyệt từng chunk trong pane thật, kiểm `Ctrl+Z` hoàn tác cả lượt, và kiểm review sống chung được với live preview + nhúng ảnh + IME. **Chưa làm** — và đây là phần test tự động không với tới được, vì `acceptChunk`/`rejectChunk` cần `EditorView` thật mà kho này chạy test không có DOM.
