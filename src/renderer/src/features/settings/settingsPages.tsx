import { AboutPage } from './AboutPage'
import { AppearancePanel } from './AppearancePanel'
import { AccountsPage, EndpointsPage, KeysPage, LocalPage } from './connectionPages'
import { FallbacksPage, MainModelPage } from './modelPages'
import type { SettingsPages } from './SettingsModal'

/** What each page of the Settings modal shows, keyed `group/page` (settingsNav.ts). */
export const SETTINGS_PAGES: SettingsPages = {
  'model/main': () => <MainModelPage />,
  'model/fallbacks': () => <FallbacksPage />,
  'connections/accounts': () => <AccountsPage />,
  'connections/keys': () => <KeysPage />,
  'connections/endpoints': () => <EndpointsPage />,
  'connections/local': () => <LocalPage />,
  'appearance/general': () => <AppearancePanel />,
  'about/general': () => <AboutPage />
}
