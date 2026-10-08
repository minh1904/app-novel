/**
 * Icon sizes in pixels, Obsidian's scale (styles/tokens/foundation.css, --mira-icon-*). Solar icons take
 * a number, not a class, so components and screens read it from here.
 *   2xs 12  a close mark in a tab, a chevron in a dense row
 *   xs  14  icons inside small buttons and menus
 *   sm  16  the default: bars, buttons
 *   md  18  large buttons
 *   lg  24  an empty state
 */
export const ICON = { '2xs': 12, xs: 14, sm: 16, md: 18, lg: 24 } as const
