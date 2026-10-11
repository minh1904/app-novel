# Học thêm từ Hermes: lõi gọi model, dữ liệu và vỏ app

Cập nhật: 2026-10-09 · Trạng thái: **Quan sát** (phần 1), **đề xuất** (phần 2–6), trừ các mục ghi rõ
“Đã chốt” hoặc “Đã thử”. Chủ trì: chủ sản phẩm, kỹ thuật.

## Câu hỏi chương này trả lời

Mira đã học từ Hermes design system, UI chat, modal Cài đặt, đăng nhập thuê bao và vòng gọi tool. Ngoài
những phần đó, Hermes còn gì đáng lấy cho việc dịch truyện? Trang này rà ba vùng còn lại:

- lõi gọi model (`agent/`, `tools/`);
- lưu trữ, tác vụ nền và eval (`hermes_state_*.py`, `cron/`, `batch_runner.py`, `evals/`);
- phần vỏ của app desktop (`apps/desktop/electron`, `apps/desktop/src`).

Đường dẫn Hermes tính từ gốc repo `D:\personal\hermes-agent`; `ad/` là `apps/desktop/`. Đường dẫn Mira
tính từ `src/`.

**Mức kiểm chứng.** Các mục 2a, 2b, 2c, 2d, 3a, 3b và FTS ở 5a đã được đối chiếu trực tiếp với mã hai
bên. Các mục còn lại dựa trên đọc mã có ghi file:dòng nhưng chưa chạy thử.

## 1. Mira đã có, không cần lấy thêm (quan sát)

| Việc | Ở Mira |
| --- | --- |
| Retry có backoff, jitter, đọc `Retry-After` | `main/infra/providers/gateway/retryPolicy.ts` |
| Xoay vòng khóa, giới hạn RPM và đồng thời | `gateway/keyScheduler.ts`, `limiter.ts`, `ratePacer.ts` |
| Timeout chờ byte đầu và stream đứng | `openAiChatTransport.ts` |
| Usage có token cache đọc/ghi, ước chi phí | `infra/providers/usage.ts`, `services/ai/costEstimate.ts` |
| Model dự phòng **cho chat** | `services/ai/chatService.ts`, `fallback.ts` |
| Hủy lượt, trần số vòng và ký tự cho tool | `chatService.ts` |
| SQLite: WAL, `busy_timeout`, `synchronous=FULL`, `foreign_keys` | `infra/storage/sqlite.ts` |
| Backup `VACUUM INTO` rồi `integrity_check` | `infra/storage/backupFile.ts` |
| Đánh dấu lượt chat dở dang khi khởi động | `infra/storage/aiSessions.ts` |
| Toast, chặn đóng khi còn chữ chưa lưu, onboarding | `stores/notificationStore.ts`, `main/index.ts`, `features/onboarding/` |

## 2. Lõi gọi model: sửa lỗi dịch có thật (đề xuất, mỗi mục cỡ nhỏ)

### 2a. Lô bị cắt vì hết trần đầu ra

- **Mira (đã kiểm):** khi `finishReason === 'length'`, `services/ai/translate/translationCore.ts` cho
  cả lô thất bại với "Phản hồi bị cắt vì hết giới hạn đầu ra". Lô bị bộ lọc chặn thì đã được chia đôi
  (`splitFiltered`), nhưng lô bị cắt thì không.
- **Hermes:** `agent/turn_truncation.py:382` `boosted_output_cap` tăng trần theo `base·2ⁿ`, không vượt
  giới hạn đầu ra của model, và không gửi lại cùng một trần.
- **Đề xuất:** JSON dở dang không nối tiếp được, nên Mira nên gửi lại **một lần** với trần gấp đôi nếu
  `outputLimit` trong catalog còn chỗ, nếu không thì chia đôi lô bằng đường `splitFiltered` sẵn có. Bản
  dịch tiếng Việt thường dài hơn nhiều so với số token nguồn CJK, nên lỗi này dễ gặp khi lô lớn.

### 2b. Khối `<think>` lẫn trong nội dung

- **Mira (đã kiểm):** `parseItems` (`infra/providers/openAiCompatible.ts:173-174`) bỏ fence rồi lấy từ dấu
  `[` đầu tiên tới `]` cuối cùng. Một khối suy luận có dấu ngoặc vuông nằm trước JSON sẽ làm hỏng phép
  đọc. Không có chỗ nào lọc `<think>`.
- **Hermes:** `agent/think_scrubber.py:31` `StreamingThinkScrubber` lọc theo stream, giữ lại thẻ bị cắt
  giữa hai delta, và nhận cả tên thẻ `思考`, `推理`.
- **Đề xuất:** bỏ khối suy luận trước `parseItems`; trong chat, lọc theo stream rồi đưa phần đó vào khối
  "Thinking" thay vì in ra. Cần cho DeepSeek-R1, Qwen3, QwQ chạy qua Ollama, LM Studio hay proxy.

### 2c. Sửa nhẹ tham số tool call

- **Mira (đã kiểm):** `readArgs` (`services/ai/chatTools.ts:355-360`) gặp JSON hỏng thì trả `null` và tool
  báo lỗi, tốn một vòng.
- **Hermes:** `tools/arg_coercion.py:20` `coerce_tool_args` ép kiểu theo schema: `"42"` thành số,
  `"true"` thành bool, chuỗi JSON thành mảng hoặc object.
- **Đề xuất:** ép kiểu theo schema của từng tool trước khi báo lỗi.

### 2d. Model lặp một câu không dừng

- **Hermes:** `agent/repetition_guard.py:53` `is_repetition_dominated`, `:141` `is_runaway_repetition`,
  `:163` `RunawayStreamWatch` để kiểm trong lúc stream với chi phí tuyến tính.
- **Mira:** chưa có.
- **Đề xuất:** hủy stream chat sớm khi bị lặp. Trong dịch, một `dst` dài bất thường so với nguồn mà bị
  lặp thì coi là thiếu và đưa vào lượt hỏi lại.

### 2e. Gọi lại tool y hệt

- **Hermes:** `agent/tool_guardrails.py:38-50` cảnh báo khi cùng một lời gọi lặp lại, nhận ra chu kỳ
  A,B,A,B, và thay kết quả trùng (≥512 ký tự) bằng một dòng tham chiếu.
- **Mira:** chỉ có trần số vòng và trần ký tự; `read_chapter` cùng trang gọi lại vẫn tốn ký tự.
- **Đề xuất:** trả "đã đọc ở bước N" cho lời gọi trùng.

### 2f. Phản hồi rỗng và ký tự rác

- **Hermes:** `agent/empty_response_guard.py:207` `deterministic_empty`: rỗng hai lần liên tiếp với 0
  token đầu ra thì không thử lại nữa. `agent/message_sanitization.py:32` lọc lone surrogate.
- **Mira:** không phân biệt "proxy lặng lẽ từ chối" với lỗi ngẫu nhiên; không lọc ký tự hỏng trong chữ
  cào từ web.
- **Đề xuất:** gắn nhãn `refused` cho trường hợp rỗng lặp lại thay vì hỏi lại mãi, và lọc ký tự trước khi
  gửi.

## 3. Lõi gọi model: chi phí và dịch hàng loạt (đề xuất, cỡ vừa)

### 3a. Model dự phòng cho lô dịch

- **Mira (đã kiểm):** `quota` và `rate_limited` có `haltsRun: true`
  (`services/ai/errorPolicy.ts:35-42`). Dự phòng model chỉ dùng trong chat.
- **Hermes:** `agent/fallback_cooldown.py` chuyển sang model dự phòng và ghi thời điểm model chính mở
  lại (`_arm_rate_limit_cooldown`, `_provider_reset_delay`), rồi quay lại khi hết hạn.
- **Đã chốt khác:** dịch chương không tự đổi model mà mời "Dịch tiếp bằng Y" (mục 10). Ý tưởng
  cooldown của Hermes chỉ còn là đầu vào cho tác vụ nhiều chương.

### 3b. Đánh dấu cache cho Claude qua OpenRouter

- **Mira (đã kiểm):** prompt dịch đã xếp phần ổn định lên trước để cache tiền tố tự động ăn, nhưng không
  gửi `cache_control`. Claude qua OpenRouter chỉ cache khi có đánh dấu.
- **Hermes:** `agent/prompt_caching.py:330` `apply_anthropic_cache_control`: tối đa 4 điểm, system và
  các tin cuối, gọi lại nhiều lần không vượt quá 4.
- **Đề xuất:** đặt điểm cache ở cuối system prompt và cuối khối thuật ngữ, nhân vật, xưng hô. Khối này
  giống nhau ở mọi lô của một chương. Phép đo `cacheRead` đã có sẵn để kiểm hiệu quả.

### 3c. Đọc header `x-ratelimit-*`

- **Hermes:** `agent/rate_limit_tracker.py` đọc `x-ratelimit-{limit,remaining,reset}-{requests,tokens}`.
- **Mira:** chỉ đọc `retry-after`.
- **Đề xuất:** đưa số còn lại vào `ratePacer` để giảm nhịp trước khi bị 429.

### 3d. Tóm tắt các quyết định thay vì bỏ lượt cũ

- **Hermes:** `agent/context_compressor.py` tóm tắt có cấu trúc, cập nhật dần, đánh dấu là "chỉ để tham
  khảo". `agent/micro_compaction.py` ghi rằng nén làm mất prompt cache nên mặc định tắt.
- **Mira:** `renderer/src/features/chapter/chat/chatTurns.ts` `historyFor` bỏ lượt cũ nhất khi vượt ngân sách.
- **Đề xuất:** khi vượt ngân sách, tóm tắt "các quy ước đã thống nhất" (cách gọi, tên giữ nguyên) bằng
  model rẻ. Chỉ chạy khi thật sự vượt, để không phá cache.

## 4. Tác vụ dài và chi phí (nghiên cứu đầu vào)

[Phiên và tác vụ](../proposals/sessions-and-jobs.md) đã chốt vòng đời task nhưng chưa có bảng lưu trữ.
Hermes có ba mẫu đáng lấy:

- **Sổ ghi lần chạy** (`cron/executions.py:56-97`): trạng thái `claimed → running →
  completed|failed|unknown`, trạng thái cuối không đổi được, có cột heartbeat. `batch_runner.py:532-600`
  ghi checkpoint nguyên tử và resume bằng cách xem kết quả đã có, không theo chỉ số. Mục lỗi không được
  đánh là xong. Với Mira: bảng `job` và `job_item(chapter_id, status, attempts, last_error, cost_usd,
  progress_at)`, khóa idempotent là `run_key`. Mira chỉ có một tiến trình, nên khi khởi động có thể đánh
  mọi mục `running` thành `interrupted`, như đã làm với lượt chat.
- **Giữ tác vụ khi hết quota** (`cron/quota_hold.py`): dời lượt chạy tới lúc quota mở lại thay vì báo lỗi
  liên tục. **Chỉ tự thử lại khi chưa có lời gọi nào bị tính tiền** (`cron/unreachable_retry.py`).
- **Sổ chi phí** (`hermes_state_usage.py`, `agent/insights.py`): tính cả lời gọi phụ, tổng theo model,
  ngày. Mira có `cost_usd` theo lượt chat nhưng đề xuất dịch thì chưa; vùng Jobs vẫn là bản mẫu
  (`features/work/JobsAreaMock.tsx`).

## 5. Dữ liệu (đề xuất)

### 5a. Tìm toàn văn bằng FTS5

- **Hermes:** ba chỉ mục FTS5 đồng bộ bằng trigger: `unicode61` cho từ, `trigram` cho chuỗi con CJK, và
  một tokenizer bigram viết riêng (`hermes_state_common.py:773-910`, `hermes_state_fts.py`). Từ khóa quá
  ngắn thì lùi về `LIKE` (`hermes_state_search.py:1007`). Truy vấn được escape và trả `snippet()`.
- **Mira:** `search_work` quét chuỗi con trên toàn bộ chương (`services/ai/chatSearch.ts`), không có tìm
  trong lịch sử chat.
- **Đã thử (2026-10-08)** trên `node:sqlite` của Electron 44.4.5, SQLite 3.53.4: FTS5 `trigram` và
  `unicode61 remove_diacritics 2` đều có sẵn. `黛玉进` khớp; `黛玉` (2 ký tự) **không** khớp vì trigram cần
  ít nhất 3 ký tự, nên phải lùi về `LIKE` như Hermes. `tieu thu` khớp "Tiểu thư".
- **Quyết định 2026-10-08 (chủ sản phẩm):** tìm kiếm **không bỏ dấu** tiếng Việt.
- **Đề xuất:**
  - `trigram` cho bản gốc;
  - `unicode61 remove_diacritics 0` cho bản dịch và lịch sử chat.

  Vì giữ dấu, chữ phải được chuẩn hóa NFC cả khi ghi chỉ mục lẫn khi tìm. Chữ cào từ web có thể ở dạng
  dựng sẵn hoặc dạng tổ hợp (NFD), và hai dạng này không khớp nhau. Theo lỗi Hermes từng gặp
  (`hermes_state_common.py:765-772`), dữ liệu VIEW và trigger ghi vào chỉ mục phải giống hệt nhau.

### 5b. Độ bền của tệp tác phẩm

- **Sao lưu trước migration.** `infra/storage/migrate.ts` chạy từng bước trong transaction nhưng không
  chụp bản nào trước (đã kiểm). Hermes coi sao lưu thất bại là lý do dừng sửa
  (`hermes_state_repair.py:478-493`) và chỉ giữ N bản. Mira đã có `exportToFile`, nên chỉ cần gọi trước
  khi `userVersion < latest` và giữ khoảng 3 bản.
- **Giới hạn WAL và VACUUM có điều kiện.** `hermes_state_wal.py:86` đặt `journal_size_limit` 64 MiB;
  `hermes_state_maintenance.py:375` chỉ VACUUM khi trang trống vượt 25 %. Mira chưa có, trong khi
  `text_snapshot` lưu nguyên chương mỗi lần Accept nên tệp sẽ phình.
- **Kiểm sức khỏe khi mở** (`hermes_state_health.py`): một trạng thái "kho hỏng" dùng chung cho mọi màn,
  thay vì hiện danh sách trống. Mira chỉ chạy `integrity_check` khi xuất hoặc nhập backup.

### 5c. Ghi chú văn phong và bộ quy ước

- **Memory của Hermes** (`tools/memory_tool.py`): model ghi ghi chú, có giới hạn ký tự, quét chống
  injection, và nạp vào system prompt dưới dạng **snapshot cố định** lúc đầu phiên để giữ cache. Với
  Mira: một tool tạo **đề xuất** ghi chú văn phong hoặc mục ngữ cảnh, đi qua luồng duyệt sẵn có. Việc này
  khớp với "hàng duyệt style note" trong [Văn phong và ký ức](../context/style-and-memory.md).
- **Skill của Hermes** (`tools/skills_tool.py`): prompt chỉ mang tên và mô tả, model gọi tool để lấy
  toàn văn. Với Mira: "bộ quy ước dịch" như "thoại thân mật", "giữ hậu tố kính ngữ", chỉ nạp khi cần.
- **Tiêu đề phiên** (`agent/title_generator.py`, `hermes_state_titles.py`): tiêu đề tạm cắt theo ranh
  giới từ, nâng cấp bằng model rẻ, thứ bậc nguồn `derived < llm < user`. Mira đang lấy
  `question.slice(0, 80)` (`services/createServices.ts:86`, đã kiểm) và chưa có cột nguồn tiêu đề.

## 6. Vỏ app desktop (đề xuất)

**Dùng chung tín hiệu "đang có việc AI chạy"** (`ad/src/store/active-work.ts`):

- Hỏi xác nhận trước khi thoát (`ad/electron/quit-guard.ts`). Mira hiện chỉ chặn khi còn chữ chưa lưu.
- Giữ máy không ngủ khi dịch dài (`ad/electron/power-save.ts`, `powerSaveBlocker`).
- Thông báo của hệ điều hành khi xong hoặc lỗi lúc cửa sổ không được focus
  (`ad/src/store/native-notifications.ts`, `ad/electron/notification-ipc.ts`).

**Độ bền:**

- Khóa một instance (`requestSingleInstanceLock`): hai cửa sổ cùng ghi một tệp SQLite là rủi ro thật.
  Mira chưa có (đã kiểm).
- Nhớ kích thước và vị trí cửa sổ, xử lý trường hợp màn hình phụ bị rút (`ad/electron/window-state.ts`).
- Error boundary ở gốc app, ghi log ra tệp có xoay vòng, bắt lỗi chưa xử lý ở main
  (`ad/src/components/error-boundary.tsx`, `ad/electron/crash-forensics.ts`, `log-rotation.ts`). Sau đó
  thêm "Mở thư mục log" ở trang About.

**Thao tác bằng bàn phím:**

- Registry phím tắt chung, bảng tra và cho đổi phím (`ad/src/lib/keybinds/`). Mira hiện gắn `keydown`
  riêng ở từng màn.
- Thứ tự đóng lớp khi bấm Escape (`ad/src/lib/escape-layers.ts`).
- Command palette (`ad/src/app/command-palette/`, thư viện `cmdk`): nhảy tới truyện, chương, mục cài đặt.
  Ctrl+K của Mira đang dùng cho panel AI, nên cần chọn phím khác.
- Menu chuột phải theo đối tượng (`ad/src/app/context-menu/`): chương, truyện, đoạn chọn → "Thêm vào
  glossary".

## 7. Eval cho Lab (đề xuất)

- **Fixture dạng bẫy** (`evals/toolperf_abeval/README.md`): hai nhánh chỉ khác một biến, mỗi task là bẫy
  cho một loại lỗi, chấm từ trace, lần chạy hỏng hạ tầng không được ghi để resume chạy lại. Với Mira:
  bẫy cho nhầm xưng hô, gộp hoặc tách đoạn, phiên âm tên sai.
- **Đo thông tin còn lại sau khi nén** (`evals/compaction/README.md`): sinh câu hỏi từ phần sẽ bị tóm
  tắt, hỏi model chỉ với ngữ cảnh đã nén, chấm theo đáp án. Cần khi Mira làm tóm tắt chương hoặc mục 3d.

## 8. Không lấy

i18n, tray, deep link, tour hướng dẫn, todo và clarify tool, delegate tool, read pool SQLite, trajectory
cho huấn luyện, gateway và nhắn tin. Tự cập nhật (`electron-updater`) để tới khi phát hành cho người khác.

## 9. Thứ tự đề xuất

1. Mục 2a–2f và 5b: nhỏ, sửa lỗi thật hoặc giảm rủi ro mất dữ liệu.
2. Khóa một instance, nhớ cửa sổ, tín hiệu "đang chạy" (phần 6), error boundary và log.
3. Mục 3b: tác động lớn lên chi phí. Mục 3a đã chốt theo cách khác (mục 10).
4. Phần 4 cùng với [giai đoạn tác vụ nhiều chương](../proposals/agent-roadmap.md#2-tác-vụ-dịch-nhiều-chương).
5. Mục 5a, 5c, phím tắt và command palette: cần chủ sản phẩm chọn.

## Câu hỏi cần chốt

1. ~~Model dự phòng khi dịch chương?~~ Đã chốt 2026-10-08: không tự đổi, mời "Dịch tiếp bằng Y" (mục 10).
2. ~~Tìm kiếm có bỏ dấu không?~~ Đã chốt 2026-10-08: không bỏ dấu (mục 5a).
3. **Ghi chú văn phong vừa duyệt vào prompt lúc nào?** Phân tích ở mục 11.

## 10. Dự phòng khi dịch chương: đã chốt cách A

**Quyết định 2026-10-08 (chủ sản phẩm), đã triển khai** (task 4.6 của change `hermes-settings-modal`; xem
[Kết nối AI](README.md), mục "Model chính và dự phòng"):

- Lượt dịch **không tự đổi model**. Mỗi đề xuất gắn một model, và một chương không tự đổi giọng văn.
- Khi lượt dừng vì lỗi mà chính sách đánh dấu `fallback`, hộp thoại mời **"Dịch tiếp bằng Y"**.
- Bấm thì Mira dịch riêng các đoạn còn thiếu bằng Y, vào một đề xuất mới.

**Hai phương án đã cân nhắc và không chọn:**

- **B:** tự chuyển theo danh sách Dự phòng, cho phép một chương do hai model dịch.
- **C:** như B, kèm công tắc riêng cho việc dịch.

**Còn lại cho tác vụ nhiều chương (đề xuất).** Cách A cần người bấm. Khi dịch nhiều chương không có người
trông, có thể dùng hai ý của Hermes (`agent/fallback_cooldown.py`, `cron/quota_hold.py`):

- giữ tác vụ lại tới khi quota mở lại, rồi chạy tiếp bằng model chính;
- chỉ đổi model ở **ranh giới chương**, nên mỗi chương vẫn chỉ một model.

Lab không bao giờ đổi model.

## 11. Phân tích: ghi chú văn phong vừa duyệt vào prompt lúc nào (đề xuất)

**Đã có (quan sát):** change `translation-context-snapshot` (đã archive 2026-10-08) chụp ngữ cảnh **một
lần** khi lập kế hoạch dịch một chương. Mọi lô, lượt chia lô và lượt hỏi lại đều dùng bản chụp đó. Sửa
glossary giữa lượt thì lượt vẫn chạy bản cũ, và giao diện báo cần lập kế hoạch lại.
`context-assembly.md` xếp "style đã duyệt" vào khối A, cố định trong một bản chụp.

**Đề xuất: theo đúng hợp đồng bản chụp, mỗi nơi một nhịp.**

| Nơi dùng | Ghi chú mới vào khi nào | Lý do |
| --- | --- | --- |
| Lượt dịch chương đang chạy | Không vào | Giữ bản chụp bất biến; trace và Lab dựng lại được request |
| Lượt dịch kế tiếp, kể cả chương kế tiếp của một tác vụ nhiều chương | Ngay khi lập kế hoạch | Mỗi chương tự chụp ngữ cảnh lúc bắt đầu |
| Chat | Lượt chat kế tiếp | Người dùng vừa duyệt trong chính cuộc trò chuyện; nếu model "quên" thì khó hiểu. Đổi system prompt làm mất cache một lần, chấp nhận được vì chat ít lượt |

Hermes chọn nhịp chậm hơn cho chat (snapshot cố định cả phiên) vì phiên agent của nó dài và tốn token.
Panel chat của Mira ngắn, nên lợi ích cache không bù được việc model bỏ qua điều vừa duyệt.

**Hệ quả:**

- Hash bản chụp trong trace cho biết chương nào được dịch trước khi có ghi chú.
- Sau này có thể gợi ý "N chương đã dịch trước ghi chú này; dịch lại?". Gợi ý này chỉ tạo đề xuất, không
  ghi thẳng.

---

[Kết nối AI](README.md) · [Cài đặt và lớp provider của Hermes](hermes-settings-and-adapters.md) ·
[Roadmap Trợ lý](../proposals/agent-roadmap.md) · [Mục lục module](../README.md)
