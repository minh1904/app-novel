import { useState, type JSX, type RefObject } from 'react'
import type { ModelEntryView } from '../../../../../shared/contracts/modelSettings'
import { Dialog } from '../../../components/ui/Dialog'
import { Slider } from '../../../components/ui/Slider'
import { Switch } from '../../../components/ui/Switch'
import { TextareaField } from '../../../components/ui/Field'
import type { ModelEntryActions } from './modelEntryActions'
import {
  ADVANCED_HINTS,
  SLIDER_RANGE,
  TEMPERATURE_LOCKED_HINT,
  advancedFormOf,
  formatSlider,
  jsonPatch,
  parseJsonField,
  roundSlider,
  sliderPatch,
  type JsonField,
  type SliderField
} from './modelSettingsForm'

/**
 * Hộp thoại **Nâng cao**: điều chỉnh nhiệt độ và Top P (thanh trượt), header thêm và `extra_body` (JSON).
 * Mỗi tham số có công tắc riêng; khi tắt sẽ không gửi nhưng giá trị được lưu giữ để sử dụng lại khi bật.
 *
 * Công tắc và thanh trượt lưu ngay khi thao tác. Ô JSON lưu khi rời ô và chỉ lưu khi cú pháp hợp lệ.
 */

function SliderSetting({
  field,
  entry,
  disabledReason,
  actions
}: {
  field: SliderField
  entry: ModelEntryView
  /** Khi có, ô bị khóa và lý do hiện ngay dưới tiêu đề. */
  disabledReason?: string
  actions: ModelEntryActions
}): JSX.Element {
  const saved = advancedFormOf(entry.settings)[field]
  const [value, setValue] = useState(saved.value)
  const [error, setError] = useState<string | undefined>()
  const range = SLIDER_RANGE[field]
  const copy = ADVANCED_HINTS[field]
  const locked = disabledReason !== undefined

  async function save(enabled: boolean, next: number): Promise<void> {
    const outcome = await actions.update(entry.id, {
      settings: sliderPatch(field, { enabled, value: next })
    })
    setError(outcome.ok ? undefined : outcome.message)
  }

  return (
    <div className="flex flex-col gap-2 border-b border-default py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2.5">
        <Switch
          checked={saved.enabled && !locked}
          disabled={locked}
          aria-label={'Gửi ' + copy.title}
          onCheckedChange={(checked) => void save(checked, value)}
        />
        <span className="text-body-xs font-semibold">{copy.title}</span>
      </div>
      <p className="m-0 text-body-xs leading-normal text-subtle">
        {locked ? disabledReason : copy.hint}
      </p>
      <div className={saved.enabled && !locked ? undefined : 'opacity-60'}>
        <Slider
          label={copy.title}
          hideLabel
          value={value}
          min={range.min}
          max={range.max}
          step={range.step}
          format={formatSlider}
          disabled={locked}
          onChange={(next) => setValue(roundSlider(next))}
          onCommit={(next) => void save(saved.enabled, next)}
        />
      </div>
      {error !== undefined && (
        <span role="alert" className="text-body-xs text-error">
          {error}
        </span>
      )}
    </div>
  )
}

function JsonSetting({
  field,
  entry,
  actions
}: {
  field: JsonField
  entry: ModelEntryView
  actions: ModelEntryActions
}): JSX.Element {
  const saved = advancedFormOf(entry.settings)[field]
  const [text, setText] = useState(saved.text)
  const [error, setError] = useState<string | undefined>()
  const copy = ADVANCED_HINTS[field]

  /** Lưu giá trị đang gõ với công tắc cho trước; JSON không hợp lệ thì chỉ hiện lý do. */
  async function save(enabled: boolean): Promise<boolean> {
    const parsed = parseJsonField(field, text)
    if (!parsed.ok) {
      setError(parsed.message)
      return false
    }
    const outcome = await actions.update(entry.id, {
      settings: jsonPatch(field, enabled, parsed.value)
    })
    setError(outcome.ok ? undefined : outcome.message)
    return outcome.ok
  }

  return (
    <div className="flex flex-col gap-2 border-b border-default py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2.5">
        <Switch
          checked={saved.enabled}
          aria-label={'Gửi ' + copy.title}
          onCheckedChange={(checked) => void save(checked)}
        />
        <span className="text-body-xs font-semibold">{copy.title}</span>
      </div>
      <TextareaField
        label={copy.title}
        hint={copy.hint}
        error={error}
        value={text}
        spellCheck={false}
        placeholder="{}"
        rows={4}
        className="[&>label]:sr-only [&_textarea]:font-mono [&_textarea]:text-body-xs"
        onChange={(event) => {
          setText(event.target.value)
          setError(undefined)
        }}
        onBlur={() => {
          // Rời ô khi giá trị trùng với nội dung đã lưu thì không thực hiện ghi.
          if (text.trim() === saved.text.trim()) {
            setError(undefined)
            return
          }
          void save(saved.enabled)
        }}
      />
    </div>
  )
}

function AdvancedForm({
  entry,
  actions
}: {
  entry: ModelEntryView
  actions: ModelEntryActions
}): JSX.Element {
  return (
    <div className="flex flex-col">
      <SliderSetting
        field="temperature"
        entry={entry}
        actions={actions}
        disabledReason={entry.capability.temperature ? undefined : TEMPERATURE_LOCKED_HINT}
      />
      <SliderSetting field="topP" entry={entry} actions={actions} />
      <JsonSetting field="extraHeaders" entry={entry} actions={actions} />
      <JsonSetting field="extraBody" entry={entry} actions={actions} />
    </div>
  )
}

export interface ModelAdvancedDialogProps {
  entry: ModelEntryView | null
  actions: ModelEntryActions
  onOpenChange(open: boolean): void
  finalFocus?: RefObject<HTMLElement | null>
}

export function ModelAdvancedDialog({
  entry,
  actions,
  onOpenChange,
  finalFocus
}: ModelAdvancedDialogProps): JSX.Element {
  return (
    <Dialog
      open={entry !== null}
      onOpenChange={onOpenChange}
      title="Nâng cao"
      description={
        entry === null
          ? undefined
          : 'Tham số gửi kèm khi dùng “' +
            entry.name +
            '”. Chỉ tham số có công tắc bật mới được gửi; tắt thì giá trị vẫn được giữ.'
      }
      size="md"
      finalFocus={finalFocus}
    >
      {entry !== null && <AdvancedForm key={entry.id} entry={entry} actions={actions} />}
    </Dialog>
  )
}
