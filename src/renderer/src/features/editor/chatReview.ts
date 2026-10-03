import { getOriginalDoc, unifiedMergeView } from '@codemirror/merge'
import { Compartment, type EditorState, type Extension } from '@codemirror/state'

/**
 * Reviewing an AI proposal **inside the translation pane**, not beside it.
 *
 * The panel used to render its own diff and offer one Apply button for the whole thing. Comparing
 * two places and accepting all-or-nothing is the part that felt wrong, and it is the part every
 * editor with a good AI story does differently: the suggestion appears in the document as a layer
 * over the real text, and each change is accepted or rejected where it sits.
 *
 * `@codemirror/merge` does the hard half. The editor shows its content against an `original`, marks
 * the changed chunks, and puts accept/reject controls on each one. What this module owns is the
 * small half: turning that on, and knowing when it is over.
 */

/** How a proposal is shown while it is being reviewed. */
function reviewExtension(original: string): Extension {
  return unifiedMergeView({
    original,
    // Prose, not code: a reworded sentence should read as a few words changed, not as a deleted
    // block followed by an inserted one. Off by default, and the default is wrong for this editor.
    allowInlineDiffs: true,
    // The two panes sit flush and have no gutter; adding one here would shift the text sideways the
    // moment a review starts.
    gutter: false,
    // There is no language in this editor, so highlighting deleted fragments buys nothing.
    syntaxHighlightDeletions: false,
    mergeControls: true
  })
}

/**
 * Review mode lives in a compartment so it can be switched on and off **without rebuilding the
 * editor** — a rebuild would throw away the undo history, which is the one thing the translator needs
 * if they decide the whole proposal was a mistake.
 */
export class ReviewMode {
  private readonly compartment = new Compartment()

  /** The extension slot to include when building the editor. Empty until a review starts. */
  extension(): Extension {
    return this.compartment.of([])
  }

  start(original: string): { effects: ReturnType<Compartment['reconfigure']> } {
    return { effects: this.compartment.reconfigure(reviewExtension(original)) }
  }

  stop(): { effects: ReturnType<Compartment['reconfigure']> } {
    return { effects: this.compartment.reconfigure([]) }
  }

  /** Whether a review is on, asked of the state rather than remembered separately. */
  isActive(state: EditorState): boolean {
    const current = this.compartment.get(state)
    return Array.isArray(current) ? current.length > 0 : current !== undefined
  }
}

/**
 * Nothing left to decide.
 *
 * Accepting a chunk moves the original up to the new text; rejecting puts the new text back to the
 * original. Either way a resolved chunk leaves the two sides equal, so "the documents match" is the
 * one check that covers accept-all, reject-all and every mixture — and it uses only exported API,
 * rather than reaching into the package's internal chunk state.
 */
export function reviewFinished(state: EditorState): boolean {
  return getOriginalDoc(state).toString() === state.doc.toString()
}
