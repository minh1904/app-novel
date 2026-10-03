## 0. Hằng số cần chốt khi triển khai

Ba con số dưới đây là **mặc định đề nghị**, không chặn việc dựng (xem Open Questions trong [design.md](design.md)). Đặt cả ba **một chỗ duy nhất** trong `src/main/context/budget.ts` kèm comment ghi rõ là chưa đo.

- [ ] 0.1 Trần ngữ cảnh mặc định **40%** token của một lần gọi và biên an toàn **15%** — một hằng số, có comment "chưa đo, hiệu chỉnh bằng `usage` thực"
- [ ] 0.2 Hệ số ước lượng token: CJK ≈ 1 token/ký tự, Latin ≈ 4 ký tự/token (D6) — cùng chỗ với 0.1
- [ ] 0.3 Ngưỡng độ dài tối thiểu của từ khóa tự khớp: **2 ký tự** với nguồn CJK, **3 ký tự** với nguồn Latin, kèm cờ cho phép người dùng ép khớp mục ngắn hơn (D4)

## 1. Schema và kho dữ liệu

- [ ] 1.1 Đọc lại `src/main/infra/storage/workSchema.ts` lấy **số version kế tiếp thực tế** (đang ở 5 nhưng các change đang mở có thể đã tăng) — không hardcode số trong code trước khi kiểm
- [ ] 1.2 Version mới: `CREATE TABLE context_entry` (một bảng cho sáu kiểu, cột riêng theo kiểu để `NULL`, `CHECK` theo `kind` theo D1), `CREATE TABLE context_alias` với `UNIQUE (form)`, index cho truy vấn hiệu lực; `from_chapter_id`/`to_chapter_id` `REFERENCES chapter (id) ON DELETE SET NULL` (D2). Chỉ `CREATE`, không `ALTER` bảng cũ. Verify: `migrate.test.ts` nâng cấp từ version trước xanh, `schemaSnapshot.test.ts` xanh với fixture mới trong `__fixtures__/`
- [ ] 1.3 `src/main/storage/contextEntries.ts`: tạo/sửa/xóa/đọc một mục, liệt kê có lọc theo kiểu và trạng thái, và **xóa nhân vật kéo theo cặp xưng hô** (đếm trước, xóa trong một transaction). Verify: test cho vòng đời một mục, test rằng xóa nhân vật trả về số cặp bị xóa và không để lại cặp mồ côi
- [ ] 1.4 Truy vấn **tập mục hiệu lực tại một chương**: join `chapter` lấy `position`, áp quy ước `NULL` = từ đầu / còn hiệu lực, và khi hai mục cùng đối tượng thì lấy mốc gần nhất không vượt chương đang hỏi. Verify: test ca cặp xưng hô đổi ở chương 14 (hỏi tại chương 10 và 20), ca `from` ở chương 50 hỏi tại chương 3, ca `to` đã hết hiệu lực, ca chương làm mốc bị xóa
- [ ] 1.5 Ràng buộc dạng viết: một `form` thuộc đúng một mục; khai trùng trả lỗi xác thực và không ghi gì. Verify: test ca trùng trong cùng tác phẩm và ca cùng `form` ở hai tác phẩm khác nhau (phải cho phép)
- [ ] 1.6 Mặc định `ai_context` theo kiểu khi tạo mục không khai: `term`/`character` = *gửi khi khớp*, `dyad`/`style` = *luôn gửi*, `world`/`summary` = **không bao giờ gửi** (D1, spec `story-context`). Verify: test từng kiểu
- [ ] 1.7 Bộ đếm `entriesRev` tăng ở **đúng một chỗ ghi** trong tầng storage (D3). Verify: test rằng mọi hàm ghi mục đều làm `entriesRev` tăng, bằng cách gọi lần lượt từng hàm ghi
- [ ] 1.8 Verify rằng xuất/backup rồi phục hồi một tác phẩm mang theo đủ mục ngữ cảnh và dạng viết (dùng đường backup đã có)

## 2. Tầng khớp

- [ ] 2.1 `src/main/context/contextMatching.ts`: dựng regex alternation từ từ khóa + dạng viết đã escape, **sắp dài trước**, bọc `\b` khi nguồn là `en`, không bọc với `zh-Hans`/`zh-Hant`/`ja` (D4). Hàm thuần, không chạm DB. Verify: test "Thiên Lam" vs "Thiên Lam Tông", test `Ash`/`Ashton` với nguồn `en`, test ký tự đặc biệt trong từ khóa không làm vỡ regex
- [ ] 2.2 Áp ngưỡng độ dài tối thiểu và cờ ép khớp (0.3). Verify: test mục một ký tự không tự khớp, và khớp khi được ép
- [ ] 2.3 Trần số mục mỗi đoạn kèm thứ tự ưu tiên khi vượt trần (mục liên kết với cặp xưng hô → tên nhân vật → thuật ngữ nhiều từ → còn lại). Verify: test với 300 mục cùng khớp trong một đoạn
- [ ] 2.4 **Dàn nhân vật của chương**: quét văn bản nguồn của chương một lần, trả tập mục `character` xuất hiện; cache trong bộ nhớ theo `(chapter_id, text_rev, entriesRev)` (D3). Verify: test rằng hai đoạn của cùng chương nhận cùng dàn, và cache mất hiệu lực khi `text_rev` đổi hoặc `entriesRev` đổi

## 3. Lắp ngữ cảnh ba tầng

- [ ] 3.1 `src/shared/context.ts`: kiểu `ContextBlocks` với ba tầng có thứ tự và `contextHash`, cộng kiểu cho phần báo lại đã bị cắt. Verify: `pnpm typecheck` sạch
- [ ] 3.2 `src/main/context/buildContext.ts`: hàm thuần nhận (tập mục đã lọc, chương, đoạn, segment liền trước, trần) → ba tầng theo thứ tự A → B → C. **Không** đọc DB, **không** `Date.now()`, **không** ngẫu nhiên. Verify: test rằng hai lần gọi cùng đầu vào cho đầu ra trùng khít; test rằng hai đoạn khác nhau của cùng chương có tầng A và B **giống từng ký tự**
- [ ] 3.3 Lọc những mục không bao giờ được gửi: chưa duyệt, đã loại, mức *không bao giờ gửi*, chưa/đã hết hiệu lực, và **thuật ngữ bị cấm** (D7). Verify: test ca mục có `from_chapter` = 200 kèm ghi chú tiết lộ muộn không để lại dấu vết nào trong khối khi dịch chương 3; test ca mục bị cấm không xuất hiện
- [ ] 3.4 Ngân sách: ước lượng token theo hệ số (0.2), cắt theo thứ tự tĩnh (ví dụ văn phong → segment liền trước → hồ sơ nhân vật), **không cắt** cặp xưng hô hiệu lực và thuật ngữ đã khớp, báo lỗi khi riêng hai nhóm đó vượt trần, và **trả về danh sách phần đã bị cắt**. Verify: test cho bốn nhánh (cắt được, cắt tới hết, lỗi vì hai nhóm bắt buộc vượt trần, không cần cắt)
- [ ] 3.5 `contextHash`: `sha256` 16 ký tự hex đầu trên chuỗi tuần tự hóa của tầng A + tầng B + danh sách mục thuật ngữ đã khớp — **không gồm văn bản nguồn, không gồm khối segment liền trước** (D5). Verify: test rằng sửa bản dịch của một mục đang khớp làm băm đổi; sửa một mục không liên quan thì không đổi; **sửa văn bản nguồn thì không đổi**; dịch segment trước đó thì không đổi
- [ ] 3.6 Cặp xưng hô thiếu: khi chương có hai nhân vật mà không có cặp hiệu lực, kèm chỉ dẫn trung tính và trả cờ *chưa khai* (spec `context-assembly`). Verify: test ca không có chiều nào và ca chỉ có một chiều
- [ ] 3.7 `src/main/context/contextForChunk.ts` (hoặc tên tương đương): lớp mỏng nối storage với hàm thuần — đọc tập mục hiệu lực, lấy dàn nhân vật, khớp, rồi gọi `buildContext`. Verify: test tích hợp trên một tác phẩm fixture hai chương

## 4. Kiểm tra tuân thủ

- [ ] 4.1 `src/main/context/contextCompliance.ts`: hàm thuần nhận (bản dịch theo segment, tập mục đã gửi, ma trận xưng hô hiệu lực) → cờ theo segment. **Không mạng, không LLM, không sửa dữ liệu** (spec `context-compliance`). Verify: test rằng hàm không có phụ thuộc nào vào `fetch`/provider
- [ ] 4.2 Cờ **thiếu thuật ngữ**: so khớp phía đích phân biệt dấu tiếng Việt và phân biệt hoa đầu từ với tên riêng. Verify: test "linh khí" vs "linh khi", test mục không gửi thì không bị kiểm
- [ ] 4.3 Cờ **dùng thuật ngữ bị cấm**, kèm cách dịch khuyến nghị nếu mục có khai. Verify: test một ca dương, một ca âm
- [ ] 4.4 Cờ **xưng hô ngoài ma trận** và cờ **chưa khai xưng hô**. Verify: test ca dùng "anh – em" khi ma trận chỉ có "tớ – cậu"; test ca chương có hai nhân vật chưa khai cặp nào
- [ ] 4.5 Phân nhóm cờ: *có thể thử lại tự động* (thiếu thuật ngữ, thuật ngữ bị cấm) và *cần người xem* (xưng hô). Verify: test lọc riêng được hai nhóm

## 5. Hợp đồng provider và mock

- [ ] 5.1 Đổi `TranslateRequest.context` từ `string` sang `ContextBlocks | undefined` trong `src/main/infra/providers/types.ts`; `TranslateResponse` mang lại `contextHash` khi yêu cầu có ngữ cảnh (D10, spec `translation-provider`). Verify: `pnpm typecheck` sạch, test cũ của `providers.test.ts` được cập nhật và xanh
- [ ] 5.2 `MockProvider` ghi lại các khối đã nhận theo thứ tự để kiểm thử đọc lại (D9), và trả lại `contextHash` đã nhận. Verify: test đọc lại được đúng thứ tự A → B → C và nội dung từng khối
- [ ] 5.3 Test "mục chưa duyệt không rời máy": dựng fixture có mục `pending`, gọi dịch qua mock, khẳng định không khối nào chứa nội dung của mục đó. Verify: test xanh và thất bại nếu bỏ bước lọc ở 3.3
- [ ] 5.4 `provenance.ts`: lưu `contextHash` cùng nguồn gốc; phân biệt **không có ngữ cảnh** với **ngữ cảnh rỗng** (spec `content-model`). Verify: test ghi/đọc lại cả hai ca sau khi mở lại tệp

## 6. IPC

- [ ] 6.1 Kênh mới trong `src/shared/contracts/channels.ts`: liệt kê (lọc theo kiểu, trạng thái, chương hiệu lực), tạo, sửa, xóa, duyệt, loại. Verify: `pnpm typecheck` sạch
- [ ] 6.2 `src/main/ipc/contextHandlers.ts`: xác thực đầu vào bằng `valibot`, kết quả bọc `Result` như các handler hiện có; tham chiếu không tồn tại → lỗi xác thực, không đổi dữ liệu. Verify: test cho ca liệt kê theo kiểu + chương, ca tạo cặp xưng hô trỏ nhân vật không tồn tại, ca đầu vào sai kiểu
- [ ] 6.3 Verify bằng test rằng không hàm IPC nào trả về mục ở trạng thái đã loại khi người gọi hỏi tập dùng cho AI

## 7. Nối vào job dịch

- [ ] 7.1 **Nếu `ai-connection` đã archive:** chỗ dựng request của "Dịch bằng AI" gọi `contextForChunk` và truyền `ContextBlocks` vào `TranslateRequest`; `usage` thực được ghi lại để sau này hiệu chỉnh hệ số 0.2. Verify: test luồng dịch một chương với mock provider, khẳng định request mang đủ ba tầng. **Nếu chưa:** bỏ qua task này và ghi lại trong tasks rằng lõi được nghiệm thu bằng mock
- [ ] 7.2 Đánh dấu segment chịu ảnh hưởng: so `contextHash` đã lưu với băm lắp lại từ trạng thái hiện tại; **không** tự dịch lại, **không** sửa bản dịch, **không** đánh dấu segment do người dùng tự viết (spec `content-model`). Verify: test ca sửa một mục đang dùng trong năm segment → đúng năm segment bị đánh dấu; ca sửa mục không dùng → không segment nào; ca segment do người dùng viết → không bị đánh dấu

## 8. Kiểm tra tổng và tài liệu

- [ ] 8.1 Fixture hai chương thật (một ZH nhiều thuật ngữ, một nhiều hội thoại) dùng chung cho các test ở mục 2–4, đặt trong `__fixtures__/`. Verify: các test của mục 2–4 chạy trên fixture này, không trên dữ liệu bịa trong từng test
- [ ] 8.2 Chạy `pnpm typecheck`, `pnpm lint`, `electron-vite build`, `pnpm vitest run` — tất cả sạch; ghi lại số test và bất kỳ ca chập chờn không liên quan
- [ ] 8.3 Cập nhật `docs/handbook/engineering/current-state.md` (lõi ngữ cảnh đã có, màn chưa có), `docs/handbook/delivery/backlog.md` mục `context-area` (nói rõ `ContextAreaMock` vẫn là minh họa nhưng lõi đã chạy), `docs/handbook/delivery/roadmap.md`, và `docs/handbook/maintenance/changelog.md`
- [ ] 8.4 Ghi vào handbook ba con số ở mục 0 cùng trạng thái "chưa đo", và dẫn tới bảy bước kiểm chứng trong [nghiên cứu ngữ cảnh truyện](../../../docs/handbook/research/story-context.md) như kế hoạch đo tiếp theo
- [ ] 8.5 Hỏi chủ sản phẩm ba câu còn mở trước khi bắt đầu change giao diện: cổng tuân thủ cứng hay cảnh báo, mục AI trích trùng y nguồn có tự duyệt, và có cần ADR-005 để khóa mô hình ba tầng + hiệu lực theo chương
