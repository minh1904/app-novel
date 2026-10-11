## Context

Translation core có structured segments/revision và Context snapshot, nhưng task cần contract riêng để
phân biệt output nhận được, output commit được và chất lượng cần review. Change này thêm validator/finding,
không viết lại translator.

## Goals / Non-Goals

**Goals:** chặn batch cấu trúc sai, completion dựa trên commit, findings nhất quán có provenance và QA
progress riêng.

**Non-Goals:** không auto-polish, tự sửa target, metric văn học tuyệt đối, model judge bắt buộc hoặc benchmark
thay thế module measurement.

## Decisions

### Hai tầng kiểm

1. **Pre-commit structural gate:** schema, task/item/attempt, revisions/versions, exact segment manifest,
   unique IDs, required non-empty policy và size. Blocker; không commit payload sai.
2. **Post-commit domain QA:** glossary/name/addressing/coverage heuristics trên revision đã commit. Tạo
   findings; rule bắt buộc có thể làm needs_attention, warning không rollback commit.

Không chạy model để làm việc deterministic. Optional model review là phase/request riêng, default tắt,
có provider/usage/budget/provenance và không được dùng ngầm cho external task.

### Validator input là manifest bất biến

Runner tạo manifest từ source snapshot: segment ID/order/source hash và output constraints. Provider/external
client phải echo IDs. Validator không suy đoạn theo position khi ID thiếu. Cùng manifest/version + output
digest cho kết quả deterministic, dễ retry/test.

### Finding model nhỏ và có lifecycle

Library DB giữ index/tổng hợp theo task; work DB hoặc owner QA giữ evidence gắn chapter/segment/revision để
không đưa text dài vào library. Logical fields: id, task/item, ruleCode/version, severity, target, expected,
observed/evidence ref, checkedRev, state, actor/reason/timestamps, dedupe key.

Rule catalog ban đầu:

- blocker: missing/duplicate/unknown segment, stale revision/version, output vượt limit;
- warning/error configurable: approved glossary mismatch, proper-name variants, addressing mismatch khi đủ
  rule, suspicious source/target coverage.

Rule version nằm trong finding để rerun không viết lại lịch sử. Dedupe key gồm rule/version/target/revision.

### Completion semantics

Item translation completed sau structural gate + commit. Nếu required post-commit checks là gate sản phẩm,
item/task có phase `checking` rồi `completed|needs_attention`; không đổi operation commit thành failed.
Task summary tách translated count, checked count, blockers/open warnings. Partial/skipped không bị gom vào
completed. Undo làm findings trên revision cũ stale; không tự retranslate.

### Review và sửa là operation riêng

Finding action:

- dismiss: state/audit only;
- accept: xác nhận warning chấp nhận, không sửa text;
- fix: mở editor hoặc tạo explicit edit operation trong change/capability khác;
- rerun: đọc revision mới và upsert/close theo rule.

Không cho QA component ghi target trực tiếp. Điều này giữ Undo/revision/write lease ở một đường.

### UI

Jobs detail có phase/progress QA và filter blocker/warning/resolved. Finding row có rule label, evidence,
expected/observed, Mở đoạn, Dismiss/Review. Màu không là tín hiệu duy nhất. Summary không dùng “đúng 100%”.

## Risks / Trade-offs

- **False positive domain rule** → warning + dismiss reason, đo precision trước nâng thành blocker.
- **Evidence text lớn** → lưu reference/snippet có limit, đọc full target on demand.
- **QA làm task trông chậm** → progress phase riêng; deterministic checks theo item sau commit.
- **Optional model judge tốn tiền** → default off, request/budget riêng và nguồn inference rõ.

## Migration Plan

1. Viết pure structural validator và fixtures lỗi trước khi thay completion gate.
2. Thêm finding storage/rule catalog + schema snapshots.
3. Nối post-commit phase với glossary/addressing resolver versions.
4. Nối UI review/navigation và stale-after-edit/Undo.
5. Gate với corpus fixture có known positives/negatives; ghi false-positive rate, không chỉ test happy path.

Rollback giữ structural gate tối thiểu; tắt rule domain gây nhiễu theo version, không xóa findings/audit.

## References

- Structured output trial và measurement module là nguồn fixture; durability/idempotency tham khảo tại
  [`agent-spec-program.md`](../../../docs/modules/proposals/agent-spec-program.md).
