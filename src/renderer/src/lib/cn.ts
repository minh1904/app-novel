export type ClassValue = string | false | null | undefined

/** Nối các tên lớp CSS (class name), bỏ qua các giá trị rỗng hoặc falsy. */
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
 * Hàm hỗ trợ quản lý biến thể class name: gồm lớp cơ sở (base), các lớp theo biến thể (variants),
 * và các biến thể kết hợp (compound variants).
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
