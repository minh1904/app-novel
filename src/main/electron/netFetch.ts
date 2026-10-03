import { net } from 'electron'
import { asFetch } from '../infra/providers/fetchAdapter'

/**
 * The `fetch` the AI layer uses inside the app: Electron's `net.fetch`, so calls follow the system proxy
 * and certificate store instead of going straight out the way Node's `fetch` does.
 *
 * Imports `electron`, so it only runs in the main process; tests hand `createServices` an ordinary `fetch`.
 * `net.fetch` may only be called once the app is ready, which is true by the time any call is made: the
 * handlers that use it are registered after `whenReady`.
 */
export const electronFetch: typeof fetch = asFetch((url, init) => net.fetch(url, init))
