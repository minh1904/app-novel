import { markdown } from '@codemirror/lang-markdown';
import {
  Decoration,
  EditorView,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  keymap,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { EditorState, Compartment, RangeSetBuilder } from '@codemirror/state';
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands';
import { useEffect, useRef } from 'react';

interface CmEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** When true, editor fills container height and scrolls internally (for full-pane use). Default: false (grows with content). */
  scrollable?: boolean;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

const baseTheme = EditorView.baseTheme({
  '&': {
    fontSize: '0.875rem',
    fontFamily: 'ui-monospace, monospace',
    color: 'var(--foreground)',
    backgroundColor: 'transparent',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'inherit',
    padding: '1rem',
    lineHeight: '1.625',
  },
  '.cm-content': {
    caretColor: 'var(--foreground)',
    padding: '0',
  },
  '.cm-line': { padding: '0' },
  // markdown decoration styles
  '.cm-md-bold': { fontWeight: '600' },
  '.cm-md-italic': { fontStyle: 'italic' },
  '.cm-md-blockquote': {
    borderLeft: '2px solid color-mix(in srgb, var(--muted-foreground) 40%, transparent)',
    paddingLeft: '0.75rem',
    color: 'color-mix(in srgb, var(--muted-foreground) 80%, transparent)',
    fontStyle: 'italic',
    display: 'block',
  },
  '.cm-md-marker': {
    color: 'color-mix(in srgb, var(--muted-foreground) 40%, transparent)',
    fontSize: '0.75em',
  },
  '.cm-placeholder': {
    color: 'color-mix(in srgb, var(--muted-foreground) 30%, transparent)',
    fontStyle: 'italic',
  },
});

// Theme extension for scrollable (fixed-height) mode
const scrollableTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': { overflow: 'auto', height: '100%' },
});

// Theme extension for growing (content-height) mode
const growingTheme = EditorView.theme({
  '.cm-scroller': { overflow: 'visible' },
});

// ─── Markdown decoration plugin ───────────────────────────────────────────────

type TokenRange = {
  from: number;
  to: number;
  innerFrom: number;
  innerTo: number;
  type: 'bold' | 'italic';
};

function findInlineTokens(text: string, offset: number): TokenRange[] {
  const tokens: TokenRange[] = [];
  const boldRe = /\*\*([^*\n]+?)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = boldRe.exec(text)) !== null) {
    tokens.push({
      from: offset + m.index,
      to: offset + m.index + m[0].length,
      innerFrom: offset + m.index + 2,
      innerTo: offset + m.index + m[0].length - 2,
      type: 'bold',
    });
  }
  // italic: single * not adjacent to another *
  const italicRe = /(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g;
  while ((m = italicRe.exec(text)) !== null) {
    tokens.push({
      from: offset + m.index,
      to: offset + m.index + m[0].length,
      innerFrom: offset + m.index + 1,
      innerTo: offset + m.index + m[0].length - 1,
      type: 'italic',
    });
  }
  return tokens;
}

const markdownDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

function buildDecorations(view: EditorView): DecorationSet {
  const sel = view.state.selection.main;

  type Entry = { from: number; to: number; deco: Decoration };
  const entries: Entry[] = [];

  for (const { from: vFrom, to: vTo } of view.visibleRanges) {
    let pos = vFrom;
    while (pos <= vTo) {
      const line = view.state.doc.lineAt(pos);

      // Blockquote line decoration (zero-width at line start)
      if (line.text.startsWith('>')) {
        entries.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-md-blockquote' }) });
      }

      // Inline tokens for this line
      const tokens = findInlineTokens(line.text, line.from);
      for (const token of tokens) {
        const markerLen = token.type === 'bold' ? 2 : 1;
        const cursorOverlaps = sel.from <= token.to && sel.to >= token.from;

        if (cursorOverlaps) {
          entries.push({ from: token.from, to: token.from + markerLen, deco: Decoration.mark({ class: 'cm-md-marker' }) });
          entries.push({ from: token.to - markerLen, to: token.to, deco: Decoration.mark({ class: 'cm-md-marker' }) });
        } else {
          entries.push({ from: token.from, to: token.from + markerLen, deco: Decoration.replace({}) });
          entries.push({ from: token.innerFrom, to: token.innerTo, deco: Decoration.mark({ class: token.type === 'bold' ? 'cm-md-bold' : 'cm-md-italic' }) });
          entries.push({ from: token.to - markerLen, to: token.to, deco: Decoration.replace({}) });
        }
      }

      pos = line.to + 1;
    }
  }

  // RangeSetBuilder requires ascending order by `from`, then `to`
  entries.sort((a, b) => a.from - b.from || a.to - b.to);

  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to, deco } of entries) {
    builder.add(from, to, deco);
  }
  return builder.finish();
}

// ─── CmEditor Component ───────────────────────────────────────────────────────

export function CmEditor({
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  scrollable = false,
}: CmEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const editableCompartment = useRef(new Compartment());
  onChangeRef.current = onChange;

  // Mount once
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      markdownDecorations,
      baseTheme,
      scrollable ? scrollableTheme : growingTheme,
      EditorView.lineWrapping,
      editableCompartment.current.of(EditorView.editable.of(!disabled)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      ...(placeholder ? [cmPlaceholder(placeholder)] : []),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // mount once — value/disabled/placeholder intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. streaming AI updates)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  // Sync disabled prop
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: editableCompartment.current.reconfigure(EditorView.editable.of(!disabled)),
    });
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ opacity: disabled ? 0.7 : 1 }}
    />
  );
}
