import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { identifyKakuyomu } from './identify'
import { parseKakuyomuWorkPage } from './parser'
import { parseKakuyomuEpisode } from './episodeParser'

const FIXTURES = path.join(import.meta.dirname, 'fixtures')

describe('identifyKakuyomu', () => {
  it('identifies work URL', () => {
    const r = identifyKakuyomu('https://kakuyomu.jp/works/1234567890')
    expect(r).toEqual({
      remoteWorkId: '1234567890',
      canonicalUrl: 'https://kakuyomu.jp/works/1234567890',
      inputRemoteChapterId: undefined
    })
  })

  it('identifies episode URL and retains episode ID', () => {
    const r = identifyKakuyomu('https://kakuyomu.jp/works/1234567890/episodes/9876543210')
    expect(r).not.toBeNull()
    expect(r!.remoteWorkId).toBe('1234567890')
    expect(r!.inputRemoteChapterId).toBe('9876543210')
    expect(r!.canonicalUrl).toBe('https://kakuyomu.jp/works/1234567890')
  })

  it('rejects HTTP protocol', () =>
    expect(identifyKakuyomu('http://kakuyomu.jp/works/1234567890')).toBeNull())
  it('rejects subdomain', () =>
    expect(identifyKakuyomu('https://www.kakuyomu.jp/works/1234567890')).toBeNull())
  it('rejects non-default port', () =>
    expect(identifyKakuyomu('https://kakuyomu.jp:8443/works/1234567890')).toBeNull())
  it('rejects credentials', () =>
    expect(identifyKakuyomu('https://user:pass@kakuyomu.jp/works/1234567890')).toBeNull())
  it('rejects leading-zero ID', () =>
    expect(identifyKakuyomu('https://kakuyomu.jp/works/01234')).toBeNull())
  it('rejects non-numeric ID', () =>
    expect(identifyKakuyomu('https://kakuyomu.jp/works/abc')).toBeNull())
  it('rejects unrelated URL', () =>
    expect(identifyKakuyomu('https://example.com/works/1234567890')).toBeNull())
  it('rejects malformed URL', () => expect(identifyKakuyomu('not-a-url')).toBeNull())
  it('rejects unknown path shape', () =>
    expect(identifyKakuyomu('https://kakuyomu.jp/stories/1234567890')).toBeNull())
  it('strips trailing slash from work URL', () => {
    const r = identifyKakuyomu('https://kakuyomu.jp/works/1234567890/')
    expect(r?.remoteWorkId).toBe('1234567890')
  })
})

describe('parseKakuyomuWorkPage – flat catalog', () => {
  const json = readFileSync(path.join(FIXTURES, 'work-flat.json'), 'utf8')

  it('parses title, author and episodes in order', () => {
    const r = parseKakuyomuWorkPage(json, '1234567890')
    expect(r.complete).toBe(true)
    expect(r.workMeta.title).toBe('テスト作品')
    expect(r.workMeta.author).toBe('テスト著者')
    expect(r.items).toHaveLength(2)
    expect(r.items[0].remoteChapterId).toBe('111000001')
    expect(r.items[1].remoteChapterId).toBe('111000002')
    expect(r.items[0].identityConfidence).toBe('stable')
  })
})

describe('parseKakuyomuWorkPage – sectioned catalog', () => {
  const json = readFileSync(path.join(FIXTURES, 'work-sectioned.json'), 'utf8')

  it('parses grouped chapters in traversal order', () => {
    const r = parseKakuyomuWorkPage(json, '9999999999')
    expect(r.complete).toBe(true)
    expect(r.items.map((i) => i.remoteChapterId)).toEqual(['222000001', '222000002', '222000003'])
  })
})

describe('parseKakuyomuWorkPage – malformed', () => {
  it('fails closed on ID mismatch', () => {
    const json = readFileSync(path.join(FIXTURES, 'work-malformed.json'), 'utf8')
    const r = parseKakuyomuWorkPage(json, '1234567890')
    expect(r.complete).toBe(false)
    expect(r.items).toHaveLength(0)
  })

  it('fails closed on invalid JSON', () => {
    const r = parseKakuyomuWorkPage('not json', '1234567890')
    expect(r.complete).toBe(false)
  })

  it('fails closed on missing work entity', () => {
    const r = parseKakuyomuWorkPage(
      JSON.stringify({ props: { pageProps: { __APOLLO_STATE__: {} } } }),
      '1234567890'
    )
    expect(r.complete).toBe(false)
  })
})

describe('parseKakuyomuEpisode', () => {
  it('extracts paragraphs, preserves kanji (drops ruby reading), normalizes br', () => {
    const html = readFileSync(path.join(FIXTURES, 'episode-body.html'), 'utf8')
    const r = parseKakuyomuEpisode(html)
    expect(r.access).toBe('public')
    expect(r.text).toContain('漢字')
    // ruby reading 'かんじ' should not appear in text
    expect(r.text).not.toContain('かんじ')
    expect(r.text).toContain('改行後の続き')
    // contentHash is a 64-char hex
    expect(r.contentHash).toMatch(/^[a-f0-9]{64}$/)
    expect(r.normalizationVersion).toBe(1)
  })

  it('returns same hash for identical content', () => {
    const html = readFileSync(path.join(FIXTURES, 'episode-body.html'), 'utf8')
    const r1 = parseKakuyomuEpisode(html)
    const r2 = parseKakuyomuEpisode(html)
    expect(r1.contentHash).toBe(r2.contentHash)
  })

  it('returns login_required for login page', () => {
    const html = readFileSync(path.join(FIXTURES, 'episode-login.html'), 'utf8')
    const r = parseKakuyomuEpisode(html)
    expect(r.access).toBe('login_required')
  })

  it('returns parser_broken for missing body structure', () => {
    const r = parseKakuyomuEpisode('<html><body><p>no widget body</p></body></html>')
    expect(r.access).toBe('parser_broken')
  })
})
