## Why

Vòng chính của Mira là **nhập raw → AI dịch → soát/sửa** ([ADR-002](../../../docs/handbook/decisions/0002-ai-first-translation.md)), và điều phân biệt một bản dịch truyện dài với một lần gọi API là **ngữ cảnh**: tên riêng không được trôi qua nghìn chương, xưng hô tiếng Việt phải đúng cặp và đổi đúng chỗ. Khu vực **Ngữ cảnh** đã được chốt là một trong bốn khu vực cấp tác phẩm (quyết định 2026-10-01), nhưng trong code nó là `ContextAreaMock`: dữ liệu mẫu cố định, không lưu, không thao tác được, và `TranslateRequest.context` chỉ là một `string` tùy chọn mà không ai điền.

[Nghiên cứu ngày 2026-10-02](../../../docs/handbook/research/story-context.md) khảo sát 14 sản phẩm và kết luận ba điều đổi hướng thiết kế, cả ba đều thuộc **lõi** chứ không thuộc giao diện: ngữ cảnh phải có **hiệu lực theo chương** (xưng hô đổi giữa truyện, và chặn rò spoiler), thuật ngữ lọc **theo đoạn** nhưng xưng hô phải lọc **theo chương** (đoạn thoại tiếng Việt cần đại từ đúng ở chính nơi không nhắc tên ai), và thứ tự khối trong prompt phải xếp quanh **điểm cắt cache** — làm sai thì không sửa được bằng UI về sau. Change này dựng đúng phần lõi đó: dữ liệu, chọn lọc, lắp prompt, kiểm tra. Màn hình và phần AI tự trích đi change sau, dựa trên lõi này.

## What Changes

- **Bảng mục ngữ cảnh trong tệp tác phẩm** (`workSchema.ts`, version mới): một bảng `context_entry` cho **sáu kiểu** `term | character | dyad | world | style | summary`, dùng chung các trường `from_chapter`/`to_chapter` (hiệu lực), `status` (`approved | pending | rejected`), `origin` (`user | ai | import`), `ai_context` (`always | when_matched | not_when_matched | never`), `forbidden` (term cấm), cộng bảng `context_alias` cho dạng gọi tắt/đầy đủ. Mục `dyad` trỏ tới hai mục `character` (người nói, người nghe) và mang cặp xưng hô.
- **Ba lớp bắt buộc có đường dữ liệu thật; ba lớp còn lại chỉ có chỗ ngồi.** `term`, `dyad`, `style` được đọc/ghi và đi vào prompt. `character` chỉ giữ hai trường (giới tính, một dòng vai) phục vụ `dyad`. `world` và `summary` lưu được nhưng **mặc định `ai_context: never`** — chưa có đường nào nạp chúng vào prompt trong change này.
- **Tầng khớp** (`contextMatching.ts`): khớp chuỗi con cho `zh-Hans`/`zh-Hant`/`ja`, khớp theo biên từ cho `en`, **khớp dài trước**, chặn mục quá ngắn, khớp qua alias; và **dàn nhân vật của chương** (tập mục `character` xuất hiện trong chương) làm dữ liệu dẫn xuất tính một lần mỗi chương.
- **`buildContext()` — hàm thuần, ba tầng, có băm:** tầng A ổn định cả job (hướng dẫn + định dạng ID + văn phong đã duyệt), tầng B ổn định trong một chương (dòng `dyad` có hiệu lực cho dàn nhân vật của chương + hồ sơ nhân vật), tầng C biến thiên theo đoạn (mục `term` đã khớp + segment liền trước). Trả về các khối **theo đúng thứ tự A → B → C** cùng `contextHash`; cùng đầu vào luôn cho cùng đầu ra, không ngẫu nhiên, không gọi mạng.
- **Ngân sách ngữ cảnh có ưu tiên tĩnh:** trần token khai báo được; vượt trần thì cắt từ dưới lên theo thứ tự đã định, **không bao giờ** cắt `dyad` đang hiệu lực và `term` đã khớp, và **báo lại cái gì đã bị cắt** cho người gọi ghi vào bản ghi job.
- **Kiểm tra tuân thủ bằng luật** (`contextCompliance.ts`): với một bản dịch và tập mục đã gửi, trả cờ theo segment cho ba ca — mục `term` đã khớp mà bản dịch không chứa `target`, term **cấm** xuất hiện, cặp xưng hô dùng ngoài ma trận của các `dyad` hiệu lực. Không gọi LLM.
- **Kênh IPC cho mục ngữ cảnh:** liệt kê (lọc theo kiểu, trạng thái, chương), tạo, sửa, xóa, duyệt/loại mục `pending`. Renderer chỉ đi qua các kênh này, đúng ràng buộc của `work-storage`.
- **`TranslateRequest.context` đổi từ `string` sang khối có tầng.** Mock provider và test cập nhật theo. **BREAKING** ở mức kiểu nội bộ; chưa có provider thật nào đang dùng trường này nên không có dữ liệu người dùng bị ảnh hưởng.

Không thuộc change này: **ba màn CRUD** Thuật ngữ · Xưng hô · Văn phong (`ContextAreaMock` giữ nguyên cho tới change giao diện); **AI tự trích** thuật ngữ/tên/cặp xưng hô và hàng chờ duyệt do AI tạo; **tóm tắt song ngữ** mỗi chương; **thế giới quan** nạp vào prompt; **ví dụ văn phong truy xuất theo độ tương tự** (cần căn chỉnh + embedding, là S3); nhập CSV; prompt caching thật và Batch API (tầng A/B chỉ **xếp đúng thứ tự** để sau này bật được, không khai `cache_control`); thang leo thang bậc 2 (dịch lại segment bị cờ) thuộc job dịch, change này chỉ sinh ra cờ.

## Capabilities

### New Capabilities

- `story-context`: lưu và truy vấn mục ngữ cảnh của một tác phẩm — sáu kiểu, hiệu lực theo chương, trạng thái duyệt, nguồn gốc, mức dùng cho AI, alias, term cấm, cặp xưng hô có chiều; nâng cấp schema và các kênh IPC đọc/ghi.
- `context-assembly`: chọn và lắp ngữ cảnh thành prompt — tầng khớp theo ngôn ngữ nguồn, dàn nhân vật của chương, ba tầng theo điểm cắt cache, ngân sách có ưu tiên tĩnh, `contextHash` để tái hiện và để biết segment nào chịu ảnh hưởng khi ngữ cảnh đổi.
- `context-compliance`: kiểm tra bản dịch theo ngữ cảnh đã gửi bằng luật — thiếu `target` của mục đã khớp, dùng term cấm, xưng hô ngoài ma trận; trả cờ theo segment, không gọi LLM.

### Modified Capabilities

- `translation-provider`: yêu cầu dịch hiện khai "ngữ cảnh tùy chọn" dạng tự do; đổi thành **khối ngữ cảnh có tầng và có thứ tự bắt buộc**, kèm yêu cầu provider SHALL NOT đổi thứ tự khối, và nguồn gốc bản dịch ghi kèm `contextHash`.
- `content-model`: thêm yêu cầu cho nguồn gốc bản dịch mang `contextHash`, để "đổi ngữ cảnh → đánh dấu segment chịu ảnh hưởng" là một phép so sánh chứ không phải suy đoán.

## Impact

- **Phụ thuộc và thứ tự:** cần `translation-editor` (bản dịch lưu được) và nên đi **sau `ai-connection`** — khi cả hai đã có, một tác vụ trong change này nối `buildContext()` vào chỗ dựng request của "Dịch bằng AI". Nếu `ai-connection` chưa archive, lõi vẫn hoàn chỉnh và được nghiệm thu bằng mock provider + test.
- **Code:** `src/main/storage/workSchema.ts` (version mới — số thực tế chốt lúc triển khai vì `segment-auto-align`/`ai-connection` cũng có thể tăng version), `src/main/storage/contextEntries.ts` (mới), `src/main/context/` (mới: `contextMatching.ts`, `buildContext.ts`, `contextCompliance.ts`), `src/main/ipc/contextHandlers.ts` (mới), `src/main/providers/types.ts` (kiểu `TranslateRequest`), `src/main/providers/mockProvider.ts`, `src/shared/channels.ts`, `src/shared/context.ts` (kiểu dùng chung).
- **Dữ liệu:** bảng mới nằm trong **tệp `.mira` của tác phẩm**, không nằm ở `library.db` — ngữ cảnh thuộc tác phẩm, khác kết nối AI thuộc cả app. Nâng cấp schema một bước nguyên tử theo `work-storage`; tác phẩm cũ mở lên có bảng rỗng và không đổi hành vi.
- **Không đổi giao diện:** `ContextAreaMock` và nhãn "Sắp có" giữ nguyên trong change này; `delivery/backlog.md` mục `context-area` được cập nhật để nói rõ lõi đã có nhưng màn chưa có.
- **Tài liệu:** `engineering/current-state.md`, `delivery/backlog.md`, `delivery/roadmap.md`, `maintenance/changelog.md`; [nghiên cứu ngữ cảnh truyện](../../../docs/handbook/research/story-context.md) được dẫn làm căn cứ, chưa chốt thành ADR — nếu người dùng muốn khóa mô hình ba tầng và quy tắc hiệu lực theo chương ở mức quyết định thì cần ADR-005 riêng.
- **Chưa quyết, đã ghi trong design:** trần ngân sách cụ thể, cổng tuân thủ là **cứng hay cảnh báo**, và việc mục AI trích trùng y nguồn có được tự duyệt — ba câu này có mặc định đề nghị nhưng cần chủ sản phẩm chốt trước khi dựng phần giao diện.
