import { AboutPage } from './AboutPage'
import { AppearancePanel } from './AppearancePanel'
import { EndpointsPage, KeysPage, LocalPage } from './connectionPages'
import { AccountsPage } from './AccountsPage'
import { FallbacksPage, MainModelPage } from './modelPages'
import { ModelListPage } from './ModelListPage'
import type { SettingsPages } from './SettingsModal'

/** What each page of the Settings modal shows, keyed `group/page` (settingsNav.ts). */
export const SETTINGS_PAGES: SettingsPages = {
  'model/main': () => <MainModelPage />,
  'model/models': () => <ModelListPage />,
  'model/fallbacks': () => <FallbacksPage />,
  'connections/accounts': () => <AccountsPage />,
  'connections/keys': () => <KeysPage />,
  'connections/endpoints': () => <EndpointsPage />,
  'connections/local': () => <LocalPage />,
  'appearance/general': () => <AppearancePanel />,
  'about/general': () => <AboutPage />
}
