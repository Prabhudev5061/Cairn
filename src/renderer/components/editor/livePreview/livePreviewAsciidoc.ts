import { EditorState, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { selectionOverlaps } from './types';
import {
  AnchorChipWidget,
  CalloutHeaderWidget,
  normalizeCalloutType,
  WikilinkWidget
} from './widgets';

interface DecoEntry {
  from: number;
  to: number;
  deco: Decoration;
  isLine: boolean;
}

export function buildLivePreviewAsciidocDecorations(state: EditorState): DecorationSet {
  try {
    const entries: DecoEntry[] = [];
    const doc = state.doc;
    const selection = state.selection;
    const lineCount = doc.lines;

    for (let lineNum = 1; lineNum <= lineCount; lineNum++) {
      const line = doc.line(lineNum);
      const text = line.text;
      const isLineFocused = selectionOverlaps(selection, line.from, line.to);

      // 1. Heading Detection (= Title, == Section, === Subsection)
      const headingMatch = text.match(/^(=+)\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const level = Math.min(6, Math.max(1, headingMatch[1].length));
        const markerLen = headingMatch[1].length + 1; // e.g. "== "

        entries.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: `cm-heading-${level}` }),
          isLine: true
        });

        if (!isLineFocused) {
          entries.push({
            from: line.from,
            to: line.from + markerLen,
            deco: Decoration.replace({}),
            isLine: false
          });
        }
      }

      // 2. Admonitions: [NOTE], [TIP], [WARNING], [IMPORTANT], [CAUTION] or NOTE:
      const blockAdmonition = text.match(/^\[(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/i);
      const inlineAdmonition = text.match(/^(NOTE|TIP|WARNING|IMPORTANT|CAUTION):\s*(.*)$/i);

      if (blockAdmonition && blockAdmonition[1]) {
        const rawType = blockAdmonition[1].toLowerCase();
        const normType = normalizeCalloutType(rawType);
        entries.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: `cm-callout-line cm-callout-${normType}` }),
          isLine: true
        });

        if (!isLineFocused) {
          entries.push({
            from: line.from,
            to: line.to,
            deco: Decoration.replace({
              widget: new CalloutHeaderWidget(normType, rawType.toUpperCase(), line.from, line.to)
            }),
            isLine: false
          });
        }
      } else if (inlineAdmonition && inlineAdmonition[1]) {
        const rawType = inlineAdmonition[1].toLowerCase();
        const normType = normalizeCalloutType(rawType);
        const prefixLen = inlineAdmonition[1].length + 1; // "NOTE:" is 5 chars

        entries.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: `cm-callout-line cm-callout-${normType}` }),
          isLine: true
        });

        if (!isLineFocused) {
          entries.push({
            from: line.from,
            to: line.from + prefixLen,
            deco: Decoration.replace({
              widget: new CalloutHeaderWidget(
                normType,
                rawType.toUpperCase(),
                line.from,
                line.from + prefixLen
              )
            }),
            isLine: false
          });
        }
      }

      // 3. Anchor labels [#anchor]
      const anchorMatch = text.match(/\[#([a-zA-Z0-9_-]+)\]/);
      if (anchorMatch && anchorMatch.index !== undefined && anchorMatch[1]) {
        const anchorId = anchorMatch[1];
        const from = line.from + anchorMatch.index;
        const to = from + anchorMatch[0].length;

        if (!selectionOverlaps(selection, from, to)) {
          entries.push({
            from,
            to,
            deco: Decoration.replace({
              widget: new AnchorChipWidget(anchorId)
            }),
            isLine: false
          });
        }
      }

      // 4. Cross-references: xref:target#subpath[alias]
      const xrefRegex = /xref:([^#[\]]+)(?:#([^#[\]]+))?\[([^\]]*)\]/g;
      let xm: RegExpExecArray | null;
      while ((xm = xrefRegex.exec(text)) !== null) {
        const target = xm[1]?.trim() || '';
        const subpath = xm[2]?.trim() || null;
        const alias = xm[3]?.trim() || null;
        const from = line.from + xm.index;
        const to = from + xm[0].length;

        if (target && !selectionOverlaps(selection, from, to)) {
          entries.push({
            from,
            to,
            deco: Decoration.replace({
              widget: new WikilinkWidget(target, alias, subpath, subpath ? 'heading' : null, false, from, to)
            }),
            isLine: false
          });
        }
      }

      // 5. Short cross-references: <<anchor,alias>> or <<anchor>>
      const shortRefRegex = /<<([^,>#]+)(?:,([^>]+))?>>/g;
      let sm: RegExpExecArray | null;
      while ((sm = shortRefRegex.exec(text)) !== null) {
        const target = sm[1]?.trim() || '';
        const alias = sm[2]?.trim() || null;
        const from = line.from + sm.index;
        const to = from + sm[0].length;

        if (target && !selectionOverlaps(selection, from, to)) {
          entries.push({
            from,
            to,
            deco: Decoration.replace({
              widget: new WikilinkWidget(target, alias, null, null, false, from, to)
            }),
            isLine: false
          });
        }
      }

      // 6. Standard Wikilinks: [[target]]
      const linkRegex = /\[\[([^\]\r\n]+)\]\]/g;
      let lm: RegExpExecArray | null;
      while ((lm = linkRegex.exec(text)) !== null) {
        const target = lm[1]?.trim() || '';
        const from = line.from + lm.index;
        const to = from + lm[0].length;

        // Skip if this [[id]] was actually an anchor definition
        if (target && !text.includes(`[[${target}]]`) && !selectionOverlaps(selection, from, to)) {
          entries.push({
            from,
            to,
            deco: Decoration.replace({
              widget: new WikilinkWidget(target, null, null, null, false, from, to)
            }),
            isLine: false
          });
        } else if (target && !selectionOverlaps(selection, from, to)) {
          entries.push({
            from,
            to,
            deco: Decoration.replace({
              widget: new WikilinkWidget(target, null, null, null, false, from, to)
            }),
            isLine: false
          });
        }
      }

      // 7. Inline Formatting: *bold*, _italic_, `code`
      const boldRegex = /(?:^|[^\w*])\*([^\s*]+(?:[^*]*?[^\s*])?)\*(?=[^\w*]|$)/g;
      let bm: RegExpExecArray | null;
      while ((bm = boldRegex.exec(text)) !== null) {
        const matchStr = bm[0];
        const innerText = bm[1] || '';
        const offsetInMatch = matchStr.indexOf(`*${innerText}*`);
        if (offsetInMatch >= 0) {
          const from = line.from + bm.index + offsetInMatch;
          const to = from + innerText.length + 2;

          if (!selectionOverlaps(selection, from, to)) {
            entries.push({ from, to: from + 1, deco: Decoration.replace({}), isLine: false });
            entries.push({ from: from + 1, to: to - 1, deco: Decoration.mark({ class: 'cm-strong' }), isLine: false });
            entries.push({ from: to - 1, to, deco: Decoration.replace({}), isLine: false });
          }
        }
      }

      const italicRegex = /(?:^|[^\w_])_([^\s_]+(?:[^_]*?[^\s_])?)_(?=[^\w_]|$)/g;
      let im: RegExpExecArray | null;
      while ((im = italicRegex.exec(text)) !== null) {
        const matchStr = im[0];
        const innerText = im[1] || '';
        const offsetInMatch = matchStr.indexOf(`_${innerText}_`);
        if (offsetInMatch >= 0) {
          const from = line.from + im.index + offsetInMatch;
          const to = from + innerText.length + 2;

          if (!selectionOverlaps(selection, from, to)) {
            entries.push({ from, to: from + 1, deco: Decoration.replace({}), isLine: false });
            entries.push({ from: from + 1, to: to - 1, deco: Decoration.mark({ class: 'cm-em' }), isLine: false });
            entries.push({ from: to - 1, to, deco: Decoration.replace({}), isLine: false });
          }
        }
      }

      const codeRegex = /(?:^|[^\w`])`([^\s`]+(?:[^`]*?[^\s`])?)`(?=[^\w`]|$)/g;
      let cm: RegExpExecArray | null;
      while ((cm = codeRegex.exec(text)) !== null) {
        const matchStr = cm[0];
        const innerText = cm[1] || '';
        const offsetInMatch = matchStr.indexOf(`\`${innerText}\``);
        if (offsetInMatch >= 0) {
          const from = line.from + cm.index + offsetInMatch;
          const to = from + innerText.length + 2;

          if (!selectionOverlaps(selection, from, to)) {
            entries.push({ from, to: from + 1, deco: Decoration.replace({}), isLine: false });
            entries.push({ from: from + 1, to: to - 1, deco: Decoration.mark({ class: 'cm-inline-code' }), isLine: false });
            entries.push({ from: to - 1, to, deco: Decoration.replace({}), isLine: false });
          }
        }
      }
    }

    // Sort entries stably for RangeSetBuilder
    entries.sort((a, b) => {
      if (a.from !== b.from) return a.from - b.from;
      if (a.isLine && !b.isLine) return -1;
      if (!a.isLine && b.isLine) return 1;
      return a.to - b.to;
    });

    const builder = new RangeSetBuilder<Decoration>();
    let lastReplaceEnd = -1;

    for (const entry of entries) {
      if (entry.isLine) {
        builder.add(entry.from, entry.to, entry.deco);
        continue;
      }

      if (entry.from < lastReplaceEnd) {
        continue;
      }

      try {
        builder.add(entry.from, entry.to, entry.deco);
        if (entry.to > entry.from) {
          lastReplaceEnd = Math.max(lastReplaceEnd, entry.to);
        }
      } catch {
        // Ignore overlapping range collision safely
      }
    }

    return builder.finish();
  } catch {
    return Decoration.none;
  }
}

export const livePreviewAsciidocPlugin = StateField.define<DecorationSet>({
  create(state) {
    return buildLivePreviewAsciidocDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return buildLivePreviewAsciidocDecorations(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});
