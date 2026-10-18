export interface MathRange {
  from: number;
  to: number;
  math: string;
  isBlock: boolean;
}

/**
 * Checks if a character at index `pos` in `text` is escaped with an odd number of backslashes.
 */
function isEscaped(text: string, pos: number): boolean {
  let count = 0;
  for (let i = pos - 1; i >= 0 && text[i] === '\\'; i--) {
    count++;
  }
  return count % 2 === 1;
}

/**
 * Scans a text slice between docFrom and docTo and finds all inline ($...$)
 * and block ($$...$$) math expressions.
 */
export function findMathRanges(text: string, offset = 0): MathRange[] {
  const ranges: MathRange[] = [];
  const len = text.length;
  let i = 0;

  while (i < len) {
    if (text[i] === '$' && !isEscaped(text, i)) {
      // Check for block math ($$)
      if (i + 1 < len && text[i + 1] === '$') {
        const start = i;
        const contentStart = i + 2;
        let end = -1;
        let j = contentStart;

        while (j < len) {
          if (text[j] === '$' && !isEscaped(text, j)) {
            if (j + 1 < len && text[j + 1] === '$') {
              end = j + 2;
              break;
            }
          }
          j++;
        }

        if (end !== -1) {
          const rawMath = text.slice(contentStart, end - 2).trim();
          if (rawMath.length > 0) {
            ranges.push({
              from: offset + start,
              to: offset + end,
              math: rawMath,
              isBlock: true
            });
          }
          i = end;
          continue;
        } else {
          // Unclosed block math; stop scanning block at this point
          break;
        }
      }

      // Check for inline math ($)
      // Opening $ must not be followed by space or another $
      const nextChar = text[i + 1];
      if (nextChar && nextChar !== ' ' && nextChar !== '\t' && nextChar !== '\n' && nextChar !== '$') {
        const start = i;
        const contentStart = i + 1;
        let end = -1;
        let j = contentStart;

        while (j < len) {
          const char = text[j];
          // Inline math does not span empty lines
          if (char === '\n' && j + 1 < len && text[j + 1] === '\n') {
            break;
          }

          if (char === '$' && !isEscaped(text, j)) {
            // Closing $ must not be preceded by space or immediately followed by $
            const prevChar = text[j - 1];
            if (prevChar !== ' ' && prevChar !== '\t' && prevChar !== '\n') {
              end = j + 1;
              break;
            }
          }
          j++;
        }

        if (end !== -1) {
          const rawMath = text.slice(contentStart, end - 1).trim();
          if (rawMath.length > 0) {
            ranges.push({
              from: offset + start,
              to: offset + end,
              math: rawMath,
              isBlock: false
            });
          }
          i = end;
          continue;
        }
      }
    }
    i++;
  }

  return ranges;
}
