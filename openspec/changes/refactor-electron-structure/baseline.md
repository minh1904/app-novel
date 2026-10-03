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

### R2 (task 3.7), R4 (task 5.5), R3 (task 4.2)

_Điền khi làm các task tương ứng._

## 6. Phân loại test do công cụ dời đề xuất (task 3.2)

_Điền khi làm task 3.2._

## 7. Bảng trách nhiệm `LibraryStore` → `WorkFiles` (task 7.1) và bảng hành vi → test (task 7.2)

_Điền khi làm các task tương ứng._

## 8. So sánh trước/sau (task 8.2)

_Điền khi làm task 8.2._
