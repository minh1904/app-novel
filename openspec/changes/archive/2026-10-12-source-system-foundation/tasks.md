## 1. Contract ngôn ngữ và kiểm kê phụ thuộc

- [x] 1.1 Đổi contract ngôn ngữ nguồn sang BCP-47 đã validate, thêm preset `ko` và tách
  `builtinLanguageProfile(tag)` khỏi loại tag lưu trữ. Kiểm: contract test nhận `ko` và một tag BCP-47 hợp
  lệ chưa có profile, từ chối tag sai.
- [x] 1.2 Chuyển mọi `Record<SourceLanguage, ...>` và call site segmentation/alignment/prompt/addressing sang
  profile có fallback rõ. Kiểm: typecheck node/web và unit test tiếng Hàn cùng tag chưa có preset.
- [x] 1.3 Thêm `src/shared/contracts/sources.ts` với descriptor, manifest, binding, catalog, access/health,
  sync run, update event và schema IPC. Kiểm: test valibot cho input hợp lệ, ID rỗng, country/language sai,
  cursor quá lớn và state không thuộc union.

## 2. Migration và ownership dữ liệu

- [x] 2.1 Viết work schema v12: rebuild bảng `work` bỏ enum SQL của `source_lang`, tạo
  `source_binding`, `source_sync_run`, `source_catalog_item`, `source_content_revision`,
  `source_update_event` cùng index/FK/unique theo D4. Kiểm: schema snapshot và test constraint/cascade.
- [x] 2.2 Thêm fixture migration work v1–v11 có metadata, chapter text, alignment, proposal và AI session;
  xác nhận migrate giữ từng loại dữ liệu và chèn được `ko`/tag BCP-47. Kiểm: test migration chạy cho mọi
  version fixture.
- [x] 2.3 Viết library schema v8 với `source_adapter_install`, `source_auth_profile`, `source_job`,
  `source_schedule_index`; secret profile đi qua `safeStorage`. Kiểm: schema snapshot, migration v1–v7,
  test không lưu được secret khi encryption unavailable.
- [x] 2.4 Thêm repository/store cho bảng nguồn và phép rebuild schedule index từ `.mira`; không để catalog
  chỉ tồn tại ở library DB. Kiểm: integration test tạo library hai work files, rebuild projection và mở
  từng work vẫn đọc đủ binding/catalog khi xóa projection.

## 3. Adapter registry và runtime

- [x] 3.1 Tạo `src/main/sources/manifest` và registry builtin: validate manifest, source ID/version,
  country/language/capability/auth/limits; từ chối package hoặc code ngoài danh sách Mira. Kiểm: unit test
  manifest tốt, duplicate source ID, version lỗi và package third-party.
- [x] 3.2 Cài contract `NovelSourceAdapter`, paged result, `AdapterContext`, validation output, deadline,
  cursor-loop/page limit và cancellation. Kiểm: adapter giả trả cursor lặp, output sai schema, quá deadline
  và bị abort đều ra failure đúng mà không ghi DB.
- [x] 3.3 Tạo registry query/search/filter theo tên, tên bản địa, alias, domain, country, language,
  capability và health. Kiểm: unit test nguồn đa ngôn ngữ, tổ hợp KR+ko, nhóm Khác và URL identify.
- [x] 3.4 Định nghĩa network/auth/browser host interfaces bị khóa capability nhưng chưa enable adapter mạng;
  đảm bảo runtime không nhận DB, secret, Electron object hoặc `fetch` toàn quyền. Kiểm: type-level/runtime
  tests và test adapter không thể yêu cầu operation ngoài manifest.

## 4. Adapter tệp và thư mục

- [x] 4.1 Cài builtin single-file adapter cho `.txt`/`.md`, remote ID ổn định, decode/normalize/hash v1 và
  preview metadata. Kiểm: fixture UTF-8, newline hỗn hợp, file rỗng, file đổi nội dung giữ ID nhưng đổi
  content hash.
- [x] 4.2 Cài builtin folder adapter quét theo yêu cầu, sắp thứ tự xác định, remote chapter ID từ relative
  path và fingerprint revision. Kiểm: fixture nhiều chương, tên trùng số, thêm/xóa/sửa file và đường dẫn
  ngoài folder bị từ chối.
- [x] 4.3 Cài preview import/matching cho file/folder, gồm số item, tự ghép chắc chắn, chưa ghép và lỗi;
  không ghi work trước xác nhận. Kiểm: integration test preview để DB không đổi, confirm mới tạo binding
  và catalog.

## 5. Source services và catalog diff

- [x] 5.1 Cài `CatalogDiffService` dạng hàm thuần cho added/renamed/moved/access-changed/missing/reappeared,
  remote ID và fallback confidence. Kiểm: table-driven tests cho mọi event và dedupe key ổn định.
- [x] 5.2 Cài semantic validation snapshot: work identity, duplicate ID, cursor complete, empty/login page,
  count drop. Kiểm: snapshot invalid không tăng missing streak hoặc sinh remove event.
- [x] 5.3 Cài luật ba snapshot hợp lệ để xác nhận mất và reset/reappeared, không xóa chapter/text. Kiểm: test
  chuỗi present→missing→missing→present và present→missing×3.
- [x] 5.4 Cài content revision normalize/hash/version, immutable insert và `raw_changed`; apply vào
  `chapter_text.source` qua preview + `expectedRev`. Kiểm: test duplicate hash idempotent, raw sửa không
  đổi target, revision conflict không ghi đè.
- [x] 5.5 Cài SourceCatalog/Binding/Sync/Content services và transaction theo item/run; added chỉ tạo event,
  không tự fetch/create chapter/translate. Kiểm: integration test năm chương mới tạo đúng năm event và
  không tạo chapter/job dịch.

## 6. Manual jobs, auth profile và phục hồi

- [x] 6.1 Cài manual job state machine, unique active job, progress, AbortSignal và persisted result. Kiểm:
  test start trùng, cancel giữa pagination, partial commit hợp lệ và restart xử lý lease bỏ dở mà không
  tự chạy lại.
- [x] 6.2 Cài CRUD nhiều auth profile cho một source, mã hóa secret và binding chọn opaque profile ID. Kiểm:
  integration test hai profile, đổi profile không tạo binding mới, IPC/view model không chứa secret.
- [x] 6.3 Xử lý auth/adapter bị thiếu khi restore: binding vẫn đọc được và trả `login_required` hoặc
  `adapter_missing`. Kiểm: copy work file sang library trống và mở thành công với catalog cũ.

## 7. IPC và preload

- [x] 7.1 Thêm handlers typed cho `sources:catalog:list|get`, nối service qua `createServices()` và
  `HandlerDeps`, kiểm trusted sender. Kiểm: handler tests cho filter, pagination và lỗi adapter.
- [x] 7.2 Thêm handlers `sources:bindings:list|identify|preview-create|create|update|delete`; mọi delete/đổi
  primary trả preview khi có ảnh hưởng. Kiểm: handler tests và contract round-trip.
- [x] 7.3 Thêm handlers `sources:sync:start|cancel|status` và event `source:sync:progress`; không tự start ở
  startup/timer. Kiểm: test progress thuộc đúng run và untrusted sender bị từ chối.
- [x] 7.4 Thêm handlers `sources:updates:list|mark-seen|preview-apply|apply`, preload `DesktopApi.sources` và
  compile-time channel coverage. Kiểm: typecheck và tests seen/acted tách biệt.

## 8. UI Nguồn nội dung

- [x] 8.1 Thêm màn **Nguồn nội dung** cấp app với tab Khám phá/Đã kết nối/Tình trạng, tìm kiếm và facet
  Tất cả/Trung Quốc/Nhật Bản/Hàn Quốc/Khác cùng ngôn ngữ độc lập. Kiểm: render tests cho CN/JP/KR/Khác,
  chip filter và xóa tất cả.
- [x] 8.2 Tạo thẻ nguồn hiện domain, quốc gia, ngôn ngữ, capability, access, health/version/check time;
  phân biệt adapter catalog-only, auth expired và inconclusive. Kiểm: render test từng state/CTA.
- [x] 8.3 Cài empty/error states cho chưa có adapter, URL chưa hỗ trợ, không có search result, filter loại hết
  và parser broken. Kiểm: render test nội dung và thao tác đề nghị đúng, không có CTA né entitlement.

## 9. UI Bản raw và Cập nhật

- [x] 9.1 Thay `SourcesAreaMock` bằng khu vực **Bản raw** dùng dữ liệu thật, key theo binding ID và hiện
  primary/coverage/matching/health/account. Kiểm: hai binding cùng ngôn ngữ render riêng.
- [x] 9.2 Cài wizard Thêm Bản raw cho tệp/thư mục: chọn → preview → nhãn/vai trò/profile → confirm; giữ state
  khi lỗi. Kiểm: render/integration test preview counts và confirm tạo đúng binding.
- [x] 9.3 Cài đổi primary, chapter override, sửa ghép và gỡ binding với preview; không đổi raw/target hiện có.
  Kiểm: test thao tác trên work có chương đã dịch giữ nguyên `chapter_text`.
- [x] 9.4 Thay `UpdatesScreenMock` bằng feed event thật, nhóm theo ngày/work, mark seen và preview apply;
  added/raw_changed chỉ thông báo. Kiểm: render test năm event, chapter khóa và raw changed không tự sinh
  job tải/dịch.
- [x] 9.5 Thêm nút **Kiểm tra cập nhật** ở cấp binding/work và trạng thái progress/cancel; ghi rõ chỉ kiểm khi
  app mở và người dùng yêu cầu. Kiểm: chạy app với folder fixture, thêm file, bấm kiểm tra và thấy event.

## 10. Bảo mật, tài liệu và kiểm tra cuối

- [x] 10.1 Thêm security tests cho path traversal/symlink ngoài folder, payload/path quá lớn, secret
  redaction, adapter operation ngoài capability và IPC untrusted sender. Kiểm: toàn bộ suite security qua.
- [x] 10.2 Cập nhật `docs/modules/sources/` và `app-level-features.md` bằng hành vi đã chạy; giữ adapter mạng
  ưu tiên là follow-up chưa triển khai. Kiểm: scan không còn gọi file/folder foundation là mock hoặc hứa
  cập nhật khi app tắt.
- [x] 10.3 Chạy `node scripts/check.mjs --build`, `openspec validate source-system-foundation --strict` và
  `git diff --check`; mọi bước phải có output thành công trước khi đánh dấu change hoàn tất.
