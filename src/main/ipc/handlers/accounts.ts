import {
  accountRefSchema,
  loginRefSchema,
  startLoginSchema
} from '../../../shared/contracts/aiAccounts'
import { CHANNELS } from '../../../shared/contracts/channels'
import { createAsyncHandler, createHandler } from '../handler'
import { connectionsOf, type AreaHandlers, type HandlerDeps } from './deps'

/**
 * Đăng nhập tài khoản: bắt đầu, đọc trạng thái, hủy, mở lại trang đăng nhập, ngắt kết nối
 * và xem hạn mức tài khoản. Token không bao giờ truyền qua bất kỳ kênh nào trong số này.
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
