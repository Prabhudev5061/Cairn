import { EditorState, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';
import { selectionOverlaps } from './types';
import { CheckboxWidget, OrgTodoWidget, WikilinkWidget } from './widgets';

interface DecoEntry {
  from: number;
  to: number;
  deco: Decoration;
  isLine: boolean;
}

export function buildLivePreviewOrgDecorations(state: EditorState): DecorationSet {
  try {
    const entries: DecoEntry[] = [];
    const doc = state.doc;
    const selection = state.selection;
    const lineCount = doc.lines;

    for (let lineNum = 1; lineNum <= lineCount; lineNum++) {
      const line = doc.line(lineNum);
      const text = line.text;
      const isLineFocused = selectionOverlaps(selection, line.from, line.to);

      // 1. Heading Detection (* Heading, ** Heading)
      const headingMatch = text.match(/^(\*{1,6})\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const level = headingMatch[1].length;
        const markerLen = level + 1; // e.g. "* " is 2 chars

        entries.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: `cm-heading-${level}` }),
          isLine: true
        });

        // If line is not focused, conceal leading asterisks
        if (!isLineFocused) {
          entries.push({
            from: line.from,
            to: line.from + markerLen,
            deco: Decoration.replace({}),
            isLine: false
          });
        }
      }

      // 2. TODO / DONE Badges
      const todoMatch = text.match(/\b(TODO|DONE)\b/);
      if (todoMatch && todoMatch.index !== undefined) {
        const kw = todoMatch[1] as 'TODO' | 'DONE';
        const kwFrom = line.from + todoMatch.index;
        const kwTo = kwFrom + kw.length;

        if (!selectionOverlaps(selection, kwFrom, kwTo)) {
          entries.push({
            from: kwFrom,
            to: kwTo,
            deco: Decoration.replace({
              widget: new OrgTodoWidget(kw)
            }),
            isLine: false
          });
        }
      }

      // 3. Interactive Checkboxes: - [ ], - [X], - [-]
      const cbMatch = text.match(/^(\s*[-+*]\s+)\[([ X-])\]/i);
      if (cbMatch && cbMatch[1] && cbMatch[2]) {
        const prefixLen = cbMatch[1].length;
        const cbFrom = line.from + prefixLen;
        const cbTo = cbFrom + 3; // "[ ]" is 3 chars
        const isChecked = cbMatch[2].toUpperCase() === 'X';

        if (!selectionOverlaps(selection, cbFrom, cbTo)) {
          entries.push({
            from: cbFrom,
            to: cbTo,
            deco: Decoration.replace({
              widget: new CheckboxWidget(isChecked, cbFrom, cbTo)
            }),
            isLine: false
          });
        }
      }

      // 4. Org Links: [[target][alias]] or [[target]]
      const linkRegex = /\[\[([^\]\r\n]+)\](?:\[([^\]\r\n]*)\])?\]/g;
      let lm: RegExpExecArray | null;
      while ((lm = linkRegex.exec(text)) !== null) {
        const target = lm[1]?.trim() || '';
        const alias = lm[2]?.trim() || null;
        const linkFrom = line.from + lm.index;
        const linkTo = linkFrom + lm[0].length;

        if (target && !selectionOverlaps(selection, linkFrom, linkTo)) {
          entries.push({
            from: linkFrom,
            to: linkTo,
            deco: Decoration.replace({
              widget: new WikilinkWidget(target, alias, null, null, false, linkFrom, linkTo)
            }),
            isLine: false
          });
        }
      }

      // 5. Inline Formatting: *bold*, /italic/, ~code~, =verbatim=
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
            entries.push({
              from,
              to: from + 1,
              deco: Decoration.replace({}),
              isLine: false
            });
            entries.push({
              from: from + 1,
              to: to - 1,
              deco: Decoration.mark({ class: 'cm-strong' }),
              isLine: false
            });
            entries.push({
              from: to - 1,
              to,
              deco: Decoration.replace({}),
              isLine: false
            });
          }
        }
      }

      const italicRegex = /(?:^|[^\w/])\/([^\s/]+(?:[^/]*?[^\s/])?)\/(?=[^\w/]|$)/g;
      let im: RegExpExecArray | null;
      while ((im = italicRegex.exec(text)) !== null) {
        const matchStr = im[0];
        const innerText = im[1] || '';
        const offsetInMatch = matchStr.indexOf(`/${innerText}/`);
        if (offsetInMatch >= 0) {
          const from = line.from + im.index + offsetInMatch;
          const to = from + innerText.length + 2;

          if (!selectionOverlaps(selection, from, to)) {
            entries.push({
              from,
              to: from + 1,
              deco: Decoration.replace({}),
              isLine: false
            });
            entries.push({
              from: from + 1,
              to: to - 1,
              deco: Decoration.mark({ class: 'cm-em' }),
              isLine: false
            });
            entries.push({
              from: to - 1,
              to,
              deco: Decoration.replace({}),
              isLine: false
            });
          }
        }
      }

      const codeRegex = /(?:^|[^\w~])~([^\s~]+(?:[^~]*?[^\s~])?)~(?=[^\w~]|$)/g;
      let cm: RegExpExecArray | null;
      while ((cm = codeRegex.exec(text)) !== null) {
        const matchStr = cm[0];
        const innerText = cm[1] || '';
        const offsetInMatch = matchStr.indexOf(`~${innerText}~`);
        if (offsetInMatch >= 0) {
          const from = line.from + cm.index + offsetInMatch;
          const to = from + innerText.length + 2;

          if (!selectionOverlaps(selection, from, to)) {
            entries.push({
              from,
              to: from + 1,
              deco: Decoration.replace({}),
              isLine: false
            });
            entries.push({
              from: from + 1,
              to: to - 1,
              deco: Decoration.mark({ class: 'cm-inline-code' }),
              isLine: false
            });
            entries.push({
              from: to - 1,
              to,
              deco: Decoration.replace({}),
              isLine: false
            });
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

export const livePreviewOrgPlugin = StateField.define<DecorationSet>({
  create(state) {
    return buildLivePreviewOrgDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return buildLivePreviewOrgDecorations(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});
