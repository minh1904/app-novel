import type { JSX } from 'react'
import { cx } from '../../components/cx'
import { languages, type SourceLanguage } from './works'

const sizes = {
  sm: 'size-7 text-[13px] rounded-[8px]',
  md: 'size-10 text-[17px] rounded-control',
  lg: 'size-16 text-[28px] rounded-panel'
}

/**
 * Stands in for a cover: a work is identified by the script it is translated from.
 * `lang` lets Windows pick a CJK font for the glyph, since Google Sans Flex has none.
 */
export function LanguageMark({
  language,
  size = 'md',
  className
}: {
  language: SourceLanguage
  size?: keyof typeof sizes
  className?: string
}): JSX.Element {
  return (
    <span
      lang={language}
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 items-center justify-center border border-line bg-control leading-none font-medium tracking-[-0.02em] text-ink select-none',
        sizes[size],
        className
      )}
    >
      {languages[language].glyph}
    </span>
  )
}
