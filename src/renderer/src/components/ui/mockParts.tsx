import type { JSX } from 'react'
import { cn } from '../../lib/cn'

/**
 * Các thành phần mẫu dùng cho giao diện minh họa tính năng chưa hoàn thiện. Dữ liệu là văn bản
 * cố định, không truy vấn tác phẩm hay gọi tiến trình chính.
 */

/** Dữ liệu tác phẩm mẫu: ký tự đầu tiên của tiêu đề gốc được dùng làm ảnh bìa đại diện. */
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
