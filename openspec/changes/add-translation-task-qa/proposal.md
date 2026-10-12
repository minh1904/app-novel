## Why

Task dịch bền xong thì người dùng cần biết chương nào nên xem lại: thuật ngữ bị cấm lọt vào, thuật ngữ đã duyệt
không xuất hiện, xưng hô lệch cặp đã duyệt, chữ gốc còn sót, độ dài bất thường. Các bộ kiểm này đã có trong code
nhưng đọc glossary hiện hành chứ không đọc bản chụp mà item đã dịch, và chưa nối vào task. Module chất lượng đã
chốt rằng checker không được chặn lưu/xuất hay sửa văn bản, nên QA ở đây chỉ là cảnh báo.

## What Changes

- Kiểm miền (glossary, xưng hô, chữ gốc sót, tỷ lệ độ dài, lặp, ngoặc thoại) cho từng item của task bằng các
  evaluator sẵn có, dùng bản chụp Context mà item đã pin, không dùng Context hiện hành.
- Finding được tính khi đọc, không lưu; tất cả là cảnh báo và không bao giờ đổi trạng thái task/item.
- Chỉ lưu quyết định bỏ qua (dismiss) trong work DB: ruleCode, ruleVersion, chapterId, segmentId, hash target,
  lý do. Target đổi thì quyết định cũ không còn khớp.
- Màn Tác vụ hiển thị số cảnh báo đang mở của task và danh sách theo item, mở đúng đoạn trong editor.
- Không thêm cổng cấu trúc mới: thiếu/thừa/trùng/rỗng/chép nguồn đã do `translateReconcile` + lượt hỏi lại xử lý;
  luật hoàn tất item thuộc `add-durable-translation-tasks`.
- Không làm: luật biến thể tên riêng, review bằng model, phase `checking`, thanh tiến độ QA, bảng vòng đời
  finding, tự sửa target.

## Capabilities

### New Capabilities

- `translation-task-quality`: cảnh báo chất lượng tính khi đọc cho item của task dịch bền, và quyết định dismiss.

### Modified Capabilities

Không có.

## Impact

- Phụ thuộc `add-durable-translation-tasks` (item, `run_key` → bản chụp, luật hoàn tất).
- Work DB: một migration thêm bảng dismiss, kèm schema snapshot test.
- Code: service QA ở main gọi evaluator trong `src/shared/context` và `src/shared/translation`; IPC đọc finding
  và dismiss; màn Tác vụ.
