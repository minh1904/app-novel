/**
 * The time under an answer, as Hermes writes it ("Yesterday, 11:48 PM"), in Vietnamese: "Hôm nay, 23:48",
 * "Hôm qua, 23:48", or the date for anything older.
 */
export function turnTime(at: number, now: number = Date.now()): string {
  const date = new Date(at)
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const day = (value: Date): number =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const days = Math.round((day(new Date(now)) - day(date)) / 86_400_000)
  if (days === 0) return 'Hôm nay, ' + time
  if (days === 1) return 'Hôm qua, ' + time
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  return (
    date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      ...(sameYear ? {} : { year: 'numeric' })
    }) +
    ', ' +
    time
  )
}

/** How long the model thought, for "Đã suy nghĩ 12 giây"; `null` when there is no end yet. */
export function thoughtSeconds(startedAt: number, endedAt: number | null): number | null {
  if (endedAt === null) return null
  return Math.max(0, Math.round((endedAt - startedAt) / 1000))
}
