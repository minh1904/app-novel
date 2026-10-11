# Kiến trúc frontend

Cập nhật: 2026-10-10 · Trạng thái: **Quyết định đã chốt; đã triển khai hoàn tất**. Chủ trì: chủ sản phẩm.

## Câu hỏi module này trả lời

Renderer của Mira chia domain, feature/use case, component, hook và store thế nào; ranh giới import nào phải
được giữ; quá trình chuyển từ cây hiện tại sang kiến trúc mục tiêu đang ở đâu?

Quy tắc bền vững nằm ở [`ARCHITECTURE.md`](../../../ARCHITECTURE.md). Tài liệu này lưu bằng chứng khảo
sát, quyết định và trạng thái triển khai của riêng renderer.

## Hiện trạng đã quan sát

Snapshot ngày 2026-10-10:

- `src/renderer/src/features` có 171 file.
- `chapter` có 40 file nhưng chỉ tách `chat` và `translate`; `work` có 29 file trực tiếp, `editor` 26,
  `settings` 19, `models` 16 và `library` 12.
- Năm file UI lớn nhất có 852, 797, 619, 556 và 554 dòng; `App.tsx` có 414 dòng.
- Có hơn 200 import tương đối đi từ ba cấp trở lên dù `@renderer/*` đã khai báo trong
  `tsconfig.web.json`.
- Vòng phụ thuộc đáng chú ý: `library` ↔ `work`; `models` → `settings` → `onboarding` → `models`.
- `chapter` deep-import `editor`, `work`, `library`, `models`, `settings` và `export`.
- Store domain đang tập trung ở root `stores`: library, chapter, AI chat, connection và pane layout.

Nhận định: Mira đã có lớp `app`, `components/ui` và `features`; vấn đề không phải thiếu folder theo loại.
Vấn đề là thư mục cấp feature đang trộn domain, màn hình và implementation detail, nên ownership không rõ
và graph phụ thuộc có chu trình.

## Quyết định 2026-10-10

Chủ sản phẩm chốt kiến trúc **domain-first, feature/use case bên trong domain**:

- dùng `modules` cho lớp domain của renderer;
- `app` chỉ composition, navigation, shell và lifecycle cấp ứng dụng;
- giữ `components/ui`, root `hooks` và `lib` cho mã thật sự trung lập domain;
- không tạo `renderer/src/shared` để tránh nhầm với contract `src/shared`;
- module khác chỉ dùng public surface tường minh, không deep-import implementation;
- store và hook ở owner gần nhất;
- refactor không đổi UI, IPC, persistence hoặc luồng người dùng.

Mapping mục tiêu:

| Thư mục hiện tại | Module đích |
| --- | --- |
| `library` và form/cover liên quan | `modules/library` |
| `work`, `chapter`, `editor` | `modules/workspace` |
| `settings`, `models`, `onboarding` | `modules/ai-connections` |
| `glossary`, `addressing`, `shared-glossary`, `style-profiles` | `modules/context` |
| `sources`, `updates` | `modules/sources` |
| `export` | `modules/export` |
| `home` và placeholder chưa có domain model | `app/screens` |

## Quy tắc ownership ngắn

- Component biết thuật ngữ/domain nào thì thuộc module đó.
- Hook điều phối một use case ở cạnh use case; hook root phải domain-neutral và có nhiều consumer.
- Helper thuần nằm ở `model`/`lib`, không dùng hook như folder “logic”.
- Zustand store là state owner, không phải hook dùng chung.
- Test đi cùng source.
- Mã dùng qua process phải ở `src/shared/contracts`; presentation type không được đẩy lên shared.
- Khi hai module import lẫn nhau, ưu tiên sửa ownership hoặc app composition thay vì tạo exception.

## Tham khảo và giới hạn

LMS v3 ở `D:\izone\lms-v3` được dùng để tham khảo cách feature lớn chia `components`, `hooks`, `model`,
`store`, `adapter`. Mira không sao chép:

- `app/` routing convention của Next.js;
- barrel `index.ts` rộng;
- import chéo khiến một feature trở thành shared dependency ngầm;
- yêu cầu mọi module phải có cùng một bộ folder con.

Đối chiếu thêm với Bulletproof React cho hướng phụ thuộc và Tutti cho ranh giới Electron. Đây là nguồn tham
khảo, không phải framework kiến trúc bắt buộc.

## Kế hoạch và trạng thái

OpenSpec [`refactor-renderer-domain-architecture`](../../../openspec/changes/archive/2026-10-10-refactor-renderer-domain-architecture/)
đã có proposal, design và checklist triển khai; không có delta spec vì đây là refactor giữ nguyên hành vi.

| Giai đoạn | Trạng thái |
| --- | --- |
| Khảo sát cây, kích thước file và import graph | Hoàn tất |
| Chốt domain, ownership và dependency direction | Hoàn tất |
| Tạo tài liệu và OpenSpec | Hoàn tất |
| Boundary checker | Hoàn tất (`scripts/check-renderer-boundaries.mjs`) |
| Di chuyển library/AI/context/sources/export | Hoàn tất (`modules/{library,ai-connections,context,sources,export}`) |
| Di chuyển workspace và tách app/store | Hoàn tất (`modules/workspace`, `app/`) |
| Bật cưỡng chế, xóa cây cũ và build verification | Hoàn tất |

## Bằng chứng kiểm tra hoàn tất (2026-10-10)

Lệnh kiểm tra: `node scripts/check.mjs --build`

- **Renderer boundaries:** 254 files, 0 violations.
- **Typecheck:** node (651 files), web (1009 files), scripts (381 files) đều thành công.
- **Vitest:** 2335 tests in 213 files (2220 parallel + 115 serial) đều pass (không giảm test từ baseline 1523).
- **Biome:** 625 files, 0 errors.
- **Build electron-vite:** 3 bundles written (main, preload, renderer) thành công.
- **Smoke test:** `smoke-sqlite.mjs`, `smoke-net-fetch.mjs`, khởi chạy Electron app thành công.
- **Hợp đồng và persistence:** Giữ nguyên contract `src/shared`, IPC channels, schema database và storage keys. Không thay đổi wording hay design tokens.

---

[Mục lục module](../README.md) · [Kiến trúc repository](../../../ARCHITECTURE.md) ·
[OpenSpec refactor](../../../openspec/changes/archive/2026-10-10-refactor-renderer-domain-architecture/)

