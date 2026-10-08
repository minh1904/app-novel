import { cn, variants } from '../../lib/cn'
import { focusRing, focusWithinRing } from './focus'
import { ICON } from './icon'

/*
 * The variant tables of the components in this folder, kept apart from the components so that each
 * component file exports only components (React fast refresh needs that). A screen can style a native
 * element like a component with them: <a className={buttonVariants({ size: 'sm' })}>.
 */

/*
 * The IZONE LMS button: colour × style × size, on Mira's tokens.
 *   colour  neutral (everything; solid is the screen's primary action) | danger (deletes)
 *   style   solid | outline | light | ghost
 *   size    lg 40px (at most one per screen) · md 32px (default) · sm 24px (tables, rows, toolbars)
 * One control scale for buttons, fields and groups: height 24 / 32 / 40, label 12 / 13 / 15 (about 40%
 * of the height), side padding 8 / 12 / 16, radius 4 / 6 / 8 (a quarter of the height or less).
 */
export const buttonVariants = variants({
  base: cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none',
    'transition-colors duration-(--mira-duration-fast) ease-standard',
    'data-disabled:cursor-not-allowed [&_svg]:shrink-0',
    focusRing
  ),
  variants: {
    color: { neutral: '', danger: '' },
    variant: { solid: '', outline: 'border', light: '', ghost: '' },
    size: {
      lg: 'h-10 gap-xs rounded-md px-md text-label-md',
      md: 'h-8 gap-xs rounded-sm px-sm text-label-sm',
      sm: 'h-6 gap-2xs rounded-xs px-xs text-label-xs'
    },
    iconOnly: { true: 'px-0', false: '' }
  },
  compound: [
    { when: { size: 'lg', iconOnly: true }, className: 'w-10' },
    { when: { size: 'md', iconOnly: true }, className: 'w-8' },
    { when: { size: 'sm', iconOnly: true }, className: 'w-6' },
    {
      when: { color: 'neutral', variant: 'solid' },
      className:
        'bg-(--mira-button-neutral-solid-bg) text-(--mira-button-neutral-solid-fg) hover:bg-(--mira-button-neutral-solid-bg-hover) data-disabled:bg-(--mira-button-bg-disabled) data-disabled:text-(--mira-button-fg-disabled)'
    },
    {
      when: { color: 'neutral', variant: 'outline' },
      className:
        'border-(--mira-button-neutral-border) bg-surface text-(--mira-button-neutral-fg) shadow-xs hover:border-(--mira-button-neutral-border-hover) hover:bg-(--mira-button-neutral-bg-hover) data-disabled:bg-transparent data-disabled:text-(--mira-button-fg-disabled) data-disabled:shadow-none'
    },
    {
      when: { color: 'neutral', variant: 'light' },
      className:
        'bg-(--mira-button-neutral-light-bg) text-(--mira-button-neutral-fg) hover:bg-(--mira-button-neutral-light-bg-hover) data-disabled:bg-(--mira-button-bg-disabled) data-disabled:text-(--mira-button-fg-disabled)'
    },
    {
      when: { color: 'neutral', variant: 'ghost' },
      className:
        'text-(--mira-button-neutral-fg-muted) hover:bg-(--mira-button-neutral-bg-hover) hover:text-(--mira-button-neutral-fg) data-disabled:text-(--mira-button-fg-disabled)'
    },
    {
      when: { color: 'danger', variant: 'solid' },
      className:
        'bg-(--mira-button-danger-solid-bg) text-(--mira-button-danger-solid-fg) hover:bg-(--mira-button-danger-solid-bg-hover) data-disabled:bg-(--mira-button-bg-disabled) data-disabled:text-(--mira-button-fg-disabled)'
    },
    {
      when: { color: 'danger', variant: 'outline' },
      className:
        'border-(--mira-button-danger-border) text-(--mira-button-danger-fg) hover:bg-(--mira-button-danger-light-bg) data-disabled:text-(--mira-button-fg-disabled)'
    },
    {
      when: { color: 'danger', variant: 'light' },
      className:
        'bg-(--mira-button-danger-light-bg) text-(--mira-button-danger-fg) hover:bg-(--mira-button-danger-light-bg-hover) data-disabled:bg-(--mira-button-bg-disabled) data-disabled:text-(--mira-button-fg-disabled)'
    },
    {
      when: { color: 'danger', variant: 'ghost' },
      className:
        'text-(--mira-button-danger-fg) hover:bg-(--mira-button-danger-light-bg) data-disabled:text-(--mira-button-fg-disabled)'
    }
  ],
  defaults: { color: 'neutral', variant: 'outline', size: 'md', iconOnly: false }
})

/** Icon sizes per button size (Solar icons take a pixel size, not a class). */
export const BUTTON_ICON = { lg: ICON.md, md: ICON.sm, sm: ICON.xs } as const

/** A text action: link colour, underline on hover. */
export const linkButtonVariants = variants({
  base: cn(
    'inline-flex items-center gap-2xs rounded-xs whitespace-nowrap underline-offset-4 hover:underline',
    'transition-colors duration-(--mira-duration-fast) ease-standard',
    'data-disabled:cursor-not-allowed data-disabled:text-disabled data-disabled:no-underline [&_svg]:shrink-0',
    focusRing
  ),
  variants: {
    color: {
      link: 'text-link',
      neutral: 'text-subtle hover:text-default',
      /** Something waits for the reader, e.g. proposals to review. */
      warning: 'text-warning-emphasis'
    },
    size: {
      md: 'text-label-sm',
      sm: 'text-label-xs'
    }
  },
  defaults: { color: 'link', size: 'md' }
})

/*
 * The IZONE LMS compact button: an icon-only button for bars, rows and tags.
 *   style  ghost (default) | light | dark | outline
 *   size   lg 28px · md 24px · sm 20px
 */
export const compactButtonVariants = variants({
  base: cn(
    'inline-flex shrink-0 items-center justify-center select-none',
    'transition-colors duration-(--mira-duration-fast) ease-standard',
    'data-disabled:cursor-not-allowed data-disabled:bg-transparent data-disabled:text-disabled data-disabled:shadow-none',
    '[&_svg]:shrink-0',
    focusRing
  ),
  variants: {
    variant: {
      ghost:
        'text-(--mira-button-neutral-fg-muted) hover:bg-(--mira-button-neutral-bg-hover) hover:text-(--mira-button-neutral-fg) aria-pressed:bg-selected aria-pressed:text-default data-popup-open:bg-selected data-popup-open:text-default',
      light:
        'bg-(--mira-button-neutral-light-bg) text-(--mira-button-neutral-fg) hover:bg-(--mira-button-neutral-light-bg-hover)',
      dark: 'bg-(--mira-button-neutral-solid-bg) text-(--mira-button-neutral-solid-fg) hover:bg-(--mira-button-neutral-solid-bg-hover)',
      outline:
        'border border-(--mira-button-neutral-border) bg-surface text-(--mira-button-neutral-fg) shadow-xs hover:bg-(--mira-button-neutral-bg-hover)'
    },
    size: {
      lg: 'size-7 rounded-sm',
      md: 'size-6 rounded-xs',
      sm: 'size-5 rounded-xs'
    },
    round: { true: 'rounded-full', false: '' },
    /** A ghost button whose action has a meaning: accept (success) or delete (danger). */
    tone: {
      neutral: '',
      success: 'hover:bg-success-subtle hover:text-success-emphasis',
      danger: 'hover:bg-error-subtle hover:text-error-emphasis'
    }
  },
  defaults: { variant: 'ghost', size: 'md', round: false, tone: 'neutral' }
})

/** Icon sizes per compact size. */
export const COMPACT_ICON = { lg: ICON.md, md: ICON.sm, sm: ICON['2xs'] } as const

/*
 * A short label for a state or a category. Colour states what something is (the IZONE LMS state map):
 * success done · info in progress, new · warning paused, needs a look · error failed · accent stands out
 * without a judgement · neutral not started, not applicable. The text always says it too.
 *   style  light (tinted fill) | outline (border only) | plain (dot and text)
 */
export const badgeVariants = variants({
  base: 'inline-flex shrink-0 items-center gap-2xs whitespace-nowrap text-label-xs',
  variants: {
    color: {
      neutral: 'text-subtle',
      success: 'text-success-emphasis',
      info: 'text-info-emphasis',
      warning: 'text-warning-emphasis',
      error: 'text-error-emphasis',
      accent: 'text-accent-emphasis'
    },
    variant: { light: 'h-5 rounded-xs px-1.5', outline: 'h-5 rounded-xs border px-1.5', plain: '' }
  },
  compound: [
    { when: { variant: 'light', color: 'neutral' }, className: 'bg-muted' },
    { when: { variant: 'light', color: 'success' }, className: 'bg-success-subtle' },
    { when: { variant: 'light', color: 'info' }, className: 'bg-info-subtle' },
    { when: { variant: 'light', color: 'warning' }, className: 'bg-warning-subtle' },
    { when: { variant: 'light', color: 'error' }, className: 'bg-error-subtle' },
    { when: { variant: 'light', color: 'accent' }, className: 'bg-accent-subtle' },
    { when: { variant: 'outline', color: 'neutral' }, className: 'border-default' },
    { when: { variant: 'outline', color: 'success' }, className: 'border-success-muted' },
    { when: { variant: 'outline', color: 'info' }, className: 'border-info-muted' },
    { when: { variant: 'outline', color: 'warning' }, className: 'border-warning-muted' },
    { when: { variant: 'outline', color: 'error' }, className: 'border-error-muted' },
    { when: { variant: 'outline', color: 'accent' }, className: 'border-accent-muted' }
  ],
  defaults: { color: 'neutral', variant: 'light' }
})

/*
 * The frame every one-line field and select trigger shares (IZONE LMS input): a surface box with an
 * input-coloured border, a hover tint, the focus ring around the whole frame, a red border when
 * invalid. Sizes: md 32px · sm 24px (a toolbar, a table row), the heights of the buttons beside it.
 */
export const inputFrameVariants = variants({
  base: cn(
    'flex min-w-0 items-center gap-xs border border-(--mira-input-border) bg-(--mira-input-bg) text-(--mira-input-fg)',
    'transition-colors duration-(--mira-duration-fast) ease-standard hover:bg-(--mira-input-bg-hover)',
    'has-[[aria-invalid=true]]:border-error has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-disabled has-[:disabled]:text-disabled',
    '[&_svg]:shrink-0 [&_svg]:text-muted',
    focusWithinRing
  ),
  variants: {
    size: {
      md: 'h-8 rounded-sm px-sm text-body-sm',
      sm: 'h-6 rounded-xs px-xs text-body-xs'
    }
  },
  defaults: { size: 'md' }
})
