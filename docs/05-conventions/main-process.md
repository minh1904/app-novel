# Quy Ước Main Process ("Backend")

Trong Electron, **main process là backend**. Không có HTTP server, không có port. IPC là "API", main process là "server".

```
Renderer (React)
  └── services/ipc.ts         → window.electronAPI.*
        └── preload bridge
              └── IPC invoke/handle
                    └── Main Process
                          ├── ipc/           ← "route handlers"
                          ├── services/      ← business logic
                          └── data/          ← data layer
```

---

## Tổ Chức IPC Handlers

Tách handlers theo domain, không để tất cả trong một file:

```
src/main/
  index.ts               # Bootstrap: createWindow, registerIpcHandlers
  window.ts              # BrowserWindow factory (optional khi có nhiều window)
  ipc/
    index.ts             # Gọi register*Handlers() của từng domain
    story-handlers.ts    # IPC handlers cho stories
    chapter-handlers.ts  # IPC handlers cho chapters
    file-handlers.ts     # IPC handlers cho file system
```

`ipc/index.ts` chỉ làm việc đăng ký:

```typescript
import { registerStoryHandlers } from './story-handlers';
import { registerChapterHandlers } from './chapter-handlers';

export function registerIpcHandlers(): void {
  registerStoryHandlers();
  registerChapterHandlers();
}
```

---

## Handler → Service → Data Pattern

IPC handler không chứa business logic — chỉ validate input, gọi service, trả kết quả:

```typescript
// src/main/ipc/story-handlers.ts
import { z } from 'zod';
import { storyService } from '../services/story-service';

const CreateStorySchema = z.object({
  title: z.string().min(1).max(200),
  language: z.enum(['zh', 'ja', 'ko', 'en']),
});

export function registerStoryHandlers(): void {
  ipcMain.handle('story:create', async (_event, args: unknown) => {
    const parsed = CreateStorySchema.safeParse(args);
    if (!parsed.success) {
      return { success: false, error: 'Invalid arguments' };
    }
    return storyService.create(parsed.data);
  });

  ipcMain.handle('story:list', async () => {
    return storyService.findAll();
  });
}
```

Service chứa logic nghiệp vụ:

```typescript
// src/main/services/story-service.ts
import { storyRepo } from '../data/repositories/story-repo';

export const storyService = {
  create: async (input: CreateStoryInput): Promise<IpcResult<Story>> => {
    try {
      const story = await storyRepo.create(input);
      return { success: true, data: story };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },
  findAll: async (): Promise<IpcResult<Story[]>> => { ... },
};
```

---

## Đặt Tên IPC Channel

Format: `domain:action` — lowercase, kebab-case:

```
story:create
story:list
story:get-by-id
story:delete
chapter:create
chapter:translate
file:export
```

Không dùng tên không rõ ràng như `getData`, `doSave`, `ping`.

---

## Data Layer — Khuyến Nghị cho Novel App

| Loại data | Giải pháp | Lý do |
|-----------|-----------|-------|
| Config, preferences | `electron-store` | JSON đơn giản, không cần SQL |
| Stories, chapters, characters, glossary | `better-sqlite3` | Relational, query phức tạp, temporal data |
| Raw text files import/export | `node:fs` | User owns the files |

### electron-store (config)

```typescript
import Store from 'electron-store';

const store = new Store<AppConfig>({
  schema: {
    theme: { type: 'string', enum: ['light', 'dark'], default: 'light' },
    apiKey: { type: 'string', default: '' },
  },
});

// Đọc/ghi
store.get('theme');
store.set('theme', 'dark');
```

### better-sqlite3 (app data)

```typescript
import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

// Lưu DB trong userData — không mất khi update app
const dbPath = path.join(app.getPath('userData'), 'data.db');
const db = new Database(dbPath);

// Migrations chạy khi khởi động
db.exec(`
  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);
```

Repository pattern — không raw SQL trong handlers/services:

```typescript
// src/main/data/repositories/story-repo.ts
export const storyRepo = {
  create: (input: CreateStoryInput): Story => {
    const stmt = db.prepare(
      'INSERT INTO stories (id, title, language, created_at) VALUES (?, ?, ?, ?)'
    );
    const id = crypto.randomUUID();
    stmt.run(id, input.title, input.language, Date.now());
    return { id, ...input, createdAt: Date.now() };
  },
  findAll: (): Story[] => {
    return db.prepare('SELECT * FROM stories ORDER BY created_at DESC').all() as Story[];
  },
};
```

---

## External API Calls (LLM)

Nếu app cần gọi LLM (Gemini, OpenRouter, Ollama), **gọi từ main process** — không từ renderer:

```typescript
// src/main/services/llm-service.ts
export const llmService = {
  translate: async (text: string): Promise<IpcResult<string>> => {
    const apiKey = store.get('apiKey');
    if (!apiKey) return { success: false, error: 'API key chưa được cấu hình' };

    const res = await fetch('https://...', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return { success: true, data: data.translation };
  },
};
```

**Lý do gọi từ main:** API key không bao giờ đến renderer — lấy từ electron-store hoặc env, xử lý ở main.

---

## Result Type — Bắt Buộc

Mọi IPC handler đều trả về `IpcResult<T>` từ `src/shared/types.ts`:

```typescript
// Đúng
ipcMain.handle('story:create', async (_event, args) => {
  try {
    const story = await storyService.create(args);
    return { success: true, data: story };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

// Sai — throw qua IPC chỉ giữ lại property message
ipcMain.handle('story:create', async (_event, args) => {
  const story = await storyService.create(args); // throws → mất error context
  return story;
});
```

---

## Validate Input từ Renderer

Renderer có thể bị compromise — **không tin tưởng input không validated**:

```typescript
// Mọi handler POST đều cần Zod validate trước khi xử lý
ipcMain.handle('story:create', async (_event, args: unknown) => {
  const parsed = CreateStorySchema.safeParse(args);
  if (!parsed.success) return { success: false, error: 'Invalid arguments' };
  // proceed với parsed.data — đã có type đúng
});
```
