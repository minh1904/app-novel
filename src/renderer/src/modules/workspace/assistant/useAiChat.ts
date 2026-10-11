import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatLocation } from '../../../../../shared/contracts/aiChat'
import type { AiSessionView } from '../../../../../shared/contracts/aiHistory'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import type { ModelEntryView } from '../../../../../shared/contracts/modelSettings'
import type { ModelSelection } from '../../ai-connections/public'
import { thinkingPatch, type ThinkingChoice } from '../../ai-connections/public'
import { resolveModelChoice } from '../../ai-connections/public'
import { useAiChatStore } from '../store/aiChatStore'
import { useConnectionStore } from '../../ai-connections/public'
import type { SourceLanguage } from '../../../../../shared/contracts/library'
import type { TargetRange } from '../chapter-editor/chatRange'
import { startFailure } from './chatStartFailure'
import { beginTurn, emptySession, historyFor, openRequestIds, type Session } from './chatTurns'

/**
 * Hook quản lý trạng thái phiên hội thoại và tương tác với dịch vụ AI cho chương hiện tại.
 *
 * Gửi câu hỏi kèm lịch sử, model đã chọn và ngữ cảnh vị trí đoạn văn; các đề xuất từ model
 * được trả về qua hàng chờ đề xuất để người dùng duyệt.
 */

/**
 * Giao diện tối giản của khung bản dịch mà bảng trợ lý AI cần tương tác để hiển thị và duyệt đề xuất.
 */
export interface ChatEditor {
  getText(): string
  isDirty(): boolean
  reload(): Promise<void>
  reviewProposal(
    range: TargetRange,
    replacement: string,
    onAccept: () => void,
    onDeny: () => void,
    label?: string
  ): 'reviewing' | 'stale'
  endReview(): void
}

export interface AiChatOptions {
  /** Tác phẩm và chương đang thao tác để giới hạn phạm vi công cụ AI. */
  workId: string
  chapterId: string
  sourceLang: SourceLanguage
  /** Hàm lấy vị trí con trỏ hiện tại của người dùng khi gửi câu hỏi. */
  location(): ChatLocation
}

export interface AiChatController {
  session: Session
  sessions: AiSessionView[]
  sessionId: string | null
  selectSession(id: string): void
  /** Danh sách kết nối AI khả dụng và đang được kích hoạt. */
  usable: ConnectionView[]
  connection: ConnectionView | null
  /** ID của mục cấu hình model đang chọn. */
  model: string | null
  models: ModelEntryView[]
  /** Thông tin kết nối và model đang chọn cho menu. */
  selection: ModelSelection | null
  selectModel(selection: ModelSelection): void
  /** Đánh dấu hội thoại đang chọn model riêng khác với model mặc định trong Cài đặt. */
  overridesMain: boolean
  /** Đặt lại về model mặc định trong Cài đặt. */
  useDefaultModel(): void
  /** Thêm model tùy chỉnh vào kết nối; trả về `null` nếu thêm thất bại. */
  addCustomModel(connectionId: string, modelId: string): Promise<ModelSelection | null>
  /** Cập nhật mức độ suy luận cho model đang chọn. */
  setThinking(selection: ModelSelection, choice: ThinkingChoice): Promise<void>
  /** Tải lại danh sách kết nối AI từ hệ thống. */
  refreshConnections(): void
  /** Thông báo lỗi khi cập nhật mức độ suy luận thất bại. */
  modelNotice: string | null
  dismissModelNotice(): void
  /** Kiểm tra điều kiện có thể gửi câu hỏi: đã chọn model, có nội dung câu hỏi và không có lượt đang chạy. */
  canSend(question: string): boolean
  send(question: string): Promise<void>
  cancel(requestId: string): void
  newConversation(): void
  /** Thông báo lỗi nếu không đọc được danh sách kết nối. */
  loadError: string | null
}

const usableOf = (connections: ConnectionView[]): ConnectionView[] =>
  connections.filter((connection) => connection.enabled)

export function useAiChat(options: AiChatOptions): AiChatController {
  const { workId, chapterId, sourceLang, location } = options

  const connections = useConnectionStore((state) => state.connections)
  const connectionLoad = useConnectionStore((state) => state.load)
  const connectionLoadError = useConnectionStore((state) => state.loadError)
  const [modelNotice, setModelNotice] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [model, setModelState] = useState<string | null>(null)
  const storedWorkId = useAiChatStore((state) => state.workId)
  const session = useAiChatStore((state) =>
    state.workId === workId ? state.session : emptySession
  )
  const sessionId = useAiChatStore((state) => (state.workId === workId ? state.sessionId : null))
  const [sessions, setSessions] = useState<AiSessionView[]>([])
  const loadSequence = useRef(0)

  // Lưu tham chiếu phiên hội thoại trong ref để tránh tái tạo callback khi nhận từng chunk stream.
  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (storedWorkId !== workId) {
      useAiChatStore.getState().selectWork(workId)
    }
  }, [storedWorkId, workId])

  const selectSession = useCallback(
    (id: string) => {
      if (useAiChatStore.getState().sessionId === id) return
      for (const requestId of openRequestIds(sessionRef.current)) {
        void window.mira.ai.chat.cancel(requestId)
      }
      const sequence = ++loadSequence.current
      void window.mira.ai.sessions.turns(workId, id).then((result) => {
        if (
          loadSequence.current !== sequence ||
          !result.ok ||
          useAiChatStore.getState().workId !== workId
        )
          return
        useAiChatStore.getState().setSessionId(id)
        useAiChatStore.getState().restoreSession(result.value.turns)
      })
    },
    [workId]
  )

  useEffect(() => {
    const sequence = ++loadSequence.current
    void window.mira.ai.sessions.list(workId).then((result) => {
      if (
        loadSequence.current !== sequence ||
        !result.ok ||
        useAiChatStore.getState().workId !== workId
      )
        return
      setSessions(result.value.sessions)
      const savedId = useAiChatStore.getState().sessionId
      const first =
        result.value.sessions.find((item) => item.id === savedId) ?? result.value.sessions[0]
      if (first) selectSession(first.id)
    })
    return () => {
      loadSequence.current++
    }
  }, [workId, selectSession])

  const latest = useRef({ location, sourceLang })
  useEffect(() => {
    latest.current = { location, sourceLang }
  })

  useEffect(() => {
    if (connectionLoad === 'loading') {
      void useConnectionStore.getState().reload()
    }
  }, [connectionLoad])

  const refreshConnections = useCallback(() => {
    void useConnectionStore.getState().reload()
  }, [])

  const selectModel = useCallback((selection: ModelSelection) => {
    setConnectionId(selection.connectionId)
    setModelState(selection.entryId)
  }, [])

  const useDefaultModel = useCallback(() => {
    setConnectionId(null)
    setModelState(null)
  }, [])

  const addCustomModel = useCallback(
    async (connectionId: string, modelId: string): Promise<ModelSelection | null> => {
      const store = useConnectionStore.getState()
      const outcome = await store.entries.add(connectionId, [{ model: modelId }])
      if (!outcome.ok) {
        setModelNotice(outcome.message)
        return null
      }
      const added = useConnectionStore
        .getState()
        .connections.find((item) => item.id === connectionId)
        ?.models.filter((entry) => entry.model === modelId)
        .at(-1)
      return added ? { connectionId, entryId: added.id } : null
    },
    []
  )

  const setThinking = useCallback(
    async (selection: ModelSelection, choice: ThinkingChoice): Promise<void> => {
      selectModel(selection)
      const outcome = await useConnectionStore.getState().entries.update(selection.entryId, {
        settings: thinkingPatch(choice)
      })
      if (outcome.ok) {
        setModelNotice(null)
      } else {
        setModelNotice(outcome.message)
      }
    },
    [selectModel]
  )

  const main = useConnectionStore((state) => state.preferences?.main ?? null)
  // Ưu tiên model chọn riêng cho phiên chat, nếu không thì lấy model mặc định trong Cài đặt.
  const choice = useMemo(
    () => resolveModelChoice(connections, { connectionId, entryId: model }, main),
    [connections, connectionId, model, main]
  )
  const usable = useMemo(() => usableOf(connections), [connections])
  const connection = useMemo(
    () => usable.find((entry) => entry.id === choice?.connectionId) ?? null,
    [usable, choice]
  )
  const chosenModel = choice && connection ? choice.entryId : null

  const cancel = useCallback((requestId: string) => {
    void window.mira.ai.chat.cancel(requestId)
  }, [])

  const canSend = useCallback(
    (question: string): boolean => {
      if (question.trim() === '' || connection === null || chosenModel === null) return false
      return openRequestIds(sessionRef.current).length === 0
    },
    [connection, chosenModel]
  )

  const send = useCallback(
    async (question: string): Promise<void> => {
      if (connection === null || chosenModel === null) return
      const asked = question.trim()
      if (asked === '') return

      const current = latest.current
      const where = current.location()
      const localId = crypto.randomUUID()
      const { history, dropped } = historyFor(sessionRef.current)
      useAiChatStore.getState().setSessionForWork(workId, (previous) => ({
        ...beginTurn(previous, { localId, question: asked, chapterId, location: where }),
        dropped
      }))

      const result = await window.mira.ai.chat.send({
        ...(sessionId === null ? {} : { sessionId }),
        droppedTurns: dropped,
        workId,
        chapterId,
        connectionId: connection.id,
        entryId: chosenModel,
        sourceLang: current.sourceLang,
        question: asked,
        history,
        location: where
      })

      if (result.ok) {
        useAiChatStore.getState().attachRequestIdForWork(workId, localId, result.value.requestId)
      } else {
        useAiChatStore
          .getState()
          .failTurnForWork(workId, localId, startFailure(result.error.code, result.error.message))
      }
      if (result.ok && result.value.sessionId)
        useAiChatStore.getState().setSessionIdForWork(workId, result.value.sessionId)
      if (result.ok) {
        void window.mira.ai.sessions.list(workId).then((listed) => {
          if (listed.ok) setSessions(listed.value.sessions)
        })
      }
    },
    [connection, chosenModel, workId, chapterId, sessionId]
  )

  return {
    session,
    sessions,
    sessionId,
    selectSession,
    usable,
    connection,
    model: chosenModel,
    models: connection?.models ?? [],
    selection:
      connection !== null && chosenModel !== null
        ? { connectionId: connection.id, entryId: chosenModel }
        : null,
    selectModel,
    overridesMain: choice?.source === 'picked' && main !== null && main.entryId !== choice.entryId,
    useDefaultModel,
    addCustomModel,
    setThinking,
    refreshConnections,
    modelNotice,
    dismissModelNotice: () => setModelNotice(null),
    canSend,
    send,
    cancel,
    newConversation: () => {
      loadSequence.current++
      for (const requestId of openRequestIds(sessionRef.current)) cancel(requestId)
      useAiChatStore.getState().clearSession()
    },
    loadError: connectionLoadError
  }
}
