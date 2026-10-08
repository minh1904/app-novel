import { useEffect, useState, type JSX } from 'react'
import type { AppearanceState } from '../../../../shared/contracts/appearance'
import { ButtonGroup } from '../../components/ui/ButtonGroup'
import { SettingRow, SettingsSection } from '../../components/ui/Setting'
import { Switch } from '../../components/ui/Switch'
import { useUiStore, type ThemePreference } from '../../stores/uiStore'
import { applyGlass } from './glass'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Theo hệ thống' }
]

function ThemeRow(): JSX.Element {
  const preference = useUiStore((state) => state.themePreference)
  const setPreference = useUiStore((state) => state.setThemePreference)
  return (
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
  )
}

export function AppearanceSettings({
  state,
  busy,
  onGlassChange
}: {
  /** `null` while the first read is in flight. */
  state: AppearanceState | null
  busy: boolean
  onGlassChange(glass: boolean): void
}): JSX.Element {
  const supported = state?.glassSupported ?? false
  return (
    <SettingsSection>
      <ThemeRow />
      <SettingRow
        id="glass"
        title="Hiệu ứng kính (acrylic)"
        hint="Sidebar trong mờ, thấy được màn hình phía sau; vùng soạn thảo vẫn đặc để dễ đọc. Tắt nếu máy chạy chậm."
        below={
          state && !supported ? (
            <span className="text-body-xs text-subtle">
              Cần Windows 11 bản 22H2 (build 22621) trở lên; máy này chưa hỗ trợ.
            </span>
          ) : undefined
        }
      >
        <Switch
          aria-label="Hiệu ứng kính (acrylic)"
          checked={state?.glass ?? false}
          disabled={!supported || busy}
          onCheckedChange={(checked) => onGlassChange(checked)}
        />
      </SettingRow>
    </SettingsSection>
  )
}

/** Settings › Giao diện: theme, and the glass switch read from main and applied at once. */
export function AppearancePanel(): JSX.Element {
  const [state, setState] = useState<AppearanceState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    window.mira.appearance
      .get()
      .then((next) => {
        if (live) setState(next)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  function change(glass: boolean): void {
    setBusy(true)
    window.mira.appearance
      .set({ glass })
      .then((next) => {
        setState(next)
        applyGlass(next)
      })
      .catch(() => undefined)
      .finally(() => setBusy(false))
  }

  return <AppearanceSettings state={state} busy={busy} onGlassChange={change} />
}
