> Kiểm tra bằng `node scripts/check.mjs`. Không dùng `pnpm test/lint/typecheck`: pnpm toàn cục mới hơn bản ghim có thể thoát mã 0 mà không chạy gì. Mỗi nhóm thêm test ở `src/` thì nâng `BASELINE_TESTS` trong `scripts/check.mjs` **trong cùng commit** (design D7). Lệnh Bộ đo chạy bằng `node_modules/.bin/vitest run --config scripts/bench/vitest.config.mjs scripts/bench/<lệnh>.run.ts`.

## 1. Fixture: schema và kiểm tra

- [ ] 1.1 `src/shared/contracts/fixture.ts`: schema valibot cho `work.json`, `glossary.json` (gồm trạng thái duyệt), `pronouns.json`, `meta.json`, `assertions.json` theo spec `measure-fixtures`. Kiểm: test nhận đúng 4 tác phẩm hiện có trong `fixtures/` (đọc bằng fixture tối giản dựng trong test, không đọc thư mục thật); từ chối ngôn ngữ `ko`, thiếu trường quyền sử dụng ở tác phẩm công khai, `decision` sai kiểu.
- [ ] 1.2 `src/shared/algorithms/fixtureCheck.ts`: hàm thuần nhận tác phẩm đã nạp và trả danh sách vấn đề:
  - đoạn nguồn theo ADR-005, chuẩn hóa CRLF; dòng chỉ có U+3000 là trống;
  - neo quy tắc phải khớp đúng một đoạn (`where`) hoặc bằng đúng một đoạn (`line`);
  - `pair` phải có trong ma trận;
  - mục glossary phải xuất hiện (khớp dài trước, không phân biệt hoa thường với nguồn tiếng Anh);
  - bản tham chiếu phải cùng số đoạn.

  Kiểm: test cho mỗi kịch bản của spec `measure-fixtures`, gồm ca "シュテルンハイム chỉ nằm trong tên đầy đủ", ca "YISINI in hoa" và ca CRLF so với LF.
- [ ] 1.3 `scripts/bench/fixtures.ts`: đọc thư mục `fixtures/public` và `fixtures/private` (thiếu thì bỏ qua), parse bằng schema 1.1, kiểm bằng 1.2, trả tác phẩm cùng danh sách đã dùng. Kiểm: chạy `rescore.run.ts` trên một bản checkout không có `fixtures/private/` thì chạy được, và báo cáo chỉ liệt kê 3 tác phẩm công khai.
- [ ] 1.4 Nâng `BASELINE_TESTS` cho các test của 1.1–1.2. Kiểm: `node scripts/check.mjs` báo `RESULT: ok`.

## 2. Ghép đoạn theo nội dung

- [ ] 2.1 `src/shared/algorithms/paragraphAlign.ts`: quy hoạch động với các bead 1–1, 1–0, 0–1, 2–1, 1–2; chi phí theo tỷ lệ độ dài kỳ vọng của ngôn ngữ nguồn, cộng phạt cho bead khác 1–1; thứ tự hòa cố định (design D2). Kiểm: test của ba kịch bản ghép trong spec `translation-checks` (không sót không dư; sót ở đầu và tách ở giữa với tổng số đoạn bằng nhau; gộp hai dòng ngắn); test chạy hai lần cho kết quả trùng khít.
- [ ] 2.2 Điểm neo: con số, chữ Latinh viết hoa đầu, ＊/◇, và mục glossary đã khớp giảm chi phí khi có ở cả hai bên. Kiểm: test chuỗi thoại ngắn kiểu 「え」/「あっ」 xen dòng dài, chỉ ghép đúng khi có điểm neo; test không neo vẫn trả kết quả hợp lệ.
- [ ] 2.3 Hồi quy trên bản dịch thật: dùng lần chạy B2a chương 03 lần 1 (99/99 đoạn, trượt từ đoạn 3) ở `fixtures/private/runs/`, xác nhận phép ghép báo một sót ở đoạn 3 và một tách, đoạn 4–59 ghép đúng. Đây là kiểm bằng tay vì fixture riêng tư không có ở CI. Kiểm: ghi kết quả vào `design.md` mục "Kiểm chứng D2".

## 3. Kiểm tất định T0

- [ ] 3.1 `src/shared/algorithms/translationChecks.ts`: đếm cấu trúc từ kết quả ghép; chữ nguồn, 「」『』 và 、。！？：；， còn sót (miễn ＊◇―, miễn đoạn có chuỗi miễn kiểm); ngoặc không cân với các loại “”, 「」, 『』, «», `"`; kiểu thoại năm loại; độ dài bất thường theo băng chỉnh được; lặp vòng. Kiểm: test mỗi kịch bản của spec `translation-checks` cho các mục này.
- [ ] 3.2 Tuân thủ glossary theo cặp đã ghép: đúng chặt, chấp nhận được, term cấm trọn từ, so khớp NFC và gộp hai kiểu đặt dấu thanh; lần xuất hiện ở đoạn bị sót tính là sai. Kiểm: test ca "hoà/hòa", "dì/dìu", "núi Hoa Quả / Hoa Quả Sơn", đoạn bị sót.
- [ ] 3.3 Quy tắc viết tay: đạt, trượt (có lý do), chấm tay; đoạn neo bị sót thì trượt với lý do "đoạn bị sót". Kiểm: test ca "mợ/dì" và ca quy tắc chỉ có ghi chú.
- [ ] 3.4 Nâng `BASELINE_TESTS` cho test của nhóm 2–3. Kiểm: `node scripts/check.mjs` báo `RESULT: ok`.

## 4. Lệnh dịch và chấm lại

- [ ] 4.1 Đổi `scripts/bench/baseline.run.ts` thành `translate.run.ts`, dùng fixture từ 1.3 và T0 từ nhóm 2–3. Giữ: thay system prompt (thất bại nếu không yêu cầu nào được thay), mức thinking, ghi tham số thật đã gửi. Thêm vào hồ sơ: mã băm prompt, trạng thái duyệt glossary, danh sách tác phẩm đã dùng. Gỡ `scripts/bench/score.ts`. Kiểm: chạy `MIRA_BENCH_ONLY=kongyiji MIRA_BENCH_REPEATS=1`; hồ sơ có đủ trường theo spec `measure-runs`, mục "Hồ sơ tái hiện".
- [ ] 4.2 Bảng tổng hợp không chứa văn bản truyện: chỉ số đo, tên chương, nhãn. Kiểm: tìm trong `report.md` của một lần chạy fixture riêng tư mọi đoạn nguồn dài từ 10 ký tự trở lên, không ra kết quả nào.
- [ ] 4.3 `rescore.run.ts` dùng T0 mới, giữ `usage`, thời gian và lỗi gốc, ghi `rescore.json` cạnh bản gốc. Kiểm: chấm lại B1, B2a, B3; không có lời gọi mạng nào (fetch giả ném lỗi nếu bị gọi).
- [ ] 4.4 Kiểm khóa: mọi lệnh ghi tệp đều từ chối nội dung chứa khóa. Kiểm: test bằng một khóa giả cài vào thông báo lỗi giả, lệnh dừng và không có tệp nào được ghi.

## 5. Giám khảo LLM (T1)

- [ ] 5.1 Bảng họ model (tiền tố, và `vendor/` của OpenRouter) cùng luật "giám khảo khác họ": dừng khi trùng họ, trừ khi có cờ bỏ qua và báo cáo ghi lại. Kiểm: test ca Gemini dịch, Gemini chấm; ca hai họ dịch khác nhau đòi họ thứ ba.
- [ ] 5.2 Prompt giám khảo (tiếng Anh, tự viết) trong `scripts/bench/prompts/judge.txt`, mã băm ghi vào hồ sơ. Đầu vào: chương nguồn, các cặp đã ghép đánh số, ma trận xưng hô. Đầu ra JSON theo design D4, parse khoan dung. Kiểm: test parse với hàng rào ```, xuống dòng thô trong chuỗi, đầu ra hỏng (hỏi lại một lần, rồi "không chấm được").
- [ ] 5.3 `judge.run.ts`: với mỗi chương chung của hai lần chạy và mỗi cặp lần lặp, gọi giám khảo hai chiều qua transport và gateway của app (`MIRA_JUDGE_BASE_URL`, `MIRA_JUDGE_KEY`, `MIRA_JUDGE_MODEL`). Thắng chỉ khi hai chiều nhất quán; đoạn một bên sót báo riêng; ghi `usage` của giám khảo; gắn nhãn A/A khi hai lần chạy cùng điều kiện. Kiểm: chạy với giám khảo giả (transport giả trả kết quả soạn sẵn) cho tỷ lệ thắng, tỷ lệ không nhất quán và nhãn A/A đúng như soạn. Thiếu khóa thì lệnh báo bỏ qua T1, không thất bại.
- [ ] 5.4 **Cần khóa của một hãng khác Gemini.** Chạy A/A trên B1 (ba lần lặp của cùng điều kiện so với nhau), ghi mức nhiễu vào nghiên cứu chất lượng dịch. Kiểm: báo cáo có tỷ lệ thắng kèm khoảng tin cậy, gắn nhãn A/A. Nếu chưa có khóa, ghi task là chờ.

## 6. Người chấm (T3)

- [ ] 6.1 `rate.run.ts` chế độ sinh trang: lấy mẫu có hạt giống, phân tầng theo chương, chỉ cặp 1–1 có nguồn từ 20 ký tự; xáo thứ tự A/B cho từng đoạn. Ghi `rating-<nhãn>.html` (dữ liệu nhúng, không cần mạng, lưu lựa chọn trong `localStorage`, nút xuất kết quả) và `rating-<nhãn>.key.json`. Kiểm: trang mở được từ đĩa khi không có mạng; tìm trong HTML không thấy nhãn điều kiện, tên model hay tên tệp prompt.
- [ ] 6.2 `rate.run.ts` chế độ nhập: đọc kết quả xuất cùng tệp ánh xạ, ánh xạ về điều kiện; đoạn bị T0 gắn cờ hay bị giám khảo hai chiều không nhất quán được liệt kê riêng, không tính vào tỷ lệ thắng. Kiểm: test với một bộ kết quả soạn sẵn đã xáo thứ tự cho tỷ lệ đúng như soạn.
- [ ] 6.3 Đồng thuận giám khảo–người: tỷ lệ đồng ý và kappa trên các đoạn chấm chung; dưới 50 đoạn thì gắn nhãn "chưa đủ để đặt ngưỡng". Kiểm: test số liệu soạn sẵn với kappa tính tay.

## 7. So hai lần chạy (E6)

- [ ] 7.1 `compare.run.ts`: chỉ so trên chương chung (ghi rõ), từ chối khi không có chương chung hoặc khác cấu hình giám khảo; T0 "không xấu đi" theo design D6; bootstrap theo chương, 2.000 lần, hạt giống cố định; ngưỡng 50 đoạn không ngang; kết luận một trong ba nhãn, kèm số liệu cấu thành. Kiểm: test với số liệu soạn sẵn cho đủ ba kết luận; chạy thật trên B2a so với B1 ra **không giữ** với lý do kiểm tất định xấu đi.
- [ ] 7.2 Chạy so B3 (tắt thinking) với B1 trên 8 chương, phần T0. Có khóa giám khảo thì thêm T1. Kiểm: kết luận và số liệu ghi vào nghiên cứu chất lượng dịch.

## 8. V14, tài liệu và dọn dẹp

- [ ] 8.1 Ghi kết quả V14 vào [kế hoạch kiểm chứng](../../../docs/handbook/delivery/validation.md) và nghiên cứu chất lượng dịch: số đoạn nguồn theo định nghĩa ADR-005 trên cả 8 chương; nguyên nhân từng chỗ lệch (định nghĩa hay model); so với định nghĩa cũ. Kiểm: bảng có đủ 8 chương và câu đề xuất về Q3 cho chủ sản phẩm.
- [ ] 8.2 Hỏi chủ sản phẩm đóng Q3 của ADR-005 theo số liệu 8.1. Kiểm: câu trả lời ghi vào `open-questions.md` (và ADR-005 nếu bác bỏ).
- [ ] 8.3 Cập nhật `fixtures/README.md` (lệnh mới, trạng thái duyệt), [hiện trạng](../../../docs/handbook/engineering/current-state.md) (Bộ đo thay công cụ tạm), [lộ trình](../../../docs/handbook/delivery/roadmap.md) (module Bộ đo: điều kiện qua), nhật ký. Kiểm: kiểm liên kết tương đối của các trang đã sửa không báo hỏng.
- [ ] 8.4 Chạy `node scripts/check.mjs --build`. Kiểm: `RESULT: ok`; ghi số test vào nhật ký.
