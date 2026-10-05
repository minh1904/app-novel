import { useState, type JSX, type RefObject } from 'react'
import { StarsIcon } from '@solar-icons/react/linear/stars'
import type { TextRecord } from '../../../../shared/contracts/text'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { ModelSelectionMenu } from '../models/ModelSelectionMenu'
import { useParagraphTranslate } from './useParagraphTranslate'

const count = (value: number): string => value.toLocaleString('vi')
const money = (usd?: number): string => usd === undefined ? 'chưa biết giá' :
  usd < 0.01 ? 'dưới $0,01' : '$' + usd.toFixed(2).replace('.', ',')

function Figure({ label, value }: { label: string; value: string }): JSX.Element {
  return <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
    <span className="text-[12px] text-ink-muted">{label}</span>
    <span className="text-[12px] font-medium tabular-nums">{value}</span>
  </div>
}

interface FlowProps {
  workId: string
  chapterId: string
  onClose(): void
  onOpenSettings(): void
  onWritten(record: TextRecord): void
}

function TranslateFlow({ workId, chapterId, onClose, onOpenSettings, onWritten }: FlowProps): JSX.Element {
  const run = useParagraphTranslate(workId, chapterId, onWritten)
  const [confirmedRedo, setConfirmedRedo] = useState(false)
  const notice = run.notice && <Banner tone="error" onDismiss={run.dismissNotice}>{run.notice}</Banner>

  if (run.loadingTargets) return <p role="status" className="m-0 text-[12px] text-ink-muted">
    Đang đọc cài đặt kết nối…
  </p>
  if (run.targets.length === 0) return <div className="flex flex-col gap-3">
    {notice}
    <p className="m-0 text-[12px] leading-[1.6] text-ink-muted">
      Chưa có kết nối AI đang bật hoặc kết nối chưa chọn model.
    </p>
    <div className="flex justify-end gap-2">
      <Button variant="ghost-muted" onClick={onClose}>Đóng</Button>
      <Button onClick={() => { onClose(); onOpenSettings() }}>Mở Cài đặt</Button>
    </div>
  </div>

  if (run.stage === 'finished') return <div className="flex flex-col gap-3">
    {notice}
    <p className="m-0 text-[12.5px]">
      {run.cancelled ? 'Đã dừng. ' : ''}
      Đã xử lý <strong>{count(run.progress.processed)}</strong> đoạn,
      {' '}tạo <strong>{count(run.result?.proposed ?? run.progress.proposed)}</strong> đề xuất.
      {' '}Đã áp dụng <strong>{count(run.result?.applied ?? 0)}</strong>;
      {' '}cần duyệt <strong>{count(run.result?.needsReview ?? run.progress.proposed)}</strong>.
    </p>
    {(run.result?.needsReview ?? 0) > 0 && <p className="m-0 text-[12px] text-ink-muted">
      Mở hàng chờ của chương để xem và duyệt từng phần.
    </p>}
    {run.usage && <p className="m-0 text-[12px] text-ink-muted">
      Nhà cung cấp báo đã dùng {count(run.usage.inputTokens)} token vào và{' '}
      {count(run.usage.outputTokens)} token ra.
    </p>}
    {run.keyNotice && <p role="status" className="m-0 text-[12px] text-ink-muted">{run.keyNotice}</p>}
    {run.failure && <p role="alert" className="m-0 rounded-control border border-error/40 bg-error/8 px-3 py-2 text-[12px] leading-[1.55]">
      {run.failure.message}
    </p>}
    {run.failed.length > 0 && <div className="flex items-center gap-2 rounded-control border border-line bg-canvas px-3 py-2">
      <span className="text-[12px]">{count(run.failed.length)} đoạn chưa dịch được. Đề xuất đã xong vẫn được giữ.</span>
      <Button variant="outline" size="sm" className="ml-auto" onClick={() => void run.retryFailed()}>
        Dịch lại phần lỗi
      </Button>
    </div>}
    <div className="flex justify-end"><Button onClick={onClose}>Xong</Button></div>
  </div>

  if (run.stage === 'running' || run.stage === 'cancelling') {
    const { processed, proposed, total } = run.progress
    return <div className="flex flex-col gap-3">
      {notice}
      <div role="progressbar" aria-label="Tiến độ dịch" aria-valuemin={0} aria-valuemax={total}
        aria-valuenow={processed} className="h-1.5 overflow-hidden rounded-full bg-control">
        <div className="h-full rounded-full bg-primary" style={{ width: (total ? Math.round(processed / total * 100) : 0) + '%' }} />
      </div>
      <p role="status" className="m-0 text-[12px] text-ink-muted">
        Đã xử lý {count(processed)} / {count(total)} đoạn · {count(proposed)} đề xuất đã lưu
      </p>
      <div className="flex justify-end">
        <Button variant="outline" disabled={run.stage === 'cancelling'} onClick={run.cancel}>
          {run.stage === 'cancelling' ? 'Đang dừng…' : 'Dừng'}
        </Button>
      </div>
    </div>
  }

  const plan = run.plan
  return <div className="flex flex-col gap-3">
    {notice}
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold">Model dùng để dịch</span>
      <ModelSelectionMenu variant="field" label="Model dùng để dịch" connections={run.connections}
        selected={run.selection}
        onSelect={(selection) => { setConfirmedRedo(false); void run.pick(selection) }}
        onSelectThinking={(selection, choice) => {
          setConfirmedRedo(false); void run.pick(selection, choice)
        }} />
    </div>
    {run.stage === 'planning' && <p role="status" className="m-0 text-[12px] text-ink-muted">
      Đang tính số đoạn và ước lượng chi phí…
    </p>}
    {plan && <>
      <div className="flex flex-col rounded-control border border-line bg-canvas px-3 py-1">
        <Figure label="Số đoạn sẽ dịch" value={count(plan.paragraphCount)} />
        <Figure label="Số lô sẽ gửi" value={count(plan.batches.length)} />
        <Figure label="Token (ước lượng)" value={`${count(plan.estimate.inputTokens)} vào · ${count(plan.estimate.outputTokens)} ra`} />
        <Figure label="Chi phí (ước lượng)" value={money(plan.estimate.usd)} />
      </div>
      <p className="m-0 text-[12px] leading-[1.55] text-ink-muted">
        Giá tham khảo cập nhật {plan.catalogReadAt}. Lượng dùng thật hiện sau khi dịch.
      </p>
      {plan.hasTranslation && <p role="note" className="m-0 rounded-control border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] leading-[1.55]">
        Chương đã có bản dịch. Kết quả vào hàng chờ để đặt vị trí; Mira không tự ghép theo thứ tự đoạn.
      </p>}
      <fieldset className="flex flex-col gap-1.5 rounded-control border border-line px-3 py-2">
        <legend className="px-1 text-[12px] font-semibold">Sau khi dịch</legend>
        <label className="flex items-center gap-2 text-[12px]">
          <input type="radio" name="translation-policy" checked={run.policy === 'review'}
            onChange={() => run.setPolicy('review')} /> Duyệt trước
        </label>
        <label className="flex items-center gap-2 text-[12px]">
          <input type="radio" name="translation-policy" checked={run.policy === 'auto'}
            onChange={() => run.setPolicy('auto')} /> Áp dụng thẳng khi bản dịch còn trống và không đổi
        </label>
      </fieldset>
    </>}
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="ghost-muted" onClick={onClose}>Hủy bỏ</Button>
      {plan?.hasTranslation && !confirmedRedo
        ? <Button onClick={() => setConfirmedRedo(true)}>Tôi đã hiểu, tiếp tục</Button>
        : <Button disabled={plan === null} onClick={() => void run.start()}>
          <StarsIcon size={14} /> Dịch {plan ? count(plan.paragraphCount) + ' đoạn' : ''}
        </Button>}
    </div>
  </div>
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

export function AiTranslateDialog({ open, onOpenChange, workId, chapterId,
  onOpenSettings, onWritten, finalFocus }: AiTranslateDialogProps): JSX.Element {
  return <Dialog open={open} onOpenChange={onOpenChange} title="Dịch bằng AI"
    description="Mira dịch theo đoạn và lưu kết quả vào hàng chờ đề xuất." size="wide"
    finalFocus={finalFocus}>
    {open && <TranslateFlow workId={workId} chapterId={chapterId}
      onClose={() => onOpenChange(false)} onOpenSettings={onOpenSettings} onWritten={onWritten} />}
  </Dialog>
}
