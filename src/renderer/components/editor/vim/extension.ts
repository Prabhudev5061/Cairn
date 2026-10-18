import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { getCM, vim } from '@replit/codemirror-vim';
import { initVimCommands } from './init';

export function createVimExtension(): Extension {
  initVimCommands();
  return vim();
}

export function attachVimModeListener(
  view: EditorView,
  onModeChange: (mode: string) => void
): () => void {
  const cm = getCM(view);
  if (!cm) {
    return () => {};
  }

  const handler = (e: { mode: string; subMode?: string }) => {
    let modeName = (e.mode || 'NORMAL').toUpperCase();
    if (e.subMode === 'linewise') {
      modeName = 'V-LINE';
    } else if (e.subMode === 'blockwise') {
      modeName = 'V-BLOCK';
    }
    onModeChange(modeName);
  };

  cm.on('vim-mode-change', handler);

  return () => {
    try {
      cm.off('vim-mode-change', handler);
    } catch {
      // Ignore cleanup error if editor already destroyed
    }
  };
}
