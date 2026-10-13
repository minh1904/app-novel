## 1. Contract và policy

- [x] 1.1 Mở rộng shared `SourceManifest`/validator bằng network policy typed và thống nhất source ID
  `mira.jp.kakuyomu`; loại bỏ type domain trùng trong main. Kiểm: contract/manifest tests từ chối origin
  không canonical, HTTP production, giới hạn âm/quá lớn, source ID ngoài `mira.*` và capability-policy lệch.
- [x] 1.2 Mở rộng adapter contract cho canonical identify, work metadata và binding preview typed; giữ tương
  thích file/folder. Kiểm: Valibot round-trip và compile-time tests cho file, folder, work URL, episode URL.
- [x] 1.3 Bổ sung error union cho network/binding/parser (`redirect_not_allowed`, `address_blocked`,
  `deadline_exceeded`, `response_too_large`, `request_budget_exceeded`, `parser_broken`) và ánh xạ sang
  failure UI không lộ URL credential/header. Kiểm: table-driven contract tests.

## 2. Network Broker: SSRF và transport

- [x] 2.1 Tạo injectable resolver/dispatcher/clock, classifier đầy đủ cho IPv4/IPv6 special-use và exact
  HTTPS origin policy. Kiểm: unit tests cho literal/encoded IPv4, IPv4-mapped IPv6, loopback, private,
  link-local, multicast, unspecified, documentation/reserved và mixed public-private DNS answers.
- [x] 2.2 Thêm `undici` như dependency trực tiếp bằng pnpm 8.9.0 đã pin, ghi nhận version/license/security
  review và không dựa vào bản bắc cầu. Kiểm: lockfile vẫn version 6.0 và broker test import đúng dependency.
- [x] 2.3 Ghim lookup đã duyệt vào socket connection, giữ hostname gốc cho TLS/SNI và xác minh peer address.
  Kiểm: socket-level test mô phỏng DNS đổi giữa preflight/connect chứng minh không kết nối địa chỉ mới.
- [x] 2.4 Tắt redirect tự động và kiểm mỗi hop; giới hạn 5 hoặc policy thấp hơn, resolve relative Location,
  strip auth/cookie khi đổi origin. Kiểm: redirect allowed→allowed, allowed→undeclared, public→private,
  loop, quá hop và cross-origin header leakage.
- [x] 2.5 Chặn adapter-controlled `Host`, `Connection`, proxy/forwarding headers và URL credentials; redact
  logs/errors. Kiểm: malicious-header tests và snapshot log không chứa token/query secret.

## 3. Network Broker: resource control

- [x] 3.1 Áp deadline toàn operation, request budget, redirect/attempt count, decompressed byte limit và cleanup
  stream/socket/timer. Kiểm: fake transport cho slow headers/body, compressed bomb, oversized declared và
  chunked body; không còn active handle sau lỗi.
- [x] 3.2 Cài queue công bằng với global/per-origin concurrency và `minIntervalMs`; thời gian chờ queue tính
  vào deadline. Kiểm: fake clock chứng minh Kakuyomu concurrency 1, start cách nhau ≥1000 ms, origin khác
  không bị head-of-line block.
- [x] 3.3 Cài retry chỉ cho GET idempotent gặp network-before-response hoặc `429/502/503/504`, tôn trọng
  `Retry-After`, bounded exponential backoff+jitter. Kiểm: không retry POST/4xx/parser error, không vượt
  maxAttempts/deadline và pacing vẫn áp cho retry.
- [x] 3.4 Truyền AbortSignal qua queue, DNS, connect, backoff và body read. Kiểm: cancel ở từng phase trả
  `cancelled` nhanh và giải phóng tài nguyên.

## 4. URL identify và preview service

- [x] 4.1 Thay identify theo domain bằng adapter `identify()` không-network và DTO gồm descriptor,
  `remoteWorkId`, `canonicalUrl`, `inputRemoteChapterId?`. Kiểm: unrelated/malformed/credential URL trả null
  hoặc lỗi an toàn; không có broker request trong identify.
- [x] 4.2 Cài preview store ngắn hạn, single-use, bound với work/source/remoteWork/auth profile; preview gọi
  metadata + full validated catalog nhưng không ghi DB. Kiểm: DB snapshot không đổi sau preview; expired,
  replayed và mismatched preview bị từ chối.
- [x] 4.3 Confirm preview transactionally tạo binding/canonical URL/catalog snapshot; failure rollback toàn
  bộ. Kiểm: integration test work URL và episode URL, episode được highlight nhưng binding vẫn ở work level.

## 5. IPC, preload và wizard

- [x] 5.1 Cập nhật IPC handlers và `DesktopApi.sources` cho identify/preview/create typed, trusted sender,
  cancellation và error mapping. Kiểm: handler round-trip, untrusted sender và stale preview tests.
- [x] 5.2 Thêm tab URL vào `AddRawDialog`: paste → identify → preview metadata/count/warnings/sample → chọn
  role/label → confirm; giữ input khi retry. Kiểm: renderer tests cho loading, unsupported URL, parser drift,
  release-gated source, cancel và successful binding.
- [x] 5.3 Chứng minh end-to-end invariant: preview/sync không tạo chapter, không fetch episode body, không đổi
  `chapter_text`, không tạo translation job. Kiểm: integration test với counters ở broker/adapter và DB.

## 6. Kakuyomu parser fixture-first

- [x] 6.1 Thêm `parse5` như dependency trực tiếp bằng pnpm 8.9.0 đã pin và helper traversal không chạy script;
  ghi nhận version/license. Kiểm: parser nhận DOM từ `parse5`, không dùng regex cho HTML hoặc `eval`.
- [x] 6.2 Tạo fixture tổng hợp tối thiểu cho flat/multi-section `tableOfContentsV2`, work URL, episode URL,
  paragraph/ruby/`<br>`, malformed state, duplicate/wrong-work ID và empty/login/block page; thêm provenance
  README xác nhận nội dung do dự án tự viết. Kiểm: scan fixture không chứa nguyên văn tác phẩm bên ngoài.
- [x] 6.3 Cài canonical identify cho hai URL pattern và reject subdomain, port, credentials, query ambiguity,
  malformed/non-numeric IDs. Kiểm: table-driven URL tests.
- [x] 6.4 Cài work/catalog parser theo `__NEXT_DATA__` → Apollo refs, stable `Episode.id`, deterministic order,
  canonical URL và semantic validation. Kiểm: fixture tests cho rename/reorder/add, duplicate/missing ref,
  schema drift và catalog bất thường trả inconclusive/parser-broken, không snapshot rỗng hợp lệ.
- [x] 6.5 Cài episode parser + normalization version + SHA-256; giữ ruby text và paragraph boundaries.
  Kiểm: golden tests, markup-only change giữ hash, text change đổi hash, malformed body fail-closed.

## 7. Đồng bộ không phá hủy

- [x] 7.1 Nối adapter với `SourceSyncService` qua broker-scoped context; catalog check không gọi
  `getChapter`. Kiểm: added/renamed/moved/access events đúng stable ID và chapter-fetch counter bằng 0.
- [x] 7.2 Kiểm ba snapshot complete/valid trước `missing_remote`, invalid snapshot không tăng streak,
  reappearance reset streak. Kiểm: sequence tests và xác nhận không row/text nào bị xóa.
- [x] 7.3 Thêm explicit content preview/fetch path cho item do người dùng chọn; chỉ hash mới tạo revision/event
  và apply vẫn cần preview + `expectedRev`. Kiểm: edit cùng `publishedAt` vẫn phát hiện bằng hash, duplicate
  hash idempotent, không tự apply hoặc enqueue dịch.

## 8. Registry và release gate

- [x] 8.1 Đăng ký manifest `mira.jp.kakuyomu` với origin duy nhất, concurrency 1, `minIntervalMs >= 1000`,
  trạng thái `unchecked`, nhưng gate mặc định đóng. Kiểm: production registry không quảng bá capability
  khả dụng khi gate đóng; test registry có thể enable bằng cấu hình test rõ ràng.
- [x] 8.2 Cài live smoke command opt-in ngoài CI, báo `PASS|FAIL|INCONCLUSIVE` riêng cho reachability,
  identify, metadata, catalog và chapter; không ghi body. Kiểm: fake endpoint tests cho ba kết quả.
- [x] 8.3 Cài và ghi release gate trong `docs/modules/sources/`, với trạng thái mặc định `closed` và checklist
  access/terms + smoke theo adapter version + owner approval. Kiểm: thiếu bất kỳ evidence nào vẫn hoàn tất
  change ở trạng thái disabled; việc đổi gate sang `open` là quyết định phát hành riêng.

## 9. Syosetu exclusion và tài liệu

- [x] 9.1 Xóa mọi manifest/code/task phát hành Syosetu HTML khỏi change; cập nhật module docs rằng Syosetu
  cần proposal riêng và không được suy access permission từ robots.txt hoặc OSS. Kiểm: contradiction scan
  không còn tuyên bố Syosetu supported/healthy.
- [x] 9.2 Cập nhật `docs/modules/sources/README.md`, `system-design.md` và research notes bằng hành vi đã chạy,
  giới hạn catalog-only và release-gate status; phân biệt accepted decision, research và implementation.

## 10. Gates cuối

- [x] 10.1 Chạy toàn bộ security/contract/parser/IPC/renderer/integration tests với network thật bị cấm trong
  automated suite; architecture boundary check từ chối `fetch`, `net`, `http`, `https`, `dns` và `undici`
  bên ngoài broker/transport allowlist.
- [x] 10.2 Chạy `node scripts/check.mjs --build`,
  `npx --yes @fission-ai/openspec@latest validate network-adapters-jp --strict` và `git diff --check`; mọi
  bước phải có output thành công. Không archive khi bất kỳ task implementation nào còn mở.
The above content shows the entire, complete file contents of the requested file.
