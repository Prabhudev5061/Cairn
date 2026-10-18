import { Completion, snippetCompletion } from '@codemirror/autocomplete';

export const CALLOUT_COMPLETIONS: Completion[] = [
  snippetCompletion('[!note] ${1:Title}\n> ${2:Content}', {
    label: '[!note]',
    detail: 'Standard note callout',
    type: 'keyword'
  }),
  snippetCompletion('[!tip] ${1:Title}\n> ${2:Content}', {
    label: '[!tip]',
    detail: 'Helpful tip or advice',
    type: 'keyword'
  }),
  snippetCompletion('[!info] ${1:Title}\n> ${2:Content}', {
    label: '[!info]',
    detail: 'Informational callout',
    type: 'keyword'
  }),
  snippetCompletion('[!warning] ${1:Title}\n> ${2:Content}', {
    label: '[!warning]',
    detail: 'Warning callout',
    type: 'keyword'
  }),
  snippetCompletion('[!important] ${1:Title}\n> ${2:Content}', {
    label: '[!important]',
    detail: 'High priority alert',
    type: 'keyword'
  }),
  snippetCompletion('[!caution] ${1:Title}\n> ${2:Content}', {
    label: '[!caution]',
    detail: 'Caution or risk alert',
    type: 'keyword'
  }),
  snippetCompletion('[!danger] ${1:Title}\n> ${2:Content}', {
    label: '[!danger]',
    detail: 'Critical hazard or error',
    type: 'keyword'
  }),
  snippetCompletion('[!success] ${1:Title}\n> ${2:Content}', {
    label: '[!success]',
    detail: 'Success confirmation',
    type: 'keyword'
  }),
  snippetCompletion('[!question] ${1:Title}\n> ${2:Content}', {
    label: '[!question]',
    detail: 'Question or FAQ item',
    type: 'keyword'
  }),
  snippetCompletion('[!todo] ${1:Title}\n> ${2:Content}', {
    label: '[!todo]',
    detail: 'To-do item or task list',
    type: 'keyword'
  }),
  snippetCompletion('[!abstract] ${1:Title}\n> ${2:Content}', {
    label: '[!abstract]',
    detail: 'Abstract or summary',
    type: 'keyword'
  }),
  snippetCompletion('[!example] ${1:Title}\n> ${2:Content}', {
    label: '[!example]',
    detail: 'Worked example or sample',
    type: 'keyword'
  }),
  snippetCompletion('[!quote] ${1:Title}\n> ${2:Content}', {
    label: '[!quote]',
    detail: 'Citation or quote block',
    type: 'keyword'
  }),
  snippetCompletion('[!bug] ${1:Title}\n> ${2:Content}', {
    label: '[!bug]',
    detail: 'Bug or known issue report',
    type: 'keyword'
  })
];
