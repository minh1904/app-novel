/**
 * The keyboard focus mark every control wears, drawn as an outline so it never fights a control's own
 * border or shadow. `:focus-visible` keeps it off mouse clicks. `outline-solid` is spelled out because a
 * control's `outline-none` sets Tailwind's --tw-outline-style to none, and `outline-2` alone would then
 * draw nothing.
 */
export const focusRing =
  'outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-focus'

/** The same mark for a box that holds the focused element (an input frame, a select trigger). */
export const focusWithinRing =
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-focus'
