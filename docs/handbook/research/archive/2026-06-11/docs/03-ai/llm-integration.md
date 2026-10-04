# LLM Integration (Electron Main Process)

LLM calls thực hiện từ **main process** — không bao giờ từ renderer. Lý do: API key không được phép đến browser context.

```
Renderer → IPC → Main Process → LLM Provider (Gemini/OpenRouter/Ollama)
```

---

## Provider Interface

Tất cả providers implement cùng một interface để dễ swap:

```typescript
// src/main/services/llm/interface.ts
export interface LLMProvider {
  translate(messages: LLMMessage[], opts?: TranslateOpts): Promise<string>;
  translateStream(messages: LLMMessage[], opts?: TranslateOpts): AsyncIterable<string>;
}

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type TranslateOpts = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};
```

---

## Provider Factory

```typescript
// src/main/services/llm/factory.ts
import Store from 'electron-store';

export function createLLMProvider(provider: 'gemini' | 'openrouter' | 'ollama'): LLMProvider {
  const store = new Store<AppConfig>();

  switch (provider) {
    case 'gemini':
      return new GeminiProvider(store.get('geminiApiKey'));
    case 'openrouter':
      return new OpenRouterProvider(store.get('openrouterApiKey'));
    case 'ollama':
      return new OllamaProvider(store.get('ollamaBaseUrl') ?? 'http://localhost:11434');
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

---

## Gemini Adapter

```typescript
// src/main/services/llm/providers/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async translate(messages: LLMMessage[], opts?: TranslateOpts): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: opts?.model ?? 'gemini-1.5-flash',
    });
    // convert messages → Gemini format
    const result = await model.generateContent(this.toGeminiParts(messages));
    return result.response.text();
  }
}
```

---

## OpenRouter Adapter

```typescript
// src/main/services/llm/providers/openrouter.ts
import OpenAI from 'openai';

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async translate(messages: LLMMessage[], opts?: TranslateOpts): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: opts?.model ?? 'anthropic/claude-3-haiku',
      messages,
    });
    return res.choices[0]?.message.content ?? '';
  }
}
```

---

## Ollama Adapter (local)

```typescript
// src/main/services/llm/providers/ollama.ts
export class OllamaProvider implements LLMProvider {
  constructor(private baseUrl: string) {}

  async translate(messages: LLMMessage[], opts?: TranslateOpts): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts?.model ?? 'llama3',
        messages,
        stream: false,
      }),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
    const data = await res.json() as { message: { content: string } };
    return data.message.content;
  }
}
```

---

## IPC Handler cho LLM

```typescript
// src/main/ipc/llm-handlers.ts
import { ipcMain } from 'electron';
import { z } from 'zod';
import { createLLMProvider } from '../services/llm/factory';
import type { IpcResult } from '@shared/types';

const TranslateSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  provider: z.enum(['gemini', 'openrouter', 'ollama']),
  model: z.string().optional(),
});

export function registerLlmHandlers(): void {
  ipcMain.handle('llm:translate', async (_event, args: unknown): Promise<IpcResult<string>> => {
    const parsed = TranslateSchema.safeParse(args);
    if (!parsed.success) return { success: false, error: 'Invalid arguments' };

    try {
      const provider = createLLMProvider(parsed.data.provider);
      const result = await provider.translate(parsed.data.messages, {
        model: parsed.data.model,
      });
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
```

---

## API Key Storage

API key lưu trong `electron-store` — không bao giờ đến renderer:

```typescript
// src/main/services/config-service.ts
import Store from 'electron-store';

type AppConfig = {
  geminiApiKey: string;
  openrouterApiKey: string;
  ollamaBaseUrl: string;
  defaultProvider: 'gemini' | 'openrouter' | 'ollama';
};

const store = new Store<AppConfig>({
  schema: {
    geminiApiKey:      { type: 'string', default: '' },
    openrouterApiKey:  { type: 'string', default: '' },
    ollamaBaseUrl:     { type: 'string', default: 'http://localhost:11434' },
    defaultProvider:   { type: 'string', enum: ['gemini', 'openrouter', 'ollama'], default: 'gemini' },
  },
});

export const configService = {
  get: <K extends keyof AppConfig>(key: K) => store.get(key),
  set: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => store.set(key, value),
};
```

Renderer **không thể đọc API key trực tiếp** — chỉ có thể set/get config fields thông qua IPC `config:get` / `config:set` handlers (không expose key field).

---

## Providers Summary

| Provider | Dùng khi | Yêu cầu |
|----------|---------|---------|
| `gemini` | Default cloud, cost thấp | `GEMINI_API_KEY` |
| `openrouter` | Muốn chọn model linh hoạt | `OPENROUTER_API_KEY` |
| `ollama` | Local, offline, privacy | Ollama chạy trên máy user |

---

## Cài đặt Dependencies

```bash
pnpm add @google/generative-ai openai electron-store
pnpm add -D @types/electron-store
```
