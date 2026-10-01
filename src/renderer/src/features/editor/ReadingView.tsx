import { useMemo, type JSX } from 'react'
import { readingBlocks } from './readingParagraphs'

/**
 * The text laid out to be read, not edited: paragraphs with room between them, a comfortable size
 * and line height, nothing about segments. It shows the text it is given and never changes it.
 */
export function ReadingView({
  text,
  lang,
  label
}: {
  text: string
  lang: string
  label: string
}): JSX.Element {
  const blocks = useMemo(() => readingBlocks(text), [text])

  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      lang={lang}
      className="h-full min-h-0 overflow-y-auto rounded-panel border border-line px-6 py-5 text-[15px] leading-[1.9] outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
    >
      {blocks.length === 0 ? (
        <p className="text-ink-muted">Chưa có bản dịch để đọc.</p>
      ) : (
        blocks.map((block, index) =>
          block.kind === 'gap' ? (
            <div key={index} aria-hidden="true" className="h-4" />
          ) : (
            <p key={index} className="break-words whitespace-pre-wrap">
              {block.text}
            </p>
          )
        )
      )}
    </div>
  )
}
