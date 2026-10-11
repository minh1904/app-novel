# Kiến trúc mã nguồn Mira

Cập nhật: 2026-10-10 · Trạng thái: **Đã triển khai**. Chủ trì: chủ sản phẩm.

Tài liệu này là nguồn quy tắc kiến trúc cấp repository. Tài liệu module ghi quyết định, nghiên cứu và
trạng thái triển khai; OpenSpec mô tả thiết kế kỹ thuật của từng change. Quy tắc thị giác và tương tác
nằm ở [`DESIGN.md`](DESIGN.md).

## Nguyên tắc

1. **Ranh giới process trước.** Main, preload, renderer và shared có môi trường chạy và quyền khác nhau;
   không vượt ranh giới bằng import tắt.
2. **Domain trước, feature sau.** Thư mục cấp cao nói Mira làm việc với phạm vi sản phẩm nào; feature/use
   case nằm trong domain sở hữu nó.
3. **Ownership trước tái sử dụng.** Mã ở owner sử dụng chính cho đến khi có ít nhất hai consumer độc lập và
   semantics đã trung lập domain.
4. **Phụ thuộc một chiều và kiểm tra được.** Kiến trúc không chỉ nằm trong tài liệu; bộ check phải phát
   hiện import ngược, deep import và chu trình.
5. **Colocate theo thay đổi.** Component, hook, model, store và test thường thay đổi cùng nhau thì ở gần
   nhau.
6. **Refactor cơ học tách khỏi đổi hành vi.** Một commit di chuyển không đồng thời viết lại state, đổi UI
   hay thay contract.

## Ranh giới repository

```text
src/
├── main/           # Electron host, dịch vụ, persistence, provider và IPC
├── preload/        # bridge typed, capability tối thiểu cho renderer
├── renderer/       # React UI; chỉ gọi host qua window.mira
├── shared/         # contract và logic thuần chạy được ở nhiều process
└── measurement/    # bộ đo độc lập, không đóng gói vào app
```

Hướng phụ thuộc:

```text
shared ← main services ← main IPC ← Electron composition
   ↑
   ├── preload bridge
   └── renderer

measurement đứng ngoài app runtime.
```

- `shared` không dùng Electron, React hoặc Node API.
- Renderer không import main/preload/measurement; dùng `window.mira` và contract ở `src/shared`.
- Preload không chứa business orchestration và không phơi primitive IPC tổng quát.
- Main giữ `infra` ở tầng thấp, `services` điều phối nghiệp vụ, `ipc` chỉ adapter contract và
  `electron` sở hữu lifecycle/native integration.
- Các rule hiện có trong `biome.json` tiếp tục là hàng rào cho ranh giới process.

## Kiến trúc renderer mục tiêu

```text
src/renderer/src/
├── app/
│   ├── navigation/             # view model và điều hướng cấp app
│   ├── screens/                # màn compose nhiều module
│   ├── shell/                  # khung cửa sổ và provider cấp app
│   └── hooks/                  # đồng bộ lifecycle cấp app với hệ thống ngoài
├── components/
│   └── ui/                     # primitive/pattern UI trung lập domain
├── hooks/                      # hook generic dùng bởi nhiều module
├── lib/                        # helper thuần, trung lập domain
└── modules/
    ├── library/
    ├── workspace/
    ├── ai-connections/
    ├── context/
    ├── sources/
    ├── export/
    └── agent/
```

Không tạo `renderer/src/shared`: tên này dễ nhầm với `src/shared`, là contract dùng qua nhiều process.
Mã dùng chung trong renderer phải nói rõ nó là UI, hook hay thư viện thuần.

### Domain và feature/use case

| Module | Sở hữu | Feature/use case chính |
| --- | --- | --- |
| `library` | catalog tác phẩm và metadata thư viện | danh sách, tạo/sửa tác phẩm, ảnh bìa |
| `workspace` | phiên làm việc trên một tác phẩm/chương | work detail, chapter navigation, editor, assistant, translation |
| `ai-connections` | kết nối, tài khoản, model và preference AI | onboarding, settings, model selection |
| `context` | tri thức hỗ trợ dịch | glossary, xưng hô, kho dùng chung, văn phong |
| `sources` | nguồn raw và cập nhật | source management, binding, update feed |
| `export` | trình bày lựa chọn export ở renderer | phạm vi, định dạng và export dialog |
| `agent` | trợ lý AI toàn ứng dụng, session và timeline activity | agent panel, chat/turns, activity timeline, write locks |

Feature/use case chỉ tạo các thư mục `components`, `hooks`, `model`, `store` hoặc `adapter` khi thật sự có
trách nhiệm tương ứng. Không dựng cây thư mục rỗng để mọi module trông giống nhau.

## Quy tắc đặt mã

### Component

- Primitive hoặc pattern UI không biết domain → `components/ui`.
- Component chỉ có nghĩa trong một domain → module sở hữu.
- Màn hình compose nhiều module nhưng không sở hữu business state → `app/screens`.
- Hai module dùng cùng component chưa đủ để chuyển nó thành primitive; xem semantics có trung lập không.

### Hook

- Hook đóng gói state/effect của một use case → đặt cạnh use case hoặc `<module>/hooks`.
- Hook domain-neutral được nhiều module dùng → root `hooks`.
- Hàm format, validate, state transition hoặc tính toán thuần → `model`/`lib`, không đổi thành hook.
- Không tạo lifecycle hook tổng quát như `useMount`; đặt tên theo hệ thống được đồng bộ, ví dụ
  `useWorkspaceRestore` hoặc `useSystemThemeSync`.

### State và store

- Domain state → `<module>/store`.
- State khung app như navigation, theme hoặc shell → `app`.
- Contract dữ liệu đi qua process → `src/shared/contracts`, không đặt trong Zustand store hay component.
- Không dùng một global store làm nơi chứa state chỉ vì nhiều màn nhìn thấy nó. App composition hoặc public
  API của owner vẫn là mặc định.

### Test

- Test colocate với source mà nó bảo vệ.
- Khi di chuyển owner, di chuyển cả test trong cùng lát cắt.
- Trước khi tách store/component lớn, bổ sung characterization test nếu test hiện tại chưa khóa hành vi.
- Không đổi fixture persistence hoặc contract trong một refactor chỉ đổi kiến trúc renderer.

## Public surface và import

Module có thể cung cấp `public.ts` với export tường minh cho app hoặc module khác. Đây là boundary, không
phải barrel gom toàn bộ file.

- Import bên trong module dùng relative path ngắn.
- Import qua boundary dùng `@renderer/*`.
- Module không import từ `app`.
- Module không deep-import implementation của module khác.
- Phụ thuộc liên module phải đi qua `public.ts`, có hướng một chiều và không tạo chu trình.
- Nếu hai module thường xuyên cần implementation của nhau, xem lại ownership trước khi tạo exception.
- Type/model dùng qua nhiều process thuộc `src/shared`; type chỉ phục vụ presentation thuộc module.

Hướng renderer:

```text
src/shared contracts
        ↓
renderer lib / hooks / components-ui
        ↓
renderer modules qua public surface
        ↓
app composition
```

## Composition root

`App.tsx` chỉ lắp provider, shell, navigation và surface cấp app. Các trách nhiệm sau có owner riêng:

- khôi phục workspace;
- shortcut cấp ứng dụng;
- đồng bộ theme hệ thống;
- đọc version ứng dụng;
- điều hướng và chọn màn;
- giữ workspace tab sống;
- listener phiên AI của workspace.

Tách trách nhiệm không đồng nghĩa tạo hook cho mọi đoạn code. Chỉ tách khi phần đó có lifecycle, contract
hoặc khả năng test riêng.

## Quyết định và ADR

ADR (Architecture Decision Record) ghi một quyết định kiến trúc quan trọng cùng bối cảnh, phương án đã
cân nhắc, lựa chọn và hệ quả. Chỉ tạo ADR khi quyết định có tác động rộng, khó đảo ngược hoặc cần được
người đến sau hiểu lý do; không dùng ADR thay cho task hay ghi chú implementation thường ngày.

Khi cần ADR, đặt tại `docs/architecture/decisions/NNNN-ten-quyet-dinh.md`, dùng trạng thái `proposed`,
`accepted`, `superseded` hoặc `deprecated`, và liên kết từ module chịu tác động. Chưa tạo thư mục/ADR mẫu
cho đến khi có quyết định đầu tiên thật sự cần nó.

## Quy trình thay đổi kiến trúc

1. Ghi nghiên cứu, quyết định và trạng thái vào module liên quan.
2. Tạo OpenSpec cho thay đổi cross-cutting trước khi di chuyển source; `design.md` trong change chỉ mô tả
   thiết kế của change đó, không thay thế tài liệu cấp repository.
3. Chụp baseline bằng `node scripts/check.mjs`.
4. Di chuyển theo owner, một lát cắt có thể review trong một phiên.
5. Chạy `node scripts/check.mjs` sau mỗi lát cắt và `node scripts/check.mjs --build` trước khi push.
6. Cập nhật tài liệu từ “mục tiêu” sang “đã triển khai” chỉ sau khi cây cũ, exception và import cũ đã
   được xóa.

## Trạng thái áp dụng

| Phạm vi | Trạng thái 2026-10-10 |
| --- | --- |
| Ranh giới main/preload/renderer/shared/measurement | Đã triển khai và có rule Biome |
| `components/ui` và design token | Đã triển khai |
| Module renderer theo domain | Đã triển khai (`modules/{library,workspace,ai-connections,context,sources,export}`) |
| Public surface và alias qua boundary | Đã triển khai (`@renderer/modules/*/public`) |
| Checker import/chu trình module | Đã triển khai (`scripts/check-renderer-boundaries.mjs`) |
| Làm mỏng `App.tsx` và tách `uiStore` | Đã triển khai (`src/renderer/src/app/*`) |

Kế hoạch triển khai nằm ở
[`openspec/changes/refactor-renderer-domain-architecture/`](openspec/changes/refactor-renderer-domain-architecture/).
Theo dõi bằng chứng và trạng thái tại
[`docs/modules/frontend-architecture/`](docs/modules/frontend-architecture/README.md).

