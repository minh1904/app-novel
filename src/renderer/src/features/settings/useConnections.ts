import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ConnectionTestResult,
  ConnectionView,
  CreateConnectionInput,
  ModelInfoView,
  UpdateConnectionInput
} from '../../../../shared/contracts/aiConnections'
import type { IpcError } from '../../../../shared/contracts/result'

export type ConnectionsLoad = 'loading' | 'ready' | 'failed'

/** Kết quả kiểm tra của một kết nối, giữ ở renderer để hiện danh sách model vừa lấy được. */
export interface TestState {
  running: boolean
  models: ModelInfoView[]
  listed: boolean
  /** Ngày của bảng giá đi kèm bản cài, chỉ biết sau khi kiểm tra. */
  catalogReadAt: string | null
  /** Lỗi gắn với ô nào: khóa sai thì cạnh ô khóa, không nối được thì cạnh ô địa chỉ. */
  error: { field: 'url' | 'key' | 'form'; message: string } | null
}

export interface ConnectionsController {
  load: ConnectionsLoad
  connections: ConnectionView[]
  loadError: string | null
  notice: string | null
  tests: Record<string, TestState>
  dismissNotice(): void
  reload(): Promise<void>
  create(input: CreateConnectionInput): Promise<void>
  update(id: string, patch: UpdateConnectionInput['patch']): Promise<void>
  remove(id: string): Promise<void>
  addKey(id: string, secret: string): Promise<boolean>
  removeKey(id: string, keyId: string): Promise<void>
  setModels(id: string, models: string[]): Promise<void>
  test(id: string): Promise<void>
}

/** Lỗi được gắn vào đúng ô gây ra nó, để người dùng không phải đoán chỗ sửa. */
function fieldOf(error: IpcError): 'url' | 'key' | 'form' {
  const message = error.message.toLowerCase()
  if (/khóa|api key|unauthor|forbidden|credential/.test(message)) return 'key'
  if (/nối|connect|fetch|địa chỉ|url|econnrefused|timeout/.test(message)) return 'url'
  return 'form'
}

const emptyTest: TestState = {
  running: false,
  models: [],
  listed: false,
  catalogReadAt: null,
  error: null
}

export function useConnections(): ConnectionsController {
  const [load, setLoad] = useState<ConnectionsLoad>('loading')
  const [connections, setConnections] = useState<ConnectionView[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [tests, setTests] = useState<Record<string, TestState>>({})
  // Chỉ lần nạp mới nhất được ghi state, để một phản hồi chậm không đè lên phản hồi mới hơn.
  const loadId = useRef(0)

  const apply = useCallback((result: Awaited<ReturnType<typeof window.mira.ai.list>>) => {
    if (result.ok) {
      setConnections(result.value.connections)
      setLoad('ready')
      setLoadError(null)
    } else {
      setLoad('failed')
      setLoadError(result.error.message)
    }
  }, [])

  const reload = useCallback(async () => {
    const ticket = ++loadId.current
    const result = await window.mira.ai.list()
    if (ticket === loadId.current) apply(result)
  }, [apply])

  // Gọi thẳng trong effect như `useLibrary`: state chỉ đổi trong `.then`, không đổi ngay lúc chạy.
  useEffect(() => {
    const ticket = ++loadId.current
    void window.mira.ai.list().then((result) => {
      if (ticket === loadId.current) apply(result)
    })
  }, [apply])

  /** Mọi thao tác ghi đều trả về kết nối mới, nên chỉ cần thay đúng phần tử đó. */
  const applyOne = useCallback((connection: ConnectionView) => {
    setConnections((current) => {
      const index = current.findIndex((item) => item.id === connection.id)
      if (index === -1) return [...current, connection]
      const next = [...current]
      next[index] = connection
      return next
    })
  }, [])

  const run = useCallback(
    async (
      action: () => Promise<{ ok: true; value: ConnectionView } | { ok: false; error: IpcError }>
    ): Promise<boolean> => {
      const result = await action()
      if (result.ok) {
        applyOne(result.value)
        return true
      }
      setNotice(result.error.message)
      return false
    },
    [applyOne]
  )

  const setTest = useCallback((id: string, patch: Partial<TestState>) => {
    setTests((current) => ({ ...current, [id]: { ...(current[id] ?? emptyTest), ...patch } }))
  }, [])

  return {
    load,
    connections,
    loadError,
    notice,
    tests,
    dismissNotice: () => setNotice(null),
    reload,
    async create(input) {
      const result = await window.mira.ai.create(input)
      if (result.ok) applyOne(result.value)
      else setNotice(result.error.message)
    },
    async update(id, patch) {
      await run(() => window.mira.ai.update(id, patch))
    },
    async remove(id) {
      const result = await window.mira.ai.delete(id)
      if (result.ok) setConnections(result.value.connections)
      else setNotice(result.error.message)
    },
    async addKey(id, secret) {
      const result = await window.mira.ai.addKey(id, secret)
      if (result.ok) {
        applyOne(result.value)
        setTest(id, { error: null })
        return true
      }
      // Kho khóa hệ điều hành không dùng được là lỗi của cả biểu mẫu, không riêng ô khóa.
      setTest(id, { error: { field: fieldOf(result.error), message: result.error.message } })
      return false
    },
    async removeKey(id, keyId) {
      await run(() => window.mira.ai.removeKey(id, keyId))
    },
    async setModels(id, models) {
      await run(() => window.mira.ai.setModels(id, models))
    },
    async test(id) {
      setTest(id, { running: true, error: null })
      const result = await window.mira.ai.test(id)
      if (result.ok) {
        const value: ConnectionTestResult = result.value
        applyOne(value.connection)
        setTest(id, {
          running: false,
          models: value.models,
          listed: value.listed,
          catalogReadAt: value.catalogReadAt,
          error: null
        })
      } else {
        setTest(id, {
          running: false,
          error: { field: fieldOf(result.error), message: result.error.message }
        })
      }
    }
  }
}
