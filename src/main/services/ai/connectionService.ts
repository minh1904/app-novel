import type {
  ConnectionTestResult,
  ConnectionView,
  CreateConnectionInput,
  ModelEntryTestResult,
  ModelInfoView,
  UpdateConnectionInput
} from '../../../shared/contracts/aiConnections'
import {
  applySettingsPatch,
  type ModelEntryView,
  type ModelSettingsPatch
} from '../../../shared/contracts/modelSettings'
import {
  addKey,
  addModelEntry,
  deleteConnection,
  deleteModelEntry,
  duplicateModelEntry,
  findModelEntry,
  getConnection,
  getModelEntry,
  insertConnection,
  listConnections,
  patchConnection,
  removeKey,
  reorderModelEntries,
  updateModelEntry,
  type ConnectionView as StoredConnection,
  type ModelEntry,
  type ModelEntryInput
} from '../../infra/storage/connections'
import { StorageError } from '../../infra/storage/errors'
import type { SecretStore } from '../../infra/storage/secretStore'
import type { Db } from '../../infra/storage/sqlite'
import { resolveCompat } from '../../infra/providers/compat'
import { DEFAULT_CONCURRENCY, GatewayRegistry } from '../../infra/providers/gateway/gateway'
import { createConnectionKeySource } from '../../infra/providers/connectionKeySource'
import { buildGeneration, settingsKey } from '../../infra/providers/generation'
import { CATALOG_READ_AT, lookupModel, type ModelInfo } from '../../infra/providers/modelCatalog'
import { modelCapability } from '../../infra/providers/modelCapability'
import {
  OpenAiCompatibleProvider,
  type KeySource,
  type OpenAiCompatibleOptions
} from '../../infra/providers/openAiCompatible'
import { ProviderError } from '../../infra/providers/types'
import { toWireUsage } from '../../infra/providers/usage'

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
  /** Tiêm vào để test: để một lần thử lại không tốn thời gian thật. Mặc định là chính sách thật. */
  retry?: Pick<OpenAiCompatibleOptions, 'retry' | 'sleep' | 'random'>
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

/**
 * Kết nối ở dạng đi qua IPC: mỗi mục model kèm khả năng của model đó (mức suy luận nào được đưa ra, có nhận
 * nhiệt độ không), đọc từ bảng dữ liệu đi kèm bản cài. Kho không biết bảng đó nên việc ghép nằm ở đây.
 */
function toView(connection: StoredConnection): ConnectionView {
  const models: ModelEntryView[] = connection.models.map((entry) => ({
    ...entry,
    capability: modelCapability(lookupModel(entry.model, connection.providerId ?? undefined))
  }))
  return { ...connection, models }
}

/** Một kết nối đã sẵn sàng gọi bằng một mục model, cộng cách biết khóa nào vừa được dùng. */
export interface ConnectionTranslator {
  connection: ConnectionView
  /** Mục đã dùng, như lúc dựng provider: cài đặt của nó đã nằm trong `provider`. */
  entry: ModelEntry
  /** Khóa cấu hình của mục lúc này; lô dịch so nó với khóa của kế hoạch (design D6). */
  settingsKey: string
  provider: OpenAiCompatibleProvider
  /**
   * Bốn ký tự cuối của khóa dùng ở lần gọi gần nhất, `null` khi kết nối không có khóa. Hộp thoại
   * dịch so số này giữa hai lô để nói "đã chuyển sang khóa …" mà không cần kênh sự kiện.
   */
  lastKeyTail(): string | null
}

export class ConnectionService {
  /**
   * Trạng thái phải sống lâu hơn một lời gọi: những gì mỗi khóa đã trải qua (mỗi **kết nối** một phần, vì
   * hạn mức là của khóa), và hàng chờ đồng thời cùng nhịp RPM (mỗi **mục model** một phần, vì người dùng đặt
   * chúng theo mục). Provider thì dựng mới mỗi lời gọi (địa chỉ, khóa và cài đặt đọc lại từ kho nên sửa có
   * hiệu lực ngay); chỉ phần này được giữ lại.
   */
  private readonly registry: GatewayRegistry

  constructor(private readonly options: ConnectionServiceOptions) {
    this.registry = new GatewayRegistry(options.now, DEFAULT_CONCURRENCY, options.retry?.sleep)
  }

  list(): { connections: ConnectionView[] } {
    return { connections: listConnections(this.options.db).map(toView) }
  }

  create(input: CreateConnectionInput): ConnectionView {
    const { db, now, newId } = this.options
    return toView(insertConnection(db, newId(), input, now()))
  }

  update({ id, patch }: UpdateConnectionInput): ConnectionView {
    return toView(patchConnection(this.options.db, id, patch, this.options.now()))
  }

  delete(id: string): { connections: ConnectionView[] } {
    deleteConnection(this.options.db, id)
    this.registry.forget(id)
    return this.list()
  }

  /** Lần duy nhất khóa đi vào; trả về view đã che. */
  async addApiKey(id: string, secret: string): Promise<ConnectionView> {
    const { db, secrets, now, newId } = this.options
    getConnection(db, id)
    const sealed = await secrets.seal(secret)
    return toView(addKey(db, id, newId(), sealed, now()))
  }

  removeApiKey(id: string, keyId: string): ConnectionView {
    removeKey(this.options.db, keyId)
    return toView(getConnection(this.options.db, id))
  }

  /**
   * Thêm các mục model vào cuối danh sách của kết nối, một lần trong một transaction: chọn nhiều model từ
   * danh sách lấy về thì được cả hoặc không gì. Mỗi mục mới có cài đặt trống nên gửi y như trước khi có cài đặt.
   */
  addModels(connectionId: string, items: ModelEntryInput[]): ConnectionView {
    const { db, newId } = this.options
    getConnection(db, connectionId)
    db.transaction(() => {
      for (const item of items) addModelEntry(db, connectionId, newId(), item)
    })
    return toView(getConnection(db, connectionId))
  }

  /**
   * Sửa một mục. `patch.settings` là một **bản vá**: chỉ những trường được nêu đổi, `null` là bỏ trường. Mỗi
   * hộp thoại gửi nhóm của nó và menu chọn mức gửi đúng `thinking`, nên không cái nào ghi đè cái khác.
   */
  updateEntry(
    entryId: string,
    patch: { name?: string; model?: string; settings?: ModelSettingsPatch }
  ): ConnectionView {
    const { db } = this.options
    const { connectionId, entry } = findModelEntry(db, entryId)
    const settings =
      patch.settings === undefined ? undefined : applySettingsPatch(entry.settings, patch.settings)
    updateModelEntry(db, entryId, { name: patch.name, model: patch.model, settings })
    return toView(getConnection(db, connectionId))
  }

  duplicateEntry(entryId: string): ConnectionView {
    const { db, newId } = this.options
    return toView(duplicateModelEntry(db, entryId, newId()))
  }

  deleteEntry(entryId: string): ConnectionView {
    const view = deleteModelEntry(this.options.db, entryId)
    this.registry.forgetEntry(entryId)
    return toView(view)
  }

  reorderEntries(connectionId: string, ids: string[]): ConnectionView {
    return toView(reorderModelEntries(this.options.db, connectionId, ids))
  }

  /**
   * Nút "Kiểm tra" của một mục (design D10): gửi một yêu cầu nhỏ bằng **đúng cài đặt đã lưu** của mục và nói
   * kết quả. Nhà cung cấp từ chối thì lỗi mang lời gốc của nó (đã che khóa), không đổi gì đã lưu.
   */
  async testEntry(entryId: string): Promise<ModelEntryTestResult> {
    const { connectionId } = findModelEntry(this.options.db, entryId)
    const { provider } = this.translator(connectionId, entryId)
    try {
      const { ms, usage } = await provider.probe()
      return { ms, usage: usage === null ? null : toWireUsage(usage) }
    } catch (error) {
      return toStorageError(error)
    }
  }

  /**
   * Một kết nối đã dựng xong provider cho **một mục model**, cho tầng dịch và chat dùng. Kết nối đang tắt thì
   * từ chối ngay: người dùng tắt nó là có ý, đừng âm thầm gọi. Một mục không thuộc kết nối là `not_found`.
   *
   * Cài đặt của mục được đọc **ở đây, một lần**, rồi nằm trong provider: một lượt chat gọi công cụ nhiều vòng
   * hay một lô dịch dùng nguyên bộ đó, nên sửa cài đặt giữa chừng không trộn hai cấu hình vào một lượt.
   */
  translator(id: string, entryId: string): ConnectionTranslator {
    const { db, secrets, now, fetchImpl } = this.options
    const stored = getConnection(db, id)
    if (!stored.enabled) {
      throw new StorageError('validation', 'Kết nối “' + stored.name + '” đang tắt.')
    }
    const entry = getModelEntry(db, id, entryId)
    const connection = toView(stored)

    let lastKeyId: string | null = null
    const runtime = this.registry.runtimeFor(id)
    // Đọc lại giới hạn của mục mỗi lần dựng: sửa đồng thời hay RPM có hiệu lực ở lời gọi kế tiếp.
    const entryRuntime = this.registry.entryRuntimeFor(id, entryId, {
      concurrency: entry.settings.concurrencyLimit,
      rpm: entry.settings.rpmLimit
    })
    const source = createConnectionKeySource({
      db,
      connectionId: id,
      secrets,
      now,
      scheduler: runtime.scheduler
    })
    const keys: KeySource = {
      async acquire() {
        const lease = await source.acquire()
        if (!('exhausted' in lease)) lastKeyId = lease.id
        return lease
      },
      report: (lease, outcome) => source.report(lease, outcome)
    }

    return {
      connection,
      entry,
      settingsKey: settingsKey(entry),
      provider: new OpenAiCompatibleProvider({
        baseUrl: connection.baseUrl,
        model: entry.model,
        keys,
        compat: resolveCompat(connection.providerId),
        limiter: entryRuntime.limiter,
        pacer: entryRuntime.pacer,
        generation: buildGeneration(entry.settings),
        inputTokenLimit: entry.settings.inputTokenLimit,
        ...this.options.retry,
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

    const runtime = this.registry.runtimeFor(id)
    // Liệt kê model không thuộc mục nào nên không có tên model, hàng chờ hay nhịp riêng.
    const provider = new OpenAiCompatibleProvider({
      baseUrl: connection.baseUrl,
      model: '',
      keys: createConnectionKeySource({
        db,
        connectionId: id,
        secrets,
        now,
        scheduler: runtime.scheduler
      }),
      compat: resolveCompat(connection.providerId),
      ...this.options.retry,
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

    const updated = toView(patchConnection(db, id, { checkedAt: now() }, now()))
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
