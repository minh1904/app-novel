## Why

Chủ sản phẩm chốt hướng AI-first, và giai đoạn tới sẽ thêm vào main process khá nhiều thứ mới: kho đề xuất, máy chạy tác vụ dịch, sổ chi phí, dựng ngữ cảnh. Hiện chưa có chỗ rõ ràng để đặt chúng. `main/providers/` (27 tệp) trộn adapter HTTP với logic nghiệp vụ, `main/storage/` (43 tệp) trộn hạ tầng SQLite, một service 561 dòng (`LibraryStore`) và một adapter Electron (`electronSafeStorage.ts`), `libraryHandlers.ts` là một bảng ghép mọi kênh IPC, và không có luật nào giữ ranh giới: "Electron chỉ ở bốn tệp" đúng nhờ kỷ luật chứ không nhờ máy kiểm.

Khảo sát 11 app Electron mã nguồn mở ngày 2026-10-03 (VS Code, Signal, AFFiNE, Zettlr, Joplin, Notesnook, Bruno, Mattermost, Insomnia, GitHub Desktop, Logseq) cho thấy cùng một khuôn: lõi không biết Electron, main chia theo dịch vụ, và **ranh giới được ép bằng lint** (VS Code `code-layering`, Signal `no-restricted-paths`). Làm ngay bây giờ vì repo chưa có người dùng thật, 863 test đang xanh để làm lưới an toàn, và mỗi tính năng mới của giai đoạn 1 sẽ làm việc dời tệp đắt hơn.

## What Changes

Sáu bước R1–R6 theo thứ tự, mỗi bước xanh toàn bộ bộ kiểm trước khi sang bước sau. **Không đổi hành vi**: không đổi tên kênh IPC, payload, schema SQLite, tên tệp trong thư mục dữ liệu, API của preload hay giao diện.

- **R1 — Nền kiểm tra tin được.** `pnpm test/lint/typecheck` hiện báo thành công mà không chạy gì, nên thêm một lệnh kiểm duy nhất `node scripts/check.mjs`. Làm lint đọc được (30.576 cảnh báo `Delete ␍` do CRLF của Windows), sửa 2 lỗi lint có sẵn ở `rawText.ts`, và thêm luật ranh giới `no-restricted-imports` theo bố cục **hiện tại** (xanh ngay).
- **R2 — Dời tệp trong `main/`** vào `electron/`, `services/{library,ai}/`, `infra/{storage,providers}/`, `testing/`, bằng một công cụ dời tự viết (viết lại import, kèm bước chứng minh chỉ import đổi). Luật lint chuyển sang tầng cuối.
- **R3 — Tách IPC.** `libraryHandlers.ts` thành mỗi khu vực một tệp, giữ nguyên tính đầy đủ theo kiểu (quên một kênh là lỗi biên dịch). Dây lắp service tách khỏi Electron thành `createServices`, có test chạy được không cần Electron.
- **R4 — Tách `shared/`** thành `contracts/` (kiểu, schema, kênh, hợp đồng IPC) và `algorithms/` (hàm thuần trên văn bản).
- **R5 — Sửa tài liệu.** 108 liên kết và 65 đường dẫn trong handbook, 66 đường dẫn trong các change đang mở. Không sửa `openspec/changes/archive/` (lịch sử). Thêm mục cấu trúc vào `architecture.md` và trang nghiên cứu về các sản phẩm đã khảo sát.
- **R6 — Tách `WorkFiles` khỏi `LibraryStore`.** Vòng đời tệp tác phẩm và `library.db` thành một lớp riêng, API công khai của `LibraryStore` giữ nguyên.

**Không làm trong change này:** đổi tên tệp (trừ hai tệp đổi vai trò), chuyển dữ liệu sang `utilityProcess`, monorepo, hệ thống DI, đường dẫn bí danh `@shared`, và mọi tính năng của giai đoạn AI-first (đề xuất, tác vụ, `AppEvents`, gỡ segment). Chúng dựa trên cấu trúc này nên đi sau.

## Capabilities

### New Capabilities

Không có. Đây là refactor thuần: không yêu cầu nào về hành vi của hệ thống thay đổi, nên `.openspec.yaml` đặt `skip_specs: true`. Luật ranh giới có nguồn thật là cấu hình lint trong `eslint.config.mjs`; một spec chép lại luật đó sẽ lệch với nó. Cấu trúc được mô tả ở `docs/handbook/engineering/architecture.md` (R5).

### Modified Capabilities

Không có.

## Impact

- **Mã:** khoảng 120 tệp trong `src/main/` đổi chỗ; khoảng 200 câu import trong `main`, `renderer`, `preload` đổi đường dẫn (R4); `libraryHandlers.ts` và `ipc/library.ts` được tách; `LibraryStore` rút gọn còn khoảng một nửa (R6). Lịch sử Git giữ qua `git mv` nhận ra đổi tên.
- **Cấu hình:** `eslint.config.mjs` (luật ranh giới), `.prettierrc.yaml` (`endOfLine: auto`), thêm `scripts/check.mjs`; `scripts/refresh-model-catalog.mjs` đổi đường dẫn tới `modelCatalog.json`. `tsconfig.*.json`, `electron.vite.config.ts`, `vitest.config.ts`, `electron-builder.yml` giữ nguyên vì đang dùng glob.
- **Dữ liệu người dùng và giao diện:** không đổi. Không migration, không đụng schema.
- **Tài liệu:** handbook, các change đang mở, `AGENTS.md` (lệnh kiểm). Mục nhật ký đã đóng và `archive/` giữ nguyên chữ.
- **Rủi ro chính:** test dùng đường dẫn tương đối tới tiến trình con và fixture (`crash*Child.ts`, `__fixtures__`) nên phải dời cùng nhóm; ghi ở `design.md`.
- **Không có nhánh dài hơi nào đang chờ** (`ui/rhythm-d-screens` trùng `main`), nên chưa có xung đột hợp nhất; làm trên `main`, từng bước một commit sạch để `git revert` được.
