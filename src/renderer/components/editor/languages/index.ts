import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import type { Extension } from '@codemirror/state';
import { GFM, Table } from '@lezer/markdown';
import { getFormatPlugin } from '../../../../shared/formats/registry';
import type { NoteFormatId } from '../../../../shared/formats/types';
import { livePreviewAsciidocPlugin } from '../livePreview/livePreviewAsciidoc';
import { livePreviewOrgPlugin } from '../livePreview/livePreviewOrg';
import { livePreviewTypstPlugin } from '../livePreview/livePreviewTypst';
import { livePreviewPlugin } from '../livePreview/plugin';
import { asciidocLanguage } from './asciidoc';
import { orgLanguage } from './org';
import { typstLanguage } from './typst';

/**
 * Returns the appropriate CodeMirror extensions (syntax mode, parser, and live preview)
 * for the requested note format.
 */
export function getLanguageExtensionsForFormat(format: NoteFormatId): Extension[] {
  switch (format) {
    case 'org':
      return [orgLanguage, livePreviewOrgPlugin];
    case 'typst':
      return [typstLanguage, livePreviewTypstPlugin];
    case 'asciidoc':
      return [asciidocLanguage, livePreviewAsciidocPlugin];
    case 'markdown':
    default:
      return [markdown({ extensions: [GFM, Table], codeLanguages: languages }), livePreviewPlugin];
  }
}

/**
 * Convenience helper to determine language extensions directly from note path.
 */
export function getLanguageExtensionsForPath(notePath: string | null): Extension[] {
  if (!notePath) {
    return getLanguageExtensionsForFormat('markdown');
  }
  const plugin = getFormatPlugin(notePath);
  return getLanguageExtensionsForFormat(plugin.id);
}
