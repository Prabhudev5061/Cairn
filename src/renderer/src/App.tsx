import { useEffect } from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import { commandRegistry } from '../commands/registry';
import { AppLayout } from '../components/shell/AppLayout';
import { CloudSyncModal } from '../components/modal/CloudSyncModal';
import { VaultSwitcherModal } from '../components/modal/VaultSwitcherModal';
import { CommandPaletteModal } from '../components/modal/CommandPaletteModal';
import { TemplatePickerModal } from '../components/modal/TemplatePickerModal';
import { useLayoutStore } from '../stores/layoutStore';
import { useSyncStore } from '../stores/syncStore';
import { useVaultStore } from '../stores/vaultStore';
import { useThemeStore } from '../stores/themeStore';
import { openOrCreateDailyNote, openPreviousDailyNote, openNextDailyNote } from '../stores/dailyNotes';
import { exportNoteHtml, exportNoteMarkdown } from '../ipc';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { formatRelativeTime } from '@shared/ipc';
import '../styles/global.css';

export function App() {
  const currentVault = useVaultStore((s) => s.currentVault);
  const recentVaults = useVaultStore((s) => s.recentVaults);
  const openVaultDialog = useVaultStore((s) => s.openVaultDialog);
  const openRecentVault = useVaultStore((s) => s.openRecentVault);
  const setVaultSwitcherOpen = useVaultStore((s) => s.setVaultSwitcherOpen);
  const saveActiveNote = useVaultStore((s) => s.saveActiveNote);
  const initVault = useVaultStore((s) => s.init);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const toggleRightPanel = useLayoutStore((s) => s.toggleRightPanel);
  const toggleVimMode = useLayoutStore((s) => s.toggleVimMode);
  const toggleGlobalGraph = useLayoutStore((s) => s.toggleGlobalGraph);
  const openCommandPalette = useLayoutStore((s) => s.openCommandPalette);
  const openTemplatePicker = useLayoutStore((s) => s.openTemplatePicker);

  useEffect(() => {
    // Register commands
    const unregPalette = commandRegistry.register({
      id: 'command-palette:open',
      title: 'Open Command Palette',
      keys: 'Mod+p',
      category: 'Navigation',
      run: () => openCommandPalette()
    });

    const unregOpen = commandRegistry.register({
      id: 'vault:open',
      title: 'Open Vault',
      keys: 'Mod+o',
      category: 'Vault',
      run: () => void openVaultDialog()
    });

    const unregSwitchVault = commandRegistry.register({
      id: 'vault:switch',
      title: 'Switch Vault',
      keys: 'Mod+Shift+o',
      category: 'Vault',
      run: () => setVaultSwitcherOpen(true)
    });

    const unregSave = commandRegistry.register({
      id: 'note:save',
      title: 'Save Note',
      keys: 'Mod+s',
      category: 'Editor',
      run: () => void saveActiveNote()
    });

    const unregSidebar = commandRegistry.register({
      id: 'sidebar:toggle',
      title: 'Toggle Sidebar',
      keys: 'Mod+b',
      category: 'View',
      run: () => toggleSidebar()
    });

    const unregRightPanel = commandRegistry.register({
      id: 'right-panel:toggle',
      title: 'Toggle Right Panel',
      keys: 'Mod+Shift+b',
      category: 'View',
      run: () => toggleRightPanel()
    });

    const unregVim = commandRegistry.register({
      id: 'editor:toggle-vim',
      title: 'Toggle Vim Mode',
      keys: 'Mod+Shift+v',
      category: 'Editor',
      run: () => toggleVimMode()
    });

    const unregGraph = commandRegistry.register({
      id: 'graph:toggle',
      title: 'Toggle Global Graph',
      keys: 'Mod+g',
      category: 'View',
      run: () => toggleGlobalGraph()
    });

    const unregSync = commandRegistry.register({
      id: 'sync:open',
      title: 'Google Drive Sync',
      keys: 'Mod+Shift+s',
      category: 'Sync',
      run: () => useSyncStore.getState().openModal()
    });

    const unregTheme = commandRegistry.register({
      id: 'theme:toggle',
      title: 'Toggle Light/Dark Theme',
      keys: 'Mod+Shift+t',
      category: 'View',
      run: () => useThemeStore.getState().toggleTheme()
    });

    const unregTemplate = commandRegistry.register({
      id: 'template:insert',
      title: 'Insert Template',
      keys: 'Mod+t',
      category: 'Editor',
      run: () => openTemplatePicker()
    });

    const unregDailyToday = commandRegistry.register({
      id: 'daily:today',
      title: "Open Today's Daily Note",
      keys: 'Mod+Shift+d',
      category: 'Daily Notes',
      run: () => void openOrCreateDailyNote()
    });

    const unregDailyPrev = commandRegistry.register({
      id: 'daily:prev',
      title: 'Open Previous Daily Note',
      keys: 'Mod+Alt+Left',
      category: 'Daily Notes',
      run: () => void openPreviousDailyNote()
    });

    const unregDailyNext = commandRegistry.register({
      id: 'daily:next',
      title: 'Open Next Daily Note',
      keys: 'Mod+Alt+Right',
      category: 'Daily Notes',
      run: () => void openNextDailyNote()
    });

    const unregExportHtml = commandRegistry.register({
      id: 'export:html',
      title: 'Export Active Note to HTML',
      keys: 'Mod+Shift+h',
      category: 'File',
      run: async () => {
        const active = useVaultStore.getState().activeNotePath;
        if (active) {
          await exportNoteHtml(active);
        }
      }
    });

    const unregExportMd = commandRegistry.register({
      id: 'export:markdown',
      title: 'Export Active Note to Markdown',
      keys: 'Mod+Shift+m',
      category: 'File',
      run: async () => {
        const active = useVaultStore.getState().activeNotePath;
        if (active) {
          await exportNoteMarkdown(active);
        }
      }
    });

    // Window keydown listener for commands and F1 shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      commandRegistry.handleKeyDown(e);
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initialize vault, theme, and sync stores from stored session
    void initVault();
    void useThemeStore.getState().init();
    void useSyncStore.getState().init();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unregPalette();
      unregOpen();
      unregSwitchVault();
      unregSave();
      unregSidebar();
      unregRightPanel();
      unregVim();
      unregGraph();
      unregSync();
      unregTheme();
      unregTemplate();
      unregDailyToday();
      unregDailyPrev();
      unregDailyNext();
      unregExportHtml();
      unregExportMd();
    };
  }, [
    openVaultDialog,
    setVaultSwitcherOpen,
    saveActiveNote,
    initVault,
    toggleSidebar,
    toggleRightPanel,
    toggleVimMode,
    toggleGlobalGraph,
    openCommandPalette,
    openTemplatePicker
  ]);

  if (!currentVault) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-app)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          padding: '24px',
          boxSizing: 'border-box'
        }}
        data-testid="welcome-screen"
      >
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '12px',
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)'
          }}
        >
          Cairn
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            maxWidth: '460px',
            marginBottom: '28px',
            lineHeight: 1.6
          }}
        >
          A keyboard-first, Obsidian-compatible markdown note-taking desktop app with live preview
          and local-first vault storage.
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => void openVaultDialog()}
            data-testid="welcome-open-vault"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            <FolderOpen size={18} />
            <span>Open Folder as Vault</span>
          </button>

          {recentVaults.length > 0 && (
            <button
              onClick={() => setVaultSwitcherOpen(true)}
              data-testid="welcome-open-switcher"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: 'var(--bg-raised)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
            >
              <Folder size={18} color="var(--accent-primary)" />
              <span>Recent Vaults ({recentVaults.length})</span>
            </button>
          )}
        </div>

        {recentVaults.length > 0 && (
          <div
            style={{
              marginTop: '32px',
              width: '100%',
              maxWidth: '480px',
              textAlign: 'left'
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>Recent Vaults</span>
              <button
                onClick={() => setVaultSwitcherOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                View all (Mod+Shift+O)
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentVaults.slice(0, 5).map((vault) => (
                <button
                  key={vault.path}
                  onClick={() => void openRecentVault(vault.path)}
                  data-testid={`welcome-recent-${vault.name}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-muted)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {vault.name}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {vault.path}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-faint)', marginLeft: '12px' }}>
                    {formatRelativeTime(vault.lastOpened)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-faint)' }}>
          Shortcut: <kbd style={{ padding: '2px 6px', background: 'var(--bg-raised)', borderRadius: '4px' }}>Mod+O</kbd> Open · <kbd style={{ padding: '2px 6px', background: 'var(--bg-raised)', borderRadius: '4px' }}>Mod+Shift+O</kbd> Switch
        </div>

        <VaultSwitcherModal />
        <CloudSyncModal />
        <CommandPaletteModal />
        <TemplatePickerModal />
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <AppLayout />
      <VaultSwitcherModal />
      <CloudSyncModal />
      <CommandPaletteModal />
      <TemplatePickerModal />
    </ErrorBoundary>
  );
}

