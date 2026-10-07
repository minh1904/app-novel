/**
 * The keyboard focus mark every shared control wears. Hermes removes focus outlines altogether; Mira keeps
 * one (docs/modules/design-system/README.md), drawn as an outline so it never fights a control's own
 * box-shadow border. `:focus-visible` keeps it off mouse clicks.
 */
// `outline-solid` is spelled out: a control's own `outline-none` sets Tailwind's --tw-outline-style to
// none, and `outline-2` alone would then draw nothing.
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-focus'
