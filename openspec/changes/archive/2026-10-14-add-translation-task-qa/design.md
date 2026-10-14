## Context

Những gì đã có và change này dùng lại:

- Đối chiếu cấu trúc: `reconcileTempItems` loại ID lạ, giữ bản đầu khi trùng, coi rỗng hoặc chép nguyên nguồn là
  thiếu ([translateReconcile.ts:93-112](../../../src/shared/translation/translateReconcile.ts#L93-L112));
  `translationCore` hỏi lại đúng các ID thiếu một lần
  ([translationCore.ts:282-305](../../../src/main/services/ai/translate/translationCore.ts#L282-L305)) và trả
  `failedIds` gồm thiếu, bị chặn, hết ngân sách
  ([translationCore.ts:346](../../../src/main/services/ai/translate/translationCore.ts#L346)). Luật “item
  completed khi mọi đoạn nguồn không rỗng có target đã commit; `refusedIds` → `failed(reason=refused)`” do
  `add-durable-translation-tasks` sở hữu. Change này không thêm cổng nào trước commit.
- Kiểm glossary: `evaluateGlossaryCompliance` trả `forbidden_used` và `missing_target`
  ([glossaryCompliance.ts:16-73](../../../src/shared/context/glossaryCompliance.ts#L16-L73)). Đường IPC hiện có
  `GlossaryService.checkCompliance` đọc glossary hiện hành
  ([glossaryService.ts:146-155](../../../src/main/services/context/glossaryService.ts#L146-L155)), không dùng cho
  task.
- Kiểm xưng hô: `evaluateAddressingCompliance`
  ([addressingCompliance.ts:97](../../../src/shared/context/addressingCompliance.ts#L97)) đoán cặp liên quan khi
  không có người nói rõ: tên hai nhân vật cùng xuất hiện, hoặc tên người nói kèm động từ dẫn thoại
  ([addressingCompliance.ts:129-139](../../../src/shared/context/addressingCompliance.ts#L129-L139)). Đây là
  heuristic nên chỉ cảnh báo.
- Kiểm văn bản: `checkResidualSourceChars`, `checkUnbalancedQuotes`, `checkLengthOutliers`, `checkRepetitions`
  ([translationChecks.ts:159-386](../../../src/shared/translation/translationChecks.ts#L159-L386)).
- Module chất lượng: checker không chặn lưu/xuất hay sửa văn bản; dài hơn nguyên tác không tự là lỗi, CJK sót có
  thể là mục giữ nguyên
  ([quality-and-evaluation.md](../../../docs/modules/context/quality-and-evaluation.md)).

## Goals / Non-Goals

**Goals:** cảnh báo nhất quán với bản chụp item đã dịch; không đổi trạng thái; dismiss bền và tự hết hiệu lực khi
target đổi; số cảnh báo mở trong tổng kết task.

**Non-Goals:**

- Cổng cấu trúc mới hay validator manifest riêng (đã có reconcile + repair).
- Luật biến thể tên riêng: alias chỉ có ở phía nguồn
  ([contextMatching.ts:76](../../../src/shared/context/contextMatching.ts#L76)), chưa có dữ liệu biến thể đích.
- Review bằng model, phase `checking`, tiến độ QA, bảng finding có vòng đời `open/accepted/resolved`.
- Severity blocker/error, chặn hoàn tất, tự sửa hoặc auto-polish.

## Decisions

### Tính khi đọc, không lưu finding

Một hàm thuần `evaluateTaskItem(snapshot, segments)` nhận bản chụp của item (`run_key` → `translate_run_context`)
và các cặp nguồn–đích hiện tại của chương theo segment ID, trả danh sách finding. Service main đọc dữ liệu, gọi
hàm, rồi lọc bỏ finding khớp quyết định dismiss. Không lưu finding nên không có bài toán dedupe, stale hay viết lại
lịch sử: target đổi thì lần đọc sau tự ra kết quả mới.

Đoạn khớp 1–1 theo segment ID nên các hàm dùng `Bead` nhận bead `1-1` dựng từ thứ tự segment. Item chưa có target
nào thì không kiểm.

LinguaGacha làm tương tự: một evaluator thuần cho từng mục, mọi mã đều là cảnh báo
([proofreading-evaluator.ts:170-182](https://github.com/neavo/LinguaGacha/blob/1456d894144459276ee151fee953707bfd84dc37/src/shared/proofreading/proofreading-evaluator.ts#L170-L182),
[proofreading-types.ts:9-16](https://github.com/neavo/LinguaGacha/blob/1456d894144459276ee151fee953707bfd84dc37/src/shared/proofreading/proofreading-types.ts#L9-L16)).

### Bộ luật MVP, tất cả là cảnh báo

| ruleCode | Nguồn | Ghi chú |
| --- | --- | --- |
| `glossary.forbidden_used` | `evaluateGlossaryCompliance` | mục cấm trong bản chụp |
| `glossary.missing_target` | `evaluateGlossaryCompliance` | mục đã duyệt khớp nguồn nhưng thiếu ở đích |
| `addressing.unexpected_pronoun`, `addressing.inconsistent_pair` | `evaluateAddressingCompliance` | dyads + nhân vật của bản chụp; heuristic |
| `text.residual_source` | `checkResidualSourceChars` | `exemptWhere` = nguồn của mục glossary có đích giữ chữ gốc; đoạn chứa mục đó được miễn |
| `text.length_ratio` | `checkLengthOutliers` | chỉ là tín hiệu |
| `text.repetition` | `checkRepetitions` | |
| `text.unbalanced_quotes` | `checkUnbalancedQuotes` | |

Mỗi luật có `ruleVersion` là hằng số trong code; đổi logic luật thì tăng version. Finding gồm ruleCode,
ruleVersion, chapterId, segmentId, thông điệp, chuỗi bằng chứng ngắn (term, đại từ, ký tự sót, tỷ lệ).

### Chỉ lưu dismiss

Bảng work DB `qa_dismissal(rule_code, rule_version, chapter_id, segment_id, target_hash, reason, created_at)`,
khóa duy nhất trên năm cột đầu. `target_hash` = sha256 của target đoạn lúc dismiss. Finding bị ẩn khi cả năm cột
khớp. Sửa target, Undo hoặc dịch lại làm hash đổi nên cảnh báo hiện lại nếu vẫn vi phạm; tăng ruleVersion cũng
vậy. Dismiss là ghi work DB nhỏ, không đụng target nên không cần write-intent của task.

Khóa không có entryId: dismiss một `glossary.missing_target` trên một đoạn ẩn mọi `missing_target` của đoạn đó
cho tới khi target đổi. Chấp nhận trong MVP vì một đoạn hiếm khi thiếu hai thuật ngữ cùng lúc.

### Không đổi trạng thái, chỉ đếm

QA không ghi gì vào task/item. Màn Tác vụ khi mở chi tiết task tính finding theo item (lười, item nào hiện ra
thì tính) và hiện tổng số cảnh báo mở. Tổng kết không dùng “đúng 100%”; item không có đoạn nào để kiểm hiện N/A.
Mỗi finding có nút Mở đoạn (mở editor ở chapterId/segmentId) và Bỏ qua (kèm lý do tùy chọn). Màu không là tín
hiệu duy nhất.

## Risks / Trade-offs

- **Báo nhầm xưng hô** → chỉ cảnh báo, có dismiss; đo trên fixture trước khi cân nhắc nâng mức.
- **Task dài tính chậm khi mở** → tính theo item khi hiện; hàm thuần nên dễ cache theo (run_key, hash target) nếu
  cần sau.
- **Bản chụp không có glossary đủ** → kiểm đúng cái item đã gửi model; Context sửa sau không làm cảnh báo cũ đổi.

## Migration Plan

1. Hàm thuần `evaluateTaskItem` + fixture đúng/sai cho từng luật.
2. Migration work DB thêm `qa_dismissal`, schema snapshot test.
3. Service + IPC đọc finding và dismiss.
4. Màn Tác vụ.

Rollback: ẩn phần QA; bảng dismiss giữ nguyên, không ảnh hưởng dịch.
