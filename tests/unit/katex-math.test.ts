import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { findMathRanges } from '../../src/renderer/components/editor/math/parser';

describe('KaTeX math parsing & rendering', () => {
  it('parses inline math expressions correctly', () => {
    const text = 'This is $E = mc^2$ and here is $a^2 + b^2 = c^2$.';
    const ranges = findMathRanges(text);

    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toEqual({
      from: 8,
      to: 18,
      math: 'E = mc^2',
      isBlock: false
    });
    expect(ranges[1]).toEqual({
      from: 31,
      to: 48,
      math: 'a^2 + b^2 = c^2',
      isBlock: false
    });
  });

  it('parses block display math correctly', () => {
    const text = '$$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$';
    const ranges = findMathRanges(text);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]?.isBlock).toBe(true);
    expect(ranges[0]?.math).toBe('\\sum_{i=1}^n i = \\frac{n(n+1)}{2}');
    expect(ranges[0]?.from).toBe(0);
    expect(ranges[0]?.to).toBe(text.length);
  });

  it('parses multi-line block display math correctly', () => {
    const text = '$$\n\\int_a^b f(x) dx\n$$';
    const ranges = findMathRanges(text);

    expect(ranges).toHaveLength(1);
    expect(ranges[0]?.isBlock).toBe(true);
    expect(ranges[0]?.math).toBe('\\int_a^b f(x) dx');
  });

  it('ignores escaped dollar signs and currency', () => {
    const text = 'I paid \\$50 for lunch and \\$20 for coffee.';
    const ranges = findMathRanges(text);
    expect(ranges).toHaveLength(0);
  });

  it('renders inline math with KaTeX without throwing', () => {
    const html = katex.renderToString('E = mc^2', {
      displayMode: false,
      throwOnError: false
    });
    expect(html).toContain('katex');
    expect(html).toContain('annotation');
    expect(html).toContain('E = mc^2');
  });

  it('renders block math with KaTeX in display mode', () => {
    const html = katex.renderToString('\\frac{a}{b}', {
      displayMode: true,
      throwOnError: false
    });
    expect(html).toContain('katex-display');
    expect(html).toContain('mfrac');
  });

  it('gracefully handles invalid LaTeX without throwing an uncaught exception', () => {
    expect(() => {
      const html = katex.renderToString('\\invalidCommand123{', {
        displayMode: false,
        throwOnError: false
      });
      expect(html).toContain('katex-error');
    }).not.toThrow();
  });
});
