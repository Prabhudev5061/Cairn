import { EditorView, WidgetType } from '@codemirror/view';

export class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: CheckboxWidget): boolean {
    return (
      other.checked === this.checked &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cairn-task-wrap';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'cairn-task-checkbox';
    input.checked = this.checked;
    input.setAttribute('aria-label', this.checked ? 'Completed task' : 'Incomplete task');

    input.addEventListener('change', (e) => {
      e.stopPropagation();
      const insert = this.checked ? '[ ]' : '[x]';
      view.dispatch({
        changes: {
          from: this.from,
          to: this.to,
          insert
        }
      });
    });

    wrap.appendChild(input);
    return wrap;
  }

  ignoreEvent(event: Event): boolean {
    return event.type === 'mousedown' || event.type === 'click' || event.type === 'change';
  }
}

export class HorizontalRuleWidget extends WidgetType {
  constructor(
    readonly from?: number,
    readonly to?: number
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof HorizontalRuleWidget &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const hr = document.createElement('hr');
    hr.className = 'cairn-hr';
    if (this.from !== undefined && view) {
      hr.addEventListener('mousedown', (e) => {
        e.preventDefault();
        view.dispatch({
          selection: { anchor: this.from!, head: this.from! },
          scrollIntoView: true
        });
        view.focus();
      });
    }
    return hr;
  }

  ignoreEvent(event: Event): boolean {
    return event.type === 'mousedown';
  }
}

export class WikilinkWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly alias: string | null,
    readonly subpath: string | null,
    readonly subpathType: 'heading' | 'block' | null,
    readonly isEmbed: boolean,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: WikilinkWidget): boolean {
    return (
      other.target === this.target &&
      other.alias === this.alias &&
      other.subpath === this.subpath &&
      other.subpathType === this.subpathType &&
      other.isEmbed === this.isEmbed &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(): HTMLElement {
    const isImage = /\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i.test(this.target);
    if (this.isEmbed && isImage) {
      const container = document.createElement('span');
      container.className = 'cairn-image-embed-wrap';

      const img = document.createElement('img');
      img.className = 'cairn-image-embed';
      img.alt = this.alias || this.target;
      if (this.alias && /^\d+$/.test(this.alias.trim())) {
        img.style.maxWidth = `${this.alias.trim()}px`;
      }
      img.src = this.target;
      img.onerror = () => {
        container.innerHTML = `
          <span class="cairn-image-fallback">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            <span>${this.alias || this.target}</span>
          </span>
        `;
      };
      container.appendChild(img);
      return container;
    }

    const span = document.createElement('span');
    span.className = 'cairn-wikilink';
    span.setAttribute('data-target', this.target);
    span.setAttribute('data-from', String(this.from));
    span.setAttribute('data-to', String(this.to));

    let displayText = this.alias || this.target;
    if (!this.alias && this.subpath) {
      displayText += `#${this.subpath}`;
    }
    span.textContent = displayText;
    span.title = `Click to follow [[${this.target}${this.subpath ? '#' + this.subpath : ''}]]`;

    span.addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(
        new CustomEvent('cairn:navigate-link', {
          detail: {
            target: this.target,
            subpath: this.subpath,
            subpathType: this.subpathType
          }
        })
      );
    });

    return span;
  }

  ignoreEvent(event: Event): boolean {
    return event.type === 'click' || event.type === 'mousedown';
  }
}

export function normalizeCalloutType(type: string): string {
  const lower = type.toLowerCase();
  switch (lower) {
    case 'info':
      return 'note';
    case 'hint':
    case 'important':
      return 'tip';
    case 'caution':
    case 'attention':
      return 'warning';
    case 'error':
      return 'danger';
    case 'check':
    case 'done':
      return 'success';
    case 'help':
    case 'faq':
      return 'question';
    case 'cite':
      return 'quote';
    default:
      return lower;
  }
}

const CALLOUT_ICONS: Record<string, string> = {
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  tip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>',
  todo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>',
  example: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  bug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg>'
};

export class CalloutHeaderWidget extends WidgetType {
  constructor(
    readonly type: string,
    readonly title: string,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof CalloutHeaderWidget &&
      other.type === this.type &&
      other.title === this.title &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const header = document.createElement('div');
    header.className = 'cairn-callout-header';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'cairn-callout-icon';
    const canonicalType = normalizeCalloutType(this.type);
    iconSpan.innerHTML = CALLOUT_ICONS[canonicalType] || CALLOUT_ICONS.note || '';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'cairn-callout-title';
    titleSpan.textContent =
      this.title.trim() || (this.type.charAt(0).toUpperCase() + this.type.slice(1));

    header.appendChild(iconSpan);
    header.appendChild(titleSpan);

    header.addEventListener('mousedown', (e) => {
      e.preventDefault();
      view.dispatch({
        selection: { anchor: this.from, head: this.from },
        scrollIntoView: true
      });
      view.focus();
    });

    return header;
  }

  ignoreEvent(event: Event): boolean {
    return event.type === 'mousedown';
  }
}

export class CodeBlockHeaderWidget extends WidgetType {
  constructor(
    readonly language: string,
    readonly codeText: string,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof CodeBlockHeaderWidget &&
      other.language === this.language &&
      other.codeText === this.codeText &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const header = document.createElement('div');
    header.className = 'cairn-codeblock-header';

    const langBadge = document.createElement('span');
    langBadge.className = 'cairn-codeblock-lang';
    const langDisplay = this.language.trim().toUpperCase() || 'CODE';
    langBadge.textContent = langDisplay;

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'cairn-codeblock-copy-btn';
    copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
    copyBtn.title = 'Copy code';

    const copyIcon =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    const checkIcon =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    copyBtn.innerHTML = `${copyIcon}<span>Copy</span>`;

    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      void navigator.clipboard.writeText(this.codeText).then(() => {
        copyBtn.innerHTML = `${checkIcon}<span>Copied!</span>`;
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.innerHTML = `${copyIcon}<span>Copy</span>`;
          copyBtn.classList.remove('copied');
        }, 1800);
      });
    });

    header.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.cairn-codeblock-copy-btn')) return;
      e.preventDefault();
      view.dispatch({
        selection: { anchor: this.from, head: this.from },
        scrollIntoView: true
      });
      view.focus();
    });

    header.appendChild(langBadge);
    header.appendChild(copyBtn);
    return header;
  }

  ignoreEvent(event: Event): boolean {
    return event.type === 'click' || event.type === 'mousedown';
  }
}

export class ImageEmbedWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly width: string | null,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof ImageEmbedWidget &&
      other.src === this.src &&
      other.alt === this.alt &&
      other.width === this.width &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('span');
    container.className = 'cairn-image-embed-wrap';

    const img = document.createElement('img');
    img.className = 'cairn-image-embed';
    img.alt = this.alt || 'Image';
    if (this.width) {
      img.style.maxWidth = `${this.width}px`;
    }
    img.src = this.src;

    img.onerror = () => {
      container.innerHTML = `
        <span class="cairn-image-fallback">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          <span>${this.alt || this.src}</span>
        </span>
      `;
    };

    container.appendChild(img);

    container.addEventListener('mousedown', (e) => {
      e.preventDefault();
      view.dispatch({
        selection: { anchor: this.from, head: this.from },
        scrollIntoView: true
      });
      view.focus();
    });

    return container;
  }

  ignoreEvent(event: Event): boolean {
    return event.type === 'mousedown';
  }
}

export * from './tableWidget';
export * from './frontmatterWidget';

export class OrgTodoWidget extends WidgetType {
  constructor(readonly status: 'TODO' | 'DONE') {
    super();
  }

  eq(other: OrgTodoWidget): boolean {
    return other.status === this.status;
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = this.status === 'TODO' ? 'cairn-org-todo' : 'cairn-org-done';
    span.textContent = this.status;
    return span;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

export class AnchorChipWidget extends WidgetType {
  constructor(readonly name: string) {
    super();
  }

  eq(other: AnchorChipWidget): boolean {
    return other.name === this.name;
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cairn-anchor-chip';
    span.textContent = this.name;
    return span;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

