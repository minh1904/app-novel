import type { JSX } from 'react'
import { cn } from '../../../lib/cn'
import { useCoverUrl } from './useCoverUrl'
import { languages, type Work } from './works'

const sizes = {
  xs: 'h-9 w-7 rounded-[6px] text-[12px]',
  sm: 'h-16 w-12 rounded-[8px] text-[17px]',
  md: 'h-[88px] w-16 rounded-sm text-[24px]',
  lg: 'h-24 w-[72px] rounded-sm text-[28px]',
  xl: 'h-[180px] w-[120px] rounded-sm text-[44px]'
}

/**
 * Ảnh bìa hình dáng cuốn sách. Nếu chưa tải ảnh lên, tác phẩm được đại diện bằng ký tự ngôn ngữ nguồn;
 * thuộc tính `lang` giúp hệ điều hành chọn đúng phông chữ CJK phù hợp.
 */
export function WorkCover({
  work,
  size = 'sm',
  className
}: {
  work: Pick<Work, 'id' | 'coverVersion' | 'sourceLanguage'>
  size?: keyof typeof sizes
  className?: string
}): JSX.Element {
  const base = cn('shrink-0 overflow-hidden border border-default', sizes[size], className)
  const coverUrl = useCoverUrl(work.id, work.coverVersion)

  if (coverUrl) {
    return <img src={coverUrl} alt="" className={cn(base, 'object-cover')} />
  }

  return (
    <span
      lang={work.sourceLanguage}
      aria-hidden="true"
      className={cn(
        base,
        'inline-flex items-center justify-center bg-muted leading-none font-medium tracking-[-0.02em] text-default select-none'
      )}
    >
      {languages[work.sourceLanguage].glyph}
    </span>
  )
}
