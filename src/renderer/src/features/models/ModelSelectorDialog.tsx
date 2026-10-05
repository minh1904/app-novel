import { useEffect, useRef, useState, type JSX, type RefObject } from 'react'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import type { ModelInfoView } from '../../../../shared/contracts/aiConnections'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { SearchField } from '../../components/SearchField'
import { contextOf, filterModels, priceOf } from './modelInfoText'

/**
 * Hộp thoại **chọn model** từ danh sách lấy về từ endpoint, có ô lọc. Cấu trúc theo LinguaGacha.
 *
 * Danh sách chỉ là **gợi ý**: endpoint có thể không liệt kê model, hoặc không liệt kê model người dùng cần.
 * Khi đó người dùng gõ tên bằng tay ở hộp thoại Cơ bản (nút Nhập) hay ô "Thêm model" của thẻ kết nối, và
 * hộp thoại này nói thẳng điều đó thay vì để một danh sách trống không giải thích.
 *
 * Hai chế độ cùng một danh sách: `many` (thêm nhiều mục một lần, từ thẻ kết nối) và `one` (chọn model cho
 * một mục đang sửa, từ nút Lấy). Mỗi hàng là một ô chọn thật (checkbox hay radio) nên bàn phím dùng được.
 */

export interface ModelSelectorDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  mode: 'one' | 'many'
  models: readonly ModelInfoView[]
  /** Endpoint đã trả lời `GET /models` và có liệt kê. `false` khi nối được mà không liệt kê. */
  listed: boolean
  /** Đã kiểm tra kết nối ít nhất một lần, nên "danh sách rỗng" là một câu trả lời chứ không phải "chưa hỏi". */
  asked: boolean
  running: boolean
  error: string | null
  catalogReadAt: string | null
  /** Tên model đã có bao nhiêu mục, để đánh dấu "đã có". Thêm mục thứ hai cho cùng một model vẫn được. */
  existing: ReadonlyMap<string, number>
  /** Model đang là của mục (chế độ `one`), được chọn sẵn. */
  current?: string
  onFetch(): void
  /** Trả lời `null` khi xong; một câu khi lỗi, hiện ngay trong hộp thoại. */
  onConfirm(models: string[]): Promise<string | null>
  finalFocus?: RefObject<HTMLElement | null>
}

function Body({
  mode,
  models,
  listed,
  asked,
  running,
  error,
  catalogReadAt,
  existing,
  current,
  onFetch,
  onConfirm,
  onClose
}: Omit<ModelSelectorDialogProps, 'open' | 'onOpenChange' | 'finalFocus'> & {
  onClose(): void
}): JSX.Element {
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<string[]>(
    mode === 'one' && current !== undefined ? [current] : []
  )
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Opening the picker is asking for the list: if it was never fetched in this session, fetch it now rather
  // than make the person press a second button for what the first one meant.
  const asking = useRef(false)
  useEffect(() => {
    if (asking.current) return
    asking.current = true
    if (models.length === 0 && !asked && !running) onFetch()
  }, [models.length, asked, running, onFetch])

  const shown = filterModels(models, query)

  function toggle(id: string, on: boolean): void {
    setProblem(null)
    if (mode === 'one') setChosen([id])
    else setChosen((list) => (on ? [...list, id] : list.filter((item) => item !== id)))
  }

  async function confirm(): Promise<void> {
    setSaving(true)
    const result = await onConfirm(chosen)
    setSaving(false)
    if (result === null) onClose()
    else setProblem(result)
  }

  const empty =
    models.length === 0
      ? running
        ? 'Đang lấy danh sách model…'
        : error !== null
          ? null
          : asked && !listed
            ? 'Nối được nhưng endpoint này không liệt kê model. Hãy nhập tên model bằng tay.'
            : asked
              ? 'Endpoint không trả về model nào.'
              : 'Chưa lấy danh sách. Bấm “Lấy danh sách” để hỏi endpoint.'
      : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          label="Lọc model"
          placeholder="Lọc model…"
          className="min-w-[200px] flex-1"
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button variant="outline" size="lg" disabled={running} onClick={onFetch}>
          <RefreshIcon size={14} className={running ? 'animate-spin' : undefined} />
          {models.length === 0 ? 'Lấy danh sách' : 'Lấy lại'}
        </Button>
      </div>

      {error !== null && (
        <p role="alert" className="m-0 text-ui-xs leading-normal text-error">
          {error}
        </p>
      )}

      {empty !== null ? (
        <p role="status" className="m-0 py-6 text-center text-ui-xs leading-normal text-ink-muted">
          {empty}
        </p>
      ) : (
        models.length > 0 && (
          <>
            <p className="m-0 text-ui-xs text-ink-muted" aria-live="polite">
              {query.trim() === ''
                ? models.length + ' model'
                : shown.length + ' / ' + models.length + ' model'}
            </p>
            {shown.length === 0 ? (
              <p role="status" className="m-0 py-6 text-center text-ui-xs text-ink-muted">
                Không có model nào khớp “{query.trim()}”.
              </p>
            ) : (
              <ul
                className="m-0 flex max-h-[320px] list-none flex-col overflow-y-auto rounded-control border border-line bg-canvas p-0"
                aria-label="Model lấy được"
              >
                {shown.map((model) => {
                  const have = existing.get(model.id) ?? 0
                  const context = contextOf(model)
                  return (
                    <li key={model.id} className="border-b border-line last:border-b-0">
                      <label className="flex cursor-pointer flex-wrap items-center gap-x-2.5 gap-y-1 px-2.5 py-2 hover:bg-hover">
                        <input
                          type={mode === 'one' ? 'radio' : 'checkbox'}
                          name="model-to-pick"
                          className="size-4 shrink-0"
                          checked={chosen.includes(model.id)}
                          onChange={(event) => toggle(model.id, event.target.checked)}
                        />
                        <span className="font-mono text-ui-xs break-all">{model.id}</span>
                        {have > 0 && (
                          <Badge tone="muted">
                            {have === 1 ? 'Đã có' : 'Đã có ' + have + ' mục'}
                          </Badge>
                        )}
                        {model.status === 'deprecated' && (
                          <Badge tone="warning">Nhà cung cấp đã khai tử</Badge>
                        )}
                        <span className="ml-auto flex shrink-0 items-center gap-3 text-ui-xs text-ink-muted">
                          {context !== null && <span>{context}</span>}
                          <span>{priceOf(model)}</span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
            {catalogReadAt !== null && (
              <p className="m-0 text-ui-xs text-ink-muted">
                Giá tham khảo, bảng dữ liệu cập nhật {catalogReadAt}.
              </p>
            )}
          </>
        )
      )}

      {problem !== null && (
        <p role="alert" className="m-0 text-ui-xs text-error">
          {problem}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost-muted" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button disabled={chosen.length === 0 || saving} onClick={() => void confirm()}>
          {mode === 'one'
            ? 'Dùng model này'
            : chosen.length <= 1
              ? 'Thêm model'
              : 'Thêm ' + chosen.length + ' model'}
        </Button>
      </div>
    </div>
  )
}

export function ModelSelectorDialog(props: ModelSelectorDialogProps): JSX.Element {
  const { open, onOpenChange, mode, finalFocus } = props
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'one' ? 'Chọn model' : 'Thêm model'}
      description={
        mode === 'one'
          ? 'Chọn tên model thật từ danh sách endpoint báo.'
          : 'Tích các model muốn dùng; mỗi model thành một mục với cài đặt trống. Thêm lại một model đã có cũng được, để có nhiều cấu hình cho cùng một model.'
      }
      size="form"
      finalFocus={finalFocus}
    >
      {open && <Body {...props} onClose={() => onOpenChange(false)} />}
    </Dialog>
  )
}
