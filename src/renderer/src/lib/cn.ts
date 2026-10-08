export type ClassValue = string | false | null | undefined

/** Joins class names, skipping the empty ones. A caller's class goes last so it can extend a component. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ')
}

type VariantMap = Record<string, Record<string, string>>

type VariantProps<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K] extends 'true' | 'false' ? boolean : keyof V[K]
}

interface CompoundVariant<V extends VariantMap> {
  when: VariantProps<V>
  className: string
}

export interface VariantsConfig<V extends VariantMap> {
  base: string
  variants: V
  compound?: ReadonlyArray<CompoundVariant<V>>
  defaults: { [K in keyof V]: keyof V[K] extends 'true' | 'false' ? boolean : keyof V[K] }
}

/**
 * A class-variance helper in the shape of `cva` (the IZONE LMS components use it): a base class, one
 * class per value of each variant, and compound classes for combinations. Kept in-house because the
 * repo cannot add dependencies with the global pnpm (AGENTS.md).
 */
export function variants<V extends VariantMap>(
  config: VariantsConfig<V>
): (props?: VariantProps<V>) => string {
  return (props = {}) => {
    const chosen: Record<string, unknown> = { ...config.defaults }
    for (const [key, value] of Object.entries(props)) if (value !== undefined) chosen[key] = value
    const parts = [config.base]
    for (const [key, options] of Object.entries(config.variants)) {
      parts.push(options[String(chosen[key])] ?? '')
    }
    for (const compound of config.compound ?? []) {
      const matches = Object.entries(compound.when).every(([key, value]) => chosen[key] === value)
      if (matches) parts.push(compound.className)
    }
    return cn(...parts)
  }
}

export type { VariantProps }
