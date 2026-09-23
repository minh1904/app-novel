import type { JSX } from 'react'
import { AltArrowLeftIcon } from '@solar-icons/react/linear/alt-arrow-left'
import { Button } from '../components/Button'

/** Destination for flows whose screens are not built yet, so shell navigation stays testable. */
export function PendingScreen({
  heading,
  detail,
  onBack
}: {
  heading: string
  detail: string
  onBack(): void
}): JSX.Element {
  return (
    <div className="mx-auto flex min-h-full max-w-[560px] flex-col justify-center gap-3 px-8 py-12">
      <h2 className="text-[22px] font-semibold tracking-[-0.04em]">{heading}</h2>
      <p className="text-[13px] leading-[1.6] text-ink-muted">{detail}</p>
      <div className="mt-2">
        <Button variant="secondary" onClick={onBack}>
          <AltArrowLeftIcon size={14} />
          Về thư viện
        </Button>
      </div>
    </div>
  )
}
