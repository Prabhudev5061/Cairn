import { useEffect, useRef } from 'react';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { Compartment, EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers
} from '@codemirror/view';
import { useLayoutStore } from '../../stores/layoutStore';
import { useVaultStore } from '../../stores/vaultStore';
import { cairnAutocomplete } from './autocomplete/provider';
import { getLanguageExtensionsForPath } from './languages';
import { attachVimModeListener, createVimExtension } from './vim/extension';

const cairnDarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-primary)',
      height: '100%',
      fontSize: '14px',
      fontFamily: 'var(--font-mono)'
    },
    '.cm-content': {
      caretColor: 'var(--accent-primary)',
      fontFamily: 'var(--font-sans)',
      lineHeight: 'var(--line-height-editor)',
      padding: '28px 40px',
      minHeight: '100%'
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--accent-primary)',
      borderLeftWidth: '2px'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--accent-subtle) !important'
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-faint)',
      border: 'none',
      borderRight: '1px solid var(--border-subtle)',
      paddingRight: '12px'
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.02)'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)'
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit'
    }
  },
  { dark: true }
);

export function CodeMirrorEditor() {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vimCompartmentRef = useRef(new Compartment());

  const activeNotePath = useVaultStore((s) => s.activeNotePath);
  const activeNoteContent = useVaultStore((s) => s.activeNoteContent);
  const isDirty = useVaultStore((s) => s.isDirty);

  const isVimMode = useLayoutStore((s) => s.isVimMode);
  const setVimMode = useLayoutStore((s) => s.setVimMode);

  // Initialize CodeMirror view
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
          }
          void useVaultStore.getState().saveActiveNote();
          return true;
        }
      }
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      // Handle cursor position updates
      if (update.selectionSet || update.docChanged) {
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        useVaultStore.getState().setCursorPosition(line.number, head - line.from + 1);
      }

      // Handle document changes
      if (update.docChanged) {
        const newText = update.state.doc.toString();
        useVaultStore.getState().updateContent(newText);

        // 1-second debounce autosave
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
        }
        autosaveTimerRef.current = setTimeout(() => {
          void useVaultStore.getState().saveActiveNote();
        }, 1000);
      }
    });

    const initialDoc = useVaultStore.getState().activeNoteContent;

    const startState = EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        ...getLanguageExtensionsForPath(activeNotePath),
        cairnAutocomplete(),
        vimCompartmentRef.current.of(useLayoutStore.getState().isVimMode ? createVimExtension() : []),
        EditorView.lineWrapping,
        cairnDarkTheme,
        saveKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener
      ]
    });

    const view = new EditorView({
      state: startState,
      parent: editorContainerRef.current
    });

    viewRef.current = view;

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      view.destroy();
      viewRef.current = null;
    };
  }, [activeNotePath]); // Re-create on note switch


  // React to Vim mode toggle dynamically via Compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: vimCompartmentRef.current.reconfigure(isVimMode ? createVimExtension() : [])
    });

    if (isVimMode) {
      setVimMode('NORMAL');
      const unbind = attachVimModeListener(view, setVimMode);
      return () => unbind();
    } else {
      setVimMode('NORMAL');
      return undefined;
    }
  }, [isVimMode, setVimMode]);

  // Sync content if modified externally (e.g. reloaded from disk)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== activeNoteContent && !isDirty) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: activeNoteContent }
      });
    }
  }, [activeNoteContent, isDirty]);

  return (
    <div
      ref={editorContainerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
      data-testid="codemirror-editor"
    />
  );
}
