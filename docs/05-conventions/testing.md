# Quy Ước Testing

Dùng [Vitest](https://vitest.dev) cho unit test và [Playwright](https://playwright.dev) cho E2E (bao gồm Electron E2E).

---

## Vị Trí Test

| Loại | Vị trí | Phạm vi |
|------|--------|---------|
| Unit | `src/**/*.test.ts` (cạnh file nguồn) | Hàm thuần — không IPC, không window |
| E2E | `e2e/*.spec.ts` | Luồng đầy đủ qua Playwright + Electron |

---

## Unit Test (Vitest)

Nằm cạnh file nguồn, không tách thư mục `__tests__/` riêng:

```
src/renderer/
  features/editor/
    chunker.ts
    chunker.test.ts     ← cạnh nguồn
```

**Nên test:**
- Pure functions trong `src/shared/` và `src/renderer/utils/`
- Logic nghiệp vụ không phụ thuộc IPC hay DOM
- Zod schema validation — input hợp lệ và không hợp lệ

**Mock `window.electronAPI` khi test component có IPC:**

```typescript
// Trong setup test hoặc file test
vi.stubGlobal('electronAPI', {
  ping: vi.fn().mockResolvedValue('pong'),
  saveFile: vi.fn().mockResolvedValue({ success: true, data: '/path/file.txt' }),
});
```

**Không mock logic thuần** — chỉ truyền giá trị khác nhau:

```typescript
// Đúng — test pure function trực tiếp
import { chunkText } from './chunker';
expect(chunkText('abc', 10)).toEqual(['abc']);

// Sai — mock function mà lẽ ra cần test thực
vi.mock('./chunker', () => ({ chunkText: vi.fn() }));
```

Cài đặt:

```bash
pnpm add -D vitest @vitest/coverage-v8
```

---

## E2E Test (Playwright + Electron)

Playwright hỗ trợ Electron native — không dùng Spectron (deprecated từ Electron 14).

```typescript
// e2e/app.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test('app launches', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await expect(window).toHaveTitle(/app-novel/);
  await app.close();
});
```

**Chỉ test happy path và critical flows.** Chi tiết unit-level thuộc về Vitest.

Cài đặt:

```bash
pnpm add -D @playwright/test
npx playwright install
```

Config:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { screenshot: 'only-on-failure' },
});
```

---

## Mục Tiêu Coverage

| Phạm vi | Mục tiêu |
|---------|---------|
| `src/shared/` (utils, types) | ≥ 80% |
| `src/renderer/features/` (logic) | ≥ 60% |
| IPC handlers (`src/main/ipc/`) | ≥ 60% |

Chạy coverage:

```bash
pnpm vitest run --coverage
```

---

## Triết Lý Testing

- **Test hành vi, không test implementation** — test output của function, không test cách nó gọi hàm khác
- **Test thực hơn mock** — mock `window.electronAPI` là OK vì đó là system boundary; không mock pure logic
- **E2E test luồng, không test detail** — nếu một hành vi có thể test bằng unit test thì không dùng E2E

---

## Chạy Test

```bash
pnpm vitest          # watch mode
pnpm vitest run      # one-shot
pnpm playwright test # E2E
```
