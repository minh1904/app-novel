import { describe, expect, it } from 'vitest'
import { SETTINGS_MODAL_INSET } from './SettingsModal'

describe('SettingsModal layout', () => {
  it('uses the Hermes overlay inset equally above and below', () => {
    expect(SETTINGS_MODAL_INSET).toBe('inset-y-[calc(var(--mira-header-height)+0.875rem)]')
  })
})
