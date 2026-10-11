import { useEffect, useRef, useState, type JSX, type ReactNode, type RefObject } from 'react'
import { RefreshIcon } from '@renderer/components/ui/reicon'

import type { ModelInfoView } from '../../../../../shared/contracts/aiConnections'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Checkbox, Radio, RadioGroup } from '../../../components/ui/Checkbox'
import { Dialog } from '../../../components/ui/Dialog'
import { cn } from '../../../lib/cn'
import { SearchInput } from '../../../components/ui/Input'
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

const LIST =
  'flex max-h-[320px] flex-col gap-0 overflow-y-auto rounded-sm border border-default bg-surface'

/** The fetched models: one radio group (`one`) or a group of checkboxes (`many`). */
function ModelList({
  mode,
  value,
  onPick,
  children
}: {
  mode: 'one' | 'many'
  value: string | null
  onPick(id: string): void
  children: ReactNode
}): JSX.Element {
  if (mode === 'many') {
    return (
      <fieldset aria-label="Model lấy được" className={cn(LIST, 'm-0 min-w-0 p-0')}>
        {children}
      </fieldset>
    )
  }
  return (
    <RadioGroup
      name="model-to-pick"
      aria-label="Model lấy được"
      value={value}
      onValueChange={(next) => {
        if (typeof next === 'string') onPick(next)
      }}
      className={LIST}
    >
      {children}
    </RadioGroup>
  )
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
        <SearchInput
          label="Lọc model"
          placeholder="Lọc model…"
          className="min-w-[200px] flex-1"
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          disabled={running}
          onClick={onFetch}
          leftIcon={<RefreshIcon size={16} className={running ? 'animate-spin' : undefined} />}
        >
          {models.length === 0 ? 'Lấy danh sách' : 'Lấy lại'}
        </Button>
      </div>

      {error !== null && (
        <p role="alert" className="m-0 text-body-xs leading-normal text-error">
          {error}
        </p>
      )}

      {empty !== null ? (
        <p role="status" className="m-0 py-6 text-center text-body-xs leading-normal text-subtle">
          {empty}
        </p>
      ) : (
        models.length > 0 && (
          <>
            <p className="m-0 text-body-xs text-subtle" aria-live="polite">
              {query.trim() === ''
                ? models.length + ' model'
                : shown.length + ' / ' + models.length + ' model'}
            </p>
            {shown.length === 0 ? (
              <p role="status" className="m-0 py-6 text-center text-body-xs text-subtle">
                Không có model nào khớp “{query.trim()}”.
              </p>
            ) : (
              <ModelList mode={mode} value={chosen[0] ?? null} onPick={(id) => toggle(id, true)}>
                {shown.map((model) => {
                  const have = existing.get(model.id) ?? 0
                  const context = contextOf(model)
                  const row =
                    'flex w-full cursor-pointer flex-wrap gap-x-2.5 gap-y-1 border-b border-default px-2.5 py-2 last:border-b-0 hover:bg-hover'
                  const details = (
                    <>
                      <span className="font-mono text-body-xs break-all">{model.id}</span>
                      {have > 0 && (
                        <Badge variant="outline" dot color="neutral">
                          {have === 1 ? 'Đã có' : 'Đã có ' + have + ' mục'}
                        </Badge>
                      )}
                      {model.status === 'deprecated' && (
                        <Badge variant="outline" dot color="warning">
                          Nhà cung cấp đã khai tử
                        </Badge>
                      )}
                      <span className="ml-auto flex shrink-0 items-center gap-3 text-body-xs text-subtle">
                        {context !== null && <span>{context}</span>}
                        <span>{priceOf(model)}</span>
                      </span>
                    </>
                  )
                  return mode === 'one' ? (
                    <Radio key={model.id} value={model.id} className={row}>
                      {details}
                    </Radio>
                  ) : (
                    <Checkbox
                      key={model.id}
                      checked={chosen.includes(model.id)}
                      onCheckedChange={(checked) => toggle(model.id, checked)}
                      className={row}
                    >
                      {details}
                    </Checkbox>
                  )
                })}
              </ModelList>
            )}
            {catalogReadAt !== null && (
              <p className="m-0 text-body-xs text-subtle">
                Giá tham khảo, bảng dữ liệu cập nhật {catalogReadAt}.
              </p>
            )}
          </>
        )
      )}

      {problem !== null && (
        <p role="alert" className="m-0 text-body-xs text-error">
          {problem}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button
          variant="solid"
          disabled={chosen.length === 0 || saving}
          onClick={() => void confirm()}
        >
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
      size="md"
      finalFocus={finalFocus}
    >
      {open && <Body {...props} onClose={() => onOpenChange(false)} />}
    </Dialog>
  )
}
