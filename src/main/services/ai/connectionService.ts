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
  readKeyCiphers,
  removeKey,
  reorderModelEntries,
  updateModelEntry,
  type ConnectionView as StoredConnection,
  type ModelEntry,
  type ModelEntryInput
} from '../../infra/storage/connections'
import { StorageError } from '../../infra/storage/errors'
import {
  CONNECTION_PRESETS,
  type EndpointProbeResult,
  type EnsureWithKeyInput,
  type ProbeEndpointInput
} from '../../../shared/contracts/aiConnections'
import { probeEndpoint } from './endpointProbe'
import {
  pruneAiPreferences,
  readAiPreferences,
  writeFallbacks,
  writeMainModel,
  writeOnboardingSkipped
} from '../../infra/storage/aiPreferences'
import type { AiPreferences, MainModel, ModelRef } from '../../../shared/contracts/aiPreferences'
import type { SecretStore } from '../../infra/storage/secretStore'
import type { Db } from '../../infra/storage/sqlite'
import { resolveCompat } from '../../infra/providers/compat'
import { DEFAULT_CONCURRENCY, GatewayRegistry } from '../../infra/providers/gateway/gateway'
import { createConnectionKeySource } from '../../infra/providers/connectionKeySource'
import { buildGeneration, settingsKey } from '../../infra/providers/generation'
import { CATALOG_READ_AT, lookupModel, type ModelInfo } from '../../infra/providers/modelCatalog'
import {
  checkThinkingLevel,
  describeThinkingCheck,
  modelCapability
} from '../../infra/providers/modelCapability'
import { sentParameters } from '../../infra/providers/openAiChatTransport'
import {
  OpenAiCompatibleProvider,
  type KeySource,
  type OpenAiCompatibleOptions
} from '../../infra/providers/openAiCompatible'
import { ProviderError } from '../../infra/providers/types'
import { describeProviderError, taskErrorPolicy } from './errorPolicy'
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
    // Lỗi cài đặt (`auth`, `invalid_request`, `refused`) là `validation`; phần còn lại là trục trặc đường
    // truyền. Bảng nằm ở `errorPolicy.ts`.
    const code = taskErrorPolicy('probe', error.kind).probeCode ?? 'io'
    throw new StorageError(code, describeProviderError(error), { cause: error })
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
    pruneAiPreferences(this.options.db)
    this.registry.forget(id)
    return this.list()
  }

  /** Settings › Model: the main model, the fallbacks, and whether onboarding was put off. */
  preferences(): AiPreferences {
    return readAiPreferences(this.options.db)
  }

  setMainModel(main: MainModel | null): AiPreferences {
    if (main) findModelEntry(this.options.db, main.entryId)
    writeMainModel(this.options.db, main)
    return this.preferences()
  }

  setFallbacks(fallbacks: ModelRef[]): AiPreferences {
    for (const ref of fallbacks) findModelEntry(this.options.db, ref.entryId)
    writeFallbacks(this.options.db, fallbacks)
    return this.preferences()
  }

  setOnboardingSkipped(skipped: boolean): AiPreferences {
    writeOnboardingSkipped(this.options.db, skipped)
    return this.preferences()
  }

  /** Lần duy nhất khóa đi vào; trả về view đã che. */
  async addApiKey(id: string, secret: string): Promise<ConnectionView> {
    const { db, secrets, now, newId } = this.options
    getConnection(db, id)
    const sealed = await secrets.seal(secret)
    return toView(addKey(db, id, newId(), sealed, now()))
  }

  /**
   * A key pasted into a provider card: the connection is made from the preset if there is none yet, then the
   * key is added. One call, so a card never ends up with a connection and no key.
   */
  async ensureWithKey({ providerId, secret }: EnsureWithKeyInput): Promise<ConnectionView> {
    const { db, now, newId } = this.options
    const preset = CONNECTION_PRESETS.find((item) => item.providerId === providerId)
    if (!preset)
      throw new StorageError('validation', 'Nhà cung cấp chưa được hỗ trợ: ' + providerId)
    const existing = listConnections(db).find((item) => item.providerId === providerId)
    const connection =
      existing ??
      insertConnection(
        db,
        newId(),
        { name: preset.label, baseUrl: preset.baseUrl, providerId },
        now()
      )
    return this.addApiKey(connection.id, secret)
  }

  /**
   * Checks an address with a key typed now or the first usable key of a connection (design D5 of change
   * `hermes-settings-modal`). Saves nothing; the caller decides whether to keep `resolvedBaseUrl`.
   */
  async probe(input: ProbeEndpointInput): Promise<EndpointProbeResult> {
    const { db, secrets, fetchImpl } = this.options
    let apiKey = input.secret || undefined
    if (!apiKey && input.connectionId) {
      const usable = readKeyCiphers(db, input.connectionId).find((key) => key.state === 'ok')
      if (usable) apiKey = (await secrets.open(usable.cipher)).value
    }
    return probeEndpoint({
      baseUrl: input.baseUrl,
      apiKey,
      model: input.model,
      fetchImpl: fetchImpl ?? fetch
    })
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
    // Kiểm mức suy luận ở main cho **mọi** đường lưu, không chỉ form, nhưng chỉ khi bản vá đặt mức. Đổi
    // model hay đổi tên không bị chặn vì một mức đã lưu từ trước: mức đó được báo trên form và bị chặn
    // ngay trước lời gọi (`blockedBy` trong `translator`), nên không có request sai nào đi ra.
    if (patch.settings !== undefined && 'thinking' in patch.settings) {
      const model = patch.model ?? entry.model
      const level = (settings ?? entry.settings).thinking
      const connection = getConnection(db, connectionId)
      const check = checkThinkingLevel(
        lookupModel(model, connection.providerId ?? undefined),
        level
      )
      if (!check.ok && level !== undefined) {
        throw new StorageError('validation', describeThinkingCheck(model, level, check))
      }
    }
    updateModelEntry(db, entryId, { name: patch.name, model: patch.model, settings })
    return toView(getConnection(db, connectionId))
  }

  duplicateEntry(entryId: string): ConnectionView {
    const { db, newId } = this.options
    return toView(duplicateModelEntry(db, entryId, newId()))
  }

  deleteEntry(entryId: string): ConnectionView {
    const view = deleteModelEntry(this.options.db, entryId)
    pruneAiPreferences(this.options.db)
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
    const generation = buildGeneration(entry.settings)
    // Mức đã lưu có thể không còn hợp lệ (catalog đổi sau khi lưu, hay Lab ghi thẳng): chặn trước khi gọi.
    const level = entry.settings.thinking
    const check = checkThinkingLevel(
      lookupModel(entry.model, connection.providerId ?? undefined),
      level
    )
    const blockedBy =
      check.ok || level === undefined
        ? undefined
        : new ProviderError('invalid_request', describeThinkingCheck(entry.model, level, check), {
            sent: sentParameters({ model: entry.model, messages: [], ...generation })
          })

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
        generation,
        blockedBy,
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
