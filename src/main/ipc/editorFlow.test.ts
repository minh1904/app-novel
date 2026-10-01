import type { EditorState, TransactionSpec } from '@codemirror/state'
import { afterEach, describe, expect, it } from 'vitest'
import { undo } from '@codemirror/commands'
import { createEditorState } from '../../renderer/src/features/editor/editorState'
import {
  EditorSession,
  type SessionView,
  type TextStore
} from '../../renderer/src/features/editor/editorSession'
import { segmentsField } from '../../renderer/src/features/editor/editorState'
import { CHANNELS } from '../../shared/channels'
import type { Result } from '../../shared/result'
import { segment } from '../../shared/segmenter'
import { TEXT_MAX_UNITS, type TextRecord } from '../../shared/text'
import { LibraryStore } from '../storage/library'
import { createTempDirs } from '../storage/testing'
import { createLibraryHandlers } from './libraryHandlers'

/**
 * The editor's save path against a real store: what is typed, saved through the handler the app
 * uses, and read back after the library is closed and opened again.
 */
const tempDir = createTempDirs()
const stores: LibraryStore[] = []
afterEach(() => {
  for (const store of stores.splice(0)) store.close()
})

/** An editor view with no browser behind it. */
class FakeView implements SessionView {
  state: EditorState
  composing = false
  compositionStarted = false
  constructor(
    state: EditorState,
    private readonly onChange: (view: FakeView, tr: import('@codemirror/state').Transaction) => void
  ) {
    this.state = state
  }
  dispatch(spec: TransactionSpec): void {
    const tr = this.state.update(spec)
    this.state = tr.state
    this.onChange(this, tr)
  }
  setState(state: EditorState): void {
    this.state = state
  }
  type(from: number, insert: string, to = from): void {
    this.dispatch({ changes: { from, to, insert }, userEvent: 'input.type' })
  }
  undo(): void {
    undo({
      state: this.state,
      dispatch: (tr) => {
        this.state = tr.state
        this.onChange(this, tr)
      }
    })
  }
  get text(): string {
    return this.state.doc.toString()
  }
}

interface Rig {
  library: LibraryStore
  dataDir: string
  workId: string
  chapterId: string
  initial: TextRecord
  store: TextStore & { saves: number; lastResult: Result<TextRecord> | null }
  handlers: ReturnType<typeof createLibraryHandlers>
  open(): { view: FakeView; session: EditorSession }
  /** Replaces what the store holds, as another window or "Thay bản gốc" would. */
  replaceElsewhere(content: string): Promise<void>
}

async function setup(content: string, lang: 'en' | 'ja' = 'en'): Promise<Rig> {
  const dataDir = tempDir()
  const library = LibraryStore.open({ dataDir })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  const work = library.create({ title: 'Thử', sourceLang: lang })
  const chapter = library.createChapter(work.id, 'Một').chapter
  const ref = { workId: work.id, chapterId: chapter.id, side: 'source' as const }

  const first = (await handlers[CHANNELS.textSave]({
    ...ref,
    content,
    expectedRev: 0,
    segments: segment(content, lang)
  })) as Result<TextRecord>
  if (!first.ok) throw new Error(first.error.message)

  const store: Rig['store'] = {
    saves: 0,
    lastResult: null,
    async save(text, expectedRev, segments) {
      store.saves++
      const result = (await handlers[CHANNELS.textSave]({
        ...ref,
        content: text,
        expectedRev,
        segments
      })) as Result<TextRecord>
      store.lastResult = result
      return result
    },
    async get() {
      return (await handlers[CHANNELS.textGet](ref)) as Result<TextRecord>
    }
  }

  const make = (record: TextRecord): EditorState =>
    createEditorState({ content: record.content, segments: record.segments, extensions: [] })

  return {
    library,
    dataDir,
    workId: work.id,
    chapterId: chapter.id,
    initial: first.value,
    store,
    handlers,
    open() {
      let session: EditorSession | null = null
      const view = new FakeView(make(first.value), (_view, tr) => {
        session?.onUpdate({ docChanged: tr.docChanged, changes: tr.changes })
      })
      session = new EditorSession(view, store, lang, make, first.value)
      return { view, session }
    },
    async replaceElsewhere(text) {
      const current = library.readText(work.id, chapter.id, 'source')
      const result = (await handlers[CHANNELS.textSave]({
        ...ref,
        content: text,
        expectedRev: current.rev,
        segments: segment(text, lang)
      })) as Result<TextRecord>
      if (!result.ok) throw new Error(result.error.message)
    }
  }
}

const ids = (view: FakeView): Array<string | null> =>
  view.state.field(segmentsField).map((s) => s.id)
const SAMPLE = 'Trời mưa to. Anh ở nhà.\n\nCô đi ra ngoài.\nHết rồi.'

describe('saving from the editor', () => {
  it('stores the edited text, and the same text and IDs come back after reopening', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    const idsBefore = ids(view)
    view.type(5, 'rất ')
    expect(session.getStatus().state).toBe('dirty')

    const outcome = await session.save()
    expect(outcome.kind).toBe('saved')
    expect(session.getStatus()).toMatchObject({ state: 'saved', dirty: false })

    rig.library.close()
    stores.splice(stores.indexOf(rig.library), 1)
    const reopened = LibraryStore.open({ dataDir: rig.dataDir })
    stores.push(reopened)
    const read = reopened.readText(rig.workId, rig.chapterId, 'source')
    expect(read.content).toBe(view.text)
    expect(read.content.startsWith('Trời rất mưa to.')).toBe(true)
    expect(read.segments.map((s) => s.id)).toEqual(idsBefore)
    expect(read.rev).toBe(rig.initial.rev + 1)
  })

  it('writes nothing when nothing changed', async () => {
    const rig = await setup(SAMPLE)
    const { session } = rig.open()
    expect(await session.save()).toEqual({ kind: 'unchanged' })
    expect(rig.store.saves).toBe(0)
  })

  it('writes nothing after typing and undoing back to the saved text', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    view.type(5, 'x')
    view.undo()
    expect(session.getStatus().dirty).toBe(false)
    expect((await session.save()).kind).toBe('unchanged')
    expect(rig.store.saves).toBe(0)
  })

  it('gives a new sentence an ID from the store, and leaves the others alone', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    const before = ids(view)
    const at = SAMPLE.indexOf('\n\n') + 1
    view.type(at, 'Một câu mới.')
    await session.save()
    const after = ids(view)
    expect(after).toHaveLength(before.length + 1)
    expect(after.every((id) => id !== null)).toBe(true)
    expect(after.filter((id) => !before.includes(id))).toHaveLength(1)
    expect(before.every((id) => after.includes(id))).toBe(true)
  })

  it('refuses text over the limit, says so, and keeps what was typed', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    view.type(0, 'a'.repeat(TEXT_MAX_UNITS))
    const outcome = await session.save()
    expect(outcome).toMatchObject({ kind: 'failed', state: 'error' })
    expect(session.getStatus().message).toContain('giới hạn')
    expect(view.text.length).toBeGreaterThan(TEXT_MAX_UNITS)
    expect(rig.store.saves).toBe(0)
    expect(rig.library.readText(rig.workId, rig.chapterId, 'source').content).toBe(SAMPLE)
  })

  it('keeps the text and the unsaved state when the store fails, and can try again', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    view.type(5, 'rất ')
    const real = rig.store.save
    rig.store.save = async () => ({ ok: false, error: { code: 'io', message: 'ổ đĩa đầy' } })
    const failed = await session.save()
    expect(failed).toMatchObject({ kind: 'failed', state: 'error' })
    expect(session.getStatus().message).toContain('ổ đĩa đầy')
    expect(session.getStatus().dirty).toBe(true)
    expect(view.text).toContain('rất')

    rig.store.save = real
    expect((await session.save()).kind).toBe('saved')
    expect(session.getStatus().state).toBe('saved')
  })
})

describe('a revision conflict', () => {
  it('leaves the store as the other writer made it and keeps the editor text', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    view.type(5, 'rất ')
    await rig.replaceElsewhere('Văn bản hoàn toàn khác.')

    const outcome = await session.save()
    expect(outcome).toMatchObject({ kind: 'failed', state: 'conflict' })
    expect(session.getStatus().state).toBe('conflict')
    expect(rig.library.readText(rig.workId, rig.chapterId, 'source').content).toBe(
      'Văn bản hoàn toàn khác.'
    )
    expect(view.text).toContain('Trời rất mưa to.')
  })

  it('loads the stored text on request, starts the history over, and then saves normally', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    view.type(5, 'rất ')
    await rig.replaceElsewhere('Văn bản hoàn toàn khác.')
    await session.save()

    expect(await session.reload()).not.toBeNull()
    expect(view.text).toBe('Văn bản hoàn toàn khác.')
    expect(session.getStatus()).toMatchObject({ state: 'saved', dirty: false })
    view.undo()
    expect(view.text).toBe('Văn bản hoàn toàn khác.')

    view.type(0, 'Thêm. ')
    expect((await session.save()).kind).toBe('saved')
    expect(rig.library.readText(rig.workId, rig.chapterId, 'source').content).toBe(
      'Thêm. Văn bản hoàn toàn khác.'
    )
  })
})

describe('typing while a save is under way', () => {
  it('stays, stays unsaved, and the IDs the store gave still land on the right segments', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    const blank = SAMPLE.indexOf('\n\n') + 1
    view.type(blank, 'Một câu mới.')

    const real = rig.store.save
    rig.store.save = async (...args) => {
      // The user keeps typing in the first sentence while the write is in flight.
      view.type(5, 'rất ')
      return real(...args)
    }
    await session.save()

    expect(view.text.startsWith('Trời rất mưa to.')).toBe(true)
    expect(session.getStatus()).toMatchObject({ state: 'dirty', dirty: true })
    const segs = view.state.field(segmentsField)
    expect(segs.every((seg) => seg.id !== null)).toBe(true)
    expect(segs[0].edited).toBe(true)
    const stored = rig.library.readText(rig.workId, rig.chapterId, 'source')
    expect(stored.content.startsWith('Trời mưa to.')).toBe(true)

    rig.store.save = real
    expect((await session.save()).kind).toBe('saved')
    expect(rig.library.readText(rig.workId, rig.chapterId, 'source').content).toBe(view.text)
  })

  it('runs a second request after the first, with the new revision', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    view.type(5, 'a')
    const real = rig.store.save
    let asked: ReturnType<typeof session.save> | null = null
    rig.store.save = async (...args) => {
      // While the first write is in flight the user types and asks to save again.
      if (asked === null) {
        view.type(0, 'b')
        asked = session.save()
      }
      return real(...args)
    }
    await session.save()
    await asked
    expect(rig.store.saves).toBe(2)
    expect(session.getStatus().state).toBe('saved')
    expect(rig.library.readText(rig.workId, rig.chapterId, 'source').content).toBe(view.text)
  })
})

describe('undo after a save', () => {
  it('brings back a segment the store deleted, and the next save sends it as new', async () => {
    const rig = await setup('Một. Hai. Ba.')
    const { view, session } = rig.open()
    const second = view.state.field(segmentsField)[1]
    view.dispatch({ changes: { from: second.from, to: second.to + 1 }, userEvent: 'delete' })
    await session.save()
    expect(ids(view)).toHaveLength(2)

    view.undo()
    expect(view.text).toBe('Một. Hai. Ba.')
    expect(session.getStatus().dirty).toBe(true)
    const outcome = await session.save()
    expect(outcome.kind).toBe('saved')
    expect(ids(view).every((id) => id !== null)).toBe(true)
    expect(rig.library.readText(rig.workId, rig.chapterId, 'source').segments).toHaveLength(3)
  })

  it('removes a segment whose lines were deleted, and the store drops it', async () => {
    const rig = await setup(SAMPLE)
    const { view, session } = rig.open()
    const hai = view.state.field(segmentsField)[1]
    view.dispatch({ changes: { from: hai.from, to: hai.to }, userEvent: 'delete' })
    await session.save()
    const stored = rig.library.readText(rig.workId, rig.chapterId, 'source')
    expect(stored.segments.map((s) => stored.content.slice(s.start, s.end))).not.toContain(
      'Anh ở nhà.'
    )
  })
})

/** The translation side: it starts empty (revision 0) and is saved apart from the source. */
async function setupTarget(): Promise<{
  library: LibraryStore
  workId: string
  chapterId: string
  handlers: ReturnType<typeof createLibraryHandlers>
  store: TextStore & { saves: number }
  open(initial?: TextRecord): { view: FakeView; session: EditorSession }
}> {
  const dataDir = tempDir()
  const library = LibraryStore.open({ dataDir })
  stores.push(library)
  const handlers = createLibraryHandlers(library)
  const work = library.create({ title: 'Thử', sourceLang: 'en' })
  const chapter = library.createChapter(work.id, 'Một').chapter
  const source = 'Trời mưa to. Anh ở nhà.'
  const first = (await handlers[CHANNELS.textSave]({
    workId: work.id,
    chapterId: chapter.id,
    side: 'source',
    content: source,
    expectedRev: 0,
    segments: segment(source, 'en')
  })) as Result<TextRecord>
  if (!first.ok) throw new Error(first.error.message)

  const ref = { workId: work.id, chapterId: chapter.id, side: 'target' as const }
  const store: TextStore & { saves: number } = {
    saves: 0,
    async save(content, expectedRev, segments) {
      store.saves++
      return (await handlers[CHANNELS.textSave]({
        ...ref,
        content,
        expectedRev,
        segments
      })) as Result<TextRecord>
    },
    async get() {
      return (await handlers[CHANNELS.textGet](ref)) as Result<TextRecord>
    }
  }
  const make = (record: TextRecord): EditorState =>
    createEditorState({ content: record.content, segments: record.segments, extensions: [] })
  return {
    library,
    workId: work.id,
    chapterId: chapter.id,
    handlers,
    store,
    open(initial = { content: '', rev: 0, segments: [] }) {
      let session: EditorSession | null = null
      const view = new FakeView(make(initial), (_view, tr) => {
        session?.onUpdate({ docChanged: tr.docChanged, changes: tr.changes })
      })
      session = new EditorSession(view, store, 'vi', make, initial)
      return { view, session }
    }
  }
}

describe('saving the translation', () => {
  it('creates it with the first save, and the chapter then reports a translation', async () => {
    const rig = await setupTarget()
    expect(rig.library.listChapters(rig.workId)[0]).toMatchObject({
      hasSource: true,
      hasTarget: false
    })
    const { view, session } = rig.open()
    view.type(0, 'Trời mưa to.\nAnh ở nhà.')
    expect(session.getStatus().state).toBe('dirty')

    const outcome = await session.save()
    expect(outcome.kind).toBe('saved')
    const stored = rig.library.readText(rig.workId, rig.chapterId, 'target')
    expect(stored.content).toBe('Trời mưa to.\nAnh ở nhà.')
    expect(stored.rev).toBe(1)
    expect(stored.segments).toHaveLength(2)
    expect(rig.library.listChapters(rig.workId)[0]).toMatchObject({
      hasSource: true,
      hasTarget: true
    })
  })

  it('never writes the source', async () => {
    const rig = await setupTarget()
    const before = rig.library.readText(rig.workId, rig.chapterId, 'source')
    const { view, session } = rig.open()
    view.type(0, 'Bản dịch.')
    await session.save()
    const after = rig.library.readText(rig.workId, rig.chapterId, 'source')
    expect(after.rev).toBe(before.rev)
    expect(after.content).toBe(before.content)
  })

  it('keeps the IDs of the sentences nobody touched when it is edited and saved again', async () => {
    const rig = await setupTarget()
    const first = rig.open()
    first.view.type(0, 'Một. Hai. Ba.')
    await first.session.save()
    const saved = rig.library.readText(rig.workId, rig.chapterId, 'target')

    const { view, session } = rig.open(saved)
    const before = view.state.field(segmentsField).map((s) => s.id)
    view.type(view.text.indexOf('Hai') + 1, 'x')
    await session.save()
    expect(view.state.field(segmentsField).map((s) => s.id)).toEqual(before)
    expect(rig.library.readText(rig.workId, rig.chapterId, 'target').content).toBe('Một. Hxai. Ba.')
  })

  it('has a conflict that touches only the translation', async () => {
    const rig = await setupTarget()
    const { view, session } = rig.open()
    view.type(0, 'Bản của tôi.')
    // Another writer creates the translation first.
    const other = (await rig.handlers[CHANNELS.textSave]({
      workId: rig.workId,
      chapterId: rig.chapterId,
      side: 'target',
      content: 'Bản của người khác.',
      expectedRev: 0,
      segments: segment('Bản của người khác.', 'vi')
    })) as Result<TextRecord>
    expect(other.ok).toBe(true)

    expect(await session.save()).toMatchObject({ kind: 'failed', state: 'conflict' })
    expect(view.text).toBe('Bản của tôi.')
    expect(rig.library.readText(rig.workId, rig.chapterId, 'target').content).toBe(
      'Bản của người khác.'
    )
    expect(rig.library.readText(rig.workId, rig.chapterId, 'source').content).toBe(
      'Trời mưa to. Anh ở nhà.'
    )
  })
})
