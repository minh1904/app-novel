# Đề xuất công nghệ cho bản Windows offline đầu tiên

Cập nhật: 2026-10-03 (bản gốc 2026-09-23). Stack dưới đây đã được chọn và dùng trong **bản MVP thử nghiệm**: Electron + React + TypeScript + Tailwind CSS v4 + Base UI, CodeMirror 6 và `node:sqlite` đã chốt ở [ADR-003](../decisions/0003-technology-stack.md). Ràng buộc đã chốt: app Windows trước, biên tập cốt lõi chạy offline, app lưu dữ liệu nội bộ và cho xuất/backup. **AI là luồng chính của bản đầu** ([ADR-002](../decisions/0002-ai-first-translation.md)), không còn là giai đoạn sau. Hướng kiến trúc cho lần làm lại theo module là [kiến trúc AI-first](ai-first-architecture.md) ([ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md)); trang này giữ phần stack và **luật ranh giới mã nguồn**, phần vẫn đúng sau ADR-005.

## Stack đề xuất

| Lớp | Công nghệ | Lý do |
| --- | --- | --- |
| Desktop shell | **Electron** | Một Chromium đóng gói cùng app giúp trải nghiệm editor và hành vi nhập liệu nhất quán trên các bản Windows; có API hệ điều hành cho file, menu, cửa sổ. Tradeoff: bộ cài và RAM lớn hơn Tauri. |
| UI | **React + TypeScript + Tailwind CSS v4 + Base UI** | Một editor hai pane trên mô hình tài liệu chương/đoạn; Tailwind giữ token/style, Base UI cung cấp hành vi cho component tương tác dùng chung, TypeScript giữ type cho dữ liệu chương và hợp đồng IPC. |
| Build | **electron-vite** | Tách main, preload, renderer và có quy trình phát triển với Vite. |
| Editor | **CodeMirror 6 + Markdown extension**, `@codemirror/merge` cho duyệt đề xuất | Văn bản dài, transaction/change set, selection và trang trí giao diện. Live Preview kiểu Obsidian là phần tự xây, không phải tính năng có sẵn chỉ nhờ cài CodeMirror. Đề xuất AI hiện ngay trong pane và nhận/bỏ từng chỗ, không dựng lại editor nên giữ được undo. |
| Lưu local | **SQLite** (`node:sqlite`), kèm xuất/nhập TXT/Markdown | Đã chốt ở ADR-003: `library.db` cùng một tệp `.mira` mỗi tác phẩm, transaction trong main. SQLite là nguồn sự thật duy nhất; Markdown chỉ là cách chiếu ra cho editor, prompt và xuất ([ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md)). |
| Ranh giới quyền | Electron main/preload + **typed IPC/contextBridge** | Renderer không được truy cập trực tiếp filesystem/database. Bật context isolation, sandbox và tắt Node integration. |
| Đóng gói Windows | **electron-builder** trong scaffold, thử installer NSIS | Có lệnh tạo installer cho người dùng thử. Cơ chế ký app và cập nhật sẽ chốt trước khi phân phối rộng. |

AI gọi dịch vụ qua **một adapter tương thích OpenAI** trong `main` ([ADR-004](../decisions/0004-ai-provider-layer.md)); model local (Ollama/LM Studio) đi cùng adapter đó chỉ khác `baseUrl`. Chỉ bước gọi AI cần mạng: truy cập internet không được chặn đọc, sửa, lưu, lịch sử, nhập/xuất hoặc backup.

## Vì sao giữ Electron thay vì Tauri?

Tauri cũng dùng web UI với backend Rust và Windows WebView, và có thể giảm kích thước đóng gói. Đánh giá ngày 2026-10-03 ([kiến trúc AI-first mục 8](ai-first-architecture.md#8-nền-desktop-giữ-electron-quan-sát--đề-xuất)) kết luận **không chuyển**: IME là rủi ro kỹ thuật số một, Electron 44.4.5 ghim Chromium 152.0.7977.130 đã qua thử tay Telex/VNI/Pinyin, còn WebView2 Evergreen không ghim được và lỗi mất lần gõ IME đầu được báo cho WebView2 149+; chuyển Tauri phải viết lại `main` bằng Rust (5.842 dòng TS cùng 8.587 dòng test) và lợi ích dung lượng/RAM chưa đo. Nếu sau này có yêu cầu dung lượng hay RAM cụ thể mà Electron không đáp ứng, thử Tauri trên đúng bộ chương mẫu trước khi đổi.

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

Chỗ đặt dự kiến cho các lõi của [kiến trúc AI-first](ai-first-architecture.md) (hướng đã chốt ở ADR-005, **chưa làm**): kho đề xuất, dấu AI và sổ chi phí ở `infra/storage/`; máy chạy tác vụ và đề xuất ở `services/`; khu vực kênh mới ở `ipc/handlers/`; `buildContext` thuần ở `shared/algorithms/` (không import `node:*`, nên hàm băm được tiêm từ `main`).

### Kiểm tra

`node scripts/check.mjs` chạy typecheck hai project, test, lint, và với `--build` cả `electron-vite build`; một bước không có bằng chứng đã chạy là thất bại. Test chạy hai pha: pha song song cho phần lớn, pha tuần tự cho năm tệp đo đồng hồ hoặc giết tiến trình. Lý do ở `AGENTS.md` và đầu `scripts/check.mjs`; số đo ở `baseline.md` của change `refactor-electron-structure`.

### Chưa làm, và đã loại

- **Chưa** chuyển `services`/`infra` sang `utilityProcess`. Luật "lõi không import Electron" là điều kiện cần; còn thiếu smoke test `node:sqlite` trong `utilityProcess`, cách xử lý `safeStorage` (chỉ có ở main), và số đo giao diện khựng.
- **Không** làm: monorepo (mới có một app), hệ thống DI kiểu VS Code, bí danh `@shared`, đổi tên tệp cho đẹp.
- **Đã loại:** chia theo môi trường chạy (`common/node/electron-main`) vì Mira chỉ có một tiến trình main; chia theo tính năng vì `LibraryStore` và các hàm SQL phục vụ nhiều tính năng cùng lúc.

## Mô hình dữ liệu

Mô hình dữ liệu đích (chương → đoạn, dấu AI, đề xuất, snapshot, tác vụ, ngữ cảnh; SQLite là nguồn sự thật, Markdown là cách chiếu) nằm ở [kiến trúc AI-first mục 5](ai-first-architecture.md#5-kiến-trúc-tổng-thể-đề-xuất) và quyết định ở [ADR-005](../decisions/0005-ai-first-proposals-no-sentence-mode.md). Mô hình **MVP đang chạy** (văn bản theo bên + segment + liên kết n:m + nguồn gốc theo câu) ghi ở [hiện trạng](current-state.md) và sẽ được thay ở schema v6. Không lấy “dòng hiển thị” làm ID ở cả hai mô hình.

Tự động lưu phải có phục hồi sau crash và backup có thể mở độc lập với bản cài; snapshot trước khi áp dụng đề xuất AI nằm trong module Đề xuất.

## Spike: đã làm và còn lại

Đã làm trong MVP (bằng chứng ở [ADR-003](../decisions/0003-technology-stack.md) và [hiện trạng](current-state.md)): một chương dài thật mở và sửa trong CodeMirror, đo cuộn/phím/lưu ở 5.000 segment; IME Telex/VNI/Pinyin thử tay trên bản editor tối thiểu (2026-10-01); nhập TXT/MD, backup/restore, test kill tiến trình giữa lúc ghi.

Còn lại:

1. Chạy lại bảng ca IME cho các phần mới của editor (Live Preview ẩn dấu, ảnh, review đề xuất).
2. Giả lập mất điện đột ngột (mới có kill tiến trình).
3. Bản cài Windows chạy offline trên máy sạch; đo kích thước, RAM và thời gian mở.
4. Kiểm tra IPC, sandbox, CSP, nhập file không đáng tin và quyền ghi file.
5. Gọi nhà cung cấp AI thật để lấy hình dạng SSE và lỗi giữa dòng (task 1.x của `ai-chat`).

## Tài liệu gốc

- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [security](https://www.electronjs.org/docs/latest/tutorial/security).
- [Tauri architecture](https://v2.tauri.app/concept/architecture/).
- [electron-vite](https://electron-vite.org/guide/), [electron-builder](https://www.electron.build/).
- [CodeMirror 6 guide](https://codemirror.net/docs/guide/), [TanStack Virtual](https://tanstack.com/virtual/latest/docs/introduction).
- [SQLite application file format](https://www.sqlite.org/appfileformat.html).

---

[Mục lục handbook](../README.md)
