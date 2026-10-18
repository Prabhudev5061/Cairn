import { EditorState, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { MathWidget } from '../math/widget';
import { selectionOverlaps } from './types';
import { AnchorChipWidget, WikilinkWidget } from './widgets';

interface DecoEntry {
  from: number;
  to: number;
  deco: Decoration;
  isLine: boolean;
}

export function buildLivePreviewTypstDecorations(state: EditorState): DecorationSet {
  try {
    const entries: DecoEntry[] = [];
    const doc = state.doc;
    const selection = state.selection;
    const lineCount = doc.lines;
    const fullText = doc.toString();

    // 1. Math expressions via KaTeX ($ math $)
    const mathRegex = /\$([^$\r\n]+?)\$/g;
    let mm: RegExpExecArray | null;
    while ((mm = mathRegex.exec(fullText)) !== null) {
      const mathContent = mm[1]?.trim() || '';
      const from = mm.index;
      const to = from + mm[0].length;
      const isDisplay = mathContent.length > 30 || mm[0].startsWith('$ ');

      if (mathContent && !selectionOverlaps(selection, from, to)) {
        entries.push({
          from,
          to,
          deco: Decoration.replace({
            widget: new MathWidget(mathContent, isDisplay, from, to)
          }),
          isLine: false
        });
      }
    }

    for (let lineNum = 1; lineNum <= lineCount; lineNum++) {
      const line = doc.line(lineNum);
      const text = line.text;
      const isLineFocused = selectionOverlaps(selection, line.from, line.to);

      // 2. Heading Detection (= Heading, == Heading)
      const headingMatch = text.match(/^(=+)\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const level = Math.min(6, Math.max(1, headingMatch[1].length));
        const markerLen = headingMatch[1].length + 1; // e.g. "= "

        entries.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: `cm-heading-${level}` }),
          isLine: true
        });

        // Conceal heading marker if line is unfocused
        if (!isLineFocused) {
          entries.push({
            from: line.from,
            to: line.from + markerLen,
            deco: Decoration.replace({}),
            isLine: false
          });
        }
      }

      // 3. Anchor labels <label>
      const labelRegex = /<([a-zA-Z0-9_:-]+)>/g;
      let lm: RegExpExecArray | null;
      while ((lm = labelRegex.exec(text)) !== null) {
        const labelName = lm[1] || '';
        const from = line.from + lm.index;
        const to = from + lm[0].length;

        if (labelName && !selectionOverlaps(selection, from, to)) {
          entries.push({
            from,
            to,
            deco: Decoration.replace({
              widget: new AnchorChipWidget(labelName)
            }),
            isLine: false
          });
        }
      }

      // 4. References @ref
      const refRegex = /@([a-zA-Z0-9_:-]+)/g;
      let rm: RegExpExecArray | null;
      while ((rm = refRegex.exec(text)) !== null) {
        const refTarget = rm[1] || '';
        const from = line.from + rm.index;
        const to = from + rm[0].length;

        if (refTarget && !selectionOverlaps(selection, from, to)) {
          entries.push({
            from,
            to,
            deco: Decoration.replace({
              widget: new WikilinkWidget(refTarget, `@${refTarget}`, null, null, false, from, to)
            }),
            isLine: false
          });
        }
      }

      // 5. Wikilinks [[target]]
      const linkRegex = /\[\[([^\]\r\n]+)\]\]/g;
      let wkm: RegExpExecArray | null;
      while ((wkm = linkRegex.exec(text)) !== null) {
        const target = wkm[1]?.trim() || '';
        const from = line.from + wkm.index;
        const to = from + wkm[0].length;

        if (target && !selectionOverlaps(selection, from, to)) {
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

      // 6. Typst #link("url")[alias]
      const typLinkRegex = /#link\("([^"]+)"\)\[([^\]]*)\]/g;
      let tlm: RegExpExecArray | null;
      while ((tlm = typLinkRegex.exec(text)) !== null) {
        const target = tlm[1]?.trim() || '';
        const alias = tlm[2]?.trim() || null;
        const from = line.from + tlm.index;
        const to = from + tlm[0].length;

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

export const livePreviewTypstPlugin = StateField.define<DecorationSet>({
  create(state) {
    return buildLivePreviewTypstDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return buildLivePreviewTypstDecorations(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});
