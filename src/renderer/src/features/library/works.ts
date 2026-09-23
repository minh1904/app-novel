export type SourceLanguage = 'en' | 'zh-Hans' | 'zh-Hant' | 'ja'

export type WorkStatus = 'not-started' | 'in-progress' | 'paused'

export interface ChapterRef {
  number: number
  title: string
  /** Last translated line the translator touched, shown as a reminder of where they stopped. */
  excerpt: string
}

export interface Work {
  id: string
  title: string
  originalTitle?: string
  description?: string
  /** Optional cover image; the source-language mark stands in when it is missing. */
  coverUrl?: string
  sourceLanguage: SourceLanguage
  chapterCount: number
  status: WorkStatus
  archived: boolean
  updatedAt: Date
  lastChapter?: ChapterRef
}

export type ActivityKind = 'chapter-updated' | 'paused' | 'resumed' | 'created' | 'archived'

export interface Activity {
  id: string
  kind: ActivityKind
  workId: string
  chapterNumber?: number
  at: Date
}

export const languages: Record<SourceLanguage, { name: string; short: string; glyph: string }> = {
  en: { name: 'Tiếng Anh', short: 'Anh', glyph: 'Aa' },
  'zh-Hans': { name: 'Tiếng Trung giản thể', short: 'Trung giản thể', glyph: '简' },
  'zh-Hant': { name: 'Tiếng Trung phồn thể', short: 'Trung phồn thể', glyph: '繁' },
  ja: { name: 'Tiếng Nhật', short: 'Nhật', glyph: 'あ' }
}

export const statusLabels: Record<WorkStatus, string> = {
  'not-started': 'Chưa bắt đầu',
  'in-progress': 'Đang dịch',
  paused: 'Tạm dừng'
}

export function workProgressLabel(work: Work): string {
  const status = statusLabels[work.status]
  return work.lastChapter ? status + ' · Chương ' + work.lastChapter.number : status
}

export const RECENT_DAYS = 7

export function isRecent(work: Work, now = Date.now()): boolean {
  return !work.archived && now - work.updatedAt.getTime() <= RECENT_DAYS * 24 * 60 * 60 * 1000
}

export function byUpdated(a: Work, b: Work): number {
  return b.updatedAt.getTime() - a.updatedAt.getTime()
}

const hour = 60 * 60 * 1000
const ago = (hours: number): Date => new Date(Date.now() - hours * hour)

// Illustrative data until the storage layer exists. Titles and descriptions are invented.
export const sampleWorks: Work[] = [
  {
    id: 'lantern-street',
    title: 'The Lantern Street Letters',
    description: 'Những lá thư không người nhận trong một khu phố ven sông.',
    sourceLanguage: 'en',
    chapterCount: 12,
    status: 'in-progress',
    archived: false,
    updatedAt: ago(1.5),
    lastChapter: {
      number: 3,
      title: 'A Window Facing East',
      excerpt: 'Khi cô mở cửa sổ, cả thành phố vẫn còn say ngủ.'
    }
  },
  {
    id: 'mountain-apothecary',
    title: 'Hiệu thuốc trên núi',
    originalTitle: '山中药铺',
    description: 'Một thầy thuốc trẻ kế nghiệp hiệu thuốc cũ giữa vùng núi.',
    sourceLanguage: 'zh-Hans',
    chapterCount: 48,
    status: 'in-progress',
    archived: false,
    updatedAt: ago(26),
    lastChapter: {
      number: 17,
      title: 'Mưa đầu hạ',
      excerpt: 'Ông lão đặt gói thuốc xuống quầy, không nói thêm lời nào.'
    }
  },
  {
    id: 'first-snow-station',
    title: 'Ga tàu mùa tuyết đầu',
    originalTitle: '初雪の駅',
    description: 'Người trực ga cuối cùng của một tuyến tàu sắp đóng cửa.',
    sourceLanguage: 'ja',
    chapterCount: 8,
    status: 'not-started',
    archived: false,
    updatedAt: ago(74)
  },
  {
    id: 'jade-court',
    title: 'Ngọc đình ký',
    originalTitle: '玉庭記',
    description: 'Chuyện cung đình qua lời một nữ quan chép sử.',
    sourceLanguage: 'zh-Hant',
    chapterCount: 120,
    status: 'paused',
    archived: false,
    updatedAt: ago(24 * 6),
    lastChapter: {
      number: 64,
      title: 'Yến tiệc cuối thu',
      excerpt: 'Nàng nâng chén, nhưng ánh mắt vẫn dừng ở cửa điện.'
    }
  },
  {
    id: 'harbor-notes',
    title: 'Harbor Notes',
    description: 'Tùy bút về một thị trấn cảng.',
    sourceLanguage: 'en',
    chapterCount: 5,
    status: 'in-progress',
    archived: true,
    updatedAt: ago(24 * 40),
    lastChapter: { number: 5, title: 'Low Tide', excerpt: 'Nước rút để lộ những bậc đá cũ.' }
  }
]

export const sampleActivities: Activity[] = [
  { id: 'a1', kind: 'chapter-updated', workId: 'lantern-street', chapterNumber: 3, at: ago(1.5) },
  {
    id: 'a2',
    kind: 'chapter-updated',
    workId: 'mountain-apothecary',
    chapterNumber: 17,
    at: ago(26)
  },
  { id: 'a3', kind: 'created', workId: 'first-snow-station', at: ago(74) },
  { id: 'a4', kind: 'paused', workId: 'jade-court', at: ago(24 * 6) }
]
