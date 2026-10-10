## 1. Baseline và executable architecture

- [x] 1.1 Xác nhận worktree không còn thay đổi chồng lấn với `source-system-foundation`, chạy
  `node scripts/check.mjs`, rồi ghi commit nền, số test và kết quả check vào tài liệu frontend architecture.
- [x] 1.2 Lập manifest `đường dẫn cũ → module/use case đích → test bảo vệ → public consumer` cho toàn bộ
  `features` và `stores`; xác nhận mọi file hiện tại xuất hiện đúng một lần và không có owner chưa chốt.
- [x] 1.3 Bổ sung characterization test cho các luồng chưa được khóa gồm workspace restore/save, leave guard,
  navigation/tab, settings/onboarding overlay và AI listener; xác nhận test mới fail khi cố ý phá invariant
  tương ứng và qua sau khi hoàn nguyên.
- [x] 1.4 Viết boundary checker bằng TypeScript parser cho import thường, type-only import, re-export và
  dynamic import có specifier tĩnh; xác nhận fixture báo đúng file, specifier và rule cho import ngược,
  deep import và chu trình module.
- [x] 1.5 Thêm fixture hợp lệ cho import nội bộ, app → module public surface, module → module public surface
  một chiều và import từ `src/shared`; xác nhận checker không tạo false positive với test colocate.
- [x] 1.6 Nối checker vào `node scripts/check.mjs` với allowlist baseline có owner/lý do, xác nhận cây hiện tại
  qua check và fixture vi phạm làm command thoát khác 0.
- [x] 1.7 Xác nhận alias `@renderer/*` resolve trong typecheck web và quy định import qua boundary dùng alias;
  chạy `node scripts/check.mjs` để kiểm không ảnh hưởng resolution hiện tại.

## 2. Module library

- [x] 2.1 Tạo `modules/library` theo manifest với catalog, work form, cover, model/store cần thiết và
  `public.ts` tường minh; xác nhận không có folder rỗng hoặc `export *`.
- [x] 2.2 Di chuyển model, hook và test thuộc catalog/cover từ `features/library`; sửa import nội bộ ngắn và
  xác nhận các test library hiện hữu cùng `node scripts/check.mjs` qua.
- [x] 2.3 Di chuyển create/edit work cùng test từ phần `features/work` do library sở hữu; xác nhận tạo, sửa,
  tải lại và cover vẫn được test với cùng contract.
- [x] 2.4 Di chuyển `libraryStore` và test vào `modules/library/store` mà không đổi state/action; xác nhận test
  store và reset store qua, persistence/IPC call không đổi.
- [x] 2.5 Chuyển app và consumer ngoài module sang `@renderer/modules/library/public`, loại vòng
  `library ↔ work`; xác nhận checker không còn ngoại lệ thuộc library.
- [x] 2.6 Ghi mapping và bằng chứng của lát cắt library vào tài liệu frontend architecture, rồi chạy
  `node scripts/check.mjs` và xác nhận số ngoại lệ boundary giảm.

## 3. Module ai-connections

- [x] 3.1 Tạo `modules/ai-connections` với settings, account login/onboarding, model selection, store và
  public surface tối thiểu; xác nhận tree khớp manifest và không export implementation helper.
- [x] 3.2 Di chuyển `features/models` cùng test vào model-selection; xác nhận chọn model, thinking level và
  fallback model vẫn qua test hiện hữu.
- [x] 3.3 Di chuyển `features/onboarding` cùng test vào account-login/onboarding; xác nhận mở tự động khi chưa
  có connection và luồng kết nối vẫn được test.
- [x] 3.4 Di chuyển `features/settings` cùng test vào settings; thay deep import sang model/onboarding bằng
  API nội module và xác nhận settings pages/modal qua test.
- [x] 3.5 Di chuyển `connectionStore` cùng test vào module mà không đổi preference, load state hoặc lifecycle;
  xác nhận test connection/provider preference và reset store qua.
- [x] 3.6 Chuyển app/workspace consumer sang public surface, loại chu trình
  `models → settings → onboarding → models`; xác nhận checker không còn ngoại lệ ai-connections.
- [x] 3.7 Ghi bằng chứng lát cắt và chạy `node scripts/check.mjs`; xác nhận số test không giảm và số ngoại lệ
  boundary giảm.

## 4. Module context

- [x] 4.1 Tạo `modules/context` với glossary, addressing, shared glossary và style profile theo manifest;
  xác nhận mỗi use case có owner và test tương ứng.
- [x] 4.2 Di chuyển glossary và addressing cùng test, giữ nguyên contract dữ liệu và hành vi dialog; xác nhận
  test glossary/addressing cùng `node scripts/check.mjs` qua.
- [x] 4.3 Di chuyển shared glossary và style profile, giữ placeholder ở app chỉ khi chưa có business state;
  xác nhận không còn file context ở `features` cũ.
- [x] 4.4 Thay consumer trong work detail/workspace bằng public surface hoặc app composition; xác nhận context
  không import workspace và graph hai module không có chu trình.
- [x] 4.5 Ghi bằng chứng lát cắt và chạy `node scripts/check.mjs`; xác nhận không còn ngoại lệ boundary của
  context.

## 5. Module sources và export

- [x] 5.1 Xác nhận change `source-system-foundation` đã hoàn tất hoặc được cô lập, cập nhật manifest với cây
  sources thực tế và chạy `node scripts/check.mjs` làm baseline riêng trước khi di chuyển.
- [x] 5.2 Tạo `modules/sources`, di chuyển source management/update feed cùng test và giữ nguyên mọi call qua
  `window.mira`; xác nhận test source/update và contract typecheck qua.
- [x] 5.3 Chuyển app consumer của Sources/Updates sang public surface, xác nhận module không deep-import
  library/workspace và checker không còn ngoại lệ sources.
- [x] 5.4 Tạo `modules/export`, di chuyển scope/model/dialog cùng test và public API tối thiểu; xác nhận test
  export scope và các màn gọi export qua.
- [x] 5.5 Loại import trực tiếp giữa export và workspace bằng callback, shared contract hoặc public surface
  một chiều; xác nhận graph module không có chu trình.
- [x] 5.6 Ghi bằng chứng hai lát cắt và chạy `node scripts/check.mjs`; xác nhận số ngoại lệ boundary giảm và
  contract IPC/schema persistence không đổi.

## 6. Module workspace

- [x] 6.1 Chốt manifest chi tiết cho work detail, chapter navigation, chapter editor, assistant,
  translation và store; xác nhận mọi file trong `work`, `chapter`, `editor` có đúng một owner đích.
- [x] 6.2 Tạo `modules/workspace/chapter-editor`, di chuyển editor model/extensions/component cùng test mà
  không đổi hành vi; xác nhận toàn bộ test editor qua trước khi tiếp tục.
- [x] 6.3 Di chuyển leave guard và provider của nó vào chapter-editor, để app chỉ lắp provider; xác nhận
  autosave, dirty guard, đóng tab và `beforeunload` qua characterization test.
- [x] 6.4 Tạo chapter-navigation và di chuyển sidebar/list/navigation cùng test; xác nhận mở chương, chọn
  chương và Ctrl+B giữ nguyên hành vi.
- [x] 6.5 Di chuyển chapter assistant/chat và translation vào use case riêng, cập nhật public dependency tới
  ai-connections/export; xác nhận stream vẫn sống khi panel ẩn và test chat/translation qua.
- [x] 6.6 Di chuyển work detail cùng test, thay phụ thuộc ngược với library/context bằng public API hoặc
  callback; xác nhận mở tác phẩm, khu vực làm việc và điều hướng chương qua test.
- [x] 6.7 Di chuyển `chapterStore`, `aiChatStore` và `paneLayoutStore` cùng test vào workspace mà không đổi
  state/action/timing; xác nhận store reset và listener chỉ đăng ký một lần.
- [x] 6.8 Tạo `modules/workspace/public.ts` chỉ cho entry app/module khác đang dùng, chuyển consumer sang alias
  và xác nhận checker không còn deep import vào workspace.
- [x] 6.9 Tách `ChapterWorkspace`, `ChaptersArea` và file điều phối lớn theo responsibility đã có test; xác
  nhận diff tách không đổi wording, DOM interaction hoặc design token và `node scripts/check.mjs` qua.
- [x] 6.10 Ghi bằng chứng lát cắt workspace, chạy `node scripts/check.mjs` và xác nhận không còn ngoại lệ
  boundary cho `work`, `chapter`, `editor` cũ.

## 7. App composition và state cấp app

- [x] 7.1 Chuyển Home cùng placeholder chưa có domain model vào `app/screens`; xác nhận chúng chỉ compose
  public surface và không chứa business store/model mới.
- [x] 7.2 Khóa hành vi `uiStore` bằng test cho navigation, tabs, workspace restore/save, theme, sidebar,
  settings/onboarding và palette; xác nhận baseline test qua trước khi tách.
- [x] 7.3 Tách navigation, app sidebar và command palette state vào `app/navigation`; xác nhận Ctrl+K,
  chọn màn và collapse/expand nav qua test.
- [x] 7.4 Tách theme preference/system listener vào `app/theme` và app version vào app shell hook; xác nhận
  đổi theme lúc runtime, preference và cleanup listener qua test.
- [x] 7.5 Chuyển tabs, active work, workspace restore/save/notice và chapter sidebar state về workspace;
  xác nhận persisted `WorkspaceState` version/key và thứ tự save không đổi.
- [x] 7.6 Chuyển settings/onboarding overlay state về ai-connections hoặc app composition theo design, xác
  nhận mở/đóng modal không làm thay view nền.
- [x] 7.7 Chuyển notification state về `app/notifications`, giữ API hiển thị toast hiện tại và xác nhận test
  notification/toaster qua.
- [x] 7.8 Tách `useWorkspaceRestore`, `useAppShortcuts`, `useSystemThemeSync`, `useAppVersion` và AI listener
  theo owner; xác nhận mỗi effect cleanup đúng và các characterization test qua.
- [x] 7.9 Làm `App.tsx` chỉ lắp provider, shell, navigation và screen/workspace surfaces; xác nhận không còn
  business state transition trực tiếp trong component và test AppShell/autosave/leave guard qua.
- [x] 7.10 Cập nhật `resetAllStores` để đăng ký store mới, xóa `uiStore` sau khi không còn consumer và xác
  nhận toàn bộ store tests cùng `node scripts/check.mjs` qua.

## 8. Cưỡng chế và hoàn tất migration

- [x] 8.1 Chuyển mọi import qua boundary sang `@renderer/modules/<owner>/public`, giữ relative import nội
  module; xác nhận `rg` không còn deep import liên module hoặc relative path vượt boundary.
- [x] 8.2 Xóa từng ngoại lệ còn lại, xóa allowlist và bật boundary checker bắt buộc; xác nhận fixture vi phạm
  làm `node scripts/check.mjs` fail còn cây thật qua.
- [x] 8.3 Dùng `rg` xác nhận không còn import từ `features`/root `stores`, rồi xóa hai cây cũ và chạy
  `node scripts/check.mjs`.
- [x] 8.4 Xác nhận mỗi module có public surface chỉ chứa export đang được dùng, module không import `app`,
  root UI/hooks/lib không import module và graph module không chu trình.
- [x] 8.5 Đối chiếu manifest ban đầu để xác nhận không mất source/test, số test không giảm nếu không có lý do
  ghi nhận và mọi thay đổi vị trí đều có owner cuối cùng.
- [x] 8.6 Cập nhật `ARCHITECTURE.md` và tài liệu frontend architecture sang trạng thái đã triển khai, ghi
  mapping cuối, bằng chứng check và sai khác có chủ ý; xác nhận `DESIGN.md` không đổi nếu UI không đổi.
- [x] 8.7 Chạy `node scripts/check.mjs --build`, smoke test Library, Work, Chapter, Settings, Sources và
  Updates ở bản build, rồi ghi kết quả vào tài liệu frontend architecture.
- [x] 8.8 Rà diff cuối để xác nhận không đổi `src/shared` contract, IPC, schema/persistence key, wording hoặc
  design token; nếu có thay đổi ngoài phạm vi, tách thành change riêng trước khi hoàn tất.
