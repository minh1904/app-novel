## 1. Characterization và dữ liệu

- [ ] 1.1 Characterize glossary/addressing/extraction/context snapshot hiện có và lập fixture approved/pending/rejected/scope; kiểm translation prompt hiện nhận dữ liệu nào.
- [ ] 1.2 Bổ sung provenance và snapshot immutable nhỏ nhất nếu storage thiếu; kiểm migration/schema snapshot và run cũ vẫn đọc đúng sau sửa/xóa entry.

## 2. Workflow Context

- [ ] 2.1 Thêm context preflight với ba lựa chọn và phase task; test không tự extraction/approve và waiting_review không giữ provider/lease.
- [ ] 2.2 Nối extraction candidate có evidence + dedupe/conflict với entry approved; test lỗi extraction không đổi Context đã duyệt.
- [ ] 2.3 Thêm review commands idempotent với revision guard, gồm edit-and-approve/reject/bulk; test partial bulk failure không báo thành công toàn bộ.
- [ ] 2.4 Dùng một effective resolver cho prompt/panel/run detail; test scope chapter, pending/rejected exclusion và speech/narration conditional rule.
- [ ] 2.5 Tạo snapshot tại item-start và nối prompt chỉ đọc snapshot; test 8/12 approved và retry cùng attempt dùng cùng payload/hash.

## 3. UI và gate lát 4

- [ ] 3.1 Nối utility panel `Trợ lý | Ngữ cảnh` qua public surfaces; test tab/filter/search/selection/scroll/draft, dock/overlay focus và link activity đúng run.
- [ ] 3.2 Chạy E2E extraction → review một phần → restart waiting_review → Continue → dịch; assert pending không vào prompt và chạy `node scripts/check.mjs`.
