import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { buildLivePreviewAsciidocDecorations } from '../../src/renderer/components/editor/livePreview/livePreviewAsciidoc';
import { buildLivePreviewOrgDecorations } from '../../src/renderer/components/editor/livePreview/livePreviewOrg';
import { buildLivePreviewTypstDecorations } from '../../src/renderer/components/editor/livePreview/livePreviewTypst';
import {
  AnchorChipWidget,
  CalloutHeaderWidget,
  CheckboxWidget,
  OrgTodoWidget,
  WikilinkWidget
} from '../../src/renderer/components/editor/livePreview/widgets';
import { MathWidget } from '../../src/renderer/components/editor/math/widget';

describe('Multi-Format Live Preview Decorators (Org, Typst, AsciiDoc)', () => {
  describe('Widgets & Equality', () => {
    it('verifies OrgTodoWidget equality and status properties', () => {
      const todo1 = new OrgTodoWidget('TODO');
      const todo2 = new OrgTodoWidget('TODO');
      const done = new OrgTodoWidget('DONE');

      expect(todo1.eq(todo2)).toBe(true);
      expect(todo1.eq(done)).toBe(false);
      expect(todo1.status).toBe('TODO');
      expect(done.status).toBe('DONE');

      if (typeof document !== 'undefined') {
        const el = todo1.toDOM();
        expect(el.className).toBe('cairn-org-todo');
        expect(el.textContent).toBe('TODO');
      }
    });

    it('verifies AnchorChipWidget equality and properties', () => {
      const a1 = new AnchorChipWidget('sec-intro');
      const a2 = new AnchorChipWidget('sec-intro');
      const a3 = new AnchorChipWidget('sec-math');

      expect(a1.eq(a2)).toBe(true);
      expect(a1.eq(a3)).toBe(false);
      expect(a1.name).toBe('sec-intro');

      if (typeof document !== 'undefined') {
        const dom = a1.toDOM();
        expect(dom.className).toBe('cairn-anchor-chip');
        expect(dom.textContent).toBe('sec-intro');
      }
    });
  });

  describe('Org-Mode Live Preview Decorator', () => {
    it('decorates headings, TODO states, checkboxes, links, and bold text when caret is away', () => {
      const doc = `* Top Level Heading
** TODO Task Heading
- [ ] Incomplete checkbox
- [X] Completed checkbox
Here is [[overview][Overview Note]] and *important* text.
`;
      // Cursor parked at end of document
      const state = EditorState.create({
        doc,
        selection: EditorSelection.single(doc.length)
      });

      const decos = buildLivePreviewOrgDecorations(state);
      expect(decos.size).toBeGreaterThan(0);

      const widgets: string[] = [];
      const marks: string[] = [];
      const lines: string[] = [];

      const iter = decos.iter();
      while (iter.value) {
        if (iter.value.spec.widget instanceof OrgTodoWidget) {
          widgets.push(`todo:${iter.value.spec.widget.status}`);
        } else if (iter.value.spec.widget instanceof CheckboxWidget) {
          widgets.push(`cb:${iter.value.spec.widget.checked}`);
        } else if (iter.value.spec.widget instanceof WikilinkWidget) {
          widgets.push(`link:${iter.value.spec.widget.target}`);
        }

        if (iter.value.spec.class) {
          if (iter.from === iter.to) {
            lines.push(iter.value.spec.class);
          } else {
            marks.push(iter.value.spec.class);
          }
        }
        iter.next();
      }

      // Assert heading lines
      expect(lines).toContain('cm-heading-1');
      expect(lines).toContain('cm-heading-2');

      // Assert widgets
      expect(widgets).toContain('todo:TODO');
      expect(widgets).toContain('cb:false');
      expect(widgets).toContain('cb:true');
      expect(widgets).toContain('link:overview');

      // Assert bold mark
      expect(marks).toContain('cm-strong');
    });

    it('reveals raw heading asterisks when caret enters the heading line', () => {
      const doc = `* Top Level Heading\nSome content below.`;
      // Cursor placed inside the heading line (position 5)
      const state = EditorState.create({
        doc,
        selection: EditorSelection.single(5)
      });

      const decos = buildLivePreviewOrgDecorations(state);

      // In unfocused state, there is a replace decoration hiding "* " (from 0 to 2)
      let foundConcealReplace = false;
      const iter = decos.iter();
      while (iter.value) {
        if (iter.from === 0 && iter.to === 2 && !iter.value.spec.widget) {
          foundConcealReplace = true;
        }
        iter.next();
      }
      expect(foundConcealReplace).toBe(false);
    });
  });

  describe('Typst Live Preview Decorator', () => {
    it('decorates typst headings, KaTeX math expressions, labels, refs, and wikilinks', () => {
      const doc = `= Introduction <sec-intro>
See @sec-intro and [[cairn-roadmap]] for details.
$ E = m c^2 $
Here is *bold* and _italic_ text.
`;
      const state = EditorState.create({
        doc,
        selection: EditorSelection.single(doc.length)
      });

      const decos = buildLivePreviewTypstDecorations(state);
      expect(decos.size).toBeGreaterThan(0);

      const widgets: string[] = [];
      const marks: string[] = [];
      const lines: string[] = [];

      const iter = decos.iter();
      while (iter.value) {
        if (iter.value.spec.widget instanceof MathWidget) {
          widgets.push(`math:${iter.value.spec.widget.math}`);
        } else if (iter.value.spec.widget instanceof AnchorChipWidget) {
          widgets.push(`anchor:${iter.value.spec.widget.name}`);
        } else if (iter.value.spec.widget instanceof WikilinkWidget) {
          widgets.push(`link:${iter.value.spec.widget.target}`);
        }

        if (iter.value.spec.class) {
          if (iter.from === iter.to) {
            lines.push(iter.value.spec.class);
          } else {
            marks.push(iter.value.spec.class);
          }
        }
        iter.next();
      }

      expect(lines).toContain('cm-heading-1');
      expect(widgets).toContain('anchor:sec-intro');
      expect(widgets).toContain('link:sec-intro');
      expect(widgets).toContain('link:cairn-roadmap');
      expect(widgets).toContain('math:E = m c^2');
      expect(marks).toContain('cm-strong');
      expect(marks).toContain('cm-em');
    });
  });

  describe('AsciiDoc Live Preview Decorator', () => {
    it('decorates headings, admonition callout boxes, xref links, and anchors', () => {
      const doc = `= Document Title
== Section Two [#sec-two]
[NOTE]
This is an important note block.
Refer to xref:quantum-state-collapse.typ[Quantum Research] and [[cairn-roadmap]].
`;
      const state = EditorState.create({
        doc,
        selection: EditorSelection.single(doc.length)
      });

      const decos = buildLivePreviewAsciidocDecorations(state);
      expect(decos.size).toBeGreaterThan(0);

      const widgets: string[] = [];
      const lines: string[] = [];

      const iter = decos.iter();
      while (iter.value) {
        if (iter.value.spec.widget instanceof CalloutHeaderWidget) {
          widgets.push(`callout:${iter.value.spec.widget.type}`);
        } else if (iter.value.spec.widget instanceof AnchorChipWidget) {
          widgets.push(`anchor:${iter.value.spec.widget.name}`);
        } else if (iter.value.spec.widget instanceof WikilinkWidget) {
          widgets.push(`link:${iter.value.spec.widget.target}`);
        }

        if (iter.value.spec.class && iter.from === iter.to) {
          lines.push(iter.value.spec.class);
        }
        iter.next();
      }

      expect(lines).toContain('cm-heading-1');
      expect(lines).toContain('cm-heading-2');
      expect(lines.some((l) => l.includes('cm-callout-line'))).toBe(true);

      expect(widgets).toContain('callout:note');
      expect(widgets).toContain('anchor:sec-two');
      expect(widgets).toContain('link:quantum-state-collapse.typ');
      expect(widgets).toContain('link:cairn-roadmap');
    });
  });
});
