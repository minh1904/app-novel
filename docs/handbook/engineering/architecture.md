# Đề xuất công nghệ cho bản Windows offline đầu tiên

Cập nhật: 2026-09-23. Người dùng đã yêu cầu scaffold Electron; Electron + React + TypeScript + Tailwind CSS v4 + Base UI hiện là nền thử nghiệm trong repo. Các lớp editor, lưu trữ và đóng gói bên dưới vẫn là **đề xuất kỹ thuật**, chưa được khóa cho P0. Ràng buộc đã chốt: app Windows trước, biên tập cốt lõi chạy offline, app lưu dữ liệu nội bộ và cho xuất/backup. AI thuộc giai đoạn sau bản đầu. *(Cập nhật 2026-10-03: thêm mục “Cấu trúc mã nguồn và luật ranh giới”; các mục khác giữ ngày cũ.)*

## Stack đề xuất

| Lớp | Công nghệ | Lý do |
| --- | --- | --- |
| Desktop shell | **Electron** | Một Chromium đóng gói cùng app giúp trải nghiệm editor và hành vi nhập liệu nhất quán trên các bản Windows; có API hệ điều hành cho file, menu, cửa sổ. Tradeoff: bộ cài và RAM lớn hơn Tauri. |
| UI | **React + TypeScript + Tailwind CSS v4 + Base UI** | Xây hai mode trên một mô hình tài liệu; Tailwind giữ token/style, Base UI cung cấp hành vi cho component tương tác dùng chung, TypeScript giữ type cho dữ liệu chương/segment. |
| Build | **electron-vite** | Tách main, preload, renderer và có quy trình phát triển với Vite. |
| Editor toàn văn | **CodeMirror 6 + Markdown extension** | Văn bản dài, transaction/change set, selection và trang trí giao diện phù hợp prototype Markdown/Live Preview. Live Preview kiểu Obsidian là phần phải tự xây, không phải tính năng có sẵn chỉ nhờ cài CodeMirror. |
| Editor từng câu | **React row UI + một editor hoạt động cho hàng đang sửa**; cân nhắc **TanStack Virtual** cho danh sách rất dài | Tránh tạo hàng nghìn editor cùng lúc; giao diện segment Smartcat-inspired dùng cùng nội dung chương. Virtualization cần thử kỹ với chiều cao hàng thay đổi và ô đang focus. |
| Lưu local | **SQLite**, kèm xuất/nhập TXT/Markdown | Một kho dữ liệu app quản lý nội bộ cho project, document, văn bản, phiên bản và metadata căn chỉnh; transaction giúp cập nhật nhất quán. SQLite là đề xuất, chưa chốt một DB toàn thư viện hay một file DB mỗi project. |
| Ranh giới quyền | Electron main/preload + **typed IPC/contextBridge** | Renderer không được truy cập trực tiếp filesystem/database. Bật context isolation, sandbox và tắt Node integration. |
| Đóng gói Windows | **electron-builder** trong scaffold, thử installer NSIS | Có lệnh tạo installer cho người dùng thử. Cơ chế ký app và cập nhật sẽ chốt trước khi phân phối rộng. |

AI thuộc giai đoạn sau P0; lúc đó có thể là adapter riêng gọi dịch vụ khi online. Việc chạy AI offline/chạy model local chưa được chốt. Truy cập internet không được chặn đọc, sửa, lưu, lịch sử, nhập/xuất hoặc backup.

## Vì sao nghiêng Electron thay vì Tauri lúc này?

Tauri cũng dùng web UI với backend Rust và Windows WebView. Nó có thể giảm kích thước đóng gói, nhưng cần thêm bề mặt Rust/WebView vào đội ngũ và phải kiểm tương thích editor thật. Electron có cùng Chromium đóng gói và khớp với kỹ năng React/TypeScript của prototype trước; đây là **suy luận về thời gian giảm rủi ro cho MVP**, không phải khẳng định Tauri không đáp ứng được. Nếu prototype cho thấy chi phí RAM/bộ cài của Electron không chấp nhận được, thử Tauri trên đúng bộ chương mẫu trước khi đổi.

## Cấu trúc mã nguồn và luật ranh giới

Cập nhật: **2026-10-03** · Trạng thái: **đã triển khai** (change `refactor-electron-structure`) và **được máy ép** bằng lint. Nguồn thật của luật là [`eslint.config.mjs`](../../../eslint.config.mjs); trang này mô tả, không thay nó. Cách chọn khuôn và nguồn khảo sát: [Kiến trúc các app Electron](../research/electron-architecture.md).

### Cây thư mục

```text
src/
  shared/                  chạy ở mọi nơi; không node:, electron, react
    contracts/             kiểu, schema valibot, tên kênh, DesktopApi, Result
    algorithms/            hàm thuần trên văn bản (chia câu, ánh xạ segment, chuẩn hóa raw)
  main/
    index.ts               gốc lắp ráp; được import electron
    electron/              safeStorage.ts, registerIpc.ts: nơi duy nhất (cùng index.ts) import 'electron'
    ipc/                   handler.ts, filePicker.ts, libraryHandlers.ts (bộ gộp) + handlers/ mỗi khu vực một tệp
    services/
      createServices.ts    dây lắp các service AI từ một library và một SecretCrypto
      library/             LibraryStore (nghiệp vụ của một tác phẩm) và nhóm test crash
      ai/                  kết nối, chat, dịch chương, chi phí
    infra/
      storage/             SQLite, migration, schema, hàm SQL theo bảng, WorkFiles (tệp và chỉ mục), __fixtures__
      providers/           adapter HTTP, hợp đồng provider, bảng model
    testing/               công cụ chỉ dành cho test
  preload/index.ts         chỉ electron và shared/contracts
  renderer/src/            app/, components/, features/, styles/ (không đổi)
```

### Bốn tầng của `main`

Mỗi tầng chỉ được import tầng **dưới** nó (và `shared`): `infra` < `services` < `ipc` < `electron`.

| Tầng | Việc của nó | Không được import |
| --- | --- | --- |
| `infra/` | Chạm thế giới ngoài: SQLite, tệp, HTTP tới nhà cung cấp AI. Gồm cả hợp đồng provider (`types.ts`) vì adapter hiện thực nó | `services/`, `ipc/`, `electron/`, `electron` |
| `services/` | Nghiệp vụ: `LibraryStore`, kết nối AI, chat, dịch chương. `services/library` không được import `services/ai` (dịch chương dùng `LibraryStore`, không ngược lại) | `ipc/`, `electron/`, `electron` |
| `ipc/` | Kênh → handler đã kiểm đầu vào, một tệp mỗi khu vực. Thuần, nên test gọi trực tiếp không cần cửa sổ | `electron/`, `electron` |
| `electron/` + `index.ts` | Mọi thứ của Electron: `ipcMain`, hộp thoại, `safeStorage`, cửa sổ | không có |

`LibraryStore` giữ nghiệp vụ của một tác phẩm (chương, văn bản, hàng, ảnh bìa, ảnh). Việc tệp nằm ở đâu và được tạo, nhập, xuất, đối soát với chỉ mục thế nào là của `WorkFiles` (`infra/storage/workFiles.ts`). Việc tách này mở đường để các service tiếp theo dùng `library.db` và tệp tác phẩm mà không phụ thuộc vào lớp nghiệp vụ; hiện `LibraryStore` vẫn là chỗ duy nhất dựng `WorkFiles`, và `appDb` vẫn là đường vào `library.db`.

`main/testing/` nằm ngoài các tầng. Mã chạy thật không được import nó; test thì được. Test và các tiến trình con `crash*.ts` được miễn luật tầng vì chúng dựng bối cảnh bằng cách import chéo.

### `shared`: hợp đồng và thuật toán

Kiểu miền chính là kiểu payload IPC (không có lớp DTO riêng) nên chúng cùng nằm ở `contracts/`. `algorithms/` được dùng `contracts/`, **không** ngược lại. `contracts/rows.ts` trộn schema với `buildRows` nên ở lại đó; cả tệp bị xóa khi gỡ mode Từng câu.

Bất biến cần giữ: bản đóng gói preload chỉ `require` `electron`. Tên kênh (`contracts/channels.ts`) là tệp lá không import gì lúc chạy để preload sandbox bundle được.

### Luật lint

| Vùng | Cấm import |
| --- | --- |
| `shared/**` | `node:*`, `electron`, `react`, `react-dom`, `main/`, `renderer/`, `preload/` |
| `shared/contracts/**` | thêm: `algorithms/` |
| `renderer/**` | `node:*`, `electron`, `main/`, `preload/` |
| `preload/**` | `node:*`, `main/`, `renderer/` |
| `main/infra/**` | `electron`, `services/`, `ipc/`, `electron/`, `renderer/`, `testing/` |
| `main/services/**` | `electron`, `ipc/`, `electron/`, `renderer/`, `testing/` |
| `main/services/library/**` | thêm: `services/ai` |
| `main/ipc/**` | `electron`, `electron/`, `renderer/`, `testing/` |
| `main/electron/**`, `main/index.ts` | `renderer/`, `testing/` |

Luật so khớp **chuỗi** trong câu import (bằng regex), nên tên thư mục dùng làm ranh giới phải là duy nhất trong repo. Một đường dẫn bí danh hoặc re-export qua tầng thấp có thể lách; chưa có cái nào. Khi có monorepo hoặc bí danh thì chuyển sang `dependency-cruiser`. Mỗi luật đã được chứng minh bắt được bằng một tệp vi phạm tạm, kèm ca đối chứng cho phép; kết quả nằm ở `baseline.md` của change `refactor-electron-structure`.

### Thêm cái mới thì đặt ở đâu

1. **Một khu vực IPC mới.** Thêm tên kênh vào `shared/contracts/channels.ts` và schema vào `shared/contracts/`; viết `ipc/handlers/<khu vực>.ts` trả `AreaHandlers<'tiền tố'>`; thêm `...<khuVuc>Handlers(deps)` vào `libraryHandlers.ts`. Quên handler là lỗi biên dịch ngay trong tệp khu vực; quên cả khu vực là lỗi ở bộ gộp.
2. **Một service mới.** Đặt vào `services/<nhóm>/`, nối trong `createServices.ts`; phần đọc ghi SQL ở `infra/storage/`. Cần API của Electron thì nhận nó như một tham số được tiêm (như `SecretCrypto`), đừng import.
3. **Một lời gọi ra ngoài** (HTTP, tiến trình khác). Đặt adapter ở `infra/providers/`.
4. **Chạm API của Electron** (cửa sổ, hộp thoại, `safeStorage`, `ipcMain`). Chỉ ở `electron/` hoặc `index.ts`.

Chỗ đặt dự kiến cho các lõi của [kiến trúc AI-first](ai-first-architecture.md) (đề xuất, **chưa làm**): kho đề xuất và sổ chi phí ở `infra/storage/`; máy chạy tác vụ và đề xuất ở `services/`; khu vực kênh mới ở `ipc/handlers/`; `buildContext` thuần ở `shared/algorithms/`.

### Kiểm tra

`node scripts/check.mjs` chạy typecheck hai project, test, lint, và với `--build` cả `electron-vite build`; một bước không có bằng chứng đã chạy là thất bại. Test chạy hai pha: pha song song cho phần lớn, pha tuần tự cho năm tệp đo đồng hồ hoặc giết tiến trình. Lý do ở `AGENTS.md` và đầu `scripts/check.mjs`; số đo ở `baseline.md` của change `refactor-electron-structure`.

### Chưa làm, và đã loại

- **Chưa** chuyển `services`/`infra` sang `utilityProcess`. Luật "lõi không import Electron" là điều kiện cần; còn thiếu smoke test `node:sqlite` trong `utilityProcess`, cách xử lý `safeStorage` (chỉ có ở main), và số đo giao diện khựng.
- **Không** làm: monorepo (mới có một app), hệ thống DI kiểu VS Code, bí danh `@shared`, đổi tên tệp cho đẹp.
- **Đã loại:** chia theo môi trường chạy (`common/node/electron-main`) vì Mira chỉ có một tiến trình main; chia theo tính năng vì `LibraryStore` và các hàm SQL phục vụ nhiều tính năng cùng lúc.

## Mô hình dữ liệu sơ bộ để hai mode dùng chung

- Một chương có bản gốc và bản dịch toàn văn, mỗi bên có phiên bản. Markdown là định dạng soạn/xuất; không lấy “dòng hiển thị” làm ID.
- Mode Từng câu hiển thị các segment được suy ra/duy trì từ cùng văn bản và metadata liên kết 1:1, 1:n, n:1, n:m. Sửa ở một mode phải cập nhật văn bản chung và đánh dấu liên kết chưa chắc cần kiểm tra.
- SQLite giữ phiên bản, ghi chú, từ điển và liên kết; xuất Markdown/TXT giúp người dùng mang bản dịch đi. Quyết định **Markdown là dữ liệu chuẩn hay dạng xuất** vẫn cần prototype.
- Tự động lưu phải có phục hồi sau crash và backup có thể mở độc lập với bản cài. Chưa chốt thời điểm snapshot và định dạng backup.

## Spike phải làm trước khi khóa stack

1. Một chương dài thật: mở và sửa trong CodeMirror toàn văn; chuyển qua bảng segment; đo cuộn, focus, undo, tiếng Việt IME.
2. Sửa/gộp/tách câu ở cả hai mode, lưu, đóng app, mở lại, kiểm tra văn bản và metadata căn chỉnh.
3. Nhập TXT/MD, xuất lại, backup/restore, giả lập mất điện/crash giữa lúc lưu.
4. Tạo bản cài Windows chạy offline trên máy sạch; đo kích thước, RAM và thời gian mở.
5. Kiểm tra IPC, sandbox, CSP, nhập file không đáng tin và quyền ghi file.

## Tài liệu gốc

- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [security](https://www.electronjs.org/docs/latest/tutorial/security).
- [Tauri architecture](https://v2.tauri.app/concept/architecture/).
- [electron-vite](https://electron-vite.org/guide/), [electron-builder](https://www.electron.build/).
- [CodeMirror 6 guide](https://codemirror.net/docs/guide/), [TanStack Virtual](https://tanstack.com/virtual/latest/docs/introduction).
- [SQLite application file format](https://www.sqlite.org/appfileformat.html).

---

[Mục lục handbook](../README.md)
