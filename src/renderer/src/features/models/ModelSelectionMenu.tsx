import { useState, type JSX } from 'react'
import { AltArrowDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { CheckIcon } from '@solar-icons/react/linear/check'
import type { ConnectionView } from '../../../../shared/contracts/aiConnections'
import { cx } from '../../components/cx'
import {
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuSeparator,
  MenuSubmenu,
  MenuSubmenuPopup,
  MenuSubmenuTrigger,
  MenuTrigger
} from '../../components/Menu'
import {
  entryLabel,
  thinkingChoiceOf,
  thinkingLabelOf,
  thinkingOptions,
  type ThinkingChoice
} from './modelSettingsForm'

/**
 * Một menu duy nhất để chọn **mục model và mức suy luận của nó**: kết nối → mục → các mức mà model của mục
 * hỗ trợ. Dùng ở hộp thoại dịch và ở ô soạn chat (change `ai-model-settings`, design D11), nên hai nơi không
 * thể lệch nhau về cái được đưa ra.
 *
 * Cấu trúc theo LinguaGacha: bấm một mục là chọn nó và đóng menu; rê hay nhấn mũi tên phải để mở các mức, và
 * chọn một mức là chọn mục đó **và ghi mức vào mục** như mọi cài đặt khác. Chỉ những mức model hỗ trợ được
 * đưa ra; "Mặc định" luôn có, ở cuối, và là không gửi gì.
 */

export interface ModelSelection {
  connectionId: string
  entryId: string
}

export interface ModelSelectionMenuProps {
  /** Các kết nối dùng được (đang bật). Kết nối chưa có mục nào không hiện. */
  connections: readonly ConnectionView[]
  selected: ModelSelection | null
  /** Chọn một mục, giữ nguyên mức suy luận của nó. */
  onSelect(selection: ModelSelection): void
  /** Chọn một mức: chọn mục đó và ghi mức vào cài đặt của mục. */
  onSelectThinking(selection: ModelSelection, choice: ThinkingChoice): void
  /** Gọi mỗi khi menu mở, để nơi dùng nạp lại danh sách nếu nó sống lâu. */
  onOpen?(): void
  disabled?: boolean
  /**
   * `compact` là nút nhỏ trên thanh công cụ của ô soạn chat; `field` là một ô đủ rộng trong hộp thoại,
   * có nhãn riêng bên ngoài.
   */
  variant?: 'compact' | 'field'
  /** Nhãn đọc được cho trình đọc màn hình, ví dụ "Model để dịch". */
  label: string
}

const TRIGGER: Record<NonNullable<ModelSelectionMenuProps['variant']>, string> = {
  compact:
    'inline-flex h-6 max-w-[260px] shrink-0 cursor-pointer items-center gap-0.5 rounded-control px-1.5 text-[11px] whitespace-nowrap text-ink-muted outline-none hover:bg-selected hover:text-ink focus-visible:ring-2 focus-visible:ring-focus/40 data-popup-open:bg-selected data-popup-open:text-ink disabled:cursor-not-allowed disabled:opacity-50',
  field:
    'inline-flex h-[34px] w-full cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-canvas pr-2.5 pl-3 text-xs text-ink outline-none hover:bg-control focus-visible:ring-2 focus-visible:ring-focus/40 data-popup-open:bg-control disabled:cursor-not-allowed disabled:opacity-50'
}

export function ModelSelectionMenu({
  connections,
  selected,
  onSelect,
  onSelectThinking,
  onOpen,
  disabled = false,
  variant = 'compact',
  label
}: ModelSelectionMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)

  const withEntries = connections.filter((connection) => connection.models.length > 0)
  const chosenConnection = connections.find(
    (connection) => connection.id === selected?.connectionId
  )
  const chosen = chosenConnection?.models.find((entry) => entry.id === selected?.entryId)
  const text = chosen === undefined ? 'chưa có model' : entryLabel(chosen)

  function pick(selection: ModelSelection, choice?: ThinkingChoice): void {
    if (choice === undefined) onSelect(selection)
    else onSelectThinking(selection, choice)
    setOpen(false)
  }

  return (
    <MenuRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) onOpen?.()
      }}
    >
      <MenuTrigger
        className={TRIGGER[variant]}
        disabled={disabled || withEntries.length === 0}
        aria-label={label + ': ' + text}
        title={label}
      >
        <span className={cx('min-w-0 flex-1 truncate', variant === 'field' && 'text-left')}>
          {text}
        </span>
        <AltArrowDownIcon
          size={variant === 'field' ? 14 : 12}
          className="shrink-0 text-ink-muted"
        />
      </MenuTrigger>
      <MenuPopup align="start">
        <div className="w-[276px]">
          {withEntries.map((connection) => (
            <div key={connection.id} role="group" aria-label={connection.name}>
              <p className="m-0 px-1.5 pt-1.5 pb-0.5 text-[10px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                {connection.name}
              </p>
              {connection.models.map((entry) => {
                const here = { connectionId: connection.id, entryId: entry.id }
                const isSelected =
                  selected?.connectionId === connection.id && selected.entryId === entry.id
                const options = thinkingOptions(entry.capability, entry.settings.thinking)
                return (
                  <MenuSubmenu key={entry.id}>
                    <MenuSubmenuTrigger
                      label={entry.name}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => pick(here)}
                    >
                      <CheckIcon
                        size={14}
                        className={cx('shrink-0', isSelected ? 'text-ink' : 'opacity-0')}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12.5px]">{entry.name}</span>
                      <span className="shrink-0 text-[11px] text-ink-muted">
                        {thinkingLabelOf(entry.settings.thinking)}
                      </span>
                      <AltArrowRightIcon size={12} className="shrink-0 text-ink-muted" />
                    </MenuSubmenuTrigger>
                    <MenuSubmenuPopup>
                      <MenuRadioGroup value={thinkingChoiceOf(entry.settings)}>
                        {options.map((option) => (
                          <div key={option.value}>
                            {option.value === 'default' && options.length > 1 && <MenuSeparator />}
                            <MenuRadioItem
                              value={option.value}
                              title={option.hint}
                              onClick={() => pick(here, option.value)}
                            >
                              {option.label}
                            </MenuRadioItem>
                          </div>
                        ))}
                      </MenuRadioGroup>
                    </MenuSubmenuPopup>
                  </MenuSubmenu>
                )
              })}
            </div>
          ))}
        </div>
      </MenuPopup>
    </MenuRoot>
  )
}
