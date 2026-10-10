import { StateEffect, StateField, type EditorState, type Extension } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'

export interface ProposalPreview {
  from: number
  to: number
  before: string
  after: string
  label: string
  onAccept(): void
  onDeny(): void
}

class PreviewWidget extends WidgetType {
  constructor(private readonly preview: ProposalPreview) {
    super()
  }

  override toDOM(): HTMLElement {
    const box = document.createElement('div')
    box.className = 'm-2 rounded-sm border border-strong bg-surface p-2 text-body-xs'
    box.setAttribute('role', 'group')
    box.setAttribute('aria-label', this.preview.label)
    const title = document.createElement('p')
    title.className = 'mb-1 font-semibold'
    title.textContent = this.preview.label
    box.append(title)
    if (this.preview.before) {
      const before = document.createElement('pre')
      before.className = 'max-h-24 overflow-auto whitespace-pre-wrap text-subtle'
      before.textContent = 'Chữ hiện tại: ' + this.preview.before
      box.append(before)
    }
    const after = document.createElement('pre')
    after.className = 'max-h-40 overflow-auto whitespace-pre-wrap text-default'
    after.textContent = this.preview.after
    box.append(after)
    const actions = document.createElement('div')
    actions.className = 'mt-2 flex gap-2'
    const accept = document.createElement('button')
    accept.type = 'button'
    accept.className = 'rounded-sm bg-inverted px-2 py-1 text-inverted'
    accept.textContent = 'Áp dụng'
    accept.addEventListener('click', () => this.preview.onAccept())
    const deny = document.createElement('button')
    deny.type = 'button'
    deny.className = 'rounded-sm border border-default px-2 py-1'
    deny.textContent = 'Bỏ'
    deny.addEventListener('click', () => this.preview.onDeny())
    actions.append(accept, deny)
    box.append(actions)
    return box
  }

  override ignoreEvent(): boolean {
    return true
  }
}

function decorations(preview: ProposalPreview | null): DecorationSet {
  if (!preview) return Decoration.none
  const marks =
    preview.from < preview.to
      ? [Decoration.mark({ class: 'rounded bg-warning/20' }).range(preview.from, preview.to)]
      : []
  marks.push(
    Decoration.widget({ widget: new PreviewWidget(preview), side: 1, block: true }).range(
      preview.to
    )
  )
  return Decoration.set(marks, true)
}

/** Review is an editor decoration. Opening or closing it never changes the document. */
export class ProposalReview {
  private readonly set = StateEffect.define<ProposalPreview | null>()
  private readonly field = StateField.define<ProposalPreview | null>({
    create: () => null,
    update: (value, transaction) => {
      let next = transaction.docChanged ? null : value
      for (const effect of transaction.effects) if (effect.is(this.set)) next = effect.value
      return next
    },
    provide: (field) => EditorView.decorations.from(field, decorations)
  })

  extension(): Extension {
    return this.field
  }
  start(preview: ProposalPreview): { effects: StateEffect<ProposalPreview | null> } {
    return { effects: this.set.of(preview) }
  }
  stop(): { effects: StateEffect<ProposalPreview | null> } {
    return { effects: this.set.of(null) }
  }
  isActive(state: EditorState): boolean {
    return state.field(this.field) !== null
  }
}
