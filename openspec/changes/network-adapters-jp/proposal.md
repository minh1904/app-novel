## Why

`source-system-foundation` đã có registry, binding, catalog diff và đồng bộ thủ công, nhưng Network
Broker vẫn là stub và luồng Thêm Bản raw chỉ nhận tệp/thư mục. Bản thiết kế cũ định bật mạng bằng một
lần kiểm DNS trước `fetch`, dùng source ID không qua validator hiện tại và đưa Syosetu HTML scraping vào
phạm vi phát hành dù access path chưa được nền tảng chấp thuận. Nếu triển khai trực tiếp, change vừa mở
lỗ SSRF qua redirect/DNS rebinding, vừa không có contract end-to-end để URL trở thành binding.

Nghiên cứu mã nguồn Narou, LNReader, WebToEpub và Nepub cho thấy Kakuyomu có thể được phân tích ổn định
hơn bằng `workId`, `episodeId` và snapshot `__NEXT_DATA__`/Apollo. Tuy nhiên các implementation tham khảo
không giải quyết trọn vẹn sửa nội dung, đổi thứ tự và chương biến mất; Mira phải giữ semantics diff không
phá hủy của foundation thay vì sao chép hành vi downloader.

## What Changes

- Hoàn thiện Network Broker theo mô hình fail-closed: chỉ HTTPS production, allowlist exact origin,
  phân giải và ghim địa chỉ dùng để mở socket, kiểm lại từng redirect, chặn toàn bộ địa chỉ không public,
  giới hạn deadline/byte/request/concurrency và hủy xuyên suốt.
- Tách rõ pacing khỏi retry: xếp hàng tuần tự theo origin với khoảng cách tối thiểu; chỉ retry hữu hạn các
  GET idempotent gặp lỗi transient/`429`, tôn trọng `Retry-After` trong ngân sách deadline.
- Bổ sung contract URL → identify → preview → confirm binding qua shared schema, IPC, preload và wizard;
  preview không ghi dữ liệu và confirm phải tham chiếu đúng preview còn hiệu lực.
- Thêm adapter `mira.jp.kakuyomu` dựa trên stable `workId`/`episodeId`, parser fixture-first cho embedded
  state và episode HTML, cùng semantics catalog-only khi kiểm tra cập nhật.
- Dùng fixture tổng hợp do dự án tự viết; không commit toàn bộ chương hoặc snapshot nội dung có bản quyền.
- Giữ Kakuyomu sau release gate: implementation và offline tests không tự động làm adapter xuất hiện như
  nguồn khả dụng. Chỉ bật sau khi có review access/terms, live smoke check được ghi nhận và quyết định phát
  hành được chấp thuận.
- Loại Syosetu HTML catalog/content adapter khỏi change. API chính thức hiện không cung cấp catalog/nội
  dung cần thiết; mọi adapter metadata-only hoặc access path khác phải có OpenSpec riêng sau review nền
  tảng.

## Capabilities

### New Capabilities

- `network-broker`: transport mạng giới hạn quyền với chống SSRF/DNS rebinding/redirect bypass, budget,
  pacing, retry và redaction có thể kiểm thử offline.
- `source-network-binding-flow`: contract và luồng UI/IPC biến URL nguồn mạng thành preview rồi binding,
  đồng thời giữ invariant chỉ đồng bộ thủ công và không tự tải/dịch.
- `source-adapter-kakuyomu`: adapter Kakuyomu fixture-first dựa trên stable ID, fail-closed khi schema thay
  đổi và bị khóa bởi release gate.

### Modified Capabilities

Không có. Các capability foundation vẫn thuộc change `source-system-foundation` đang hoạt động và chưa có
main spec tương ứng trong `openspec/specs/`; change này khai báo dependency thay vì tạo delta giả.

## Impact

- **Dependency:** yêu cầu `source-system-foundation` được hoàn tất và archive trước khi merge change này.
- **Shared contracts:** mở rộng manifest network policy, kết quả identify, metadata work và preview binding
  trong `src/shared/contracts/sources.ts`/`desktopApi.ts`.
- **Main:** thay stub tại `src/main/sources/broker.ts`, nối runtime/IPC/binding services và đăng ký
  `mira.jp.kakuyomu` chỉ khi release gate mở.
- **Renderer:** thêm lựa chọn URL vào wizard Thêm Bản raw, các trạng thái loading/error/preview/confirm và
  nhãn trạng thái nguồn chưa được phát hành.
- **Tests:** transport giả kiểm soát DNS/socket/redirect/thời gian, fixture Kakuyomu tổng hợp, contract,
  IPC, renderer và integration test catalog diff.
- **Documentation:** cập nhật module `docs/modules/sources/` bằng quyết định, bằng chứng nghiên cứu và trạng
  thái triển khai thực tế; không mô tả Syosetu/Kakuyomu là supported trước release gate.