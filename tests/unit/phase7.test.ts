import { describe, expect, it } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { expandTemplate, STARTER_TEMPLATES } from '../../src/shared/templates/expander';
import { resolveInsideVault } from '../../src/main/vault/paths';
import { renderKatexMemoized } from '../../src/renderer/components/editor/math/widget';
import { exportNoteToHtml, exportNoteToMarkdown } from '../../src/main/export/exporter';

describe('Phase 7 Unit Tests', () => {
  describe('Template Expander', () => {
    it('replaces standard variables {{title}}, {{date}}, {{time}}, and {{datetime}}', () => {
      const fixedDate = new Date(2026, 9, 18, 14, 30, 0); // Oct 18, 2026 14:30
      const template = '# {{title}}\nDate: {{date}}\nTime: {{time}}\nCreated: {{datetime}}';
      const output = expandTemplate(template, {
        title: 'Project Kickoff',
        now: fixedDate
      });

      expect(output).toContain('# Project Kickoff');
      expect(output).toContain('Date: 2026-10-18');
      expect(output).toContain('Time: 14:30');
      expect(output).toContain('Created: 2026-10-18 14:30');
    });

    it('supports custom date formatting tags {{date:YYYY/MM/DD}} and date parts', () => {
      const fixedDate = new Date(2026, 0, 5, 9, 5); // Jan 05, 2026 09:05
      const template = 'Year: {{date:YYYY}}, Month: {{date:MM}}, Day: {{date:DD}}';
      const output = expandTemplate(template, { now: fixedDate });

      expect(output).toBe('Year: 2026, Month: 01, Day: 05');
    });

    it('expands custom context variables', () => {
      const template = 'Author: {{author}}\nVersion: {{version}}';
      const output = expandTemplate(template, {
        vars: { author: 'Ada Lovelace', version: '1.0.0' }
      });

      expect(output).toBe('Author: Ada Lovelace\nVersion: 1.0.0');
    });

    it('starter templates have valid definitions', () => {
      expect(STARTER_TEMPLATES.length).toBeGreaterThanOrEqual(3);
      for (const tmpl of STARTER_TEMPLATES) {
        expect(tmpl.id).toBeTruthy();
        expect(tmpl.name).toBeTruthy();
        expect(tmpl.content).toBeTruthy();
        const expanded = expandTemplate(tmpl.content, { title: 'Test Note' });
        expect(expanded).toContain('Test Note');
      }
    });
  });

  describe('Security Hardening & Path Validation', () => {
    const tempVault = fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-p7-vault-'));

    it('rejects Windows reserved device names in filenames', () => {
      const reservedNames = ['con.md', 'PRN.txt', 'aux.md', 'nul', 'com1.md', 'COM9.markdown', 'lpt1.md'];
      for (const name of reservedNames) {
        expect(() => resolveInsideVault(tempVault, name)).toThrowError(/reserved device name/i);
        expect(() => resolveInsideVault(tempVault, `folder/${name}`)).toThrowError(/reserved device name/i);
      }
    });

    it('accepts valid non-reserved filenames that start with reserved substrings', () => {
      const validNames = ['contact.md', 'pronto.md', 'auxiliary.md', 'nullify.md', 'communication.md'];
      for (const name of validNames) {
        expect(() => resolveInsideVault(tempVault, name)).not.toThrow();
      }
    });

    it('normalizes Unicode characters to NFC format', () => {
      // Decomposed "e" + combining acute accent (\u0065\u0301) vs composed "é" (\u00E9)
      const decomposed = 'cafe\u0301.md';
      const resolved = resolveInsideVault(tempVault, decomposed);
      expect(resolved).toBe(path.join(fs.realpathSync(tempVault), 'café.md'));
    });
  });

  describe('Performance: KaTeX Render Memoization', () => {
    it('renders and memoizes math formulas', () => {
      const math = '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}';
      const rendered1 = renderKatexMemoized(math, true);
      expect(rendered1).toContain('katex');

      // Repeated render returns same memoized result
      const rendered2 = renderKatexMemoized(math, true);
      expect(rendered2).toBe(rendered1);
    });

    it('handles syntax errors gracefully without throwing', () => {
      const invalidMath = '\\frac{unclosed';
      expect(() => renderKatexMemoized(invalidMath, false)).not.toThrow();
    });
  });

  describe('Export to HTML & Markdown', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cairn-p7-export-'));
    const sampleVault = path.join(tempDir, 'vault');
    fs.mkdirSync(sampleVault, { recursive: true });

    const notePath = path.join(sampleVault, 'Physics.md');
    fs.writeFileSync(
      notePath,
      '---\ntitle: Quantum Note\nauthor: Cairn\n---\n\n# Quantum Mechanics\n\nInline math: $E = mc^2$\n\n$$\\psi(x) = A e^{ikx}$$\n\n| Item | Value |\n|---|---|\n| Speed of light | 299792458 |\n\n```python\nprint("Hello Cairn")\n```\n',
      'utf8'
    );

    it('exports note to standalone HTML with embedded styling and KaTeX math', async () => {
      const htmlDest = path.join(tempDir, 'Physics.html');
      const res = await exportNoteToHtml(sampleVault, 'Physics.md', htmlDest);
      expect(res.success).toBe(true);

      const htmlContent = fs.readFileSync(htmlDest, 'utf8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<title>Physics</title>');
      expect(htmlContent).toContain('<style>');
      expect(htmlContent).toContain('class="katex"');
      expect(htmlContent).toContain('<table>');
      expect(htmlContent).toContain('print("Hello Cairn")');
    });

    it('exports note to standalone Markdown preserving frontmatter and structure', async () => {
      const mdDest = path.join(tempDir, 'Physics-Export.md');
      const res = await exportNoteToMarkdown(sampleVault, 'Physics.md', mdDest);
      expect(res.success).toBe(true);

      const mdContent = fs.readFileSync(mdDest, 'utf8');
      expect(mdContent).toContain('title: Quantum Note');
      expect(mdContent).toContain('# Quantum Mechanics');
      expect(mdContent).toContain('$E = mc^2$');
    });
  });
});
