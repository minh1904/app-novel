import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConnectionView } from '../../../../shared/aiConnections'
import type {
  HeldSuggestion,
  TranslateFailure,
  TranslatePlan,
  TranslateUsage
} from '../../../../shared/aiTranslate'
import type { TextRecord } from '../../../../shared/text'
import { describe } from '../library/describeError'

/**
 * Dịch cả chương bằng AI, **điều phối từng lô từ đây**.
 *
 * Vòng lặp nằm ở renderer chứ không ở main process, nên ba thứ đúng theo định nghĩa: tiến độ là số
 * câu đã ghi thật, nút Hủy chỉ là "không gửi lô tiếp", và phần đã ghi không bao giờ mất vì mỗi lô
 * đã vào kho ngay khi xong.
 *
 * Hook này sống đúng một lượt: thành phần gọi nó chỉ được dựng khi hộp thoại mở, nên không có
 * đường nào để con số của lượt trước lẫn sang lượt sau.
 */

export type TranslateStage =
  | 'choosing'
  | 'planning'
  | 'ready'
  | 'running'
  | 'cancelling'
  | 'finished'

/** Lỗi khiến chạy tiếp là vô nghĩa: khóa sai, hết mọi khóa, hoặc bản dịch đã đổi ở nơi khác. */
const STOPS_THE_RUN = new Set<TranslateFailure['kind']>([
  'auth',
  'refused',
  'rate_limited',
  'conflict',
  'cancelled'
])

export interface TranslateTarget {
  connectionId: string
  model: string
  label: string
}

export interface AiTranslateController {
  stage: TranslateStage
  /** Các cặp kết nối–model dùng được. Rỗng nghĩa là chưa khai gì ở Cài đặt. */
  targets: TranslateTarget[]
  loadingTargets: boolean
  chosen: string | null
  choose(key: string): void
  plan: TranslatePlan | null
  /** Lỗi của bước lập kế hoạch hoặc của một lời gọi lẻ, đã thành câu đọc được. */
  notice: string | null
  dismissNotice(): void
  /** Số câu đã ghi vào bản dịch trên tổng số câu sẽ gửi. */
  progress: { done: number; total: number }
  held: HeldSuggestion[]
  failed: string[]
  failure: TranslateFailure | null
  /** Lượng token nhà cung cấp báo đã dùng thật, cộng dồn cả lượt. */
  usage: TranslateUsage | null
  /** Câu nói đã chuyển sang khóa khác giữa lượt chạy, khi điều đó xảy ra. */
  keyNotice: string | null
  /** True khi lượt chạy kết thúc vì người dùng bấm Hủy (hay đóng hộp thoại). */
  cancelled: boolean
  start(): Promise<void>
  cancel(): void
  /** Gửi lại đúng các câu lỗi, không gửi lại câu đã xong. */
  retryFailed(): Promise<void>
  /** Lấy bản AI cho một câu người dùng đã sửa, do người dùng tự chọn. */
  acceptHeld(item: HeldSuggestion): Promise<void>
  /** Bỏ một đề xuất: giữ bản của người dùng. */
  keepMine(sourceId: string): void
}

export const targetKey = (connectionId: string, model: string): string => connectionId + '|' + model

/** Mỗi model đã chọn của mỗi kết nối đang bật là một lựa chọn; không có model thì không gọi được. */
function targetsOf(connections: ConnectionView[]): TranslateTarget[] {
  const targets: TranslateTarget[] = []
  for (const connection of connections) {
    if (!connection.enabled) continue
    const models = [
      ...new Set(
        [connection.defaultModel, ...connection.models].filter(
          (model): model is string => typeof model === 'string' && model !== ''
        )
      )
    ]
    for (const model of models) {
      targets.push({ connectionId: connection.id, model, label: connection.name + ' · ' + model })
    }
  }
  return targets
}

interface Planned {
  /** Cặp kết nối–model mà kế hoạch này thuộc về; khác `chosen` nghĩa là đang tính lại. */
  target: string
  plan: TranslatePlan | null
  message: string | null
}

export function useAiTranslate(
  workId: string,
  chapterId: string,
  onWritten: (record: TextRecord) => void
): AiTranslateController {
  const [connections, setConnections] = useState<ConnectionView[] | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [planned, setPlanned] = useState<Planned | null>(null)
  const [running, setRunning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [finished, setFinished] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [done, setDone] = useState(0)
  const [held, setHeld] = useState<HeldSuggestion[]>([])
  const [failed, setFailed] = useState<string[]>([])
  const [failure, setFailure] = useState<TranslateFailure | null>(null)
  const [usage, setUsage] = useState<TranslateUsage | null>(null)
  const [keyNotice, setKeyNotice] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)

  const rev = useRef(0)
  const stop = useRef(false)
  const live = useRef(true)
  const written = useRef(onWritten)
  useEffect(() => {
    written.current = onWritten
  })

  // Hộp thoại đóng giữa lượt thì coi như Hủy: lô đang bay vẫn được ghi, lô sau không gửi nữa.
  useEffect(
    () => () => {
      live.current = false
      stop.current = true
    },
    []
  )

  const targets = useMemo(() => targetsOf(connections ?? []), [connections])
  // Chưa chọn thì cặp đầu tiên là mặc định — suy ra, không đặt bằng effect.
  const chosen =
    picked ?? (targets.length > 0 ? targetKey(targets[0].connectionId, targets[0].model) : null)
  const current = useMemo(
    () => targets.find((target) => targetKey(target.connectionId, target.model) === chosen) ?? null,
    [targets, chosen]
  )

  useEffect(() => {
    void window.mira.ai.list().then((result) => {
      if (!live.current) return
      if (result.ok) setConnections(result.value.connections)
      else {
        setConnections([])
        setNotice(describe(result.error))
      }
    })
  }, [])

  // Ước lượng là thứ người dùng mở hộp thoại để xem, nên tính ngay khi biết cặp kết nối–model.
  useEffect(() => {
    if (!current) return
    const key = targetKey(current.connectionId, current.model)
    void window.mira.ai.translate
      .plan({
        workId,
        chapterId,
        connectionId: current.connectionId,
        model: current.model
      })
      .then((result) => {
        if (!live.current) return
        if (result.ok) rev.current = result.value.targetRev
        setPlanned({
          target: key,
          plan: result.ok ? result.value : null,
          message: result.ok ? null : describe(result.error)
        })
      })
  }, [current, workId, chapterId])

  const settled = planned !== null && planned.target === chosen
  const plan = settled ? planned.plan : null

  let stage: TranslateStage = 'choosing'
  if (running) stage = stopping ? 'cancelling' : 'running'
  else if (finished) stage = 'finished'
  else if (!settled) stage = targets.length === 0 ? 'choosing' : 'planning'
  else if (plan) stage = 'ready'

  /** Chạy một dãy lô liên tiếp, ghi ngay từng lô, dừng khi bị hủy hay gặp lỗi không đi tiếp được. */
  const runBatches = useCallback(
    async (batches: string[][], target: TranslateTarget): Promise<void> => {
      stop.current = false
      setStopping(false)
      setCancelled(false)
      setFailure(null)
      setKeyNotice(null)
      setFinished(false)
      setRunning(true)
      let lastTail: string | null = null
      let spent: TranslateUsage | null = null

      for (const sourceIds of batches) {
        if (stop.current) break
        const result = await window.mira.ai.translate.batch({
          workId,
          chapterId,
          connectionId: target.connectionId,
          model: target.model,
          sourceIds,
          expectedRev: rev.current
        })
        if (!result.ok) {
          setFailure({ kind: 'conflict', message: describe(result.error), recoverAt: null })
          setFailed((ids) => [...new Set([...ids, ...sourceIds])])
          break
        }

        const batch = result.value
        rev.current = batch.targetRev
        setDone((count) => count + batch.written.length)
        if (batch.held.length > 0) setHeld((items) => [...items, ...batch.held])
        if (batch.failed.length > 0) setFailed((ids) => [...new Set([...ids, ...batch.failed])])
        if (batch.usage) {
          // Accumulate into a fresh binding rather than reading `spent` inside its own assignment:
          // the self-reference narrowed it to `never` and broke the typecheck.
          const previous = spent
          const total: TranslateUsage = {
            inputTokens: (previous?.inputTokens ?? 0) + batch.usage.inputTokens,
            outputTokens: (previous?.outputTokens ?? 0) + batch.usage.outputTokens
          }
          spent = total
          setUsage(total)
        }
        if (batch.keyTail !== null) {
          if (lastTail !== null && batch.keyTail !== lastTail) {
            setKeyNotice(
              'Khóa …' + lastTail + ' hết hạn mức, đã chuyển sang khóa …' + batch.keyTail + '.'
            )
          }
          lastTail = batch.keyTail
        }
        if (batch.error) {
          setFailure(batch.error)
          if (STOPS_THE_RUN.has(batch.error.kind)) break
        }
      }

      const halted = stop.current
      // Bản dịch đọc lại từ kho dù lượt chạy kết thúc thế nào: phần đã ghi phải lên màn ngay.
      const latest = await window.mira.text.get(workId, chapterId, 'target')
      if (latest.ok) {
        rev.current = latest.value.rev
        written.current(latest.value)
      }
      if (!live.current) return
      setRunning(false)
      setFinished(true)
      setCancelled(halted)
    },
    [workId, chapterId]
  )

  const start = useCallback(async (): Promise<void> => {
    if (!plan || !current) return
    setDone(0)
    setHeld([])
    setFailed([])
    setUsage(null)
    await runBatches(
      plan.batches.map((batch) => batch.sourceIds),
      current
    )
  }, [plan, current, runBatches])

  const retryFailed = useCallback(async (): Promise<void> => {
    if (!current || failed.length === 0) return
    const again = [...failed]
    setFailed([])
    await runBatches([again], current)
  }, [current, failed, runBatches])

  const acceptHeld = useCallback(
    async (item: HeldSuggestion): Promise<void> => {
      const result = await window.mira.rows.save(
        workId,
        chapterId,
        item.sourceId,
        item.aiText,
        rev.current
      )
      if (!result.ok) {
        setNotice(describe(result.error))
        return
      }
      rev.current = result.value.target.rev
      setHeld((items) => items.filter((entry) => entry.sourceId !== item.sourceId))
      written.current(result.value.target)
    },
    [workId, chapterId]
  )

  return {
    stage,
    targets,
    loadingTargets: connections === null,
    chosen,
    choose: setPicked,
    plan,
    notice: notice ?? (settled ? planned.message : null),
    dismissNotice: () => setNotice(null),
    progress: { done, total: plan?.segmentCount ?? 0 },
    held,
    failed,
    failure,
    usage,
    keyNotice,
    cancelled,
    start,
    cancel: () => {
      // Ref cho vòng lặp đọc ngay, state cho nút đổi sang "Đang dừng…".
      stop.current = true
      setStopping(true)
    },
    retryFailed,
    acceptHeld,
    keepMine: (sourceId) =>
      setHeld((items) => items.filter((entry) => entry.sourceId !== sourceId))
  }
}
