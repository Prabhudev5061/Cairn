import { asciidocPlugin } from './format-asciidoc';
import { markdownPlugin } from './format-markdown';
import { orgPlugin } from './format-org';
import { typstPlugin } from './format-typst';
import type { FormatPlugin, NoteFormatId } from './types';

export const ALL_FORMAT_PLUGINS: FormatPlugin[] = [
  markdownPlugin,
  orgPlugin,
  typstPlugin,
  asciidocPlugin
];

const EXTENSION_MAP = new Map<string, FormatPlugin>();
for (const plugin of ALL_FORMAT_PLUGINS) {
  for (const ext of plugin.extensions) {
    EXTENSION_MAP.set(ext.toLowerCase(), plugin);
  }
}

/**
 * Returns the format plugin appropriate for the given file path based on its extension.
 * Defaults to the Markdown plugin if not matched.
 */
export function getFormatPlugin(filePath: string): FormatPlugin {
  if (!filePath) return markdownPlugin;
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return markdownPlugin;

  const ext = filePath.slice(dotIndex).toLowerCase();
  return EXTENSION_MAP.get(ext) || markdownPlugin;
}

export const getFormatForPath = getFormatPlugin;

/**
 * Returns a list of all supported file extensions (with leading dot).
 */
export function getSupportedExtensions(): string[] {
  return Array.from(EXTENSION_MAP.keys());
}

/**
 * Checks whether the given file path has a supported note extension.
 */
export function isSupportedNotePath(filePath: string): boolean {
  if (!filePath) return false;
  const dotIndex = filePath.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ext = filePath.slice(dotIndex).toLowerCase();
  return EXTENSION_MAP.has(ext);
}

/**
 * Strips any supported note extension from a file path or filename.
 */
export function stripNoteExtension(filePath: string): string {
  if (!filePath) return '';
  for (const ext of EXTENSION_MAP.keys()) {
    if (filePath.toLowerCase().endsWith(ext)) {
      return filePath.slice(0, -ext.length);
    }
  }
  return filePath;
}

/**
 * Returns the format plugin by its ID.
 */
export function getFormatPluginById(id: NoteFormatId): FormatPlugin {
  return ALL_FORMAT_PLUGINS.find((p) => p.id === id) || markdownPlugin;
}
