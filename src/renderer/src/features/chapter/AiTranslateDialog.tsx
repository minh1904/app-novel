import { useState, type JSX, type RefObject } from 'react'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import type { HeldSuggestion } from '../../../../shared/contracts/aiTranslate'
import type { TextRecord } from '../../../../shared/contracts/text'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Select } from '../../components/Select'
import { targetKey, useAiTranslate } from './useAiTranslate'

/**
 * Hộp thoại "Dịch bằng AI" cho một chương.
 *
 * Trình tự cố định: nói trước sẽ tốn gì → chạy có tiến độ và hủy được → nói đã ghi bao nhiêu, phần
 * nào lỗi, phần nào chỉ là đề xuất. Không có nhánh nào ghi đè câu người dùng đã viết: những câu đó
 * quay về đây dưới dạng hai bản cạnh nhau để người dùng tự chọn.
 */

const count = (value: number): string => value.toLocaleString('vi')

function money(usd: number | undefined): string {
  if (usd === undefined) return 'chưa biết giá'
  if (usd < 0.01) return 'dưới $0,01'
  return '$' + usd.toFixed(2).replace('.', ',')
}

/** Một dòng "nhãn — giá trị" của bảng ước lượng. */
function Figure({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
      <span className="text-[12px] text-ink-muted">{label}</span>
      <span className="text-[12px] font-medium tabular-nums">{value}</span>
    </div>
  )
}

function Progress({ done, total }: { done: number; total: number }): JSX.Element {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Tiến độ dịch"
        className="h-1.5 overflow-hidden rounded-full bg-control"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: percent + '%' }}
        />
      </div>
      <p role="status" className="m-0 text-[12px] text-ink-muted">
        Đã ghi {count(done)} / {count(total)} câu
      </p>
    </div>
  )
}

/** Hai bản cạnh nhau cho một câu người dùng đã sửa. */
function Comparison({
  item,
  onTakeAi,
  onKeepMine
}: {
  item: HeldSuggestion
  onTakeAi(): void
  onKeepMine(): void
}): JSX.Element {
  return (
    <li className="flex flex-col gap-2 rounded-control border border-line bg-canvas p-2.5">
      <p className="m-0 text-[12px] leading-[1.55] text-ink-muted">{item.sourceText}</p>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-[0.02em] text-ink-muted uppercase">
            Bản của bạn
          </span>
          <p className="m-0 text-[12px] leading-[1.55]">{item.userText}</p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-[0.02em] text-ink-muted uppercase">
            AI đề xuất
          </span>
          <p className="m-0 text-[12px] leading-[1.55]">{item.aiText}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onTakeAi}>
          Dùng bản AI
        </Button>
        <Button variant="ghost-muted" size="sm" onClick={onKeepMine}>
          Giữ bản của tôi
        </Button>
      </div>
    </li>
  )
}

interface FlowProps {
  workId: string
  chapterId: string
  onClose(): void
  onOpenSettings(): void
  onWritten(record: TextRecord): void
}

/**
 * Ruột của hộp thoại. Chỉ được dựng khi hộp thoại mở, nên mỗi lần mở là một lượt sạch và không cần
 * một effect nào để dọn con số của lượt trước.
 */
function TranslateFlow({
  workId,
  chapterId,
  onClose,
  onOpenSettings,
  onWritten
}: FlowProps): JSX.Element {
  const run = useAiTranslate(workId, chapterId, onWritten)
  const [confirmedRedo, setConfirmedRedo] = useState(false)
  const running = run.stage === 'running' || run.stage === 'cancelling'

  const notice = run.notice && (
    <Banner tone="error" onDismiss={run.dismissNotice}>
      {run.notice}
    </Banner>
  )

  if (run.loadingTargets) {
    return (
      <p role="status" className="m-0 text-[12px] text-ink-muted">
        Đang đọc cài đặt kết nối…
      </p>
    )
  }

  // Chưa khai kết nối: nói vì sao chưa dùng được và dẫn thẳng tới nơi khai, không chỉ làm mờ nút.
  if (run.targets.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {notice}
        <p className="m-0 text-[12px] leading-[1.6] text-ink-muted">
          Chưa có kết nối AI nào đang bật, hoặc kết nối đang bật chưa chọn model nào. Khai một
          endpoint tương thích OpenAI — gateway bạn tự dựng, hoặc API key của Google — rồi chọn model
          trong màn Cài đặt.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost-muted" onClick={onClose}>
            Đóng
          </Button>
          <Button
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
  }

  if (run.stage === 'finished') {
    return (
      <div className="flex flex-col gap-3">
        {notice}
        <p className="m-0 text-[12.5px]">
          {run.cancelled ? 'Đã hủy. ' : ''}
          Đã ghi <strong>{count(run.progress.done)}</strong> câu vào bản dịch
          {run.held.length > 0 && ', giữ nguyên ' + count(run.held.length) + ' câu bạn đã sửa'}.
        </p>

        {run.usage && (
          <p className="m-0 text-[12px] text-ink-muted">
            Nhà cung cấp báo đã dùng thật {count(run.usage.inputTokens)} token vào và{' '}
            {count(run.usage.outputTokens)} token ra.
          </p>
        )}

        {run.keyNotice && (
          <p role="status" className="m-0 text-[12px] text-ink-muted">
            {run.keyNotice}
          </p>
        )}

        {run.failure && (
          <p
            role="alert"
            className="m-0 rounded-control border border-error/40 bg-error/8 px-3 py-2 text-[12px] leading-[1.55]"
          >
            {run.failure.message}
            {run.failure.recoverAt !== null &&
              ' Sớm nhất có thể chạy lại: ' +
                new Date(run.failure.recoverAt).toLocaleTimeString('vi-VN') +
                '.'}
          </p>
        )}

        {run.failed.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2">
            <span className="text-[12px]">
              {count(run.failed.length)} câu chưa dịch được. Phần đã xong vẫn được giữ.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => void run.retryFailed()}
            >
              Dịch lại phần lỗi
            </Button>
          </div>
        )}

        {run.held.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-[12px] font-semibold">
              {count(run.held.length)} câu bạn đã sửa — AI chỉ đề xuất
            </p>
            <ul className="m-0 flex max-h-[320px] list-none flex-col gap-2 overflow-y-auto p-0">
              {run.held.map((item) => (
                <Comparison
                  key={item.sourceId}
                  item={item}
                  onTakeAi={() => void run.acceptHeld(item)}
                  onKeepMine={() => run.keepMine(item.sourceId)}
                />
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose}>Xong</Button>
        </div>
      </div>
    )
  }

  if (running) {
    return (
      <div className="flex flex-col gap-3">
        {notice}
        <Progress done={run.progress.done} total={run.progress.total} />
        {run.keyNotice && (
          <p role="status" className="m-0 text-[12px] text-ink-muted">
            {run.keyNotice}
          </p>
        )}
        <div className="flex justify-end">
          <Button variant="outline" disabled={run.stage === 'cancelling'} onClick={run.cancel}>
            {run.stage === 'cancelling' ? 'Đang dừng…' : 'Hủy'}
          </Button>
        </div>
      </div>
    )
  }

  const plan = run.plan
  const needsRedoConfirm = plan?.hasTranslation === true && !confirmedRedo

  return (
    <div className="flex flex-col gap-3">
      {notice}
      <Select
        label="Kết nối và model"
        value={run.chosen ?? ''}
        options={run.targets.map((target) => ({
          value: targetKey(target.connectionId, target.model),
          label: target.label
        }))}
        onChange={(value) => {
          setConfirmedRedo(false)
          run.choose(value)
        }}
      />

      {run.stage === 'planning' && (
        <p role="status" className="m-0 text-[12px] text-ink-muted">
          Đang tính số câu và ước lượng chi phí…
        </p>
      )}

      {plan && (
        <>
          <div className="flex flex-col rounded-control border border-line bg-canvas px-3 py-1">
            <Figure label="Số câu sẽ dịch" value={count(plan.segmentCount)} />
            <Figure label="Số lô sẽ gửi" value={count(plan.batches.length)} />
            <Figure
              label="Token (ước lượng)"
              value={
                count(plan.estimate.inputTokens) +
                ' vào · ' +
                count(plan.estimate.outputTokens) +
                ' ra'
              }
            />
            <Figure label="Chi phí (ước lượng)" value={money(plan.estimate.usd)} />
          </div>
          <p className="m-0 text-[12px] leading-[1.55] text-ink-muted">
            Đây là <strong>ước lượng</strong> tính từ số ký tự bản gốc, không phải số thật. Giá tham
            khảo từ bảng dữ liệu cập nhật {plan.catalogReadAt}; chạy xong Mira hiện lượng dùng thật
            mà nhà cung cấp báo.
          </p>

          {plan.hasTranslation && (
            <p
              role="note"
              className="m-0 rounded-control border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] leading-[1.55]"
            >
              Chương này đã có bản dịch. AI chỉ <strong>đề xuất</strong>:{' '}
              {plan.protectedCount > 0
                ? count(plan.protectedCount) +
                  ' câu bạn đã viết hoặc đã soát sẽ không bị ghi đè — bản AI hiện cạnh bản của bạn để bạn chọn.'
                : 'những câu bạn đã viết hoặc đã soát sẽ không bị ghi đè.'}
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost-muted" onClick={onClose}>
          Hủy bỏ
        </Button>
        {needsRedoConfirm ? (
          <Button onClick={() => setConfirmedRedo(true)}>Tôi đã hiểu, tiếp tục</Button>
        ) : (
          <Button disabled={plan === null} onClick={() => void run.start()}>
            <StarsIcon size={14} />
            Dịch {plan ? count(plan.segmentCount) + ' câu' : ''}
          </Button>
        )}
      </div>
    </div>
  )
}

export interface AiTranslateDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  workId: string
  chapterId: string
  /** Nơi khai kết nối AI; hộp thoại dẫn tới đây khi chưa có kết nối nào. */
  onOpenSettings(): void
  /** Bản dịch sau khi AI ghi vào, để màn chương mở lại trình soạn trên bản mới. */
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
      description="Mira gửi bản gốc theo từng lô và ghi kết quả vào bản dịch."
      size="wide"
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
