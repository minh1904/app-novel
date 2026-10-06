import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LibraryStore } from '../library/library'
import { createServices } from '../createServices'
import type { SecretCrypto } from '../../infra/storage/secretStore'
import { normalizeRaw } from '../../../shared/algorithms/rawText'
import { segment } from '../../../shared/algorithms/segmenter'
import { extractParagraphs } from '../../../shared/algorithms/fixtureCheck'
import { alignParagraphs } from '../../../shared/algorithms/paragraphAlign'
import {
  checkStructure,
  checkResidualSourceChars
} from '../../../shared/algorithms/translationChecks'

const crypto: SecretCrypto = {
  isEncryptionAvailable: () => true,
  async encrypt(plain) {
    return new Uint8Array([...Buffer.from(plain, 'utf-8')].map((b) => b ^ 0xff))
  },
  async decrypt(cipher) {
    return {
      value: Buffer.from([...cipher].map((b) => b ^ 0xff)).toString('utf-8'),
      shouldReEncrypt: false
    }
  }
}

describe('Lõi dịch — Runner kiểm thử với mock provider offline', () => {
  it('chạy trọn vẹn pipeline dịch của runner bằng mock và xác thực qua T0', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'mira-mock-runner-'))
    const library = LibraryStore.open({ dataDir })

    try {
      // Mock fetch trả về bản dịch theo đúng cấu trúc phản hồi OpenAI-compatible của app
      const mockFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string) as {
          messages: Array<{ role: string; content: string }>
        }
        const userMsg = body.messages.find((m) => m.role === 'user')?.content ?? '[]'
        const sourceBlock = /<source>\n([\s\S]*?)\n<\/source>/.exec(userMsg)?.[1] ?? userMsg
        const inputSegments = JSON.parse(sourceBlock) as Array<{ id: string; src: string }>
        const items = inputSegments.map((s) => ({
          id: s.id,
          dst: s.src.includes('第一段')
            ? 'Đây là đoạn nội dung tiếng Trung đầu tiên, dùng để kiểm tra pipeline dịch thuật.'
            : 'Đây là đoạn văn bản kiểm thử thứ hai, dùng để xác nhận căn chỉnh và đối soát.'
        }))

        const responsePayload = {
          id: 'chatcmpl-mock-123',
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify(items)
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 42,
            completion_tokens: 38,
            total_tokens: 80
          }
        }

        return new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }) as typeof fetch

      const services = createServices({ library, crypto, fetch: mockFetch })
      const connection = services.connections.create({
        name: 'Mock Bench',
        baseUrl: 'https://mock.bench.local/v1',
        providerId: 'google'
      })
      await services.connections.addApiKey(connection.id, 'mock-key-123')
      const entryId = services.connections.addModels(connection.id, [
        { model: 'mock-flash', name: 'bench' }
      ]).models[0]!.id

      // 1. Tạo tác phẩm và chương
      const workRecord = library.create({
        title: 'Truyện Thử Nghiệm Mock',
        sourceLang: 'zh-Hans'
      })
      const { chapter: chapterRecord } = library.createChapter(workRecord.id, 'Chương 1')

      const sourceText =
        '这是第一段中文测试内容，用于验证翻译管线。\n\n这是第二段测试文本，用于确认段落对齐与检查。'
      const normalized = normalizeRaw(sourceText).text
      const raw = segment(normalized, 'zh-Hans')
      library.saveText(workRecord.id, chapterRecord.id, 'source', normalized, 0, raw)

      // 2. Lập kế hoạch (plan)
      const plan = services.translator.plan({
        workId: workRecord.id,
        chapterId: chapterRecord.id,
        connectionId: connection.id,
        entryId
      })

      expect(plan.segmentCount).toBe(raw.length)
      expect(plan.batches.length).toBeGreaterThan(0)
      expect(plan.protectedCount).toBe(0)

      // 3. Thực thi từng lô (runBatch)
      let currentRev = plan.targetRev
      let totalInputTokens = 0
      let totalOutputTokens = 0

      for (const batch of plan.batches) {
        const result = await services.translator.runBatch({
          workId: workRecord.id,
          chapterId: chapterRecord.id,
          connectionId: connection.id,
          entryId,
          settingsKey: plan.settingsKey,
          sourceIds: batch.sourceIds,
          expectedRev: currentRev
        })

        expect(result.error).toBeNull()
        expect(result.failed).toHaveLength(0)
        expect(result.written.length).toBe(batch.sourceIds.length)

        currentRev = result.targetRev
        if (result.usage) {
          totalInputTokens += result.usage.inputTokens
          totalOutputTokens += result.usage.outputTokens
        }
      }

      expect(totalInputTokens).toBeGreaterThan(0)
      expect(totalOutputTokens).toBeGreaterThan(0)

      // 4. Kiểm tra văn bản dịch đã được lưu vào kho
      const targetText = library.readText(workRecord.id, chapterRecord.id, 'target')
      expect(targetText.content).toContain('Đây là đoạn nội dung tiếng Trung đầu tiên')

      // 5. Kiểm tra T0 trên văn bản dịch của mock
      const srcParas = extractParagraphs(sourceText)
      const tgtParas = extractParagraphs(targetText.content)
      const beads = alignParagraphs(srcParas, tgtParas, { sourceLang: 'zh-Hans' })
      const structure = checkStructure(srcParas.length, tgtParas.length, beads)
      const residual = checkResidualSourceChars(srcParas, tgtParas, beads)

      expect(structure.isPerfectMatch).toBe(true)
      expect(residual.length).toBe(0)
    } finally {
      library.close()
      rmSync(dataDir, { recursive: true, force: true })
    }
  })
})
