import { promises as fs } from 'fs';
import path from 'path';
import { dialog } from 'electron';
import katex from 'katex';
import { resolveInsideVault } from '../vault/paths';

/**
 * Converts markdown string with KaTeX math and formatting into an HTML body snippet.
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // 1. Math formulas: display math $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    try {
      return `<div class="math-display">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<pre class="math-error">$$${math}$$</pre>`;
    }
  });

  // Inline math $...$ (avoiding \$)
  html = html.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (_match, prefix, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      return `${prefix}<span class="math-inline">${rendered}</span>`;
    } catch {
      return `${prefix}<code>$${math}$</code>`;
    }
  });

  // 2. Fenced code blocks ```lang ... ```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre><code>${escaped}</code></pre>`;
  });

  // Inline code `...`
  html = html.replace(/`([^`\n]+)`/g, (_match, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<code>${escaped}</code>`;
  });

  // 3. Headings
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 4. Horizontal rules
  html = html.replace(/^\s{0,3}(?:---|\*\*\*|___)\s*$/gim, '<hr />');

  // 5. Tasks and lists
  html = html.replace(/^- \[x\] (.*$)/gim, '<li class="task-done"><input type="checkbox" checked disabled /> $1</li>');
  html = html.replace(/^- \[ \] (.*$)/gim, '<li class="task-todo"><input type="checkbox" disabled /> $1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

  // 6. Inline styles: bold, italic, highlights, strikethrough
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 7. Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // 8. Wikilinks [[note|alias]] or [[note]]
  html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => {
    return `<span class="wikilink">${alias || target}</span>`;
  });

  // 9. Tables: | Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |
  html = html.replace(/(?:(?:^|\n)\|[^\n]+\|\r?\n\|[\s:|-]+\|\r?\n(?:\|[^\n]+\|\r?\n?)+)/g, (tableText) => {
    const rows = tableText.trim().split(/\r?\n/);
    if (rows.length < 2) return tableText;
    const headerRow = rows[0];
    const bodyRows = rows.slice(2);
    if (!headerRow) return tableText;

    const parseCells = (row: string) => row.split('|').slice(1, -1).map((c) => c.trim());
    const ths = parseCells(headerRow).map((c) => `<th>${c}</th>`).join('');
    const trs = bodyRows
      .map((row) => {
        const tds = parseCells(row).map((c) => `<td>${c}</td>`).join('');
        return `<tr>${tds}</tr>`;
      })
      .join('');

    return `\n<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>\n`;
  });

  // Paragraph wrapping for loose lines
  const lines = html.split('\n\n');
  return lines
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<div') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<table') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<li')
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Wraps converted HTML content in a self-contained, standalone HTML document.
 */
export function generateStandaloneHtml(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #18181b;
      --text-muted: #71717a;
      --accent: #4f46e5;
      --code-bg: #f4f4f5;
      --border: #e4e4e7;
      --radius: 6px;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #121214;
        --text: #f4f4f5;
        --text-muted: #a1a1aa;
        --accent: #6366f1;
        --code-bg: #18181b;
        --border: #27272a;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.68;
      color: var(--text);
      background-color: var(--bg);
      max-width: 760px;
      margin: 40px auto;
      padding: 0 24px;
    }
    h1, h2, h3, h4, h5, h6 {
      color: var(--text);
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      line-height: 1.3;
    }
    h1 { border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    p { margin: 1em 0; }
    code {
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 0.88em;
      background-color: var(--code-bg);
      padding: 2px 6px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }
    pre {
      background-color: var(--code-bg);
      padding: 14px 16px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
      border: none;
    }
    blockquote {
      border-left: 3px solid var(--accent);
      margin: 1.2em 0;
      padding-left: 16px;
      color: var(--text-muted);
    }
    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 2em 0;
    }
    ul, ol { padding-left: 24px; }
    li { margin: 0.3em 0; }
    li.task-done, li.task-todo { list-style: none; margin-left: -20px; }
    mark {
      background-color: rgba(245, 158, 11, 0.25);
      color: inherit;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .math-display {
      margin: 1.2em 0;
      overflow-x: auto;
      text-align: center;
    }
    .wikilink {
      color: var(--accent);
      font-weight: 500;
      text-decoration: underline;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1.5em 0;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: var(--code-bg);
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

/**
 * Exports note content to a standalone HTML file.
 */
export async function exportNoteToHtml(
  vaultRoot: string,
  relativePath: string,
  explicitDestination?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const fullPath = resolveInsideVault(vaultRoot, relativePath);
    const rawContent = await fs.readFile(fullPath, 'utf-8');
    const noteName = path.basename(relativePath, path.extname(relativePath));

    let targetPath = explicitDestination;
    if (!targetPath) {
      const dialogRes = await dialog.showSaveDialog({
        title: 'Export Note to HTML',
        defaultPath: `${noteName}.html`,
        filters: [{ name: 'HTML Document', extensions: ['html'] }]
      });
      if (dialogRes.canceled || !dialogRes.filePath) {
        return { success: false };
      }
      targetPath = dialogRes.filePath;
    }

    const bodyHtml = markdownToHtml(rawContent);
    const fullHtml = generateStandaloneHtml(noteName, bodyHtml);
    await fs.writeFile(targetPath, fullHtml, 'utf-8');
    return { success: true, filePath: targetPath };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Exports note content to a clean Markdown file.
 */
export async function exportNoteToMarkdown(
  vaultRoot: string,
  relativePath: string,
  explicitDestination?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const fullPath = resolveInsideVault(vaultRoot, relativePath);
    const rawContent = await fs.readFile(fullPath, 'utf-8');
    const noteName = path.basename(relativePath);

    let targetPath = explicitDestination;
    if (!targetPath) {
      const dialogRes = await dialog.showSaveDialog({
        title: 'Export Note to Markdown',
        defaultPath: noteName,
        filters: [{ name: 'Markdown File', extensions: ['md', 'markdown'] }]
      });
      if (dialogRes.canceled || !dialogRes.filePath) {
        return { success: false };
      }
      targetPath = dialogRes.filePath;
    }

    await fs.writeFile(targetPath, rawContent, 'utf-8');
    return { success: true, filePath: targetPath };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
