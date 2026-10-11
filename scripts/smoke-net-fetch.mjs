// Kiểm thử thực tế (smoke test): kiểm tra hành vi thực tế của `net.fetch` trong Electron cho tầng AI.
// Chạy bằng `pnpm smoke:net` hoặc `electron scripts/smoke-net-fetch.mjs`.
//
// Ứng dụng truyền `net.fetch` vào tầng provider để các request tuân thủ cấu hình proxy hệ thống.
// Các hành vi cốt lõi cần xác minh:
//   1. Dữ liệu stream trả về từng phần thay vì dồn cục đến cuối (đảm bảo hiển thị bản dịch khi đang stream);
//   2. Hủy signal giữa chừng sẽ ngắt đọc luồng ngay lập tức (phục vụ nút Hủy);
//   3. Request đến máy cục bộ được gửi trực tiếp, không đi qua proxy (mô hình cục bộ, gateway nội bộ);
//   4. Tuân thủ thiết lập proxy mà hàm `fetch` toàn cục của Node bỏ qua.
//
// Mọi bài kiểm tra chạy trên các server nội bộ khởi tạo tại 127.0.0.1; không gửi dữ liệu ra ngoài mạng.
import { app, net, session } from 'electron'
import http from 'node:http'

const results = []

function report(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log((ok ? 'ok    ' : 'FAIL  ') + name.padEnd(46) + detail)
}

/** Máy chủ SSE gửi 3 phần dữ liệu cách nhau 400 ms rồi kết thúc; ghi nhận các thông tin nhận được. */
function startSseServer() {
  const seen = []
  const server = http.createServer((request, response) => {
    seen.push({ url: request.url, authorization: request.headers.authorization ?? null })
    response.writeHead(200, { 'content-type': 'text/event-stream' })
    let sent = 0
    const timer = setInterval(() => {
      sent++
      response.write('data: ' + JSON.stringify({ choices: [{ delta: { content: 'piece' + sent } }] }) + '\n\n')
      if (sent === 3) {
        clearInterval(timer)
        response.end('data: [DONE]\n\n')
      }
    }, 400)
    request.on('close', () => clearInterval(timer))
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, seen, port: server.address().port })))
}

/** Máy chủ đếm số lượng request nhận được và phản hồi để đóng vai trò làm proxy giả lập. */
function startCountingServer(label) {
  const hits = []
  const server = http.createServer((request, response) => {
    hits.push({ label, url: request.url, host: request.headers.host })
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end(label)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, hits, port: server.address().port })))
}

async function streamingArrivesPieceByPiece(port) {
  const started = Date.now()
  const response = await net.fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
    headers: { authorization: 'Bearer SMOKE-KEY' }
  })
  const arrivals = []
  const reader = response.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (new TextDecoder().decode(value).includes('piece')) arrivals.push(Date.now() - started)
  }
  const spread = arrivals.length >= 2 ? arrivals.at(-1) - arrivals[0] : 0
  report(
    '1. a stream arrives piece by piece',
    arrivals.length >= 3 && spread >= 500,
    `${arrivals.length} pieces at ${arrivals.join(', ')} ms (spread ${spread} ms; all-at-once would be ~0)`
  )
}

async function authorizationHeaderArrives(seen) {
  const last = seen.at(-1)
  report('   the Authorization header reaches the server', last?.authorization === 'Bearer SMOKE-KEY', String(last?.authorization))
}

async function abortEndsTheReadPromptly(port) {
  const controller = new AbortController()
  const response = await net.fetch(`http://127.0.0.1:${port}/v1/chat/completions`, { signal: controller.signal })
  const reader = response.body.getReader()
  await reader.read() // phần dữ liệu đầu tiên
  const abortedAt = Date.now()
  controller.abort()
  let outcome = 'the read finished without an error'
  try {
    for (;;) {
      const { done } = await reader.read()
      if (done) break
    }
  } catch (error) {
    outcome = (error?.name ?? 'Error') + ': ' + (error?.message ?? '')
  }
  const took = Date.now() - abortedAt
  // Ngắt nhanh chóng và trả về lỗi: tầng truyền tải chuyển thao tác hủy thành `cancelled`.
  // Khoảng cách giữa các phần là 400 ms, nếu chờ phần tiếp theo sẽ xuất hiện độ trễ tương ứng.
  report('2. aborting mid-stream ends the read', took < 300, `${took} ms after abort; ${outcome}`)
}

async function abortBeforeSendingRejects(port) {
  const controller = new AbortController()
  controller.abort()
  let outcome = 'it went ahead'
  try {
    await net.fetch(`http://127.0.0.1:${port}/`, { signal: controller.signal })
  } catch (error) {
    outcome = (error?.name ?? 'Error') + ''
  }
  report('   an already-aborted signal rejects at once', outcome !== 'it went ahead', outcome)
}

async function loopbackSkipsTheProxy(proxy, target) {
  await session.defaultSession.setProxy({ proxyRules: `http=127.0.0.1:${proxy.port}` })
  const before = proxy.hits.length
  const reached = await net.fetch(`http://127.0.0.1:${target.port}/ping`).then((r) => r.text())
  const viaProxy = proxy.hits.length - before
  report('3. a loopback address goes straight to it', reached === 'target' && viaProxy === 0, `answered "${reached}", proxy saw ${viaProxy} request(s)`)
}

async function followsAProxyWhereNodeFetchDoesNot(proxy) {
  // Tên miền `app.test` không thể phân giải DNS. Nếu request đến được proxy giả lập nghĩa là nó đã đi qua proxy.
  await session.defaultSession.setProxy({ proxyRules: `http=127.0.0.1:${proxy.port}` })
  const before = proxy.hits.length
  let netAnswer = 'no answer'
  try {
    netAnswer = await net.fetch('http://app.test/chat').then((r) => r.text())
  } catch (error) {
    netAnswer = 'error: ' + (error?.message ?? error)
  }
  const netViaProxy = proxy.hits.length - before

  const beforeNode = proxy.hits.length
  let nodeAnswer = 'no answer'
  try {
    nodeAnswer = await fetch('http://app.test/chat', { signal: AbortSignal.timeout(3000) }).then((r) => r.text())
  } catch (error) {
    nodeAnswer = 'error: ' + (error?.cause?.code ?? error?.message ?? error)
  }
  const nodeViaProxy = proxy.hits.length - beforeNode

  report('4. net.fetch follows the proxy setting', netViaProxy === 1 && netAnswer === 'proxy', `${netViaProxy} request(s) through the proxy, answer "${netAnswer}"`)
  report('   Node fetch ignores it (why net.fetch is used)', nodeViaProxy === 0, `${nodeViaProxy} request(s) through the proxy, answer "${nodeAnswer}"`)
}

app.whenReady().then(async () => {
  let code = 0
  const servers = []
  try {
    const sse = await startSseServer()
    const proxy = await startCountingServer('proxy')
    const target = await startCountingServer('target')
    servers.push(sse.server, proxy.server, target.server)

    await session.defaultSession.setProxy({ mode: 'direct' })
    await streamingArrivesPieceByPiece(sse.port)
    await authorizationHeaderArrives(sse.seen)
    await abortEndsTheReadPromptly(sse.port)
    await abortBeforeSendingRejects(sse.port)
    await loopbackSkipsTheProxy(proxy, target)
    await followsAProxyWhereNodeFetchDoesNot(proxy)

    const failed = results.filter((r) => !r.ok)
    console.log(
      failed.length === 0
        ? `\nsmoke ok: electron ${process.versions.electron}, chromium ${process.versions.chrome}, node ${process.versions.node}`
        : `\nsmoke FAILED: ${failed.length} of ${results.length} checks`
    )
    if (failed.length > 0) code = 1
  } catch (error) {
    console.error('smoke crashed:', error)
    code = 1
  } finally {
    for (const server of servers) server.closeAllConnections?.()
    for (const server of servers) server.close()
    app.exit(code)
  }
})
