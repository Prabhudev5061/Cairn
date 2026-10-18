import { EditorView, WidgetType } from '@codemirror/view';
import { renderSafeFormattedText } from './tableWidget';

export interface FrontmatterEntry {
  key: string;
  value: string | string[];
  offset: number;
}

/**
 * Parses YAML frontmatter text into key-value entries with character offsets.
 */
export function parseFrontmatter(text: string): FrontmatterEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: FrontmatterEntry[] = [];
  let currentKey: string | null = null;
  let currentList: string[] | null = null;
  let currentKeyOffset = 0;
  let lineOffset = 0;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const thisOffset = lineOffset;
    lineOffset += rawLine.length + 1; // +1 for newline

    // Skip YAML fence lines and comments
    if (!line || line.trim() === '---' || line.trim() === '...' || line.trim().startsWith('#')) {
      continue;
    }

    // Check for list item under current key: "  - item" or "- item"
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey && currentList) {
      const item = listMatch[1]!.trim().replace(/^['"]|['"]$/g, '');
      currentList.push(item);
      continue;
    }

    // Check for new key: "key: value" or "key:"
    const keyMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (keyMatch) {
      // Flush previous list
      if (currentKey && currentList) {
        entries.push({ key: currentKey, value: currentList, offset: currentKeyOffset });
        currentKey = null;
        currentList = null;
      }

      const key = keyMatch[1]!;
      const valStr = keyMatch[2]!.trim();
      currentKeyOffset = thisOffset;

      if (valStr.startsWith('[') && valStr.endsWith(']')) {
        const inner = valStr.slice(1, -1).trim();
        const items =
          inner.length > 0
            ? inner
                .split(',')
                .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
                .filter(Boolean)
            : [];
        entries.push({ key, value: items, offset: currentKeyOffset });
      } else if (valStr.length === 0) {
        currentKey = key;
        currentList = [];
      } else {
        const scalar = valStr.replace(/^['"]|['"]$/g, '');
        entries.push({ key, value: scalar, offset: currentKeyOffset });
      }
    }
  }

  if (currentKey && currentList) {
    entries.push({ key: currentKey, value: currentList, offset: currentKeyOffset });
  }

  return entries;
}

export class FrontmatterWidget extends WidgetType {
  constructor(
    readonly fmText: string,
    readonly entries: FrontmatterEntry[],
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof FrontmatterWidget &&
      other.fmText === this.fmText &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const card = document.createElement('div');
    card.className = 'cairn-frontmatter-card';
    card.setAttribute('tabindex', '-1');

    const table = document.createElement('table');
    table.className = 'cairn-frontmatter-table';
    const tbody = document.createElement('tbody');

    for (const entry of this.entries) {
      const tr = document.createElement('tr');
      tr.className = 'cairn-frontmatter-row';
      tr.dataset.offset = String(entry.offset);

      const keyTd = document.createElement('td');
      keyTd.className = 'cairn-frontmatter-key';
      keyTd.textContent = entry.key;

      const valTd = document.createElement('td');
      valTd.className = 'cairn-frontmatter-value';

      if (Array.isArray(entry.value)) {
        const ul = document.createElement('ul');
        ul.className = 'cairn-frontmatter-list';
        for (const item of entry.value) {
          const li = document.createElement('li');
          renderSafeFormattedText(item, li);
          ul.appendChild(li);
        }
        valTd.appendChild(ul);
      } else {
        renderSafeFormattedText(entry.value, valTd);
      }

      tr.appendChild(keyTd);
      tr.appendChild(valTd);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    card.appendChild(table);

    // Click-to-edit
    card.addEventListener('mousedown', (e) => {
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

    return card;
  }

  ignoreEvent(event: Event): boolean {
    return event.type === 'mousedown';
  }
}
