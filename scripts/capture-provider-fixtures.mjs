// Captures what Gemini's OpenAI-compatible endpoint really answers, so the provider layer is tested
// against recorded shapes instead of shapes read out of documentation.
//
//   GEMINI_API_KEY=...   node scripts/capture-provider-fixtures.mjs
//   node scripts/capture-provider-fixtures.mjs --dry-run      print the plan, make no request
//   ... --burst 20       also fire 20 requests at once to provoke a 429 (spends free-tier quota)
//   ... --model NAME     probe this model only (see below)
//
// Two kinds of scenario:
//
//   baseline  questions about the endpoint itself (shape of an answer, where usage arrives, what a bad
//             key looks like). They are written under fixed names that the provider tests replay, so they
//             run only when no --model is given, against the first "flash" model the API lists. Running
//             them for another model would overwrite the recordings those tests are built on.
//
//   probe     questions about one model: which reasoning levels it accepts, and whether it takes a
//             temperature or a top_p (change `ai-model-settings`, design D4). They are written as
//             `probe-<model>-<scenario>.json`, so a run for each model sits side by side, and they run
//             for every model, with or without --model. Use them to check what the catalog says a model
//             supports (`modelCapability`) against what the provider really does:
//               node scripts/capture-provider-fixtures.mjs --model gemini-2.5-pro
//
// The key is read from the environment and never written anywhere: every request, response and file
// name is scrubbed, and the script re-reads the files it wrote and deletes them if the key is still
// found (only those: files from an earlier run are not its to remove).
// Do not put the key on a command line that gets pasted into a chat.
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

/** Each scenario answers one question the design left open (see design.md, Open Questions). */
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
 * What a model is asked, one parameter at a time, so a rejection can be pinned on the parameter that
 * caused it. `effort-invalid` is not a level any model has: it records how a refusal reads, which is what
 * the "Kiểm tra" button will show a person who picked a level the model does not take.
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

/** A model id as a file name part: `gemini-2.5-pro` stays readable, a path-like id loses its slashes. */
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

/** Removes the key, its URL-encoded form and any Bearer token from text that is about to be saved. */
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
  // Read as raw text: an SSE body must be kept byte for byte, and an error body may not be JSON.
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

/** Files this run wrote: the leak check below looks at these and at nothing else. */
const written = []

function save(name, model, result) {
  const file = join(OUT_DIR, name + '.json')
  const record = { scenario: name, capturedAt: new Date().toISOString(), model, ...result }
  writeFileSync(file, scrub(JSON.stringify(record, null, 2)) + '\n', 'utf8')
  written.push(file)
  const status = result.response?.status ?? 'n/a'
  console.log('saved  ' + name.padEnd(36) + 'HTTP ' + status)
}

/** One line a person can read and paste: what the model answered, or the first words of why it refused. */
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
// Needed only to pick a model. Saved as a recording only in baseline mode: a probe run must leave the
// baseline files alone.
const modelsResult = model === undefined ? await call({ path: '/models' }) : undefined
if (modelsResult !== undefined) {
  save('models', '(not chosen yet)', modelsResult)
  try {
    const ids = (JSON.parse(modelsResult.response.bodyText).data ?? []).map((entry) =>
      String(entry.id).replace(/^models\//, '')
    )
    model = ids.find((id) => /flash/i.test(id) && !/image|tts|live|audio/i.test(id)) ?? ids[0]
  } catch {
    // fall through to the check below
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

// Probes run one after another, not together: a refusal should be the parameter's, never a rate limit
// that the model's own earlier probes caused.
const outcomes = []
for (const probe of PROBES) {
  const result = await call(chat(probe.extra))
  save('probe-' + slug(model) + '-' + probe.name, model, result)
  outcomes.push({ name: probe.name, line: summarize(result) })
}
console.log('\nWhat ' + model + ' did with each parameter:')
for (const outcome of outcomes) console.log('  ' + outcome.name.padEnd(16) + outcome.line)

// Prove the key did not land in any file. If it did, delete what this run wrote rather than leave it on disk.
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
