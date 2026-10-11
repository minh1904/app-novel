import { ChangeSet, Transaction, type EditorState, type Text } from '@codemirror/state'
import {
  applyEdits,
  checkSegments,
  toSegmentInputs,
  type Edit,
  type Seg
} from '../../../../../shared/segmentation/segmentMap'
import type { SegmentLanguage } from '../../../../../shared/segmentation/segmenter'
import type { Result } from '../../../../../shared/contracts/result'
import {
  SEGMENTS_MAX,
  TEXT_MAX_UNITS,
  type SegmentInput,
  type TextRecord
} from '../../../../../shared/contracts/text'
import { describeSaveFailure } from '../../../../../shared/text/rawImport'
import { savedTextsOf, segmentsField, setSaved, setSegments } from './editorState'
import { afterComposition, resegmentNow, type ViewLike } from './resegmenter'

/**
 * Quản lý phiên lưu trữ và trạng thái chỉnh sửa văn bản của một bên chương từ trình soạn thảo.
 */

/** Kho lưu trữ cho một bên văn bản của chương. */
export interface TextStore {
  save(content: string, expectedRev: number, segments: SegmentInput[]): Promise<Result<TextRecord>>
  get(): Promise<Result<TextRecord>>
}

export interface SessionView extends ViewLike {
  setState(state: EditorState): void
}

export type SaveState = 'saved' | 'dirty' | 'saving' | 'conflict' | 'error'

export interface SessionStatus {
  state: SaveState
  /** Thông báo lỗi chi tiết khi ở trạng thái conflict hoặc error. */
  message: string | null
  /** Đánh dấu văn bản hiện tại có khác với bản lưu gần nhất hay không. */
  dirty: boolean
}

export type SaveOutcome =
  | { kind: 'saved'; record: TextRecord }
  | { kind: 'unchanged' }
  | { kind: 'failed'; state: 'conflict' | 'error'; message: string }

export const CONFLICT_MESSAGE =
  'Bản đang sửa chưa được lưu, và chữ bạn đã sửa vẫn còn nguyên ở đây. Có thể bạn vừa thay bản gốc của chương.'

function editsOf(changes: ChangeSet): Edit[] {
  const edits: Edit[] = []
  changes.iterChanges((from, to, _fromB, _toB, inserted) => {
    edits.push({ from, to, insert: inserted.toString() })
  })
  return edits
}

export class EditorSession {
  private rev: number
  private knownIds: Set<string>
  private savedDoc: Text
  private state: SaveState = 'saved'
  private busy = false
  private queued = false
  private inFlight: Promise<SaveOutcome> | null = null
  /** Các thay đổi diễn ra trong lúc đang gửi yêu cầu lưu; chỉ giữ khi đang lưu. */
  private since: ChangeSet | null = null
  private snapshot: SessionStatus
  private readonly listeners = new Set<() => void>()

  constructor(
    private readonly view: SessionView,
    private readonly store: TextStore,
    private readonly lang: SegmentLanguage,
    private readonly makeState: (record: TextRecord) => EditorState,
    record: TextRecord
  ) {
    this.rev = record.rev
    this.knownIds = new Set(record.segments.map((seg) => seg.id))
    this.savedDoc = view.state.doc
    this.snapshot = { state: 'saved', message: null, dirty: false }
  }

  /** Trả về true khi đang trong tiến trình lưu dữ liệu. */
  get saving(): boolean {
    return this.busy
  }

  get dirty(): boolean {
    return !this.view.state.doc.eq(this.savedDoc)
  }

  getStatus = (): SessionStatus => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Nhận mọi cập nhật từ trình soạn thảo (updateListener). */
  onUpdate(update: { docChanged: boolean; changes: ChangeSet }): void {
    if (!update.docChanged) return
    if (this.busy && this.since) this.since = this.since.compose(update.changes)
    if (this.state === 'saved' || this.state === 'dirty') this.set(this.dirty ? 'dirty' : 'saved')
  }

  private set(state: SaveState, message: string | null = null): void {
    this.state = state
    const dirty = this.dirty
    if (
      this.snapshot.state === state &&
      this.snapshot.message === message &&
      this.snapshot.dirty === dirty
    ) {
      return
    }
    this.snapshot = { state, message, dirty }
    this.listeners.forEach((listener) => listener())
  }

  /** Thực hiện lưu ngay, hoặc xếp hàng nếu đang có một lượt lưu khác đang chạy. */
  save(): Promise<SaveOutcome> {
    if (this.busy && this.inFlight) {
      this.queued = true
      return this.inFlight
    }
    this.inFlight = this.run()
    return this.inFlight
  }

  private async run(): Promise<SaveOutcome> {
    this.busy = true
    try {
      let outcome = await this.once()
      while (this.queued) {
        this.queued = false
        if (outcome.kind === 'failed') break
        outcome = await this.once()
      }
      return outcome
    } finally {
      this.busy = false
      this.inFlight = null
    }
  }

  private async once(): Promise<SaveOutcome> {
    // Không ghi dữ liệu khi bộ gõ IME đang soạn thảo ký tự chưa hoàn tất
    do {
      await afterComposition(this.view)
    } while (resegmentNow(this.view, this.lang) === 'composing')

    const doc = this.view.state.doc
    if (doc.eq(this.savedDoc)) {
      if (this.state === 'dirty' || this.state === 'saving') this.set('saved')
      return { kind: 'unchanged' }
    }

    const content = doc.toString()
    const segs = this.view.state.field(segmentsField)
    const refusal = this.refusal(content, segs)
    if (refusal !== null) return this.fail('error', refusal)

    // Nếu ID không còn tồn tại trong kho (ví dụ hoàn tác mang lại segment đã xóa), gửi như segment mới
    const sent: Seg[] = segs.map((seg) =>
      seg.id !== null && !this.knownIds.has(seg.id) ? { ...seg, id: null } : seg
    )
    this.since = ChangeSet.empty(doc.length)
    this.set('saving')

    const result = await this.store.save(content, this.rev, toSegmentInputs(sent))
    const since = this.since
    this.since = null
    if (!result.ok) {
      return result.error.code === 'conflict'
        ? this.fail('conflict', CONFLICT_MESSAGE)
        : this.fail('error', describeSaveFailure(result.error))
    }

    await afterComposition(this.view)
    this.adopt({ doc, content, sent }, result.value, since)
    return { kind: 'saved', record: result.value }
  }

  private refusal(content: string, segs: Seg[]): string | null {
    if (content.length > TEXT_MAX_UNITS) {
      return (
        'Văn bản dài ' +
        content.length.toLocaleString('vi') +
        ' ký tự, vượt giới hạn ' +
        TEXT_MAX_UNITS.toLocaleString('vi') +
        '. Hãy rút bớt rồi lưu lại.'
      )
    }
    if (segs.length > SEGMENTS_MAX) {
      return (
        'Có ' +
        segs.length.toLocaleString('vi') +
        ' segment, vượt giới hạn ' +
        SEGMENTS_MAX.toLocaleString('vi') +
        '. Hãy rút bớt rồi lưu lại.'
      )
    }
    const problems = checkSegments(content, segs)
    if (problems.length > 0) {
      return (
        'Không lưu được vì các segment không khớp với văn bản (' +
        problems[0] +
        ') Văn bản của bạn vẫn còn nguyên.'
      )
    }
    return null
  }

  private fail(state: 'conflict' | 'error', message: string): SaveOutcome {
    this.set(state, message)
    return { kind: 'failed', state, message }
  }

  /**
   * Cập nhật lại các thông tin ID và revision trả về từ kho lưu trữ sau khi lưu thành công.
   */
  private adopt(
    snapshot: { doc: Text; content: string; sent: Seg[] },
    record: TextRecord,
    since: ChangeSet | null
  ): void {
    const given = snapshot.sent.map((seg, index) => ({
      ...seg,
      id: record.segments[index]?.id ?? seg.id,
      edited: false
    }))
    // Ánh xạ lại vị trí segment theo các thay đổi người dùng vừa gõ trong lúc đang lưu
    const mapped = applyEdits(given, since ? editsOf(since) : [])
    const byRange = new Map(mapped.map((seg) => [seg.from + ':' + seg.to, seg]))
    const kept = new Set(record.segments.map((seg) => seg.id))

    const current = this.view.state.field(segmentsField)
    const next = current.map((seg) => {
      const match = byRange.get(seg.from + ':' + seg.to)
      if (!match) return seg
      const id = seg.id !== null && kept.has(seg.id) ? seg.id : match.id
      return id === seg.id && match.edited === seg.edited
        ? seg
        : { ...seg, id, edited: match.edited }
    })

    this.view.dispatch({
      effects: [setSegments.of(next), setSaved.of(savedTextsOf(snapshot.content, record.segments))],
      annotations: Transaction.addToHistory.of(false)
    })
    this.rev = record.rev
    this.knownIds = kept
    this.savedDoc = snapshot.doc
    this.set(this.dirty ? 'dirty' : 'saved')
  }

  /** Hủy bỏ các nội dung chưa lưu và tải lại văn bản từ kho lưu trữ. */
  async reload(): Promise<TextRecord | null> {
    const result = await this.store.get()
    if (!result.ok) {
      this.set('error', describeSaveFailure(result.error))
      return null
    }
    this.load(result.value)
    return result.value
  }

  private load(record: TextRecord): void {
    this.view.setState(this.makeState(record))
    this.rev = record.rev
    this.knownIds = new Set(record.segments.map((seg) => seg.id))
    this.savedDoc = this.view.state.doc
    this.since = null
    this.set('saved')
  }
}
