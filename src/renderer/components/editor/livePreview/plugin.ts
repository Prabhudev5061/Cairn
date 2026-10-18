import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState, RangeSetBuilder, StateField } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView
} from '@codemirror/view';
import { parseWikilinks } from '@shared/linking/parser';
import { findMathRanges } from '../math/parser';
import { MathWidget } from '../math/widget';
import { selectionOverlaps } from './types';
import {
  CalloutHeaderWidget,
  CheckboxWidget,
  CodeBlockHeaderWidget,
  FrontmatterWidget,
  HorizontalRuleWidget,
  ImageEmbedWidget,
  normalizeCalloutType,
  parseFrontmatter,
  parseMarkdownTable,
  TableWidget,
  WikilinkWidget
} from './widgets';

interface DecoEntry {
  from: number;
  to: number;
  deco: Decoration;
  isLine: boolean;
}

/**
 * Checks if a position is inside a code block, inline code, or comment in the AST.
 */
function isInsideCode(tree: ReturnType<typeof syntaxTree> | null, pos: number): boolean {
  if (!tree) return false;
  try {
    let cur: ReturnType<typeof tree.resolveInner> | null = tree.resolveInner(pos, 1);
    while (cur) {
      const n = cur.name;
      if (
        n === 'FencedCode' ||
        n === 'CodeBlock' ||
        n === 'InlineCode' ||
        n === 'CodeText' ||
        n === 'Comment' ||
        n === 'CommentBlock'
      ) {
        return true;
      }
      cur = cur.parent;
    }
  } catch {
    // fallback
  }
  return false;
}

export function buildLivePreviewDecorations(input: EditorState | EditorView): DecorationSet {
  try {
    const state = 'state' in input ? input.state : input;
    const entries: DecoEntry[] = [];
    const docLength = state.doc.length;
    const tree = (docLength > 0 ? ensureSyntaxTree(state, docLength, 100) : null) ?? syntaxTree(state);
    const text = state.doc.toString();

    // Check for YAML frontmatter at document start (optionally preceded by empty lines)
    let frontmatterStart = -1;
    let frontmatterEnd = -1;
    let cursorInFrontmatter = false;
    let fmStartLineNumber = -1;
    let fmEndLineNumber = -1;
    const fmMatch = text.match(/^(?:[ \t]*\r?\n)*(---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$))/);
    if (fmMatch && fmMatch[1]) {
      frontmatterEnd = fmMatch[0].length;
      frontmatterStart = frontmatterEnd - fmMatch[1].length;

      const fmStartLine = state.doc.lineAt(frontmatterStart);
      let closingOffset = frontmatterEnd - 1;
      while (
        closingOffset > frontmatterStart &&
        (text[closingOffset] === '\n' || text[closingOffset] === '\r')
      ) {
        closingOffset--;
      }
      const fmEndLine = state.doc.lineAt(Math.max(frontmatterStart, closingOffset));
      fmStartLineNumber = fmStartLine.number;
      fmEndLineNumber = fmEndLine.number;
      cursorInFrontmatter = selectionOverlaps(state.selection, fmStartLine.from, fmEndLine.to);

      if (!cursorInFrontmatter) {
        const fmText = state.doc.sliceString(fmStartLine.from, fmEndLine.to);
        const parsed = parseFrontmatter(fmText);
        if (parsed.length > 0) {
          entries.push({
            from: fmStartLine.from,
            to: fmEndLine.to,
            deco: Decoration.replace({
              widget: new FrontmatterWidget(fmText, parsed, fmStartLine.from, fmEndLine.to),
              block: true
            }),
            isLine: false
          });
        }
      }
    }

    // 1. Scan for math ranges across document
    const mathRanges = findMathRanges(text, 0);
    const occupiedRanges: Array<{ from: number; to: number }> = [];

    for (const m of mathRanges) {
      if (frontmatterStart !== -1 && m.from >= frontmatterStart && m.from < frontmatterEnd) continue;
      if (isInsideCode(tree, m.from)) continue;

      const cursorInside = selectionOverlaps(state.selection, m.from, m.to);
      if (!cursorInside) {
        entries.push({
          from: m.from,
          to: m.to,
          deco: Decoration.replace({
            widget: new MathWidget(m.math, m.isBlock, m.from, m.to),
            inclusive: false
          }),
          isLine: false
        });
        occupiedRanges.push({ from: m.from, to: m.to });
      }
    }

    // Helper to check if a range overlaps with a math replacement
    const overlapsMath = (start: number, end: number) => {
      return occupiedRanges.some((r) => Math.max(start, r.from) < Math.min(end, r.to));
    };

    // 1b. Scan for wikilinks across document
    const wikilinks = parseWikilinks(text);
    for (const link of wikilinks) {
      const linkFrom = link.from;
      const linkTo = link.to;

      if (frontmatterStart !== -1 && linkFrom >= frontmatterStart && linkFrom < frontmatterEnd) continue;
      if (isInsideCode(tree, linkFrom)) continue;

      if (!overlapsMath(linkFrom, linkTo)) {
        const cursorInside = selectionOverlaps(state.selection, linkFrom, linkTo);
        if (!cursorInside) {
          entries.push({
            from: linkFrom,
            to: linkTo,
            deco: Decoration.replace({
              widget: new WikilinkWidget(
                link.target,
                link.alias,
                link.subpath,
                link.subpathType,
                link.isEmbed,
                linkFrom,
                linkTo
              ),
              inclusive: false
            }),
            isLine: false
          });
          occupiedRanges.push({ from: linkFrom, to: linkTo });
        }
      }
    }

    // Helper to check if a range is fully inside an occupied replacement (math or wikilink)
    const isInsideOccupied = (start: number, end: number) => {
      return occupiedRanges.some((r) => start >= r.from && end <= r.to);
    };
    const isInsideMath = isInsideOccupied;

    // 2. Iterate AST syntax nodes across document
    tree.iterate({
      from: 0,
      to: docLength,
      enter(node) {
        if (
          frontmatterStart !== -1 &&
          node.name !== 'Document' &&
          node.from >= frontmatterStart &&
          node.to <= frontmatterEnd
        ) {
          return false;
        }
        if (isInsideMath(node.from, node.to)) {
          return false;
        }

        const name = node.name;

        // Headings: ATXHeading1 .. ATXHeading6
        if (name.startsWith('ATXHeading')) {
          const level = parseInt(name.slice('ATXHeading'.length), 10) || 1;
          const line = state.doc.lineAt(node.from);
          entries.push({
            from: line.from,
            to: line.from,
            deco: Decoration.line({ class: `cm-heading cm-heading-${level}` }),
            isLine: true
          });

          const isCursorOnLine = selectionOverlaps(state.selection, line.from, line.to);
          if (!isCursorOnLine) {
            // Header mark e.g. "### "
            const markLen = level + 1;
            const markTo = Math.min(node.from + markLen, line.to);
            if (markTo > node.from) {
              entries.push({
                from: node.from,
                to: markTo,
                deco: Decoration.replace({}),
                isLine: false
              });
            }
          }
          return;
        }

        // Bold: StrongEmphasis (**bold** or __bold__)
        if (name === 'StrongEmphasis') {
          const markLen = 2;
          if (node.to - node.from > markLen * 2) {
            const cursorInside = selectionOverlaps(state.selection, node.from, node.to);
            if (!cursorInside) {
              entries.push({
                from: node.from,
                to: node.from + markLen,
                deco: Decoration.replace({}),
                isLine: false
              });
              entries.push({
                from: node.from + markLen,
                to: node.to - markLen,
                deco: Decoration.mark({ class: 'cm-strong' }),
                isLine: false
              });
              entries.push({
                from: node.to - markLen,
                to: node.to,
                deco: Decoration.replace({}),
                isLine: false
              });
            } else {
              entries.push({
                from: node.from + markLen,
                to: node.to - markLen,
                deco: Decoration.mark({ class: 'cm-strong' }),
                isLine: false
              });
            }
          }
          return;
        }

        // Italic: Emphasis (*italic* or _italic_)
        if (name === 'Emphasis') {
          const markLen = 1;
          if (node.to - node.from > markLen * 2) {
            const cursorInside = selectionOverlaps(state.selection, node.from, node.to);
            if (!cursorInside) {
              entries.push({
                from: node.from,
                to: node.from + markLen,
                deco: Decoration.replace({}),
                isLine: false
              });
              entries.push({
                from: node.from + markLen,
                to: node.to - markLen,
                deco: Decoration.mark({ class: 'cm-em' }),
                isLine: false
              });
              entries.push({
                from: node.to - markLen,
                to: node.to,
                deco: Decoration.replace({}),
                isLine: false
              });
            } else {
              entries.push({
                from: node.from + markLen,
                to: node.to - markLen,
                deco: Decoration.mark({ class: 'cm-em' }),
                isLine: false
              });
            }
          }
          return;
        }

        // Inline Code: InlineCode (`code`)
        if (name === 'InlineCode') {
          const markLen = 1;
          if (node.to - node.from > markLen * 2) {
            const cursorInside = selectionOverlaps(state.selection, node.from, node.to);
            if (!cursorInside) {
              entries.push({
                from: node.from,
                to: node.from + markLen,
                deco: Decoration.replace({}),
                isLine: false
              });
              entries.push({
                from: node.from + markLen,
                to: node.to - markLen,
                deco: Decoration.mark({ class: 'cm-inline-code' }),
                isLine: false
              });
              entries.push({
                from: node.to - markLen,
                to: node.to,
                deco: Decoration.replace({}),
                isLine: false
              });
            } else {
              entries.push({
                from: node.from + markLen,
                to: node.to - markLen,
                deco: Decoration.mark({ class: 'cm-inline-code' }),
                isLine: false
              });
            }
          }
          return;
        }

        // Code blocks: FencedCode
        if (name === 'FencedCode') {
          const startLine = state.doc.lineAt(node.from);
          const endLine = state.doc.lineAt(node.to);

          if (startLine.number === endLine.number) {
            entries.push({
              from: startLine.from,
              to: startLine.from,
              deco: Decoration.line({ class: 'cm-fenced-code-line' }),
              isLine: true
            });
            return false;
          }

          const fenceMatch = startLine.text.match(/^```+([a-zA-Z0-9_\-+]*)/);
          const lang = fenceMatch && fenceMatch[1] ? fenceMatch[1].trim() : '';

          const codeLines: string[] = [];
          for (let l = startLine.number + 1; l < endLine.number; l++) {
            codeLines.push(state.doc.line(l).text);
          }
          const codeText = codeLines.join('\n');

          const cursorInCodeBlock = selectionOverlaps(state.selection, node.from, node.to);
          const isCursorOnFirstLine = selectionOverlaps(state.selection, startLine.from, startLine.to);
          const isCursorOnEndLine = selectionOverlaps(state.selection, endLine.from, endLine.to);

          // Opening line
          entries.push({
            from: startLine.from,
            to: startLine.from,
            deco: Decoration.line({ class: 'cm-fenced-code-line cm-fenced-code-header-line' }),
            isLine: true
          });

          if (!isCursorOnFirstLine && startLine.to > startLine.from) {
            entries.push({
              from: startLine.from,
              to: startLine.to,
              deco: Decoration.replace({
                widget: new CodeBlockHeaderWidget(lang, codeText, startLine.from, startLine.to),
                inclusive: false
              }),
              isLine: false
            });
          }

          // Middle lines
          for (let l = startLine.number + 1; l < endLine.number; l++) {
            const curLine = state.doc.line(l);
            entries.push({
              from: curLine.from,
              to: curLine.from,
              deco: Decoration.line({ class: 'cm-fenced-code-line' }),
              isLine: true
            });
          }

          // Closing line
          entries.push({
            from: endLine.from,
            to: endLine.from,
            deco: Decoration.line({ class: 'cm-fenced-code-line cm-fenced-code-footer-line' }),
            isLine: true
          });

          if (!isCursorOnEndLine && !cursorInCodeBlock && endLine.to > endLine.from) {
            entries.push({
              from: endLine.from,
              to: endLine.to,
              deco: Decoration.replace({}),
              isLine: false
            });
          }

          return false;
        }

        // Tables: Table, TableHeader, TableDelimiter
        if (name === 'Table') {
          const startLine = state.doc.lineAt(node.from);
          const endLine = state.doc.lineAt(node.to);
          const cursorInTable = selectionOverlaps(state.selection, startLine.from, endLine.to);

          if (!cursorInTable) {
            const tableText = state.doc.sliceString(startLine.from, endLine.to);
            const parsed = parseMarkdownTable(tableText);
            if (parsed && parsed.headers.length > 0) {
              entries.push({
                from: startLine.from,
                to: endLine.to,
                deco: Decoration.replace({
                  widget: new TableWidget(tableText, parsed, startLine.from, endLine.to),
                  block: true
                }),
                isLine: false
              });
              return false; // Don't traverse Table children when replacing with widget
            }
          }

          for (let l = startLine.number; l <= endLine.number; l++) {
            const curLine = state.doc.line(l);
            entries.push({
              from: curLine.from,
              to: curLine.from,
              deco: Decoration.line({ class: 'cm-table-line' }),
              isLine: true
            });
          }
          return;
        }

        if (name === 'TableHeader') {
          const startLine = state.doc.lineAt(node.from);
          const endLine = state.doc.lineAt(node.to);
          for (let l = startLine.number; l <= endLine.number; l++) {
            const curLine = state.doc.line(l);
            entries.push({
              from: curLine.from,
              to: curLine.from,
              deco: Decoration.line({ class: 'cm-table-header-line' }),
              isLine: true
            });
          }
          return;
        }

        if (name === 'TableDelimiter') {
          const line = state.doc.lineAt(node.from);
          if (line.text.trim().match(/^\|?[\s\-:|]+\|?$/)) {
            entries.push({
              from: line.from,
              to: line.from,
              deco: Decoration.line({ class: 'cm-table-delimiter-line' }),
              isLine: true
            });
          }
          return;
        }

        // Image: ![alt](url)
        if (name === 'Image') {
          const cursorInside = selectionOverlaps(state.selection, node.from, node.to);
          if (!cursorInside) {
            const imgText = state.doc.sliceString(node.from, node.to);
            const match = imgText.match(/^!\[(.*?)\]\((.*?)\)$/);
            if (match) {
              const alt = match[1] || '';
              const src = match[2] ? match[2].trim() : '';
              entries.push({
                from: node.from,
                to: node.to,
                deco: Decoration.replace({
                  widget: new ImageEmbedWidget(src, alt, null, node.from, node.to),
                  inclusive: false
                }),
                isLine: false
              });
            }
          }
          return false;
        }

        // Blockquote & Obsidian Callouts
        if (name === 'Blockquote') {
          const startLine = state.doc.lineAt(node.from);
          const endLine = state.doc.lineAt(node.to);
          const firstLineText = startLine.text;
          const calloutMatch = firstLineText.match(/^>\s*\[!(\w+)\](?:[ \t]+(.*))?$/);

          if (calloutMatch) {
            const rawType = calloutMatch[1] || 'note';
            const calloutTitle = calloutMatch[2] || '';
            const canonicalType = normalizeCalloutType(rawType);
            const calloutClass = `cm-callout-line cm-callout-${canonicalType}`;

            // Line 1: Callout Header
            entries.push({
              from: startLine.from,
              to: startLine.from,
              deco: Decoration.line({ class: calloutClass }),
              isLine: true
            });

            const isCursorOnFirstLine = selectionOverlaps(state.selection, startLine.from, startLine.to);
            if (!isCursorOnFirstLine) {
              entries.push({
                from: startLine.from,
                to: startLine.to,
                deco: Decoration.replace({
                  widget: new CalloutHeaderWidget(rawType, calloutTitle, startLine.from, startLine.to),
                  inclusive: false
                }),
                isLine: false
              });
            }

            // Subsequent lines: Callout body
            for (let l = startLine.number + 1; l <= endLine.number; l++) {
              const curLine = state.doc.line(l);
              const lineText = curLine.text;

              entries.push({
                from: curLine.from,
                to: curLine.from,
                deco: Decoration.line({ class: calloutClass }),
                isLine: true
              });

              const isCursorOnLine = selectionOverlaps(state.selection, curLine.from, curLine.to);
              if (!isCursorOnLine) {
                const quoteMatch = lineText.match(/^>\s?/);
                if (quoteMatch) {
                  entries.push({
                    from: curLine.from,
                    to: curLine.from + quoteMatch[0].length,
                    deco: Decoration.replace({}),
                    isLine: false
                  });
                }
              }
            }
          } else {
            // Standard Blockquote
            for (let l = startLine.number; l <= endLine.number; l++) {
              const curLine = state.doc.line(l);
              const lineText = curLine.text;

              entries.push({
                from: curLine.from,
                to: curLine.from,
                deco: Decoration.line({ class: 'cm-blockquote-line' }),
                isLine: true
              });

              const isCursorOnLine = selectionOverlaps(state.selection, curLine.from, curLine.to);
              if (!isCursorOnLine) {
                const quoteMatch = lineText.match(/^>\s?/);
                if (quoteMatch) {
                  entries.push({
                    from: curLine.from,
                    to: curLine.from + quoteMatch[0].length,
                    deco: Decoration.replace({}),
                    isLine: false
                  });
                }
              }
            }
          }
          return;
        }

        // Note: HorizontalRule is now handled universally in step 3 (line loop)
        // to cleanly support '---' directly below text without Lezer SetextHeading conflict
      }
    });

    // 3. Scan lines for Frontmatter, Horizontal Rules, Task Lists, Strikethrough, and Highlights
    const totalLines = state.doc.lines;

    for (let l = 1; l <= totalLines; l++) {
      const line = state.doc.line(l);

      // Handle frontmatter lines
      if (frontmatterStart !== -1 && l >= fmStartLineNumber && l <= fmEndLineNumber) {
        if (cursorInFrontmatter) {
          entries.push({
            from: line.from,
            to: line.from,
            deco: Decoration.line({ class: 'cm-frontmatter-line' }),
            isLine: true
          });
        }
        continue;
      }

      if (isInsideMath(line.from, line.to)) continue;

      // Skip code blocks
      if (isInsideCode(tree, line.from)) continue;

      const lineText = line.text;

      // Horizontal Rule: ---, ***, ___, etc. (CommonMark thematic break)
      // Matches 3 or more -, *, or _ with optional whitespace
      const isHr = /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(lineText);
      if (isHr) {
        const isCursorOnLine = selectionOverlaps(state.selection, line.from, line.to);
        if (!isCursorOnLine && line.to > line.from) {
          entries.push({
            from: line.from,
            to: line.to,
            deco: Decoration.replace({
              widget: new HorizontalRuleWidget(line.from, line.to),
              inclusive: false
            }),
            isLine: false
          });
        }
        continue;
      }

      // Task lists: - [ ] or - [x]
      const taskMatch = lineText.match(/^(\s*[-*+]\s+)\[([ xX])\](\s*)/);
      if (taskMatch && taskMatch[1] && taskMatch[2]) {
        const prefixLen = taskMatch[1].length;
        const bracketFrom = line.from + prefixLen;
        const bracketTo = bracketFrom + 3; // "[ ]" or "[x]"
        const isChecked = taskMatch[2].toLowerCase() === 'x';
        const cursorInBracket = selectionOverlaps(state.selection, bracketFrom, bracketTo);

        if (!cursorInBracket && !overlapsMath(bracketFrom, bracketTo)) {
          entries.push({
            from: bracketFrom,
            to: bracketTo,
            deco: Decoration.replace({
              widget: new CheckboxWidget(isChecked, bracketFrom, bracketTo)
            }),
            isLine: false
          });

          if (isChecked && line.to > bracketTo) {
            entries.push({
              from: bracketTo,
              to: line.to,
              deco: Decoration.mark({ class: 'cm-task-done' }),
              isLine: false
            });
          }
        }
      }

      // Strikethrough: ~~text~~
      let strikeMatch: RegExpExecArray | null;
      const strikeRegex = /~~([^\n~]+)~~/g;
      while ((strikeMatch = strikeRegex.exec(lineText)) !== null) {
        const mStart = line.from + strikeMatch.index;
        const mEnd = mStart + strikeMatch[0].length;
        if (!overlapsMath(mStart, mEnd)) {
          const cursorInside = selectionOverlaps(state.selection, mStart, mEnd);
          if (!cursorInside) {
            entries.push({
              from: mStart,
              to: mStart + 2,
              deco: Decoration.replace({}),
              isLine: false
            });
            entries.push({
              from: mStart + 2,
              to: mEnd - 2,
              deco: Decoration.mark({ class: 'cm-strikethrough' }),
              isLine: false
            });
            entries.push({
              from: mEnd - 2,
              to: mEnd,
              deco: Decoration.replace({}),
              isLine: false
            });
          } else {
            entries.push({
              from: mStart + 2,
              to: mEnd - 2,
              deco: Decoration.mark({ class: 'cm-strikethrough' }),
              isLine: false
            });
          }
        }
      }

      // Highlights: ==text==
      let hlMatch: RegExpExecArray | null;
      const hlRegex = /==([^\n=]+)==/g;
      while ((hlMatch = hlRegex.exec(lineText)) !== null) {
        const mStart = line.from + hlMatch.index;
        const mEnd = mStart + hlMatch[0].length;
        if (!overlapsMath(mStart, mEnd)) {
          const cursorInside = selectionOverlaps(state.selection, mStart, mEnd);
          if (!cursorInside) {
            entries.push({
              from: mStart,
              to: mStart + 2,
              deco: Decoration.replace({}),
              isLine: false
            });
            entries.push({
              from: mStart + 2,
              to: mEnd - 2,
              deco: Decoration.mark({ class: 'cm-highlight' }),
              isLine: false
            });
            entries.push({
              from: mEnd - 2,
              to: mEnd,
              deco: Decoration.replace({}),
              isLine: false
            });
          } else {
            entries.push({
              from: mStart + 2,
              to: mEnd - 2,
              deco: Decoration.mark({ class: 'cm-highlight' }),
              isLine: false
            });
          }
        }
      }

      // Comments: %%comment%%
      let commentMatch: RegExpExecArray | null;
      const commentRegex = /%%([^\n%]+)%%/g;
      while ((commentMatch = commentRegex.exec(lineText)) !== null) {
        const mStart = line.from + commentMatch.index;
        const mEnd = mStart + commentMatch[0].length;
        if (!overlapsMath(mStart, mEnd)) {
          const cursorInside = selectionOverlaps(state.selection, mStart, mEnd);
          if (!cursorInside) {
            entries.push({
              from: mStart,
              to: mEnd,
              deco: Decoration.replace({}),
              isLine: false
            });
          } else {
            entries.push({
              from: mStart,
              to: mEnd,
              deco: Decoration.mark({ class: 'cm-comment-text' }),
              isLine: false
            });
          }
        }
      }

      // Subscript: ~text~ (single tilde, not ~~)
      let subMatch: RegExpExecArray | null;
      const subRegex = /(?<!~)(~([^~\s\n]+)~)(?!~)/g;
      while ((subMatch = subRegex.exec(lineText)) !== null) {
        const full = subMatch[1];
        if (!full) continue;
        const mStart = line.from + subMatch.index;
        const mEnd = mStart + full.length;
        if (!overlapsMath(mStart, mEnd)) {
          const cursorInside = selectionOverlaps(state.selection, mStart, mEnd);
          if (!cursorInside) {
            entries.push({
              from: mStart,
              to: mStart + 1,
              deco: Decoration.replace({}),
              isLine: false
            });
            entries.push({
              from: mStart + 1,
              to: mEnd - 1,
              deco: Decoration.mark({ class: 'cm-subscript' }),
              isLine: false
            });
            entries.push({
              from: mEnd - 1,
              to: mEnd,
              deco: Decoration.replace({}),
              isLine: false
            });
          } else {
            entries.push({
              from: mStart + 1,
              to: mEnd - 1,
              deco: Decoration.mark({ class: 'cm-subscript' }),
              isLine: false
            });
          }
        }
      }

      // Superscript: ^text^
      let supMatch: RegExpExecArray | null;
      const supRegex = /(?<!\^)(\^([^^\s\n]+)\^)(?!\^)/g;
      while ((supMatch = supRegex.exec(lineText)) !== null) {
        const full = supMatch[1];
        if (!full) continue;
        const mStart = line.from + supMatch.index;
        const mEnd = mStart + full.length;
        if (!overlapsMath(mStart, mEnd)) {
          const cursorInside = selectionOverlaps(state.selection, mStart, mEnd);
          if (!cursorInside) {
            entries.push({
              from: mStart,
              to: mStart + 1,
              deco: Decoration.replace({}),
              isLine: false
            });
            entries.push({
              from: mStart + 1,
              to: mEnd - 1,
              deco: Decoration.mark({ class: 'cm-superscript' }),
              isLine: false
            });
            entries.push({
              from: mEnd - 1,
              to: mEnd,
              deco: Decoration.replace({}),
              isLine: false
            });
          } else {
            entries.push({
              from: mStart + 1,
              to: mEnd - 1,
              deco: Decoration.mark({ class: 'cm-superscript' }),
              isLine: false
            });
          }
        }
      }

      // Tags: #tag, #nested/tag (must not be at start of heading)
      if (!lineText.trimStart().startsWith('#')) {
        let tagMatch: RegExpExecArray | null;
        const tagRegex = /(?:^|[\s(])(#([a-zA-Z_\u00A0-\uFFFF][a-zA-Z0-9_\-/\u00A0-\uFFFF]*))/g;
        while ((tagMatch = tagRegex.exec(lineText)) !== null) {
          const fullTag = tagMatch[1];
          if (!fullTag) continue;
          const offsetInMatch = tagMatch[0].length - fullTag.length;
          const mStart = line.from + tagMatch.index + offsetInMatch;
          const mEnd = mStart + fullTag.length;
          if (!overlapsMath(mStart, mEnd)) {
            const cursorInside = selectionOverlaps(state.selection, mStart, mEnd);
            if (!cursorInside) {
              entries.push({
                from: mStart,
                to: mEnd,
                deco: Decoration.mark({ class: 'cairn-tag-pill' }),
                isLine: false
              });
            }
          }
        }
      }
    }

    // Deduplicate and sort entries
    // Rule for RangeSetBuilder:
    // 1. sorted by from ascending
    // 2. at same from, isLine decorations first
    // 3. no overlapping replace decorations
    entries.sort((a, b) => {
      if (a.from !== b.from) return a.from - b.from;
      if (a.isLine !== b.isLine) return a.isLine ? -1 : 1;
      return a.to - b.to;
    });

    const builder = new RangeSetBuilder<Decoration>();
    let lastReplaceTo = -1;

    for (const entry of entries) {
      const isReplace =
        entry.deco.spec.widget !== undefined ||
        entry.deco.spec.inclusive !== undefined ||
        (entry.from < entry.to && !entry.isLine && !entry.deco.spec.class);

      if (isReplace && entry.to > entry.from) {
        // Prevent overlapping replacement decorations
        if (entry.from < lastReplaceTo) {
          continue;
        }
        lastReplaceTo = Math.max(lastReplaceTo, entry.to);
      } else if (entry.from < lastReplaceTo) {
        // Don't add marks or line decorations inside a replaced range
        continue;
      }

      try {
        builder.add(entry.from, entry.to, entry.deco);
      } catch (err) {
        console.error('RANGE SET ERROR:', err, entry);
      }
    }

    return builder.finish();
  } catch (err) {
    console.error('Failed to build live preview decorations:', err);
    return Decoration.none;
  }
}

export const livePreviewPlugin = StateField.define<DecorationSet>({
  create(state) {
    return buildLivePreviewDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return buildLivePreviewDecorations(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});

