import { useEffect, useState, type JSX } from 'react'
import { SettingRow, SettingsSection } from '../../components/ui/Setting'
import type { AppInfo } from '../../../../shared/contracts/desktopApi'

const PLATFORM: Record<string, string> = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' }

/** Settings › Về Mira. */
export function AboutPage(): JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  useEffect(() => {
    let live = true
    window.mira
      .getAppInfo()
      .then((next) => {
        if (live) setInfo(next)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])
  return (
    <SettingsSection>
      <SettingRow id="version" title="Mira" hint="Không gian dịch truyện, chạy trên máy bạn.">
        <span className="font-mono text-body-xs text-subtle">
          {info ? info.version + ' · ' + (PLATFORM[info.platform] ?? info.platform) : '…'}
        </span>
      </SettingRow>
    </SettingsSection>
  )
}
