## Why

Lộ trình đổi ngày 2026-10-03 đặt **chất lượng dịch trước luồng ghi**, với nguyên tắc "đo trước, dựng sau": mọi thay đổi nhằm nâng chất lượng (prompt, glossary, xưng hô, mức thinking) phải có số trước và sau. Muốn vậy Mira cần một **Bộ đo** đáng tin. Công cụ tạm `scripts/bench/` đã chạy hai lượt (B1 baseline, B2a quy ước trong prompt; [kết quả](../../../docs/handbook/research/translation-quality.md#kết-quả-đo-của-mira)) và cho thấy cả giá trị lẫn chỗ hở của cách đo hiện tại:

- **Chỉ có kiểm tất định (T0).** Lỗi nghĩa như "ngồi dậy" thay vì "ngồi mà lết đi" hay mất chơi chữ 窃/偷 không máy nào bắt được bằng luật. Thiếu giám khảo LLM (T1) và người chấm (T3) thì không quyết được thay đổi nào là tốt hơn.
- **Ghép đoạn theo số đếm là sai.** B2a có lần số đoạn bằng nhau nhưng mọi đoạn ở giữa trượt một vị trí (một dòng mất, một dòng dư), làm sai mọi số đo theo đoạn. Bản vá tạm (ngưỡng 15% đoạn lệch độ dài) chỉ phát hiện được, không ghép lại được.
- **Phép kiểm nằm ngoài mã của app.** `score.ts` không có test, không dùng lại được cho module QA, trong khi chính các phép kiểm đó (chữ nguồn còn sót, số đoạn, tuân thủ thuật ngữ) là lõi của QA.
- **Định dạng fixture chỉ được mô tả trong README**, chưa có kiểm tra; bộ kiểm chéo nằm ngoài repo.
- **Q3 của ADR-005** (đoạn = mỗi dòng không trống) có điều kiện xong là bài V14 trên fixture ZH/JA/EN; số liệu đã có nhưng chưa được ghi thành kết luận.

## What Changes

- **Định dạng fixture thành hợp đồng có kiểm tra:** tác phẩm (`work.json`, `glossary.json`, `pronouns.json`) và chương (`source.txt`, `meta.json`, `assertions.json`, tùy chọn `reference.vi.txt`); phần công khai trong repo, phần có bản quyền ở `fixtures/private/` (bị ignore). Bộ nạp từ chối fixture sai hình dạng, quy tắc không neo được đúng một đoạn, mục glossary không xuất hiện ở chương nào.
- **Kiểm tất định (T0) thành hàm thuần có test trong `src/shared/algorithms/`**, để module QA dùng lại nguyên:
  - đếm đoạn theo ADR-005;
  - **ghép đoạn theo nội dung** (quy hoạch động trên độ dài, cho phép đoạn sót, dư, gộp, tách), thay cho ghép theo số đếm;
  - chữ nguồn và dấu câu nguồn còn sót; ngoặc thoại lệch; kiểu thoại của chương; độ dài bất thường; lặp vòng;
  - tuân thủ glossary (chặt và chấp nhận được, term cấm); quy tắc viết tay.
- **Giám khảo LLM so cặp mù (T1):** cả chương vào, phán theo từng đoạn đã ghép (A hơn / B hơn / ngang, kèm lỗi major/minor ở bốn mục); chạy cả hai thứ tự; judge **khác họ** model dịch; cố định model, prompt (mã băm) và tham số; lượt A/A để đo mức nhiễu.
- **Người chấm mù (T3):** công cụ sinh một trang HTML tĩnh chạy cục bộ, đưa 60–80 cặp đoạn ngẫu nhiên, ẩn tên điều kiện; người chấm chọn A / B / ngang; kết quả nhập lại thành tệp JSON để tính đồng thuận judge–người.
- **Lệnh chạy thí nghiệm** theo cấu hình (model, mức thinking, tệp prompt, số lần lặp), đi đúng đường dịch của app, ghi đủ hồ sơ để tái hiện (commit, model, mã băm prompt, tham số thật đã gửi, `usage`), và chấm lại được không cần gọi API.
- **Quy tắc quyết định E6** thành lệnh so hai lượt: T0 không xấu đi, cận dưới khoảng tin cậy 95% (bootstrap theo chương) của tỷ lệ thắng T1 trên 50%, và T3 không ngược chiều. Kết quả là một trong "giữ", "không giữ", "chưa đủ dữ liệu".
- **Ghi kết quả V14** và đề xuất đóng Q3 của ADR-005 bằng số liệu.
- **Gỡ công cụ tạm:** `scripts/bench/score.ts` và phần chấm trong `baseline.run.ts` được thay bằng các hàm ở `src/shared/algorithms/`.

Không thuộc change này: metric học sẵn (COMET, MetricX: T2, tùy chọn, cần Python và rà giấy phép); giao diện trong app; chạy Bộ đo trong `check.mjs` hay CI; thay đổi đường dịch của app (thuộc module Lõi dịch); fixture truyện mạng tiếng Trung hiện đại (cần chủ sản phẩm cung cấp).

## Capabilities

### New Capabilities

- `measure-fixtures`: định dạng và kiểm tra bộ chương mẫu dùng để đo: tác phẩm, chương, glossary, ma trận xưng hô, quy tắc viết tay, bản tham chiếu; tách công khai và riêng tư; ghi nguồn và quyền.
- `translation-checks`: kiểm tất định (T0) trên một bản dịch so với nguồn: đếm và ghép đoạn theo nội dung, chữ và dấu câu nguồn còn sót, ngoặc thoại, kiểu thoại, độ dài, lặp vòng, tuân thủ glossary, quy tắc viết tay. Hàm thuần, không gọi mạng; module QA dùng lại.
- `translation-judging`: chấm so cặp mù bằng LLM (T1) và bằng người (T3), mức nhiễu A/A, đồng thuận judge–người.
- `measure-runs`: chạy thí nghiệm dịch trên fixture qua đúng đường của app, ghi hồ sơ tái hiện, chấm lại không gọi API, so hai lượt theo quy tắc E6; không bao giờ chạy trong `check.mjs`, không để khóa lọt ra tệp.

### Modified Capabilities

Không có. Change này không đổi hành vi của app: đường dịch, kho, IPC và giao diện giữ nguyên.

## Impact

- **Mã:**
  - Mới: `src/shared/algorithms/translationChecks.ts` và `src/shared/algorithms/paragraphAlign.ts` (hàm thuần, có test); `src/shared/contracts/fixture.ts` (schema valibot).
  - Viết lại công cụ dưới `scripts/bench/`: nạp fixture, lệnh chạy, judge, trang chấm người, lệnh so E6. Vẫn chạy bằng config vitest riêng để dùng được mã TypeScript của app.
  - Gỡ `scripts/bench/score.ts`.
- **Không đổi:** schema `.mira`/`library.db`, kênh IPC, renderer, prompt dịch của app.
- **Phụ thuộc:** không thêm gói npm. T1 cần khóa API của một hãng khác họ với model dịch (OpenAI, DeepSeek hoặc OpenRouter), đọc từ `.env`. Thiếu khóa thì T1 được bỏ qua và báo rõ, các phần khác vẫn chạy.
- **Dữ liệu:** kết quả chạy và bản dịch ở `fixtures/private/runs/` (bị ignore). Phần công khai của fixture (Wikisource, WMT24++ Apache-2.0) đã có trong repo.
- **Tài liệu:** [chất lượng dịch](../../../docs/handbook/research/translation-quality.md) (kết quả T1/T3, V14), [lộ trình](../../../docs/handbook/delivery/roadmap.md) (module Bộ đo), [kế hoạch kiểm chứng](../../../docs/handbook/delivery/validation.md) (V14, V16, V17), [hiện trạng](../../../docs/handbook/engineering/current-state.md), `fixtures/README.md`.
- **Chi phí khi chạy:** một thí nghiệm hai điều kiện trên 8 chương × 3 lần cộng judge hai chiều ước 2–8 USD (E8); người chấm 1–2 giờ.
