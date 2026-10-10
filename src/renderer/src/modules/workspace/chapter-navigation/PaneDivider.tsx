import type { JSX, RefObject } from 'react'
import { MAX_SOURCE_RATIO, MIN_SOURCE_RATIO } from '../store/paneLayoutStore'

const STEP = 0.05

/**
 * The line between the source and the translation, dragged to give one of them more room. Drawn as
 * the one-pixel rule the panes used to share; the grab area is wider than the line. Arrow keys move
 * it in steps, a double click puts it back in the middle.
 */
export function PaneDivider({
  ratio,
  container,
  onRatioChange
}: {
  /** Share of the container's width left of the line. */
  ratio: number
  /** The element holding both panes, which the ratio is a share of. */
  container: RefObject<HTMLElement | null>
  onRatioChange(ratio: number): void
}): JSX.Element {
  return (
    // biome-ignore lint/a11y/useSemanticElements: An <hr> cannot take focus or be dragged; a focusable separator is the ARIA pattern for a splitter.
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Chia bề rộng bản gốc và bản dịch"
      aria-valuemin={MIN_SOURCE_RATIO * 100}
      aria-valuemax={MAX_SOURCE_RATIO * 100}
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      title="Kéo để chia lại bề rộng; bấm đúp để chia đôi"
      className="group relative z-(--mira-z-sticky) w-px shrink-0 cursor-col-resize touch-none bg-line outline-none"
      onDoubleClick={() => onRatioChange(0.5)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') onRatioChange(ratio - STEP)
        else if (event.key === 'ArrowRight') onRatioChange(ratio + STEP)
        else return
        event.preventDefault()
      }}
      onPointerDown={(event) => {
        const box = container.current?.getBoundingClientRect()
        if (!box || box.width === 0) return
        event.preventDefault()
        const pointerId = event.pointerId
        const target = event.currentTarget
        target.setPointerCapture(pointerId)

        // The captured pointer reports to the divider itself. The drag ends on release, and also when the
        // capture is lost (Alt+Tab, a cancelled touch) or a move arrives with no button held, so a missed
        // pointerup cannot leave the panes following a mouse that is no longer dragging.
        const end = (): void => {
          if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId)
          target.removeEventListener('pointermove', onMove)
          target.removeEventListener('pointerup', end)
          target.removeEventListener('pointercancel', end)
          target.removeEventListener('lostpointercapture', end)
        }
        const onMove = (moveEvent: PointerEvent): void => {
          if (moveEvent.buttons === 0) {
            end()
            return
          }
          onRatioChange((moveEvent.clientX - box.left) / box.width)
        }
        target.addEventListener('pointermove', onMove)
        target.addEventListener('pointerup', end)
        target.addEventListener('pointercancel', end)
        target.addEventListener('lostpointercapture', end)
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 -left-[3px] w-[7px] transition-colors duration-(--mira-duration-fast) group-hover:bg-focus/30 group-focus-visible:bg-focus/40"
      />
    </div>
  )
}
