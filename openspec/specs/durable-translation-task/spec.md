# durable-translation-task Specification

## Purpose
TBD - created by archiving change add-durable-translation-tasks. Update Purpose after archive.

## Requirements

### Requirement: Từ vựng trạng thái chung
Hệ thống SHALL dùng đúng các trạng thái task `queued`, `running`, `pausing`, `paused`, `waiting_user`,
`cancelling`, `cancelled`, `completed`, `partially_completed`, `failed` và trạng thái item `queued`,
`running`, `waiting_user`, `completed`, `failed`, `skipped`, `cancelled`. Trạng thái `waiting_user`,
`paused` và `failed` SHALL mang `reason` thuộc `missing_raw`, `conflict`, `budget`, `provider`, `refused`,
`context_review`, `app_closed`, `recovered_after_restart`, `user`. Hệ thống SHALL không dùng
`waiting_review`, `needs_attention`, `checking` hay `needs_user` làm trạng thái task hoặc item.

#### Scenario: Trạng thái lạ bị từ chối
- **WHEN** một ghi vào `agent_task` hoặc `agent_task_item` mang trạng thái hoặc reason ngoài danh sách
- **THEN** CHECK của library DB từ chối ghi đó và không hàng nào đổi

### Requirement: Chuyển trạng thái task theo bảng
Hệ thống SHALL chỉ cho các chuyển trạng thái task sau, mỗi chuyển qua repository với compare-and-set
`state_version`; chuyển khác SHALL bị từ chối `conflict`. `completed` và `cancelled` là kết thúc.

| Từ | Sự kiện | Đến |
| --- | --- | --- |
| `queued` | scheduler bắt đầu item đầu tiên | `running` |
| `queued` | Pause | `paused(user)` |
| `queued` | Cancel | `cancelled` |
| `queued` | đóng app / khởi động sau crash | `paused(app_closed)` / `paused(recovered_after_restart)` |
| `running` | Pause | `pausing` |
| `running` | Cancel | `cancelling` |
| `running` | trần task chặn lời gọi kế tiếp | `paused(budget)` |
| `running` | kết nối/model không dùng được hoặc settings đổi | `waiting_user(provider)` |
| `running` | đóng app / khởi động sau crash | `paused(app_closed)` / `paused(recovered_after_restart)` |
| `running` | không còn item `queued`/`running`, mọi item `completed` | `completed` |
| `running` | không còn item `queued`/`running`, có ít nhất một item `completed` | `partially_completed` |
| `running` | không còn item `queued`/`running`, không item nào `completed` | `failed` |
| `pausing` | item đang chạy dừng ở điểm an toàn | `paused(user)` |
| `pausing` | Cancel | `cancelling` |
| `pausing` | đóng app / khởi động sau crash | `paused(app_closed)` / `paused(recovered_after_restart)` |
| `paused` | Continue | `queued` |
| `paused` | Cancel | `cancelled` |
| `waiting_user` | Continue | `queued` |
| `waiting_user` | Cancel | `cancelled` |
| `cancelling` | runner kết thúc (rào commit xong), hoặc khởi động sau crash | `cancelled` |
| `failed` | Retry | `queued` |
| `partially_completed` | Retry | `queued` |

#### Scenario: Continue sau khi pause
- **WHEN** người dùng bấm Continue trên task `paused(user)`
- **THEN** task chuyển `queued` và scheduler được đánh thức

#### Scenario: Cancel khi đang pausing
- **WHEN** task đang `pausing` và người dùng bấm Cancel
- **THEN** task chuyển `cancelling`, rồi `cancelled` khi runner kết thúc

#### Scenario: Lệnh với state_version cũ
- **WHEN** hai cửa sổ cùng gửi Pause với cùng `state_version`
- **THEN** lệnh đầu được áp dụng, lệnh sau nhận `conflict` và trạng thái chỉ đổi một lần

#### Scenario: Retry task partially_completed
- **WHEN** task `partially_completed` có hai item `failed` và người dùng bấm Retry
- **THEN** task chuyển `queued`, hai item đó chuyển `queued`, item `completed` giữ nguyên

### Requirement: Chuyển trạng thái item theo bảng
Hệ thống SHALL chỉ cho các chuyển trạng thái item sau; `completed`, `skipped`, `cancelled` là kết thúc.

| Từ | Sự kiện | Đến |
| --- | --- | --- |
| `queued` | scheduler chọn | `running` |
| `queued` | Skip | `skipped` |
| `queued` | task bị Cancel | `cancelled` |
| `running` | runner kết thúc theo bảng ánh xạ kết quả | `completed` / `failed(reason)` / `waiting_user(reason)` |
| `running` | runner dừng vì Pause, trần task, đóng app hoặc khởi động sau crash | `queued` |
| `running` | task bị Cancel, runner đã dừng | `cancelled` |
| `running` | khởi động sau crash, journal work DB đã `completed` | `completed` |
| `waiting_user` | Continue/Retry | `queued` |
| `waiting_user` | Skip | `skipped` |
| `waiting_user` | task bị Cancel | `cancelled` |
| `failed` | Retry | `queued` |
| `failed` | Skip | `skipped` |
| `failed(refused)` | Bỏ qua đoạn bị từ chối | `completed` |

Kết quả runner SHALL được ánh xạ:

| Kết quả runner | Item |
| --- | --- |
| `completed` | `completed` |
| `partially_completed` chỉ vì giữ hàng đã có bản dịch | `completed` |
| `partially_completed` có `refusedIds` | `failed(refused)` |
| `partially_completed` có `failedIds` hoặc `budgetIds`, không có `refusedIds` | `failed(provider)` hoặc `failed(budget)` |
| dừng ở điểm an toàn | `queued` |
| `cancelled` | `cancelled` |
| `conflict` | `waiting_user(conflict)` |
| lỗi chương chưa có bản gốc | `waiting_user(missing_raw)` |
| lỗi provider khác | `failed(provider)` |

#### Scenario: Item bị pause quay lại hàng đợi
- **WHEN** item đang `running` và task chuyển `pausing`
- **THEN** sau batch đang chạy, item chuyển `queued`, operation của lần chạy đó kết thúc `interrupted`

#### Scenario: Runner trả conflict
- **WHEN** runner trả `conflict` vì revision bản dịch lệch
- **THEN** item chuyển `waiting_user(conflict)` và scheduler chuyển sang item kế tiếp

### Requirement: Tạo task với phạm vi cố định và idempotent
Hệ thống SHALL resolve work và danh sách chapter ID có thứ tự trước khi tạo task, và SHALL lưu task cùng mọi
item trong một transaction với model/settingsKey, `overwrite_policy = fill_untranslated`, trần ngân sách và
`origin_turn_id` khi có. Chương thêm sau SHALL không vào task. Cùng `clientCommandId` và cùng payload digest
SHALL trả task cũ; cùng `clientCommandId` khác digest SHALL trả `conflict`. "Chạy lại" SHALL tạo task mới với
`source_task_id` trỏ task cũ, item mới và bản chụp mới.

#### Scenario: Dịch chương 1–30
- **WHEN** người dùng giao chương 1–30
- **THEN** một task với đúng 30 item theo ID và thứ tự được commit, mọi item `queued`

#### Scenario: Gửi lại lệnh tạo
- **WHEN** client gửi lại cùng `clientCommandId` và payload sau timeout
- **THEN** hệ thống trả taskId cũ và không tạo item mới

#### Scenario: Chạy lại task đã xong
- **WHEN** người dùng bấm "Chạy lại" trên task `completed`
- **THEN** một task mới có `source_task_id` của task cũ được tạo, task cũ không đổi

### Requirement: Task độc lập với turn chat
Task SHALL tiếp tục khi turn tạo nó kết thúc, khi người dùng đổi session hoặc đổi màn. Stop turn SHALL không
đổi trạng thái task. Capability chat `create_translation_task` SHALL cần người dùng duyệt (`needs_user`)
trước khi tạo task và SHALL trả taskId cho turn.

#### Scenario: Task tiếp tục sau khi turn kết thúc
- **WHEN** turn tạo task chuyển `completed`
- **THEN** task vẫn `running` và item kế tiếp vẫn được scheduler chạy

#### Scenario: Stop turn sau khi tạo task
- **WHEN** turn đã nhận taskId rồi người dùng Stop turn
- **THEN** task không bị hủy và câu trả lời chỉ tới màn Tác vụ để điều khiển task

#### Scenario: Tạo task từ chat cần duyệt
- **WHEN** model gọi `create_translation_task` cho chương 1–30
- **THEN** turn chờ người dùng duyệt, và chỉ sau khi duyệt task mới được tạo

### Requirement: Scheduler tuần tự
Hệ thống SHALL chạy tối đa một item `running` trên toàn ứng dụng, chọn item `queued` theo
`(task.created_at, task.id, item.ordinal)`. Item `waiting_user` hoặc `failed` SHALL không chặn item sau.
Scheduler SHALL được đánh thức bởi sự kiện (tạo, Continue, Retry, item kết thúc) và SHALL không poll.

#### Scenario: Hai task cùng queued
- **WHEN** hai task đều có item `queued`
- **THEN** item của task tạo trước chạy trước và không có hai item chạy cùng lúc

#### Scenario: Chương thiếu raw
- **WHEN** chương 7 của task 1–30 không có bản gốc
- **THEN** item 7 chuyển `waiting_user(missing_raw)`, scheduler chạy item 8, và khi hết item task kết thúc
  `partially_completed`

### Requirement: Mỗi lần chạy item là một operation mới
Mỗi lần item chuyển `queued → running` hệ thống SHALL tạo một `agent_operation` mới có `task_item_id`, không
có `turn_id`, và một hàng `agent_task_attempt(item_id, attempt, operation_id)`. Hệ thống SHALL không ghi
batch mới vào operation đã kết thúc.

#### Scenario: Continue sau pause
- **WHEN** item bị pause sau hai batch rồi người dùng Continue
- **THEN** item chạy với operation mới, attempt tăng một, operation cũ vẫn `interrupted`

### Requirement: Khóa batch theo nội dung và chỉ dịch hàng chưa có bản dịch
Hệ thống SHALL khóa batch của task bằng itemId và sha256 của (segmentIds, sourceRev, contextSnapshotHash,
settingsKey); `attempt` SHALL không thuộc khóa. Cùng khóa cùng checksum trong các operation của item SHALL trả
kết quả đã commit; cùng khóa khác checksum SHALL là `conflict`. Với `fill_untranslated`, runner SHALL chỉ lập
kế hoạch hàng nguồn không rỗng chưa có bản dịch, nên hàng đã được lần chạy trước commit và hàng người dùng
đã dịch SHALL không bị gọi lại hay ghi đè, kể cả hàng do AI viết.

#### Scenario: Retry sau lỗi batch ba
- **WHEN** item đã commit hai batch rồi lỗi ở batch ba, người dùng bấm Retry
- **THEN** lần chạy mới chỉ gửi các hàng của batch ba trở đi và không ghi lại hai batch đầu

#### Scenario: Khóa trùng khác nội dung
- **WHEN** một batch có khóa đã commit trong item nhưng checksum khác
- **THEN** batch không được ghi và item chuyển `waiting_user(conflict)`

### Requirement: Item ghim một bản chụp ngữ cảnh
Lần đầu item chuyển `queued → running`, hệ thống SHALL tạo bản chụp bằng `takeContextSnapshot` và lưu vào
`translate_run_context` (work DB trước), rồi trong cùng transaction library đặt `run_key`, `source_rev` và
`expected_target_rev` của item. Mọi lời gọi model của mọi lần chạy item SHALL dựng ngữ cảnh từ bản chụp này,
không đọc kho ngữ cảnh. Lỗi đọc bản chụp SHALL không bị bỏ qua. `source_rev` khác bản nguồn hiện tại khi
Continue/Retry SHALL đưa item về `waiting_user(conflict)`.

#### Scenario: Sửa glossary giữa task
- **WHEN** người dùng duyệt thêm mục glossary khi item 3 đang chạy
- **THEN** item 3 và các lần Retry của nó dùng bản chụp cũ và item báo ngữ cảnh đã đổi; item 4 chụp bản mới

#### Scenario: Nguồn đổi khi app tắt
- **WHEN** bản nguồn của chương đổi revision trước khi người dùng Continue
- **THEN** item chuyển `waiting_user(conflict)` và không có lời gọi model nào cho item đó

#### Scenario: Revision đích chụp lúc item bắt đầu
- **WHEN** người dùng sửa bản dịch chương 20 sau khi tạo task nhưng trước khi item 20 bắt đầu
- **THEN** item 20 chụp `expected_target_rev` mới lúc bắt đầu và chạy bình thường

### Requirement: Pause, Cancel và đóng app có điểm an toàn
Runner SHALL kiểm `shouldStop()` trước mỗi batch; Pause SHALL để batch đang chạy commit nguyên tử rồi dừng.
Cancel SHALL abort request đang chạy và SHALL không commit batch nào sau khi được chấp nhận; phần đã commit
được giữ. Đường thoát app SHALL ghi `paused(app_closed)` cho task `queued`/`running`/`pausing` và đưa item
`running` về `queued` trước khi đóng library.

#### Scenario: Pause giữa item
- **WHEN** Pause đến khi batch 2 đang chờ provider
- **THEN** batch 2 commit, batch 3 không được gửi, task thành `paused(user)` với tiến độ đúng

#### Scenario: Cancel khi provider đang chạy
- **WHEN** Cancel đến khi request của batch 3 đang bay
- **THEN** request bị abort, batch 3 không được commit, task thành `cancelled` sau khi runner kết thúc

#### Scenario: Đóng app khi task đang chạy
- **WHEN** người dùng thoát app khi item 5 đang chạy
- **THEN** task là `paused(app_closed)`, item 5 là `queued`, và mở lại app không tự chạy tiếp

### Requirement: Phục hồi khi khởi động không gọi provider
Sau khi reconcile operation, hệ thống SHALL reconcile task còn dở do crash: item `running` có operation đã
`completed` trong journal work DB SHALL thành `completed`, item `running` khác SHALL về `queued`; task
`queued`/`running`/`pausing` SHALL thành `paused(recovered_after_restart)`; task `cancelling` SHALL thành
`cancelled`. Reconcile SHALL không gọi provider và không tự chạy task.

#### Scenario: Crash giữa hai DB
- **WHEN** app crash sau khi work DB commit batch cuối và đánh dấu operation `completed` nhưng trước khi
  library cập nhật item
- **THEN** khởi động lại item là `completed` và Continue không dịch lại chương đó

#### Scenario: Crash giữa item
- **WHEN** app crash khi item đã commit hai batch
- **THEN** item về `queued`, tiến độ hiện hai batch, và Continue chỉ dịch phần còn lại

### Requirement: Ghi của task flush editor và chặn ghi trùng từ chat
Trước mỗi batch commit, hệ thống SHALL gửi write-intent tới mọi cửa sổ và đợi mỗi cửa sổ trả `ack` hoặc
`not-open`; `flush-failed` hoặc hết giờ SHALL đưa item về `waiting_user(conflict)` mà không ghi. Capability
ghi của chat vào chương có item `running` SHALL bị từ chối `conflict` trước khi gọi provider.

#### Scenario: Editor đang mở chương
- **WHEN** chương 4 đang mở với thay đổi chưa lưu và item 4 sắp commit batch
- **THEN** editor lưu thay đổi trước, rồi batch mới được ghi

#### Scenario: Chat ghi vào chương đang được task dịch
- **WHEN** người dùng nhờ chat dịch chương 4 khi item 4 đang `running`
- **THEN** chat nhận `conflict` và không có lời gọi model nào cho yêu cầu đó

### Requirement: Item hoàn tất khi mọi đoạn cần dịch đã có bản dịch
Item SHALL `completed` chỉ khi mọi đoạn nguồn không rỗng chưa có bản dịch lúc item bắt đầu đã có bản dịch
được commit bởi các operation của item, hoặc nằm trong danh sách đoạn người dùng bỏ qua, và `failedIds` của
lần chạy cuối rỗng. Đối soát ID thiếu, thừa, trùng SHALL dùng `translateReconcile` và repair sẵn có. Có
`refusedIds` thì item SHALL `failed(refused)` cho tới khi người dùng bỏ qua các đoạn đó hoặc tự dịch rồi Retry.

#### Scenario: Đoạn bị nhà cung cấp từ chối
- **WHEN** lần chạy của item có hai đoạn trong `refusedIds`
- **THEN** item là `failed(refused)` và UI nêu hai đoạn đó, không báo chương đã dịch xong

#### Scenario: Bỏ qua đoạn bị từ chối
- **WHEN** người dùng chọn bỏ qua các đoạn bị từ chối của item đó
- **THEN** item thành `completed` và hiện số đoạn đã bỏ qua

### Requirement: Ngân sách một lượt và trần task
Mỗi operation của item SHALL dùng đúng một `CallBudget` cho mọi batch và vòng phụ, theo spec
`translation-call-budget`. Trước mỗi lời gọi model, cùng cổng đó SHALL kiểm trần task (số lời gọi, số token;
chi phí chỉ khi catalog có giá; kết nối subscription/OAuth chỉ có trần lời gọi/token). Chạm trần SHALL đưa
task về `paused(budget)` trước khi gửi request. Usage SHALL được lưu sau mỗi batch, kể cả khi lần chạy lỗi,
với `complete = false` cho tới khi kết thúc bình thường; usage provider không báo SHALL là "không rõ", không
phải 0. Hệ thống SHALL không tự chuyển sang provider, model hoặc kết nối khác.

#### Scenario: Chạm trần lời gọi giữa task
- **WHEN** task đặt trần 40 lời gọi và lời gọi kế tiếp sẽ là thứ 41
- **THEN** request không được gửi, item đang chạy về `queued`, task thành `paused(budget)` và kết quả đã commit
  được giữ

#### Scenario: Lỗi provider giữa item
- **WHEN** provider lỗi ở batch ba sau hai batch có usage
- **THEN** operation lưu usage của hai batch với `complete = false` và item `failed(provider)`

#### Scenario: Provider không báo usage
- **WHEN** provider không trả usage cho lời gọi nào của item
- **THEN** màn Tác vụ hiện usage "không rõ" chứ không hiện 0

### Requirement: IPC và màn Tác vụ phản ánh trạng thái thật
Hệ thống SHALL cung cấp kênh list, get, create, control task qua preload và phát `agentTaskChanged` tới mọi
cửa sổ sau mỗi chuyển trạng thái hoặc tiến độ. Màn Tác vụ toàn app và khu Tác vụ của tác phẩm SHALL đọc task
thật, refetch khi mount và khi nhận sự kiện, hiển thị model, số item theo trạng thái, item đang chạy, usage
và độ đầy đủ, reason, và chỉ hiện control hợp lệ với trạng thái. Thanh tiến độ SHALL có nhãn chữ và đổi trạng
thái SHALL được báo qua vùng `aria-live`. `Mở đích` SHALL mở đúng chương của item.

#### Scenario: Task 29 trên 30
- **WHEN** 29 item `completed` và một item `failed(provider)`
- **THEN** UI hiện `partially_completed` với chương lỗi, không nói đã dịch xong 30 chương

#### Scenario: Mở đích
- **WHEN** người dùng bấm `Mở đích` trên item chương 12
- **THEN** app mở editor của chương 12 trong tác phẩm của task

#### Scenario: Màn Tác vụ cập nhật khi mở sẵn
- **WHEN** màn Tác vụ đang mở và một item chuyển `completed`
- **THEN** màn hiện tiến độ mới mà không cần rời màn, và trình đọc màn hình nghe thông báo đổi trạng thái
