import { Completion, snippetCompletion } from '@codemirror/autocomplete';

export const LATEX_COMPLETIONS: Completion[] = [
  // Common math constructs & functions
  snippetCompletion('\\frac{${1:num}}{${2:den}}', {
    label: '\\frac',
    detail: 'fraction',
    type: 'function'
  }),
  snippetCompletion('\\sqrt{${1:x}}', {
    label: '\\sqrt',
    detail: 'square root',
    type: 'function'
  }),
  snippetCompletion('\\sqrt[${1:n}]{${2:x}}', {
    label: '\\sqrt[n]',
    detail: 'n-th root',
    type: 'function'
  }),
  snippetCompletion('\\binom{${1:n}}{${2:k}}', {
    label: '\\binom',
    detail: 'binomial coefficient',
    type: 'function'
  }),
  snippetCompletion('\\sum_{${1:i=1}}^{${2:n}}', {
    label: '\\sum',
    detail: 'summation',
    type: 'keyword'
  }),
  snippetCompletion('\\prod_{${1:i=1}}^{${2:n}}', {
    label: '\\prod',
    detail: 'product',
    type: 'keyword'
  }),
  snippetCompletion('\\int_{${1:a}}^{${2:b}}', {
    label: '\\int',
    detail: 'integral',
    type: 'keyword'
  }),
  snippetCompletion('\\iint', {
    label: '\\iint',
    detail: 'double integral',
    type: 'keyword'
  }),
  snippetCompletion('\\oint', {
    label: '\\oint',
    detail: 'contour integral',
    type: 'keyword'
  }),
  snippetCompletion('\\lim_{${1:x \\to \\infty}}', {
    label: '\\lim',
    detail: 'limit',
    type: 'keyword'
  }),

  // Font and styling
  snippetCompletion('\\mathbb{${1:R}}', {
    label: '\\mathbb',
    detail: 'blackboard bold',
    type: 'type'
  }),
  snippetCompletion('\\mathbf{${1:x}}', {
    label: '\\mathbf',
    detail: 'bold font',
    type: 'type'
  }),
  snippetCompletion('\\mathcal{${1:O}}', {
    label: '\\mathcal',
    detail: 'calligraphic font',
    type: 'type'
  }),
  snippetCompletion('\\text{${1:text}}', {
    label: '\\text',
    detail: 'plain text',
    type: 'type'
  }),
  snippetCompletion('\\mathrm{${1:text}}', {
    label: '\\mathrm',
    detail: 'roman font',
    type: 'type'
  }),

  // Symbols & Operators
  { label: '\\partial', detail: 'partial derivative', type: 'variable' },
  { label: '\\nabla', detail: 'del / nabla', type: 'variable' },
  { label: '\\infty', detail: 'infinity', type: 'variable' },
  { label: '\\times', detail: 'multiplication sign', type: 'operator' },
  { label: '\\cdot', detail: 'dot operator', type: 'operator' },
  { label: '\\pm', detail: 'plus-minus', type: 'operator' },
  { label: '\\mp', detail: 'minus-plus', type: 'operator' },
  { label: '\\leq', detail: 'less than or equal', type: 'operator' },
  { label: '\\geq', detail: 'greater than or equal', type: 'operator' },
  { label: '\\neq', detail: 'not equal', type: 'operator' },
  { label: '\\approx', detail: 'approximately equal', type: 'operator' },
  { label: '\\equiv', detail: 'equivalent', type: 'operator' },
  { label: '\\in', detail: 'element of', type: 'operator' },
  { label: '\\notin', detail: 'not element of', type: 'operator' },
  { label: '\\subset', detail: 'subset', type: 'operator' },
  { label: '\\subseteq', detail: 'subset or equal', type: 'operator' },
  { label: '\\forall', detail: 'for all', type: 'keyword' },
  { label: '\\exists', detail: 'there exists', type: 'keyword' },
  { label: '\\emptyset', detail: 'empty set', type: 'variable' },
  { label: '\\cap', detail: 'intersection', type: 'operator' },
  { label: '\\cup', detail: 'union', type: 'operator' },
  { label: '\\to', detail: 'right arrow', type: 'operator' },
  { label: '\\implies', detail: 'implies', type: 'operator' },
  { label: '\\iff', detail: 'if and only if', type: 'operator' },

  // Greek letters
  { label: '\\alpha', detail: 'Greek alpha', type: 'variable' },
  { label: '\\beta', detail: 'Greek beta', type: 'variable' },
  { label: '\\gamma', detail: 'Greek gamma', type: 'variable' },
  { label: '\\delta', detail: 'Greek delta', type: 'variable' },
  { label: '\\epsilon', detail: 'Greek epsilon', type: 'variable' },
  { label: '\\theta', detail: 'Greek theta', type: 'variable' },
  { label: '\\lambda', detail: 'Greek lambda', type: 'variable' },
  { label: '\\mu', detail: 'Greek mu', type: 'variable' },
  { label: '\\pi', detail: 'Greek pi', type: 'variable' },
  { label: '\\sigma', detail: 'Greek sigma', type: 'variable' },
  { label: '\\tau', detail: 'Greek tau', type: 'variable' },
  { label: '\\phi', detail: 'Greek phi', type: 'variable' },
  { label: '\\omega', detail: 'Greek omega', type: 'variable' },
  { label: '\\Gamma', detail: 'Capital Gamma', type: 'variable' },
  { label: '\\Delta', detail: 'Capital Delta', type: 'variable' },
  { label: '\\Theta', detail: 'Capital Theta', type: 'variable' },
  { label: '\\Lambda', detail: 'Capital Lambda', type: 'variable' },
  { label: '\\Sigma', detail: 'Capital Sigma', type: 'variable' },
  { label: '\\Phi', detail: 'Capital Phi', type: 'variable' },
  { label: '\\Omega', detail: 'Capital Omega', type: 'variable' },

  // Environments
  snippetCompletion('\\begin{matrix}\n${1}\n\\end{matrix}', {
    label: '\\begin{matrix}',
    detail: 'matrix environment',
    type: 'class'
  }),
  snippetCompletion('\\begin{pmatrix}\n${1}\n\\end{pmatrix}', {
    label: '\\begin{pmatrix}',
    detail: 'parenthesized matrix',
    type: 'class'
  }),
  snippetCompletion('\\begin{bmatrix}\n${1}\n\\end{bmatrix}', {
    label: '\\begin{bmatrix}',
    detail: 'bracketed matrix',
    type: 'class'
  }),
  snippetCompletion('\\begin{cases}\n${1}\n\\end{cases}', {
    label: '\\begin{cases}',
    detail: 'piecewise cases',
    type: 'class'
  }),
  snippetCompletion('\\begin{aligned}\n${1}\n\\end{aligned}', {
    label: '\\begin{aligned}',
    detail: 'aligned equations',
    type: 'class'
  })
];
