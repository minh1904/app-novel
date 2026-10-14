## Context

`add-durable-translation-tasks` cho task một danh sách item cố định theo chương; mỗi item pin snapshot Context lần
đầu chuyển `queued → running` qua `agent_task_item.run_key` → `translate_run_context`. Steering chỉ cần chen
vào đúng ranh giới đó: thay đổi nào được ghi trước lúc item pin thì item thấy, ghi sau thì không.

Sự thật trong code hiện tại mà thiết kế dựa vào:

- `TranslatePromptContext` chưa có trường instruction
  ([translatePrompt.ts:56-79](../../../src/main/services/ai/translate/translatePrompt.ts#L56-L79)); snapshot
  chỉ có sourceLang, genre, register, glossary, dyads, characters
  ([contextSnapshot.ts:26-34](../../../src/main/services/ai/translate/contextSnapshot.ts#L26-L34)).
- Cặp xưng hô có `fromChapterId`/`toChapterId`
  ([addressing.ts:37-38](../../../src/shared/contracts/addressing.ts#L37-L38)); `listDyads` lọc theo vị trí
  chương và trả mọi cặp có khoảng chứa chương, không có thứ tự ưu tiên
  ([addressingEntries.ts:426-445](../../../src/main/infra/storage/addressingEntries.ts#L426-L445)). Thêm cặp
  mới từ chương 8 mà không đóng cặp cũ thì chương 8 nhận cả hai.
- `CharacterItem.thirdPerson` là một giá trị cho cả tác phẩm, không có phạm vi chương
  ([addressing.ts:8-21](../../../src/shared/contracts/addressing.ts#L8-L21)).

## Goals / Non-Goals

**Goals:** record bền và idempotent; validate đồng bộ trả điểm hiệu lực thật; instruction đi vào snapshot và
prompt; đổi xưng hô từ chương N không để hai cặp chồng nhau.

**Non-Goals:**

- Bảng version/overlay instruction, `baseVersion`/`resultingVersion`, diff giữa các version.
- Workflow pause item đang chạy rồi hỏi cách xử lý phần đã commit. Muốn đổi item đang chạy thì người dùng
  Cancel/Undo rồi dịch lại; steering không tự làm việc đó.
- Chèn text vào provider stream hoặc giữa các batch của item đang chạy (khác Hermes, xem dưới).
- Tự dịch lại chương đã xong, replace-all theo từ khóa.
- Đổi `thirdPerson` theo chương; đổi glossary hoặc mục Context khác chỉ từ chương N (chỉ cặp xưng hô có phạm vi
  trong MVP).

## Decisions

### Một record nhỏ, không có version

Bảng library `agent_task_steering`:

| Trường | Ý nghĩa |
| --- | --- |
| id, taskId, clientCommandId, digest | idempotency; digest = sha256 của payload chuẩn hóa |
| requestedChapterId | chương người dùng nêu |
| resolvedFromItemId | item đầu tiên thực sự áp dụng |
| kind | `instruction` hoặc `context_ref` |
| instructionText / contextEntryIds | nội dung; `context_ref` lưu ID entry mới và entry bị đóng trong work DB |
| state | `accepted`, `applied`, `superseded` |
| createdAt | thứ tự bền |

Không có trạng thái `rejected`: lệnh bị từ chối không để lại record, giống Update validator của Temporal — từ
chối thì workflow “không có dấu vết là đã từng được yêu cầu”, còn chấp nhận thì vào history; Update ID dùng để
dedupe
([handling-messages.mdx:95, 124-133](https://github.com/temporalio/documentation/blob/e78a13b3d87ef060e404314ac7d4564424d64181/docs/encyclopedia/workflow-message-passing/handling-messages.mdx#L124-L133)).
`clientCommandId` đóng vai Update ID: cùng ID cùng digest trả record cũ, cùng ID khác digest là `conflict`.

### Instruction thay thế toàn bộ, không cộng dồn

Mỗi record `instruction` chứa toàn văn instruction có hiệu lực từ `resolvedFromItem`. Instruction của một item
= text của record `instruction` không `superseded`, tạo muộn nhất, có `resolvedFromItem` ở thứ tự ≤ item; không có
thì item không có instruction. Không cần merge hay replay patch. Chat capability đọc instruction hiện hành để
agent đề xuất toàn văn mới, người dùng xác nhận.

Record A thành `superseded` khi record B tạo sau có điểm hiệu lực ≤ điểm của A trong lúc A vẫn `accepted` (chưa
item nào dùng). A đã `applied` thì giữ `applied`: các item đã pin vẫn chứng minh A đã được dùng.

### Validate đồng bộ trong task runner

Lệnh steering và việc pin item chạy tuần tự trong cùng task runner ở main process, nên mỗi item hoặc pin trước
record (dùng nội dung cũ) hoặc sau (dùng nội dung mới). Bước validate:

1. Task ở trạng thái kết thúc (`cancelling`, `cancelled`, `completed`, `partially_completed`, `failed`) → từ chối.
2. Chương yêu cầu không thuộc task, hoặc không resolve được đúng một chương → từ chối, chat hỏi lại.
3. Tìm item đầu tiên ở hoặc sau chương yêu cầu còn `queued`; không có → từ chối (“không còn chương chưa chạy”).
4. `context_ref` sai luật (dưới) → từ chối kèm lý do.
5. Ghi (work DB trước nếu có, rồi record library) và trả `{ steeringId, effectiveFromItem }`.

Task `paused` hoặc `waiting_user` vẫn nhận steering; Continue sẽ pin item kế tiếp với nội dung mới. Cancel thắng
mọi steering chưa `applied` theo nghĩa đơn giản: item không chạy nữa thì record ở lại `accepted`.

Câu trả lời trong chat dựa trên `effectiveFromItem` thật: “áp dụng từ chương 9 vì chương 8 đang dịch”, không nói
“đã áp từ chương 8”.

### Steering chỉ có hiệu lực ở ranh giới item, không giữa tool

Hermes có ba chế độ khi agent bận — queue, steer, interrupt — cộng `/stop` để hủy; steer chỉ được agent cha
rút ra sau khi tool trả về
([run_busy.py:284-315](https://github.com/NousResearch/hermes-agent/blob/7cc3fb8cb55898747dd1dfa56fda3e16ebba028e/gateway/run_busy.py#L284-L315),
[run_busy.py:1018-1025](https://github.com/NousResearch/hermes-agent/blob/7cc3fb8cb55898747dd1dfa56fda3e16ebba028e/gateway/run_busy.py#L1018-L1025)).
Mira chọn ranh giới thô hơn: item (chương). Batch của item đang chạy ghi target và journal; đổi chỉ dẫn giữa hai
batch sẽ cho một chương hai giọng mà snapshot không thể hiện. Pause/Cancel của durable tasks đóng vai `/stop`.

### Instruction vào snapshot rồi vào prompt

- `ContextSnapshot` thêm `instruction?: string`. Vắng thì JSON chuẩn hóa không đổi, nên hash snapshot của lượt
  dịch thường (không task) giữ nguyên.
- Lúc pin item, task runner vật chất hóa instruction và truyền vào `plan()` → `takeContextSnapshot`; text nằm
  trong `snapshot_json` bất biến. Retry dùng lại `run_key` nên dùng lại instruction cũ.
- Mỗi batch so hash snapshot với kho hiện tại để báo Context đổi; lần chụp so sánh đó nhận cùng instruction đã
  pin, nên steering mới không bị báo nhầm là “Context đổi”.
- `TranslatePromptContext` thêm `instruction`; `promptFromSnapshot` chép sang. Bộ dựng prompt đặt instruction
  trong một thẻ riêng ở message user (không ở system để system prompt của tác phẩm vẫn giống nhau giữa các item),
  thoát thẻ như dữ liệu khác, giới hạn độ dài khi validate. Đổi bộ dựng nên tăng `TRANSLATE_PROMPT_VERSION`.

### `context_ref`: đổi cặp xưng hô từ chương N

Steering kiểu này chỉ chạy khi người dùng xác nhận (form ở màn Tác vụ hoặc thẻ xác nhận trong chat); agent không
tự gửi. Trong một transaction work DB:

1. Gọi E là chương của `resolvedFromItem` (không phải chương yêu cầu, vì item ở đó có thể đã chạy).
2. Với cặp cũ cùng người nói → người nghe có khoảng chứa E: đặt `toChapterId` = chương liền trước E theo vị trí
   trong tác phẩm. Cặp cũ bắt đầu ở hoặc sau E → từ chối (MVP không tách khoảng).
3. Thêm cặp mới `approved` với `fromChapterId = E`, `toChapterId` = giá trị cũ của cặp bị đóng.

ID cặp mới suy từ `(taskId, clientCommandId)` để gửi lại sau lỗi nửa chừng không tạo cặp thứ hai. Sau commit
work DB mới ghi record library. Cancel task không hoàn tác Context đã ghi: đó là quyết định của người dùng về tác
phẩm, có hiệu lực cả ngoài task.

Thêm hoặc sửa mục Context không theo chương (glossary, nhân vật) không cần steering: sửa qua Context panel là đủ,
item kế tiếp tự thấy khi pin snapshot. Steering yêu cầu đổi `thirdPerson` “từ chương N” bị từ chối với lý do
“đại từ ngôi ba chưa có phạm vi chương; sửa cho cả tác phẩm ở Ngữ cảnh”.

### State và UI

- `accepted → applied` trong cùng transaction library pin `run_key` của item đầu tiên dùng record.
- `accepted → superseded` khi record sau thay thế trước lúc được dùng.
- Màn Tác vụ: danh sách steering với chương yêu cầu, chương thực sự áp dụng, loại, trạng thái. Mỗi item hiển thị
  instruction đã pin (đọc từ snapshot). Không làm timeline/diff.

## Risks / Trade-offs

- **Steering đua với item start** → runner tuần tự; test hai thứ tự (pin trước/sau record).
- **Instruction thay thế làm mất chỉ dẫn cũ** → chat luôn hiện instruction hiện hành và đề xuất toàn văn.
- **Đóng cặp cũ ảnh hưởng chương ngoài task** → đúng ý nghĩa “từ chương N”; thẻ xác nhận nói rõ.
- **Nửa chừng giữa work DB và library** → ID cặp xác định + gửi lại cùng `clientCommandId`.

## Migration Plan

1. Library v13: bảng `agent_task_steering`, fixture schema, backup test.
2. Snapshot + prompt: `instruction`, tăng `TRANSLATE_PROMPT_VERSION`, test hash snapshot không đổi khi vắng.
3. Validate + record + pin trong task runner.
4. `context_ref` cho cặp xưng hô.
5. Chat capability và form/màn Tác vụ.

Rollback: ngừng nhận lệnh steering; item đã pin vẫn đọc instruction từ snapshot.
