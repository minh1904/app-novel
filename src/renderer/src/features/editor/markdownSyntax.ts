import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxTree } from '@codemirror/language'
import type { Extension, Text } from '@codemirror/state'

/**
 * What Live Preview and the format commands read from the Markdown syntax tree, as plain data.
 *
 * Both used to match regular expressions line by line, which cannot tell a code span, an escaped
 * `\*`, a `snake_case_name` or a URL from real emphasis — and Live Preview hides the delimiters it
 * thinks it found, so a wrong match made characters vanish. The tree comes from the same CommonMark
 * rules the rest of the Markdown world uses, so those cases simply are not emphasis.
 *
 * `scanMarkdown` is pure (a tree, a document and ranges in; data out) so it can be tested without a
 * DOM, which `EditorView` needs and the `node` test environment does not have.
 */

export type SyntaxTree = ReturnType<typeof syntaxTree>

/**
 * Block syntax that is wrong for translated prose. Indentation is how a novel marks a paragraph, a
 * `---` under a line is a scene break and not a heading, `[Tên]: lời thoại` is not a link
 * definition, and a line that starts with a tag-like word is not an HTML block. Each of these would
 * swallow the inline syntax on the line (or turn the line above into a heading), so they are not
 * parsed at all.
 */
const DROPPED_BLOCKS = ['IndentedCode', 'SetextHeading', 'LinkReference', 'HTMLBlock']

/**
 * The Markdown language for the translation pane. `addKeymap: false` matters: the default keymap
 * continues lists and quotes on Enter, but Enter here must add a bare line break (see `bindings` in
 * `TextEditor.tsx`).
 */
export function markdownSupport(): Extension {
  return markdown({
    base: markdownLanguage,
    addKeymap: false,
    completeHTMLTags: false,
    extensions: { remove: DROPPED_BLOCKS }
  })
}

export type InlineKind = 'bold' | 'italic' | 'strikethrough'

/** One complete emphasis span: both delimiters are present, so it is safe to hide them. */
export interface InlineSpan {
  kind: InlineKind
  /** The whole span, delimiters included. */
  from: number
  to: number
  /** The text between the delimiters. */
  innerFrom: number
  innerTo: number
}

/** A line prefix (`#`, `>`, `-`, `1.`) and, for headings and quotes, the text after it. */
export interface LineMark {
  kind: 'heading' | 'quote' | 'list'
  /** The prefix and the spaces after it. */
  markFrom: number
  markTo: number
  /** The rest of the line; empty (`contentFrom === contentTo`) when there is none to style. */
  contentFrom: number
  contentTo: number
  /** Heading level, 1 to 3. */
  level?: 1 | 2 | 3
}

export interface MarkdownScan {
  inline: InlineSpan[]
  lines: LineMark[]
}

export interface DocRange {
  from: number
  to: number
}

const INLINE_NODES: Record<string, { kind: InlineKind; mark: string }> = {
  StrongEmphasis: { kind: 'bold', mark: 'EmphasisMark' },
  Emphasis: { kind: 'italic', mark: 'EmphasisMark' },
  Strikethrough: { kind: 'strikethrough', mark: 'StrikethroughMark' }
}

/** Only `#`, `##` and `###` are styled, as the spec says; deeper headings stay plain text. */
const HEADING_NODE = /^ATXHeading([1-3])$/

function isBlank(char: string): boolean {
  return char === ' ' || char === '\t'
}

/** The offset after the blanks that follow `pos` on its line. */
function skipBlanks(doc: Text, pos: number): number {
  const line = doc.lineAt(pos)
  let offset = pos - line.from
  while (offset < line.text.length && isBlank(line.text[offset])) offset++
  return line.from + offset
}

/**
 * Reads the emphasis spans and line prefixes that touch any of `ranges`. A node that starts before a
 * range and ends inside it is returned whole, and one touched by several ranges is returned once.
 */
export function scanMarkdown(
  tree: SyntaxTree,
  doc: Text,
  ranges: readonly DocRange[]
): MarkdownScan {
  const inline: InlineSpan[] = []
  const lines: LineMark[] = []
  const seen = new Set<string>()
  const quotesByLine = new Map<number, LineMark[]>()

  for (const { from, to } of ranges) {
    tree.iterate({
      from,
      to,
      enter(node) {
        const key = node.name + ':' + node.from + ':' + node.to
        const emphasis = INLINE_NODES[node.name]
        if (emphasis) {
          if (seen.has(key)) return
          seen.add(key)
          const marks = node.node.getChildren(emphasis.mark)
          if (marks.length < 2) return
          const open = marks[0]
          const close = marks[marks.length - 1]
          if (open.to >= close.from) return
          inline.push({
            kind: emphasis.kind,
            from: node.from,
            to: node.to,
            innerFrom: open.to,
            innerTo: close.from
          })
          return
        }

        const heading = HEADING_NODE.exec(node.name)
        if (heading) {
          if (seen.has(key)) return
          seen.add(key)
          const mark = node.node.getChild('HeaderMark')
          if (!mark) return
          const markTo = skipBlanks(doc, mark.to)
          lines.push({
            kind: 'heading',
            markFrom: mark.from,
            markTo,
            contentFrom: markTo,
            contentTo: Math.max(markTo, node.to),
            level: Number(heading[1]) as 1 | 2 | 3
          })
          return
        }

        if (node.name === 'QuoteMark') {
          if (seen.has(key)) return
          seen.add(key)
          // `>_<` and `>.<` are faces, not quotes: a quote needs a blank right after the `>`.
          if (!isBlank(doc.sliceString(node.to, node.to + 1))) return
          const line = doc.lineAt(node.from)
          const markTo = skipBlanks(doc, node.to)
          const mark: LineMark = {
            kind: 'quote',
            markFrom: node.from,
            markTo,
            contentFrom: markTo,
            contentTo: markTo
          }
          const onLine = quotesByLine.get(line.number)
          if (onLine) onLine.push(mark)
          else quotesByLine.set(line.number, [mark])
          return
        }

        if (node.name === 'ListMark') {
          if (seen.has(key)) return
          seen.add(key)
          const markTo = skipBlanks(doc, node.to)
          lines.push({
            kind: 'list',
            markFrom: node.from,
            markTo,
            contentFrom: markTo,
            contentTo: markTo
          })
        }
      }
    })
  }

  // In `> > text` only the last prefix carries the styled text, or the quote bar would be drawn once
  // per prefix on the same line.
  for (const [lineNumber, marks] of quotesByLine) {
    marks.sort((a, b) => a.markFrom - b.markFrom)
    const last = marks[marks.length - 1]
    last.contentTo = doc.line(lineNumber).to
    lines.push(...marks)
  }

  inline.sort((a, b) => a.from - b.from || b.to - a.to)
  lines.sort((a, b) => a.markFrom - b.markFrom)
  return { inline, lines }
}
