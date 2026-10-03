## 1. Điểm xuất phát và lưới an toàn

- [x] 1.1 Xác nhận `main` sạch (chỉ còn tệp rỗng `winget` không thuộc change, **không đụng**) và ghi **baseline** vào `openspec/changes/refactor-electron-structure/baseline.md`: `tsc` hai project thoát 0; `vitest run` 863 test / 62 tệp qua; `eslint --quiet .` đúng 2 lỗi ở `rawText.ts`; số câu import `shared` (main 108, renderer 81, preload 12); danh sách `require` của `out/preload/index.js` sau `electron-vite build`. Xong khi tệp có đủ năm mục. Chạy bằng `node_modules/.bin/...` vì `pnpm test/lint/typecheck` không chạy gì trên máy này
- [x] 1.2 Chạy `src/main/storage/crash.test.ts` **riêng ba lần** và ghi kết quả vào `baseline.md`, để có mốc chập chờn (xem mục Risks của `design.md`). Xong khi có ba dòng kết quả
- [x] 1.3 Hỏi chủ sản phẩm một lần: có cho **đẩy `origin/main` sau mỗi bước R xanh** không (mặc định: commit cục bộ, chờ xác nhận mới đẩy). Xong khi câu trả lời được ghi vào `baseline.md`

## 2. R1 — Nền kiểm tra tin được và luật ranh giới theo bố cục hiện tại

- [x] 2.1 Viết `scripts/check.mjs` theo D5: `tsc` node, `tsc` web, `vitest` **hai pha** (pha A song song với 57 tệp, pha B `--no-file-parallelism` với 5 tệp nhạy đồng hồ nhận theo tên tệp: `rows`, `segmenter`, `segmentMap`, `providers`, `crash`; xem phát hiện ở D5), `eslint --quiet .`, và `--build` thêm `electron-vite build`; gọi `process.execPath` + tệp JS trong `node_modules`; in `ok`/`FAIL` mỗi bước; mỗi pha `vitest` bắt buộc có dòng `Tests  N passed` và tổng hai pha phải ≥ 863. Thêm `--self-test` chạy một lệnh **không in gì, thoát 0** qua cùng hàm bao: bộ kiểm phải in `FAIL` cho bước đó và `--self-test` thoát 0 (nghĩa là nhận ra bước im lặng); nếu bước đó bị coi là `ok` thì thoát 1. Xong khi `node scripts/check.mjs` in sáu dòng `ok` (hai pha: 749 + 114 = 863 test), chạy liên tiếp ba lần đều xanh, `--self-test` thoát 0, và một test đỏ cố ý (không commit) làm cả lệnh thoát khác 0
- [x] 2.2 Commit `build(scripts): add one check command that cannot pass silently` (không đụng `package.json`, lockfile giữ `lockfileVersion 6.0`). Xong khi `git show --stat` chỉ có `scripts/check.mjs`
- [x] 2.3 Thêm `endOfLine: auto` vào `.prettierrc.yaml` (D6). Xong khi `eslint .` (không `--quiet`) giảm từ 30.576 cảnh báo xuống số mới, ghi số đó vào `baseline.md`; không tệp nguồn nào bị sửa
- [x] 2.4 Sửa hai lỗi `no-irregular-whitespace` ở `src/shared/rawText.ts` (dòng 161 chú thích: chữ "U+3000"; dòng 199: `\u3000` trong biểu thức chính quy). Xong khi `eslint --quiet .` báo 0 lỗi, `rawText.test.ts` qua, và `git diff` chỉ chạm đúng hai dòng đó
- [x] 2.5 Commit `style: make lint output readable and fix two irregular-whitespace errors`. Xong khi `node scripts/check.mjs` xanh với 863 test
- [x] 2.6 Thêm luật `no-restricted-imports` theo bố cục **hiện tại** (D3, phần "Ở R1"): `shared`, `renderer`, `preload` theo bảng; `main` cấm `electron` trừ danh sách cho phép ba tệp `index.ts`, `ipc/library.ts`, `storage/electronSafeStorage.ts` kèm chú thích "xóa ở R2"; thông điệp lỗi tiếng Việt. Xong khi `eslint --quiet .` vẫn 0 lỗi
- [x] 2.7 Chứng minh từng luật bắt được: với mỗi luật (`shared`→`node:fs`, `shared`→`electron`, `shared`→`react`, `renderer`→`main`, `renderer`→`node:*`, `preload`→`main`, `preload`→`node:*`, `main` ngoài danh sách→`electron`) thêm một import vi phạm ở **bản tạm không commit**, chạy `eslint --quiet`, ghi thông điệp thấy được, rồi hoàn lại. Xong khi `baseline.md` có tám dòng "luật → thông điệp" và `git status` sạch
- [x] 2.8 Thêm mục "Kiểm tra" vào `AGENTS.md`: dùng `node scripts/check.mjs [--build]` và giải thích ngắn vì sao không tin `pnpm test/lint/typecheck`. Xong khi mục có đúng lệnh và `AGENTS.md` không nhắc gì khác đổi
- [x] 2.9 Commit `build(lint): enforce module boundaries for the current layout` (gồm `AGENTS.md`). Xong khi `node scripts/check.mjs --build` xanh; đẩy `origin/main` nếu đã được phép ở 1.3

## 3. R2 — Dời tệp trong `main/`

- [x] 3.1 Viết `scripts/restructure/moves.json` (bảng D2, quy tắc test "đi theo mô-đun cùng tên, không có thì theo tầng cao nhất nó import") và `scripts/restructure/move-modules.mjs` với `--dry-run`, `--prove`, `--verify` (D4). Xong khi `--dry-run` chạy trên repo hiện tại không lỗi và in bảng "tệp → vị trí mới", phân loại test, và số câu import đổi theo từng dạng (`from`, `import()`, `vi.mock`, `export … from`, `require`)
- [x] 3.2 Duyệt kết quả dry-run: mọi tệp và mọi test có đích, không có "unclassified" hay specifier không giải được; đối chiếu phân loại test với dự kiến ở D2 và ghi chênh lệch. Xong khi bảng được dán vào `baseline.md` và chủ sản phẩm hoặc người làm xác nhận các test nằm ở ranh giới `services/library` / `infra/storage`
- [x] 3.3 Commit `build(scripts): add a one-off tool to move modules`. Xong khi `git show --stat` chỉ có hai tệp trong `scripts/restructure/`
- [x] 3.4 Chạy công cụ thật cho `main/` (không `--dry-run`), rồi `--verify` và `--prove`. Xong khi `--verify` báo mọi specifier tương đối giải ra tệp có thật và `--prove` báo 0 tệp khác ngoài specifier
- [x] 3.5 Sửa `scripts/refresh-model-catalog.mjs` trỏ tới `src/main/infra/providers/modelCatalog.json` (không chạy script vì cần mạng). Xong khi một lệnh `node` tính đường dẫn của script ra đúng tệp JSON đang tồn tại
- [x] 3.6 Thay luật lint ở 2.6 bằng **bảng đầy đủ D3** (bỏ danh sách cho phép; thêm luật `services/library` ≮ `services/ai` và luật `testing/`). Xong khi `eslint --quiet .` 0 lỗi
- [x] 3.7 Chứng minh từng luật tầng bắt được (bản tạm, không commit): `infra`→`services`, `infra`→`electron`, `services`→`ipc`, `services`→`electron`, `ipc`→`electron`, `services/library`→`services/ai`, tệp không phải test →`testing/`. Xong khi `baseline.md` có bảy dòng thông điệp và `git status` sạch
- [x] 3.8 Chạy `node scripts/check.mjs --build` và `smoke:sqlite` (`electron scripts/smoke-sqlite.mjs` bằng bản Electron trong `node_modules`). Xong khi cả hai xanh, 863 test qua, và `require` của `out/preload/index.js` giống baseline
- [x] 3.9 Chạy `crash.test.ts` riêng ba lần ở vị trí mới. Xong khi kết quả khớp mốc ở 1.2 (không tệ hơn)
- [x] 3.10 Commit nguyên tử `refactor(main): arrange modules into electron, ipc, services, infra`, mô tả kèm kết luận `--prove` và `git diff -M --stat`. Xong khi `git show --stat -M` cho thấy các tệp được nhận là đổi tên (ghi số tệp **không** được nhận là đổi tên, nếu có) và không có tệp nào đổi nội dung ngoài import; đẩy nếu được phép

## 4. R3 — Tách IPC và dây lắp service

- [x] 4.1 Tách `ipc/libraryHandlers.ts` thành `ipc/handlers/{works,chapters,text,rows,images,backup,ai,chat}.ts` và `deps.ts` (D7); `libraryHandlers.ts` còn lại là bộ gộp **giữ nguyên chữ ký** `createLibraryHandlers`. Xong khi `tsc` qua, 12 tệp test trong `ipc/` qua và `git diff` của chúng rỗng
- [x] 4.2 Chứng minh tính đầy đủ theo kiểu còn nguyên: gỡ tạm handler `chaptersMove` khỏi `handlers/chapters.ts`, chạy `tsc` và ghi lỗi thấy được (phải nêu thiếu `chapters:move`), rồi hoàn lại. Xong khi `baseline.md` có thông điệp lỗi và `git status` sạch
- [x] 4.3 Commit `refactor(ipc): split the handler table by area`. Xong khi `node scripts/check.mjs` xanh, số test không đổi
- [x] 4.4 Thêm `services/createServices.ts` nhận `{ library, crypto: SecretCrypto }` trả `{ connections, translator, chat }`; `electron/registerIpc.ts` gọi nó và chỉ còn gắn `ipcMain`, `ChunkSink`, hộp thoại thật. Thêm test với `SecretCrypto` giả. Xong khi test mới qua (khóa đi qua `SecretCrypto` được tiêm và không lưu ở dạng đọc được; không bảo vệ được thì từ chối lưu), `registerIpc.ts` không còn `new ConnectionService`/`ChapterTranslator`/`ChatService`, và lint 0 lỗi (luật `services → electron` là bằng chứng không dính Electron, không phải việc test import được)
- [x] 4.5 Commit `refactor(main): build services outside the Electron layer`. Xong khi `node scripts/check.mjs --build` xanh: 863 test cũ cộng test mới đều qua; đẩy nếu được phép

## 5. R4 — Tách `shared/` thành `contracts/` và `algorithms/`

- [x] 5.1 Thêm phần `shared/` vào `moves.json` theo D8 (`contracts/`: aiChat, aiConnections, aiTranslate, backup, channels, chapters, desktop-api, images, library, links, result, rows, text; `algorithms/`: rawImport, rawText, segmentMap, segmenter, segmenterData, segmenterCorpus; test đi theo) rồi `--dry-run`. Xong khi bảng cho thấy tổng câu import đổi khớp baseline (main 108, renderer 81, preload 12) và không có specifier không giải được
- [x] 5.2 Thêm luật lint `shared/contracts` ≮ `shared/algorithms` (D3). Xong khi lint 0 lỗi trước khi dời
- [x] 5.3 Áp dụng, rồi `--verify` và `--prove`. Xong khi cả hai sạch
- [x] 5.4 So danh sách `require` của `out/preload/index.js` sau `electron-vite build` với baseline 1.1. Xong khi **giống hệt** (chỉ `electron`)
- [x] 5.5 Chứng minh luật mới bắt được: cho một tệp `contracts/` import `algorithms/` ở bản tạm không commit và ghi thông điệp. Xong khi `git status` sạch
- [x] 5.6 Commit nguyên tử `refactor(shared): split contracts from algorithms`. Xong khi `node scripts/check.mjs --build` xanh với số test như sau 4.5; đẩy nếu được phép

## 6. R5 — Tài liệu

- [ ] 6.1 Mở rộng công cụ để dùng `moves.json` sửa tài liệu (D10): liên kết markdown và đường dẫn trong backtick ở `docs/handbook/**` và `openspec/changes/*/` **trừ** `archive/`, trừ chính `refactor-electron-structure/`, và trừ chữ `src/…` trong các mục đã đóng ngày của `changelog.md` (liên kết ở đó vẫn sửa). `--dry-run` đếm. Xong khi số đếm khớp dự kiến (108 liên kết, 65 đường dẫn ở `docs/handbook`; 66 ở các change đang mở) hoặc chênh lệch được giải thích
- [ ] 6.2 Áp dụng, rồi chạy hai bộ kiểm: mọi liên kết tương đối trong `docs/handbook/` trỏ tới tệp có thật; mọi đường dẫn `src/main|shared/…` trong tài liệu sống (ngoài các ngoại lệ ở 6.1) tồn tại. Xong khi cả hai báo 0 lỗi
- [ ] 6.3 Commit `docs: point handbook links at the new module paths`. Xong khi `git diff --stat` chỉ chạm tệp `.md` và không có dòng chữ nào đổi ngoài đường dẫn (xem mẫu bằng mắt)
- [ ] 6.4 Thêm mục "Cấu trúc mã nguồn và luật ranh giới" vào `docs/handbook/engineering/architecture.md`: cây thư mục, bảng tầng, bảng luật lint và nơi sửa luật, ba bước "thêm một khu vực IPC / một service mới", chỗ đặt các lõi của giai đoạn AI-first (dòng "Luật quá chặt" ở mục Risks của `design.md`). Cập nhật bằng chứng ở `current-state.md` và đường dẫn ở `ai-first-architecture.md`. Xong khi bộ kiểm liên kết ở 6.2 vẫn 0 lỗi
- [ ] 6.5 Viết `docs/handbook/research/electron-architecture.md`: bảng 11 sản phẩm, bảy khuôn, nguồn kèm URL và **ngày đọc 2026-10-03**, và giới hạn bằng chứng (đọc cây thư mục qua GitHub API, chưa chạy thử); thêm một dòng vào mục lục `README.md`. Xong khi liên kết và URL có đủ và bộ kiểm liên kết sạch
- [ ] 6.6 Ghi mục mới vào `docs/handbook/maintenance/changelog.md`: gì đổi, gì **không** đổi, baseline trước và sau. Xong khi mục có và nhắc rõ rằng `archive/` và nhật ký cũ giữ nguyên chữ
- [ ] 6.7 Commit `docs: describe the module layers and the survey behind them`; đẩy nếu được phép

## 7. R6 — Tách `WorkFiles` khỏi `LibraryStore`

- [ ] 7.1 Đọc `LibraryStore` và lập bảng trách nhiệm trong `baseline.md`: mỗi phương thức và trường (công khai lẫn riêng tư) thuộc `WorkFiles` hay ở lại `LibraryStore` (D9). Xong khi mọi thành viên được gán, kể cả `appDb`, `appNow`, `newAppId` (ở lại, ủy quyền)
- [ ] 7.2 Kiểm test hiện có đã phủ các hành vi sẽ chuyển chưa: mở lần đầu, tệp tác phẩm hỏng, `library.db` hỏng được đặt sang bên và dựng lại, dọn `.tmp` lúc khởi động, khôi phục từ tệp sao lưu, đổi tên thành điểm cam kết. Lập bảng "hành vi → test"; **thiếu chỗ nào thì thêm test trên mã chưa đổi** và commit riêng `test(library): pin work file lifecycle before extracting it`. Xong khi bảng đầy đủ và `node scripts/check.mjs` xanh
- [ ] 7.3 Tạo `infra/storage/workFiles.ts`, chuyển mã nguyên văn và **giữ nguyên thứ tự thao tác**; `LibraryStore` dựng và dùng `WorkFiles`, giữ mọi phương thức công khai. Xong khi `tsc` qua mà **không tệp nào ngoài `library.ts` và tệp mới bị sửa** (`git diff --stat`), và số dòng của `library.ts` được ghi lại
- [ ] 7.4 Chạy `crash.test.ts` riêng ba lần, cả bộ test, và `smoke:sqlite`. Xong khi xanh và khớp mốc ở 1.2
- [ ] 7.5 Commit `refactor(storage): extract work file lifecycle from LibraryStore`. Xong khi `node scripts/check.mjs --build` xanh; đẩy nếu được phép

## 8. Kết thúc

- [ ] 8.1 Xóa `scripts/restructure/` ở commit riêng `chore(scripts): remove the one-off module move tool` và ghi hash commit của công cụ vào changelog. Xong khi `node scripts/check.mjs` vẫn xanh (không phụ thuộc công cụ)
- [ ] 8.2 Chạy lần cuối `node scripts/check.mjs --build` và lập bảng trước/sau trong `baseline.md`: số test, lỗi và cảnh báo lint, danh sách `require` của preload, `smoke:sqlite`. Xong khi bảng có đủ bốn dòng và không có dòng nào tệ hơn baseline
- [ ] 8.3 **Lái tay (chủ sản phẩm; không tự động được):** mở app, tạo tác phẩm, thêm chương, dán raw, gõ tiếng Việt ở pane dịch, mở panel Hỏi AI, sao lưu rồi khôi phục. Xong khi chủ sản phẩm xác nhận không khác trước
- [ ] 8.4 Lưu trữ change bằng `openspec archive refactor-electron-structure` sau 8.3 (không có delta spec để gộp vì `skip_specs: true`). Xong khi `openspec list` không còn change này và thư mục nằm trong `openspec/changes/archive/`
