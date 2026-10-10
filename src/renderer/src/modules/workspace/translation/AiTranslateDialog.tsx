import type { JSX, RefObject } from 'react'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import { describeRefusals } from '../../../../../shared/translation/refusalMessage'
import type { TranslationPolicy } from '../../../../../shared/contracts/aiTranslateProposals'
import type { TextRecord } from '../../../../../shared/contracts/text'
import { Alert } from '../../../components/ui/Alert'
import { Button } from '../../../components/ui/Button'
import { Radio, RadioGroup } from '../../../components/ui/Checkbox'
import { Dialog } from '../../../components/ui/Dialog'
import { ICON } from '../../../components/ui/icon'
import { ModelSelectionMenu } from '../../ai-connections/public'
import { keyProblem } from '../../ai-connections/public'
import { openConnectionSettings } from '../../ai-connections/public'
import { useParagraphTranslate } from './useParagraphTranslate'

const count = (value: number): string => value.toLocaleString('vi')
const money = (usd?: number): string =>
  usd === undefined
    ? 'chưa biết giá'
    : usd < 0.01
      ? 'dưới $0,01'
      : '$' + usd.toFixed(2).replace('.', ',')

function Figure({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-default py-1.5 last:border-b-0">
      <span className="text-body-xs text-subtle">{label}</span>
      <span className="text-body-xs font-medium tabular-nums">{value}</span>
    </div>
  )
}

interface FlowProps {
  workId: string
  chapterId: string
  onClose(): void
  onOpenSettings(): void
  onWritten(record: TextRecord): void
}

function TranslateFlow({
  workId,
  chapterId,
  onClose,
  onOpenSettings,
  onWritten
}: FlowProps): JSX.Element {
  const run = useParagraphTranslate(workId, chapterId, onWritten)
  const notice = run.notice && (
    <Alert tone="error" onDismiss={run.dismissNotice}>
      {run.notice}
    </Alert>
  )

  if (run.loadingTargets)
    return (
      <p role="status" className="m-0 text-body-xs text-subtle">
        Đang đọc cài đặt kết nối…
      </p>
    )
  if (run.targets.length === 0)
    return (
      <div className="flex flex-col gap-3">
        {notice}
        <p className="m-0 text-body-xs leading-normal text-subtle">
          Chưa có kết nối AI đang bật hoặc kết nối chưa chọn model.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button
            variant="solid"
            onClick={() => {
              onClose()
              onOpenSettings()
            }}
          >
            Mở Cài đặt
          </Button>
        </div>
      </div>
    )

  if (run.stage === 'finished')
    return (
      <div className="flex flex-col gap-3">
        {notice}
        <p className="m-0 text-body-sm">
          {run.cancelled ? 'Đã dừng. ' : ''}
          Đã xử lý <strong>{count(run.progress.processed)}</strong> đoạn, tạo{' '}
          <strong>{count(run.result?.proposed ?? run.progress.proposed)}</strong> đề xuất. Đã áp
          dụng <strong>{count(run.result?.applied ?? 0)}</strong>; cần duyệt{' '}
          <strong>{count(run.result?.needsReview ?? run.progress.proposed)}</strong>.
        </p>
        {(run.result?.needsReview ?? 0) > 0 && (
          <p className="m-0 text-body-xs text-subtle">
            Mở hàng chờ của chương để xem và duyệt từng phần.
          </p>
        )}
        {run.usage && (
          <p className="m-0 text-body-xs text-subtle">
            Nhà cung cấp báo đã dùng {count(run.usage.inputTokens)} token vào và{' '}
            {count(run.usage.outputTokens)} token ra.
          </p>
        )}
        {run.fallbackNotice && (
          <p role="status" className="m-0 text-body-xs text-warning">
            {run.fallbackNotice}
          </p>
        )}
        {run.keyNotice && (
          <p role="status" className="m-0 text-body-xs text-subtle">
            {run.keyNotice}
          </p>
        )}
        {run.contextNotice && (
          <p role="status" className="m-0 text-body-xs leading-normal text-subtle">
            {run.contextNotice}
          </p>
        )}
        {run.budgetNotice && (
          <p role="status" className="m-0 text-body-xs leading-normal text-subtle">
            {run.budgetNotice}
          </p>
        )}
        {run.failure && !(run.failure.kind === 'refused' && run.refusals.length > 0) && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-sm border border-error/40 bg-error/8 px-3 py-2 text-body-xs leading-normal"
          >
            <span className="min-w-0 flex-1">
              {keyProblem(run.failure) && (
                <span className="block font-medium">{keyProblem(run.failure)}</span>
              )}
              {run.failure.message}
            </span>
            {/* A key problem is fixed in its card, as Hermes' "Update API key". */}
            {keyProblem(run.failure) && run.selection && (
              <Button onClick={() => openConnectionSettings(run.selection!.connectionId)}>
                Cập nhật khóa
              </Button>
            )}
          </div>
        )}
        {/* Counted over the whole run, not the last batch: the filter may block segments in several batches. */}
        {run.refusals.length > 0 && (
          <p
            role="alert"
            className="m-0 rounded-sm border border-error/40 bg-error/8 px-3 py-2 text-body-xs leading-normal"
          >
            {describeRefusals(run.refusals.map((item) => item.group))}
          </p>
        )}
        {run.failed.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-sm border border-default bg-surface px-3 py-2">
            <span className="text-body-xs">
              {count(run.failed.length)} đoạn chưa dịch được. Đề xuất đã xong vẫn được giữ.
            </span>
            <span className="ml-auto flex gap-2">
              <Button onClick={() => void run.retryFailed()}>Dịch lại phần lỗi</Button>
              {/* Another model for the rest, only when asked: a chapter does not change voice on its own. */}
              {run.continueTarget && (
                <Button variant="solid" onClick={run.continueWithFallback}>
                  Dịch tiếp bằng {run.continueTarget.label}
                </Button>
              )}
            </span>
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="solid" onClick={onClose}>
            Xong
          </Button>
        </div>
      </div>
    )

  if (run.stage === 'running' || run.stage === 'cancelling') {
    const { processed, proposed, total } = run.progress
    return (
      <div className="flex flex-col gap-3">
        {notice}
        {run.fallbackNotice && (
          <p role="status" className="m-0 text-body-xs text-warning">
            {run.fallbackNotice}
          </p>
        )}
        <div
          role="progressbar"
          aria-label="Tiến độ dịch"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={processed}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-inverted"
            style={{ width: (total ? Math.round((processed / total) * 100) : 0) + '%' }}
          />
        </div>
        <p role="status" className="m-0 text-body-xs text-subtle">
          Đã xử lý {count(processed)} / {count(total)} đoạn · {count(proposed)} đề xuất đã lưu
        </p>
        <div className="flex justify-end">
          <Button disabled={run.stage === 'cancelling'} onClick={run.cancel}>
            {run.stage === 'cancelling' ? 'Đang dừng…' : 'Dừng'}
          </Button>
        </div>
      </div>
    )
  }

  const plan = run.plan
  return (
    <div className="flex flex-col gap-3">
      {notice}
      <div className="flex flex-col gap-1.5">
        <span className="text-body-xs font-semibold">Model dùng để dịch</span>
        <ModelSelectionMenu
          variant="field"
          label="Model dùng để dịch"
          connections={run.connections}
          selected={run.selection}
          onSelect={(selection) => void run.pick(selection)}
          onSelectThinking={(selection, choice) => void run.pick(selection, choice)}
        />
      </div>
      {run.stage === 'planning' && (
        <p role="status" className="m-0 text-body-xs text-subtle">
          Đang tính số đoạn và ước lượng chi phí…
        </p>
      )}
      {plan && (
        <>
          <div className="flex flex-col rounded-sm border border-default bg-surface px-3 py-1">
            <Figure label="Số đoạn sẽ dịch" value={count(plan.paragraphCount)} />
            <Figure label="Số lô sẽ gửi" value={count(plan.batches.length)} />
            <Figure
              label="Token (ước lượng)"
              value={`${count(plan.estimate.inputTokens)} vào · ${count(plan.estimate.outputTokens)} ra`}
            />
            <Figure label="Chi phí (ước lượng)" value={money(plan.estimate.usd)} />
            <Figure
              label="Ngữ cảnh gửi kèm"
              value={`${count(plan.context.glossary)} thuật ngữ · ${count(plan.context.characters)} nhân vật · ${count(plan.context.dyads)} cặp xưng hô`}
            />
          </div>
          <p className="m-0 text-body-xs leading-normal text-subtle">
            Giá tham khảo cập nhật {plan.catalogReadAt}. Lượng dùng thật hiện sau khi dịch.
          </p>
          {plan.hasTranslation && (
            <p
              role="note"
              className="m-0 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2 text-body-xs leading-normal"
            >
              Chương đã có bản dịch. Kết quả vào hàng chờ để đặt vị trí; Mira không tự ghép theo thứ
              tự đoạn.
            </p>
          )}
          <fieldset className="flex min-w-0 flex-col gap-1.5 rounded-sm border border-default px-3 py-2">
            <legend className="px-1 text-body-xs font-semibold">Sau khi dịch</legend>
            <RadioGroup
              aria-label="Sau khi dịch"
              name="translation-policy"
              value={run.policy}
              onValueChange={(value) => run.setPolicy(value as TranslationPolicy)}
            >
              <Radio value="review">Duyệt trước</Radio>
              <Radio value="auto">Áp dụng thẳng khi bản dịch còn trống và không đổi</Radio>
            </RadioGroup>
          </fieldset>
        </>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Hủy bỏ
        </Button>
        {/* One step even when the chapter has a translation: the note above says where the result
          goes, and it only ever lands in the queue, so there is nothing to acknowledge first. */}
        <Button
          variant="solid"
          disabled={plan === null}
          onClick={() => void run.start()}
          leftIcon={<StarsIcon size={ICON.sm} aria-hidden="true" />}
        >
          Dịch {plan ? count(plan.paragraphCount) + ' đoạn' : ''}
        </Button>
      </div>
    </div>
  )
}

export interface AiTranslateDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  workId: string
  chapterId: string
  onOpenSettings(): void
  onWritten(record: TextRecord): void
  finalFocus?: RefObject<HTMLElement | null>
}

export function AiTranslateDialog({
  open,
  onOpenChange,
  workId,
  chapterId,
  onOpenSettings,
  onWritten,
  finalFocus
}: AiTranslateDialogProps): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Dịch bằng AI"
      description="Mira dịch theo đoạn và lưu kết quả vào hàng chờ đề xuất."
      size="lg"
      finalFocus={finalFocus}
    >
      {open && (
        <TranslateFlow
          workId={workId}
          chapterId={chapterId}
          onClose={() => onOpenChange(false)}
          onOpenSettings={onOpenSettings}
          onWritten={onWritten}
        />
      )}
    </Dialog>
  )
}
