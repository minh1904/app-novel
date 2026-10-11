const relative = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })
const dateOnly = new Intl.DateTimeFormat('vi', { day: 'numeric', month: 'short', year: 'numeric' })
const timeOnly = new Intl.DateTimeFormat('vi', { hour: '2-digit', minute: '2-digit' })
const full = new Intl.DateTimeFormat('vi', { dateStyle: 'full', timeStyle: 'short' })

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Phân tách thời điểm thành nhãn ngày tương đối ("Hôm nay", "3 ngày trước") và giờ đồng hồ. */
export function formatUpdatedParts(date: Date, now = new Date()): { day: string; time: string } {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000))
  const time = timeOnly.format(date)
  if (days <= 0) return { day: 'Hôm nay', time }
  if (days === 1) return { day: 'Hôm qua', time }
  if (days < 7) return { day: relative.format(-days, 'day'), time }
  return { day: dateOnly.format(date), time }
}

export function formatUpdated(date: Date, now = new Date()): string {
  const { day, time } = formatUpdatedParts(date, now)
  return day + ' · ' + time
}

export function formatFullDate(date: Date): string {
  return full.format(date)
}
