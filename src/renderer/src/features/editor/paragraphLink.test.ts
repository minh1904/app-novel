import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { caretParagraph } from './paragraphLink'

const at = (doc: string, head: number): EditorState =>
  EditorState.create({ doc, selection: EditorSelection.cursor(head) })

describe('caretParagraph', () => {
  const doc = 'Một.\n\nHai.\nBa.'

  it('counts paragraphs as non-blank lines, so the other pane can find the same number', () => {
    expect(caretParagraph(at(doc, 0))).toBe(0)
    expect(caretParagraph(at(doc, doc.indexOf('Hai')))).toBe(1)
    expect(caretParagraph(at(doc, doc.length))).toBe(2)
  })

  it('is null on a blank line and in an empty text', () => {
    expect(caretParagraph(at(doc, doc.indexOf('\n\n') + 1))).toBeNull()
    expect(caretParagraph(at('', 0))).toBeNull()
  })
})
