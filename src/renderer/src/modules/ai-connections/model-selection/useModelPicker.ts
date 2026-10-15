import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ConnectionView } from '../../../../../shared/contracts/aiConnections'
import { useConnectionStore } from '../store/connectionStore'
import { resolveModelChoice } from './modelChoice'
import { addableModels } from './modelMenuModel'
import type { ModelSelection } from './ModelSelectionMenu'
import { thinkingPatch, type ThinkingChoice } from './modelSettingsForm'

/** Trạng thái của `ModelSelectionMenu` trên một ô soạn: model sẽ dùng và các thao tác của menu. */
export interface ModelPicker {
  /** Danh sách kết nối AI khả dụng và đang được kích hoạt. */
  usable: ConnectionView[]
  connection: ConnectionView | null
  /** Model sẽ dùng: model chọn riêng, model chính trong Cài đặt, hoặc mặc định của kết nối đầu tiên. */
  selection: ModelSelection | null
  selectModel(selection: ModelSelection): void
  /** Đánh dấu đang chọn model riêng khác với model mặc định trong Cài đặt. */
  overridesMain: boolean
  /** Đặt lại về model mặc định trong Cài đặt. */
  useDefaultModel(): void
  /** Thêm model tùy chỉnh vào kết nối; trả về `null` nếu thêm thất bại. */
  addCustomModel(connectionId: string, modelId: string): Promise<ModelSelection | null>
  /** Cập nhật mức độ suy luận cho model đang chọn. */
  setThinking(selection: ModelSelection, choice: ThinkingChoice): Promise<void>
  /** Tải lại danh sách kết nối AI từ hệ thống, và hỏi nhà cung cấp model của kết nối chưa được hỏi trong phiên. */
  refreshConnections(): void
  /** "Tải lại model": hỏi lại nhà cung cấp của mọi kết nối đang bật. */
  refreshModels(): void
  /** Đang hỏi danh sách model của một nhà cung cấp. */
  refreshing: boolean
  /** Id kết nối → model nhà cung cấp liệt kê mà kết nối chưa có mục. */
  suggestions: ReadonlyMap<string, readonly string[]>
  /** Thông báo lỗi khi thêm model hoặc cập nhật mức độ suy luận thất bại. */
  modelNotice: string | null
  dismissModelNotice(): void
  /** Thông báo lỗi nếu không đọc được danh sách kết nối. */
  loadError: string | null
}

/** `picked` là model người dùng chọn riêng; nơi gọi giữ nó (state cục bộ hoặc store) để nó sống bao lâu tùy ý. */
export function useModelPicker(
  picked: ModelSelection | null,
  setPicked: (selection: ModelSelection | null) => void
): ModelPicker {
  const connections = useConnectionStore((state) => state.connections)
  const connectionLoad = useConnectionStore((state) => state.load)
  const loadError = useConnectionStore((state) => state.loadError)
  const main = useConnectionStore((state) => state.preferences?.main ?? null)
  const [modelNotice, setModelNotice] = useState<string | null>(null)

  useEffect(() => {
    if (connectionLoad === 'loading') {
      void useConnectionStore.getState().reload()
    }
  }, [connectionLoad])

  // Hỏi nhà cung cấp (`GET /models`) cho kết nối đang bật; `force` hỏi lại cả kết nối đã hỏi, trừ lượt đang chạy.
  const loadListings = useCallback((force: boolean) => {
    const { connections: current, tests, test } = useConnectionStore.getState()
    for (const item of current) {
      const asked = tests[item.id]
      if (item.enabled && !asked?.running && (force || asked === undefined)) void test(item.id)
    }
  }, [])
  const refreshConnections = useCallback(() => {
    void useConnectionStore
      .getState()
      .reload()
      .then(() => loadListings(false))
  }, [loadListings])
  const refreshModels = useCallback(() => {
    void useConnectionStore
      .getState()
      .reload()
      .then(() => loadListings(true))
  }, [loadListings])
  const tests = useConnectionStore((state) => state.tests)

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
      setPicked(selection)
      const outcome = await useConnectionStore.getState().entries.update(selection.entryId, {
        settings: thinkingPatch(choice)
      })
      setModelNotice(outcome.ok ? null : outcome.message)
    },
    [setPicked]
  )

  // Ưu tiên model chọn riêng, nếu không thì lấy model mặc định trong Cài đặt.
  const choice = useMemo(
    () =>
      resolveModelChoice(
        connections,
        { connectionId: picked?.connectionId ?? null, entryId: picked?.entryId ?? null },
        main
      ),
    [connections, picked, main]
  )
  const usable = useMemo(
    () => connections.filter((connection) => connection.enabled),
    [connections]
  )
  const connection = usable.find((entry) => entry.id === choice?.connectionId) ?? null
  const suggestions = useMemo(
    () =>
      new Map(usable.map((item) => [item.id, addableModels(tests[item.id]?.models ?? [], item)])),
    [usable, tests]
  )

  return {
    usable,
    connection,
    selection:
      choice && connection ? { connectionId: connection.id, entryId: choice.entryId } : null,
    selectModel: setPicked,
    overridesMain: choice?.source === 'picked' && main !== null && main.entryId !== choice.entryId,
    useDefaultModel: () => setPicked(null),
    addCustomModel,
    setThinking,
    refreshConnections,
    refreshModels,
    refreshing: usable.some((item) => tests[item.id]?.running),
    suggestions,
    modelNotice,
    dismissModelNotice: () => setModelNotice(null),
    loadError
  }
}
