## Context

Xem [proposal.md](proposal.md) phần Why cho động cơ. Các sự kiện về hiện trạng, đo ngày 2026-10-03 trên `main` (commit `0600221`):

1. **Phân tầng đã gần đúng, chỉ chưa có tên và chưa có luật.** Đồ thị import của `src/main` không có cạnh nào từ `storage/` sang `providers/`; `providers/` import `storage/` (12 cạnh), `ipc/` import cả hai. Chỉ ba tệp không phải test import `electron`: `index.ts`, `ipc/library.ts`, `storage/electronSafeStorage.ts`. Nên đây là việc **đặt tên và ép luật cho thứ đã có**, không phải thiết kế lại.
2. **Hai thư mục trộn nhiều vai.** `storage/` (43 tệp) gồm hạ tầng SQLite, các hàm SQL theo bảng, `LibraryStore` (561 dòng, vừa quản lý tệp vừa làm nghiệp vụ), một adapter Electron và công cụ test. `providers/` (27 tệp) gồm adapter HTTP lẫn logic nghiệp vụ. `ipc/libraryHandlers.ts` ghép 36 kênh trong một hàm.
3. **Tệp test và tiến trình con dùng đường dẫn tương đối.** `crash.test.ts` dựng bốn tiến trình con bằng `esbuild` với `entryPoints: [join(__dirname, 'crashChild.ts')]`; các tiến trình con import `LibraryStore`. `schemaSnapshot.test.ts` đọc `join(__dirname, '__fixtures__')`. `scripts/refresh-model-catalog.mjs` ghi thẳng vào `src/main/providers/modelCatalog.json`.
4. **Cấu hình công cụ dùng glob**, nên không cần sửa khi dời tệp: `tsconfig.node.json` (`src/main/**/*`, `src/shared/**/*`), `vitest.config.ts` (`src/**/*.test.ts`), `electron.vite.config.ts` (điểm vào mặc định `src/main/index.ts`, `src/preload/index.ts`), `electron-builder.yml` (`!src/*`).
5. **Renderer import `shared` bằng đường dẫn tương đối** (81 câu import trong 48 tệp); `@renderer/*` đã khai trong tsconfig nhưng **0 tệp dùng**. `main` có 108 câu import `shared` trong 44 tệp, `preload` 12.
6. **Bộ kiểm không đáng tin trên máy này.** `pnpm test`, `pnpm lint`, `pnpm typecheck` in một cảnh báo về trường `pnpm` rồi thoát mã 0 mà không chạy gì (pnpm toàn cục mới hơn bản ghim `pnpm@8.9.0`). Chạy thẳng `node_modules/.bin` cho kết quả thật: `tsc` hai project sạch, `vitest` 863 test / 62 tệp qua, `eslint` thoát mã 1 vì 2 lỗi `no-irregular-whitespace` ở `src/shared/rawText.ts` (từ trước) và 30.576 cảnh báo `Delete ␍`. Nguyên nhân cảnh báo: `.editorconfig` ghi `end_of_line = lf` nhưng `core.autocrlf=true` làm bản làm việc trên Windows thành CRLF (Git chuẩn hóa về LF khi commit).
7. **Hợp đồng IPC có tính đầy đủ theo kiểu.** `createLibraryHandlers` trả `Record<Channel, RawHandler<unknown>>`, nên thêm một kênh mà quên handler là lỗi biên dịch. Cấu trúc mới phải giữ điều này.

## Goals / Non-Goals

**Goals:**

- Mỗi tệp có **một chỗ hiển nhiên theo vai trò**, và có sẵn chỗ cho các lõi của giai đoạn AI-first (kho đề xuất, máy chạy tác vụ, sổ chi phí) mà không phải dời thêm.
- Ranh giới được **máy ép**: vi phạm là lỗi lint, không phải điều cần nhớ.
- **Mỗi bước xanh toàn bộ bộ kiểm** và `git revert`-được riêng.
- Hành vi quan sát được **không đổi**: tên kênh, payload, schema, tên tệp dữ liệu, API preload, giao diện.

**Non-Goals:**

- Đổi tên tệp để cho đẹp (ngoại lệ có chủ ý ở D2: hai tệp đổi vai trò).
- Chuyển `services`/`infra` sang `utilityProcess`; chỉ làm cho việc đó **khả thi** bằng luật "lõi không import Electron" (cần smoke test `node:sqlite` trong `utilityProcess` và xử lý `safeStorage` chỉ có ở main; chưa đo giao diện khựng).
- Monorepo, hệ thống DI kiểu VS Code, đường dẫn bí danh `@shared`.
- Dời mã cửa sổ trong `main/index.ts` vào `electron/`.
- Sửa pnpm của máy; chỉ **đi vòng** bằng một lệnh kiểm riêng.
- Bất kỳ tính năng nào của giai đoạn AI-first.

## Decisions

### D1 — Bốn tầng: `infra` < `services` < `ipc` < `electron`, mỗi tầng chỉ import tầng dưới

```
src/
  shared/                 chạy ở mọi nơi; không node:, electron, react
    contracts/            kiểu, schema valibot, tên kênh, DesktopApi, Result
    algorithms/           hàm thuần trên văn bản
  main/
    index.ts              gốc lắp ráp; được import electron
    electron/             NƠI DUY NHẤT (cùng index.ts) import 'electron'
    ipc/                  handler theo khu vực; không import electron
    services/
      library/            LibraryStore + nhóm test crash
      ai/                 kết nối, chat, dịch chương, chi phí
    infra/
      storage/            SQLite, migration, schema, hàm SQL theo bảng, WorkFiles (R6)
      providers/          adapter HTTP và hợp đồng provider
    testing/              công cụ chỉ dành cho test
  preload/index.ts        chỉ electron + shared/contracts
  renderer/src/           giữ nguyên
```

Mỗi tầng được import mọi tầng thấp hơn và `shared`. Thêm một điều để tránh vòng: `services/library` **không** import `services/ai` (chiều ngược lại được: dịch chương cần đọc `LibraryStore`).

*Đã cân:* **chia theo môi trường chạy** kiểu VS Code (`common/node/electron-main`). Bỏ vì Mira chỉ có một tiến trình main và nỗi rối hiện tại là rối **vai trò**, không phải rối môi trường. **Chia theo tính năng** (`works/`, `ai/`, mỗi thư mục chứa cả kho, service, handler) như Signal. Bỏ vì `LibraryStore` và các hàm SQL phục vụ nhiều tính năng cùng lúc (tác phẩm, chương, văn bản, ảnh); cắt theo tính năng là thiết kế lại, không phải sắp xếp lại. Khuôn của Zettlr (`service-providers/*`) và AFFiNE (`main/`, `helper/`) tương thích với bốn tầng này nếu sau này tách tiến trình.

### D2 — Bảng dời tệp của `main/` (không đổi tên, trừ hai ngoại lệ)

| Từ | Đến | Lý do |
| --- | --- | --- |
| `storage/{sqlite,migrate,errors}.ts` | `infra/storage/` | hạ tầng |
| `storage/{workSchema,librarySchema}.ts`, `__fixtures__/` | `infra/storage/` | schema và ảnh chụp đóng băng đi cùng `schemaSnapshot.test.ts` |
| `storage/{workFile,chapterFile,textFile,linkFile,sentenceRows,backupFile,backupName,cover,image,textRules,connections,secretStore}.ts` | `infra/storage/` | hàm SQL theo bảng; `secretStore` chỉ nhận `SecretCrypto` được tiêm vào |
| `storage/library.ts` | `services/library/` | nghiệp vụ |
| `storage/crash*.ts` (bốn tiến trình con + `crashTextShared`) và `crash.test.ts` | `services/library/` | các tiến trình con import `LibraryStore`; nếu để ở `infra/storage` thì `infra` import `services` |
| `storage/{testing,testCover,testImage}.ts` | `testing/` | công cụ test; 29 tệp test và `crashChild.ts` dùng |
| `storage/electronSafeStorage.ts` | `electron/safeStorage.ts` | **đổi tên**: tiền tố `electron` thừa khi đã nằm trong `electron/` |
| `providers/{types,reconcile,openAiCompatible,chatStream,classifyError,keyPool,connectionKeySource,mockProvider,modelCatalog}.ts`, `modelCatalog.json` | `infra/providers/` | adapter và hợp đồng. `types.ts` (`TranslationProvider`, `ProviderError`) phải ở `infra` vì `openAiCompatible` hiện thực nó và `infra` không được import `services`. `modelCatalog` ở `infra` vì cả `services/ai` lẫn `openAiCompatible` dùng |
| `providers/{chatService,chatPrompt,chatTools,chapterTranslation,connectionService,costEstimate,provenance}.ts` | `services/ai/` | nghiệp vụ AI |
| `ipc/library.ts` | `electron/registerIpc.ts` | **đổi tên**: tệp này gắn `ipcMain`, tạo hộp thoại thật và import `electron`, nên là mã Electron, không phải mã IPC thuần |
| `ipc/{handler,filePicker,libraryHandlers}.ts` | giữ nguyên | R3 mới tách |
| `index.ts` | giữ nguyên | gốc lắp ráp |

Tệp test đi theo **mô-đun cùng tên** (test của `chatService.ts` ở cạnh `chatService.ts`); chỉ test không có mô-đun cùng tên mới đi theo **tầng cao nhất mà nó import**. Công cụ (D4) tính và bản dry-run được duyệt, thay vì liệt kê tay hơn 60 tệp. Thứ tự này được chọn sau lần dry-run đầu: quy tắc "tầng cao nhất" đơn thuần đẩy `modelCatalog.test.ts`, `connections.test.ts` và `sentenceRows.test.ts` lên `services/` chỉ vì mỗi cái import thêm một `LibraryStore` hoặc `costEstimate` để kiểm thử tích hợp; test được miễn luật tầng nên để chúng cạnh mô-đun mang tên mình dễ tìm hơn. Kết quả dry-run: sang `services/library/` gồm `library`, `libraryCover`, `backup`, `chapters`, `content` và nhóm `crash`; sang `services/ai/` gồm `chatService`, `chatPrompt`, `chatTools`, `providers`; ở `infra/storage/` gồm `sqlite`, `migrate`, `schemaSnapshot`, `workSchema`, `sentenceRows`, `connections`, `textRules`, `backupName`, `cover`, `image`; ở `infra/providers/` gồm `chatStream`, `keyPool`, `connectionKeySource`, `modelCatalog`, `openAiChat`, `openAiCompatible`; test tích hợp của `ipc/` ở lại `ipc/`.

### D3 — Luật ranh giới là `no-restricted-imports` có sẵn của ESLint, không thêm dependency

Mỗi vùng một khối cấu hình trong `eslint.config.mjs`, dùng `patterns` (so khớp glob với **chuỗi** specifier, đủ vì tên thư mục `services`, `infra`, `electron`, `ipc`, `testing`, `contracts`, `algorithms` là duy nhất trong repo) và `paths` cho gói. Thông điệp lỗi viết tiếng Việt, nói rõ tầng nào được phép.

| Vùng | Cấm import |
| --- | --- |
| `shared/**` | `node:*`, `electron`, `react`, `react-dom`, `**/main/**`, `**/renderer/**`, `**/preload/**` |
| `shared/contracts/**` | thêm: `**/algorithms/**` |
| `renderer/**` | `node:*`, `electron`, `**/main/**`, `**/preload/**` |
| `preload/**` | `node:*`, `**/main/**`, `**/renderer/**` |
| `main/infra/**` | `electron`, `**/services/**`, `**/ipc/**`, `**/electron/**`, `**/renderer/**` |
| `main/services/**` | `electron`, `**/ipc/**`, `**/electron/**`, `**/renderer/**` |
| `main/services/library/**` | thêm: `**/services/ai/**` |
| `main/ipc/**` | `electron`, `**/electron/**`, `**/renderer/**` |
| mọi tệp không phải test | `**/testing/**` (ngoại lệ: chính `main/testing/` và `crash*Child.ts`) |
| `main/index.ts`, `main/electron/**` | không cấm gì |

Tệp `*.test.ts`, `main/testing/**` và `crash*Child.ts` được miễn luật tầng (test được import chéo tầng để dựng bối cảnh).

Ở R1 viết các luật này theo bố cục **hiện tại** để lint xanh ngay: `shared`, `renderer`, `preload` như bảng; riêng `main` cấm `electron` trừ **danh sách cho phép ba tệp** (`index.ts`, `ipc/library.ts`, `storage/electronSafeStorage.ts`) kèm chú thích "xóa ở R2". R2 thay bằng bảng đầy đủ. Mỗi bước giữ lint xanh, không có lúc nào lint đỏ "tạm".

*Đã cân:* `eslint-plugin-import` (`no-restricted-paths`), `eslint-plugin-boundaries`, `dependency-cruiser`. Bỏ ở lát này vì thêm dependency và một cấu hình thứ hai trong khi chuỗi specifier đã đủ. **Giới hạn đã chấp nhận:** luật so khớp chuỗi nên một đường dẫn bí danh hoặc re-export qua tầng thấp có thể lách; chưa có cái nào trong repo. Mở lại (chuyển sang `dependency-cruiser`) khi có monorepo hoặc bí danh. Signal cũng tự viết plugin `no-restricted-paths` cho chính mục đích này.

### D4 — Một công cụ dời tệp, tạm thời, có bước chứng minh

Hơn 120 tệp đổi chỗ và khoảng 400 câu import đổi đường dẫn (kể cả `vi.mock('…')`); làm tay hoặc chạy theo lỗi `tsc` thì chậm và dễ sót. `scripts/restructure/move-modules.mjs` đọc `moves.json` (từ → đến, và quy tắc cho tệp test) rồi:

1. Dựng tập tệp bị dời; với mọi tệp `.ts/.tsx/.mjs` dưới `src/`, `scripts/` và tệp cấu hình gốc, tìm mọi specifier tương đối ở các dạng `from '…'`, `import '…'`, `import('…')`, `export … from '…'`, `vi.mock('…')`, `vi.importActual('…')`, `require('…')`.
2. Giải specifier theo vị trí **cũ** của tệp ra tệp đích cũ (thử `.ts`, `.tsx`, `.json`, `/index.ts`); gặp specifier không giải được thì **dừng** chứ không đoán.
3. Nếu đích đã dời, tính đường dẫn tương đối mới từ vị trí **mới** của tệp; giữ nguyên kiểu viết (có hoặc không có đuôi, tiền tố `./`).
4. Dời bằng `git mv` (giữ lịch sử), ghi nội dung **nguyên byte** ngoài phần specifier (giữ CRLF).
5. `--dry-run`: in bảng tệp, phân loại test, và số câu import đổi theo từng dạng. `--prove`: với mỗi tệp đã dời, thay mọi specifier tương đối bằng một dấu cố định ở cả bản cũ (từ `HEAD`) lẫn bản mới rồi so sánh; **phải bằng nhau**, nghĩa là ngoài specifier không có gì đổi. `--verify`: mọi specifier tương đối trong repo giải ra một tệp tồn tại.

Cùng `moves.json` dùng lại cho R4 (`shared/`) và R5 (tài liệu). R2 và R4 mỗi cái là **một commit nguyên tử** vì trạng thái trung gian không biên dịch được; Git hiển thị là đổi tên (`git diff -M --stat`), và đầu ra `--prove` đính vào mô tả commit. Công cụ **được xóa ở cuối change** (task 7.1); lịch sử vẫn giữ nó.

Test tay (không phải test tự động) cho công cụ: không có, vì kiểm chứng đến từ `tsc` + `vitest` + `--prove` + `--verify` trên chính repo. Viết test riêng cho một script dùng một lần là chi phí không xứng.

*Đã cân:* `ts-morph` hoặc TypeScript language service (đổi tên mô-đun an toàn theo kiểu, nhưng thêm dependency nặng và không thấy chuỗi trong `vi.mock`); `jscodeshift`; dời tay rồi sửa theo `tsc`. Bỏ cả ba.

### D5 — Một lệnh kiểm không đi qua pnpm, và im lặng là thất bại

`scripts/check.mjs` chạy lần lượt `tsc` cho `tsconfig.node.json` và `tsconfig.web.json` (`--noEmit --composite false`), `vitest run`, `eslint --quiet .`, và với `--build` thêm `electron-vite build`. Gọi bằng `process.execPath` + đường dẫn tệp JS của từng gói trong `node_modules` (không qua `.cmd`, không qua pnpm). Mỗi bước in một dòng `ok`/`FAIL` kèm mã thoát; riêng `vitest` bị **bắt buộc có dòng `Tests  N passed`** trong đầu ra, và `eslint` bắt buộc chạy xong, để một bước "không làm gì" không bao giờ đọc là thành công, đúng lỗi đã gặp với pnpm. Thoát mã khác 0 nếu bất kỳ bước nào lỗi hoặc thiếu bằng chứng đã chạy.

**Phát hiện khi triển khai (baseline, 2026-10-03): bộ test song song không tin được, nên `vitest` chạy hai pha.** Chạy cả 62 tệp song song cho kết quả khác nhau mỗi lần ngay trên máy rảnh (ba lần liền: đỏ hai test, đỏ một test, xanh 863/863), và test đỏ đổi theo từng lần. Năm tệp phụ thuộc đồng hồ: `rows.test.ts` (< 50 ms), `segmenter.test.ts` (< 500 ms), `segmentMap.test.ts` (< 2 ms mỗi thao tác), `providers.test.ts` (hủy sau 20 ms, chờ ≥ 50 ms) và `crash.test.ts` (giết tiến trình theo hẹn giờ; chính bài test cũng tự kiểm "writer đã kịp làm việc trước mỗi lần giết"). Đã kiểm chứng giả thuyết cô lập: pha A (57 tệp còn lại, song song) 3/3 lần xanh với 749 test; pha B (5 tệp trên, `--no-file-parallelism`) 3/3 lần xanh với 114 test; 749 + 114 = 863. `check.mjs` vì vậy chạy pha A song song rồi pha B tuần tự, nhận diện 5 tệp theo **tên tệp** (không theo đường dẫn, để sống sót qua các lần dời), và yêu cầu **tổng số test từ hai pha ≥ baseline**. Đây không phải che lỗi: mỗi test vẫn chạy đúng một lần và phải qua; chỉ bỏ cạnh tranh CPU giữa các tệp với nhau. Một phiên `electron-vite dev` chạy nền làm tệ hơn nhưng không phải nguyên nhân.

Không đổi `package.json` (`scripts` giữ nguyên, trường `pnpm` giữ nguyên, lockfile giữ `lockfileVersion 6.0`). Không chạy `pnpm add`/`install` bằng pnpm toàn cục: nó viết lại lockfile sang 9.0 (đã gặp, ghi ở nhật ký handbook 2026-10-03).

*Đã cân:* sửa pnpm bằng `corepack` (là việc của máy, không của repo; nên chỉ ghi vào tài liệu như lựa chọn); `npm-run-all`; `Makefile`. Bỏ vì `check.mjs` nhỏ hơn và chạy được ở mọi máy có Node.

### D6 — Làm lint đọc được bằng `endOfLine: auto`, không dùng `.gitattributes`

Thêm `endOfLine: auto` vào `.prettierrc.yaml`: không viết lại tệp nào trong bản làm việc, cảnh báo `Delete ␍` biến mất. `.gitattributes` với `eol=lf` đúng hơn về lâu dài nhưng chỉ có tác dụng sau khi checkout lại toàn bộ tệp, rủi ro với công việc chưa commit; để thành việc riêng.

Hai lỗi `no-irregular-whitespace` ở `rawText.ts` (dòng 161: ký tự U+3000 trong chú thích; dòng 199: U+3000 trong lớp ký tự của biểu thức chính quy) sửa bằng `\u3000` trong biểu thức chính quy và chữ "U+3000" trong chú thích. Hành vi giữ nguyên (cùng một ký tự), và `rawText.test.ts` (212 dòng) đã phủ.

*Đã cân:* `// eslint-disable` cho hai dòng. Bỏ vì che đi một ký tự mà mã **phụ thuộc vào**; dạng thoát làm nó nhìn thấy được.

### D7 — Tách IPC: mỗi khu vực một tệp, giữ chữ ký công khai

`ipc/handlers/{works,chapters,text,rows,images,backup,ai,chat}.ts`, mỗi tệp xuất một hàm nhận phụ thuộc và trả đối tượng `kênh → handler` cho **đúng khu vực**. `rows` tách riêng vì là khối sẽ bị xóa nguyên khi gỡ mode Từng câu. Các hàm bảo vệ `ai()`, `translate()`, `chatting()` (báo lỗi rõ khi kho khóa không mở được) chuyển sang `handlers/deps.ts`. `libraryHandlers.ts` còn lại là bộ gộp: giữ **nguyên chữ ký** `createLibraryHandlers(library, files, connections, translator, chat)` và kiểu trả `Record<Channel, RawHandler<unknown>>`, nên 12 tệp test trong `ipc/` không đổi. Tính đầy đủ theo kiểu giữ nguyên vì kiểu trả về vẫn là bản ghi đủ mọi `Channel`: gỡ một handler khỏi tệp khu vực thì `tsc` lỗi (kiểm bằng cách gỡ thử, task 3.3).

Dây lắp service chuyển khỏi Electron: `services/createServices.ts` nhận `{ library, crypto: SecretCrypto }` và trả `{ connections, translator, chat }`; `electron/registerIpc.ts` chỉ còn gắn `ipcMain`, bộ chuyển sự kiện (`ChunkSink`), hộp thoại thật và truyền `electronSafeStorage` vào. Test mới của `createServices` dùng một `SecretCrypto` giả và chứng minh điều mà dây lắp thật sự làm: khóa đi qua `encrypt` của bản **được tiêm vào**, không bao giờ nằm trong cơ sở dữ liệu ở dạng đọc được, và khi không bảo vệ được thì từ chối lưu (ADR-004). **Không** dùng việc test "import được" làm bằng chứng không dính Electron: `import 'electron'` trong Node trần không ném lỗi (nó trả về đường dẫn tới tệp thực thi). Bằng chứng đó là luật lint `services → electron`, đã được chứng minh bắt được ở task 3.7.

Ý nghĩa với giai đoạn tới: mỗi khu vực mới (đề xuất, tác vụ, chi phí) là **một tệp mới** trong `handlers/`, không phải sửa một hàm 200 dòng.

*Đã cân:* để nguyên `libraryHandlers.ts`. Bỏ vì giai đoạn tới thêm khoảng 12 kênh; một tệp mỗi khu vực là khuôn của Bruno (`ipc/collection.js`, `git.js`, `sqlite.js`…) và AFFiNE.

### D8 — `shared/` chia hai nhóm, không phải ba

Đề xuất ban đầu là `contracts/`, `domain/`, `text/`. Đọc code cho thấy không tách được: kiểu miền **chính là** kiểu payload IPC (không có lớp DTO riêng), `library.ts` vừa định nghĩa `idSchema` vừa định nghĩa `WorkSummary`, và `result.ts` được `library.ts` (cho `ErrorCode`) lẫn `desktop-api.ts` import, nên tách `domain/` khỏi `contracts/` tạo vòng ở mức thư mục. Chốt hai nhóm:

- `contracts/` — `aiChat, aiConnections, aiTranslate, backup, channels, chapters, desktop-api, images, library, links, result, rows, text`.
- `algorithms/` — `rawImport, rawText, segmentMap, segmenter, segmenterData, segmenterCorpus`.

`algorithms` được import `contracts` (ví dụ `rawImport` dùng kiểu `TextApi`); `contracts` **không** import `algorithms`. `rows.ts` trộn schema (`rowRefSchema`…) với thuật toán (`buildRows`) nên ở lại `contracts/` cùng bài test của nó; đây là một chỗ không thuần được ghi nhận, và cả tệp bị xóa khi gỡ mode Từng câu. Tên `algorithms` thay vì `text` để khỏi trùng `contracts/text.ts`.

Bất biến phải còn nguyên: bản đóng gói preload chỉ `require` `electron` (kênh sống ở `contracts/channels.ts`, một tệp lá không import gì lúc chạy). R1 ghi lại danh sách `require` của `out/preload/index.js` để R4 so.

*Đã cân:* giữ phẳng (25 tệp và giai đoạn tới thêm `paragraphs`, `rebase`, `context/`); bí danh `@shared/*`. Bỏ bí danh vì phải sửa bốn nơi (tsconfig node và web, ba mục của `electron.vite.config.ts`, `vitest.config.ts`) trong khi renderer hiện **không dùng** `@renderer/*` đã khai, tức là quy ước của repo là đường dẫn tương đối. Mở lại nếu phải dời tệp thêm lần nữa.

### D9 — Tách `WorkFiles` khỏi `LibraryStore`

`LibraryStore` (561 dòng) làm hai việc: quản lý **tệp** (đường dẫn dữ liệu, mở và phục hồi `library.db`, mở tệp tác phẩm theo `withWork`, tạo và xóa tệp nguyên tử, xuất và khôi phục, đối soát chỉ mục với tệp trên đĩa) và làm **nghiệp vụ** (tác phẩm, chương, văn bản, hàng, ảnh bìa, ảnh, sao lưu). Giai đoạn tới cần truy cập `library.db` và từng tệp tác phẩm cho kho đề xuất, tác vụ và sổ chi phí mà không phụ thuộc vào một lớp nghiệp vụ lớn.

`infra/storage/workFiles.ts` (lớp `WorkFiles`) nhận phần quản lý tệp, **chuyển mã nguyên văn và giữ nguyên thứ tự thao tác** (thứ tự đó là thứ bài test kill tiến trình đang bảo vệ). `LibraryStore` giữ nguyên **mọi** phương thức công khai và các bộ truy cập `appDb`, `appNow`, `newAppId`, nên không tệp nào ngoài `library.ts` phải sửa; bằng chứng là `tsc` qua mà không sửa nơi dùng. Đặt ở `infra/storage` vì chỉ cần `Db` và `node:fs`.

Làm theo trình tự an toàn: **kiểm tra trước** rằng test hiện có phủ các hành vi sẽ chuyển (mở lần đầu, tệp hỏng, chỉ mục hỏng được dựng lại, dọn `.tmp` lúc khởi động, khôi phục, đổi tên thành cam kết); nếu thiếu thì **thêm test trước, trên mã chưa đổi**, ở một commit riêng; rồi mới tách ở commit khác, không sửa logic trong cùng commit.

*Đã cân:* giữ `LibraryStore` nguyên khối (giai đoạn tới sẽ nhồi thêm vào lớp 561 dòng); tách thành giao diện cộng hai hiện thực (không có nhu cầu thứ hai).

### D10 — Tài liệu: cùng bảng dời, hai loại việc, không sửa lịch sử

R5 dùng `moves.json` để sửa **liên kết markdown** (phải bấm được) và **đường dẫn trong backtick** ở `docs/handbook/**` (108 liên kết, 65 đường dẫn, 5 tệp) và ở các change đang mở (66 đường dẫn, 14 tệp). **Không sửa** `openspec/changes/archive/` (21 chỗ, 11 tệp; lịch sử đóng) và chữ `src/…` trong các mục nhật ký đã đóng ngày của `changelog.md`; liên kết ở các mục đó vẫn sửa để không hỏng. Hai bộ kiểm: mọi liên kết tương đối trong `docs/handbook/` trỏ tới tệp có thật; mọi đường dẫn `src/main|shared/…` trong tài liệu sống (trừ archive và changelog) tồn tại.

Cấu trúc và luật ghi vào mục mới của `docs/handbook/engineering/architecture.md`; **không viết ADR riêng**, vì quy tắc có nguồn thật là cấu hình lint và ADR mới sẽ lệch với nó. Khảo sát 11 sản phẩm lưu thành `docs/handbook/research/electron-architecture.md` (có URL và ngày đọc) để quyết định này có nguồn trích dẫn.

### D11 — Thứ tự và độ lớn commit

R1 ba commit (lệnh kiểm; lint đọc được và sửa lỗi; luật ranh giới). R2 hai commit (công cụ dời; dời tệp nguyên tử). R3 hai commit (tách handler; `createServices`). R4 một commit nguyên tử. R5 hai commit (sửa liên kết; tài liệu mới). R6 hai commit (test khóa hành vi nếu cần; tách). Cuối cùng một commit xóa công cụ dời. Mô tả commit bằng tiếng Anh, tuân `AGENTS.md` (Conventional Commits, tiêu đề tối đa 72 ký tự, **không** thêm dòng `Co-Authored-By`).

## Risks / Trade-offs

- **[Test dựa đường dẫn tương đối tới tiến trình con và fixture]** → dời theo **nhóm** (D2); `--verify` kiểm mọi specifier; chạy `crash.test.ts` riêng **ba lần** sau R2 và R6 vì nó là bài test duy nhất bảo vệ độ bền ghi.
- **[Công cụ bỏ sót một dạng import]** → `--dry-run` đếm theo dạng, `tsc` + `vitest` + `--verify` là ba lớp lưới; bất kỳ specifier không giải được thì công cụ dừng.
- **[Commit nguyên tử lớn khó duyệt]** → Git nhận ra đổi tên; đính đầu ra `--prove` (chỉ import đổi) và `git diff -M --stat` vào mô tả; người duyệt chỉ cần kiểm số liệu và khối cấu hình lint.
- **[Luật lint so khớp chuỗi nên có thể lách]** → ghi giới hạn ở D3; mỗi luật được **chứng minh đỏ** bằng một vi phạm cố ý ở bản tạm không commit (task 1.6, 2.7), để biết luật thật sự bắt được.
- **[Test chập chờn dưới tải]** `rows.test.ts` có assertion đo thời gian và `crash.test.ts` giết tiến trình; nhật ký handbook ngày 2026-10-02 ghi hai test này từng đỏ khi chạy cả bộ và 16/16 khi chạy riêng. → Đã đo và xử lý ở D5: năm tệp nhạy đồng hồ chạy ở pha tuần tự riêng. Khi một test vẫn đỏ thì chạy riêng tệp đó để phân biệt lỗi thật với tải, và **không** che lỗi thật bằng chạy lại cho tới khi xanh.
- **[Tách `WorkFiles` đổi thứ tự thao tác tệp]** → chuyển mã nguyên văn, test khóa hành vi trước, `crash.test.ts` ×3, không sửa logic cùng commit.
- **[Đóng gói sau khi dời: `valibot` và `node:sqlite` phải còn là external, preload không kéo thêm gì]** → `check --build` mỗi bước; so `require` của `out/preload/index.js` với baseline; `smoke:sqlite` chạy trong Electron thật.
- **[Viết lại tài liệu đụng chữ thường]** → công cụ chỉ thay token có dạng đường dẫn nằm trong bảng dời; xem `git diff --stat` và đọc mẫu.
- **[Luật quá chặt cản giai đoạn AI-first]** → mỗi luật là một khối cấu hình; chỗ đặt của các lõi tới đã chốt: `services/ai/` (dựng ngữ cảnh, máy chạy tác vụ), `infra/storage/` (kho đề xuất, sổ chi phí), `ipc/handlers/` (khu vực mới), `shared/contracts/` và `shared/algorithms/` (đoạn, gộp ba chiều).
- **[`main/index.ts` vẫn lớn và nặng Electron]** → chấp nhận; nằm trong vùng được phép và không cản việc nào ở trên.

## Migration Plan

Không có dữ liệu người dùng nào bị đụng (không đổi schema, không đổi tên tệp trong thư mục dữ liệu) nên không có migration. Mỗi bước vào `main` chỉ sau khi `node scripts/check.mjs --build` xanh. **Rollback** của một bước là `git revert` các commit của bước đó; các bước sau R2 cần revert theo thứ tự ngược vì dựa vào bố cục mới. Nếu một bước đã đẩy mà lỗi: revert, sửa, làm lại. Kiểm tay cuối cùng do chủ sản phẩm làm (mở app, tạo tác phẩm, thêm chương, gõ tiếng Việt, hỏi AI, sao lưu) vì cửa sổ Electron thật không tự động kiểm được.

## Open Questions

- **Chuyển luật sang `dependency-cruiser`** khi nào? Khi có monorepo hoặc bí danh đường dẫn, hoặc khi gặp một vi phạm mà luật chuỗi không bắt được.
- **Khi nào bỏ `scripts/check.mjs`?** Khi pnpm của máy được ghim đúng và `pnpm test` chạy thật. Không chặn gì ở đây.
- **Dời mã cửa sổ trong `main/index.ts` vào `electron/`** (tạo cửa sổ, menu, hộp thoại đóng): làm khi file lớn thêm, không chặn gì ở đây.
