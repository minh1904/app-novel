> **Ghi chú khi khép change:** D5 (backup và restore) và D7 (provider) được chuyển nguyên sang change `content-backup-provider` cùng các spec `content-model`, `work-backup`, `translation-provider`; phần chương của D8 chuyển sang `work-detail-screen`. Các mục đó ở đây chỉ còn là bối cảnh thiết kế, không phải cam kết đã làm.

## Context

Lý do và phạm vi: xem `proposal.md`. Hiện trạng liên quan:

- Main process chỉ có một IPC `app:info`, kèm kiểm tra người gửi; preload phơi `window.mira` qua `contextBridge`; renderer chạy sandbox, CSP chặt.
- Thư viện chạy trên `sampleWorks` trong `App.tsx`; kiểu `Work` và hàm định dạng nằm trong `features/library/works.ts`.
- Chưa có test runner. `package.json` khai `engines.node >=22.12`.
- Điều đã chốt ở handbook: một file SQLite mỗi tác phẩm + `library.db` nhỏ, WAL, `synchronous=FULL`, backup bằng `VACUUM INTO`, link trỏ segment ID ([khả thi kỹ thuật](../../../../docs/handbook/research/technical-feasibility.md)).

**Bằng chứng mới (2026-09-29):** smoke-test chạy trong Electron 44.4.5 (Node 24.21.0) xác nhận `node:sqlite` load được không cần flag, SQLite 3.53.4, `journal_mode=WAL`, ghi/đọc `xin chào 你好` đúng, `VACUUM INTO ?` với tham số tạo được tệp, và có hàm `backup`. Chưa kiểm chứng: đóng gói bằng electron-vite/electron-builder, chịu crash thật, chạy sau khi cài.

## Goals / Non-Goals

**Goals:**
- Lớp lưu trữ bền, kiểm thử được bằng Node thường (không cần Electron) và thay được engine SQLite mà không đụng phần còn lại.
- Hợp đồng IPC nhỏ, có kiểu, không lộ đường dẫn tệp cho renderer.
- Thư viện thật thay dữ liệu mẫu mà không đổi bố cục màn hình.

**Non-Goals:**
- Soạn thảo, nhập raw, chia câu, trạng thái dịch/đã soát của segment, job dịch (M1).
- Lịch sử phiên bản và snapshot (M1, cùng autosave).
- Khóa API, provider thật, mạng (M2). Tài khoản/đồng bộ (sau bản đầu).
- Chuyển DB sang tiến trình riêng (chỉ chừa đường, xem Risks).

## Decisions

### D1. Dùng `node:sqlite` có sẵn, bọc sau một adapter mỏng

Chọn `node:sqlite` (Electron 44 → Node 24.21). Không thêm dependency runtime, không cần rebuild native, không cần `asarUnpack`. Toàn bộ chỗ chạm engine nằm trong một module (`storage/sqlite.ts`: mở DB, `pragma`, `transaction()`, `prepare`), các module khác chỉ dùng adapter này.

Phương án khác: `better-sqlite3` (trưởng thành, nhưng cần `@electron/rebuild` theo ABI mỗi lần nâng Electron); `sql.js`/`wa-sqlite` (giữ DB trong bộ nhớ hoặc chạy ở renderer, trái yêu cầu bền và ranh giới IPC).
**Đã kiểm chứng khi triển khai (2026-09-29):** `electron-vite build` để `node:sqlite` và `valibot` là external (`require(...)` trong `out/main/index.js`, preload không kéo theo valibot). Bản `electron-builder --dir` (asar) mở được và tạo `library.db`; bước NSIS trên máy thử lỗi ở giải nén `winCodeSign` vì thiếu quyền tạo symlink của Windows, không liên quan tới mã. Script `pnpm smoke:sqlite` chạy trong Electron thật để bắt lỗi sau mỗi lần nâng Electron.

Rủi ro: `node:sqlite` mới ở mức release candidate, API có thể đổi → adapter là chỗ duy nhất phải sửa; đường lùi là `better-sqlite3` với cùng adapter.

### D2. Hai tầng tệp, tệp tác phẩm là nguồn sự thật

```text
<userData>/
  library.db                 chỉ mục: danh sách tác phẩm, cài đặt
  works/
    <workId>.mira            một tệp SQLite mỗi tác phẩm (nguồn sự thật)
    .tmp/                    tệp tạm khi restore/backup (*.part), luôn bị bỏ qua khi quét
```

- Metadata tác phẩm (tên, trạng thái, lưu trữ, chương gần nhất, `updated_at`) được ghi trong **tệp tác phẩm**; `library.db` giữ bản sao để liệt kê nhanh mà không mở từng tệp.
- Sau mỗi thay đổi: commit vào tệp tác phẩm trước, rồi cập nhật `library.db`. Hai tệp không nguyên tử với nhau, nên khi khởi động **đối chiếu**: quét `works/*.mira`, đọc dòng `work` của từng tệp, upsert vào chỉ mục, xóa mục chỉ mục không còn tệp. `library.db` mất hoặc hỏng thì dựng lại được, không mất dữ liệu.
- Tệp tác phẩm mở không được (hỏng, schema mới hơn) không làm hỏng danh sách: `work:list` trả thêm mảng `problems` (id, mã lỗi) để UI hiện dòng "không mở được" (spec `work-storage`: hai tác phẩm độc lập).
- ID tác phẩm là UUID v4 sinh bằng `crypto.randomUUID()`. ID chương/segment chỉ cần duy nhất trong một tệp (không dùng `ATTACH` giữa các tác phẩm).

Phương án khác: một DB duy nhất cho mọi tác phẩm (đơn giản nhưng backup một tác phẩm phải xuất từng phần và một lỗi ảnh hưởng tất cả).

### D3. PRAGMA và nhận diện tệp

Mỗi kết nối mở tác phẩm: `journal_mode=WAL`, `synchronous=FULL`, `foreign_keys=ON`, `busy_timeout=5000`. Tệp tác phẩm mang `PRAGMA application_id` cố định (hằng số "MIRA" 0x4D495241) và `PRAGMA user_version` là phiên bản schema. `application_id` là cách nhận ra tệp Mira khi restore. Migration là danh sách hàm có thứ tự, mỗi bước chạy trong một transaction cùng lúc tăng `user_version`; `user_version` lớn hơn bản app hiểu → từ chối mở, không ghi.

### D4. Schema tệp tác phẩm (phiên bản 1)

```text
work(id, title, original_title, description, cover_path,        -- đúng một dòng
     source_lang CHECK IN ('en','zh-Hans','zh-Hant','ja'), target_lang DEFAULT 'vi',
     status CHECK IN ('not-started','in-progress','paused'), archived,
     last_chapter_id, created_at, updated_at)
chapter(id, position, title, created_at, updated_at)
chapter_text(chapter_id, side CHECK IN ('source','target'), content, rev, updated_at,
             PRIMARY KEY (chapter_id, side))
segment(id, chapter_id, side, position, start_offset, end_offset, text_rev,
        status CHECK IN ('ok','dirty','orphaned'), anchor_text)
link(id, chapter_id, kind CHECK IN ('ai','user'), confidence,
     status CHECK IN ('ok','needs_review','broken'), created_at, reviewed_at)
link_member(link_id, segment_id, position, PRIMARY KEY (link_id, segment_id))
provenance(segment_id PRIMARY KEY, origin CHECK IN ('human','ai','mock','import'),
           provider, model, at)
```

- **Schema v2** thêm `work.author` và `work.genre` (văn bản, tùy chọn) và hai cột tương ứng trong `work_index`, bằng `ALTER TABLE ... ADD COLUMN` trong migration riêng; v1 giữ nguyên trong snapshot. Đã kiểm chứng trong Electron thật: dữ liệu v1 có sẵn được nâng cấp tại chỗ, giữ nguyên nội dung.
- **Schema v3** thêm bảng `cover` (một dòng, `mime = 'image/jpeg'`, `data BLOB`) trong tệp tác phẩm để sao lưu một tệp là đủ, và cột `cover_version` (bằng `cover.updated_at`) trong `work_index` làm khóa bộ nhớ đệm. Cột `work.cover_path` của v1 không dùng nữa nhưng giữ lại vì SQLite không bỏ cột nếu không dựng lại bảng.
- Tên bảng/cột tránh từ khóa SQL (`text`, `end`) nên không truy vấn nào cần đặt trong dấu nháy. Ràng buộc "một tệp một tác phẩm" là chỉ mục duy nhất trên biểu thức hằng `((1))`. Giữ nguyên `CHECK` cho ngôn ngữ, trạng thái, tên không rỗng, `target_lang = 'vi'`, `end_offset >= start_offset`. Schema v1 được đóng băng bằng test snapshot (`__fixtures__/*.schema.sql`); thay đổi sau khi phát hành phải là migration mới.
- Thời điểm lưu là số nguyên mili-giây UTC. `chapter.position` là số nguyên; sắp xếp lại reindex cả danh sách trong một transaction (không ràng buộc UNIQUE để tránh xung đột trung gian). Số thứ tự hiển thị suy từ `position`.
- **Bất biến neo:** mọi thao tác đổi `text.content` chạy trong một transaction cùng lúc thay toàn bộ segment cùng `(chapter_id, side)` và đặt `segment.text_rev = text.rev` mới. Lớp repository là nơi duy nhất ghi hai bảng này.
- **Xung đột revision:** ghi nhận `expectedRev`; `UPDATE ... WHERE rev = ?` và kiểm số dòng bị ảnh hưởng, 0 dòng → lỗi `conflict`.
- **Xóa segment có link:** trigger `BEFORE DELETE ON segment` đặt các `link` chứa nó thành `needs_review`, rồi `link_member` bị xóa theo khóa ngoại `ON DELETE CASCADE`. Link mất hết thành viên vẫn còn với trạng thái `needs_review`.
- Trạng thái dịch (Chưa dịch/AI đã dịch/Đã soát) **không lưu ở bảng này** ở M0: "chưa dịch" suy từ việc segment nguồn không có liên kết; các trạng thái còn lại thêm ở M1 bằng migration.
- `library.db`: `work_index(id, title, status, archived, source_lang, chapter_count, last_chapter_id, last_chapter_position, last_chapter_title, updated_at, file_name)`, `meta(key, value)`. Không có bảng hoạt động gần đây: khung "Hoạt động gần đây" bị gỡ khỏi màn thư viện ở M0 (chủ sản phẩm chốt 2026-09-29, ưu tiên thư viện tác phẩm trước) và có thể thêm lại bằng migration sau này.

### D5. Backup = một tệp tác phẩm nhất quán; restore = kiểm tra rồi đổi tên nguyên tử

- **Backup:** `VACUUM INTO` từ kết nối đang mở vào `<đích>.part` (đường dẫn do hộp thoại lưu của main process chọn, không nhận từ renderer), kiểm tra bản `.part`, rồi đổi tên thành tệp đích. Tệp backup **chính là một tệp tác phẩm hợp lệ** (đuôi `.mira`), nên không có định dạng thứ hai để bảo trì.
- **Restore:** hộp thoại mở tệp → sao chép sang `works/.tmp/<newId>.part` → kiểm tra bản sao (không mở tệp gốc của người dùng tại chỗ): `application_id` khớp, `user_version` ≤ bản app hiểu, `PRAGMA integrity_check` = `ok`, `PRAGMA foreign_key_check` rỗng, các bảng bắt buộc có mặt → nâng cấp schema nếu cần → ghi `work.id` mới → **đổi tên thành `works/<newId>.mira` (điểm cam kết)** → upsert chỉ mục. Gián đoạn trước bước đổi tên: chỉ còn tệp `.part` bị bỏ qua và dọn ở lần khởi động sau. Gián đoạn sau bước đổi tên: tệp đã hoàn chỉnh và bước đối chiếu khi khởi động nạp nó vào chỉ mục.
- Vì ID chương/segment chỉ duy nhất trong một tệp nên restore chỉ phải đổi `work.id`; không cần ánh xạ lại ID.

### D6. IPC: kênh theo miền, kết quả có kiểu, lỗi là dữ liệu

- Kênh dạng `works:list`, `works:get`, `works:create`, `works:update` (đã có), rồi `chapters:*`, `text:*`, `backup:*`. Tên kênh nằm trong `src/shared/channels.ts` (không import runtime để preload sandbox đóng gói được), kiểu và schema valibot của dữ liệu nằm trong `src/shared/library.ts`, dùng chung cho preload và main; preload chỉ là ánh xạ mỏng gọi `ipcRenderer.invoke`.
- Mọi handler qua một hàm bao chung: kiểm tra người gửi (giữ đúng cách của `app:info`), xác thực đầu vào bằng **valibot** (ADR-003; schema là nguồn duy nhất cho cả kiểu lẫn kiểm tra, lỗi trả kèm đường dẫn trường để form hiện đúng chỗ), bắt lỗi và trả `{ ok: true, value } | { ok: false, error: { code, message } }`. Điều này vì Electron chỉ giữ chuỗi thông báo của lỗi bị ném, mất phân loại.
- Mã lỗi: `validation`, `not_found`, `conflict`, `unsupported_version`, `corrupt`, `io`, `cancelled`, `untrusted_sender`, `internal` (lỗi không lường trước, thông báo chung, chi tiết chỉ ghi log ở main). Người gửi hợp lệ chỉ khi là khung chính của cửa sổ chính của ứng dụng; quy tắc này là hàm thuần `guardHandlers` để test không cần Electron.
- Renderer không bao giờ gửi đường dẫn: hộp thoại lưu/mở do main mở; `cover_path` (nếu dùng) là tệp trong thư mục dữ liệu, không phải đường dẫn người dùng.
- Thư mục dữ liệu lấy từ `app.getPath('userData')`, cho phép ghi đè bằng biến môi trường `MIRA_DATA_DIR` để chạy test và tách dữ liệu dev.

### D7. Provider: giao diện hẹp, đối chiếu ID là hàm thuần

```text
TranslationProvider { id; translate(request, { signal }): Promise<TranslateResponse> }
request  = { sourceLang, targetLang, segments: [{ id, text }], context? }
response = { provider, model, items: [{ id, text }] }
ProviderError = { kind: rate_limited | network | auth | refused | invalid_response | cancelled,
                  retryable, retryAfterMs? }
```

- `reconcile(request, response)` là hàm thuần dùng chung cho mọi provider: gắn kết quả theo ID, trả `{ matched, missing, extra, duplicates }`; ID thiếu là lỗi có thể thử lại, ID thừa bị bỏ, ID trùng lấy kết quả đầu và báo. Hàm này được kiểm thử độc lập với provider.
- Provider giả lập: dịch xác định (`[giả lập] <nguồn>`), có tùy chọn độ trễ và các chế độ lỗi (giới hạn tốc độ, lỗi mạng, thiếu ID, ID trùng, xáo thứ tự, phản hồi rỗng); tôn trọng `AbortSignal`; nguồn gốc luôn là `mock`.
- M0 chỉ kiểm thử provider bằng test đơn vị; chưa có giao diện gọi nó (job dịch và UI là M1). Không đăng ký IPC cho provider ở M0.

### D8. Thư viện thật

- Renderer đọc danh sách qua `work:list`, giữ danh sách trong state React và làm mới sau mỗi thao tác (không cần store toàn cục ở M0). `works.ts` chỉ giữ kiểu, nhãn, `isRecent`, `byUpdated`; `sampleWorks` bị xóa.
- **Gỡ khung "Hoạt động gần đây":** xóa `ActivityPanel` (đang được render ở hai chỗ trong `LibraryScreen`: dưới danh sách ở màn hẹp và ở cột phụ ở màn rộng), kiểu `Activity`/`ActivityKind` và `sampleActivities`. Cột phụ chỉ còn khung "Tiếp tục"; nếu không có tác phẩm nào để tiếp tục thì ẩn cả cột và để danh sách chiếm hết chiều rộng.
- Tìm không dấu: hàm thuần chuẩn hóa NFD, bỏ dấu tổ hợp, đổi `đ/Đ` thành `d` (NFD không phân rã `đ`), hạ chữ thường, rồi so `includes`. Chạy ở renderer trên danh sách đã tải.
- `ChapterRef.excerpt` (trích đoạn "dòng dịch cuối") chưa có nguồn dữ liệu ở M0 nên trở thành tùy chọn; UI ẩn dòng trích khi thiếu. Chương gần nhất chỉ hiển thị số thứ tự và tiêu đề.
- Màn "tạo tác phẩm" thay `PendingScreen` bằng biểu mẫu thật (tên + ngôn ngữ nguồn, còn lại tùy chọn). Màn tổng quan tác phẩm/danh sách chương là bản tối giản: liệt kê, thêm, đổi tên, sắp xếp chương. Mở một chương vẫn dẫn tới màn "editor chưa xây" cho đến M1.
- **Ảnh bìa:** renderer đọc tệp người dùng chọn bằng `<input type=file>` hoặc kéo thả (không có đường dẫn nào đi qua IPC), giải mã bằng Chromium (JPEG, PNG, WebP, AVIF, GIF), đặt nền trắng, thu nhỏ vừa khung 600×900 và mã hóa JPEG; chỉ JPEG kết quả (data URL, tối đa 1 MiB) được gửi đi. Main kiểm tra lại tiền tố, kích thước và dấu hiệu đầu/cuối JPEG trước khi lưu. `works:list` chỉ trả `coverVersion`; ảnh được lấy theo yêu cầu qua `works:cover:get` và giữ trong bộ nhớ theo khóa `id:version`, nên bìa không đổi thì không bao giờ tải hai lần và danh sách không kéo theo hàng trăm KB dữ liệu ảnh.
- **Bố cục form tạo:** ảnh bìa nằm ở cột riêng bên trái, mọi trường xếp một cột bên phải cùng độ rộng, mô tả ở cuối; màn hẹp thì bìa lên trên.
- "Mở tác phẩm có sẵn" ở thư viện được nối thành **khôi phục từ backup** (chốt hành vi còn mở ở handbook `first-run`).

### D9. Kiểm thử

- Thêm Vitest (dev dependency) và script `pnpm test`. Đặt `engines.node >=24` cho khớp Node của Electron 44 (`node:sqlite` không cần flag từ 22.13, nhưng tránh chạy test trên bản cũ hơn Electron).
- Test lớp lưu trữ chạy trực tiếp trên Node với thư mục tạm; **test crash** khởi chạy một tiến trình con Node ghi dữ liệu rồi bị kill giữa transaction, sau đó mở lại tệp và kiểm tra nhất quán.
- Giữ một script smoke chạy trong Electron thật (`node:sqlite` load được, WAL, `VACUUM INTO`) để bắt lỗi khi nâng Electron.
- Không có E2E giao diện ở M0; kiểm tra tay các luồng thư viện, kèm `pnpm typecheck` và `pnpm lint`.

## Risks / Trade-offs

- **`DatabaseSync` chặn main process** → ghi ngắn (một chương ~50k ký tự là vài ms); mọi truy cập qua repository nên có thể chuyển sang `utilityProcess` sau mà không đổi IPC. Đo trước khi tối ưu.
- **`node:sqlite` chưa ổn định hẳn** → adapter một chỗ (D1), smoke test trong Electron, đường lùi `better-sqlite3`.
- **`VACUUM INTO` chưa kiểm chứng với tệp WAL lớn và trên ổ đích khác** → task kiểm thử bằng tệp vài chục MB; nếu chậm, dùng API `backup()` có tiến trình.
- **Hai tệp không nguyên tử (tác phẩm + chỉ mục)** → tệp tác phẩm là nguồn sự thật, chỉ mục dựng lại được (D2).
- **Antivirus/đồng bộ đám mây khóa tệp SQLite** → `busy_timeout`, lỗi `io` có phân loại; thư mục dữ liệu nằm ở `AppData` chứ không ở thư mục người dùng tự chọn.
- **Đổi tên tệp nguyên tử trên Windows** → `rename` có thể lỗi khi đích bị khóa; đích luôn là tên mới (UUID), không ghi đè.
- **Khóa `application_id`/`user_version` là hợp đồng dài hạn** → ghi vào spec `work-storage` khi archive; không đổi hằng số sau khi có dữ liệu người dùng.

## Migration Plan

Không có dữ liệu người dùng trước đó nên không cần migrate. Lần chạy đầu tạo `library.db` và thư mục `works/`. Gỡ dữ liệu mẫu khỏi đường chạy thật. Hoàn tác: revert commit; thư mục dữ liệu chỉ do mã mới tạo nên có thể xóa an toàn ở máy thử. Khi có phiên bản schema thứ hai, thêm bước migration vào danh sách có thứ tự và test nâng cấp từ tệp mẫu của phiên bản 1 (tạo và giữ một tệp fixture v1 ngay từ M0).

## Open Questions

- Đuôi tệp: `.mira` cho cả tệp tác phẩm và tệp backup (đề xuất) hay tách `.mira` / `.mirabak`? Đổi sau khi phát hành sẽ tốn công, nên chốt trước khi có bản cho người dùng.
- Khi nào chuyển DB sang `utilityProcess`: chỉ khi đo được main process bị chặn trong M1 (autosave khi gõ); không cần trả lời để bắt đầu M0.
