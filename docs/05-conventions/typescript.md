# Quy Ước TypeScript

---

## Compiler Options

`tsconfig.json` hiện tại đã bật strict mode đầy đủ:

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

| Flag | Tác dụng |
|------|---------|
| `strict` | Bật toàn bộ strict checks (`strictNullChecks`, `noImplicitAny`, v.v.) |
| `exactOptionalPropertyTypes` | `{ foo?: string }` không tương đương `{ foo: string \| undefined }` |
| `noUncheckedIndexedAccess` | `arr[0]` trả về `T \| undefined`, buộc phải kiểm tra |
| `noImplicitOverride` | Override method phải dùng từ khóa `override` |

Không ghi đè các flag này nếu không có lý do được ghi lại.

---

## `type` vs `interface`

Dùng `type` cho mọi trường hợp trừ khi cần declaration merging.

```typescript
// Ưu tiên
type Story = {
  id: string;
  title: string;
  language: SourceLanguage;
};

// Chỉ dùng interface khi cần merge — ví dụ mở rộng Window
interface Window {
  electronAPI: ElectronAPI;
}
```

---

## Import với `type`

Luôn dùng từ khóa `type` cho import chỉ dùng kiểu. Giúp bundler loại bỏ import mà không cần phân tích module.

```typescript
// Đúng
import type { IpcResult } from '../shared/types';
import { ipcService } from '../services/ipc';

// Sai — trộn giá trị và kiểu không dùng từ khóa type
import { IpcResult, ipcService } from '../services/ipc';
```

---

## `shared/` — Quy Tắc Import Process

`src/shared/` dùng chung giữa main process và renderer. **Không import từ `electron` hay Node built-ins** trong `shared/`:

```typescript
// src/shared/types.ts — OK
export type IpcResult<T> = ...
export type SourceLanguage = 'zh' | 'ja' | 'ko' | 'en';

// src/shared/utils.ts — SAI
import { app } from 'electron'; // ❌ renderer không có electron
import path from 'node:path';   // ❌ renderer không có Node
```

---

## Zod Schemas

Dùng Zod cho tất cả input từ bên ngoài: IPC args từ renderer, form data, biến môi trường.

```typescript
import { z } from 'zod';

// Định nghĩa schema, lấy TypeScript type từ schema — không định nghĩa trùng lặp
const SaveFileSchema = z.object({
  content: z.string().max(10_000_000),
  fileName: z.string().regex(/^[\w\-.]+$/),
});

type SaveFileInput = z.infer<typeof SaveFileSchema>;

// Validate trong IPC handler (main process)
ipcMain.handle('save-file', async (_event, args: unknown) => {
  const parsed = SaveFileSchema.safeParse(args);
  if (!parsed.success) return { success: false, error: 'Invalid arguments' };
  // tiếp tục với parsed.data
});
```

Không viết `type` thủ công nếu đã có Zod schema.

---

## Không Dùng `any`

`any` bị cấm. Thay bằng `unknown` kết hợp với type guard hoặc Zod.

```typescript
// Sai
function process(data: any) { ... }

// Đúng — unknown + type guard
function process(data: unknown) {
  if (typeof data !== 'object' || data === null) throw new Error('...');
}

// Đúng — unknown + Zod parse
const result = MySchema.safeParse(data);
```

---

## Union Types thay vì Enum

Ưu tiên union string thay vì TypeScript `enum`. Enum biên dịch thành runtime object và có edge cases ở strict mode.

```typescript
// Ưu tiên
type SourceLanguage = 'zh' | 'ja' | 'ko' | 'en';

// Tránh
enum SourceLanguage { ZH = 'zh', JA = 'ja' }
```

---

## Path Aliases

`tsconfig.json` và các vite configs đã cấu hình:

| Alias | Resolve đến | Dùng ở |
|-------|------------|--------|
| `@/*` | `src/renderer/*` | Renderer process |
| `@shared/*` | `src/shared/*` | Tất cả processes |

```typescript
// Thay vì
import type { IpcResult } from '../../../shared/types';
import { StoryCard } from '../features/stories/components/StoryCard';

// Dùng alias
import type { IpcResult } from '@shared/types';
import { StoryCard } from '@/features/stories/components/StoryCard';
```

---

## Đặt Tên

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Type / interface | PascalCase | `type IpcResult<T>` |
| Function / variable | camelCase | `const ipcService` |
| File (component) | PascalCase | `StoryCard.tsx` |
| File (non-component) | kebab-case | `ipc-handler.ts` |
| Constant global | SCREAMING_SNAKE | `MAX_CHUNK_SIZE` |
