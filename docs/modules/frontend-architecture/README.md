# Kiến trúc frontend

Cập nhật: 2026-10-10 · Trạng thái: **Quyết định đã chốt; refactor chưa triển khai**. Chủ trì: chủ sản phẩm.

## Câu hỏi module này trả lời

Renderer của Mira chia domain, feature/use case, component, hook và store thế nào; ranh giới import nào phải
được giữ; quá trình chuyển từ cây hiện tại sang kiến trúc mục tiêu đang ở đâu?

Quy tắc bền vững nằm ở [`DESIGN.md`](../../../DESIGN.md). Tài liệu này lưu bằng chứng khảo sát, quyết định
và trạng thái triển khai của riêng renderer.

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

OpenSpec [`refactor-renderer-domain-architecture`](../../../openspec/changes/refactor-renderer-domain-architecture/)
đã có proposal, design và checklist triển khai; không có delta spec vì đây là refactor giữ nguyên hành vi.

| Giai đoạn | Trạng thái |
| --- | --- |
| Khảo sát cây, kích thước file và import graph | Hoàn tất |
| Chốt domain, ownership và dependency direction | Hoàn tất |
| Tạo tài liệu và OpenSpec | Hoàn tất |
| Boundary checker | Chưa triển khai |
| Di chuyển library/AI/context/sources/export | Chưa triển khai |
| Di chuyển workspace và tách app/store | Chưa triển khai |
| Bật cưỡng chế, xóa cây cũ và build verification | Chưa triển khai |

Không apply khi `source-system-foundation` hoặc change khác còn sửa cùng các file renderer trong worktree.
Mỗi lát cắt phải chạy `node scripts/check.mjs`; trước push chạy `node scripts/check.mjs --build`.

---

[Mục lục module](../README.md) · [Thiết kế repository](../../../DESIGN.md) ·
[OpenSpec refactor](../../../openspec/changes/refactor-renderer-domain-architecture/)

