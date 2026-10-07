/**
 * The groups and pages of the Settings modal (change `hermes-settings-modal`). Only what Mira has content
 * for is listed: an entry with nothing behind it would promise something that does not exist.
 */
export const SETTINGS_GROUPS = [
  {
    id: 'model',
    label: 'Model',
    pages: [
      { id: 'main', label: 'Model chính' },
      { id: 'fallbacks', label: 'Dự phòng' }
    ]
  },
  {
    id: 'connections',
    label: 'Kết nối AI',
    pages: [
      { id: 'accounts', label: 'Tài khoản' },
      { id: 'keys', label: 'Khóa API' },
      { id: 'endpoints', label: 'Endpoint tùy chỉnh' },
      { id: 'local', label: 'Trên máy' }
    ]
  },
  { id: 'appearance', label: 'Giao diện', pages: [{ id: 'general', label: 'Chung' }] },
  { id: 'about', label: 'Về Mira', pages: [{ id: 'general', label: 'Phiên bản' }] }
] as const

export type SettingsGroupId = (typeof SETTINGS_GROUPS)[number]['id']

export interface SettingsLocation {
  group: SettingsGroupId
  page: string
  /** A row or card to scroll to and highlight, e.g. `provider:google`. */
  key?: string
}

/** Where the modal opens when nothing more specific is asked for. */
export const DEFAULT_SETTINGS_LOCATION: SettingsLocation = { group: 'model', page: 'main' }

export function groupOf(id: SettingsGroupId): (typeof SETTINGS_GROUPS)[number] {
  return SETTINGS_GROUPS.find((group) => group.id === id) ?? SETTINGS_GROUPS[0]
}

/** A location with a page that exists in its group; an unknown page falls back to the group's first. */
export function normalizeLocation(location: SettingsLocation): SettingsLocation {
  const group = groupOf(location.group)
  const page = group.pages.some((item) => item.id === location.page)
    ? location.page
    : group.pages[0].id
  return { group: group.id, page, ...(location.key ? { key: location.key } : {}) }
}

/** "Cài đặt › Kết nối AI › Khóa API"; a group with one page stops at the group. */
export function breadcrumbOf(location: SettingsLocation): string[] {
  const group = groupOf(location.group)
  const page = group.pages.find((item) => item.id === location.page)
  return group.pages.length > 1 && page
    ? ['Cài đặt', group.label, page.label]
    : ['Cài đặt', group.label]
}
