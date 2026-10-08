import { useState, type JSX, type RefObject } from 'react'
import type { ModelEntryView } from '../../../../shared/contracts/modelSettings'
import { Dialog } from '../../components/ui/Dialog'
import { TextField } from '../../components/ui/Field'
import type { ModelEntryActions } from './modelEntryActions'
import {
  TASK_FIELDS,
  TASK_HINTS,
  parseTaskField,
  taskFormOf,
  taskPatch,
  type TaskField
} from './modelSettingsForm'

/**
 * Hộp thoại **Tác vụ**: bốn con số nói *khối lượng* và *nhịp* của việc dịch bằng mục này — token vào mỗi lô,
 * token ra, số yêu cầu cùng lúc, và RPM. Cấu trúc theo LinguaGacha.
 *
 * Mỗi ô lưu khi rời ô. Ô trống là "chưa đặt" (về mặc định) và "0" là chính con số 0; số ngoài giới hạn
 * hiện lý do bên cạnh ô và **không** được lưu, cũng không bị sửa lại: người dùng thấy đúng con số họ gõ.
 */

function TaskForm({
  entry,
  actions
}: {
  entry: ModelEntryView
  actions: ModelEntryActions
}): JSX.Element {
  const [form, setForm] = useState(() => taskFormOf(entry.settings))
  const [errors, setErrors] = useState<Partial<Record<TaskField, string>>>({})

  function setError(field: TaskField, message: string | undefined): void {
    setErrors((current) => ({ ...current, [field]: message }))
  }

  async function commit(field: TaskField): Promise<void> {
    const parsed = parseTaskField(field, form[field])
    if (!parsed.ok) {
      setError(field, parsed.message)
      return
    }
    // Unchanged is not a write: leaving a box alone must not look like an edit to a run that is going.
    const saved = taskFormOf(entry.settings)[field]
    if (form[field].trim() === saved) {
      setError(field, undefined)
      return
    }
    const outcome = await actions.update(entry.id, { settings: taskPatch(field, parsed.value) })
    setError(field, outcome.ok ? undefined : outcome.message)
  }

  return (
    <div className="flex flex-col gap-4">
      {TASK_FIELDS.map((field) => {
        const copy = TASK_HINTS[field]
        return (
          <TextField
            key={field}
            label={copy.title}
            hint={copy.hint}
            error={errors[field]}
            inputMode="numeric"
            autoComplete="off"
            placeholder={copy.placeholder}
            className="[&_input]:font-mono"
            value={form[field]}
            onChange={(event) => {
              setForm((current) => ({ ...current, [field]: event.target.value }))
              setError(field, undefined)
            }}
            onBlur={() => void commit(field)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void commit(field)
              }
            }}
          />
        )
      })}
    </div>
  )
}

export interface ModelTaskDialogProps {
  entry: ModelEntryView | null
  actions: ModelEntryActions
  onOpenChange(open: boolean): void
  finalFocus?: RefObject<HTMLElement | null>
}

export function ModelTaskDialog({
  entry,
  actions,
  onOpenChange,
  finalFocus
}: ModelTaskDialogProps): JSX.Element {
  return (
    <Dialog
      open={entry !== null}
      onOpenChange={onOpenChange}
      title="Tác vụ"
      description={
        entry === null
          ? undefined
          : 'Giới hạn khi dịch bằng “' +
            entry.name +
            '”. Sửa đồng thời hay RPM giữa lúc đang dịch có hiệu lực ở lô kế tiếp; các số còn lại buộc lập kế hoạch dịch lại.'
      }
      size="md"
      finalFocus={finalFocus}
    >
      {entry !== null && <TaskForm key={entry.id} entry={entry} actions={actions} />}
    </Dialog>
  )
}
