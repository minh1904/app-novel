import { useState, type JSX, type RefObject } from 'react'
import { CheckCircleIcon } from '@solar-icons/react/linear/check-circle'
import { CloseCircleIcon } from '@solar-icons/react/linear/close-circle'
import { PenIcon } from '@solar-icons/react/linear/pen'
import { PlayIcon } from '@solar-icons/react/linear/play'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import type { ModelEntryTestResult } from '../../../../shared/contracts/aiConnections'
import type { ModelEntryView } from '../../../../shared/contracts/modelSettings'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Select } from '../../components/Select'
import { TextField } from '../../components/TextField'
import { messageOf, type ModelEntryActions } from './modelEntryActions'
import {
  DEFAULT_THINKING_HINT,
  thinkingChoiceOf,
  thinkingOptions,
  thinkingPatch,
  type ThinkingChoice
} from './modelSettingsForm'
import { SettingRow } from './SettingRow'

/**
 * Hộp thoại **Cơ bản** của một mục model: tên hiển thị, tên model thật (với ba nút Nhập / Lấy / Kiểm tra)
 * và mức suy luận. Cấu trúc theo LinguaGacha; URL và khóa không có ở đây vì ở Mira chúng thuộc kết nối.
 *
 * Mỗi ô lưu ngay khi đổi xong (chọn xong, hoặc rời ô), không có nút Lưu: nút **Kiểm tra** gửi cài đặt
 * **đã lưu** của mục, nên cái đang hiện trên màn luôn là cái được kiểm.
 */

function Result({
  result
}: {
  result: Awaited<ReturnType<ModelEntryActions['test']>>
}): JSX.Element {
  if (result.ok) {
    return (
      <p
        role="status"
        className="m-0 flex flex-wrap items-center gap-1.5 text-[12px] leading-[1.55] text-success"
      >
        <CheckCircleIcon size={14} className="shrink-0" />
        <span>
          <strong>Nhà cung cấp nhận cài đặt này.</strong> {describeResult(result.value)}
        </span>
      </p>
    )
  }
  return (
    <p
      role="alert"
      className="m-0 flex items-start gap-1.5 rounded-control border border-error/40 bg-error/8 px-3 py-2 text-[12px] leading-[1.55]"
    >
      <CloseCircleIcon size={14} className="mt-[2px] shrink-0 text-error" />
      <span className="min-w-0 break-words">
        <strong className="text-error">Không dùng được.</strong> {messageOf(result.error)}
      </span>
    </p>
  )
}

function describeResult(value: ModelEntryTestResult): string {
  const parts = [value.ms.toLocaleString('vi-VN') + ' ms']
  if (value.usage !== null) {
    parts.push(
      value.usage.inputTokens.toLocaleString('vi-VN') +
        ' token vào, ' +
        value.usage.outputTokens.toLocaleString('vi-VN') +
        ' token ra'
    )
  }
  return parts.join(' · ') + '.'
}

/** Nhập tay tên model thật: một hộp thoại nhỏ, vì endpoint không phải lúc nào cũng liệt kê model. */
function ModelNameDialog({
  open,
  onOpenChange,
  initial,
  onSave
}: {
  open: boolean
  onOpenChange(open: boolean): void
  initial: string
  onSave(model: string): Promise<string | null>
}): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nhập tên model"
      description="Tên đúng như nhà cung cấp gọi, ví dụ gemini-2.5-flash. Gõ được cả khi endpoint không liệt kê model."
    >
      {open && (
        <ModelNameForm initial={initial} onSave={onSave} onClose={() => onOpenChange(false)} />
      )}
    </Dialog>
  )
}

function ModelNameForm({
  initial,
  onSave,
  onClose
}: {
  initial: string
  onSave(model: string): Promise<string | null>
  onClose(): void
}): JSX.Element {
  const [text, setText] = useState(initial)
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  async function save(): Promise<void> {
    const value = text.trim()
    if (value === '') {
      setError('Tên model không được để trống.')
      return
    }
    if (value === initial) {
      onClose()
      return
    }
    setSaving(true)
    const problem = await onSave(value)
    setSaving(false)
    if (problem === null) onClose()
    else setError(problem)
  }

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="Tên model"
        className="font-mono"
        value={text}
        error={error}
        autoFocus
        onChange={(event) => {
          setText(event.target.value)
          setError(undefined)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void save()
          }
        }}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost-muted" onClick={onClose}>
          Hủy bỏ
        </Button>
        <Button disabled={saving} onClick={() => void save()}>
          Lưu
        </Button>
      </div>
    </div>
  )
}

function BasicForm({
  entry,
  actions,
  onPickModel
}: {
  entry: ModelEntryView
  actions: ModelEntryActions
  onPickModel(): void
}): JSX.Element {
  const [name, setName] = useState(entry.name)
  const [nameError, setNameError] = useState<string | undefined>()
  const [thinkingError, setThinkingError] = useState<string | undefined>()
  const [typing, setTyping] = useState(false)
  const [testing, setTesting] = useState(false)
  // A result is only about the settings it was made with: the entry changing makes it stale, so it is
  // keyed by what the entry looked like and hidden once that no longer matches.
  const [tested, setTested] = useState<{
    signature: string
    result: Awaited<ReturnType<ModelEntryActions['test']>>
  } | null>(null)

  const signature = entry.model + '\n' + JSON.stringify(entry.settings)
  const shown = tested !== null && tested.signature === signature ? tested.result : null

  async function commitName(): Promise<void> {
    const value = name.trim()
    if (value === entry.name) {
      setNameError(undefined)
      return
    }
    if (value === '') {
      setNameError('Tên hiển thị không được để trống.')
      return
    }
    const outcome = await actions.update(entry.id, { name: value })
    if (outcome.ok) setNameError(undefined)
    else setNameError(outcome.message)
  }

  async function chooseThinking(choice: ThinkingChoice): Promise<void> {
    const outcome = await actions.update(entry.id, { settings: thinkingPatch(choice) })
    setThinkingError(outcome.ok ? undefined : outcome.message)
  }

  async function runTest(): Promise<void> {
    setTesting(true)
    const result = await actions.test(entry.id)
    setTesting(false)
    setTested({ signature, result })
  }

  const options = thinkingOptions(entry.capability, entry.settings.thinking)
  const noLevels = entry.capability.thinkingLevels.length === 0

  return (
    <div className="flex flex-col">
      <div className="pb-3">
        <TextField
          label="Tên hiển thị"
          value={name}
          error={nameError}
          hint="Tên bạn thấy trong menu chọn model. Mặc định bằng tên model thật."
          onChange={(event) => {
            setName(event.target.value)
            setNameError(undefined)
          }}
          onBlur={() => void commitName()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void commitName()
            }
          }}
        />
      </div>

      <SettingRow
        title="Tên model"
        hint="Tên model thật gửi cho nhà cung cấp."
        below={
          <>
            <p className="m-0 font-mono text-[12.5px] break-all" aria-label="Tên model hiện tại">
              {entry.model}
            </p>
            {shown !== null && <Result result={shown} />}
            <p className="m-0 text-[12px] leading-[1.55] text-ink-muted">
              “Kiểm tra” gửi một yêu cầu rất nhỏ bằng cài đặt đã lưu của mục này, nên tốn một ít
              token.
            </p>
          </>
        }
      >
        <Button variant="outline" size="sm" onClick={() => setTyping(true)}>
          <PenIcon size={13} />
          Nhập
        </Button>
        <Button variant="outline" size="sm" onClick={onPickModel}>
          <RefreshIcon size={13} />
          Lấy
        </Button>
        <Button variant="outline" size="sm" disabled={testing} onClick={() => void runTest()}>
          <PlayIcon size={13} />
          {testing ? 'Đang kiểm tra…' : 'Kiểm tra'}
        </Button>
      </SettingRow>

      <SettingRow
        title="Mức suy luận"
        hint={
          noLevels
            ? 'Bảng dữ liệu đi kèm không có mức suy luận nào cho model này, nên chỉ có “Mặc định”. Nếu nhà cung cấp có cách riêng, dùng tham số thêm ở mục Nâng cao.'
            : 'Chỉ hiện các mức model này hỗ trợ. ' + DEFAULT_THINKING_HINT
        }
        below={
          thinkingError === undefined ? undefined : (
            <span role="alert" className="text-[12px] text-error">
              {thinkingError}
            </span>
          )
        }
      >
        <Select
          label="Mức suy luận"
          value={thinkingChoiceOf(entry.settings)}
          options={options.map((option) => ({ value: option.value, label: option.label }))}
          onChange={(choice) => void chooseThinking(choice as ThinkingChoice)}
          className="min-w-[230px]"
        />
      </SettingRow>

      <ModelNameDialog
        open={typing}
        onOpenChange={setTyping}
        initial={entry.model}
        onSave={async (model) => {
          const outcome = await actions.update(entry.id, { model })
          return outcome.ok ? null : outcome.message
        }}
      />
    </div>
  )
}

export interface ModelBasicDialogProps {
  entry: ModelEntryView | null
  actions: ModelEntryActions
  onOpenChange(open: boolean): void
  /** Mở hộp thoại chọn model; kết quả chọn được ghi vào chính mục này. */
  onPickModel(): void
  finalFocus?: RefObject<HTMLElement | null>
}

export function ModelBasicDialog({
  entry,
  actions,
  onOpenChange,
  onPickModel,
  finalFocus
}: ModelBasicDialogProps): JSX.Element {
  return (
    <Dialog
      open={entry !== null}
      onOpenChange={onOpenChange}
      title="Cơ bản"
      description={entry === null ? undefined : 'Cài đặt của “' + entry.name + '”.'}
      size="form"
      finalFocus={finalFocus}
    >
      {entry !== null && (
        <BasicForm key={entry.id} entry={entry} actions={actions} onPickModel={onPickModel} />
      )}
    </Dialog>
  )
}
