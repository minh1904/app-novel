## Context

Xem `proposal.md` để biết động cơ. Renderer hiện có 171 file dưới `features`, trong đó `work`, `editor`,
`settings`, `models` và `library` gần như phẳng hoàn toàn. Alias `@renderer/*` đã được khai báo nhưng chưa
được dùng; code renderer có hơn 200 import tương đối đi từ ba cấp trở lên. `App.tsx` đồng thời bootstrap
dịch vụ, khôi phục workspace, điều hướng, giữ tab sống và render màn hình.

Ranh giới process hiện tại (`main`, `preload`, `renderer`, `shared`) đã đúng và có rule Biome bảo vệ. Refactor
chỉ thay kiến trúc bên trong renderer. Worktree đang có change `source-system-foundation` chạm vào nhiều file
renderer nên việc apply phải bắt đầu sau khi change đó được commit, archive hoặc tách khỏi worktree.

## Goals / Non-Goals

**Goals:**

- Làm cây thư mục thể hiện domain sản phẩm trước, feature/use case sau.
- Mỗi component, hook, model và store có một owner rõ ràng.
- Cho phép app và domain dùng nhau qua public surface hẹp, không deep-import implementation của domain khác.
- Loại vòng phụ thuộc giữa module và làm cho dependency direction kiểm tra được tự động.
- Chia migration thành lát cắt cơ học, review được và giữ test chạy sau mỗi lát cắt.

**Non-Goals:**

- Không đổi UI, wording, hành vi điều hướng, luồng dữ liệu, schema SQLite hay IPC contract.
- Không áp dụng convention `app/` của Next.js vào Electron renderer.
- Không chuyển business logic từ main process sang renderer.
- Không tạo đủ `components/hooks/model/store` cho mọi module nếu module chưa cần.
- Không tách package hoặc monorepo package mới trong change này.

## Decisions

### 1. Dùng `modules` làm lớp domain của renderer

Cây đích:

```text
src/renderer/src/
├── app/                         # composition, navigation, shell, lifecycle
├── components/ui/               # primitive và pattern UI trung lập domain
├── hooks/                       # hook generic dùng bởi nhiều module
├── lib/                         # helper React-free, trung lập domain
└── modules/
    ├── library/
    ├── workspace/
    ├── ai-connections/
    ├── context/
    ├── sources/
    └── export/
```

`modules` được chọn thay vì tiếp tục dùng `features` vì mỗi thư mục cấp một là một domain sở hữu state,
model và UI, không phải một màn hình hay hành động đơn lẻ. `domains` không được chọn vì module renderer còn
sở hữu presentation và adapter UI, không chỉ domain model thuần.

Không tạo `renderer/src/shared` để tránh nhầm với `src/shared`, vốn là contract dùng qua nhiều process.
Phần dùng chung trong renderer tiếp tục nằm ở `components/ui`, `hooks` hoặc `lib` theo loại trách nhiệm.

### 2. Feature/use case nằm trong module sở hữu

Các nhóm hiện tại được gom như sau:

| Hiện tại | Owner đích | Feature/use case bên trong |
| --- | --- | --- |
| `library` | `modules/library` | catalog, create/edit work, cover |
| `work`, `chapter`, `editor`, `chapter/chat`, `chapter/translate` | `modules/workspace` | work detail, chapter navigation, editor, assistant, translation |
| `settings`, `models`, `onboarding`, `connectionStore` | `modules/ai-connections` | settings, account login, model selection |
| `glossary`, `addressing`, `shared-glossary`, `style-profiles` | `modules/context` | glossary, addressing, shared context, style profile |
| `sources`, `updates` | `modules/sources` | source management, update feed |
| `export` | `modules/export` | scope selection và export dialog |

`home` là màn hình composition nên chuyển vào `app/screens/home`. Các placeholder `jobs` và `assistant`
chỉ thành module riêng khi có model/state thật; trước đó chúng ở `app/screens` và không được dùng làm nơi
chứa business logic.

Mỗi module chỉ tạo thư mục kỹ thuật khi đủ lớn. Ví dụ:

```text
modules/workspace/
├── chapter-editor/
│   ├── components/
│   ├── hooks/
│   └── model/
├── chapter-navigation/
├── work-detail/
├── assistant/
├── translation/
├── store/
└── public.ts
```

Không đặt ngưỡng dòng cứng. Tách file khi có responsibility độc lập, lifecycle riêng hoặc test độc lập.

### 3. Module có public surface hẹp và graph không chu trình

Mỗi module có thể có `public.ts`, export tường minh những entry mà app hoặc module khác được phép dùng.
Không dùng barrel đệ quy và không export helper nội bộ. Import nội bộ dùng đường dẫn tương đối ngắn; import
qua boundary dùng alias `@renderer/*`.

Luật dependency:

```text
src/shared contracts
        ↓
renderer lib / hooks / components-ui
        ↓
renderer modules (qua public.ts khi đi liên module)
        ↓
app composition
```

- `app` được import public surface của module.
- Module không import từ `app`.
- Module không deep-import module khác; nếu thật sự cần, chỉ import từ `public.ts` và cạnh đó phải không tạo
  chu trình.
- Model/contract dùng qua nhiều process đặt tại `src/shared`; type chỉ có ý nghĩa presentation vẫn ở module.
- Component được hai module dùng không tự động trở thành UI primitive. Chỉ promote khi semantics trung lập;
  nếu không, module owner export component đó qua public surface.

Một kiểm tra mới trong `scripts/check.mjs` sẽ phát hiện import ngược, deep import liên module và chu trình.
Ưu tiên script dùng TypeScript parser sẵn có thay vì thêm ESLint/runtime dependency.

### 4. Hook và store được đặt theo ownership

- Hook gắn với use case nằm cạnh use case: `useChapterScreen`, `useSentenceRows` và
  `useParagraphTranslate` thuộc `workspace`.
- Hook domain-wide nằm ở `<module>/hooks`; hook generic, domain-neutral và dùng bởi nhiều module mới vào
  root `hooks`.
- Helper thuần như thống kê, format, state transition và form mapping nằm ở `model` hoặc `lib`, không đổi
  thành hook.
- Zustand store nằm trong `<module>/store`. `libraryStore`, `chapterStore`, `aiChatStore`,
  `paneLayoutStore` và `connectionStore` chuyển về owner tương ứng.
- `uiStore` không được chuyển nguyên khối. Nó được tách theo ownership: navigation/shell ở `app`, tab và
  pane workspace ở `workspace`; trạng thái mở settings ở `ai-connections` nếu không thể biểu diễn bằng
  composition props.
- `notificationStore` là hạ tầng UI cấp app; đặt dưới `app/notifications` hoặc thay bằng API UI hiện có,
  nhưng không thuộc một domain sản phẩm.

### 5. `App.tsx` chỉ giữ composition

Các effect đồng bộ với hệ thống ngoài được tách theo ý nghĩa, không tạo lifecycle hook tổng quát:

- `useWorkspaceRestore`
- `useAppShortcuts`
- `useSystemThemeSync`
- `useAppVersion`
- listener phiên AI do module workspace sở hữu

Điều hướng/switch màn hình chuyển sang app router nội bộ hoặc component `AppContent`; tab workspace chuyển
sang composition component riêng. `App.tsx` chỉ lắp provider, shell, navigation và các surface cấp app.

### 6. Migration theo lát cắt, không big-bang

Mỗi lát cắt gồm di chuyển file, sửa import, cập nhật boundary test và chạy `node scripts/check.mjs`. Không
kết hợp việc di chuyển với đổi UI hoặc viết lại state. Tách logic lớn chỉ thực hiện sau khi file đã ở đúng
owner để diff dễ review và rollback.

Thứ tự owner ít phụ thuộc trước:

1. Chuẩn bị alias, boundary checker và app/shared UI rules.
2. `library`.
3. `ai-connections`.
4. `context`.
5. `sources` sau khi `source-system-foundation` ổn định.
6. `export`.
7. `workspace`, rồi làm mỏng `App.tsx` và tách `uiStore`.
8. Xóa `features` và `stores` cũ khi không còn consumer.

Không giữ compatibility shim hoặc re-export tại đường dẫn cũ sau khi một lát cắt hoàn tất. Source, test
và toàn bộ consumer của một owner được chuyển trong cùng lát cắt để lỗi import xuất hiện ngay. Danh sách
ngoại lệ chỉ thuộc boundary checker trong thời gian chuyển đổi, không được trở thành API trung gian.

### 7. Boundary checker là executable architecture

Checker quét TypeScript/TSX trong `src/renderer/src`, chuẩn hóa relative path và alias thành đường dẫn
repository rồi tạo graph ở cấp module. Cả import thường, type-only import, re-export và dynamic import có
specifier tĩnh đều tạo cạnh; test colocate chịu cùng luật với source. Fixture riêng của checker được loại
khỏi graph production bằng cấu hình tường minh.

| Nguồn | Đích | Kết quả |
| --- | --- | --- |
| `app/**` | public surface của module | Cho phép |
| Một module | file nội bộ cùng module | Cho phép |
| Một module | `modules/<khác>/public.ts` | Cho phép nếu graph không chu trình |
| Một module | implementation bên trong module khác | Từ chối |
| Một module | `app/**` | Từ chối |
| `components/ui`, root `hooks` hoặc `lib` | `app/**` hay một module | Từ chối |
| Renderer | `main`, `preload` hoặc `measurement` | Tiếp tục từ chối bằng rule process hiện có |

Checker phải báo file nguồn, specifier, rule vi phạm và chuỗi module tạo chu trình. Exit code khác 0 khi có
vi phạm. Giai đoạn đầu checker đọc allowlist có owner và lý do; mỗi lát cắt phải giảm hoặc giữ nguyên số
ngoại lệ, không được tăng. Change chỉ hoàn tất khi allowlist rỗng và bị xóa.

### 8. Public surface và ownership có tiêu chí rõ ràng

`public.ts` chỉ export component, hook, command hoặc type mà app/module khác thật sự sử dụng. Nó không
`export *`, không export store nguyên khối nếu consumer chỉ cần một command/selectors, và không được dùng
cho import nội bộ của chính module. Consumer qua boundary luôn dùng
`@renderer/modules/<owner>/public` để review có thể nhận ra cạnh liên module.

Quy tắc chọn owner:

1. Mã sở hữu invariant hoặc state nghiệp vụ đặt ở domain của invariant đó.
2. UI chỉ compose nhiều owner nhưng không sở hữu invariant đặt ở `app/screens`.
3. Mã có một owner chính nhưng nhiều consumer vẫn ở owner và được export qua public surface.
4. Chỉ promote lên root `components/ui`, `hooks` hoặc `lib` khi có ít nhất hai consumer độc lập và tên,
   input, output không còn thuật ngữ domain.
5. Không tạo folder kỹ thuật rỗng; folder xuất hiện khi có file và responsibility tương ứng.

### 9. Store và lifecycle được tách theo hai bước

Các store đã có owner rõ (`libraryStore`, `connectionStore`, `chapterStore`, `aiChatStore`,
`paneLayoutStore`) được di chuyển nguyên trạng trước; không đổi shape, action, persistence key hoặc timing
trong commit di chuyển. Sau khi consumer ổn định mới thu hẹp public API nếu test chứng minh tương đương.

`uiStore` được khóa hành vi bằng characterization test rồi tách theo bảng sau:

| State/lifecycle hiện tại | Owner đích |
| --- | --- |
| `view`, navigation command, `navCollapsed`, command palette | `app/navigation` |
| `theme`, `themePreference`, system theme listener | `app/theme` |
| `appVersion` | `app/shell` hoặc hook app-info |
| `tabs`, `activeWorkId`, workspace restore/save/notice, chapter sidebar | `modules/workspace` |
| `settings`, `onboardingOpen` | `modules/ai-connections` hoặc app composition nếu chỉ là overlay state |
| leave guard registry | `modules/workspace/chapter-editor` với provider được app lắp |
| notification state | `app/notifications` |

`resetAllStores` tiếp tục reset được mọi store trong test sau khi đổi vị trí; registry reset là hạ tầng test,
không phải domain store.

### 10. Acceptance contract và gate cho từng lát cắt

Mỗi lát cắt phải thỏa tất cả điều kiện sau trước khi chuyển owner tiếp theo:

- source và test của owner đã cùng về vị trí mới, không còn consumer ở đường dẫn cũ;
- targeted test của owner qua, `node scripts/check.mjs` qua và số ngoại lệ boundary không tăng;
- không thay đổi `window.mira`, contract trong `src/shared`, schema/persistence key, wording, DOM interaction
  hoặc design token;
- module mới không import `app`, không deep-import module khác và không tạo chu trình;
- public surface chỉ chứa export đang có consumer;
- tài liệu frontend architecture ghi mapping, bằng chứng check và sai khác có chủ ý nếu có.

Definition of Done toàn change:

1. `src/renderer/src/features` và `src/renderer/src/stores` không còn tồn tại.
2. Mọi domain nằm dưới `modules`, feature/use case nằm trong owner và app chỉ compose public surface.
3. Boundary checker chạy bắt buộc trong `node scripts/check.mjs`, không còn allowlist.
4. Toàn bộ test trước refactor vẫn tồn tại hoặc được di chuyển/đổi tên có lý do; không xóa test để làm check
   qua.
5. `node scripts/check.mjs --build` qua và smoke test Library, Work, Chapter, Settings, Sources, Updates
   xác nhận cùng luồng quan sát được trước refactor.
6. `ARCHITECTURE.md` và tài liệu module phản ánh trạng thái đã triển khai; `DESIGN.md` không đổi nếu UI
   không đổi.

### Các phương án không chọn

- **Giữ feature-first phẳng:** thêm file nhanh nhưng tiếp tục không xác định owner của state/model và không
  giải quyết vòng phụ thuộc hiện tại.
- **Chia cấp cao theo loại kỹ thuật (`components/hooks/stores/pages`):** gom file cùng loại nhưng tách các
  phần thường thay đổi cùng một use case.
- **Tách mỗi domain thành package:** boundary mạnh hơn nhưng tăng cấu hình build và release không cần thiết
  ở quy mô hiện tại.
- **Dùng re-export shim ở cây cũ:** giảm diff tức thời nhưng kéo dài hai kiến trúc và làm checker khó phân
  biệt migration hoàn tất.
- **Thêm thư viện dependency graph ngay:** chưa cần khi TypeScript parser sẵn có đủ cho rule cục bộ; chỉ
  xem lại nếu checker tự viết không biểu diễn được graph hoặc gây chi phí bảo trì cao.

## Risks / Trade-offs

- **[Diff đổi đường dẫn lớn che khuất thay đổi hành vi]** → commit di chuyển cơ học riêng, không format hoặc
  refactor logic trong cùng commit.
- **[Xung đột với change đang chạy]** → không bắt đầu apply khi các file cùng owner còn thay đổi chưa được
  đóng gói; `sources` được di chuyển sau cùng trong nhóm domain độc lập.
- **[Public surface trở thành barrel khổng lồ]** → export tường minh entry ổn định, không `export *` toàn
  module và không dùng public surface cho import nội bộ.
- **[Cấm cross-module quá chặt dẫn đến prop drilling]** → cho phép phụ thuộc một chiều qua `public.ts`; app
  composition vẫn là lựa chọn mặc định khi hai surface chỉ gặp nhau ở cấp màn hình.
- **[Đặt sai owner làm phát sinh module “shared” mới]** → ưu tiên owner sử dụng chính; chỉ promote sau khi có
  ít nhất hai consumer độc lập và semantics không còn gắn domain.
- **[Tách store làm thay đổi timing hoặc persistence]** → trước tiên di chuyển store nguyên trạng, sau đó
  tách bằng characterization test; không đổi key persisted trong change này.
- **[Boundary checker tạo false positive]** → parser chỉ xét import/export tĩnh trong source renderer và có
  fixture test cho alias, relative path, type-only import và test file.

## Migration Plan

1. Hoàn tất hoặc cô lập các thay đổi hiện có chạm renderer; lưu baseline `node scripts/check.mjs` thành công.
2. Thêm tài liệu kiến trúc, alias convention và kiểm tra boundary ở trạng thái tương thích với cây cũ.
3. Tạo module owner theo thứ tự trên; di chuyển cả source và test của từng lát cắt, sửa import, chạy check.
4. Khi domain đã ổn định, tách component/hook lớn bằng test hiện có và bổ sung characterization test nếu
   chưa đủ bảo vệ.
5. Chuyển composition về `app`, xóa import liên module không qua public surface và bật boundary rule ở chế
   độ bắt buộc.
6. Xóa thư mục cũ rỗng, cập nhật tài liệu trạng thái đã triển khai và chạy
   `node scripts/check.mjs --build` trước khi push.

Rollback thực hiện theo từng commit/lát cắt. Vì không có migration dữ liệu hay contract, có thể revert lát
cắt gần nhất mà không cần phục hồi dữ liệu người dùng.
