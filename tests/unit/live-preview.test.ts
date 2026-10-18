import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM, Table } from '@lezer/markdown';
import { EditorView } from '@codemirror/view';
import { selectionOverlaps } from '../../src/renderer/components/editor/livePreview/types';
import { buildLivePreviewDecorations } from '../../src/renderer/components/editor/livePreview/plugin';
import {
  CalloutHeaderWidget,
  CheckboxWidget,
  CodeBlockHeaderWidget,
  FrontmatterWidget,
  HorizontalRuleWidget,
  ImageEmbedWidget,
  parseFrontmatter,
  parseMarkdownTable,
  TableWidget
} from '../../src/renderer/components/editor/livePreview/widgets';
import { MathWidget } from '../../src/renderer/components/editor/math/widget';


describe('Live preview utilities and widgets', () => {
  it('correctly detects when a cursor is inside a token range', () => {
    // Cursor at position 5
    const sel = EditorSelection.single(5);
    // Range [2..8] contains position 5
    expect(selectionOverlaps(sel, 2, 8)).toBe(true);
  });

  it('correctly detects when a cursor is outside a token range', () => {
    // Cursor at position 12
    const sel = EditorSelection.single(12);
    // Range [2..8] does not contain 12
    expect(selectionOverlaps(sel, 2, 8)).toBe(false);
  });

  it('detects boundary intersections to reveal formatting markup', () => {
    // Cursor right at start (2) or end (8)
    const selStart = EditorSelection.single(2);
    expect(selectionOverlaps(selStart, 2, 8)).toBe(true);

    const selEnd = EditorSelection.single(8);
    expect(selectionOverlaps(selEnd, 2, 8)).toBe(true);
  });

  it('detects range selection overlaps', () => {
    // Selection from 0 to 4
    const sel = EditorSelection.single(0, 4);
    // Range [2..8] overlaps with [0..4]
    expect(selectionOverlaps(sel, 2, 8)).toBe(true);
    // Range [5..10] does not overlap with [0..4]
    expect(selectionOverlaps(sel, 5, 10)).toBe(false);
  });

  it('verifies CheckboxWidget equality logic', () => {
    const w1 = new CheckboxWidget(false, 0, 3);
    const w2 = new CheckboxWidget(false, 0, 3);
    const w3 = new CheckboxWidget(true, 0, 3);
    const w4 = new CheckboxWidget(false, 1, 4);

    expect(w1.eq(w2)).toBe(true);
    expect(w1.eq(w3)).toBe(false);
    expect(w1.eq(w4)).toBe(false);
  });

  it('verifies HorizontalRuleWidget equality', () => {
    const h1 = new HorizontalRuleWidget();
    const h2 = new HorizontalRuleWidget();
    expect(h1.eq(h2)).toBe(true);
  });

  it('verifies MathWidget equality logic', () => {
    const m1 = new MathWidget('E = mc^2', false, 0, 10);
    const m2 = new MathWidget('E = mc^2', false, 0, 10);
    const m3 = new MathWidget('E = mc^2', true, 0, 10);
    const m4 = new MathWidget('a^2 + b^2', false, 0, 10);

    expect(m1.eq(m2)).toBe(true);
    expect(m1.eq(m3)).toBe(false);
    expect(m1.eq(m4)).toBe(false);
  });

  it('builds live preview decorations for headings and formatting', () => {
    const doc = '# Heading 1\n## Heading 2\nHere is **bold** text';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    // Cursor at end of doc (position doc.length)
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(doc.length) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    expect(decos.size).toBeGreaterThan(0);

    const classes: string[] = [];
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }
    expect(classes).toContain('cm-heading cm-heading-1');
    expect(classes).toContain('cm-heading cm-heading-2');
    expect(classes).toContain('cm-strong');
  });

  it('decorates math-and-syntax fixture note with cursor at line 1', () => {
    const doc = '# Math and Live Preview\n\n## Section 2\n**bold**';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    // Cursor at position 0 (on line 1)
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    const classes: string[] = [];
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }
    expect(classes).toContain('cm-heading cm-heading-1');
    expect(classes).toContain('cm-heading cm-heading-2');
    expect(classes).toContain('cm-strong');
  });

  it('decorates the entire math-and-syntax.md fixture file', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const fullFixture = await fs.readFile(
      path.resolve(__dirname, '../fixtures/vault/math-and-syntax.md'),
      'utf8'
    );
    const state = EditorState.create({
      doc: fullFixture,
      extensions: [markdown()]
    });
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: fullFixture.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    const classes: string[] = [];
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }
    expect(classes).toContain('cm-heading cm-heading-1');
    expect(classes).toContain('cm-heading cm-heading-2');
    expect(classes).toContain('cm-strong');
    expect(classes.some((c) => c.includes('cm-callout-line'))).toBe(true);
  });

  it('renders horizontal rule when "---" is used directly below a text line', () => {
    const doc = 'Some introductory text\n---\nFollowing paragraph';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    // Cursor at position 0 (line 1, not on the "---" line)
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    let hrFound = false;
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof HorizontalRuleWidget) {
        hrFound = true;
      }
      iter.next();
    }
    expect(hrFound).toBe(true);
  });

  it('reveals raw "---" text when cursor is focused on the horizontal rule line', () => {
    const doc = 'Some introductory text\n---\nFollowing paragraph';
    const hrPos = doc.indexOf('---');
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    // Cursor on the "---" line
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(hrPos) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    let hrFound = false;
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof HorizontalRuleWidget) {
        hrFound = true;
      }
      iter.next();
    }
    expect(hrFound).toBe(false);
  });

  it('protects YAML frontmatter from becoming horizontal rules and renders FrontmatterWidget or cm-frontmatter-line', () => {
    const doc = '---\ntitle: Protected Frontmatter\ntags: [a, b]\n---\n# Real Heading\nText';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });

    // 1. Unfocused from frontmatter: FrontmatterWidget is rendered, no hr
    const viewUnfocused = {
      state: state.update({ selection: EditorSelection.single(doc.length) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decosUnfocused = buildLivePreviewDecorations(viewUnfocused);
    let hrFound = false;
    let fmWidgetFound = false;
    const iter1 = decosUnfocused.iter();
    while (iter1.value) {
      if (iter1.value.spec.widget instanceof HorizontalRuleWidget) {
        hrFound = true;
      }
      if (iter1.value.spec.widget instanceof FrontmatterWidget) {
        fmWidgetFound = true;
      }
      iter1.next();
    }
    expect(hrFound).toBe(false);
    expect(fmWidgetFound).toBe(true);

    // 2. Focused inside frontmatter (e.g. position 5): reveals raw YAML with cm-frontmatter-line
    const viewFocused = {
      state: state.update({ selection: EditorSelection.single(5) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decosFocused = buildLivePreviewDecorations(viewFocused);
    const classes: string[] = [];
    const iter2 = decosFocused.iter();
    while (iter2.value) {
      if (iter2.value.spec.class) {
        classes.push(iter2.value.spec.class);
      }
      iter2.next();
    }
    expect(classes.filter((c) => c === 'cm-frontmatter-line').length).toBeGreaterThanOrEqual(4);
  });

  it('shields code blocks from math and wikilink widget replacements', () => {
    const doc = '```ts\nconst x = "$E = mc^2$";\nconst link = "[[Note]]";\n---\n```';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    let mathFound = false;
    let hrFound = false;
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof MathWidget) {
        mathFound = true;
      }
      if (iter.value.spec.widget instanceof HorizontalRuleWidget) {
        hrFound = true;
      }
      iter.next();
    }
    expect(mathFound).toBe(false);
    expect(hrFound).toBe(false);
  });

  it('decorates headings in a document containing frontmatter', () => {
    const doc = `---\ntitle: LaTeX Formatting Cheat Sheet\naliases: [Math Cheat Sheet, KaTeX Guide]\ntags: [math, katex, latex, guide]\n---\n\n# LaTeX Formatting Cheat Sheet\n\nCairn provides typography-grade KaTeX formula rendering with live preview editing and autocomplete.\n\n## Matrix Formulations\n`;
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    const classes: string[] = [];
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }
    expect(classes).toContain('cm-heading cm-heading-1');
    expect(classes).toContain('cm-heading cm-heading-2');
  });

  it('decorates headings when frontmatter is preceded by blank lines', () => {
    const doc = `\n\n---\ntitle: Blank Lines Test\n---\n\n# Heading After Blanks\n## Subheading\n`;
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    const classes: string[] = [];
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }
    expect(classes).toContain('cm-heading cm-heading-1');
    expect(classes).toContain('cm-heading cm-heading-2');
  });

  it('decorates Obsidian Callouts with CalloutHeaderWidget and callout line classes', () => {
    const doc = '> [!warning] Critical Warning\n> This is the callout body text.\n> Second line.';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    // Cursor at position doc.length (outside callout header)
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(doc.length) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    let widgetFound = false;
    let widgetType = '';
    let widgetTitle = '';
    const classes: string[] = [];

    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof CalloutHeaderWidget) {
        widgetFound = true;
        widgetType = iter.value.spec.widget.type;
        widgetTitle = iter.value.spec.widget.title;
      }
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }

    expect(widgetFound).toBe(true);
    expect(widgetType).toBe('warning');
    expect(widgetTitle).toBe('Critical Warning');
    expect(classes.some((c) => c.includes('cm-callout-warning'))).toBe(true);
  });

  it('reveals raw callout syntax when cursor is on the callout header line', () => {
    const doc = '> [!note] My Title\n> Line 2';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    // Cursor on line 1 (position 3)
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(3) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    let widgetFound = false;
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof CalloutHeaderWidget) {
        widgetFound = true;
      }
      iter.next();
    }
    // Cursor on header reveals raw text
    expect(widgetFound).toBe(false);
  });

  it('decorates tags with cairn-tag-pill when unfocused', () => {
    const doc = 'Notes on #science and #project/cairn-dev in general.';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    const classes: string[] = [];
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }

    const tagCount = classes.filter((c) => c === 'cairn-tag-pill').length;
    expect(tagCount).toBe(2);
  });

  it('conceals comments when unfocused and applies cm-comment-text when focused', () => {
    const doc = 'Intro text %%secret note%% outro text';
    const commentStart = doc.indexOf('%%secret note%%');
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });

    // Case 1: Unfocused (cursor at 0)
    const viewUnfocused = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;
    const decosUnfocused = buildLivePreviewDecorations(viewUnfocused);

    let replacedRange = false;
    const iterUnf = decosUnfocused.iter();
    while (iterUnf.value) {
      if (iterUnf.from === commentStart && iterUnf.to === commentStart + '%%secret note%%'.length) {
        replacedRange = true;
      }
      iterUnf.next();
    }
    expect(replacedRange).toBe(true);

    // Case 2: Focused (cursor inside comment)
    const viewFocused = {
      state: state.update({ selection: EditorSelection.single(commentStart + 3) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;
    const decosFocused = buildLivePreviewDecorations(viewFocused);

    const classes: string[] = [];
    const iterFoc = decosFocused.iter();
    while (iterFoc.value) {
      if (iterFoc.value.spec.class) {
        classes.push(iterFoc.value.spec.class);
      }
      iterFoc.next();
    }
    expect(classes).toContain('cm-comment-text');
  });

  it('decorates subscript and superscript notation', () => {
    const doc = 'Chemical formula H~2~O and energy E=mc^2^';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    const classes: string[] = [];
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }
    expect(classes).toContain('cm-subscript');
    expect(classes).toContain('cm-superscript');
  });

  it('decorates fenced code blocks with CodeBlockHeaderWidget and code line classes', () => {
    const docWithIntro = 'Intro text\n```typescript\nconst greeting = "Hello, Cairn!";\nconsole.log(greeting);\n```';
    const stateWithIntro = EditorState.create({
      doc: docWithIntro,
      extensions: [markdown()]
    });
    // Cursor at position 0 (on "Intro text", outside the code block)
    const viewOutside = {
      state: stateWithIntro.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: docWithIntro.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewOutside);
    let widgetFound = false;
    let widgetLang = '';
    let widgetCode = '';
    const classes: string[] = [];

    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof CodeBlockHeaderWidget) {
        widgetFound = true;
        widgetLang = iter.value.spec.widget.language;
        widgetCode = iter.value.spec.widget.codeText;
      }
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }

    expect(widgetFound).toBe(true);
    expect(widgetLang).toBe('typescript');
    expect(widgetCode).toContain('const greeting');
    expect(classes.some((c) => c.includes('cm-fenced-code-header-line'))).toBe(true);
    expect(classes.some((c) => c.includes('cm-fenced-code-footer-line'))).toBe(true);
  });

  it('reveals raw code block opening fence when cursor is focused on the fence line', () => {
    const doc = '```python\nprint("hello")\n```';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    // Cursor at position 3 (on ```python line)
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(3) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    let widgetFound = false;
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof CodeBlockHeaderWidget) {
        widgetFound = true;
      }
      iter.next();
    }
    expect(widgetFound).toBe(false);
  });

  it('decorates GFM tables with table line, header, and delimiter classes', () => {
    const doc = '| Syntax | Description |\n| :--- | :--- |\n| Header | Title |\n| Paragraph | Text |';
    const state = EditorState.create({
      doc,
      extensions: [markdown({ extensions: [GFM, Table] })]
    });
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    const classes: string[] = [];
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.class) {
        classes.push(iter.value.spec.class);
      }
      iter.next();
    }

    expect(classes).toContain('cm-table-line');
    expect(classes).toContain('cm-table-header-line');
    expect(classes).toContain('cm-table-delimiter-line');
  });

  it('decorates image syntax with ImageEmbedWidget when unfocused', () => {
    const doc = 'Here is a diagram: ![Network Diagram](https://example.com/network.png) in text';
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    // Cursor at 0 (unfocused)
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(0) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    let imgWidgetFound = false;
    let imgSrc = '';
    let imgAlt = '';
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof ImageEmbedWidget) {
        imgWidgetFound = true;
        imgSrc = iter.value.spec.widget.src;
        imgAlt = iter.value.spec.widget.alt;
      }
      iter.next();
    }

    expect(imgWidgetFound).toBe(true);
    expect(imgSrc).toBe('https://example.com/network.png');
    expect(imgAlt).toBe('Network Diagram');
  });

  it('reveals raw image syntax when cursor is focused on the image', () => {
    const doc = 'Here is a diagram: ![Network Diagram](https://example.com/network.png) in text';
    const imgPos = doc.indexOf('![Network Diagram]');
    const state = EditorState.create({
      doc,
      extensions: [markdown()]
    });
    // Cursor inside the image syntax
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(imgPos + 5) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    let imgWidgetFound = false;
    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof ImageEmbedWidget) {
        imgWidgetFound = true;
      }
      iter.next();
    }

    expect(imgWidgetFound).toBe(false);
  });

  it('renders TableWidget when cursor is outside the table', () => {
    const doc = '# Header\n\n| Particle | Symbol | Rest Mass (MeV/c²) |\n| :--- | :---: | ---: |\n| Electron | e- | 0.511 |\n| Proton | p+ | 938.272 |\n\nFooter text';
    const state = EditorState.create({
      doc,
      extensions: [markdown({ extensions: [GFM, Table] })]
    });
    // Cursor at end of document (outside table)
    const viewMock = {
      state: state.update({ selection: EditorSelection.single(doc.length) }).state,
      visibleRanges: [{ from: 0, to: doc.length }]
    } as unknown as EditorView;

    const decos = buildLivePreviewDecorations(viewMock);
    let tableWidgetFound = false;
    let tableHeaders: string[] = [];
    let tableAlignments: string[] = [];
    let tableRows: string[][] = [];

    const iter = decos.iter();
    while (iter.value) {
      if (iter.value.spec.widget instanceof TableWidget) {
        tableWidgetFound = true;
        tableHeaders = iter.value.spec.widget.parsed.headers;
        tableAlignments = iter.value.spec.widget.parsed.alignments;
        tableRows = iter.value.spec.widget.parsed.rows;
      }
      iter.next();
    }

    expect(tableWidgetFound).toBe(true);
    expect(tableHeaders).toEqual(['Particle', 'Symbol', 'Rest Mass (MeV/c²)']);
    expect(tableAlignments).toEqual(['left', 'center', 'right']);
    expect(tableRows).toHaveLength(2);
    expect(tableRows[0]).toEqual(['Electron', 'e-', '0.511']);
    expect(tableRows[1]).toEqual(['Proton', 'p+', '938.272']);
  });

  it('correctly parses markdown table alignments and escaped pipes', () => {
    const raw = '| Col 1 | Col 2 | Col 3 |\n| :--- | :---: | ---: |\n| cell \\| with pipe | center | right |';
    const parsed = parseMarkdownTable(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.headers).toEqual(['Col 1', 'Col 2', 'Col 3']);
    expect(parsed!.alignments).toEqual(['left', 'center', 'right']);
    expect(parsed!.rows[0]).toEqual(['cell | with pipe', 'center', 'right']);
  });

  it('correctly parses YAML frontmatter with scalars, flow arrays, and block lists', () => {
    const yaml = '---\ntitle: Vim Keybinding Engine\naliases: [Vim Engine, Modal Editing]\ntags: [vim, editor, productivity, cairn]\nauthors:\n  - Alice\n  - Bob\n---';
    const entries = parseFrontmatter(yaml);
    expect(entries).toHaveLength(4);
    expect(entries[0]).toEqual(expect.objectContaining({ key: 'title', value: 'Vim Keybinding Engine' }));
    expect(entries[1]).toEqual(expect.objectContaining({ key: 'aliases', value: ['Vim Engine', 'Modal Editing'] }));
    expect(entries[2]).toEqual(expect.objectContaining({ key: 'tags', value: ['vim', 'editor', 'productivity', 'cairn'] }));
    expect(entries[3]).toEqual(expect.objectContaining({ key: 'authors', value: ['Alice', 'Bob'] }));
  });
});



