#!/usr/bin/env node
// Làm mới bảng model đi kèm bản cài, lấy từ models.dev (MIT).
//
//   node scripts/refresh-model-catalog.mjs
//
// Chạy bằng tay, không tự động: giá đổi chậm hơn nhịp phát hành, và Mira phải chạy được khi
// không có mạng nên bảng này nằm trong repo chứ không gọi lúc chạy (ADR-004, D8 của change
// `ai-connection`). Script in ra provider nào thiếu để người chạy sửa danh sách thay vì im lặng
// bỏ qua.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE = 'https://models.dev/api.json'
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'main',
  'providers',
  'modelCatalog.json'
)

/** Chỉ các nhà cung cấp Mira có preset hoặc người dùng hay trỏ tới. Thêm vào đây khi thêm preset. */
const PROVIDERS = ['google', 'openrouter', 'deepseek', 'openai', 'anthropic', 'alibaba', 'lmstudio']

/** Chỉ các trường Mira dùng; bỏ phần còn lại để bảng không phình theo models.dev. */
function pickModel(model) {
  const out = { id: model.id, name: model.name }
  if (model.limit?.context) out.contextLimit = model.limit.context
  if (model.limit?.output) out.outputLimit = model.limit.output
  if (model.cost) {
    const cost = {}
    for (const [from, to] of [
      ['input', 'input'],
      ['output', 'output'],
      ['cache_read', 'cacheRead'],
      ['cache_write', 'cacheWrite']
    ]) {
      if (typeof model.cost[from] === 'number') cost[to] = model.cost[from]
    }
    if (Object.keys(cost).length > 0) out.cost = cost
  }
  if (model.structured_output === true) out.structuredOutput = true
  if (model.tool_call === true) out.toolCall = true
  if (model.reasoning === true) out.reasoning = true
  if (typeof model.status === 'string') out.status = model.status
  return out
}

const response = await fetch(SOURCE)
if (!response.ok) {
  console.error('Không tải được ' + SOURCE + ': HTTP ' + response.status)
  process.exit(1)
}
const source = await response.json()

const providers = {}
const missing = []
for (const id of PROVIDERS) {
  const entry = source[id]
  if (!entry) {
    missing.push(id)
    continue
  }
  const models = {}
  for (const [modelId, model] of Object.entries(entry.models ?? {})) {
    models[modelId] = pickModel(model)
  }
  providers[id] = { id, name: entry.name ?? id, models }
}

const catalog = {
  // Ngày đọc đi cùng dữ liệu: giao diện phải nói "giá tham khảo, cập nhật ngày …".
  readAt: new Date().toISOString().slice(0, 10),
  source: SOURCE,
  license: 'models.dev — MIT',
  providers
}

writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n', 'utf-8')

const modelCount = Object.values(providers).reduce((n, p) => n + Object.keys(p.models).length, 0)
console.log('Đã ghi ' + OUT)
console.log(
  Object.keys(providers).length +
    ' nhà cung cấp, ' +
    modelCount +
    ' model, đọc ngày ' +
    catalog.readAt
)
if (missing.length > 0) {
  console.warn('Không thấy trong nguồn (sửa PROVIDERS hoặc bỏ preset): ' + missing.join(', '))
}
