# Tài Liệu NovelFlow

**NovelFlow** là bàn làm việc dịch thuật chuyên dụng cho dịch giả fan tiểu thuyết người Việt.  
Desktop app chạy hoàn toàn local. AI là integration, không phải sản phẩm.

**Stack**: Electron + Electron Forge + Vite + React 19 + Tailwind CSS v4 + TypeScript

---

## Lộ Trình Đọc

### Product (đọc đây trước nếu bạn muốn hiểu WHY)

1. [`01-product/01-vision.md`](01-product/01-vision.md) — Vision, positioning, triết lý thiết kế
2. [`01-product/02-user-research.md`](01-product/02-user-research.md) — Research findings (verified), pain points
3. [`01-product/03-personas.md`](01-product/03-personas.md) — 3 personas: Solo, Team Lead, Editor
4. [`01-product/04-user-journeys.md`](01-product/04-user-journeys.md) — 5 journeys: onboarding → daily loop → context → export → team
5. [`01-product/05-feature-spec.md`](01-product/05-feature-spec.md) — Feature spec P0/P1/P2/P3 với acceptance criteria
6. [`01-product/06-ux-principles.md`](01-product/06-ux-principles.md) — 8 nguyên tắc UX
7. [`01-product/07-information-architecture.md`](01-product/07-information-architecture.md) — IA, screens, data model, AI injection flow

---

### Bắt Đầu

1. [`02-architecture/tech-stack.md`](02-architecture/tech-stack.md) — stack và lý do chọn, mô hình 3 process, bảo mật
2. [`05-conventions/typescript.md`](05-conventions/typescript.md) — strict mode, Zod, không `any`, path aliases

### Main Process (Backend)

3. [`05-conventions/main-process.md`](05-conventions/main-process.md) — IPC handler → service → repository, data layer, LLM calls
4. [`03-ai/llm-integration.md`](03-ai/llm-integration.md) — provider interface, factory, Gemini/OpenRouter/Ollama, API key storage

### Renderer (Frontend)

5. [`05-conventions/frontend.md`](05-conventions/frontend.md) — feature folder, IPC service layer, naming, state
6. [`05-conventions/testing.md`](05-conventions/testing.md) — Vitest unit, Playwright E2E, coverage targets

### AI / Dịch Thuật

7. [`03-ai/prompt-engineering.md`](03-ai/prompt-engineering.md) — 5-layer prompt, genre templates, token budget
8. [`03-ai/quality-evaluation.md`](03-ai/quality-evaluation.md) — MQM-lite rubric, quality gates, issue lifecycle
9. [`03-ai/vietnamese-honorifics.md`](03-ai/vietnamese-honorifics.md) — xưng hô ZH/EN/JA/KR → VI, registry cặp nhân vật

### Research

10. [`04-research/README.md`](04-research/README.md) — chỉ mục, bài học từ ecosystem
11. [`04-research/prompt-injection-analysis.md`](04-research/prompt-injection-analysis.md) — so sánh 10 tool dịch truyện, patterns
12. [`04-research/brainstorm-prompt-improvements.md`](04-research/brainstorm-prompt-improvements.md) — backlog ý tưởng Tier A/B/C

---

## Bản Đồ Tài Liệu

### 02-architecture

| File | Nội dung |
|------|----------|
| [`tech-stack.md`](02-architecture/tech-stack.md) | Quyết định stack, mô hình 3 process, BrowserWindow security, CSP, navigation guards, typed IPC, Electron Fuses |

### 03-ai

| File | Nội dung |
|------|----------|
| [`llm-integration.md`](03-ai/llm-integration.md) | LLMProvider interface, factory pattern, Gemini/OpenRouter/Ollama adapters, IPC handler `llm:translate`, API key storage |
| [`prompt-engineering.md`](03-ai/prompt-engineering.md) | 5-layer prompt architecture, messages array, token budget, genre templates (xianxia/isekai/manhwa/LitRPG...) |
| [`quality-evaluation.md`](03-ai/quality-evaluation.md) | MQM-lite rubric (terminology/accuracy/fluency/format), severity levels, MVP quality gates, issue lifecycle |
| [`vietnamese-honorifics.md`](03-ai/vietnamese-honorifics.md) | Ma trận xưng hô, ZH/EN/JA/KR → VI examples, register shift, QA checklist, prompt block |

### 04-research

| File | Nội dung |
|------|----------|
| [`README.md`](04-research/README.md) | Chỉ mục repos tham khảo, bài học sản phẩm hiện tại |
| [`prompt-injection-analysis.md`](04-research/prompt-injection-analysis.md) | So sánh 10 tool (bilingual_book_maker, SpiraMirabilis, ebook-GPT-translator...), ma trận patterns, gaps |
| [`brainstorm-prompt-improvements.md`](04-research/brainstorm-prompt-improvements.md) | Backlog Tier A (chunk coefficient, term memory, genre presets) / B (RAG, relationship tracking) / C |

### 05-conventions

| File | Nội dung |
|------|----------|
| [`typescript.md`](05-conventions/typescript.md) | Strict flags, `type` vs `interface`, import type, Zod schemas, no `any`, union types, path aliases |
| [`main-process.md`](05-conventions/main-process.md) | Main process = BE, handler → service → repository, IPC channel naming `domain:action`, Result type, Zod validation |
| [`frontend.md`](05-conventions/frontend.md) | Feature folder structure, IPC service layer, useEffect cleanup, Strict Mode, naming, state management |
| [`testing.md`](05-conventions/testing.md) | Vitest unit (co-located), mock `window.electronAPI`, Playwright E2E với `_electron`, coverage targets |

---

## Kiến Trúc Nhanh

```
Main Process (Node.js)
  ├── ipc/          ← IPC handlers theo domain (domain:action)
  └── services/     ← business logic, LLM calls, data layer

Preload (sandboxed bridge)
  └── contextBridge ← expose typed API cho renderer

Renderer (React app)
  ├── features/     ← domain modules (components/hooks/services/store)
  ├── services/     ← wrapper window.electronAPI (ipc.ts)
  ├── components/   ← shared UI
  ├── layouts/
  ├── hooks/
  └── store/
```

**Quy tắc vàng:** Renderer không được biết nó đang chạy trong Electron — mọi truy cập OS/Node đều qua `services/ipc.ts`.
