## Cập nhật 2026-10-03, lần 2 (lộ trình đổi thứ tự)

Chủ sản phẩm chốt **ưu tiên chất lượng dịch trước luồng ghi đề xuất** ([lộ trình](../../../docs/handbook/delivery/roadmap.md)). Ba hệ quả cho change này:

- **"Điều kiện bắt đầu" ở mục dưới (làm sau module đề xuất) không còn đúng.**
- **Khi bắt đầu, change được tách thành hai**, cả hai đi **trước** module Đề xuất và nghiệm thu bằng Bộ đo cộng mock provider:
  - **Thuật ngữ:** kiểu `term`, tầng khớp, chèn tầng C, kiểm tuân thủ thuật ngữ, IPC, và màn Thuật ngữ. Màn này trước đây nằm ngoài change.
  - **Xưng hô:** `character`, `dyad`, dàn nhân vật, tầng B, kiểm xưng hô, và màn Xưng hô.
- **Task 5.4, 7.1 và 7.2 chờ tới khi có `proposal`/`job_item`.** Đó là lưu băm, nối vào tác vụ, và đánh dấu đoạn chịu ảnh hưởng. [Hệ thống ngữ cảnh](../../../docs/handbook/research/context-system.md) K8 đề xuất lưu thêm danh sách id và phiên bản các mục đã gửi, không chỉ băm. Thứ tự tầng A → B → C giữ nguyên; [chất lượng dịch](../../../docs/handbook/research/translation-quality.md) G1 đề xuất nội dung tầng A.

## Cập nhật 2026-10-03 (ADR-005)

[ADR-005](../../../docs/handbook/decisions/0005-ai-first-proposals-no-sentence-mode.md) bỏ mode Từng câu và dữ liệu câu; đơn vị làm việc là **đoạn**. Change này **chưa làm** (0/41 task), nên chỉ đổi kế hoạch cho khớp, không đổi ý tưởng. Đã đổi:

- **Đơn vị:** "segment" → **đoạn** (thuật ngữ khớp theo đoạn, xưng hô theo chương, cờ tuân thủ theo đoạn, "đoạn liền trước" trong tầng C).
- **Chỗ lưu `contextHash`:** không còn `provenance` (bị gỡ). Mã băm nằm ở **`proposal`** (lần gọi từ chat hoặc từ ngoài) và **`job_item`** (tác vụ dịch) của [kiến trúc AI-first §5.3](../../../docs/handbook/engineering/ai-first-architecture.md). Hai bảng này thuộc module khác; xem `design.md` D11.
- **Đường dẫn:** theo bố cục sau `refactor-electron-structure`. Hàm thuần (`buildContext`, `contextMatching`, `contextCompliance`, `budget`) ở `src/shared/algorithms/`; SQL ở `src/main/infra/storage/`; lớp nối ở `src/main/services/context/`; kênh ở `src/main/ipc/handlers/`; kiểu ở `src/shared/contracts/`. `shared` cấm `node:*`, nên `buildContext` nhận hàm băm được tiêm (D12).
- **Dùng chung với chat:** `buildContext` là một hàm cho cả tác vụ dịch và panel Hỏi AI ([kiến trúc AI-first §6.2](../../../docs/handbook/engineering/ai-first-architecture.md)), không phải của riêng tác vụ.
- **`segment-auto-align` đã hủy**, `ai-connection` đã archive: câu cảnh báo đụng version schema đổi theo.
- **ADR:** ADR-005 đã dùng; nếu cần khóa mô hình ba tầng và hiệu lực theo chương ở mức quyết định thì là ADR kế tiếp.

**Điều kiện bắt đầu: Làm sau khi có module đề xuất (proposal) và sau định nghĩa đoạn trên fixture (Q3).** Đoạn chưa được xác nhận trên fixture ZH/JA/EN thì "khớp theo đoạn" và "đoạn liền trước" chưa có nghĩa chắc chắn.

## Why

Vòng chính của Mira là **nhập raw → AI dịch → soát/sửa** ([ADR-002](../../../docs/handbook/decisions/0002-ai-first-translation.md)), và điều phân biệt một bản dịch truyện dài với một lần gọi API là **ngữ cảnh**: tên riêng không được trôi qua nghìn chương, xưng hô tiếng Việt phải đúng cặp và đổi đúng chỗ. Khu vực **Ngữ cảnh** đã được chốt là một trong bốn khu vực cấp tác phẩm (quyết định 2026-10-01), nhưng trong code nó là `ContextAreaMock`: dữ liệu mẫu cố định, không lưu, không thao tác được, và `TranslateRequest.context` chỉ là một `string` tùy chọn mà không ai điền.

[Nghiên cứu ngày 2026-10-02](../../../docs/handbook/research/story-context.md) khảo sát 14 sản phẩm và kết luận ba điều đổi hướng thiết kế, cả ba đều thuộc **lõi** chứ không thuộc giao diện: ngữ cảnh phải có **hiệu lực theo chương** (xưng hô đổi giữa truyện, và chặn rò spoiler), thuật ngữ lọc **theo đoạn** nhưng xưng hô phải lọc **theo chương** (đoạn thoại tiếng Việt cần đại từ đúng ở chính nơi không nhắc tên ai), và thứ tự khối trong prompt phải xếp quanh **điểm cắt cache** — làm sai thì không sửa được bằng UI về sau. Change này dựng đúng phần lõi đó: dữ liệu, chọn lọc, lắp prompt, kiểm tra. Màn hình và phần AI tự trích đi change sau, dựa trên lõi này.

## What Changes

- **Bảng mục ngữ cảnh trong tệp tác phẩm** (`workSchema.ts`, version mới): một bảng `context_entry` cho **sáu kiểu** `term | character | dyad | world | style | summary`, dùng chung các trường `from_chapter`/`to_chapter` (hiệu lực), `status` (`approved | pending | rejected`), `origin` (`user | ai | import`), `ai_context` (`always | when_matched | not_when_matched | never`), `forbidden` (term cấm), cộng bảng `context_alias` cho dạng gọi tắt/đầy đủ. Mục `dyad` trỏ tới hai mục `character` (người nói, người nghe) và mang cặp xưng hô.
- **Ba lớp bắt buộc có đường dữ liệu thật; ba lớp còn lại chỉ có chỗ ngồi.** `term`, `dyad`, `style` được đọc/ghi và đi vào prompt. `character` chỉ giữ hai trường (giới tính, một dòng vai) phục vụ `dyad`. `world` và `summary` lưu được nhưng **mặc định `ai_context: never`** — chưa có đường nào nạp chúng vào prompt trong change này.
- **Tầng khớp** (`contextMatching.ts`): khớp chuỗi con cho `zh-Hans`/`zh-Hant`/`ja`, khớp theo biên từ cho `en`, **khớp dài trước**, chặn mục quá ngắn, khớp qua alias; và **dàn nhân vật của chương** (tập mục `character` xuất hiện trong chương) làm dữ liệu dẫn xuất tính một lần mỗi chương.
- **`buildContext()` — hàm thuần, ba tầng, có băm:** tầng A ổn định cả job (hướng dẫn + định dạng ID + văn phong đã duyệt), tầng B ổn định trong một chương (dòng `dyad` có hiệu lực cho dàn nhân vật của chương + hồ sơ nhân vật), tầng C biến thiên theo đoạn (mục `term` đã khớp + đoạn liền trước). Trả về các khối **theo đúng thứ tự A → B → C** cùng `contextHash`; cùng đầu vào luôn cho cùng đầu ra, không ngẫu nhiên, không gọi mạng.
- **Ngân sách ngữ cảnh có ưu tiên tĩnh:** trần token khai báo được; vượt trần thì cắt từ dưới lên theo thứ tự đã định, **không bao giờ** cắt `dyad` đang hiệu lực và `term` đã khớp, và **báo lại cái gì đã bị cắt** cho người gọi ghi vào bản ghi job.
- **Kiểm tra tuân thủ bằng luật** (`contextCompliance.ts`): với một bản dịch và tập mục đã gửi, trả cờ theo đoạn cho ba ca — mục `term` đã khớp mà bản dịch không chứa `target`, term **cấm** xuất hiện, cặp xưng hô dùng ngoài ma trận của các `dyad` hiệu lực. Không gọi LLM.
- **Kênh IPC cho mục ngữ cảnh:** liệt kê (lọc theo kiểu, trạng thái, chương), tạo, sửa, xóa, duyệt/loại mục `pending`. Renderer chỉ đi qua các kênh này, đúng ràng buộc của `work-storage`.
- **`TranslateRequest.context` đổi từ `string` sang khối có tầng.** Mock provider và test cập nhật theo. **BREAKING** ở mức kiểu nội bộ; chưa có provider thật nào đang dùng trường này nên không có dữ liệu người dùng bị ảnh hưởng.

Không thuộc change này: **ba màn CRUD** Thuật ngữ · Xưng hô · Văn phong (`ContextAreaMock` giữ nguyên cho tới change giao diện); **AI tự trích** thuật ngữ/tên/cặp xưng hô và hàng chờ duyệt do AI tạo; **tóm tắt song ngữ** mỗi chương; **thế giới quan** nạp vào prompt; **ví dụ văn phong truy xuất theo độ tương tự** (cần căn chỉnh + embedding, là S3; chưa có thiết kế sau ADR-005 vì liên kết bền đã bị bỏ); nhập CSV; prompt caching thật và Batch API (tầng A/B chỉ **xếp đúng thứ tự** để sau này bật được, không khai `cache_control`); thang leo thang bậc 2 (dịch lại đoạn bị cờ) thuộc job dịch, change này chỉ sinh ra cờ.

## Capabilities

### New Capabilities

- `story-context`: lưu và truy vấn mục ngữ cảnh của một tác phẩm — sáu kiểu, hiệu lực theo chương, trạng thái duyệt, nguồn gốc, mức dùng cho AI, alias, term cấm, cặp xưng hô có chiều; nâng cấp schema và các kênh IPC đọc/ghi.
- `context-assembly`: chọn và lắp ngữ cảnh thành prompt — tầng khớp theo ngôn ngữ nguồn, dàn nhân vật của chương, ba tầng theo điểm cắt cache, ngân sách có ưu tiên tĩnh, `contextHash` để tái hiện và để biết đoạn nào chịu ảnh hưởng khi ngữ cảnh đổi.
- `context-compliance`: kiểm tra bản dịch theo ngữ cảnh đã gửi bằng luật — thiếu `target` của mục đã khớp, dùng term cấm, xưng hô ngoài ma trận; trả cờ theo đoạn, không gọi LLM.

### Modified Capabilities

- `translation-provider`: yêu cầu dịch hiện khai "ngữ cảnh tùy chọn" dạng tự do; đổi thành **khối ngữ cảnh có tầng và có thứ tự bắt buộc**, kèm yêu cầu provider SHALL NOT đổi thứ tự khối, và bản ghi của lần gọi (`proposal`/`job_item`) ghi kèm `contextHash`. Tên requirement "theo segment ID" giữ nguyên để khớp spec chính; đơn vị trong thân là đoạn.
- `content-model`: nguồn gốc của một lần gọi AI nằm ở `proposal`/`job_item` và mang `contextHash` (không còn `provenance`), để "đổi ngữ cảnh → đánh dấu đoạn chịu ảnh hưởng" là một phép so sánh chứ không phải suy đoán.

## Impact

- **Phụ thuộc và thứ tự:** cần `translation-editor` (bản dịch lưu được, đã làm) và **module đề xuất (`proposal`) cùng module tác vụ dịch (`job_item`)**, vì `contextHash` được lưu ở hai bảng đó (D11). `ai-connection` đã archive. Khi module tác vụ có rồi, một task trong change này nối `buildContext()` vào chỗ dựng request của tác vụ và của chat. Nếu hai module đó chưa có, lõi (khớp, lắp, kiểm tra, kênh IPC) vẫn hoàn chỉnh và được nghiệm thu bằng mock provider + test; chỉ việc lưu băm và đánh dấu đoạn chịu ảnh hưởng phải chờ.
- **Code (bố cục sau `refactor-electron-structure`):** `src/main/infra/storage/workSchema.ts` (version mới — số thực tế chốt lúc triển khai vì change gỡ segment và hai module trên cũng nâng version), `src/main/infra/storage/contextEntries.ts` (mới), `src/shared/algorithms/` (mới: `contextMatching.ts`, `buildContext.ts`, `contextCompliance.ts`, `budget.ts`; hàm thuần, không `node:*`), `src/main/services/context/contextForChunk.ts` (mới; lớp nối storage với hàm thuần, giữ cache dàn nhân vật), `src/main/ipc/handlers/context.ts` (mới, khai `AreaHandlers`, thêm vào bộ gộp `libraryHandlers.ts`), `src/main/infra/providers/types.ts` (kiểu `TranslateRequest`), `src/main/infra/providers/mockProvider.ts`, `src/shared/contracts/channels.ts`, `src/shared/contracts/context.ts` (kiểu dùng chung).
- **Dữ liệu:** bảng mới nằm trong **tệp `.mira` của tác phẩm**, không nằm ở `library.db` — ngữ cảnh thuộc tác phẩm, khác kết nối AI thuộc cả app. Nâng cấp schema một bước nguyên tử theo `work-storage`; tác phẩm cũ mở lên có bảng rỗng và không đổi hành vi.
- **Không đổi giao diện:** `ContextAreaMock` và nhãn "Sắp có" giữ nguyên trong change này; `delivery/backlog.md` mục `context-area` được cập nhật để nói rõ lõi đã có nhưng màn chưa có.
- **Tài liệu:** `engineering/current-state.md`, `delivery/backlog.md`, `delivery/roadmap.md`, `maintenance/changelog.md`; [nghiên cứu ngữ cảnh truyện](../../../docs/handbook/research/story-context.md) được dẫn làm căn cứ, chưa chốt thành ADR — nếu người dùng muốn khóa mô hình ba tầng và quy tắc hiệu lực theo chương ở mức quyết định thì cần một ADR riêng (số kế tiếp; ADR-005 đã dùng cho việc bỏ Từng câu).
- **Chưa quyết, đã ghi trong design:** trần ngân sách cụ thể, cổng tuân thủ là **cứng hay cảnh báo**, và việc mục AI trích trùng y nguồn có được tự duyệt — ba câu này có mặc định đề nghị nhưng cần chủ sản phẩm chốt trước khi dựng phần giao diện.
