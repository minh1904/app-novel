import type { JSX } from 'react'
import { ButtonGroup } from '../../../components/ui/ButtonGroup'
import { SettingRow, SettingsSection } from '../../../components/ui/Setting'
import { useThemeStore, type ThemePreference } from '../../../components/ui/themeStore'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Theo hệ thống' }
]

/** Settings › Giao diện: the theme. */
export function AppearancePanel(): JSX.Element {
  const preference = useThemeStore((state) => state.themePreference)
  const setPreference = useThemeStore((state) => state.setThemePreference)
  return (
    <SettingsSection>
      <SettingRow
        id="theme"
        title="Theme"
        hint="Theo hệ thống thì Mira đổi theo chế độ sáng/tối của Windows."
      >
        <ButtonGroup
          label="Theme"
          value={preference}
          options={THEME_OPTIONS}
          onChange={setPreference}
        />
      </SettingRow>
    </SettingsSection>
  )
}
