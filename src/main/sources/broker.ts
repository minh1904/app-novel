export interface NetworkRequest {
  url: string
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: string | Uint8Array
  authHandle?: string
}

export interface NetworkResponse {
  status: number
  headers: Record<string, string>
  body: Uint8Array
}

export type NetworkBrokerErrorCode =
  | 'origin_not_allowed'
  | 'private_address_blocked'
  | 'network_disabled'
  | 'auth_handle_invalid'

export class NetworkBrokerError extends Error {
  constructor(
    readonly code: NetworkBrokerErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'NetworkBrokerError'
  }
}

const PRIVATE_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', '169.254.169.254'])

export function isPrivateAddress(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (PRIVATE_HOSTS.has(lower)) return true
  if (/^10\.\d+\.\d+\.\d+$/.test(lower)) return true
  if (/^192\.168\.\d+\.\d+$/.test(lower)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(lower)) return true
  return false
}

export interface NetworkBrokerPolicy {
  allowedOrigins: string[]
  allowNetwork?: boolean
}

export class NetworkBroker {
  constructor(private readonly policy: NetworkBrokerPolicy) {}

  async request(req: NetworkRequest): Promise<NetworkResponse> {
    if (this.policy.allowNetwork !== true) {
      throw new NetworkBrokerError(
        'network_disabled',
        'network adapter requests are not enabled in this release'
      )
    }

    let parsed: URL
    try {
      parsed = new URL(req.url)
    } catch {
      throw new NetworkBrokerError('origin_not_allowed', 'invalid request URL')
    }

    if (isPrivateAddress(parsed.hostname)) {
      throw new NetworkBrokerError(
        'private_address_blocked',
        `request to private address ${parsed.hostname} is blocked`
      )
    }

    const origin = parsed.origin
    const allowed = this.policy.allowedOrigins.some((allowedOrigin) => {
      try {
        return new URL(allowedOrigin).origin === origin
      } catch {
        return false
      }
    })

    if (!allowed) {
      throw new NetworkBrokerError(
        'origin_not_allowed',
        `origin ${origin} is not in the declared manifest origins`
      )
    }

    throw new NetworkBrokerError('network_disabled', 'network broker execution stub')
  }
}

export interface AuthHost {
  getOpaqueHandle(profileId: string): Promise<string>
}

export interface BrowserHost {
  openInteractiveSession(sourceId: string, profileId: string, url: string): Promise<void>
}
