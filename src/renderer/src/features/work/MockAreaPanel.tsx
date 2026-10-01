import type { JSX } from 'react'
import { SOON_LABEL } from './mockFeatures'

/**
 * Body of an area that exists only as a picture. It describes what the area will hold and offers
 * nothing to click: no data is read or written. See delivery/backlog.md for each area's status.
 */
export function MockAreaPanel({
  title,
  summary,
  items
}: {
  title: string
  summary: string
  items: ReadonlyArray<{ name: string; detail: string }>
}): JSX.Element {
  return (
    <section
      aria-labelledby="mock-area-heading"
      className="@container flex flex-col gap-4 rounded-panel border border-dashed border-line-strong p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="mock-area-heading" className="flex items-center gap-2 text-[15px] font-semibold">
          {title}
          <span className="rounded-[5px] bg-selected px-1.5 py-px text-[11px] font-normal text-ink">
            {SOON_LABEL}
          </span>
        </h2>
        <p className="max-w-[60ch] text-xs leading-[1.6] text-ink-muted">{summary}</p>
      </div>
      <ul className="grid gap-3 @min-[560px]:grid-cols-2">
        {items.map((item) => (
          <li key={item.name} className="flex flex-col gap-0.5 rounded-control bg-control/50 p-3">
            <span className="text-[13px] font-medium">{item.name}</span>
            <span className="text-xs leading-[1.5] text-ink-muted">{item.detail}</span>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-ink-muted">
        Bản minh họa: khu vực này chưa hoạt động và không thay đổi tác phẩm của bạn.
      </p>
    </section>
  )
}
