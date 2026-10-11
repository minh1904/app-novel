#!/usr/bin/env node
// Làm mới bảng model đi kèm bản cài, lấy từ models.dev (MIT).
//
//   node scripts/refresh-model-catalog.mjs
//
// Chạy bằng tay, không tự động: bảng giá thay đổi chậm hơn nhịp phát hành, và ứng dụng phải hoạt động
// được khi không có mạng nên danh mục này được lưu sẵn trong kho mã nguồn thay vì gọi mạng lúc khởi động.
// Script in ra nhà cung cấp nào còn thiếu để người chạy cập nhật danh sách thay vì âm thầm bỏ qua.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'

const SOURCE = 'https://models.dev/api.json'
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'main',
  'infra',
  'providers',
  'modelCatalog.json'
)

/** Chỉ các nhà cung cấp Mira có preset hoặc người dùng hay trỏ tới. Thêm vào đây khi thêm preset. */
const PROVIDERS = ['google', 'openrouter', 'deepseek', 'openai', 'anthropic', 'alibaba', 'lmstudio']

/**
 * Cách một mô hình nhận mức độ suy luận, giữ đúng ba dạng theo nguồn cung cấp.
 * Dạng lạ hoặc thiếu trường bắt buộc sẽ bị bỏ qua thay vì ghi dữ liệu không rõ ràng;
 * mảng rỗng biểu thị nguồn không cung cấp thông tin và cũng không được ghi.
 */
function pickReasoningOptions(options) {
  if (!Array.isArray(options)) return undefined
  const out = []
  for (const option of options) {
    if (option?.type === 'toggle') {
      out.push({ type: 'toggle' })
    } else if (option?.type === 'effort') {
      const values = Array.isArray(option.values)
        ? option.values.filter((value) => typeof value === 'string')
        : []
      if (values.length > 0) out.push({ type: 'effort', values })
    } else if (option?.type === 'budget_tokens') {
      const budget = { type: 'budget_tokens' }
      if (typeof option.min === 'number') budget.min = option.min
      if (typeof option.max === 'number') budget.max = option.max
      out.push(budget)
    }
  }
  return out.length > 0 ? out : undefined
}

/** Chỉ lấy các trường ứng dụng cần dùng; bỏ phần còn lại để danh mục không bị phình to. */
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
  const reasoningOptions = pickReasoningOptions(model.reasoning_options)
  if (reasoningOptions !== undefined) out.reasoningOptions = reasoningOptions
  // Chỉ ghi khi nguồn chỉ định rõ ràng `false`: không có hoặc mang giá trị `true` đều biểu thị không giới hạn.
  if (model.temperature === false) out.temperature = false
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
  // Ngày lấy dữ liệu: giao diện hiển thị "giá tham khảo, cập nhật ngày …".
  readAt: new Date().toISOString().slice(0, 10),
  source: SOURCE,
  license: 'models.dev — MIT',
  providers
}

// Định dạng qua Prettier để tệp đầu ra tuân thủ chuẩn định dạng (mảng ngắn trên một dòng, CRLF).
const prettierOptions = { ...(await resolveConfig(OUT)), filepath: OUT }
writeFileSync(OUT, await format(JSON.stringify(catalog, null, 2), prettierOptions), 'utf-8')

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
