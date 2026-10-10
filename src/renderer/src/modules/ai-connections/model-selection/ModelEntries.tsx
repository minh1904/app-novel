import { useRef, useState, type JSX } from 'react'
import { MenuDotsIcon } from '@solar-icons/react/linear/menu-dots'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import type { ModelEntryView } from '../../../../../shared/contracts/modelSettings'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { CompactButton } from '../../../components/ui/CompactButton'
import { Dialog } from '../../../components/ui/Dialog'
import {
  MenuItem,
  MenuPopup,
  MenuRoot,
  MenuSeparator,
  MenuTrigger
} from '../../../components/ui/DropdownMenu'
import { TextField } from '../../../components/ui/Field'
import type { TestState } from '../settings/useConnections'
import { ModelAdvancedDialog } from './ModelAdvancedDialog'
import { ModelBasicDialog } from './ModelBasicDialog'
import { ModelSelectorDialog } from './ModelSelectorDialog'
import { ModelTaskDialog } from './ModelTaskDialog'
import type { ModelEntryActions } from './modelEntryActions'
import { contextOf, priceOf } from './modelInfoText'
import { thinkingLabelOf } from './modelSettingsForm'

/**
 * Danh sách **mục model** của một kết nối, trong thẻ kết nối ở màn Cài đặt (change `ai-model-settings`).
 *
 * Cấu trúc theo LinguaGacha: mỗi mục có menu "…" với Cơ bản / Tác vụ / Nâng cao / Sao chép / Xóa, mỗi nhóm cài
 * đặt là một hộp thoại riêng, và có một hộp thoại chọn model từ danh sách lấy về. Ngoài ra Mira cần hai thứ
 * LinguaGacha không cần ở đây: **đặt mục mặc định** (hộp thoại dịch chọn sẵn nó) và **xếp thứ tự**.
 *
 * Danh sách model chỉ là gợi ý. Người dùng gõ tên model được ngay, kể cả khi endpoint không liệt kê.
 */

type EditDialog = { kind: 'basic' | 'task' | 'advanced'; entryId: string }
type Selector = { mode: 'add' } | { mode: 'pick'; entryId: string }

/** Một mục đã được đặt cài đặt gì, nói gọn cho hàng của nó. */
function EntryBadges({
  entry,
  isDefault
}: {
  entry: ModelEntryView
  isDefault: boolean
}): JSX.Element {
  return (
    <>
      {isDefault && (
        <Badge variant="outline" dot color="neutral">
          Mặc định
        </Badge>
      )}
      {entry.settings.thinking !== undefined && (
        <Badge variant="outline" dot color="neutral">
          Suy luận: {thinkingLabelOf(entry.settings.thinking)}
        </Badge>
      )}
    </>
  )
}

export interface ModelEntriesProps {
  connection: ConnectionView
  /** Kết quả lần kiểm tra kết nối gần nhất: danh sách model, giá và giới hạn. */
  test: TestState
  actions: ModelEntryActions
  /** Hỏi endpoint danh sách model (chính là "Kiểm tra kết nối"). */
  onFetchModels(): void
  /** Dòng "Model dùng trong Mira"; tắt khi đã có tiêu đề kết nối ở trên. */
  heading?: boolean
}

export function ModelEntries({
  connection,
  test,
  actions,
  onFetchModels,
  heading = true
}: ModelEntriesProps): JSX.Element {
  const entries = connection.models
  const [dialog, setDialog] = useState<EditDialog | null>(null)
  const [selector, setSelector] = useState<Selector | null>(null)
  const [removing, setRemoving] = useState<ModelEntryView | null>(null)
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState<string | undefined>()
  const [problem, setProblem] = useState<string | null>(null)
  // The control that opened a dialog, so closing it puts focus back where the person was.
  const returnFocus = useRef<HTMLElement | null>(null)

  const entryOf = (id: string | undefined): ModelEntryView | null =>
    entries.find((entry) => entry.id === id) ?? null
  const editing = entryOf(dialog?.entryId)
  const picking = selector?.mode === 'pick' ? entryOf(selector.entryId) : null
  const existing = new Map<string, number>()
  for (const entry of entries) existing.set(entry.model, (existing.get(entry.model) ?? 0) + 1)

  async function report(
    run: Promise<{ ok: true } | { ok: false; message: string }>
  ): Promise<void> {
    const outcome = await run
    setProblem(outcome.ok ? null : outcome.message)
  }

  async function addTyped(): Promise<void> {
    const model = typed.trim()
    if (model === '') {
      setTypedError('Nhập tên model.')
      return
    }
    const outcome = await actions.add(connection.id, [{ model }])
    if (outcome.ok) {
      setTyped('')
      setTypedError(undefined)
    } else {
      setTypedError(outcome.message)
    }
  }

  function move(entry: ModelEntryView, by: -1 | 1): void {
    const ids = entries.map((item) => item.id)
    const at = ids.indexOf(entry.id)
    const to = at + by
    if (to < 0 || to >= ids.length) return
    ;[ids[at], ids[to]] = [ids[to]!, ids[at]!]
    void report(actions.reorder(connection.id, ids))
  }

  function close(): void {
    setDialog(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {heading && (
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="m-0 text-body-xs font-semibold">Model dùng trong Mira</p>
          {entries.length > 0 && (
            <span className="text-body-xs text-subtle">{entries.length} mục</span>
          )}
        </div>
      )}

      {problem !== null && (
        <p role="alert" className="m-0 text-body-xs text-error">
          {problem}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="m-0 text-body-xs leading-normal text-subtle">
          Chưa có mục model nào. Thêm một model để dịch và chat bằng kết nối này.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0" aria-label="Các mục model">
          {entries.map((entry, index) => {
            const isDefault = entry.id === connection.defaultEntryId
            const info = test.models.find((item) => item.id === entry.model)
            const context = info === undefined ? null : contextOf(info)
            return (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-default py-2 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-body-sm font-semibold break-all">{entry.name}</span>
                    <EntryBadges entry={entry} isDefault={isDefault} />
                    {info?.status === 'deprecated' && (
                      <Badge variant="outline" dot color="warning">
                        Nhà cung cấp đã khai tử
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-xs text-subtle">
                    {/* The model is shown once: as the name when the entry still carries it, and here only when
                        the person gave the entry a name of their own. */}
                    {entry.name !== entry.model && (
                      <span className="font-mono break-all">{entry.model}</span>
                    )}
                    {context !== null && <span>{context}</span>}
                    {info !== undefined && <span>{priceOf(info)}</span>}
                  </div>
                </div>

                <MenuRoot>
                  <MenuTrigger
                    render={
                      <CompactButton
                        aria-label={'Tùy chọn của “' + entry.name + '”'}
                        onClick={(event) => {
                          returnFocus.current = event.currentTarget
                        }}
                        icon={<MenuDotsIcon size={16} />}
                      />
                    }
                  />
                  <MenuPopup>
                    {!isDefault && (
                      <MenuItem
                        onClick={() => void report(actions.setDefault(connection.id, entry.id))}
                      >
                        Đặt làm mặc định
                      </MenuItem>
                    )}
                    {!isDefault && <MenuSeparator />}
                    <MenuItem onClick={() => setDialog({ kind: 'basic', entryId: entry.id })}>
                      Cơ bản
                    </MenuItem>
                    <MenuItem onClick={() => setDialog({ kind: 'task', entryId: entry.id })}>
                      Tác vụ
                    </MenuItem>
                    <MenuItem onClick={() => setDialog({ kind: 'advanced', entryId: entry.id })}>
                      Nâng cao
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem disabled={index === 0} onClick={() => move(entry, -1)}>
                      Chuyển lên
                    </MenuItem>
                    <MenuItem
                      disabled={index === entries.length - 1}
                      onClick={() => move(entry, 1)}
                    >
                      Chuyển xuống
                    </MenuItem>
                    <MenuItem onClick={() => void report(actions.duplicate(entry.id))}>
                      Sao chép
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem tone="danger" onClick={() => setRemoving(entry)}>
                      Xóa
                    </MenuItem>
                  </MenuPopup>
                </MenuRoot>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <TextField
          label="Thêm model"
          className="min-w-[240px] flex-1 [&_input]:font-mono"
          placeholder="Ví dụ: gemini-2.5-flash"
          autoComplete="off"
          spellCheck={false}
          value={typed}
          error={typedError}
          hint="Gõ tên model rồi bấm Thêm, kể cả khi endpoint không liệt kê nó."
          onChange={(event) => {
            setTyped(event.target.value)
            setTypedError(undefined)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void addTyped()
            }
          }}
        />
        <Button disabled={typed.trim() === ''} onClick={() => void addTyped()}>
          Thêm
        </Button>
        <Button
          onClick={(event) => {
            returnFocus.current = event.currentTarget
            setSelector({ mode: 'add' })
          }}
        >
          Chọn từ danh sách…
        </Button>
      </div>

      <ModelBasicDialog
        entry={dialog?.kind === 'basic' ? editing : null}
        actions={actions}
        onOpenChange={(open) => !open && close()}
        onPickModel={() => editing && setSelector({ mode: 'pick', entryId: editing.id })}
        finalFocus={returnFocus}
      />
      <ModelTaskDialog
        entry={dialog?.kind === 'task' ? editing : null}
        actions={actions}
        onOpenChange={(open) => !open && close()}
        finalFocus={returnFocus}
      />
      <ModelAdvancedDialog
        entry={dialog?.kind === 'advanced' ? editing : null}
        actions={actions}
        onOpenChange={(open) => !open && close()}
        finalFocus={returnFocus}
      />

      <ModelSelectorDialog
        open={selector !== null}
        onOpenChange={(open) => !open && setSelector(null)}
        mode={selector?.mode === 'pick' ? 'one' : 'many'}
        models={test.models}
        listed={test.listed}
        asked={test.catalogReadAt !== null}
        running={test.running}
        error={test.error?.message ?? null}
        catalogReadAt={test.catalogReadAt}
        existing={existing}
        current={picking?.model}
        onFetch={onFetchModels}
        finalFocus={selector?.mode === 'add' ? returnFocus : undefined}
        onConfirm={async (models) => {
          if (selector?.mode === 'pick' && picking !== null) {
            const model = models[0]
            if (model === undefined) return null
            // An entry still carrying the name it was born with follows its model, so it does not go on
            // calling itself by a model it no longer points at.
            const follows = picking.name === picking.model
            const outcome = await actions.update(picking.id, {
              model,
              ...(follows ? { name: model } : {})
            })
            return outcome.ok ? null : outcome.message
          }
          const outcome = await actions.add(
            connection.id,
            models.map((model) => ({ model }))
          )
          return outcome.ok ? null : outcome.message
        }}
      />

      <Dialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Xóa mục model?"
        description={
          removing === null
            ? undefined
            : '“' +
              removing.name +
              '” và cài đặt của nó sẽ bị xóa. Model thật không bị ảnh hưởng, và thêm lại thì cài đặt phải đặt lại từ đầu.'
        }
        finalFocus={returnFocus}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            Hủy bỏ
          </Button>
          <Button
            color="danger"
            variant="solid"
            onClick={() => {
              const target = removing
              setRemoving(null)
              if (target !== null) void report(actions.remove(target.id))
            }}
          >
            Xóa
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
