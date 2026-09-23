import type { JSX } from 'react'
import { cx } from '../../components/cx'
import { languages, type Work } from './works'

const sizes = {
  xs: 'h-9 w-7 rounded-[6px] text-[12px]',
  sm: 'h-16 w-12 rounded-[8px] text-[17px]',
  md: 'h-[88px] w-16 rounded-control text-[24px]',
  lg: 'h-24 w-[72px] rounded-control text-[28px]'
}

/**
 * A book-shaped cover. Without an uploaded image the work is identified by the script it is
 * translated from; `lang` lets Windows pick a CJK font, since Google Sans Flex has none.
 */
export function WorkCover({
  work,
  size = 'sm',
  className
}: {
  work: Pick<Work, 'coverUrl' | 'sourceLanguage'>
  size?: keyof typeof sizes
  className?: string
}): JSX.Element {
  const base = cx('shrink-0 overflow-hidden border border-line', sizes[size], className)

  if (work.coverUrl) {
    return <img src={work.coverUrl} alt="" className={cx(base, 'object-cover')} />
  }

  return (
    <span
      lang={work.sourceLanguage}
      aria-hidden="true"
      className={cx(
        base,
        'inline-flex items-center justify-center bg-control leading-none font-medium tracking-[-0.02em] text-ink select-none'
      )}
    >
      {languages[work.sourceLanguage].glyph}
    </span>
  )
}
