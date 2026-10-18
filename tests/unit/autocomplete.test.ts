import { describe, expect, it } from 'vitest';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import {
  cairnCompletionSource,
  isPositionInsideMath
} from '../../src/renderer/components/editor/autocomplete/provider';

describe('Cairn context-aware autocomplete', () => {
  it('identifies positions inside inline and block math correctly', () => {
    const doc = 'Intro text $E = mc^2$ and more text $$\n\\sum x\n$$ end.';
    // Position 15 is inside '$E = mc^2$' (which is 11..21)
    expect(isPositionInsideMath(doc, 15)).toBe(true);

    // Position 4 is in 'Intro'
    expect(isPositionInsideMath(doc, 4)).toBe(false);

    // Position 43 is inside block math
    expect(isPositionInsideMath(doc, 43)).toBe(true);

    // Position 52 is in 'end.'
    expect(isPositionInsideMath(doc, 52)).toBe(false);
  });

  it('provides LaTeX completions when typing backslash inside math', async () => {
    const doc = '$x + \\f$';
    const state = EditorState.create({ doc });
    // Cursor right after '\f' (index 7)
    const context = new CompletionContext(state, 7, false);
    const result = await cairnCompletionSource(context);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.options.some((opt) => opt.label === '\\frac')).toBe(true);
      expect(result.options.some((opt) => opt.label === '\\sqrt')).toBe(true);
    }
  });

  it('does not trigger LaTeX completions when typing backslash outside math', async () => {
    const doc = 'Normal text \\f outside math';
    const state = EditorState.create({ doc });
    const context = new CompletionContext(state, 14, false);
    const result = await cairnCompletionSource(context);

    expect(result).toBeNull();
  });

  it('provides Obsidian callout completions when typing > [!', async () => {
    const doc = '> [!no';
    const state = EditorState.create({ doc });
    const context = new CompletionContext(state, 6, false);
    const result = await cairnCompletionSource(context);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.options.some((opt) => opt.label === '[!note]')).toBe(true);
      expect(result.options.some((opt) => opt.label === '[!warning]')).toBe(true);
    }
  });

  it('provides markdown snippets when typing trigger keywords', async () => {
    const doc = 'table';
    const state = EditorState.create({ doc });
    const context = new CompletionContext(state, 5, false);
    const result = await cairnCompletionSource(context);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.options.some((opt) => opt.label === 'table')).toBe(true);
    }
  });
});

