import {
  accountRefSchema,
  loginRefSchema,
  startLoginSchema
} from '../../../shared/contracts/aiAccounts'
import { CHANNELS } from '../../../shared/contracts/channels'
import { createAsyncHandler, createHandler } from '../handler'
import { connectionsOf, type AreaHandlers, type HandlerDeps } from './deps'

/**
 * Account logins (change `subscription-providers`, design D8): start, read the state, cancel, open the page
 * again, disconnect, and the account's limits. Tokens never travel on any of these.
 */
export function accountHandlers(deps: HandlerDeps): AreaHandlers<'ai:accounts'> {
  return {
    [CHANNELS.aiAccountsLoginStart]: createAsyncHandler(startLoginSchema, ({ provider }) =>
      connectionsOf(deps).startLogin(provider)
    ),
    [CHANNELS.aiAccountsLoginPoll]: createHandler(loginRefSchema, ({ sessionId }) =>
      connectionsOf(deps).pollLogin(sessionId)
    ),
    [CHANNELS.aiAccountsLoginCancel]: createHandler(loginRefSchema, ({ sessionId }) => {
      connectionsOf(deps).cancelLogin(sessionId)
    }),
    [CHANNELS.aiAccountsLoginReopen]: createAsyncHandler(loginRefSchema, ({ sessionId }) =>
      connectionsOf(deps).reopenLogin(sessionId)
    ),
    [CHANNELS.aiAccountsDisconnect]: createHandler(accountRefSchema, ({ connectionId }) =>
      connectionsOf(deps).delete(connectionId)
    ),
    [CHANNELS.aiAccountsUsage]: createAsyncHandler(accountRefSchema, ({ connectionId }) =>
      connectionsOf(deps).usage(connectionId)
    )
  }
}
