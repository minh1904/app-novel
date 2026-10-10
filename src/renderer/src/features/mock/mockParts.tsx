import type { JSX } from 'react'
import { cn } from '../../lib/cn'

/**
 * Pieces shared by the pictures of features that do not exist yet (MOCK_FEATURES). Nothing here reads
 * a work or calls the main process: the sample works are fixed text.
 */

/** A sample work: the first character of its source title stands in for a cover, as WorkCover does. */
export interface MockWork {
  char: string
  lang: 'zh' | 'ja'
  title: string
}

export const MOCK_WORKS = {
  pntt: { char: '凡', lang: 'zh', title: 'Phàm Nhân Tu Tiên' },
  qbcc: { char: '诡', lang: 'zh', title: 'Quỷ Bí Chi Chủ' },
  kl: { char: '剑', lang: 'zh', title: 'Kiếm Lai' },
  dtcd: { char: '夜', lang: 'zh', title: 'Danh Thuật Của Đêm' },
  dqdt: { char: '道', lang: 'zh', title: 'Đạo Quỷ Dị Tiên' },
  slime: { char: '転', lang: 'ja', title: 'Chuyển Sinh Thành Slime' },
  tcct: { char: '全', lang: 'zh', title: 'Toàn Chức Cao Thủ' }
} as const satisfies Record<string, MockWork>

const SIZES = {
  xs: 'h-5 w-4 rounded-xs text-label-xs',
  sm: 'h-9 w-7 rounded-xs text-label-sm',
  md: 'h-16 w-12 rounded-sm text-title'
}

export function MockCover({
  work,
  size = 'sm'
}: {
  work: MockWork
  size?: keyof typeof SIZES
}): JSX.Element {
  return (
    <span
      lang={work.lang}
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden border border-default bg-muted leading-none text-default select-none',
        SIZES[size]
      )}
    >
      {work.char}
    </span>
  )
}
