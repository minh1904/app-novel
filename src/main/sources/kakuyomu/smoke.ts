import { identifyKakuyomu } from './identify'
import { parseKakuyomuWorkPage } from './parser'
import { parseKakuyomuEpisode } from './episodeParser'
import { extractNextDataJson, KAKUYOMU_ORIGIN } from './adapter'
import { NetworkBroker } from '../broker'

export type SmokeStage = 'reachability' | 'identify' | 'metadata' | 'catalog' | 'chapter'
export type SmokeStatus = 'PASS' | 'FAIL' | 'INCONCLUSIVE'

export interface StageResult {
  stage: SmokeStage
  status: SmokeStatus
  message: string
  details?: Record<string, unknown>
}

export interface SmokeReport {
  results: Record<SmokeStage, StageResult>
  overall: SmokeStatus
  durationMs: number
}

export interface SmokeFetcherResponse {
  status: number
  headers?: Record<string, string>
  body: string
}

export type SmokeFetcher = (url: string) => Promise<SmokeFetcherResponse>

export interface SmokeOptions {
  candidateUrl?: string
  fetcher?: SmokeFetcher
}

export async function runKakuyomuSmoke(options: SmokeOptions = {}): Promise<SmokeReport> {
  const started = Date.now()
  const candidateUrl = options.candidateUrl ?? `${KAKUYOMU_ORIGIN}/works/16817330651915444641`

  const fetcher: SmokeFetcher =
    options.fetcher ??
    (() => {
      const broker = new NetworkBroker({
        allowedOrigins: [KAKUYOMU_ORIGIN],
        allowNetwork: true,
        minIntervalMs: 1000,
        maxRedirects: 5,
        maxResponseBytes: 8 * 1024 * 1024,
        requestTimeoutMs: 15_000
      })
      return async (url: string) => {
        const response = await broker.request({ url })
        return {
          status: response.status,
          headers: response.headers,
          body: new TextDecoder('utf-8').decode(response.body)
        }
      }
    })()

  const results: Record<SmokeStage, StageResult> = {
    identify: { stage: 'identify', status: 'INCONCLUSIVE', message: 'Not started' },
    reachability: { stage: 'reachability', status: 'INCONCLUSIVE', message: 'Not started' },
    metadata: { stage: 'metadata', status: 'INCONCLUSIVE', message: 'Not started' },
    catalog: { stage: 'catalog', status: 'INCONCLUSIVE', message: 'Not started' },
    chapter: { stage: 'chapter', status: 'INCONCLUSIVE', message: 'Not started' }
  }

  // 1. Identify stage (pure local, no network)
  const identity = identifyKakuyomu(candidateUrl)
  if (!identity) {
    results.identify = {
      stage: 'identify',
      status: 'FAIL',
      message: `URL không thể nhận diện theo canonical Kakuyomu: ${candidateUrl}`
    }
  } else {
    results.identify = {
      stage: 'identify',
      status: 'PASS',
      message: `Nhận diện canonical work ${identity.remoteWorkId}`,
      details: {
        remoteWorkId: identity.remoteWorkId,
        canonicalUrl: identity.canonicalUrl,
        inputRemoteChapterId: identity.inputRemoteChapterId
      }
    }
  }

  // 2. Reachability stage
  try {
    const reachRes = await fetcher(KAKUYOMU_ORIGIN)
    if (reachRes.status === 200) {
      results.reachability = {
        stage: 'reachability',
        status: 'PASS',
        message: `Kết nối thành công tới ${KAKUYOMU_ORIGIN} (HTTP 200)`
      }
    } else if ([403, 429, 502, 503, 504].includes(reachRes.status)) {
      results.reachability = {
        stage: 'reachability',
        status: 'INCONCLUSIVE',
        message: `Không thể kết luận do chặn/rate-limit (HTTP ${reachRes.status})`
      }
    } else {
      results.reachability = {
        stage: 'reachability',
        status: 'FAIL',
        message: `Phản hồi bất thường từ ${KAKUYOMU_ORIGIN} (HTTP ${reachRes.status})`
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    results.reachability = {
      stage: 'reachability',
      status: 'INCONCLUSIVE',
      message: `Không kết nối được tới mạng: ${msg}`
    }
  }

  // If identify failed or reachability is not PASS, stop here
  if (results.identify.status !== 'PASS' || results.reachability.status !== 'PASS') {
    return makeReport(results, started)
  }

  const workId = identity!.remoteWorkId
  const workUrl = `${KAKUYOMU_ORIGIN}/works/${workId}`

  // 3. Metadata stage
  let workHtml = ''
  try {
    const res = await fetcher(workUrl)
    if (res.status === 200) {
      workHtml = res.body
      const json = extractNextDataJson(workHtml)
      if (!json) {
        results.metadata = {
          stage: 'metadata',
          status: 'FAIL',
          message: 'Không tìm thấy __NEXT_DATA__ trên trang tác phẩm'
        }
      } else {
        const parsed = parseKakuyomuWorkPage(json, workId)
        if (!parsed.complete) {
          results.metadata = {
            stage: 'metadata',
            status: 'FAIL',
            message: `Lỗi phân tích work: ${parsed.invalidReason}`
          }
        } else {
          results.metadata = {
            stage: 'metadata',
            status: 'PASS',
            message: `Đọc metadata thành công: "${parsed.workMeta.title}"`,
            details: { title: parsed.workMeta.title, author: parsed.workMeta.author }
          }

          // 4. Catalog stage
          if (parsed.items.length === 0) {
            results.catalog = {
              stage: 'catalog',
              status: 'INCONCLUSIVE',
              message: 'Danh mục tác phẩm rỗng hoặc không có chương công khai'
            }
          } else {
            results.catalog = {
              stage: 'catalog',
              status: 'PASS',
              message: `Đọc danh mục thành công (${parsed.items.length} chương)`,
              details: { itemCount: parsed.items.length }
            }

            // 5. Chapter stage (do not store chapter body, only verify reader structure)
            const firstEpId = identity!.inputRemoteChapterId ?? parsed.items[0].remoteChapterId
            const epUrl = `${KAKUYOMU_ORIGIN}/works/${workId}/episodes/${firstEpId}`
            try {
              const epRes = await fetcher(epUrl)
              if (epRes.status === 200) {
                const epResult = parseKakuyomuEpisode(epRes.body)
                if (epResult.access === 'login_required') {
                  results.chapter = {
                    stage: 'chapter',
                    status: 'INCONCLUSIVE',
                    message: 'Chương yêu cầu đăng nhập'
                  }
                } else if (epResult.access === 'parser_broken') {
                  results.chapter = {
                    stage: 'chapter',
                    status: 'FAIL',
                    message: 'Cấu trúc DOM chương không khớp (parser_broken)'
                  }
                } else {
                  results.chapter = {
                    stage: 'chapter',
                    status: 'PASS',
                    message: `Phân tích chương thành công (hash: ${epResult.contentHash.slice(0, 8)}…)`,
                    details: {
                      contentHash: epResult.contentHash,
                      normalizationVersion: epResult.normalizationVersion
                    }
                  }
                }
              } else if ([403, 429].includes(epRes.status)) {
                results.chapter = {
                  stage: 'chapter',
                  status: 'INCONCLUSIVE',
                  message: `Chương bị chặn (HTTP ${epRes.status})`
                }
              } else {
                results.chapter = {
                  stage: 'chapter',
                  status: 'FAIL',
                  message: `Lỗi tải chương (HTTP ${epRes.status})`
                }
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              results.chapter = {
                stage: 'chapter',
                status: 'INCONCLUSIVE',
                message: `Lỗi mạng khi tải chương: ${msg}`
              }
            }
          }
        }
      }
    } else if ([403, 429].includes(res.status)) {
      results.metadata = {
        stage: 'metadata',
        status: 'INCONCLUSIVE',
        message: `Trang tác phẩm bị chặn (HTTP ${res.status})`
      }
    } else {
      results.metadata = {
        stage: 'metadata',
        status: 'FAIL',
        message: `HTTP lỗi khi tải tác phẩm: ${res.status}`
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    results.metadata = {
      stage: 'metadata',
      status: 'INCONCLUSIVE',
      message: `Lỗi mạng khi tải metadata: ${msg}`
    }
  }

  return makeReport(results, started)
}

function makeReport(results: Record<SmokeStage, StageResult>, started: number): SmokeReport {
  const statuses = Object.values(results).map((r) => r.status)
  let overall: SmokeStatus = 'PASS'
  if (statuses.includes('FAIL')) {
    overall = 'FAIL'
  } else if (statuses.includes('INCONCLUSIVE')) {
    overall = 'INCONCLUSIVE'
  }

  return {
    results,
    overall,
    durationMs: Date.now() - started
  }
}
