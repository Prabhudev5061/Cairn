import { EditorView, WidgetType } from '@codemirror/view';

export interface ParsedTable {
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
  rowOffsets: number[];
}

/**
 * Safely renders inline markdown formatting into a container element without innerHTML.
 */
export function renderSafeFormattedText(text: string, container: HTMLElement): void {
  // Regex matching inline formatting tokens:
  // `code`, **bold**, *italic*, ~~strikethrough~~, ==highlight==, ~sub~, ^sup^, [[link|alias]]
  const tokenRegex =
    /(`([^`\n]+)`)|\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|==([^=]+)==|~([^~\s]+)~|\^([^^\\s]+)\^|\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    if (match[1] && match[2] !== undefined) {
      const code = document.createElement('code');
      code.className = 'cm-inline-code';
      code.textContent = match[2];
      container.appendChild(code);
    } else if (match[3] !== undefined) {
      const strong = document.createElement('strong');
      strong.className = 'cm-strong';
      strong.textContent = match[3];
      container.appendChild(strong);
    } else if (match[4] !== undefined) {
      const em = document.createElement('em');
      em.className = 'cm-em';
      em.textContent = match[4];
      container.appendChild(em);
    } else if (match[5] !== undefined) {
      const del = document.createElement('del');
      del.className = 'cm-strikethrough';
      del.textContent = match[5];
      container.appendChild(del);
    } else if (match[6] !== undefined) {
      const mark = document.createElement('mark');
      mark.className = 'cm-highlight';
      mark.textContent = match[6];
      container.appendChild(mark);
    } else if (match[7] !== undefined) {
      const sub = document.createElement('sub');
      sub.className = 'cm-subscript';
      sub.textContent = match[7];
      container.appendChild(sub);
    } else if (match[8] !== undefined) {
      const sup = document.createElement('sup');
      sup.className = 'cm-superscript';
      sup.textContent = match[8];
      container.appendChild(sup);
    } else if (match[9] !== undefined) {
      const span = document.createElement('span');
      span.className = 'cairn-wikilink';
      span.textContent = match[10] || match[9];
      container.appendChild(span);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

/**
 * Splits a table row into cells, respecting escaped pipe characters.
 */
function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);

  const cells: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length && s[i + 1] === '|') {
      cur += '|';
      i++;
    } else if (s[i] === '|') {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += s[i];
    }
  }
  cells.push(cur.trim());
  return cells;
}

/**
 * Parses markdown table text into headers, alignments, and rows.
 */
export function parseMarkdownTable(text: string): ParsedTable | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const headerLine = lines[0] ?? '';
  const delimLine = lines[1] ?? '';

  // Delimiter line must look like |:---|:---:|---:|
  if (!delimLine.trim().match(/^\|?[\s\-:|]+\|?$/)) {
    return null;
  }

  const headers = splitTableRow(headerLine);
  if (headers.length === 0) return null;

  const delimCells = splitTableRow(delimLine);
  if (delimCells.length === 0) return null;

  const alignments: ('left' | 'center' | 'right')[] = [];
  for (let i = 0; i < headers.length; i++) {
    const d = delimCells[i]?.trim() ?? '';
    const leftColon = d.startsWith(':');
    const rightColon = d.endsWith(':');
    if (leftColon && rightColon) {
      alignments.push('center');
    } else if (rightColon) {
      alignments.push('right');
    } else {
      alignments.push('left');
    }
  }

  const rows: string[][] = [];
  const rawLines = text.split(/\r?\n/);
  const rowOffsets: number[] = [];
  let currentOffset = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]!;
    if (i >= 2 && raw.trim().length > 0) {
      const cells = splitTableRow(raw);
      while (cells.length < headers.length) {
        cells.push('');
      }
      rows.push(cells.slice(0, headers.length));
      rowOffsets.push(currentOffset);
    }
    currentOffset += raw.length + 1;
  }

  return { headers, alignments, rows, rowOffsets };
}

export class TableWidget extends WidgetType {
  constructor(
    readonly tableText: string,
    readonly parsed: ParsedTable,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof TableWidget &&
      other.tableText === this.tableText &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'cairn-table-wrap';
    wrap.setAttribute('tabindex', '-1');

    const table = document.createElement('table');
    table.className = 'cairn-rendered-table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.dataset.offset = '0';

    for (let i = 0; i < this.parsed.headers.length; i++) {
      const th = document.createElement('th');
      th.style.textAlign = this.parsed.alignments[i] || 'left';
      renderSafeFormattedText(this.parsed.headers[i] || '', th);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    for (let r = 0; r < this.parsed.rows.length; r++) {
      const row = this.parsed.rows[r]!;
      const tr = document.createElement('tr');
      const offset = this.parsed.rowOffsets[r] ?? 0;
      tr.dataset.offset = String(offset);

      for (let c = 0; c < this.parsed.headers.length; c++) {
        const td = document.createElement('td');
        td.style.textAlign = this.parsed.alignments[c] || 'left';
        renderSafeFormattedText(row[c] || '', td);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);

    // Click-to-edit
    wrap.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const tr = (e.target as HTMLElement).closest('tr');
      let targetPos = this.from;
      if (tr && tr.dataset.offset) {
        targetPos = Math.min(this.to, this.from + parseInt(tr.dataset.offset, 10));
      }
      view.dispatch({
        selection: { anchor: targetPos, head: targetPos },
        scrollIntoView: true
      });
      view.focus();
    });

    return wrap;
  }

  ignoreEvent(event: Event): boolean {
    return event.type === 'mousedown';
  }
}
