/**
 * Data for the sentence splitter, kept apart from the code so a new abbreviation is a one-line change
 * plus a regression case. Abbreviations are written with their final period.
 */

/** Opening brackets and quotation marks. One at the end of a sentence belongs to the next one. */
export const OPENERS = '「『（〈《【〔［｛“‘(['

/**
 * Abbreviations after which a period never ends a sentence: titles and the like that are always
 * followed by the name they introduce.
 */
export const ABBREVIATIONS_ALWAYS: Record<'en' | 'vi', readonly string[]> = {
  en: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 'St.', 'vs.'],
  vi: ['TP.', 'Th.S.', 'ThS.', 'TS.', 'PGS.', 'GS.']
}

/**
 * Abbreviations that can also end a sentence ("He lived in the U.S. Then he left."). The period is
 * not treated as an end only when the next word starts in lower case or with a digit.
 */
export const ABBREVIATIONS_UNLESS_CAPITAL: Record<'en' | 'vi', readonly string[]> = {
  en: ['U.S.', 'U.K.', 'U.N.'],
  vi: []
}

/** A segment longer than this (in UTF-16 units) is flagged: usually a sentence mark is missing. */
export const LONG_SEGMENT_UNITS = 1000
