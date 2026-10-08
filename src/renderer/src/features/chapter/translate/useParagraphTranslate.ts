import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import type {
  SegmentRefusal,
  TranslateFailure,
  TranslateUsage
} from '../../../../../shared/contracts/aiTranslate'
import type {
  ParagraphTranslationPlan,
  TranslationPolicy
} from '../../../../../shared/contracts/aiTranslateProposals'
import type { TextRecord } from '../../../../../shared/contracts/text'
import { useConnectionStore } from '../../../stores/connectionStore'
import { describe } from '../../library/describeError'
import type { ModelSelection } from '../../models/ModelSelectionMenu'
import { thinkingPatch, type ThinkingChoice } from '../../models/modelSettingsForm'
import { continueTargetOf, targetKey, targetsOf, type TranslateTarget } from './translateTargets'
import { tallyBatch } from './translateRun'

type Stage = 'choosing' | 'planning' | 'ready' | 'running' | 'cancelling' | 'finished'

export interface ParagraphTranslateController {
  stage: Stage
  targets: TranslateTarget[]
  connections: ConnectionView[]
  selection: ModelSelection | null
  pick(selection: ModelSelection, choice?: ThinkingChoice): Promise<void>
  loadingTargets: boolean
  plan: ParagraphTranslationPlan | null
  policy: TranslationPolicy
  setPolicy(policy: TranslationPolicy): void
  notice: string | null
  dismissNotice(): void
  progress: { processed: number; proposed: number; total: number }
  failed: string[]
  failure: TranslateFailure | null
  /** Đoạn bộ lọc nội dung chặn trong lượt này, kèm lý do; thử lại cũng vô ích. */
  refusals: SegmentRefusal[]
  usage: TranslateUsage | null
  keyNotice: string | null
  /** The store's context changed after the plan was made; the run kept the context it started with. */
  contextNotice: string | null
  /** The run has used most of its call budget (shown once), or ran out of it. */
  budgetNotice: string | null
  cancelled: boolean
  result: { proposed: number; applied: number; needsReview: number } | null
  start(): Promise<void>
  retryFailed(): Promise<void>
  /**
   * The first fallback model of Settings, offered when the run stopped on a failure another model could get
   * past (main's policy). Continuing translates only the missing paragraphs, in a run and a proposal of its
   * own, so every proposal still has one model (change `hermes-settings-modal`, task 4.6).
   */
  continueTarget: TranslateTarget | null
  continueWithFallback(): void
  /** "Đã chuyển sang Y vì X …" for a run that continued with a fallback. */
  fallbackNotice: string | null
  cancel(): void
}

export function useParagraphTranslate(
  workId: string,
  chapterId: string,
  onWritten: (record: TextRecord) => void
): ParagraphTranslateController {
  const connections = useConnectionStore((s) => s.connections)
  const connectionLoad = useConnectionStore((s) => s.load)
  const [picked, setPicked] = useState<string | null>(null)
  const [plan, setPlan] = useState<ParagraphTranslationPlan | null>(null)
  const [plannedKey, setPlannedKey] = useState<string | null>(null)
  const [policy, setPolicy] = useState<TranslationPolicy>('review')
  const [running, setRunning] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [finished, setFinished] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [done, setDone] = useState(0)
  const [processed, setProcessed] = useState(0)
  const [failed, setFailed] = useState<string[]>([])
  const [failure, setFailure] = useState<TranslateFailure | null>(null)
  const [refusals, setRefusals] = useState<SegmentRefusal[]>([])
  const [usage, setUsage] = useState<TranslateUsage | null>(null)
  const [keyNotice, setKeyNotice] = useState<string | null>(null)
  const [contextNotice, setContextNotice] = useState<string | null>(null)
  const [budgetNotice, setBudgetNotice] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const [result, setResult] = useState<ParagraphTranslateController['result']>(null)
  const [replan, setReplan] = useState(0)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null)
  /** A continued run covers only the paragraphs left over, not the whole new plan. */
  const [scopeTotal, setScopeTotal] = useState<number | null>(null)
  /** Paragraphs a "Dịch tiếp bằng …" carries over to the next plan; consumed when that plan arrives. */
  const pendingContinue = useRef<{ ids: string[]; key: string } | null>(null)
  const continueRun = useRef<((plan: ParagraphTranslationPlan, ids: string[]) => void) | null>(null)
  const stop = useRef(false)
  const live = useRef(true)
  const written = useRef(onWritten)
  const proposedIds = useRef(new Set<string>())
  const processedIds = useRef(new Set<string>())
  useEffect(() => {
    written.current = onWritten
  })
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
      stop.current = true
    }
  }, [])

  const main = useConnectionStore((state) => state.preferences?.main ?? null)
  const targets = useMemo(() => targetsOf(connections ?? [], main), [connections, main])
  const enabledConnections = useMemo(
    () => (connections ?? []).filter((item) => item.enabled),
    [connections]
  )
  const chosen =
    picked ?? (targets[0] ? targetKey(targets[0].connectionId, targets[0].entryId) : null)
  const current = useMemo(
    () => targets.find((item) => targetKey(item.connectionId, item.entryId) === chosen) ?? null,
    [targets, chosen]
  )

  const pick = useCallback(
    async (selection: ModelSelection, choice?: ThinkingChoice): Promise<void> => {
      setPicked(targetKey(selection.connectionId, selection.entryId))
      if (choice === undefined) return
      const outcome = await useConnectionStore.getState().entries.update(selection.entryId, {
        settings: thinkingPatch(choice)
      })
      if (live.current && !outcome.ok) setNotice(outcome.message)
    },
    []
  )

  useEffect(() => {
    if (connectionLoad === 'loading') void useConnectionStore.getState().reload()
  }, [connectionLoad])

  useEffect(() => {
    if (!current) return
    let active = true
    const key = targetKey(current.connectionId, current.entryId)
    void window.mira.ai.translate
      .paragraphPlan({
        workId,
        chapterId,
        connectionId: current.connectionId,
        entryId: current.entryId
      })
      .then((response) => {
        if (!live.current || !active) return
        setPlannedKey(key)
        setPlan(response.ok ? response.value : null)
        if (!response.ok) setNotice(describe(response.error))
        const carried = pendingContinue.current
        if (response.ok && carried && carried.key === key) {
          pendingContinue.current = null
          continueRun.current?.(response.value, carried.ids)
        }
      })
    return () => {
      active = false
    }
  }, [workId, chapterId, current, replan])

  const settled = plannedKey === chosen
  let stage: Stage = 'choosing'
  if (running) stage = stopping ? 'cancelling' : 'running'
  else if (finished) stage = 'finished'
  else if (!settled) stage = targets.length ? 'planning' : 'choosing'
  else if (plan) stage = 'ready'

  const runBatches = useCallback(
    async (
      sourceGroups: string[][],
      activePlan: ParagraphTranslationPlan,
      retry = false
    ): Promise<void> => {
      stop.current = false
      setStopping(false)
      setCancelled(false)
      setFailure(null)
      setKeyNotice(null)
      setContextNotice(null)
      setBudgetNotice(null)
      let warned = false
      setFinished(false)
      setRunning(true)
      let lastTail: string | null = null
      let spent: TranslateUsage | null = null
      let localFailed: string[] = []
      let localRefusals: SegmentRefusal[] = []
      let proposedCount = proposedIds.current.size
      let haltedByError = false
      let nextIndex = 0
      for (; nextIndex < sourceGroups.length; nextIndex++) {
        const sourceIds = sourceGroups[nextIndex]
        if (stop.current) break
        const response = await window.mira.ai.translate.paragraphBatch({
          workId,
          chapterId,
          runId: activePlan.runId,
          connectionId: activePlan.connectionId,
          entryId: activePlan.entryId,
          settingsKey: activePlan.settingsKey,
          sourceRev: activePlan.sourceRev,
          targetRev: activePlan.targetRev,
          targetBaseContent: activePlan.targetBaseContent,
          policy,
          sourceIds,
          ...(retry ? { retry: true } : {})
        })
        if (!response.ok) {
          setFailure({
            kind: 'conflict',
            message: describe(response.error),
            recoverAt: null,
            haltsRun: true
          })
          localFailed = [...new Set([...localFailed, ...sourceIds])]
          if (response.error.code === 'conflict') setReplan((value) => value + 1)
          haltedByError = true
          break
        }
        const batch = response.value
        for (const id of sourceIds) processedIds.current.add(id)
        setProcessed(processedIds.current.size)
        for (const id of batch.proposed) proposedIds.current.add(id)
        proposedCount = proposedIds.current.size
        setDone(proposedCount)
        const tally = tallyBatch(
          { failed: localFailed, refusals: localRefusals, halted: false },
          batch
        )
        localFailed = tally.failed
        if (batch.refusals.length > 0) {
          localRefusals = tally.refusals
          setRefusals(localRefusals)
        }
        if (batch.usage) {
          const previous = spent
          spent = {
            inputTokens: (previous?.inputTokens ?? 0) + batch.usage.inputTokens,
            outputTokens: (previous?.outputTokens ?? 0) + batch.usage.outputTokens
          }
          setUsage(spent)
        }
        // Ngân sách lời gọi của lượt (main giữ): báo một lần khi đã dùng 80%, và khi đã hết.
        if (batch.budgetIds.length > 0) {
          setBudgetNotice(
            `Lượt dịch đã dùng hết ${batch.budget.limit} lời gọi cho phép; ` +
              'các đoạn chưa xong có thể thử lại riêng.'
          )
        } else if (batch.budget.warn && !warned) {
          warned = true
          setBudgetNotice(
            `Lượt dịch đã dùng ${batch.budget.used}/${batch.budget.limit} lời gọi cho phép.`
          )
        }
        if (batch.contextChanged) {
          setContextNotice(
            'Glossary, nhân vật hoặc xưng hô đã đổi sau khi lập kế hoạch. Lượt này vẫn dùng ' +
              'ngữ cảnh lúc bắt đầu; lập kế hoạch lại để áp dụng thay đổi.'
          )
        }
        if (batch.keyTail) {
          if (lastTail && batch.keyTail !== lastTail) {
            setKeyNotice(`Khóa …${lastTail} hết hạn mức, đã chuyển sang khóa …${batch.keyTail}.`)
          }
          lastTail = batch.keyTail
        }
        if (batch.error) setFailure(batch.error)
        // Main decides which failures stop the run (`errorPolicy.ts`): a few segments blocked by the
        // filter do not, so the chapter's other batches still get translated.
        if (tally.halted) {
          haltedByError = true
          break
        }
      }
      if (nextIndex < sourceGroups.length) {
        localFailed = [...new Set([...localFailed, ...sourceGroups.slice(nextIndex).flat()])]
      }
      setFailed(localFailed)
      // A partial run remains durable in the proposal queue. Auto acceptance waits for a complete run.
      if (!stop.current && !haltedByError && localFailed.length === 0) {
        const finalized = await window.mira.ai.translate.paragraphFinalize({
          workId,
          chapterId,
          runId: activePlan.runId,
          policy
        })
        if (finalized.ok) {
          setResult({
            proposed: finalized.value.proposed,
            applied: finalized.value.applied,
            needsReview: finalized.value.needsReview
          })
          if (finalized.value.applied > 0) {
            const latest = await window.mira.text.get(workId, chapterId, 'target')
            if (latest.ok) written.current(latest.value)
          }
        } else setNotice(describe(finalized.error))
      } else {
        setResult({ proposed: proposedCount, applied: 0, needsReview: proposedCount })
      }
      window.dispatchEvent(new Event('mira:proposals-changed'))
      if (!live.current) return
      setRunning(false)
      setFinished(true)
      setCancelled(stop.current)
    },
    [workId, chapterId, policy]
  )

  const start = useCallback(async (): Promise<void> => {
    if (!plan || !current) return
    setScopeTotal(null)
    setFallbackNotice(null)
    proposedIds.current.clear()
    processedIds.current.clear()
    setDone(0)
    setProcessed(0)
    setFailed([])
    setRefusals([])
    setUsage(null)
    setResult(null)
    await runBatches(
      plan.batches.map((batch) => batch.sourceIds),
      plan
    )
  }, [plan, current, runBatches])

  // Continue only the paragraphs the stopped run left, grouped as the new model's plan groups them.
  useEffect(() => {
    continueRun.current = (nextPlan, ids) => {
      const wanted = new Set(ids)
      const groups = nextPlan.batches
        .map((batch) => batch.sourceIds.filter((id) => wanted.has(id)))
        .filter((group) => group.length > 0)
      setScopeTotal(groups.flat().length)
      proposedIds.current.clear()
      processedIds.current.clear()
      setDone(0)
      setProcessed(0)
      setFailed([])
      setRefusals([])
      setUsage(null)
      setResult(null)
      void runBatches(groups, nextPlan)
    }
  })

  const fallbackTargets = useConnectionStore((state) => state.preferences?.fallbacks)
  const continueTarget = continueTargetOf({
    stopped: finished && !running,
    failureAllowsFallback: failure?.fallback === true,
    missing: failed.length,
    fallbacks: fallbackTargets ?? [],
    targets,
    current: chosen
  })

  const continueWithFallback = useCallback((): void => {
    if (!continueTarget || !current || !failure) return
    const key = targetKey(continueTarget.connectionId, continueTarget.entryId)
    pendingContinue.current = { ids: [...failed], key }
    setFallbackNotice(
      'Đã chuyển sang ' +
        continueTarget.label +
        ' cho ' +
        failed.length +
        ' đoạn còn lại vì ' +
        current.label +
        ': ' +
        failure.message
    )
    setFinished(false)
    setPicked(key)
  }, [continueTarget, current, failure, failed])

  const retryFailed = useCallback(async (): Promise<void> => {
    if (!plan || failed.length === 0) return
    const again = [...failed]
    setFailed([])
    // Người dùng bấm thử lại: main cấp thêm một phần ngân sách lời gọi cho lô này.
    await runBatches([again], plan, true)
  }, [plan, failed, runBatches])

  return {
    stage,
    targets,
    connections: enabledConnections,
    selection: current ? { connectionId: current.connectionId, entryId: current.entryId } : null,
    pick,
    loadingTargets: connections === null,
    plan: settled ? plan : null,
    policy,
    setPolicy,
    notice,
    dismissNotice: () => setNotice(null),
    progress: { processed, proposed: done, total: scopeTotal ?? plan?.paragraphCount ?? 0 },
    failed,
    failure,
    refusals,
    usage,
    keyNotice,
    contextNotice,
    budgetNotice,
    cancelled,
    result,
    start,
    retryFailed,
    continueTarget,
    continueWithFallback,
    fallbackNotice,
    cancel: () => {
      stop.current = true
      setStopping(true)
    }
  }
}
