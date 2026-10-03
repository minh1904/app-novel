import { chatCancelSchema, chatSendSchema } from '../../../shared/contracts/aiChat'
import { CHANNELS, EVENT_CHANNELS } from '../../../shared/contracts/channels'
import { createHandler, createSinkHandler } from '../handler'
import { chatOf, type AreaHandlers, type HandlerDeps } from './deps'

/** Panel "Hỏi AI": bắt đầu và hủy một lượt chat. Chữ trả lời đi bằng kênh sự kiện, không bằng `invoke`. */
export function chatHandlers(deps: HandlerDeps): AreaHandlers<'ai:chat'> {
  return {
    /**
     * Bắt đầu một lượt chat. Trả **chỉ** `requestId`: nội dung câu trả lời không bao giờ đi qua
     * đường trả về của `invoke`, nó đi bằng `EVENT_CHANNELS.aiChatChunk`.
     */
    [CHANNELS.aiChatSend]: createSinkHandler(chatSendSchema, (input, sink) => {
      const service = chatOf(deps)
      // Cửa sổ đóng hay reload giữa lượt: dọn mọi lượt đang chạy. Mira là ứng dụng một cửa sổ, nên
      // "cửa sổ này đi" đồng nghĩa với "không còn ai nhận chữ" — nếu sau này có nhiều cửa sổ thì chỗ
      // này phải nhóm lượt theo cửa sổ, và đó là lý do ghi chú nằm ở đây chứ không ở `ChatService`.
      sink.onDestroyed(() => service.cancelAll())
      const requestId = service.start(input, (chunk) => {
        if (sink.isDestroyed()) return
        sink.send(EVENT_CHANNELS.aiChatChunk, chunk)
      })
      return { requestId }
    }),
    [CHANNELS.aiChatCancel]: createHandler(chatCancelSchema, ({ requestId }) => {
      chatOf(deps).cancel(requestId)
    })
  }
}
