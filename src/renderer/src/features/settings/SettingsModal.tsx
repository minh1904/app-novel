import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { CloseIcon } from '@solar-icons/react/linear/close'
import { MinimalisticMagnifierIcon } from '@solar-icons/react/linear/minimalistic-magnifier'
import { Button } from '../../components/ui/Button'
import { CompactButton } from '../../components/ui/CompactButton'
import { cn } from '../../lib/cn'
import { menuSurfaceClass } from '../../components/ui/DropdownMenu'
import { ICON } from '../../components/ui/icon'
import { SearchInput } from '../../components/ui/Input'
import { ListOption } from '../../components/ui/ListOption'
import { NavItem } from '../../components/ui/NavItem'
import { Select } from '../../components/ui/Select'
import { useDimChrome } from '../../app/useDimChrome'
import { useUiStore } from '../../stores/uiStore'
import {
  breadcrumbOf,
  groupOf,
  SETTINGS_GROUPS,
  type SettingsGroupId,
  type SettingsLocation
} from './settingsNav'
import { searchSettings, type SettingsIndexEntry } from './settingsSearch'

/** How long a row a deep link points at stays lit (Hermes: 1.6s). */
const HIGHLIGHT_MS = 1_600

export type SettingsPages = Record<string, () => ReactNode>

function pageKey(location: SettingsLocation): string {
  return location.group + '/' + location.page
}

function Nav({
  location,
  onGo
}: {
  location: SettingsLocation
  onGo(location: SettingsLocation): void
}): JSX.Element {
  return (
    <nav aria-label="Mục cài đặt" className="flex flex-col gap-0.5 px-2.5 pt-12 pb-3">
      {SETTINGS_GROUPS.map((group) => {
        const active = group.id === location.group
        return (
          <div key={group.id} className="flex flex-col gap-0.5">
            <NavItem
              strong
              active={active}
              // A group with pages is not itself a page: only a one-page group is the current page.
              aria-current={active && group.pages.length === 1 ? 'page' : undefined}
              onClick={() => onGo({ group: group.id, page: group.pages[0].id })}
            >
              {group.label}
            </NavItem>
            {active && group.pages.length > 1 && (
              <div className="ml-3.5 flex flex-col gap-0.5 pl-1.5">
                {group.pages.map((page) => (
                  <NavItem
                    key={page.id}
                    active={page.id === location.page}
                    onClick={() => onGo({ group: group.id, page: page.id })}
                  >
                    {page.label}
                  </NavItem>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/** The narrow layout: one dropdown in place of the rail (Hermes, under 47.5rem). */
function NavDropdown({
  location,
  onGo
}: {
  location: SettingsLocation
  onGo(location: SettingsLocation): void
}): JSX.Element {
  const options = SETTINGS_GROUPS.flatMap((group) =>
    group.pages.map((page) => ({
      value: group.id + '/' + page.id,
      label: group.pages.length > 1 ? group.label + ' › ' + page.label : group.label
    }))
  )
  return (
    <Select
      label="Mục cài đặt"
      value={pageKey(location)}
      options={options}
      onChange={(value) => {
        const [group, page] = value.split('/') as [SettingsGroupId, string]
        onGo({ group, page })
      }}
    />
  )
}

function Breadcrumb({ location }: { location: SettingsLocation }): JSX.Element {
  const parts = breadcrumbOf(location)
  return (
    <div className="mb-3 flex items-center gap-1 text-body-xs text-muted">
      {parts.map((part, index) => (
        <span key={part} className="flex items-center gap-1">
          {index > 0 && <AltArrowRightIcon size={12} aria-hidden="true" />}
          <span className={index === parts.length - 1 ? 'text-default' : undefined}>{part}</span>
        </span>
      ))}
    </div>
  )
}

/** The pill that straddles the top edge of the card; it opens a filtered list of every row. */
function SearchPill({
  query,
  onQuery,
  open,
  onOpen,
  onPick,
  inputRef
}: {
  query: string
  onQuery(query: string): void
  open: boolean
  onOpen(open: boolean): void
  onPick(entry: SettingsIndexEntry): void
  inputRef: React.RefObject<HTMLInputElement | null>
}): JSX.Element {
  const hits = searchSettings(query)
  const [cursor, setCursor] = useState(0)
  return (
    <div className="absolute -top-4 left-1/2 z-(--mira-z-sticky) w-72 -translate-x-1/2">
      {open ? (
        <div className={cn(menuSurfaceClass, 'flex flex-col gap-1')}>
          <SearchInput
            ref={inputRef}
            autoFocus
            // The field opens already focused inside its own popover, so a ring adds nothing.
            className="outline-none!"
            label="Tìm trong cài đặt"
            placeholder="Tìm trong cài đặt"
            value={query}
            onChange={(event) => {
              onQuery(event.target.value)
              setCursor(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setCursor((at) => Math.min(at + 1, hits.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setCursor((at) => Math.max(at - 1, 0))
              } else if (event.key === 'Enter' && hits[cursor]) {
                event.preventDefault()
                onPick(hits[cursor])
              } else if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                onOpen(false)
              }
            }}
            onBlur={() => setTimeout(() => onOpen(false), 120)}
          />
          {query.trim() && (
            <div
              role="listbox"
              aria-label="Kết quả"
              className="flex max-h-72 flex-col overflow-y-auto"
            >
              {hits.length === 0 && (
                <span className="px-2 py-1 text-body-xs text-muted">Không có mục nào khớp</span>
              )}
              {hits.map((hit, index) => (
                <ListOption
                  key={hit.title + hit.location.key}
                  multiline
                  selected={index === cursor}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onPick(hit)}
                >
                  <span className="text-body-xs text-default">{hit.title}</span>
                  <span className="truncate text-body-xs text-muted">{hit.description}</span>
                </ListOption>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center">
          <Button
            onClick={() => onOpen(true)}
            leftIcon={<MinimalisticMagnifierIcon size={ICON.sm} aria-hidden="true" />}
          >
            Tìm trong cài đặt
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * The Settings modal, after Hermes Desktop's settings overlay (change `hermes-settings-modal`): a card over
 * the app with a 13rem rail, a breadcrumb in place of a page title, a search pill on the top edge, and deep
 * links that land on a row and light it up.
 */
export function SettingsModal({ pages }: { pages: SettingsPages }): JSX.Element {
  const location = useUiStore((state) => state.settings)
  const openSettings = useUiStore((state) => state.openSettings)
  const closeSettings = useUiStore((state) => state.closeSettings)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const searchInput = useRef<HTMLInputElement | null>(null)
  const content = useRef<HTMLDivElement | null>(null)
  useDimChrome(location !== null)

  // A deep link's key: scroll its row into view and light it for a moment.
  const key = location?.key
  const page = location ? pageKey(location) : null
  useEffect(() => {
    if (!key || !content.current) return undefined
    const frame = requestAnimationFrame(() => {
      const target = content.current?.querySelector<HTMLElement>(
        '[data-setting-id="' + CSS.escape(key) + '"]'
      )
      if (!target) return
      target.scrollIntoView({ block: 'center' })
      target.classList.add('setting-highlight')
      setTimeout(() => target.classList.remove('setting-highlight'), HIGHLIGHT_MS)
    })
    return () => cancelAnimationFrame(frame)
  }, [key, page])

  function go(next: SettingsLocation): void {
    openSettings(next)
    content.current?.scrollTo({ top: 0 })
  }

  const render = location ? pages[pageKey(location)] : undefined
  const group = location ? groupOf(location.group) : null

  return (
    <BaseDialog.Root
      open={location !== null}
      onOpenChange={(open) => {
        if (!open) {
          closeSettings()
          setSearching(false)
          setQuery('')
        }
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-(--mira-z-backdrop) bg-backdrop backdrop-blur-[0.125rem] transition-opacity duration-(--mira-duration-base) data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <BaseDialog.Popup
          aria-label="Cài đặt"
          initialFocus={content}
          onKeyDown={(event) => {
            // Type to search, as in Hermes: a printable key outside a field opens the search with that key.
            const target = event.target as HTMLElement
            const inField = target.closest('input, textarea, select, [contenteditable="true"]')
            if (
              !inField &&
              !searching &&
              event.key.length === 1 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              setQuery(event.key)
              setSearching(true)
              event.preventDefault()
            }
          }}
          className="fixed inset-x-[clamp(1rem,4vw,3rem)] top-[calc(var(--mira-header-height)+0.875rem)] bottom-4 z-(--mira-z-modal) mx-auto flex max-w-[75rem] flex-col rounded-lg border border-strong bg-surface text-default shadow-lg outline-none"
        >
          {group && location && (
            <>
              <SearchPill
                query={query}
                onQuery={setQuery}
                open={searching}
                onOpen={(open) => {
                  setSearching(open)
                  if (!open) setQuery('')
                }}
                onPick={(entry) => {
                  setSearching(false)
                  setQuery('')
                  go(entry.location)
                }}
                inputRef={searchInput}
              />
              <BaseDialog.Close
                render={
                  <CompactButton
                    aria-label="Đóng cài đặt"
                    className="absolute top-2 right-2 z-(--mira-z-sticky)"
                    icon={<CloseIcon size={ICON.sm} />}
                  />
                }
              />
              <div className="@container flex min-h-0 flex-1">
                <div className="grid min-h-0 w-full flex-1 grid-cols-[minmax(0,1fr)] @[47.5rem]:grid-cols-[13rem_minmax(0,1fr)]">
                  <aside className="hidden min-h-0 overflow-y-auto rounded-l-lg bg-subtle @[47.5rem]:block">
                    <Nav location={location} onGo={go} />
                  </aside>
                  <div ref={content} tabIndex={-1} className="min-h-0 overflow-y-auto outline-none">
                    <div className="mx-auto w-full max-w-[75rem] px-[clamp(1.25rem,4vw,4rem)] pt-10 pb-20">
                      <div className="mb-3 @[47.5rem]:hidden">
                        <NavDropdown location={location} onGo={go} />
                      </div>
                      <Breadcrumb location={location} />
                      <BaseDialog.Title className="sr-only">
                        {breadcrumbOf(location).join(' › ')}
                      </BaseDialog.Title>
                      {render ? render() : null}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}
