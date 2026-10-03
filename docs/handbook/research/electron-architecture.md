# Kiến trúc và cấu trúc thư mục của các app Electron mã nguồn mở

Ngày đọc: **2026-10-03** · Trạng thái: **Quan sát** (cây thư mục đọc qua GitHub API, hướng dẫn chính thức đọc qua web) cộng **suy luận** cho Mira, ghi riêng ở dưới · Chủ trì: engineering · Liên quan: [kiến trúc, mục "Cấu trúc mã nguồn và luật ranh giới"](../engineering/architecture.md#cấu-trúc-mã-nguồn-và-luật-ranh-giới), change `refactor-electron-structure`.

## Câu hỏi và phương pháp

**Câu hỏi:** các sản phẩm Electron lớn có mã nguồn mở chia kiến trúc thế nào, và Mira nên học khuôn nào cho `src/main` và `src/shared` trước khi thêm tác vụ dịch chạy nền, kho đề xuất và sổ chi phí?

**Mẫu:** 11 sản phẩm, chọn theo hai tiêu chí: quy mô đủ lớn để cấu trúc đã chịu áp lực thật, và có mã nguồn công khai đọc được. **Cách đọc:** liệt kê thư mục ở các tầng 1–3 bằng GitHub API (`contents`), đọc thêm vài tệp chốt (`helper-process.ts`, `provider-contract.ts`, cấu hình lint của VS Code và Signal), và đọc hướng dẫn hiệu năng cùng tài liệu `utilityProcess` của Electron. **Không chạy thử** bất kỳ sản phẩm nào và **không đo** hiệu năng hay kích thước của chúng.

## Quan sát

| Sản phẩm | Cách chia (thấy trong cây thư mục) | Điểm đáng chú ý | Nguồn (đọc 2026-10-03) |
| --- | --- | --- | --- |
| **VS Code** | `src/vs/{base, platform, editor, workbench, code, server}`; trong mỗi tầng chia theo môi trường: `common`, `browser`, `node`, `electron-main`, `electron-utility` | Mỗi tầng chỉ phụ thuộc tầng dưới; **ép bằng lint riêng** (`code-layering`, `code-import-patterns`); dịch vụ có interface và đăng ký singleton | [Source Code Organization](https://github.com/microsoft/vscode/wiki/Source-Code-Organization), [`.eslint-plugin-local`](https://github.com/microsoft/vscode/tree/main/.eslint-plugin-local) |
| **Signal Desktop** | `ts/` chia theo tính năng; **hậu tố tên tệp ghi môi trường**: `.std`, `.node`, `.dom`, `.preload`, `.main`; SQL ở `ts/sql/` với `Server.node.ts` và `mainWorker.node.ts` | Plugin lint tự viết `enforce-file-suffix` và `no-restricted-paths`; **cơ sở dữ liệu chạy trong worker**, không trên luồng main | [`ts/`](https://github.com/signalapp/Signal-Desktop/tree/main/ts), [`.oxlintrc.json`](https://github.com/signalapp/Signal-Desktop/blob/main/.oxlintrc.json) |
| **AFFiNE** | `electron/src/{main, preload, helper, shared}`; `main/` chia theo năng lực (`windows-manager`, `updater`, `tray`, `security`…) | **Kho dữ liệu (`nbstore`) chạy trong `utilityProcess` riêng** (`helper/`), renderer nói với nó qua `MessageChannelMain` | [`electron/src`](https://github.com/toeverything/AFFiNE/tree/canary/packages/frontend/apps/electron/src) |
| **Zettlr** | `source/app/service-providers/*` (khoảng 20 provider: `config`, `documents`, `fsal`, `search`…), mỗi cửa sổ một thư mục `win-*` | Mọi provider theo một hợp đồng chung `boot()` / `shutdown()` | [`service-providers`](https://github.com/Zettlr/Zettlr/tree/develop/source/app/service-providers) |
| **Joplin** | Monorepo `packages/`; `lib` (models, services, migrations, sync) dùng chung cho desktop, mobile, CLI | Lõi không biết Electron | [`packages/`](https://github.com/laurent22/joplin/tree/dev/packages) |
| **Notesnook** | Monorepo; `packages/core/src/{api, collections, database}` | Như Joplin | [`packages/core`](https://github.com/streetwriters/notesnook/tree/master/packages/core) |
| **Bruno** | Monorepo; `bruno-electron/src/{app, ipc, services, store}`; thư mục `ipc/` có **mỗi khu vực một tệp** (`collection.js`, `git.js`, `sqlite.js`…) | Khuôn "mỗi khu vực IPC một tệp" | [`packages/`](https://github.com/usebruno/bruno/tree/main/packages) |
| **Mattermost Desktop** | `src/{main, app, renderer, common}`; `main/` là dịch vụ nền, `app/` là cửa sổ, view, menu | Tách tầng điều khiển cửa sổ khỏi dịch vụ | [`src/`](https://github.com/mattermost/desktop/tree/master/src) |
| **Insomnia** | Các điểm vào `entry.main.ts`, `entry.preload.ts`, `entry.hidden-window.ts`; vài việc nặng ở tiến trình riêng (`lint-process.mjs`, `mock-generation-process.mjs`) | Việc nặng ra khỏi main | [`src/`](https://github.com/Kong/insomnia/tree/develop/packages/insomnia/src) |
| **GitHub Desktop** | `app/src/{main-process, ui, lib, models}` | `main-process/` mỏng | [`app/src`](https://github.com/desktop/desktop/tree/development/app/src) |
| **Logseq** | `src/{electron, main}` cộng `deps/` (thư viện nội bộ như `graph-parser`) | Lõi tách thành thư viện | [`src/`](https://github.com/logseq/logseq/tree/master/src) |

**Hướng dẫn chính thức của Electron:** ["Under no circumstances should you block this process and the UI thread with long-running operations"](https://www.electronjs.org/docs/latest/tutorial/performance) (mục 3, Blocking the Main Process), và nên [gói mã thành một tệp](https://www.electronjs.org/docs/latest/tutorial/performance) vì `require()` tốn kém (mục 7). [`utilityProcess`](https://www.electronjs.org/docs/latest/api/utility-process) tạo tiến trình con có đủ Node và trao đổi qua `MessagePortMain`; tài liệu định vị nó là lựa chọn cho việc nặng bên ngoài main.

**Giới hạn của bằng chứng:**

- Chỉ thấy **cây thư mục và vài tệp**, không thấy lý do các nhóm đã chọn cách đó; phần "điểm đáng chú ý" là đọc từ tên thư mục và tên tệp, trừ chỗ có trích nguồn.
- "Cấm import chéo tầng" của VS Code và Signal thấy qua **tên luật lint**; tôi không đọc toàn bộ luật.
- Danh sách thư mục có thể đã đổi sau ngày đọc; nhiều dự án đang phát triển nhanh.
- Không nói gì về hiệu năng hay chất lượng thực tế của từng khuôn.

## Suy luận cho Mira

Bảy khuôn lặp lại ở nhiều sản phẩm, và việc Mira học khuôn nào:

| # | Khuôn | Ai làm | Quyết định cho Mira |
| --- | --- | --- | --- |
| K1 | Chia theo tiến trình: main, preload, renderer, shared | Tất cả | Đã có, giữ nguyên |
| K2 | Lõi không import Electron, test được bằng Node trần | VS Code, Joplin, Notesnook, Bruno | Làm: chỉ `electron/` và `index.ts` được import `electron` |
| K3 | Main chia theo dịch vụ, có vòng đời chung | Zettlr, AFFiNE, Mattermost | Làm: bốn tầng `infra`, `services`, `ipc`, `electron` |
| K4 | Ép ranh giới bằng lint | VS Code, Signal | Làm, là việc đầu tiên: `no-restricted-imports`, không thêm dependency |
| K5 | Dữ liệu và việc nặng ra khỏi main | AFFiNE, Signal, Insomnia | Chỉ chuẩn bị chỗ: luật ở K2 làm cho việc chuyển khả thi; **chưa chuyển** vì chưa đo giao diện khựng |
| K6 | IPC mỗi khu vực một tệp | Bruno, AFFiNE | Làm: `ipc/handlers/` |
| K7 | Monorepo nhiều package | Joplin, Notesnook, Bruno | Chưa cần: mới có một app |

**Hoãn:** hệ thống DI kiểu VS Code (quá nặng cho repo cỡ này), hậu tố tên tệp kiểu Signal (chia theo thư mục đã đủ rõ), bí danh `@shared`, và chuyển sang `utilityProcess`.

**Điều có thể bác bỏ kết luận:** nếu một lần đo giao diện khựng khi lưu chương dài hoặc khi tác vụ dịch chạy cho thấy luồng main là nút cổ chai, K5 phải làm sớm hơn; nếu `no-restricted-imports` bị lách bởi một đường dẫn bí danh hay re-export, K4 phải chuyển sang `dependency-cruiser`.

## Bước kiểm chứng

1. **Khuôn có giữ được trong lúc thêm tính năng:** sau khi làm các lõi của [kiến trúc AI-first](../engineering/ai-first-architecture.md) (kho đề xuất, máy chạy tác vụ, sổ chi phí), đếm số lần phải sửa luật lint hoặc dời tệp vì chỗ đặt sai. Mục tiêu: không lần nào.
2. **K5 có cần không:** đo thời gian main bị chiếm khi lưu một chương 300.000 ký tự (ghi nhận hiện tại 2,1 giây trong [hiện trạng](../engineering/current-state.md)) và khi một tác vụ dịch đang chạy; nếu giao diện khựng quá một khung hình, làm smoke test `node:sqlite` trong `utilityProcess` rồi chuyển.
3. **Luật lint có lách được không:** thử một đường dẫn bí danh và một re-export qua tầng thấp; ghi kết quả.

---

[Mục lục handbook](../README.md)
