import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runKakuyomuSmoke, type SmokeFetcher } from './smoke'

const FIXTURES = path.join(import.meta.dirname, 'fixtures')
const workFlatJson = readFileSync(path.join(FIXTURES, 'work-flat.json'), 'utf8')
const episodeHtml = readFileSync(path.join(FIXTURES, 'episode-body.html'), 'utf8')
const episodeLoginHtml = readFileSync(path.join(FIXTURES, 'episode-login.html'), 'utf8')

describe('runKakuyomuSmoke (Task 8.2)', () => {
  it('returns all PASS when endpoints return valid HTML/JSON', async () => {
    const fakeFetcher: SmokeFetcher = async (url) => {
      if (url === 'https://kakuyomu.jp') {
        return { status: 200, body: '<html>Kakuyomu Home</html>' }
      }
      if (url.includes('/works/1234567890/episodes/111000001')) {
        return { status: 200, body: episodeHtml }
      }
      if (url.includes('/works/1234567890')) {
        const pageHtml = `<html><head><script id="__NEXT_DATA__" type="application/json">${workFlatJson}</script></head><body>Works</body></html>`
        return { status: 200, body: pageHtml }
      }
      return { status: 404, body: 'Not found' }
    }

    const report = await runKakuyomuSmoke({
      candidateUrl: 'https://kakuyomu.jp/works/1234567890',
      fetcher: fakeFetcher
    })

    expect(report.results.identify.status).toBe('PASS')
    expect(report.results.reachability.status).toBe('PASS')
    expect(report.results.metadata.status).toBe('PASS')
    expect(report.results.catalog.status).toBe('PASS')
    expect(report.results.chapter.status).toBe('PASS')
    expect(report.overall).toBe('PASS')
  })

  it('returns INCONCLUSIVE when reachability is blocked or rate-limited (HTTP 403/429)', async () => {
    const fakeFetcher: SmokeFetcher = async () => {
      return { status: 403, body: 'Cloudflare block' }
    }

    const report = await runKakuyomuSmoke({
      candidateUrl: 'https://kakuyomu.jp/works/1234567890',
      fetcher: fakeFetcher
    })

    expect(report.results.identify.status).toBe('PASS')
    expect(report.results.reachability.status).toBe('INCONCLUSIVE')
    expect(report.overall).toBe('INCONCLUSIVE')
  })

  it('returns INCONCLUSIVE for chapter when episode requires login', async () => {
    const fakeFetcher: SmokeFetcher = async (url) => {
      if (url === 'https://kakuyomu.jp') return { status: 200, body: 'ok' }
      if (url.includes('/episodes/')) return { status: 200, body: episodeLoginHtml }
      const pageHtml = `<html><head><script id="__NEXT_DATA__" type="application/json">${workFlatJson}</script></head><body></body></html>`
      return { status: 200, body: pageHtml }
    }

    const report = await runKakuyomuSmoke({
      candidateUrl: 'https://kakuyomu.jp/works/1234567890',
      fetcher: fakeFetcher
    })

    expect(report.results.metadata.status).toBe('PASS')
    expect(report.results.catalog.status).toBe('PASS')
    expect(report.results.chapter.status).toBe('INCONCLUSIVE')
    expect(report.overall).toBe('INCONCLUSIVE')
  })

  it('returns FAIL when identify fails or metadata schema is broken', async () => {
    // 1. Invalid identify URL
    const report1 = await runKakuyomuSmoke({
      candidateUrl: 'https://invalid-host.com/works/1234567890',
      fetcher: async () => ({ status: 200, body: 'ok' })
    })
    expect(report1.results.identify.status).toBe('FAIL')
    expect(report1.overall).toBe('FAIL')

    // 2. Broken metadata HTML (no __NEXT_DATA__)
    const fakeFetcher: SmokeFetcher = async (url) => {
      if (url === 'https://kakuyomu.jp') return { status: 200, body: 'ok' }
      return { status: 200, body: '<html>No next data script</html>' }
    }
    const report2 = await runKakuyomuSmoke({
      candidateUrl: 'https://kakuyomu.jp/works/1234567890',
      fetcher: fakeFetcher
    })
    expect(report2.results.identify.status).toBe('PASS')
    expect(report2.results.metadata.status).toBe('FAIL')
    expect(report2.overall).toBe('FAIL')
  })
})
