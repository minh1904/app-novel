## Context

Xem `proposal.md` để biết động cơ và phạm vi. Thiết kế sản phẩm đầy đủ nằm ở
`docs/modules/sources/system-design.md`; change này cắt lát foundation có thể triển khai và kiểm thử trước
khi làm adapter website.

Hiện trạng đã xác minh:

- work schema ở v11; `work.source_lang` có `CHECK` đóng chỉ gồm `en`, `zh-Hans`, `zh-Hant`, `ja`;
- library schema ở v7;
- `.mira` là nguồn sự thật của tác phẩm, còn `library.db` là index/cache và dữ liệu cấp ứng dụng;
- raw/bản dịch đang nằm trong `chapter_text`; chưa có remote ID, binding, catalog, content hash hay event;
- IPC đã typed/validated, preload đóng và main process giữ SQL/secret;
- “Nguồn raw” và trang Cập nhật hiện là mock.

## Goals / Non-Goals

**Goals:**

- Dựng data model, service boundary, adapter contract và UI đủ để thêm/kiểm tra Bản raw từ tệp/thư mục.
- Giữ schema và contract sẵn sàng cho nhiều nguồn, nhiều tài khoản và adapter mạng sau này.
- Cho người dùng lọc registry theo quốc gia/ngôn ngữ và xem update event, dù change này chưa cung cấp
  adapter website production.
- Migrate dữ liệu cũ an toàn và giữ app mở được khi adapter/auth tham chiếu bị thiếu.

**Non-Goals:**

- Không làm adapter Syosetu, Kakuyomu, Novelpia, Qidian hoặc Fanqie trong change này.
- Không HTTP scraping, RSS/API production, browser nền, marketplace, hot-update hoặc mã bên thứ ba.
- Không lịch tự động, OS background agent, cloud polling, tự tải raw hoặc tự xếp hàng dịch.
- Không tự giải CAPTCHA, lấy nội dung không có entitlement hoặc ghi đè raw/bản dịch đang biên tập.

## Decisions

### D1. Một engine đồng bộ, adapter là rìa

Luồng phụ thuộc:

```text
Renderer
  → typed IPC
  → SourceCatalog/Binding/Sync/Content services
  → CatalogDiff
  → AdapterRegistry + AdapterRuntime
  → builtin file/folder adapter

library.db: install/auth/job projection
<work>.mira: binding/catalog/revision/event/run
chapter + chapter_text: dữ liệu biên tập hiện có
```

Adapter không nhận store hoặc DB. Nó trả DTO qua schema; source service sở hữu transaction, dedupe,
revision và event. Cách này giữ logic diff giống nhau cho tệp, API và website.

*Loại:* mỗi adapter tự lưu cache/schema. Cách đó làm backup, migration và update feed phụ thuộc từng
website.

### D2. Contract adapter nhỏ, phân trang

Contract nội bộ:

```ts
interface NovelSourceAdapter {
  manifest: SourceManifest
  identify(input: IdentifyInput, context: AdapterContext): Promise<IdentifyResult | null>
  getWork(input: WorkRequest, context: AdapterContext): Promise<RemoteWork>
  getCatalog(input: CatalogRequest, context: AdapterContext): Promise<CatalogPage>
  getChapter(input: ChapterRequest, context: AdapterContext): Promise<ChapterPage>
  checkSession?(input: SessionRequest, context: AdapterContext): Promise<SessionState>
}
```

`CatalogPage`/`ChapterPage` có cursor, `exhausted` và assertion result. Runtime giới hạn số trang, phát hiện
cursor lặp và truyền `AbortSignal`. `AdapterContext` của foundation chỉ có clock, signal và API đọc tệp
được người dùng cấp; network request được định nghĩa nhưng không cấp cho adapter production trong change
này.

Manifest chứa `manifestVersion`, `sourceId`, display/alias/domain, adapter/API/data version,
`countryCode`, `languageTags`, capability, auth, origin và limits. `sourceId` bất biến; version không nằm
trong identity.

### D3. Language tag mở, profile xử lý đóng

`WorkSummary.sourceLang` đổi từ union bốn giá trị thành branded/string BCP-47 đã validate. Danh sách
preset UI có `en`, `zh-Hans`, `zh-Hant`, `ja`, `ko`. Những nơi cần bảng thuật toán cụ thể như segmenter,
ratio, addressing hoặc profile prompt dùng hàm:

```ts
builtinLanguageProfile(tag): BuiltinLanguageProfile | null
```

Tag không có profile không làm hỏng file; call site phải dùng fallback chung hoặc báo capability chưa hỗ
trợ. Không dùng `Record<SourceLanguage, ...>` buộc mọi BCP-47 có entry.

Migration work v12 rebuild bảng `work` để bỏ `CHECK source_lang IN (...)`, copy dữ liệu và tạo lại
`work_singleton` trong transaction.

### D4. Phân vùng schema theo ownership

#### Work v12

- `source_binding`: adapter/version, remote work ID, canonical URL, quốc gia, language tag, nhãn, primary,
  auth profile ID, enabled và checkpoint.
- `source_sync_run`: trigger, state, adapter version, completeness, failure, stats.
- `source_catalog_item`: remote ID/URL, nullable `chapter_id`, order/title/kind, access, hash,
  first/last seen, `missing_streak`, `removed_at`.
- `source_content_revision`: immutable normalized content và hash, normalization version, completeness.
- `source_update_event`: kind, dedupe key, detected/seen/acted timestamps.

Unique chính:

```text
source_binding(adapter_id, remote_work_id)
source_catalog_item(binding_id, remote_chapter_id)
source_content_revision(catalog_item_id, content_hash)
source_update_event(dedupe_key)
```

`chapter_id` dùng `ON DELETE SET NULL`; xóa chapter không xóa bằng chứng catalog/revision. Xóa binding
cascade catalog/revision/event chỉ sau confirm; `chapter` và `chapter_text` không phụ thuộc binding.

#### Library v8

- `source_adapter_install`: manifest, version, artifact hash, trust/state.
- `source_auth_profile`: adapter, label, secret mã hóa, account partition, state.
- `source_job`: run coordination/progress cho manual job.
- `source_schedule_index`: projection rebuild được; tồn tại để không khóa schema sau này nhưng foundation
  không enqueue theo giờ.

`auth_profile_id` trong `.mira` không có FK xuyên database. Khi thiếu profile, view model trả
`login_required`.

### D5. Normalization và identity có version

Khóa bền của item mạng là `(sourceId, remoteWorkId, remoteChapterId)`. File adapter dùng binding làm
remote work và remote chapter ID sinh từ đường dẫn tương đối chuẩn hóa; fingerprint nội dung chỉ tạo
revision, không đổi identity. Rename file được preview như remove+add trong foundation; nhận diện rename có
thể thêm sau mà không đổi schema.

Nội dung normalize newline về `\n`, Unicode NFC và giữ khoảng trắng ngữ nghĩa; record ghi
`normalization_version = 1`. `content_hash` là SHA-256 của normalized text; `payload_hash` là hash bytes
đã decode trước normalize.

### D6. Diff là hàm thuần, commit sau validation

`CatalogDiffService` nhận snapshot trước/sau đã validate và trả operation/event. Chỉ snapshot
`complete=true` mới tăng `missing_streak`. Quy tắc ba lần nằm trong policy mặc định nhưng persisted cùng
binding để thay đổi sau không cần migration.

Transaction work file:

1. tạo/cập nhật sync run;
2. upsert catalog item;
3. apply missing streak/reappeared;
4. insert event bằng dedupe key;
5. commit snapshot/checkpoint.

Content được lấy theo lệnh riêng và commit từng item. Event `added` không enqueue content. Apply revision
vào `chapter_text.source` là command có preview và `expectedRev`.

### D7. Manual job vẫn dùng state machine bền

Dù chưa có scheduler, manual sync dùng `source_job` với `queued → running → completed|failed|cancelled|
waiting_user`. Chỉ một job active cho `(workId, bindingId, kind)`. Cancel truyền `AbortSignal`. Startup
chuyển lease `running` bị bỏ dở sang failed/retryable; không tự chạy lại nếu người dùng chưa yêu cầu.

Cách này tránh viết đường manual tạm thời rồi thay toàn bộ khi thêm lịch.

### D8. IPC khai từng operation

Thêm `src/shared/contracts/sources.ts` với các channel:

```text
sources:catalog:list|get
sources:bindings:list|identify|preview-create|create|update|delete
sources:sync:start|cancel|status
sources:updates:list|mark-seen|preview-apply|apply
```

Progress dùng event `source:sync:progress`; payload chỉ có run/binding ID, phase và count. Không có
`adapter.call(method, unknown)`. Renderer không nhận DB handle, filesystem path ngoài giá trị người dùng
đã chọn, secret hay cookie.

### D9. UX có hai cấp

Cấp app là **Nguồn nội dung** với Khám phá/Đã kết nối/Tình trạng. Facet quốc gia nổi bật:

```text
[Tất cả] [Trung Quốc] [Nhật Bản] [Hàn Quốc] [Khác]
```

Ngôn ngữ là facet độc lập. Foundation hiện file/folder adapter ở nhóm `Khác/Thiết bị`; nguồn mạng ưu tiên
có thể hiện trong roadmap nhưng không được giả là capability đã dùng được.

Cấp tác phẩm đổi **Nguồn raw** thành **Bản raw**. Wizard chọn tệp/thư mục → preview catalog/ghép → vai trò
→ tạo. Mọi thao tác đổi primary, apply revision hoặc gỡ binding có preview ảnh hưởng.

### D10. Auth/browser chỉ đặt contract, không kích hoạt nền

`source_auth_profile.secret` dùng abstraction `safeStorage`; renderer/adapter chỉ thấy ID và nhãn. Nhiều
profile cùng source được hỗ trợ từ schema/UI. Browser host API chỉ có thể được gọi từ command có user
gesture và mở partition theo source/account; không có API chạy browser nền. Adapter mạng cụ thể phải thêm
OpenSpec và broker security tests trước khi được enable.

## Risks / Trade-offs

- **[Change lớn qua storage, IPC và UI]** → chia task theo vertical slice: migration/contract, file adapter,
  diff/service, UI; mỗi slice có test và không bật mock thành hành vi thật trước backend.
- **[BCP-47 mở phá giả định union hiện tại]** → tìm toàn bộ `SourceLanguage`/`Record` và thêm generic
  fallback; schema/contract tests cho `ko` và tag chưa có profile.
- **[Folder thay đổi hoặc rename gây false remove/add]** → luôn preview; ba snapshot hợp lệ mới xác nhận
  mất; foundation không tự xóa.
- **[Library projection lệch `.mira`]** → `.mira` là source of truth; startup/reconcile có thể rebuild
  schedule index.
- **[Nhiều tài khoản tăng UI/schema trước khi có adapter auth]** → chỉ triển khai CRUD/profile selection;
  live login thuộc adapter mạng sau.
- **[Foundation không đem lại website ngay]** → giữ scope kiểm thử được; tạo follow-up theo thứ tự nguồn đã
  chốt sau khi runtime/broker vượt acceptance tests.

## Migration Plan

1. Thêm contract BCP-47 và generic fallback, giữ preset cũ cộng `ko`.
2. Thêm work v12 bằng transaction rebuild `work` và tạo bảng nguồn; migration fixtures từ v1–v11.
3. Thêm library v8 và test từ v1–v7; auth profile secret luôn đi qua `safeStorage`.
4. Ship service/IPC và file/folder adapter sau feature flag nội bộ; chạy schema snapshot/tests.
5. Đổi mock UI sang dữ liệu thật, rồi bật command Thêm Bản raw và Kiểm tra cập nhật.
6. Reconcile `source_schedule_index` từ work files ở startup nhưng không enqueue tự động.
7. Cập nhật tài liệu module từ “đề xuất” sang “đã triển khai” chỉ cho hành vi đã chạy.

Rollback code vẫn mở được library/work cũ. Sau khi file đã migrate lên v12/v8, app cũ phải báo
unsupported-version; không có down migration phá hủy. Nếu cần quay lại release, người dùng phục hồi backup
trước migration theo cơ chế backup hiện có.
