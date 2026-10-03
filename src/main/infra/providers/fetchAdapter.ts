/**
 * Lets a network function that takes a plain URL stand in for the global `fetch`.
 *
 * Electron's `net.fetch` goes through Chromium's network stack, which follows the system proxy (PAC files,
 * WPAD, authenticating proxies) and the system certificate store. The global `fetch` in the main process is
 * Node's, which does neither (Electron's own documentation draws that line). A person behind a proxy
 * therefore sees "cannot connect" with the global one and a working app with this one.
 *
 * It lives here, free of any `electron` import, so it can be tested; the file that hands in the real
 * `net.fetch` is in `electron/`, the only place allowed to import it.
 *
 * Only a URL string or a `URL` is accepted as the input. Everything this app sends is built from a
 * string, and silently dropping the headers and body of a `Request` object would be worse than refusing.
 */
export type UrlFetch = (url: string, init?: RequestInit) => Promise<Response>

export function asFetch(urlFetch: UrlFetch): typeof fetch {
  return (input, init) => {
    if (typeof input === 'string') return urlFetch(input, init)
    if (input instanceof URL) return urlFetch(input.href, init)
    return Promise.reject(new TypeError('This fetch takes a URL, not a Request object.'))
  }
}
