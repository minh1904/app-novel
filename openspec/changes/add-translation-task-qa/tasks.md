## 1. Structural gate

- [ ] 1.1 Xây pure validator cho item/attempt/revision/version/exact segment manifest/size; fixture test missing, duplicate, unknown, stale và valid payload.
- [ ] 1.2 Đặt validator trước transaction commit cho internal/external result; test invalid batch không thay target/journal/progress.
- [ ] 1.3 Đổi completion gate dựa trên committed coverage + required checks; test provider success nhưng conflict/thiếu segment không completed.

## 2. Findings và rules

- [ ] 2.1 Thêm finding storage, rule version, dedupe key và lifecycle audit; kiểm schema snapshot, rerun cùng revision không nhân finding.
- [ ] 2.2 Thêm glossary/proper-name/addressing/coverage rules dùng effective Context snapshot; fixture test true positive, negative và insufficient-context warning.
- [ ] 2.3 Nối stale/resolved behavior sau edit/Undo/recheck; test evidence lịch sử không bị viết lại cho revision mới.
- [ ] 2.4 Nếu thêm optional model review, tách request/budget/source/usage và default off; test external deterministic-only không gọi provider Mira.

## 3. UI và gate lát 6

- [ ] 3.1 Nối QA phase/progress và findings review/open-target/dismiss; test màu không là tín hiệu duy nhất và không có action sửa ngầm.
- [ ] 3.2 Chạy fixture corpus đo false positives/negatives, E2E translated→checking→completed/needs_attention và `node scripts/check.mjs`; ghi rule nào chỉ là warning.
