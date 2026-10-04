## Context

Động cơ của change: xem `proposal.md`, mục Why. Hiện trạng liên quan:

- **Công cụ tạm `scripts/bench/`** (commit `d7954e6`, `720f655`, `c10b8dd`):
  - `baseline.run.ts` dịch fixture qua đúng đường của app (`normalizeRaw` → `segment` → `translator.plan` → `runBatch` → gateway thật), thay system prompt ở lớp `fetch`, đặt mức thinking qua cài đặt mục model;
  - `score.ts` chứa T0 nhưng không có test;
  - `rescore.run.ts` chấm lại bản dịch đã lưu.

  Các tệp chạy bằng `scripts/bench/vitest.config.mjs`, vì Node không tự giải được import không đuôi của mã app; vitest (qua vite) thì giải được.
- **Fixture** ở `fixtures/` (commit `4ff6fd5`, `71112d3`): 3 tác phẩm công khai, 1 tác phẩm riêng tư (bị ignore). Bộ kiểm chéo hiện chỉ là script trong scratchpad của phiên, không nằm trong repo.
- **Luật ranh giới:**
  - `src/shared/` không được import `node:*` hay `electron` (lint ép);
  - eslint bỏ qua `scripts/`; typecheck chỉ nhìn `src/`;
  - `check.mjs` chạy `src/**/*.test.ts` và **so tổng số test với một số mốc ghi trong script**, nên thêm test là phải nâng mốc.
- **Kết quả đã có:** B1, B2a, và B3 (tắt thinking, đang chạy lúc viết). Nghiên cứu nền: E1–E7 ở `docs/handbook/research/translation-quality.md`.

## Goals / Non-Goals

**Goals:**
- T0 thành hàm thuần có test, dùng lại được cho module QA mà không phải viết lại.
- Ghép đoạn đúng cả khi số đoạn bằng nhau nhưng các đoạn đã trượt vị trí: lỗi đã thấy thật ở B2a.
- T1 và T3 đủ để áp quy tắc E6 cho thí nghiệm kế tiếp của module Lõi dịch.
- Mọi lần chạy cũ chấm lại được bằng bộ kiểm mới.

**Non-Goals:**
- Chạy Bộ đo không cần mã TypeScript của app (ví dụ một CLI biên dịch sẵn): chưa cần, vì người chạy là nhà phát triển trong repo.
- Ghép đoạn cho sản phẩm. Phép ghép ở đây chỉ dùng để đo: không lưu, không hiện trong editor. Nó **không** mở lại căn chỉnh offline mà ADR-005 đã hủy.
- Song song hóa lời gọi dịch: lần chạy giữ tuần tự như vòng lặp lô của app, để chi phí và thời gian đo được giống thật.

## Decisions

### D1. T0 vào `src/shared/algorithms/`, phần đọc tệp ở lại `scripts/bench/`

- **Hàm thuần**, vào `src/shared/algorithms/` và có test trong `check.mjs`:
  - `paragraphAlign.ts`: ghép đoạn;
  - `translationChecks.ts`: các phép kiểm;
  - `fixtureCheck.ts`: kiểm tra fixture đã nạp (neo quy tắc, glossary có xuất hiện, bản tham chiếu).
- **Schema** của fixture vào `src/shared/contracts/fixture.ts`, viết bằng valibot như các contract khác.
- **Phần đọc tệp, gọi mạng, sinh trang**: ở `scripts/bench/`, vì cần `node:fs` và vì không thuộc app.

*Phương án đã loại:*
- **Để tất cả trong `scripts/bench/`:** không có test trong `check.mjs`, và module QA phải chép lại mã.
- **Đặt T0 trong `src/main/services/`:** QA ở renderer cũng cần các hàm này, mà `shared` là chỗ cả hai phía cùng import được.

### D2. Ghép đoạn bằng quy hoạch động trên độ dài (kiểu Gale–Church), có điểm neo

- **Bead cho phép:** 1–1, 1–0 (sót), 0–1 (dư), 2–1 (gộp), 1–2 (tách).
- **Chi phí của một bead:** độ lệch giữa tỷ lệ độ dài thực và tỷ lệ kỳ vọng của ngôn ngữ nguồn (trung vị ở bảng Quan sát 1.3: VI/ZH 2,44; VI/JA 1,74; VI/EN 0,99), chuẩn hóa theo độ dài, cộng một phạt cố định cho mỗi bead khác 1–1.
- **Điểm neo:** con số, tên Latinh, ký hiệu ngắt cảnh (＊, ◇) và các mục glossary đã khớp. Khi hai bên cùng có một điểm neo, chi phí của cặp đó giảm. Điều này cần cho các dòng thoại rất ngắn như 「え」, nơi chỉ độ dài thì không đủ để phân biệt.
- **Thứ tự hòa:** cố định (ưu tiên 1–1, rồi sót, rồi dư), nên kết quả tất định.

*Phương án đã loại:*
- **Ghép theo số đếm** (cách cũ): sai đúng ở ca trượt vị trí.
- **Ghép bằng embedding:** cần model và dependency. ADR-005 đã gỡ model embedding 118 MB khỏi app, và Bộ đo không đáng kéo nó về.
- **Nhờ LLM ghép:** tốn tiền, không tất định, và chính là thứ đang bị đo.

*Kiểm chứng:*
- Test tổng hợp: sót đầu và dư cuối; gộp hai dòng ngắn; tách một dòng.
- Hồi quy trên bản dịch thật: lần chạy B2a chương 03 lần 1, nơi số đoạn bằng nhau mà các đoạn trượt.

### D3. Lệnh chạy là các tệp `*.run.ts` dưới config vitest riêng

Năm lệnh, cùng một cách gọi `node_modules/.bin/vitest run --config scripts/bench/vitest.config.mjs scripts/bench/<lệnh>.run.ts`, tham số qua biến môi trường:

| Lệnh | Việc |
| --- | --- |
| `translate.run.ts` | dịch theo một điều kiện (đổi tên từ `baseline.run.ts`) |
| `rescore.run.ts` | chấm lại một lần chạy đã lưu |
| `judge.run.ts` | T1: giám khảo LLM so hai lần chạy |
| `rate.run.ts` | T3: sinh trang chấm người, và nhập kết quả chấm |
| `compare.run.ts` | áp quy tắc E6 cho hai lần chạy |

*Phương án đã loại:*
- **`tsx` hoặc `ts-node`:** thêm dependency chỉ để chạy script.
- **Thêm lệnh vào app:** kéo giao diện và IPC vào một công cụ của nhà phát triển.
- **Biên dịch riêng bằng electron-vite:** nặng, và không cần.

### D4. Giám khảo đi qua transport và gateway của app

- Giám khảo dùng một kết nối riêng, dựng từ biến môi trường `MIRA_JUDGE_BASE_URL`, `MIRA_JUDGE_KEY`, `MIRA_JUDGE_MODEL`, và gọi qua transport cùng gateway của app. Nhờ vậy có sẵn thử lại theo `Retry-After`, che khóa trong lỗi, `usage` chuẩn hóa, và RPM.
- Giám khảo là một lượt gọi không stream, đòi đầu ra JSON. Phần parse khoan dung: gỡ hàng rào ``` và chấp nhận xuống dòng thô trong chuỗi.
- **Prompt giám khảo viết bằng tiếng Anh**, mô tả tiêu chí cho đích tiếng Việt; mã băm của nó được ghi vào hồ sơ. Lý do: giám khảo có thể là bất kỳ hãng nào. Nghiên cứu (Lai & Li) thấy ngôn ngữ viết prompt gần như không ảnh hưởng, còn tiếng Anh là ngôn ngữ mọi hãng mạnh nhất. Prompt tự viết, không chép GEMBA (giấy phép CC BY-SA).
- **Đầu vào:** cả chương; các cặp đã ghép được đánh số `[n]`; ma trận xưng hô nếu có.
- **Đầu ra:** `{"paragraphs":[{"n":1,"verdict":"A|B|tie","errors":[{"side":"A|B","severity":"major|minor","category":"meaning|fluency|address|style"}]}]}`.
- **Họ model:** xác định bằng bảng tiền tố có thể khai báo. Ví dụ `gemini-`, `gemma-` → google; `gpt-`, `o1`/`o3`/`o4` → openai; `claude-` → anthropic; `deepseek-` → deepseek; `qwen` → alibaba; dạng `vendor/model` của OpenRouter → `vendor`.

*Phương án đã loại:*
- **Gọi API của hãng bằng SDK riêng:** trái ADR-004 (một adapter tương thích OpenAI), và mất phần thử lại cùng che khóa.
- **Chấm từng đoạn một lượt gọi:** đắt gấp nhiều lần, và giám khảo mất ngữ cảnh chương.

### D5. Người chấm dùng một trang HTML tĩnh sinh ra trong thư mục của lần chạy

- `rate.run.ts` sinh `rating-<nhãn>.html`, nhúng sẵn dữ liệu đã xáo và gắn nhãn trung tính, cùng `rating-<nhãn>.key.json` chứa bảng ánh xạ nhãn về điều kiện và hạt giống ngẫu nhiên. Cả hai nằm trong `fixtures/private/runs/`, nơi bị ignore.
- Trang mở bằng trình duyệt từ đĩa, không cần mạng. Lựa chọn được giữ trong `localStorage` để đóng mở không mất. Nút "Xuất kết quả" tải về `rating-<nhãn>.answers.json`.
- `rate.run.ts` ở chế độ nhập đọc tệp kết quả cùng tệp ánh xạ, rồi ghi phần T3 vào báo cáo.
- **Mẫu:** lấy ngẫu nhiên bằng PRNG có hạt giống. Chỉ lấy cặp 1–1 có đoạn nguồn từ 20 ký tự trở lên, phân tầng theo chương.

*Phương án đã loại:*
- **Bảng tính CSV:** khó che tên điều kiện, khó đọc đoạn dài.
- **Chấm ngay trong terminal:** không đọc nổi đoạn văn dài.
- **Màn trong app:** ngoài phạm vi, và trộn công cụ đo vào sản phẩm.

### D6. Quy tắc E6 và thống kê

- **Tỷ lệ thắng** = thắng / (thắng + thua), bỏ ngang.
- **Khoảng tin cậy 95%:** bootstrap theo chương, 2.000 lần lấy mẫu lại với hạt giống cố định, nên kết quả tất định; lấy phân vị 2,5 và 97,5.
- **Kiểm tất định "không xấu đi":** tổng số sót + dư + gộp + tách không tăng, và tỷ lệ glossary đúng chặt không giảm quá 1 điểm phần trăm (dung sai cho nhiễu).
- **Ngưỡng 50 đoạn không ngang:** lấy từ bảng power (tỷ lệ thắng thật 0,70 cần khoảng 49 cặp).
- **Lệnh so in cả số liệu cấu thành**, không chỉ kết luận.

*Phương án đã loại:* sign test trên đoạn. Các đoạn trong một chương tương quan nhau, nên sign test cho khoảng tin cậy hẹp giả.

### D7. Mốc số test của `check.mjs`

Test mới của `src/shared/algorithms/` làm tổng số test tăng. `check.mjs` coi số test khác mốc là thất bại, nên change này nâng mốc trong `scripts/check.mjs` cùng commit với test, như commit `a757470` đã làm.

### D8. Đơn vị gửi đi theo app, không theo Bộ đo

- Lệnh dịch luôn dùng đường dịch hiện tại của app. Hôm nay đơn vị là câu; khi module Lõi dịch đổi sang đoạn, Bộ đo tự đo đường mới mà không phải sửa.
- Phép ghép đoạn (D2) vẫn cần ngay cả khi đã đổi sang đoạn, vì model có thể tự chèn xuống dòng trong một đoạn dịch.

### D9. V14 và Q3

- Change này ghi kết quả V14 từ dữ liệu đã có (B1, B2a, B3), theo hai câu hỏi:
  - định nghĩa đoạn có cho số đoạn nguồn ổn định không;
  - những chỗ lệch là do định nghĩa hay do model.
- Số liệu B1 cho thấy mọi chỗ lệch đều do model (gộp câu, chèn xuống dòng). Định nghĩa cũ (cụm dòng ngăn bởi dòng trống) thì sẽ gộp 95 trên 381 dòng của 5 chương tiếng Nhật.
- Kết luận đóng hay mở lại Q3 vẫn là của chủ sản phẩm. Change này chỉ trình số liệu và đề xuất.

## Risks / Trade-offs

- **[Giám khảo kém ở tiếng Việt]** Chưa có nghiên cứu nào kiểm giám khảo LLM cho văn học tiếng Việt. → Đo A/A và đồng thuận với người trước khi đặt ngưỡng tin; dùng hai giám khảo khác họ khi có khóa.
- **[Ghép sai ở dòng thoại rất ngắn]** Độ dài gần như không mang thông tin với 「え」, 「あっ」. → Dùng điểm neo (D2); báo số cặp ghép có độ tin thấp; kiểm bằng tay trên các chương nhiều thoại của fixture.
- **[Ít chương nên khoảng tin cậy rộng]** 8 chương cho bootstrap thô, nhiều thí nghiệm sẽ ra "chưa đủ dữ liệu". → Đây là kết quả trung thực, không phải lỗi; tăng số chương fixture (đặc biệt truyện mạng tiếng Trung hiện đại) là cách đúng.
- **[Kết quả trên fixture riêng tư không tái hiện ở máy khác]** → Phần công khai luôn chạy được; báo cáo ghi rõ đã dùng tác phẩm nào.
- **[Hạn mức free tier]** Một lần chạy đầy đủ cộng giám khảo hai chiều có thể chạm hạn mức theo ngày. → Lỗi được ghi theo chương và lần chạy tiếp tục; có bộ lọc tác phẩm và số lần lặp để chạy nhỏ hơn.
- **[Giám khảo đắt]** → Chấm theo chương (một lượt gọi mỗi chiều mỗi chương), không theo đoạn; `usage` của giám khảo ghi riêng.

## Migration Plan

1. Thêm các hàm thuần, schema và test; nâng mốc test của `check.mjs`.
2. Đổi `baseline.run.ts` thành `translate.run.ts` dùng các hàm mới; gỡ `score.ts`.
3. `rescore.run.ts` dùng các hàm mới, rồi chấm lại B1, B2a, B3 để có số theo phép ghép mới.
4. Thêm `judge.run.ts`, `rate.run.ts`, `compare.run.ts`.

Không có dữ liệu người dùng nào bị ảnh hưởng; lùi lại là revert các commit.

## Open Questions

- **Giám khảo dùng hãng nào:** phụ thuộc khóa chủ sản phẩm có (OpenAI, DeepSeek hay OpenRouter). Không đổi spec hay cách làm; thiếu khóa thì phần T1 nghiệm thu bằng giám khảo giả và chờ khóa cho lần chạy thật.
- **Hệ số phạt và trọng số điểm neo của D2:** chỉnh bằng các bản dịch đã lưu; không đổi spec.
- **Băng độ dài:** hiệu chỉnh lại khi có bản dịch đã duyệt (B8 của nghiên cứu).
