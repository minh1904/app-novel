// Smoke test: what Electron's `net.fetch` actually does that the AI layer relies on (design D13 of
// change `ai-gateway`). Run with `pnpm smoke:net` or `electron scripts/smoke-net-fetch.mjs`.
//
// The app hands `net.fetch` to the provider layer so that requests follow the system proxy. Three things
// were assumed and never run:
//   1. a streamed body arrives piece by piece, not all at the end (chat shows text as it comes);
//   2. aborting the signal mid-stream ends the read promptly (the Cancel button);
//   3. a request to this machine goes straight to it, not through a proxy (Ollama, LM Studio, a gateway);
// plus the reason for using it at all:
//   4. it follows a proxy that the global `fetch` of Node ignores.
//
// Everything runs against servers started here on 127.0.0.1; nothing leaves the machine.
import { app, net, session } from 'electron'
import http from 'node:http'

const results = []

function report(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log((ok ? 'ok    ' : 'FAIL  ') + name.padEnd(46) + detail)
}

/** An SSE server that sends three pieces 400 ms apart, then ends. Records what it was sent. */
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

/** A server that counts the requests it gets and answers each one, to stand in as a "proxy". */
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
  await reader.read() // the first piece
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
  // Quick, and as an error rather than a quiet end: the transport turns an abort into `cancelled`, and
  // it only can if the read actually fails or stops. 400 ms is the gap between pieces, so waiting for the
  // next piece would show up as a delay of that size.
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
  // `app.test` does not resolve. If the request reaches our fake proxy, it was sent through it.
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
