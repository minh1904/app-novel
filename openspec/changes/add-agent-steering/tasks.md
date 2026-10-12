## 1. Snapshot và prompt

- [ ] 1.1 Thêm `instruction?: string` vào `ContextSnapshot` và `TranslatePromptContext`; `takeContextSnapshot` nhận instruction, `promptFromSnapshot` chép sang; test hash snapshot không đổi khi vắng instruction.
- [ ] 1.2 Bộ dựng prompt đặt instruction trong thẻ riêng ở message user, thoát thẻ, tăng `TRANSLATE_PROMPT_VERSION`; test system prompt không đổi giữa hai item khác instruction và request dựng lại từ trace trùng hash.
- [ ] 1.3 Lần chụp so sánh của từng batch dùng instruction đã pin; test steering mới không làm batch báo “Context đổi”.

## 2. Record và validate

- [ ] 2.1 Library v13: bảng `agent_task_steering`, fixture `library-v13.schema.sql`, backup test.
- [ ] 2.2 Lệnh steering trong task runner: validate (task kết thúc/`cancelling`, ngoài scope, mơ hồ, không còn item `queued`), idempotency theo clientCommandId + digest, trả `effectiveFromItem`; test mỗi lý do từ chối không tạo record.
- [ ] 2.3 Pin item chọn instruction hiện hành, chuyển `accepted → applied` cùng transaction; supersede record `accepted` bị thay; test pin trước/sau steering, retry dùng snapshot cũ, Continue sau pause.

## 3. Context

- [ ] 3.1 `context_ref` cho cặp xưng hô: đóng `toChapterId` cặp cũ + thêm cặp mới từ chương E trong một transaction work DB, ID cặp suy từ `(taskId, clientCommandId)`; test không chồng khoảng qua `listDyads`, từ chối khi cặp cũ bắt đầu từ E, gửi lại sau lỗi library, hủy task không hoàn tác.
- [ ] 3.2 Từ chối đổi `thirdPerson` theo chương kèm lý do; test không sửa nhân vật.

## 4. Chat và màn Tác vụ

- [ ] 4.1 Chat capability đọc instruction hiện hành, gửi steering sau khi người dùng xác nhận, trả lời theo `effectiveFromItem`; form tương đương ở màn Tác vụ.
- [ ] 4.2 Màn Tác vụ liệt kê steering (chương yêu cầu, chương áp dụng, loại, trạng thái) và instruction mỗi item đã pin.
- [ ] 4.3 E2E task 10 chương với steering trước/đúng lúc/sau item start và restart; chạy `node scripts/check.mjs`.
