import { useId, useState, type JSX } from 'react'
import { AltArrowRightIcon } from '@solar-icons/react/linear/alt-arrow-right'
import { CheckIcon } from '@solar-icons/react/linear/check'
import { CopyIcon } from '@solar-icons/react/linear/copy'
import { DangerCircleIcon } from '@solar-icons/react/linear/danger-circle'
import { RefreshIcon } from '@solar-icons/react/linear/refresh'
import { Button } from '../../components/Button'
import { cx } from '../../components/cx'
import { SAMPLE, type ToolStep } from './aiChatSample'

/** Collapsed by default, both while running and once done — using a tool is routine, not a result. */
function ToolSteps({ head, steps }: { head: string; steps: ToolStep[] }): JSX.Element {
  const [open, setOpen] = useState(false)
  const listId = useId()

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-6 w-fit cursor-pointer items-center gap-1.5 text-[11px] text-ink-muted outline-none hover:text-ink focus-visible:text-ink"
      >
        <AltArrowRightIcon
          size={14}
          className={cx('shrink-0 transition-transform', open && 'rotate-90')}
        />
        <span>{head}</span>
      </button>
      {/* grid-rows 0fr -> 1fr so the list slides instead of popping; `inert` keeps the closed rows
          out of Tab order without unmounting them. */}
      <div
        className={cx(
          'grid transition-[grid-template-rows] duration-200',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden" id={listId} inert={!open}>
          <ul className="mt-2 ml-[7px] space-y-2 border-l border-line-strong pl-4">
            {steps.map((step) => (
              <li key={step.label} className="flex gap-1.5">
                {step.state === 'error' ? (
                  <DangerCircleIcon size={14} className="mt-px shrink-0 text-error" />
                ) : (
                  <CheckIcon size={14} className="mt-px shrink-0 text-ink-muted" />
                )}
                <div className="min-w-0">
                  <p className="text-[12px] text-ink">{step.label}</p>
                  <p className="text-[11px] leading-[1.5] text-ink-muted">{step.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** Copy and regenerate. -ml-[7px] pulls the first icon flush with the answer text (size-7 box, 14px icon). */
function ActionRow(): JSX.Element {
  return (
    <div className="-ml-[7px] flex items-center gap-0.5 pt-0.5">
      {[
        { icon: <CopyIcon size={14} />, label: 'Sao chép' },
        { icon: <RefreshIcon size={14} />, label: 'Tạo lại' }
      ].map((action) => (
        <button
          key={action.label}
          type="button"
          disabled
          aria-label={action.label}
          title="Chưa nối provider"
          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-muted hover:bg-selected hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {action.icon}
        </button>
      ))}
    </div>
  )
}

/**
 * One question and its answer. Everything is the fixed sample in `aiChatSample.ts`; the three
 * actions that would write into the translation stay disabled until there is a provider.
 */
export function AiTurn(): JSX.Element {
  return (
    <>
      <p className="ml-auto w-fit max-w-[85%] rounded-control bg-control px-2.5 py-1.5 text-[13px] leading-[1.55] whitespace-pre-wrap [overflow-wrap:anywhere]">
        {SAMPLE.question}
      </p>

      <div className="space-y-2.5">
        <ToolSteps head="Đã dùng 3 công cụ" steps={[...SAMPLE.steps]} />

        <div className="space-y-2 text-[13px] leading-[1.65]">
          <p>{SAMPLE.lead}</p>
          <p>{SAMPLE.proposal}</p>
          <p className="text-[12px] text-ink-muted">{SAMPLE.note}</p>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button size="xs" disabled>
            Áp dụng
          </Button>
          <Button size="xs" variant="outline" disabled>
            Chèn ở con trỏ
          </Button>
          <Button size="xs" variant="outline" disabled>
            Sao chép
          </Button>
        </div>

        <ActionRow />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] text-ink-muted">Hỏi tiếp</p>
        {SAMPLE.suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled
            title="Chưa nối provider"
            className="block w-fit max-w-full cursor-pointer rounded-control border border-line-strong bg-control px-2.5 py-1.5 text-left text-[12.5px] text-ink hover:bg-selected disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </>
  )
}
