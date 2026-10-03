import type {
  ConnectionTestResult,
  ConnectionView,
  CreateConnectionInput,
  ModelInfoView,
  UpdateConnectionInput
} from '../../../shared/aiConnections'
import {
  addKey,
  deleteConnection,
  getConnection,
  insertConnection,
  listConnections,
  patchConnection,
  removeKey,
  setModels
} from '../../infra/storage/connections'
import { StorageError } from '../../infra/storage/errors'
import type { SecretStore } from '../../infra/storage/secretStore'
import type { Db } from '../../infra/storage/sqlite'
import { createConnectionKeySource } from '../../infra/providers/connectionKeySource'
import { CATALOG_READ_AT, lookupModel, type ModelInfo } from '../../infra/providers/modelCatalog'
import { OpenAiCompatibleProvider, type KeySource } from '../../infra/providers/openAiCompatible'
import { ProviderError } from '../../infra/providers/types'

/**
 * Mọi thao tác với kết nối AI mà tầng IPC cần, gom một chỗ.
 *
 * Khóa API vào qua `addApiKey` rồi **không ra nữa**: mọi giá trị trả về là `ConnectionView`, chỉ
 * mang bốn ký tự cuối (D2 của change `ai-connection`).
 */
export interface ConnectionServiceOptions {
  db: Db
  secrets: SecretStore
  now: () => number
  newId: () => string
  /** Tiêm vào để test; mặc định là `fetch` của Node. */
  fetchImpl?: typeof fetch
}

/** Lỗi của nhà cung cấp đi qua IPC như dữ liệu, giống mọi lỗi khác. */
function toStorageError(error: unknown): never {
  if (error instanceof ProviderError) {
    // `auth` và `refused` không thử lại được; phần còn lại là trục trặc đường truyền.
    const code = error.kind === 'auth' || error.kind === 'refused' ? 'validation' : 'io'
    throw new StorageError(code, error.message, { cause: error })
  }
  throw error
}

function toModelView(id: string, info: ModelInfo | undefined): ModelInfoView {
  const view: ModelInfoView = { id, name: info?.name ?? id }
  if (info?.contextLimit !== undefined) view.contextLimit = info.contextLimit
  if (info?.outputLimit !== undefined) view.outputLimit = info.outputLimit
  if (info?.cost?.input !== undefined) view.inputCost = info.cost.input
  if (info?.cost?.output !== undefined) view.outputCost = info.cost.output
  if (info?.status !== undefined) view.status = info.status
  return view
}

/** Một kết nối đã sẵn sàng gọi, cộng cách biết khóa nào vừa được dùng. */
export interface ConnectionTranslator {
  connection: ConnectionView
  provider: OpenAiCompatibleProvider
  /**
   * Bốn ký tự cuối của khóa dùng ở lần gọi gần nhất, `null` khi kết nối không có khóa. Hộp thoại
   * dịch so số này giữa hai lô để nói "đã chuyển sang khóa …" mà không cần kênh sự kiện.
   */
  lastKeyTail(): string | null
}

export class ConnectionService {
  constructor(private readonly options: ConnectionServiceOptions) {}

  list(): { connections: ConnectionView[] } {
    return { connections: listConnections(this.options.db) }
  }

  create(input: CreateConnectionInput): ConnectionView {
    const { db, now, newId } = this.options
    return insertConnection(db, newId(), input, now())
  }

  update({ id, patch }: UpdateConnectionInput): ConnectionView {
    return patchConnection(this.options.db, id, patch, this.options.now())
  }

  delete(id: string): { connections: ConnectionView[] } {
    deleteConnection(this.options.db, id)
    return this.list()
  }

  /** Lần duy nhất khóa đi vào; trả về view đã che. */
  async addApiKey(id: string, secret: string): Promise<ConnectionView> {
    const { db, secrets, now, newId } = this.options
    getConnection(db, id)
    const sealed = await secrets.seal(secret)
    return addKey(db, id, newId(), sealed, now())
  }

  removeApiKey(id: string, keyId: string): ConnectionView {
    removeKey(this.options.db, keyId)
    return getConnection(this.options.db, id)
  }

  setModels(id: string, models: string[]): ConnectionView {
    return setModels(this.options.db, id, models)
  }

  /**
   * Một kết nối đã dựng xong provider, cho tầng dịch chương dùng. Kết nối đang tắt thì từ chối
   * ngay: người dùng tắt nó là có ý, đừng âm thầm gọi.
   */
  translator(id: string, model: string): ConnectionTranslator {
    const { db, secrets, now, fetchImpl } = this.options
    const connection = getConnection(db, id)
    if (!connection.enabled) {
      throw new StorageError('validation', 'Kết nối “' + connection.name + '” đang tắt.')
    }

    let lastKeyId: string | null = null
    const source = createConnectionKeySource({ db, connectionId: id, secrets, now })
    const keys: KeySource = {
      async acquire() {
        const lease = await source.acquire()
        if (!('exhausted' in lease)) lastKeyId = lease.id
        return lease
      },
      report: (keyId, outcome) => source.report(keyId, outcome)
    }

    return {
      connection,
      provider: new OpenAiCompatibleProvider({
        baseUrl: connection.baseUrl,
        model,
        keys,
        fetchImpl,
        now
      }),
      lastKeyTail: () => connection.keys.find((key) => key.id === lastKeyId)?.tail ?? null
    }
  }

  /**
   * Kiểm tra kết nối bằng `GET {base}/models` — rẻ và trả luôn danh sách model. Giá và giới hạn
   * lấy từ bản chụp đi kèm; model không có trong bản chụp vẫn liệt kê, chỉ là không có giá.
   */
  async test(id: string): Promise<ConnectionTestResult> {
    const { db, secrets, now, fetchImpl } = this.options
    const connection = getConnection(db, id)

    const provider = new OpenAiCompatibleProvider({
      baseUrl: connection.baseUrl,
      model: connection.defaultModel ?? '',
      keys: createConnectionKeySource({ db, connectionId: id, secrets, now }),
      fetchImpl,
      now
    })

    let listed = false
    let ids: string[] = []
    try {
      const result = await provider.listModels()
      ids = result.models
      listed = result.listed
    } catch (error) {
      toStorageError(error)
    }

    const updated = patchConnection(db, id, { checkedAt: now() }, now())
    return {
      connection: updated,
      catalogReadAt: CATALOG_READ_AT,
      models: ids.map((modelId) =>
        toModelView(modelId, lookupModel(modelId, connection.providerId ?? undefined))
      ),
      listed
    }
  }
}
