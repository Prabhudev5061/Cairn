import {
  acceptCompletion,
  autocompletion,
  CompletionContext,
  CompletionResult,
  moveCompletionSelection
} from '@codemirror/autocomplete';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { findMathRanges } from '../math/parser';
import { CALLOUT_COMPLETIONS } from './callouts';
import { LATEX_COMPLETIONS } from './latexCommands';
import { MARKDOWN_SNIPPETS } from './snippets';

/**
 * Checks if the cursor position is inside an inline or block math range.
 */
export function isPositionInsideMath(docText: string, pos: number): boolean {
  // Check a reasonable window around pos to keep it fast
  const windowStart = Math.max(0, pos - 500);
  const windowEnd = Math.min(docText.length, pos + 500);
  const windowSlice = docText.slice(windowStart, windowEnd);

  const ranges = findMathRanges(windowSlice, windowStart);
  return ranges.some((r) => pos > r.from && pos < r.to);
}

export async function cairnCompletionSource(
  context: CompletionContext
): Promise<CompletionResult | null> {
  const { state, pos } = context;
  const docText = state.doc.toString();

  // 1. Check if inside math boundaries ($...$ or $$...$$)
  if (isPositionInsideMath(docText, pos)) {
    const latexMatch = context.matchBefore(/\\[a-zA-Z]*/);
    if (latexMatch) {
      return {
        from: latexMatch.from,
        options: LATEX_COMPLETIONS,
        validFor: /^\\[a-zA-Z]*$/
      };
    }
    return null;
  }

  // 2. Check for Obsidian callouts (after "> [!" or "[!")
  const line = state.doc.lineAt(pos);
  const textBefore = line.text.slice(0, pos - line.from);

  if (/>\s*\[!\w*$/.test(textBefore)) {
    const calloutMatch = context.matchBefore(/\[!\w*/);
    if (calloutMatch) {
      return {
        from: calloutMatch.from,
        options: CALLOUT_COMPLETIONS,
        validFor: /^\[!\w*$/
      };
    }
  }

  // 3. Markdown snippets (table, task, $$, callout) at line start or trigger word
  const snippetMatch = context.matchBefore(/\$\$|\b(table|task|callout|codeblock)\b/);
  if (snippetMatch) {
    return {
      from: snippetMatch.from,
      options: MARKDOWN_SNIPPETS,
      validFor: /^\$\$|\w+$/
    };
  }

  // 4. Wikilink completions: [[note or [[note#heading
  const linkMatch = context.matchBefore(/\[\[([^\]\r\n]*)/);
  if (linkMatch && typeof window !== 'undefined' && window.cairn) {
    const query = linkMatch.text.slice(2);
    const res = await window.cairn.getAllIndexEntries();
    const entries = res.ok ? res.value : [];

    if (query.includes('#')) {
      const parts = query.split('#');
      const noteTarget = (parts[0] || '').trim();
      const headingQuery = (parts[1] || '').trim().toLowerCase();

      const targetEntry = entries.find(
        (e) =>
          e.title.toLowerCase() === noteTarget.toLowerCase() ||
          e.path.toLowerCase() === noteTarget.toLowerCase()
      );

      const headings = targetEntry?.headings ?? [];
      const filtered = headings.filter(
        (h) => !headingQuery || h.text.toLowerCase().includes(headingQuery)
      );

      return {
        from: linkMatch.from + 2 + noteTarget.length + 1,
        options: filtered.map((h) => ({
          label: h.text,
          detail: `H${h.level}`,
          type: 'keyword',
          apply: `${h.text}]]`
        }))
      };
    }

    const options = [];
    for (const entry of entries) {
      options.push({
        label: entry.title,
        detail: entry.path.includes('/') ? entry.path : undefined,
        type: 'text',
        apply: `${entry.title}]]`
      });
      for (const alias of entry.aliases) {
        options.push({
          label: alias,
          detail: `alias for ${entry.title}`,
          type: 'text',
          apply: `${entry.title}|${alias}]]`
        });
      }
    }

    return {
      from: linkMatch.from + 2,
      options,
      validFor: /^[^\]\r\n]*$/
    };
  }

  return null;
}

export function cairnAutocomplete() {
  return [
    autocompletion({
      override: [cairnCompletionSource],
      defaultKeymap: false
    }),
    Prec.lowest(
      keymap.of([
        { key: 'Tab', run: acceptCompletion },
        { key: 'Enter', run: acceptCompletion },
        { key: 'ArrowDown', run: moveCompletionSelection(true) },
        { key: 'ArrowUp', run: moveCompletionSelection(false) }
      ])
    )
  ];
}
