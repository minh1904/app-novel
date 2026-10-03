/** Characters Windows does not allow in a file name, plus control characters. */
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f]/g
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
const MAX_TITLE = 100

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Suggested file name for a backup: "<title> — <yyyy-mm-dd>.mira", safe on Windows. */
export function backupFileName(title: string, date: Date): string {
  let name = title
    .replace(FORBIDDEN, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Windows drops trailing dots and spaces from names, which would change what the user sees.
    .replace(/[. ]+$/, '')
  if ([...name].length > MAX_TITLE) name = [...name].slice(0, MAX_TITLE).join('').trimEnd()
  if (name === '' || RESERVED.test(name)) name = 'Tác phẩm'
  const day = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
  return name + ' — ' + day + '.mira'
}
