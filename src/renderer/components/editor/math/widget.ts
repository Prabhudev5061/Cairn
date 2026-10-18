import { EditorView, WidgetType } from '@codemirror/view';
import katex from 'katex';

const mathRenderCache = new Map<string, string>();
const MAX_MATH_CACHE_SIZE = 500;

export function renderKatexMemoized(math: string, displayMode: boolean): string {
  const cacheKey = (displayMode ? 'B:' : 'I:') + math;
  const cached = mathRenderCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const rendered = katex.renderToString(math, {
    displayMode,
    throwOnError: false
  });
  if (mathRenderCache.size >= MAX_MATH_CACHE_SIZE) {
    const firstKey = mathRenderCache.keys().next().value;
    if (firstKey) mathRenderCache.delete(firstKey);
  }
  mathRenderCache.set(cacheKey, rendered);
  return rendered;
}

export class MathWidget extends WidgetType {
  constructor(
    readonly math: string,
    readonly isBlock: boolean,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: MathWidget): boolean {
    return (
      other.math === this.math &&
      other.isBlock === this.isBlock &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const el = document.createElement(this.isBlock ? 'div' : 'span');
    el.className = this.isBlock ? 'cairn-math-block' : 'cairn-math-inline';
    el.setAttribute('data-math', this.math);
    el.setAttribute('tabindex', '-1');

    try {
      el.innerHTML = renderKatexMemoized(this.math, this.isBlock);
    } catch {
      el.textContent = this.math;
      el.classList.add('cairn-math-error');
    }

    // Clicking the rendered math places the cursor inside it, seamlessly revealing the raw LaTeX
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      // Place cursor right after the opening delimiter
      const targetPos = this.from + (this.isBlock ? 2 : 1);
      view.dispatch({
        selection: { anchor: targetPos, head: targetPos },
        scrollIntoView: true
      });
      view.focus();
    });

    return el;
  }

  ignoreEvent(event: Event): boolean {
    // Let mousedown event handle expanding into raw text
    return event.type === 'mousedown';
  }
}
