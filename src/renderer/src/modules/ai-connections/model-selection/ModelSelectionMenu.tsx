import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { AccountUsageChip } from '../settings/AccountsPage'
import { Popover } from '@base-ui/react/popover'
import { AddCircleIcon } from '@solar-icons/react/linear/add-circle'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { RestartIcon } from '@solar-icons/react/linear/restart'
import { SettingsIcon } from '@solar-icons/react/linear/settings'
import { StarIcon } from '@solar-icons/react/linear/star'
import { StarIcon as StarFilledIcon } from '@solar-icons/react/bold/star'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import { THINKING_LEVELS, type ModelEntryView } from '../../../../../shared/contracts/modelSettings'
import { cn } from '../../../lib/cn'
import { Button } from '../../../components/ui/Button'
import { CompactButton } from '../../../components/ui/CompactButton'
import { Disclosure } from '../../../components/ui/Disclosure'
import { menuItemClass, menuSurfaceClass } from '../../../components/ui/DropdownMenu'
import { ICON } from '../../../components/ui/icon'
import { Input } from '../../../components/ui/Input'
import { ListOption } from '../../../components/ui/ListOption'
import { PickerTrigger } from '../../../components/ui/PickerTrigger'
import { Switch } from '../../../components/ui/Switch'
import {
  buildMenuRows,
  favoriteKey,
  stepModelRow,
  THINKING_TAGS,
  type MenuRow
} from './modelMenuModel'
import {
  DEFAULT_THINKING_LABEL,
  THINKING_LABELS,
  thinkingChoiceOf,
  type ThinkingChoice
} from './modelSettingsForm'

/**
 * Một menu để chọn **mục model và mức suy luận của nó**, theo menu model của Hermes Desktop (change
 * `hermes-settings-modal`, spec `model-picker`): ô tìm, nhóm Yêu thích, nhóm theo kết nối, nhãn mức đang
 * đặt, submenu "Tùy chọn / Mức", và các lối tắt ở cuối. Dùng ở ô soạn chat và hộp thoại dịch, nên hai nơi
 * không thể lệch nhau về cái được đưa ra.
 *
 * Ô tìm giữ focus suốt lúc menu mở và tự điều khiển dòng đang chọn (kiểu combobox), nên gõ chữ luôn vào ô
 * tìm thay vì bị bộ nhảy-theo-chữ của menu giành lấy.
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
  /** `compact` là pill trên ô soạn chat; `field` là một ô đủ rộng trong hộp thoại. */
  variant?: 'compact' | 'field'
  /** Nhãn đọc được cho trình đọc màn hình, ví dụ "Model để dịch". */
  label: string
  /** The selection differs from the main model of Settings: the pill gets an accent dot. */
  overridesMain?: boolean
  /** "Dùng mặc định trong Cài đặt": drop this chat's own pick. Shown only with `overridesMain`. */
  onUseDefault?(): void
  /** "Tải lại model". */
  onRefresh?(): void
  /** "Thêm model tùy chỉnh…": add an entry with this model id to the connection in use. */
  onAddCustom?(connectionId: string, modelId: string): Promise<ModelSelection | null>
  /** "Sửa danh sách model…" / "Thêm nhà cung cấp": open Settings at that connection, or at the start. */
  onOpenSettings?(connectionId: string | null): void
  /** Controlled open state, for the Ctrl+Shift+M shortcut. */
  open?: boolean
  onOpenChange?(open: boolean): void
}

const FAVORITES_KEY = 'mira.model-favorites'
const COLLAPSED_KEY = 'mira.model-groups-collapsed'

/** A per-device convenience set; storage that is unavailable just means an empty set. */
function usePersistentSet(key: string): [Set<string>, (item: string) => void] {
  const [items, setItems] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(key)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [])
    } catch {
      return new Set()
    }
  })
  const toggle = (item: string): void =>
    setItems((current) => {
      const next = new Set(current)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      try {
        localStorage.setItem(key, JSON.stringify([...next]))
      } catch {
        // Not remembered; it still holds until the app closes.
      }
      return next
    })
  return [items, toggle]
}

/** A footer action of the menu: a ghost button laid out as a full-width row. */
const FOOTER_ACTION = 'w-full justify-start'

/** "Tùy chọn: Suy luận" and "Mức", for one entry. */
export function ThinkingPanel({
  entry,
  onChoose
}: {
  entry: ModelEntryView
  onChoose(choice: ThinkingChoice): void
}): JSX.Element {
  const levels = THINKING_LEVELS.filter(
    (level) => level !== 'off' && entry.capability.thinkingLevels.includes(level)
  )
  const canTurnOff = entry.capability.thinkingLevels.includes('off')
  const current = thinkingChoiceOf(entry.settings)
  return (
    <div className="flex w-48 flex-col">
      {canTurnOff && (
        <>
          <span className="px-2 pt-1 pb-0.5 text-body-xs font-medium text-muted uppercase">
            Tùy chọn
          </span>
          <label className={cn(menuItemClass, 'justify-between')}>
            Suy luận
            <Switch
              aria-label="Suy luận"
              checked={current !== 'off'}
              onCheckedChange={(checked) => onChoose(checked ? 'default' : 'off')}
            />
          </label>
          <div className="-mx-1 my-1 h-px bg-line" />
        </>
      )}
      <span className="px-2 pt-1 pb-0.5 text-body-xs font-medium text-muted uppercase">Mức</span>
      <div role="listbox" aria-label="Mức suy luận" className="flex flex-col">
        {levels.map((level) => (
          <ListOption
            key={level}
            selected={current === level}
            className="justify-between"
            onClick={() => onChoose(level)}
          >
            {THINKING_LABELS[level]}
            {current === level && <CheckIcon size={ICON.xs} />}
          </ListOption>
        ))}
        <ListOption
          selected={current === 'default'}
          className="justify-between"
          onClick={() => onChoose('default')}
        >
          {DEFAULT_THINKING_LABEL}
          {current === 'default' && <CheckIcon size={ICON.xs} />}
        </ListOption>
      </div>
    </div>
  )
}

export function ModelSelectionMenu({
  connections,
  selected,
  onSelect,
  onSelectThinking,
  onOpen,
  disabled = false,
  variant = 'compact',
  label,
  overridesMain = false,
  onUseDefault,
  onRefresh,
  onAddCustom,
  onOpenSettings,
  open: openProp,
  onOpenChange
}: ModelSelectionMenuProps): JSX.Element {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = (next: boolean): void => {
    setOpenState(next)
    onOpenChange?.(next)
    if (next) onOpen?.()
  }
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [favorites, toggleFavorite] = usePersistentSet(FAVORITES_KEY)
  const [collapsed, toggleCollapsed] = usePersistentSet(COLLAPSED_KEY)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [flyout, setFlyout] = useState<string | null>(null)
  const rowRefs = useRef(new Map<string, HTMLElement>())
  const input = useRef<HTMLInputElement | null>(null)

  const rows = useMemo(
    () => (adding ? [] : buildMenuRows(connections, query, favorites, collapsed)),
    [adding, connections, query, favorites, collapsed]
  )

  const chosenConnection = connections.find(
    (connection) => connection.id === selected?.connectionId
  )
  const chosen = chosenConnection?.models.find((entry) => entry.id === selected?.entryId)
  const withEntries = connections.filter(
    (connection) => connection.enabled && connection.models.length > 0
  )

  // Closing (by the person or by the shortcut) starts the next opening clean; adjusted while rendering.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) {
      setQuery('')
      setAdding(false)
      setFlyout(null)
      setActiveId(null)
    }
  }

  // The row under the keyboard: the one the person moved to, else the chosen model, else the first model.
  const chosenIndex = rows.findIndex(
    (row) =>
      row.type === 'model' &&
      row.connection.id === selected?.connectionId &&
      row.entry.id === selected?.entryId
  )
  const movedIndex = activeId === null ? -1 : rows.findIndex((row) => row.id === activeId)
  const active =
    movedIndex >= 0 ? movedIndex : chosenIndex >= 0 ? chosenIndex : stepModelRow(rows, -1, 1)
  const activeRow = rows[active]
  useEffect(() => {
    if (activeRow) rowRefs.current.get(activeRow.id)?.scrollIntoView({ block: 'nearest' })
  }, [activeRow])

  function choose(row: Extract<MenuRow, { type: 'model' }>, choice?: ThinkingChoice): void {
    const here = { connectionId: row.connection.id, entryId: row.entry.id }
    if (choice === undefined) onSelect(here)
    else onSelectThinking(here, choice)
    setOpen(false)
  }

  async function addCustom(): Promise<void> {
    const modelId = query.trim()
    const connectionId = selected?.connectionId ?? withEntries[0]?.id
    if (!modelId || !connectionId || !onAddCustom) return
    const added = await onAddCustom(connectionId, modelId)
    if (added) {
      onSelect(added)
      setOpen(false)
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (adding) {
      if (event.key === 'Enter') {
        event.preventDefault()
        void addCustom()
      }
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setFlyout(null)
      const next = stepModelRow(rows, active, event.key === 'ArrowDown' ? 1 : -1)
      setActiveId(rows[next]?.id ?? null)
    } else if (event.key === 'Enter' && activeRow?.type === 'model') {
      event.preventDefault()
      if (event.shiftKey) toggleFavorite(favoriteKey(activeRow.connection.id, activeRow.entry.id))
      else choose(activeRow)
    } else if (event.key === 'ArrowRight' && activeRow?.type === 'model' && query === '') {
      event.preventDefault()
      setFlyout(activeRow.id)
    } else if (event.key === 'ArrowLeft' && flyout) {
      event.preventDefault()
      setFlyout(null)
    }
  }

  const text = chosen ? chosen.name : 'chưa có model'
  const tag = chosen?.settings.thinking ? THINKING_TAGS[chosen.settings.thinking] : null

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={disabled}
        aria-label={label + ': ' + text}
        title={chosenConnection ? chosenConnection.name + ' · ' + text : label}
        render={
          <PickerTrigger
            variant={variant === 'field' ? 'field' : 'ghost'}
            value={text}
            tag={tag}
            mark={
              overridesMain && (
                <span
                  role="img"
                  aria-label="Khác model chính"
                  className="size-1.5 shrink-0 rounded-full bg-inverted"
                />
              )
            }
          />
        }
      />
      <Popover.Portal>
        <Popover.Positioner
          className="z-(--mira-z-dropdown)"
          side={variant === 'compact' ? 'top' : 'bottom'}
          align="start"
          sideOffset={6}
        >
          <Popover.Popup
            initialFocus={input}
            className={cn(menuSurfaceClass, 'flex w-80 flex-col')}
          >
            <Input
              ref={input}
              role="combobox"
              aria-expanded="true"
              aria-controls="model-menu-list"
              aria-activedescendant={activeRow ? 'model-row-' + activeRow.id : undefined}
              aria-label={adding ? 'Id model mới' : 'Tìm model'}
              placeholder={adding ? 'Gõ id model, ví dụ openai/gpt-5.5' : 'Tìm model'}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              leftIcon={<MinimalisticMagnifierIcon size={ICON.sm} aria-hidden="true" />}
              className="mb-1"
            />

            {!adding && (
              <div
                id="model-menu-list"
                role="listbox"
                aria-label={label}
                className="max-h-80 overflow-y-auto py-1"
              >
                {rows.length === 0 && (
                  <span className="block px-2 py-1.5 text-body-xs text-muted">
                    {withEntries.length === 0 ? 'Chưa có model nào.' : 'Không có model nào khớp.'}
                  </span>
                )}
                {rows.map((row, index) => {
                  if (row.type === 'header') {
                    const connectionId = row.connectionId
                    return (
                      // Pressing a header must not take focus from the search field.
                      // biome-ignore lint/a11y/noStaticElementInteractions: only keeps focus in place.
                      <div
                        key={row.id}
                        className="px-2 pt-1.5 pb-0.5"
                        onMouseDown={(event) => event.preventDefault()}
                      >
                        {connectionId ? (
                          <Disclosure
                            open={!row.collapsed}
                            onOpenChange={() => toggleCollapsed(connectionId)}
                            tabIndex={-1}
                            className="font-medium"
                            label={
                              <span className="flex items-center gap-1">
                                {row.label}
                                <AccountUsageChip
                                  connection={connections.find((item) => item.id === connectionId)}
                                />
                              </span>
                            }
                          />
                        ) : (
                          <span className="block text-body-xs font-medium text-muted">
                            {row.label}
                          </span>
                        )}
                      </div>
                    )
                  }
                  const isSelected =
                    selected?.connectionId === row.connection.id &&
                    selected.entryId === row.entry.id
                  const level = row.entry.settings.thinking
                  const hasLevels = row.entry.capability.thinkingLevels.length > 0
                  return (
                    <Popover.Root
                      key={row.id}
                      open={flyout === row.id}
                      onOpenChange={(next) => setFlyout(next ? row.id : null)}
                    >
                      {/* The option spans the row; the star and the levels trigger sit over its ends,
                          so no button nests in another. Pressing any of them keeps focus in the search. */}
                      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover moves the cursor only. */}
                      <div
                        className="relative"
                        ref={(element) => {
                          if (element) rowRefs.current.set(row.id, element)
                          else rowRefs.current.delete(row.id)
                        }}
                        onMouseEnter={() => setActiveId(row.id)}
                        onMouseDown={(event) => event.preventDefault()}
                      >
                        <ListOption
                          id={'model-row-' + row.id}
                          tabIndex={-1}
                          selected={index === active}
                          onClick={() => choose(row)}
                          className="pr-8 pl-8"
                        >
                          <span className="min-w-0 flex-1 truncate text-default">
                            {row.entry.name}
                          </span>
                          {level && (
                            <span className="shrink-0 rounded-xs border border-default px-1 text-body-xs leading-tight text-subtle">
                              {THINKING_TAGS[level]}
                            </span>
                          )}
                          {isSelected && (
                            <CheckIcon size={ICON.xs} className="shrink-0 text-default" />
                          )}
                        </ListOption>
                        <CompactButton
                          tabIndex={-1}
                          aria-label={row.favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                          onClick={() =>
                            toggleFavorite(favoriteKey(row.connection.id, row.entry.id))
                          }
                          className="absolute top-1 left-1"
                          icon={
                            row.favorite ? (
                              <StarFilledIcon size={ICON.sm} className="text-warning" />
                            ) : (
                              <StarIcon size={ICON.sm} />
                            )
                          }
                        />
                        <Popover.Trigger
                          openOnHover
                          delay={120}
                          disabled={
                            !hasLevels && !row.entry.capability.thinkingLevels.includes('off')
                          }
                          render={
                            <CompactButton
                              tabIndex={-1}
                              aria-label={'Suy luận của ' + row.entry.name}
                              className="absolute top-1 right-1"
                              icon={<AltArrowRightIcon size={ICON.sm} />}
                            />
                          }
                        />
                      </div>
                      <Popover.Portal>
                        <Popover.Positioner
                          className="z-(--mira-z-dropdown)"
                          // The chat pill sits at the right edge of the window: open the levels to the left there.
                          side={variant === 'compact' ? 'left' : 'right'}
                          align="start"
                          sideOffset={8}
                        >
                          <Popover.Popup className={menuSurfaceClass}>
                            <ThinkingPanel
                              entry={row.entry}
                              onChoose={(choice) => choose(row, choice)}
                            />
                          </Popover.Popup>
                        </Popover.Positioner>
                      </Popover.Portal>
                    </Popover.Root>
                  )
                })}
              </div>
            )}

            <div className="-mx-1 my-1 h-px bg-line" />
            <div className="flex flex-col">
              {adding ? (
                <Button
                  variant="ghost"
                  className={FOOTER_ACTION}
                  leftIcon={<AddCircleIcon size={ICON.sm} />}
                  onClick={() => void addCustom()}
                >
                  Thêm {query.trim() ? '“' + query.trim() + '”' : 'model'}
                </Button>
              ) : (
                <>
                  {overridesMain && onUseDefault && (
                    <Button
                      variant="ghost"
                      className={FOOTER_ACTION}
                      leftIcon={<RestartIcon size={ICON.sm} />}
                      onClick={() => {
                        onUseDefault()
                        setOpen(false)
                      }}
                    >
                      Dùng mặc định trong Cài đặt
                    </Button>
                  )}
                  {onRefresh && (
                    <Button
                      variant="ghost"
                      className={FOOTER_ACTION}
                      leftIcon={<RefreshIcon size={ICON.sm} />}
                      onClick={onRefresh}
                    >
                      Tải lại model
                    </Button>
                  )}
                  {onAddCustom && withEntries.length > 0 && (
                    <Button
                      variant="ghost"
                      className={FOOTER_ACTION}
                      leftIcon={<AddCircleIcon size={ICON.sm} />}
                      onClick={() => {
                        setAdding(true)
                        setQuery('')
                        input.current?.focus()
                      }}
                    >
                      Thêm model tùy chỉnh…
                    </Button>
                  )}
                  {onOpenSettings && (
                    <Button
                      variant="ghost"
                      className={FOOTER_ACTION}
                      leftIcon={<SettingsIcon size={ICON.sm} />}
                      onClick={() => {
                        setOpen(false)
                        onOpenSettings(
                          withEntries.length > 0 ? (selected?.connectionId ?? null) : null
                        )
                      }}
                    >
                      {withEntries.length > 0 ? 'Sửa danh sách model…' : 'Thêm nhà cung cấp'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
