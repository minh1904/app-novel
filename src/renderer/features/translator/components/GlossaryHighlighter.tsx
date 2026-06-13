import { useState } from 'react';
import type { GlossaryTerm } from '@/types/translator';

interface GlossaryHighlighterProps {
  text: string;
  terms: GlossaryTerm[];
}

interface Segment {
  type: 'text' | 'term';
  content: string;
  term?: GlossaryTerm;
}

function parseSegments(text: string, terms: GlossaryTerm[]): Segment[] {
  if (!terms.length) return [{ type: 'text', content: text }];

  const sorted = [...terms].sort((a, b) => b.rawText.length - a.rawText.length);
  const segments: Segment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliest: { index: number; term: GlossaryTerm } | null = null;

    for (const term of sorted) {
      const idx = remaining.indexOf(term.rawText);
      if (idx !== -1 && (earliest === null || idx < earliest.index)) {
        earliest = { index: idx, term };
      }
    }

    if (!earliest) {
      segments.push({ type: 'text', content: remaining });
      break;
    }

    if (earliest.index > 0) {
      segments.push({ type: 'text', content: remaining.slice(0, earliest.index) });
    }
    segments.push({ type: 'term', content: earliest.term.rawText, term: earliest.term });
    remaining = remaining.slice(earliest.index + earliest.term.rawText.length);
  }

  return segments;
}

function TermSpan({ term, children }: { term: GlossaryTerm; children: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline">
      <span
        className="cursor-help underline decoration-foreground/40 decoration-dotted underline-offset-2"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-popover-foreground text-xs shadow-lg">
          <span className="font-medium text-foreground">{term.translatedText}</span>
          {term.note && <span className="ml-1.5 text-muted-foreground">— {term.note}</span>}
        </span>
      )}
    </span>
  );
}

export function GlossaryHighlighter({ text, terms }: GlossaryHighlighterProps) {
  const segments = parseSegments(text, terms);

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'term' && seg.term ? (
          <TermSpan key={i} term={seg.term}>
            {seg.content}
          </TermSpan>
        ) : (
          <span key={i}>{seg.content}</span>
        ),
      )}
    </>
  );
}
