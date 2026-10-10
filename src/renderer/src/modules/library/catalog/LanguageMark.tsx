import type { JSX } from 'react'
import { cn } from '../../../lib/cn'
import { languageMeta, type SourceLanguage } from './works'

const sizes = {
  sm: 'size-7 text-[13px] rounded-[8px]',
  md: 'size-10 text-[17px] rounded-sm',
  lg: 'size-16 text-[28px] rounded-lg'
}

/**
 * Stands in for a cover: a work is identified by the script it is translated from.
 * `lang` lets Windows pick a CJK font for the glyph, since Inter has none.
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
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-default bg-muted leading-none font-medium tracking-[-0.02em] text-default select-none',
        sizes[size],
        className
      )}
    >
      {languageMeta(language).glyph}
    </span>
  )
}
