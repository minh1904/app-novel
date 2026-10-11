// Ghi lại phản hồi thực tế từ endpoint tương thích OpenAI của Gemini, giúp tầng provider được kiểm thử
// dựa trên cấu trúc dữ liệu thực tế thay vì cấu trúc suy ra từ tài liệu.
//
//   GEMINI_API_KEY=...   node scripts/capture-provider-fixtures.mjs
//   node scripts/capture-provider-fixtures.mjs --dry-run      in kế hoạch, không gửi request
//   ... --burst 20       gửi đồng thời 20 request để kích hoạt lỗi 429 (tiêu tốn hạn mức gói miễn phí)
//   ... --model NAME     chỉ thăm dò mô hình này (xem bên dưới)
//
// Hai loại kịch bản:
//
//   baseline  các câu hỏi về chính endpoint (cấu trúc phản hồi, vị trí trả về usage, hình thức khi sai key).
//             Được ghi dưới tên cố định để các bài kiểm thử provider phát lại, do đó chỉ chạy khi không truyền
//             --model, nhắm vào mô hình "flash" đầu tiên mà API liệt kê. Chạy với mô hình khác sẽ ghi đè dữ liệu mẫu.
//
//   probe     các câu hỏi về một mô hình cụ thể: chấp nhận các mức tư duy (reasoning) nào, có nhận temperature
//             hoặc top_p hay không. Được ghi dưới dạng `probe-<model>-<scenario>.json` để có thể đối chiếu
//             giữa các mô hình, chạy cho từng mô hình khi có hoặc không có --model. Dùng để đối chiếu khả năng
//             hỗ trợ của mô hình (`modelCapability`) với hành vi thực tế của provider:
//               node scripts/capture-provider-fixtures.mjs --model gemini-2.5-pro
//
// Khóa API được đọc từ biến môi trường và không bao giờ được ghi xuống đĩa: mọi request, response và tên tệp
// đều được lọc sạch; script sẽ đọc lại các tệp vừa ghi và xóa ngay nếu phát hiện sót khóa.
// Tuyệt đối không đưa khóa API vào dòng lệnh.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(root, 'src', 'main', 'infra', 'providers', '__fixtures__', 'live')
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'
const PROMPT = 'Dịch sang tiếng Việt, chỉ trả bản dịch: 你好，世界。今天天气很好。'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const flag = (name) => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : undefined
}
const burst = Number(flag('--burst') ?? 0)
const wantedModel = flag('--model') ?? process.env.GEMINI_MODEL
const key = process.env.GEMINI_API_KEY ?? ''

/** Mỗi kịch bản giải quyết một câu hỏi kỹ thuật về hành vi của API. */
const BASELINE = [
  { name: 'models', asks: 'what does GET /models return, and under which ids?' },
  { name: 'models-no-key', asks: 'does a missing key still look like a 404 here?' },
  { name: 'chat-complete', asks: 'shape of a plain answer: finish_reason, usage fields' },
  { name: 'chat-stream', asks: 'where do finish_reason and usage arrive in the stream (include_usage on)?' },
  { name: 'chat-stream-default', asks: 'does usage still arrive when stream_options is left out?' },
  { name: 'max-tokens', asks: 'does the endpoint take max_tokens, and what finish_reason does a cut give?' },
  { name: 'max-completion-tokens', asks: 'does it take max_completion_tokens instead?' },
  { name: 'reasoning-none', asks: 'does reasoning_effort "none" change usage (thinking tokens)?' },
  { name: 'bad-key', asks: 'status and body of a rejected key' },
  ...(burst > 0 ? [{ name: 'burst-429', asks: `first 429 out of ${burst} simultaneous requests` }] : [])
]

/**
 * Thăm dò từng tham số riêng lẻ với mô hình để xác định chính xác nguyên nhân nếu bị từ chối.
 * `effort-invalid` ghi lại phản hồi khi từ chối mức tư duy không hợp lệ, dùng để kiểm tra
 * thông báo hiển thị cho người dùng khi chọn mức mô hình không hỗ trợ.
 */
const PROBES = [
  { name: 'effort-none', asks: 'does it take reasoning_effort "none" (thinking off)?', extra: { reasoning_effort: 'none' } },
  { name: 'effort-minimal', asks: 'does it take "minimal"?', extra: { reasoning_effort: 'minimal' } },
  { name: 'effort-low', asks: 'does it take "low"?', extra: { reasoning_effort: 'low' } },
  { name: 'effort-medium', asks: 'does it take "medium"?', extra: { reasoning_effort: 'medium' } },
  { name: 'effort-high', asks: 'does it take "high"?', extra: { reasoning_effort: 'high' } },
  { name: 'effort-invalid', asks: 'how is a level the model does not have refused?', extra: { reasoning_effort: 'ludicrous' } },
  { name: 'temperature', asks: 'does it take temperature 0.3 on its own?', extra: { temperature: 0.3 } },
  { name: 'top-p', asks: 'does it take top_p 0.9 on its own?', extra: { top_p: 0.9 } }
]

/** Chuyển mã định danh mô hình thành chuỗi hợp lệ trong tên tệp: giữ `gemini-2.5-pro`, loại bỏ dấu gạch chéo. */
function slug(id) {
  return String(id).replace(/^models\//, '').replace(/[^A-Za-z0-9.-]+/g, '-')
}

const probeOnly = wantedModel !== undefined

if (dryRun) {
  const shownModel = wantedModel === undefined ? '<model>' : slug(wantedModel)
  console.log('Plan (no request is made):')
  console.log('  endpoint  ' + BASE_URL)
  console.log('  output    ' + OUT_DIR)
  console.log('  model     ' + (wantedModel ?? '(the first "flash" model GET /models lists)'))
  if (probeOnly) {
    console.log('  baseline  skipped: --model given, so only the probes run (they would overwrite the recordings the tests replay)')
  } else {
    for (const scenario of BASELINE) console.log('  - ' + scenario.name.padEnd(36) + scenario.asks)
  }
  for (const probe of PROBES) {
    console.log('  - ' + ('probe-' + shownModel + '-' + probe.name).padEnd(36) + probe.asks)
  }
  process.exit(0)
}

if (key === '') {
  console.error('GEMINI_API_KEY is not set. Set it in your own terminal and run this again.')
  console.error('Use --dry-run to see what would be requested.')
  process.exit(1)
}

/** Loại bỏ khóa API, chuỗi URL-encoded và Bearer token khỏi văn bản chuẩn bị lưu. */
function scrub(text) {
  let out = text
  for (const secret of [key, encodeURIComponent(key)]) out = out.split(secret).join('<redacted>')
  return out.replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/g, 'Bearer <redacted>')
}

function headersOf(response) {
  const kept = {}
  for (const [name, value] of response.headers) if (name !== 'set-cookie') kept[name] = scrub(value)
  return kept
}

async function call({ method = 'GET', path, body, auth = key }) {
  const headers = { accept: 'application/json' }
  if (body !== undefined) headers['content-type'] = 'application/json'
  if (auth !== '') headers.authorization = 'Bearer ' + auth
  const startedAt = Date.now()
  const response = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  // Đọc dưới dạng văn bản thô: body của SSE cần giữ nguyên từng byte, và body lỗi có thể không phải JSON.
  const text = await response.text()
  return {
    request: {
      method,
      url: BASE_URL + path,
      headers: { ...headers, ...(headers.authorization ? { authorization: 'Bearer <redacted>' } : {}) },
      body
    },
    response: { status: response.status, headers: headersOf(response), bodyText: scrub(text) },
    elapsedMs: Date.now() - startedAt
  }
}

/** Các tệp được ghi trong lượt chạy này để kiểm tra rò rỉ khóa. */
const written = []

function save(name, model, result) {
  const file = join(OUT_DIR, name + '.json')
  const record = { scenario: name, capturedAt: new Date().toISOString(), model, ...result }
  writeFileSync(file, scrub(JSON.stringify(record, null, 2)) + '\n', 'utf8')
  written.push(file)
  const status = result.response?.status ?? 'n/a'
  console.log('saved  ' + name.padEnd(36) + 'HTTP ' + status)
}

/** Tóm tắt kết quả phản hồi của mô hình hoặc lý do bị từ chối thành một dòng ngắn gọn. */
function summarize(result) {
  const { status, bodyText } = result.response
  try {
    const parsed = JSON.parse(bodyText)
    const body = Array.isArray(parsed) ? parsed[0] : parsed
    if (status >= 400) return 'refused: ' + String(body?.error?.message ?? bodyText).slice(0, 140)
    const usage = body?.usage
    const tokens = usage
      ? 'in ' + usage.prompt_tokens + ', out ' + usage.completion_tokens + ', total ' + usage.total_tokens
      : 'no usage'
    return 'accepted: ' + tokens + ', finish ' + body?.choices?.[0]?.finish_reason
  } catch {
    return status >= 400 ? 'refused: ' + bodyText.slice(0, 140) : 'accepted (body is not JSON)'
  }
}

mkdirSync(OUT_DIR, { recursive: true })

let model = wantedModel
// Chỉ dùng để chọn mô hình. Chỉ lưu kết quả mẫu ở chế độ baseline để tránh ghi đè dữ liệu chuẩn.
const modelsResult = model === undefined ? await call({ path: '/models' }) : undefined
if (modelsResult !== undefined) {
  save('models', '(not chosen yet)', modelsResult)
  try {
    const ids = (JSON.parse(modelsResult.response.bodyText).data ?? []).map((entry) =>
      String(entry.id).replace(/^models\//, '')
    )
    model = ids.find((id) => /flash/i.test(id) && !/image|tts|live|audio/i.test(id)) ?? ids[0]
  } catch {
    // Bỏ qua lỗi và tiếp tục kiểm tra điều kiện bên dưới
  }
}
if (model === undefined) {
  console.error('Could not pick a model from GET /models. Pass --model NAME.')
  process.exit(1)
}
console.log('model  ' + model)

const user = { role: 'user', content: PROMPT }
const chat = (extra = {}) => ({ path: '/chat/completions', method: 'POST', body: { model, messages: [user], ...extra } })

if (!probeOnly) {
  save('models-no-key', model, await call({ path: '/models', auth: '' }))
  save('chat-complete', model, await call(chat()))
  save('chat-stream', model, await call(chat({ stream: true, stream_options: { include_usage: true } })))
  save('chat-stream-default', model, await call(chat({ stream: true })))
  save('max-tokens', model, await call(chat({ max_tokens: 5 })))
  save('max-completion-tokens', model, await call(chat({ max_completion_tokens: 5 })))
  save('reasoning-none', model, await call(chat({ reasoning_effort: 'none' })))
  save('bad-key', model, await call({ ...chat(), auth: 'AIza-not-a-real-key-0000000000000000000' }))

  if (burst > 0) {
    const results = await Promise.all(Array.from({ length: burst }, () => call(chat({ max_tokens: 16 }))))
    const limited = results.find((result) => result.response.status === 429)
    const tally = {}
    for (const result of results) tally[result.response.status] = (tally[result.response.status] ?? 0) + 1
    console.log('burst  statuses ' + JSON.stringify(tally))
    save('burst-429', model, limited ?? { note: 'no 429 in this burst', statuses: tally })
  }
}

// Các thăm dò chạy tuần tự để tránh chạm giới hạn tần suất (rate limit) làm sai lệch kết quả thăm dò tham số.
const outcomes = []
for (const probe of PROBES) {
  const result = await call(chat(probe.extra))
  save('probe-' + slug(model) + '-' + probe.name, model, result)
  outcomes.push({ name: probe.name, line: summarize(result) })
}
console.log('\nWhat ' + model + ' did with each parameter:')
for (const outcome of outcomes) console.log('  ' + outcome.name.padEnd(16) + outcome.line)

// Kiểm tra xem khóa API có bị lọt vào tệp không; nếu có, xóa toàn bộ các tệp vừa tạo.
const leaked = written.filter((file) => {
  const text = readFileSync(file, 'utf8')
  return text.includes(key) || text.includes(encodeURIComponent(key))
})
if (leaked.length > 0) {
  for (const file of written) rmSync(file, { force: true })
  console.error('The key was found in ' + leaked.length + ' file(s). Everything this run wrote was deleted.')
  process.exit(2)
}
console.log('\nDone. The key appears in none of the ' + written.length + ' files this run wrote to ' + OUT_DIR)
