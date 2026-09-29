/**
 * Folds text so "tien hiep" finds "Tiên Hiệp". NFD splits Latin letters from their accents, but `đ`
 * has no decomposition and must be mapped by hand. Only Latin combining marks are removed, so kana
 * and other scripts keep their meaning.
 */
export function foldForSearch(text: string): string {
  return text
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .normalize('NFC')
}

/** True when every word of `query` appears in `text`, ignoring case and Vietnamese accents. */
export function matchesQuery(text: string, query: string): boolean {
  const needle = foldForSearch(query).trim()
  if (needle === '') return true
  return foldForSearch(text).includes(needle)
}
