# Baseline và nhật ký kiểm chứng — `refactor-electron-structure`

Đo ngày **2026-10-03** trên `main` tại commit `0600221`, Windows 11, Node 24.19.0, Electron 44.4.5. Mọi lệnh chạy bằng `node_modules/.bin/...` vì `pnpm test/lint/typecheck` thoát mã 0 mà không chạy gì trên máy này.

## 1. Baseline (task 1.1)

| Mục | Kết quả |
| --- | --- |
| Git | `main` sạch; chỉ còn `openspec/changes/refactor-electron-structure/` (kế hoạch, chưa commit) và tệp rỗng `winget` (không thuộc change, **không đụng**) |
| `tsc -p tsconfig.node.json --composite false` | thoát 0 |
| `tsc -p tsconfig.web.json --composite false` | thoát 0 |
| `eslint --quiet .` | thoát 1: đúng **2 lỗi** `no-irregular-whitespace` ở `src/shared/rawText.ts` dòng 161 và 199 |
| `eslint .` (cả cảnh báo) | 2 lỗi + **30.576 cảnh báo** (`Delete ␍`, do CRLF của `core.autocrlf=true` so với `end_of_line = lf`) |
| `eslint .` sau R1 (task 2.3, 2.4) | **0 lỗi, 64 cảnh báo** (63 `prettier/prettier` thật + 1 `react-hooks/exhaustive-deps`, đều có sẵn từ trước, ngoài phạm vi change) |
| `vitest`, pha A (song song, bỏ 5 tệp nhạy đồng hồ) | 57 tệp, **749 test** qua; 3/3 lần |
| `vitest`, pha B (`--no-file-parallelism`, 5 tệp) | 5 tệp, **114 test** qua; 3/3 lần |
| Tổng | 62 tệp, **863 test** (749 + 114) |
| Câu import `shared` | `main` 108 (44 tệp), `renderer` 81 (48 tệp), `preload` 12 (1 tệp) |
| `out/preload/index.js` | 5.823 byte; `require` duy nhất: `require("electron")` |
| `out/main/index.js` | `require` ngoài: `electron`, `node:crypto`, `node:fs`, `node:path`, `node:sqlite`, `valibot` |
| `out/renderer/assets/index-*.js` | 2.176,05 kB |
| `electron-vite build` | thoát 0 |

## 2. Bộ test song song không tin được (phát hiện khi triển khai)

Chạy cả 62 tệp song song cho kết quả khác nhau mỗi lần:

| Lần | Điều kiện | Kết quả |
| --- | --- | --- |
| 1 | có `electron-vite dev` chạy nền | đỏ 1 (`rows.test.ts`) |
| 2 | như trên | đỏ 1 (`crash.test.ts` › edits chapters) |
| 3 | như trên | đỏ 2 (`crash.test.ts` ×2) |
| 4 | máy rảnh (đã tắt dev server) | đỏ 2 (`rows`, `crash` › edits chapters) |
| 5 | như trên | đỏ 1 (`rows`) |
| 6 | như trên | xanh 863/863 |

Mỗi tệp đỏ đều qua khi chạy riêng. Năm tệp có assertion phụ thuộc đồng hồ: `rows.test.ts` (< 50 ms), `segmenter.test.ts` (< 500 ms), `segmentMap.test.ts` (< 2 ms mỗi thao tác), `providers.test.ts` (hủy sau 20 ms, chờ ≥ 50 ms), `crash.test.ts` (giết tiến trình theo hẹn giờ). Cô lập chúng ở một pha tuần tự cho 3/3 xanh ở **cả hai pha** (mục 1). Đã ghi vào D5 của `design.md`.

Một phiên `electron-vite dev` (PID 5396, mở 11:10, không phải của phiên này) chạy nền làm tệ hơn; chủ sản phẩm đã tắt nó trước khi đo các lần 4–6 và baseline ở mục 1.

## 3. Độ chập chờn của `crash.test.ts` khi chạy riêng (task 1.2)

| Lần | Kết quả | Thời gian |
| --- | --- | --- |
| 1 | 4/4 qua | 13,31 s |
| 2 | 4/4 qua | 12,91 s |
| 3 | 4/4 qua | 13,63 s |

Mốc để so sau R2 và R6: **4/4 qua, ~13 s, ba lần liền**.

## 4. Quyết định về Git (task 1.3)

Chủ sản phẩm chọn **tự đẩy `origin/main` sau mỗi bước R xanh** (đủ `node scripts/check.mjs --build`). Quyết định có hiệu lực cho change này; mỗi bước vẫn `git revert`-được riêng. Ghi nhận ngày 2026-10-03.

## 5. Luật lint được chứng minh bắt được (task 2.7, 3.7, 5.5, 4.2)

Cách làm: với mỗi luật, tạo một tệp vi phạm tạm (không commit) trong đúng vùng, chạy `eslint -f json` trên nó, ghi thông điệp, xóa tệp (khối `finally`). Đối chứng dương: lint toàn repo vẫn 0 lỗi dù `ipc/library.ts` và `storage/electronSafeStorage.ts` import `electron`.

### R1, bố cục hiện tại (task 2.7), 11/11 bắt được

| Vi phạm cố ý | Thông điệp thấy được (rút gọn) |
| --- | --- |
| `shared` → `node:fs` | shared/ cũng chạy trong renderer và preload (sandbox) nên không dùng module Node (node:*) |
| `shared` → `electron` | shared/ chạy ở main, preload và renderer nên không import electron |
| `shared` → `react` | shared/ không phụ thuộc giao diện. Mã React nằm ở src/renderer |
| `shared` → `../main/storage/library` | shared/ không được import từ src/main |
| `renderer` → `../../main/storage/library` | Renderer không import từ src/main. Dùng kiểu và hợp đồng trong src/shared |
| `renderer` → `node:path` | Renderer chạy trong trình duyệt sandbox, không có module Node (node:*) |
| `renderer` → `electron` | Renderer chỉ nói chuyện với main qua window.mira (preload). Không import electron |
| `preload` → `../main/storage/library` | Preload không import từ src/main. Chỉ dùng hợp đồng trong src/shared |
| `preload` → `node:fs` | Preload chạy trong sandbox: chỉ require được electron, không dùng module Node (node:*) |
| `main` (ngoài danh sách) → `electron` | Chỉ index.ts, ipc/library.ts và storage/electronSafeStorage.ts được import electron |
| `main` → `../renderer/src/App` | Main không import từ src/renderer |

Luật dùng `regex` (không dùng `group`) cho đường dẫn vì chuỗi tương đối kiểu `../main/…` được so khớp đúng; đã kiểm bằng chính các ca trên.

### R2, bố cục theo tầng (task 3.7): 14/14 vi phạm bị bắt, 5/5 ca đối chứng sạch

| Vi phạm cố ý | Thông điệp thấy được (rút gọn) |
| --- | --- |
| `infra` → `services/` | infra/ là tầng thấp nhất của main: không import từ services/ |
| `infra` → `electron` (gói) | Chỉ index.ts và main/electron/ được import electron |
| `infra` → `electron/` (thư mục) | infra/ không import từ electron/ |
| `infra` → `ipc/` | infra/ không import từ ipc/ |
| `infra` → `testing/` (không phải test) | main/testing/ là công cụ chỉ dành cho test; mã chạy thật không được import nó |
| `services` → `ipc/` | services/ không import từ ipc/ (ipc gọi services, không ngược lại) |
| `services` → `electron` (gói) | Chỉ index.ts và main/electron/ được import electron |
| `services` → `electron/` (thư mục) | services/ không import từ electron/ |
| `services/library` → `services/ai` | services/library không import từ services/ai (dịch chương dùng LibraryStore, không ngược lại) |
| `services/library` → `electron` (gói) | Chỉ index.ts và main/electron/ được import electron |
| `ipc` → `electron` (gói) | Chỉ index.ts và main/electron/ được import electron |
| `ipc` → `electron/` (thư mục) | ipc/ không import từ electron/. Giữ handler thuần để test không cần dựng cửa sổ |
| `electron/` → `testing/` (không phải test) | main/testing/ là công cụ chỉ dành cho test |
| `electron/` → `renderer` | Main không import từ src/renderer |

Đối chứng (phải **không** có lỗi `no-restricted-imports`): `electron/` → gói `electron`; `services` → `infra`; `ipc` → `services`; một tệp `*.test.ts` → `testing/`; một tệp `crash*.ts` → `testing/`. Cả năm sạch.

### R3, tính đầy đủ theo kiểu còn nguyên (task 4.2)

Mỗi tệp khu vực trả `AreaHandlers<tiền tố>` (chỉ các kênh mang tiền tố đó, và không kênh nào khác); `createLibraryHandlers` vẫn trả `Record<Channel, …>` nên phải phủ đủ mọi kênh. Ba lần phá cố ý, mỗi lần khôi phục nguyên byte (`cmp`), sau cùng `tsc` thoát 0:

| Phá cố ý | Lỗi `tsc` thấy được |
| --- | --- |
| Gỡ `chapters:move` khỏi `handlers/chapters.ts` | TS2741: Property '"chapters:move"' is missing in type … |
| Thêm `[CHANNELS.textGet]` (kênh của khu vực khác) vào `handlers/works.ts` | TS2353: … '[CHANNELS.textGet]' does not exist in type 'AreaHandlers<"works">' |
| Bỏ `...chatHandlers(deps)` khỏi `createLibraryHandlers` | TS2739: Type '{ "ai:connections:list": … }' is missing the properties … (các kênh `ai:chat:*`) |

Đây là bảo đảm **mạnh hơn** trước: trước đây chỉ có kiểm tra tổng; nay thêm kênh `works:foo` mà quên handler lỗi ngay ở `works.ts`.

### R4, `contracts` ≮ `algorithms` (task 5.5): 4/4 vi phạm bị bắt, 3/3 ca đối chứng sạch

| Ca | Kết quả |
| --- | --- |
| `contracts` → `../algorithms/segmenter` | bắt: contracts/ chỉ có kiểu, schema và tên kênh; không import từ algorithms/ |
| `contracts` → `node:fs` | bắt (luật của `shared/` được nhắc lại trong khối `contracts`) |
| `contracts` → `react` | bắt (như trên) |
| `algorithms` → `node:fs` | bắt (luật của `shared/`) |
| CONTROL `algorithms` → `../contracts/library` | sạch (chiều được phép) |
| CONTROL `contracts` → `./library` | sạch |
| CONTROL test trong `contracts` → `../algorithms/segmenter` | sạch (test được miễn; `rows.test.ts` đang làm đúng điều này) |

## 6. Phân loại test do công cụ dời đề xuất (task 3.2)

`node scripts/restructure/move-modules.mjs main --dry-run`: **80 tệp** dời (24 là test đặt theo quy tắc), **57 tệp** đổi nội dung (15 không dời), **174** câu `from` và **1** đường dẫn `join(__dirname, …)` được viết lại, **không có** specifier không giải được, **layer preflight: không vi phạm** trên bố cục đề xuất.

Quy tắc: test đi theo **mô-đun cùng tên** (trong cùng thư mục cũ); chỉ test không có mô-đun cùng tên mới đi theo tầng cao nhất nó import. Quy tắc "tầng cao nhất" đơn thuần (bản đầu của D2) đẩy 3 test lên `services/` chỉ vì chúng import thêm một service để kiểm thử tích hợp, nên đã đổi.

| Đích | Test |
| --- | --- |
| `services/library/` | `library`, `libraryCover`, `backup`, `chapters`, `content`, `crash` (+ 5 tệp `crash*` hỗ trợ, đặt tay) |
| `services/ai/` | `chatService`, `chatPrompt`, `chatTools`, `providers` |
| `infra/storage/` | `sqlite`, `migrate`, `schemaSnapshot` (đặt tay cùng `__fixtures__`), `workSchema`, `sentenceRows`, `connections`, `textRules`, `backupName`, `cover`, `image` |
| `infra/providers/` | `chatStream`, `keyPool`, `connectionKeySource`, `modelCatalog`, `openAiChat`, `openAiCompatible` |

Ba test mang tên một mô-đun ở `infra` nhưng cũng import một mô-đun tầng cao hơn: `modelCatalog.test.ts` (import `services/ai`), `connections.test.ts` và `sentenceRows.test.ts` (import `services/library`). Chúng ở lại cạnh mô-đun mang tên mình; test được miễn luật tầng nên không vi phạm gì.

Một tham chiếu đọc **mã nguồn** bằng `join(__dirname, …)` cần viết lại: `backup.test.ts` đọc `backupFile.ts` (dời sang `infra/storage`) và `library.ts` (sang `services/library`). Công cụ viết lại đúng 1 đường dẫn (`backupFile.ts`); `library.ts` cùng thư mục nên giữ. `crash.test.ts` và `schemaSnapshot.test.ts` dời cùng nhóm với tiến trình con và `__fixtures__`, đường dẫn tương đối giữ nguyên. `main/index.ts` có `join(__dirname, '../preload/index.js')` trỏ tới bản dựng, được bỏ qua có chủ ý.

## 7. Bảng trách nhiệm `LibraryStore` → `WorkFiles` (task 7.1) và bảng hành vi → test (task 7.2)

### 7.1 Mỗi thành viên của `LibraryStore` (567 dòng) thuộc đâu

Nguyên tắc: `WorkFiles` giữ mọi thứ về **tệp và chỉ mục trên đĩa** (bố cục thư mục dữ liệu, mở và phục hồi `library.db`, mở tệp tác phẩm, tạo tệp nguyên tử, nhập và xuất, đối soát); `LibraryStore` giữ **nghiệp vụ** (tác phẩm, chương, văn bản, hàng, ảnh bìa, ảnh) và mọi phương thức công khai. Mã chuyển **nguyên văn**, thứ tự thao tác giữ nguyên.

| Thành viên | Đi đâu | Ghi chú |
| --- | --- | --- |
| `dataDir`, `worksDir`, `tmpDir` | **WorkFiles** | bố cục thư mục dữ liệu |
| `index: Db`, `problems` | **WorkFiles** | `library.db` và kết quả đối soát; `LibraryStore.appDb` ủy quyền sang `index` |
| `now` | cả hai | `LibraryStore` giữ; `WorkFiles` nhận cùng hàm đó, chỉ gọi ở nhánh chỉ mục hỏng (`.corrupt-<now>`). Các test dùng đồng hồ đếm nên **số lần và thứ tự gọi `now()` không được đổi** |
| `newId`, `newChapterId`, `newContentId` | ở lại | sinh ID là nghiệp vụ |
| constructor (tạo `.tmp`, mở chỉ mục) và `open` (đối soát) | **WorkFiles.open** | `LibraryStore.open` dựng `WorkFiles` rồi `LibraryStore` |
| `appDb`, `newAppId`, `appNow` | ở lại | `appDb` ủy quyền |
| `list` | **WorkFiles.list** | truy vấn `work_index` và `problems` là chuyện chỉ mục; `LibraryStore.list` ủy quyền |
| `get`, `update`, `listChapters`, `createChapter`, `renameChapter`, `moveChapter`, `deleteChapter`, `readText`, `saveText`, `createLink`, `listLinks`, `saveRow`, `reviewRow`, `autoPairRows`, `setProvenance`, `getProvenance`, `openChapter`, `getCover`, `setCover`, `putImage`, `getImage`, `deleteImage`, `changeChapters` | ở lại | dùng `files.withWork` và `files.syncIndex` |
| `create` | **tách đôi** | ở lại: kiểm tên, giải mã bìa, sinh ID, đọc `now`, `insertWork` + `writeCover`. Sang `WorkFiles.createWorkFile`: tệp `.part`, mở, chạy bước dựng, đổi tên là điểm cam kết, dọn khi lỗi |
| `restoreWork` | **tách đôi** | ở lại: kiểm đường dẫn tuyệt đối, sinh ID. Sang `WorkFiles.importWorkFile`: sao chép, kiểm tra, đổi ID, checkpoint, đổi tên, dọn khi lỗi |
| `exportWork` | **WorkFiles.exportWork** | kiểm đích nằm ngoài thư mục dữ liệu là chuyện bố cục thư mục |
| `workPath`, `withWork`, `removeWorkFiles`, `openIndex`, `openAndMigrateIndex`, `reconcile`, `readSummaryFromFile`, `syncIndex`, `upsertIndex` | **WorkFiles** | |
| `WORK_EXTENSION`, `PART_EXTENSION`, `IndexRow` | **WorkFiles** | |
| `close` | ủy quyền | đóng `index` |

Một tham chiếu phải đổi ngoài `library.ts`: `backup.test.ts` dòng 364 đọc thành viên **private** `library['worksDir']`, mà `worksDir` chuyển sang `WorkFiles`. Test đã biết thư mục dữ liệu nó tạo, nên dùng thẳng đường dẫn đó thay vì thò vào lớp. Đây là chỗ cần ngoại lệ cho tiêu chí "không sửa tệp nào ngoài `library.ts` và tệp mới". **Khi làm thật còn thêm một chỗ nữa tôi đã bỏ sót ở bước phân tích:** `ipc/backupHandlers.test.ts` dòng 121 đọc `library['dataDir']` (tôi chỉ tìm `worksDir`, `tmpDir`, `index`). `tsc` không bắt được truy cập bằng ngoặc vào thành viên đã biến mất; chỉ bộ test báo lỗi. Hai test, cả hai sửa để dùng thư mục dữ liệu chúng tự tạo.

### 7.2 Hành vi chuyển đi → test đang khóa nó

| Hành vi | Test |
| --- | --- |
| Mở lần đầu, kho rỗng | `library`: starts empty on first run without errors |
| Tệp tác phẩm hỏng không làm hỏng các tác phẩm khác, được báo | `library`: keeps other works usable when one work file is corrupt and reports the problem |
| `library.db` hỏng được đặt sang bên và dựng lại | `library`: sets aside a corrupt library.db and rebuilds it |
| Thiếu `library.db` thì dựng lại từ tệp tác phẩm | `library`: rebuilds the index from work files when library.db is missing |
| Chỉ mục lệch tệp thì được sửa | `library`: repairs an index that drifted from the work file |
| Tệp từ schema mới hơn bị từ chối, không bị sửa | `library`: refuses a work file from a newer schema without modifying it |
| Tên tệp không khớp ID bên trong thì được báo | `library`: reports a work file whose name does not match the work inside |
| Dọn `.tmp` lúc khởi động | `library`: removes leftover partial files on startup…; `backup`: cleans a half-finished restore left in .tmp at the next start |
| ID lạ và ID không phải UUID | `library`: reports unknown ids as not found and refuses ids that are not UUIDs |
| Tên rỗng không tạo tệp | `library`: rejects an empty or whitespace-only title and creates nothing |
| Bìa sai không tạo tệp | `libraryCover`: rejects an invalid cover without changing the work or creating a file |
| **Lỗi sau khi tệp `.part` đã có thì tệp bị dọn** | **khoảng trống đã được lấp**: `library`: leaves no partial file and lists nothing when a new work cannot be built (thêm trên mã chưa đổi; đột biến bỏ lệnh dọn thì test đỏ, khôi phục thì xanh) |
| Khôi phục: đủ nội dung, ngày, trạng thái, bìa; tác phẩm độc lập | `backup`: restores onto a clean profile…, keeps status, the last chapter and the dates…, adds an independent work… |
| Khôi phục từ chối tệp không đúng, và không đổi gì | `backup`: refuses what is not a good backup (8 ca: tệp văn bản, rỗng, SQLite lạ, cắt ngắn, trang hỏng, schema mới, thiếu bảng, hai tác phẩm) |
| Khôi phục nâng cấp bản cũ | `backup`: upgrades an older backup on the way in… |
| Xuất: đích ngoài thư mục dữ liệu, đường dẫn tuyệt đối, không để lại tệp dở | `backup`: refuses to back up into its own data directory or to a relative path; fails cleanly, leaving no partial file… |
| Tệp tác phẩm là đầy đủ hoặc không có, kể cả khi bị giết giữa chừng | `crash`: killing the process while it writes / edits chapters / saves chapter text / restores a backup |
| `library.db` dùng chung làm `appDb` | `connections` và `createServices` (`appDb` dùng để lưu kết nối và khóa) |

Không có test trực tiếp cho `syncIndex` khi cập nhật chỉ mục lỗi (chỉ `console.error`); đường đó chuyển nguyên văn và được chỉ mục tự sửa ở lần mở sau (`repairs an index that drifted`).

## 8. So sánh trước/sau (task 8.2)

Trước: commit `0600221` (điểm xuất phát). Sau: `44fe5f6` (commit xóa công cụ), đo ngày 2026-10-03. Mọi số "sau" lấy từ lần chạy cuối của `node scripts/check.mjs --build`, `smoke-sqlite.mjs` dưới Electron và `out/`.

| Chỉ số | Trước | Sau |
| --- | --- | --- |
| Test | 863; **đỏ chập chờn** khi chạy cả bộ song song (mục 2) | **867**, xanh qua `check.mjs` (hai pha) mỗi lần từ R1 đến nay |
| Lỗi lint | 2 | **0** |
| Cảnh báo lint | 30.576 (khoảng 30.500 là nhiễu CRLF) | **63** (khác biệt định dạng thật có từ trước) |
| `tsc` | 399 + 812 tệp | 411 + 812 tệp (+12: 9 tệp `ipc/handlers/`, `createServices.ts` và test của nó, `workFiles.ts`) |
| `require` của preload | `electron` ×1, 5.823 byte | **giống hệt** |
| External của `main` | `electron`, `node:crypto`, `node:fs`, `node:path`, `node:sqlite`, `valibot` | **giống hệt** |
| JS renderer | 2.176,05 kB | **2.176,05 kB** |
| `smoke:sqlite` | lỗi cú pháp từ ngày thêm; **chưa từng chạy được** | **qua** (Electron 44.4.5, node 24.21.0, sqlite 3.53.4) |
| `crash.test.ts` riêng ×3 | 13,31 / 12,91 / 13,63 s, 4/4 | 13,40 / 13,44 / 15,26 s, 4/4. Cả ba lần qua; lần 15,26 s cao hơn dải baseline nhưng các lần đo ở R2 và R6 là 13,2–14,0 s, nên đây là dao động của máy chứ không phải chậm đi có hệ thống (không đo tải) |
| Git nhận ra đổi tên | — | **105/105** tệp dời (80 ở R2, 25 ở R4) |
| Câu import `shared` | `main` 108, `renderer` 81, `preload` 12 | `main` **118**, `renderer` 81, `preload` 12. `main` +10 gồm +9 từ R3 (9 tệp `handlers/` thêm 18 import, `libraryHandlers.ts` bỏ 9) và +1 từ R6 (`workFiles.ts`) |
| Tệp lớn nhất | `LibraryStore` 567 dòng; `libraryHandlers.ts` 215; `ipc/library.ts` 85 | `library.ts` **354** (+ `workFiles.ts` 287); `libraryHandlers.ts` **66**; `registerIpc.ts` **66** |
| Thư mục của `main` | `storage/` 43 tệp, `providers/` 27, `ipc/` 16 (trộn nhiều vai) | `infra/`, `services/`, `ipc/`, `electron/`, `testing/`; `shared/` thành `contracts/` + `algorithms/` |
| Ranh giới | giữ bằng kỷ luật | **9 khối lint**, mỗi luật đã chứng minh bắt được (11 + 14 + 4 ca vi phạm, 5 + 3 ca đối chứng sạch) |
| Commit | — | 34 commit sau `0600221` |

**Khởi động ứng dụng đã build** (bằng chứng thêm, không có baseline để so; không thay cho kiểm tay ở 8.3): chạy `electron .` với `MIRA_DATA_DIR` và `--user-data-dir` trỏ vào thư mục tạm. Sống sau 9 giây, cửa sổ tên "Mira", tiến trình main tạo `library.db` (cùng `-wal`, `-shm`) và `works/.tmp` đúng như `WorkFiles.open` phải làm, stderr và stdout trống, không còn tiến trình sót. Dữ liệu thật của người dùng không bị đụng.

Ba dòng khác baseline và vì sao: `tsc` thêm 12 tệp (đúng các tệp mới nêu trên); `main` thêm 10 câu import (đã giải thích đến từng tệp); `crash.test.ts` lần thứ ba chậm hơn dải cũ (dao động). Không có chỉ số chất lượng nào tệ đi.

## 9. Nhật ký thực hiện

### R1, xong (tasks 1.1–2.9)

Commit: `264f0e0` lệnh kiểm; `1d6d511` prettier `endOfLine: auto`; `7863072` `rawText.ts`; `f48baee` luật ranh giới; `44ee234` `AGENTS.md`; `f65d41a` hồ sơ change. Đã đẩy `origin/main`.

Phát hiện: bộ test song song chập chờn (mục 2) nên `check.mjs` chạy hai pha; một phiên `electron-vite dev` chạy nền làm tệ hơn.

### R2, xong (tasks 3.1–3.10)

Commit: `47c0ed8` công cụ dời; `74eadc7` sửa `smoke-sqlite.mjs`; `e69245e` sửa `--prove`; `ead59be` **lần dời**; `7d1cd89` bọc 3 dòng import; và một commit chú thích.

| Kiểm | Kết quả |
| --- | --- |
| Git nhận ra đổi tên | **80/80**, độ giống thấp nhất 72%; 98 tệp, 339 dòng thêm / 193 xóa |
| `--prove` | 95 tệp chỉ khác `HEAD` ở tham chiếu; bộ chứng minh được thử bằng một sửa đổi cố ý (đỏ), rồi khôi phục (xanh) |
| `--verify` | 790 tham chiếu tương đối đều giải ra |
| `tsc` | 399 + 812 tệp (bằng baseline) |
| Test | 863 = 749 + 114 |
| Lint | 0 lỗi, 63 cảnh báo (baseline 64) |
| Bundle | `require` của preload chỉ `electron` (5.823 byte, như baseline); phần external của main như baseline; JS renderer 2.125 KiB = 2.176 kB như baseline |
| `smoke:sqlite` | qua dưới Electron 44.4.5, node 24.21.0, sqlite 3.53.4 |
| `crash.test.ts` riêng ×3 | 4/4 qua, 13,27 / 13,21 / 13,24 s (baseline 13,31 / 12,91 / 13,63 s) |

Phát hiện: (1) `scripts/smoke-sqlite.mjs` có chú thích kiểu TypeScript từ ngày thêm (2026-09-29) nên **chưa từng chạy được**; đã sửa ở commit riêng. (2) `--prove` ban đầu báo sai 93 tệp vì CRLF của bản làm việc; đã sửa và kiểm lại bằng một sửa đổi cố ý. (3) Quy tắc đặt test đổi sang "mô-đun cùng tên trước" (mục 6). (4) Đường dẫn dài thêm làm 3 dòng import vượt 100 cột; bọc ở commit riêng để commit dời giữ là một lần dời thuần.

### R3, xong (tasks 4.1–4.5)

Commit: `4e5bce3` tách handler theo khu vực; `33faf01` `createServices`; `361c6c6` mốc 866 test; `be9d6d5` hồ sơ; và một commit sửa lỗi đua của `crash.test.ts`.

| Kiểm | Kết quả |
| --- | --- |
| Test | **866** = 863 + 3 mới (`createServices`); 12 tệp test của `ipc/` không đổi một dòng |
| `tsc` | 410 + 812 tệp (+9 tệp `handlers/`, +2 `createServices`) |
| Lint | 0 lỗi, 63 cảnh báo (không thêm) |
| Bundle | `require` của preload vẫn chỉ `electron`, 5.823 byte |
| Tính đầy đủ theo kiểu | 3/3 phá cố ý bị `tsc` chặn (mục 5) |

**Sự cố quy trình của người thực hiện.** Khi đẩy R3, tôi nối `check && git fetch` bằng `&&` nhưng các lệnh sau bằng `;`, nên `check` báo đỏ mà `git push` vẫn chạy: commit `be9d6d5` lên `origin/main` khi một bước kiểm đang đỏ, trái với quy tắc "chỉ đẩy khi xanh" ở mục 4. Bước đỏ là `crash.test.ts` (đã có từ trước, xem dưới) và **không liên quan** tới nội dung R3 (kho, không phải handler hay `createServices`). Từ đó mọi lần đẩy dùng một chuỗi `&&` duy nhất.

**Nguyên nhân gốc của test đỏ (lỗi đua trong bài test, không phải mất dữ liệu).** Tiến trình con xóa chương rồi mới báo `deleted`; `SIGKILL` đến giữa hai việc đó thì bên cha đòi chương còn, nên báo "acknowledged chapter missing after a kill". Thực nghiệm A: chèn tạm 60 ms giữa lệnh xóa và dòng báo, test cũ đỏ tất định với đúng thông điệp. Sửa: tiến trình con báo `deleting` trước khi xóa, bên cha chấp nhận chương đã bắt đầu xóa là có thể đã mất (các chương khác vẫn bị đòi nguyên vẹn). Thực nghiệm B: cùng cửa sổ 60 ms, test đã sửa xanh 3/3; độ trễ tạm đã gỡ. Sau sửa: `crash.test.ts` riêng 5/5, bộ kiểm đầy đủ xanh 866/866. Lỗi này cũng là phần lớn các lần `crash.test.ts` đỏ ở mục 2.

**Đính chính thiết kế.** D7 từng nói test "import được trong Node trần" là bằng chứng `services/` không dính Electron; không đúng vì `import 'electron'` trong Node trần không ném lỗi. Bằng chứng là luật lint (task 3.7). Đã sửa D7 và task 4.4.

### R4, xong (tasks 5.1–5.6)

Commit: `d0db504` công cụ thêm pha `shared`; `84affc4` luật lint; `86c6ebc` **lần tách**; `57c4a08` bọc 2 dòng import.

| Kiểm | Kết quả |
| --- | --- |
| Git nhận ra đổi tên | **25/25**, độ giống thấp nhất 96%; 128 tệp, +246 / −219 dòng |
| `--prove` | 127 tệp chỉ khác `HEAD` ở tham chiếu |
| `--verify` | 841 tham chiếu đều giải ra; không còn import đường dẫn cũ |
| Câu import `shared` | renderer 81 và preload 12 **đúng baseline**; main 117 = 108 + 9 (9 tệp `handlers/` thêm 18 import, `libraryHandlers.ts` bỏ 9) |
| Test | 866 = 752 + 114 |
| `tsc` | 410 + 812 tệp |
| Lint | 0 lỗi, 63 cảnh báo (như sau R2/R3) |
| `out/preload/index.js` | `require` chỉ `electron`, 5.823 byte, **giống hệt baseline** (task 5.4) |
| `out/main/index.js` | phần external giống baseline |

Phát hiện: dry-run `shared` đếm 219 câu viết lại = 201 của `main`/`renderer`/`preload` + 18 import chéo trong `shared`. Đường dẫn dài thêm làm 2 dòng import vượt 100 cột (`image.ts`, `WorkForm.tsx`); bọc ở commit riêng như ở R2. Công cụ cũng được sửa để coi một tệp chỉ khác ở kiểu xuống dòng là sạch: trình soạn thảo của chủ sản phẩm chuẩn hóa vài tệp sang LF trong lúc làm việc.

### R6, xong (tasks 7.1–7.5)

Commit: `9f81de3` test khóa hành vi; `8493169` **lần tách**; `3d7b044` mốc 867 test.

| Kiểm | Kết quả |
| --- | --- |
| Kích thước | `library.ts` 567 → **354** dòng; `workFiles.ts` mới **287** dòng |
| So từng dòng với bản cũ | 25 dòng cũ "biến mất", đều giải thích được: 5 import đã chuyển, 12 lời gọi chỉ thêm tiền tố `files.`, constructor/`open` dựng lại, các hàm `private` thành public ở `WorkFiles`; thân `upsertIndex`, `reconcile`, `openIndex`, `readSummaryFromFile` không có trong danh sách khác biệt |
| Test | **867** = 863 + 3 (`createServices`) + 1 (khóa hành vi); 6 tệp `services/library` qua (104 test) |
| `crash.test.ts` riêng ×3 | 4/4 qua, 14,04 / 13,60 / 13,57 s (baseline 13,31 / 12,91 / 13,63 s) |
| `smoke:sqlite` | qua dưới Electron 44.4.5, node 24.21.0, sqlite 3.53.4 |
| `tsc` | 411 + 812 tệp (+1: `workFiles.ts`) |
| Lint | 0 lỗi, 63 cảnh báo (không thêm) |
| Bundle | `require` của preload chỉ `electron`, 5.823 byte; phần external của main như baseline |

Phát hiện: (1) test khóa hành vi được kiểm bằng đột biến: bỏ lệnh dọn `.part` trong `create` thì test đỏ ("expected [ Array(1) ] to deeply equal []"), khôi phục thì xanh. (2) Bộ kiểm bắt được test thò vào thành viên private mà `tsc` bỏ sót (mục 7.1); lần chạy đầu của chuỗi kiểm dừng ở đó và không chạy tiếp smoke test, đúng như thiết kế `&&`.

### Kết thúc (tasks 8.1–8.4)

Commit: `44fe5f6` xóa công cụ dời tệp; `efc1271` bảng trước/sau; `14d5737` bằng chứng khởi động ứng dụng; rồi hai commit lưu trữ.

**Kiểm tay (8.3).** Chủ sản phẩm báo đã tự kiểm tay trong app thật và không thấy khác trước (2026-10-03). Người thực hiện không lái được cửa sổ Electron nên không có số đo của riêng mình cho bước này; bằng chứng tự động duy nhất là lần khởi động ứng dụng đã build ở mục 8.

**Lưu trữ (8.4).** Không có delta spec để gộp (`skip_specs: true`); thư mục chuyển sang `openspec/changes/archive/2026-10-03-refactor-electron-structure/`.
