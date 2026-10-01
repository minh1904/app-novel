import { Component, useEffect, useRef, type ErrorInfo, type JSX, type ReactNode } from 'react'
import { Button } from '../../components/Button'
import { TabsList, TabsPanel, TabsRoot, TabsTab } from '../../components/Tabs'
import { SOON_LABEL } from './mockFeatures'
import type { WorkArea, WorkAreaProps } from './workArea'

/** Keeps one area's failure inside that area; the header and the other areas stay usable. */
class AreaBoundary extends Component<{ label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Khu vực “' + this.props.label + '” bị lỗi:', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="flex flex-col items-start gap-3 py-8 text-[13px]">
        <p>
          Không hiển thị được khu vực “{this.props.label}”. Tác phẩm và dữ liệu không bị ảnh hưởng.
        </p>
        <Button size="lg" variant="secondary" onClick={() => this.setState({ failed: false })}>
          Thử lại
        </Button>
      </div>
    )
  }
}

export interface WorkAreaHostProps {
  areas: ReadonlyArray<WorkArea>
  selectedId: string
  onSelect(id: string): void
  areaProps: WorkAreaProps
}

/**
 * The content region of the work detail screen. With one area it shows that area directly: there
 * is no tab bar for a single choice. From two areas it shows the tab bar, in registration order.
 */
export function WorkAreaHost({
  areas,
  selectedId,
  onSelect,
  areaProps
}: WorkAreaHostProps): JSX.Element | null {
  const active = areas.find((area) => area.id === selectedId) ?? areas[0]
  const panel = useRef<HTMLDivElement>(null)
  const previous = useRef(active?.id)

  // After the user switches area, move focus into it so keyboard and screen-reader users land there.
  useEffect(() => {
    if (previous.current !== active?.id) panel.current?.focus()
    previous.current = active?.id
  }, [active?.id])

  if (!active) return null

  const body = (area: WorkArea): JSX.Element => (
    <AreaBoundary key={area.id + areaProps.workId} label={area.label}>
      {area.render(areaProps)}
    </AreaBoundary>
  )

  if (areas.length === 1) return body(active)

  return (
    <TabsRoot value={active.id} onValueChange={(value) => onSelect(String(value))}>
      <TabsList className="max-w-full overflow-x-auto" aria-label="Khu vực của tác phẩm">
        {areas.map((area) => (
          <TabsTab key={area.id} value={area.id} className="shrink-0">
            {area.label}
            {area.soon && (
              <span className="ml-1.5 rounded-[5px] bg-selected px-1 py-px text-[11px] text-ink">
                {SOON_LABEL}
              </span>
            )}
          </TabsTab>
        ))}
      </TabsList>
      {areas.map((area) => (
        <TabsPanel key={area.id} value={area.id} className="pt-5 outline-none">
          <div
            ref={area.id === active.id ? panel : undefined}
            tabIndex={-1}
            className="outline-none"
          >
            {area.id === active.id && body(area)}
          </div>
        </TabsPanel>
      ))}
    </TabsRoot>
  )
}
