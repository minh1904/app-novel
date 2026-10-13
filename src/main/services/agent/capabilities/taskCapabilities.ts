import * as v from 'valibot'
import { CONTEXT_STRATEGIES, type ContextStrategy } from '../../../../shared/contracts/agentTask'
import { CREATE_TRANSLATION_TASK } from '../policy'
import type { CapabilityDefinition } from '../types'
import { TARGET_PARAM } from './readCapabilities'

/**
 * Creates a durable task that translates a range of a work's chapters. Policy always asks the user
 * first (it costs money); `AgentService` runs the approved call itself, because the task belongs to the
 * task service, not to the turn.
 */
export const createTranslationTaskCapability: CapabilityDefinition<{
  fromChapter: number
  toChapter: number
  contextStrategy: ContextStrategy
}> = {
  name: CREATE_TRANSLATION_TASK,
  description:
    'Tạo tác vụ dịch nền cho một dải chương của tác phẩm (theo số chương). Người dùng phải duyệt trước; ' +
    'tác vụ chạy tiếp sau khi lượt chat kết thúc và được điều khiển ở màn Tác vụ. contextStrategy là ' +
    'lựa chọn của người dùng: "extract_then_review" (trích thuật ngữ rồi chờ duyệt trước khi dịch) hoặc ' +
    '"approved_only" (dịch ngay bằng ngữ cảnh đã duyệt). Nếu người dùng chưa nói, hãy hỏi họ chọn một ' +
    'trong hai trước khi gọi; không tự chọn.',
  kind: 'external',
  // A reversed range has no chapters, which the task service rejects.
  schema: v.object({
    fromChapter: v.pipe(v.number(), v.integer(), v.minValue(1)),
    toChapter: v.pipe(v.number(), v.integer(), v.minValue(1)),
    contextStrategy: v.picklist(CONTEXT_STRATEGIES)
  }),
  parameters: {
    type: 'object',
    properties: {
      target: TARGET_PARAM,
      fromChapter: { type: 'integer', minimum: 1 },
      toChapter: { type: 'integer', minimum: 1 },
      contextStrategy: { type: 'string', enum: [...CONTEXT_STRATEGIES] }
    },
    required: ['target', 'fromChapter', 'toChapter', 'contextStrategy']
  },
  targetPolicy: 'requires_target',
  handler: async () => ({
    ok: false,
    error: { code: 'internal', message: 'Tác vụ chỉ được tạo qua AgentService sau khi duyệt.' }
  }),
  activityAdapter: ({ target, args }) => ({
    label: `Tạo tác vụ dịch chương ${args.fromChapter}–${args.toChapter} của "${target?.workLabel ?? ''}"`,
    kind: 'write'
  })
}
