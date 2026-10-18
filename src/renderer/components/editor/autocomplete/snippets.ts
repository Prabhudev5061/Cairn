import { Completion, snippetCompletion } from '@codemirror/autocomplete';

export const MARKDOWN_SNIPPETS: Completion[] = [
  snippetCompletion('$$\n${1:formula}\n$$', {
    label: '$$',
    detail: 'Display math block',
    type: 'snippet'
  }),
  snippetCompletion(
    '| ${1:Header 1} | ${2:Header 2} |\n| --- | --- |\n| ${3:Item 1} | ${4:Item 2} |',
    {
      label: 'table',
      detail: 'Markdown table',
      type: 'snippet'
    }
  ),
  snippetCompletion('- [ ] ${1:Task}', {
    label: 'task',
    detail: 'Task list item',
    type: 'snippet'
  }),
  snippetCompletion('> [!${1:note}] ${2:Title}\n> ${3:Content}', {
    label: 'callout',
    detail: 'Obsidian callout block',
    type: 'snippet'
  }),
  snippetCompletion('```${1:typescript}\n${2}\n```', {
    label: 'codeblock',
    detail: 'Fenced code block',
    type: 'snippet'
  })
];
