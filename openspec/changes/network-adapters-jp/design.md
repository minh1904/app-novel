## Context

Change này phụ thuộc vào `source-system-foundation`. Code hiện tại đã có adapter runtime, registry,
binding preview, catalog validation, quy tắc ba snapshot trước khi xác nhận mất và manual sync; nhưng
`NetworkBroker.request()` luôn kết thúc bằng `network_disabled`, identify IPC chỉ trả descriptor theo
domain và wizard renderer mới hỗ trợ `file | folder`.

Khảo sát implementation tại commit cố định cho thấy:

- Narou và LNReader lấy Kakuyomu work/episode từ URL và embedded Apollo state; Narou dùng `Episode.id` để
  giữ identity qua đổi tiêu đề/thứ tự.[1][2][3]
- WebToEpub cũng tách parser Kakuyomu khỏi orchestration chung và xây chapter list từ state của trang.[5][6]
- Nepub có fixture cho `tableOfContentsV2`, chapter group, paragraph/`<br>` normalization và episode ID
  không hợp lệ; đây là mẫu tốt cho parser tests tổng hợp.[11]
- Các downloader được khảo sát chủ yếu tuần tự/paced; không implementation nào trong phạm vi khảo sát chứng
  minh xử lý đầy đủ edit + reorder + deletion. Vì vậy `publishedAt` không được dùng như bằng chứng duy nhất
  rằng raw không đổi.
- Các HTTP wrapper chống SSRF tham khảo kiểm từng redirect và ghim DNS lookup vào transport thay vì chỉ
  preflight hostname rồi gọi một `fetch` tự resolve lại.[7][8]
- Live checks của LNReader phân biệt lỗi parser với network/block không kết luận được, phù hợp với health
  state `inconclusive` của Mira.[4]

Syosetu HTML không nằm trong phạm vi phát hành. Open-source code chỉ chứng minh cơ chế kỹ thuật, không cấp
quyền truy cập; guideline chính thức phải được review riêng trước một proposal metadata/API mới.[9]
Kakuyomu cũng giữ release gate theo điều khoản hiện hành thay vì suy luận quyền từ parser công khai.[10]

## Goals / Non-Goals

**Goals**

- Tạo transport production mà địa chỉ thực sự nhận kết nối đã được kiểm và ghim.
- Đặc tả đầy đủ identify/preview/confirm cho URL mạng qua contract, IPC và UI.
- Parse Kakuyomu bằng stable IDs và fixture tổng hợp, phát hiện parser drift theo fail-closed.
- Giữ manual catalog sync không phá hủy: không tự tải raw, không tạo chapter, không enqueue dịch.
- Làm release eligibility thành gate có bằng chứng, không phải trạng thái `healthy` hard-code.

**Non-Goals**

- Syosetu HTML scraping, API metadata-only, đăng nhập, CAPTCHA, browser automation hoặc bypass access control.
- Lịch nền, sync khi app đóng, bulk download, tự áp revision, hoặc phát hiện mọi edit chỉ từ catalog.
- Adapter cộng đồng hoặc API transport tổng quát cho renderer.
- Hứa rằng embedded schema Kakuyomu là API ổn định.

## Decisions

### 1. Transport ghim DNS và redirect thủ công

Broker parse URL, yêu cầu production HTTPS và exact origin trong policy. Nó resolve toàn bộ A/AAAA, từ
chối request nếu có bất kỳ kết quả loopback/private/link-local/multicast/unspecified/reserved/documentation
hoặc special-use, rồi truyền lookup đã ghim vào dispatcher/agent dùng để mở socket. TLS vẫn dùng hostname
gốc cho SNI và xác minh certificate; sau connect broker đối chiếu peer address với tập đã duyệt.

Implementation thêm `undici` như dependency trực tiếp ở phiên bản đã review để dùng dispatcher/Agent có
custom lookup và redirect manual; không dựa vào dependency bắc cầu hoặc global `fetch` không bind được
lookup. Mọi transport primitive nằm trong `src/main/sources/`, không qua preload.

Redirect tự động bị tắt. Mỗi `Location` được resolve với URL hiện tại, kiểm protocol/origin/DNS/pin lại và
tính vào giới hạn tối đa 5 hop. Broker không forward `Authorization`, `Cookie`, `Proxy-Authorization` hay
auth handle sang origin khác. Adapter không được tự đặt host/connection/proxy headers.

Lý do: DNS preflight + global `fetch` có cửa sổ TOCTOU; exact allowlist ban đầu cũng vô dụng nếu client tự
đi theo redirect tới private address.

### 2. Policy network là dữ liệu manifest đã validate

Manifest network adapter thêm policy bắt buộc gồm `origins`, `minIntervalMs`, `maxConcurrency`,
`maxRedirects`, `maxAttempts`, `maxResponseBytes`, `requestTimeoutMs` và `operationRequestBudget`.
Validator yêu cầu source ID namespace `mira.*`; adapter dùng `mira.jp.kakuyomu`, không dùng `jp.kakuyomu`.
Giá trị Kakuyomu mặc định là concurrency 1 và khoảng cách ít nhất 1000 ms. Runtime chỉ cấp broker đã bind
với policy của adapter, không cấp `fetch`, Electron `net` hay DNS primitive.

### 3. Budget, pacing và retry là ba cơ chế khác nhau

- **Budget:** deadline toàn operation, số attempt, redirect, byte sau decompression và tổng request.
- **Pacing:** thời điểm bắt đầu request cùng origin cách nhau ít nhất `minIntervalMs`; queue công bằng và
  chờ queue nằm trong deadline.
- **Retry:** chỉ GET không body; tối đa `maxAttempts`; áp dụng cho network failure trước response và
  `429/502/503/504`. `Retry-After` hợp lệ được tôn trọng nhưng không vượt deadline; nếu không có thì dùng
  exponential backoff có jitter inject được trong test. Các 4xx khác và parser errors không retry.

AbortSignal hủy khi đang queue, resolve, backoff hoặc đọc body. Byte limit áp trên bytes đã giải nén để
tránh compressed bomb. Response, socket và timer luôn được đóng trong mọi nhánh lỗi.

### 4. URL binding dùng DTO riêng, không tái sử dụng descriptor

`identify` trả `source`, `remoteWorkId`, `canonicalUrl` và `inputRemoteChapterId?`. Identify chỉ parse và
canonicalize URL; không gửi network packet. `previewCreate` gọi metadata/catalog qua broker và trả một
preview typed gồm `previewId`, expiry, identity, title/language, counts, warnings và sample catalog. Preview
không ghi work DB.

`create` phải mang `expectedPreviewId`; service kiểm preview thuộc đúng work/source/remoteWork/auth profile,
chưa hết hạn và chưa dùng, rồi transaction tạo binding + snapshot catalog. Episode URL vẫn bind toàn work
nhưng giữ episode ID để UI đánh dấu item ban đầu. Canonical URL được lấy từ adapter, không tin input text.

### 5. Kakuyomu parser dùng stable entity IDs và fail-closed

Adapter nhận chính xác hai URL HTTPS: `/works/{workId}` và
`/works/{workId}/episodes/{episodeId}` với ID số dương canonical. Catalog parser đọc JSON trong
`script#__NEXT_DATA__`, theo các `__ref` của `Work`, `tableOfContentsV2`, chapter và episode entity. Mỗi item
dùng `Episode.id`, ordinal từ traversal, title, canonical episode URL và access state. Duplicate/malformed
ID, work mismatch, thiếu root hoặc catalog rỗng bất thường làm snapshot inconclusive/parser-broken; không
fallback sang selector mơ hồ rồi coi đó là catalog đầy đủ.

Episode parser chỉ chấp nhận body container mong đợi, giữ text ruby đọc được, chuẩn hóa paragraph và line
break bằng normalization version có test, rồi SHA-256 nội dung UTF-8. Fixture là HTML/JSON tổng hợp tối
thiểu, không sao chép nguyên chương công khai.

HTML được parse bằng `parse5` dependency trực tiếp thay vì regex hoặc DOM API không tồn tại ổn định trong
main process. Adapter chỉ dùng helper traversal hẹp, không chạy script nhúng; JSON được parse như dữ liệu
và validate trước khi dereference.

Catalog check không tải episode bodies. Vì vậy nó phát hiện thêm/đổi tên/đổi thứ tự/access/missing nhưng
không tuyên bố phát hiện content edit. `raw_changed` chỉ có thể xuất hiện sau thao tác người dùng yêu cầu
preview/fetch chapter và hash khác revision đã lưu.

### 6. Missing là tombstone, không phải lệnh xóa

Adapter trả snapshot đầy đủ hoặc failure. Foundation chỉ tăng `missingStreak` sau snapshot complete,
exhausted và semantic-valid; ba snapshot hợp lệ liên tiếp mới tạo `missing_remote`. Không xóa catalog row,
chapter, source text hay target text. Reappearance reset streak và tạo event. Stable episode ID cho phép
rename/reorder độc lập với identity.

### 7. Release gate tách khỏi parser correctness

Registry có thể chứa code adapter nhưng không quảng bá adapter như nguồn dùng được khi gate đóng. Gate chỉ
mở khi có: quyết định access/terms được ghi trong module docs, live smoke test có version/thời điểm và kết
quả không `inconclusive`, owner phê duyệt phát hành. Sau khi mở, health ban đầu vẫn là `unchecked`; chỉ live
check mới chuyển trạng thái. Automated CI không gọi Kakuyomu thật.

## Risks / Trade-offs

- **Embedded schema thay đổi:** parser fail-closed tạo lỗi có chẩn đoán; fixture regression và live check
  phát hiện drift nhưng không ngăn website đổi bất ngờ.
- **Mixed DNS answers:** từ chối toàn request nếu một answer không public bảo thủ hơn việc chọn answer tốt,
  nhưng tránh fallback/rebinding mơ hồ.
- **Pinned transport phức tạp hơn `fetch`:** cần adapter transport inject được và nhiều test socket-level;
  đổi lại invariant SSRF có thể chứng minh.
- **Catalog-only bỏ sót edit im lặng:** UI phải nói rõ phạm vi; không dùng `publishedAt` để tạo cảm giác sai
  rằng mọi sửa nội dung đều được phát hiện.
- **Release gate có thể giữ feature ẩn:** đây là kết quả có chủ ý; parser chạy được không đồng nghĩa access
  path được phép phát hành.

## Migration Plan

1. Mở rộng shared schemas và adapter interfaces, giữ file/folder adapters tương thích.
2. Cài transport + tests trước; `allowNetwork` vẫn false.
3. Nối identify/preview/binding flow bằng fake adapter và UI tests.
4. Cài Kakuyomu parser/fixtures và integration tests qua broker giả.
5. Bật network capability cho adapter chỉ trong test; chạy security gates.
6. Thực hiện release review/live check. Nếu gate chưa đạt, merge code ở trạng thái disabled và tài liệu ghi
   rõ chưa hỗ trợ; không có fallback Syosetu.

Rollback đóng gate và `allowNetwork` cho adapter; binding/catalog đã tạo vẫn đọc được ở trạng thái
`adapter_missing`/unavailable, không xóa dữ liệu local.

## Open Questions

- Không có câu hỏi chặn implementation offline. Quyết định mở release gate Kakuyomu là bước phê duyệt riêng
  có bằng chứng tại thời điểm phát hành.

## Sources

[1]: https://github.com/whiteleaf7/narou/blob/27fb741fd561e2f26aba9fdf9d9b7b4384792be4/webnovel/kakuyomu.jp.yaml
[2]: https://github.com/whiteleaf7/narou/blob/27fb741fd561e2f26aba9fdf9d9b7b4384792be4/lib/downloader.rb
[3]: https://github.com/LNReader/lnreader-plugins/blob/3894b73906ee057a77860af08e5683d185fbe180/plugins/japanese/kakuyomu.ts
[4]: https://github.com/LNReader/lnreader-plugins/blob/3894b73906ee057a77860af08e5683d185fbe180/scripts/live-check-plugin.js
[5]: https://github.com/dteviot/WebToEpub/blob/b787c4128f717463bac8c7c2dc6915ecbdb622b2/plugin/js/parsers/KakuyomuParser.js
[7]: https://github.com/owner-stack/ssrf-safe-fetch/blob/739f4d5debada0faee598180b136b723b3427e6c/src/safe-fetch.ts
[8]: https://github.com/openclaw/openclaw/blob/8be3518e47872c8d7ecb72097adec3edbc914b72/src/infra/net/ssrf.ts
[9]: https://dev.syosetu.com/site/guideline
[10]: https://kakuyomu.jp/legal/tos
[11]: https://github.com/ttk1/nepub/blob/5469b65f0948bbbc0702451945aa3c8be631c235/test/test_kakuyomu_parser.py