import {
  AlertCircle,
  Calendar,
  Circle,
  Command,
  FileText,
  Folder,
  FolderOpen,
  Link2,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Search,
  Settings,
  Sun
} from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useLayoutStore } from '../../stores/layoutStore';
import { useVaultStore } from '../../stores/vaultStore';
import { useThemeStore } from '../../stores/themeStore';
import { openOrCreateDailyNote } from '../../stores/dailyNotes';
import { CodeMirrorEditor } from '../editor/CodeMirrorEditor';
import { BacklinksPanel } from '../sidebar/BacklinksPanel';
import { LocalGraphPanel } from '../sidebar/LocalGraphPanel';
import { FileTree } from '../sidebar/FileTree';
import { SearchPanel } from '../sidebar/SearchPanel';
import { StatusBar } from '../statusbar/StatusBar';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { GlobalGraphView } from '../graph/GlobalGraphView';

export function AppLayout() {
  const currentVault = useVaultStore((s) => s.currentVault);
  const activeNotePath = useVaultStore((s) => s.activeNotePath);
  const isDirty = useVaultStore((s) => s.isDirty);
  const conflictBanner = useVaultStore((s) => s.conflictBanner);
  const reloadFromDisk = useVaultStore((s) => s.reloadFromDisk);
  const dismissConflict = useVaultStore((s) => s.dismissConflict);
  const saveActiveNote = useVaultStore((s) => s.saveActiveNote);
  const openVaultDialog = useVaultStore((s) => s.openVaultDialog);
  const setVaultSwitcherOpen = useVaultStore((s) => s.setVaultSwitcherOpen);

  const isSidebarCollapsed = useLayoutStore((s) => s.isSidebarCollapsed);
  const isRightPanelCollapsed = useLayoutStore((s) => s.isRightPanelCollapsed);
  const activeLeftTab = useLayoutStore((s) => s.activeLeftTab);
  const setActiveLeftTab = useLayoutStore((s) => s.setActiveLeftTab);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const toggleRightPanel = useLayoutStore((s) => s.toggleRightPanel);
  const activeCenterView = useLayoutStore((s) => s.activeCenterView);
  const setActiveCenterView = useLayoutStore((s) => s.setActiveCenterView);
  const activeRightTab = useLayoutStore((s) => s.activeRightTab);
  const setActiveRightTab = useLayoutStore((s) => s.setActiveRightTab);

  const activeNoteTitle = activeNotePath
    ? activeNotePath.split('/').pop()?.replace(/\.md$/i, '') || ''
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-app)'
      }}
    >
      {/* Title Bar */}
      <header
        style={{
          height: 'var(--titlebar-height)',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          userSelect: 'none',
          flexShrink: 0
        }}
        data-testid="app-titlebar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Expand sidebar (Mod+B)' : 'Collapse sidebar (Mod+B)'}
            aria-label="Toggle Sidebar"
            data-testid="toggle-sidebar-button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
            Cairn
          </span>
          {currentVault && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-faint)' }}>·</span>
              <button
                onClick={() => setVaultSwitcherOpen(true)}
                title="Switch Vault (Mod+Shift+O)"
                aria-label="Switch Vault"
                data-testid="titlebar-vault-switcher"
                style={{
                  background: 'none',
                  border: '1px solid transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background-color 0.12s ease, border-color 0.12s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <span data-testid="titlebar-vault-name" style={{ fontWeight: 500 }}>
                  {currentVault.name}
                </span>
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => useLayoutStore.getState().openCommandPalette()}
            title="Command Palette (Mod+P / F1)"
            aria-label="Command Palette"
            data-testid="titlebar-command-palette-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Command size={16} />
          </button>
          <button
            onClick={() => void openOrCreateDailyNote()}
            title="Today's Note (Mod+Shift+D)"
            aria-label="Daily Note"
            data-testid="titlebar-daily-note-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Calendar size={16} />
          </button>
          <button
            onClick={() => useThemeStore.getState().toggleTheme()}
            title="Toggle Light/Dark Theme (Mod+Shift+T)"
            aria-label="Toggle Theme"
            data-testid="titlebar-theme-toggle-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Sun size={16} />
          </button>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            Mod+P Palette · Mod+O Open · Mod+S Save
          </span>
          <button
            onClick={() => setVaultSwitcherOpen(true)}
            title="Switch Vault (Mod+Shift+O)"
            aria-label="Switch Vault"
            data-testid="titlebar-switch-vault-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Folder size={16} />
          </button>
          <button
            onClick={() => void openVaultDialog()}
            title="Open Vault (Mod+O)"
            aria-label="Open Vault"
            data-testid="titlebar-open-vault"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FolderOpen size={16} />
          </button>
          <button
            onClick={() => void saveActiveNote()}
            disabled={!activeNotePath}
            title="Save Note (Mod+S)"
            aria-label="Save Note"
            data-testid="titlebar-save-note"
            style={{
              background: 'none',
              border: 'none',
              color: isDirty ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: activeNotePath ? 'pointer' : 'default',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Save size={16} />
          </button>
          <button
            onClick={toggleRightPanel}
            title={isRightPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
            aria-label="Toggle Right Panel"
            data-testid="toggle-right-panel-button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isRightPanelCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
          </button>
        </div>
      </header>

      {/* Main Workspace Area with Panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Activity Rail */}
        <aside
          aria-label="Activity Rail"
          style={{
            width: 'var(--activity-rail-width)',
            backgroundColor: 'var(--bg-panel)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 0',
            gap: '12px',
            flexShrink: 0
          }}
        >
          <button
            onClick={() => setActiveLeftTab('files')}
            title="Files"
            aria-label="Files"
            data-testid="activity-rail-files"
            style={{
              background: 'none',
              border: 'none',
              color: activeLeftTab === 'files' ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeLeftTab === 'files' ? 'var(--accent-subtle)' : 'transparent',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FileText size={18} />
          </button>
          <button
            onClick={() => setActiveLeftTab('search')}
            title="Search"
            aria-label="Search"
            data-testid="activity-rail-search"
            style={{
              background: 'none',
              border: 'none',
              color: activeLeftTab === 'search' ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeLeftTab === 'search' ? 'var(--accent-subtle)' : 'transparent',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => setActiveCenterView(activeCenterView === 'graph' ? 'editor' : 'graph')}
            title="Graph View (Mod+G)"
            aria-label="Graph View"
            data-testid="activity-rail-graph"
            style={{
              background: 'none',
              border: 'none',
              color: activeCenterView === 'graph' ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: activeCenterView === 'graph' ? 'var(--accent-subtle)' : 'transparent',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Network size={18} />
          </button>
          <div style={{ marginTop: 'auto' }}>
            <button
              disabled
              title="Settings"
              aria-label="Settings"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-faint)',
                cursor: 'not-allowed',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Settings size={18} />
            </button>
          </div>
        </aside>

        {/* Resizable Group */}
        <Group orientation="horizontal" style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          {/* Left Panel: File Tree or Search */}
          {!isSidebarCollapsed && (
            <>
              <Panel id="sidebar" defaultSize="22%" minSize="180px" collapsible={false}>
                {activeLeftTab === 'files' ? <FileTree /> : <SearchPanel />}
              </Panel>
              <Separator
                style={{
                  width: '1px',
                  backgroundColor: 'var(--border-subtle)',
                  cursor: 'col-resize'
                }}
              />
            </>
          )}

          {/* Center Panel: Editor or Graph View */}
          <Panel id="editor-area" minSize="300px">
            {activeCenterView === 'graph' ? (
              <ErrorBoundary fallbackTitle="Graph View Error">
                <GlobalGraphView />
              </ErrorBoundary>
            ) : (
              <main
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  backgroundColor: 'var(--bg-app)',
                  overflow: 'hidden'
                }}
              >
              {/* Note Tab Header */}
              {activeNoteTitle && (
                <div
                  style={{
                    height: '34px',
                    backgroundColor: 'var(--bg-panel)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    gap: '8px'
                  }}
                  data-testid="editor-tab"
                >
                  <FileText size={14} color="var(--text-secondary)" />
                  <span
                    data-testid="editor-tab-title"
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-primary)'
                    }}
                  >
                    {activeNoteTitle}
                  </span>
                  {isDirty && (
                    <span
                      data-testid="editor-tab-dirty"
                      title="Unsaved changes"
                      style={{ color: 'var(--color-warning)', display: 'flex', alignItems: 'center' }}
                    >
                      <Circle size={8} fill="currentColor" />
                    </span>
                  )}
                </div>
              )}

              {/* Conflict Notice Banner */}
              {conflictBanner && (
                <div
                  role="alert"
                  data-testid="conflict-banner"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderBottom: '1px solid var(--color-warning)',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={14} color="var(--color-warning)" />
                    <span>{conflictBanner}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => void reloadFromDisk()}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: 'var(--bg-raised)',
                        border: '1px solid var(--border-muted)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Reload from disk
                    </button>
                    <button
                      onClick={dismissConflict}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: 'transparent',
                        border: '1px solid transparent',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Editor Workspace */}
              <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
                {activeNotePath ? (
                  <ErrorBoundary fallbackTitle="Note Editor Error">
                    <CodeMirrorEditor />
                  </ErrorBoundary>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'var(--text-muted)',
                      gap: '8px',
                      userSelect: 'none'
                    }}
                    data-testid="no-note-selected"
                  >
                    <FileText size={36} color="var(--text-faint)" />
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      No note selected
                    </p>
                    <p style={{ fontSize: '12px' }}>
                      Select a note from the sidebar or click + to create one.
                    </p>
                  </div>
                )}
              </div>
            </main>
          )}
        </Panel>

          {/* Right Panel: Backlinks or Local Graph */}
          {!isRightPanelCollapsed && (
            <>
              <Separator
                style={{
                  width: '1px',
                  backgroundColor: 'var(--border-subtle)',
                  cursor: 'col-resize'
                }}
              />
              <Panel id="right-panel" defaultSize="20%" minSize="180px" collapsible={false}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    width: '100%',
                    overflow: 'hidden'
                  }}
                >
                  {/* Right Panel Tabs */}
                  <div
                    style={{
                      height: '34px',
                      backgroundColor: 'var(--bg-panel)',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      gap: '4px',
                      flexShrink: 0
                    }}
                  >
                    <button
                      onClick={() => setActiveRightTab('backlinks')}
                      title="Backlinks"
                      aria-label="Backlinks"
                      data-testid="right-panel-tab-backlinks"
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom:
                          activeRightTab === 'backlinks'
                            ? '2px solid var(--accent-primary)'
                            : '2px solid transparent',
                        color:
                          activeRightTab === 'backlinks'
                            ? 'var(--text-primary)'
                            : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '7px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Link2
                        size={13}
                        color={
                          activeRightTab === 'backlinks'
                            ? 'var(--accent-primary)'
                            : 'var(--text-muted)'
                        }
                      />
                      <span>Backlinks</span>
                    </button>

                    <button
                      onClick={() => setActiveRightTab('localGraph')}
                      title="Local Graph"
                      aria-label="Local Graph"
                      data-testid="right-panel-tab-graph"
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom:
                          activeRightTab === 'localGraph'
                            ? '2px solid var(--accent-primary)'
                            : '2px solid transparent',
                        color:
                          activeRightTab === 'localGraph'
                            ? 'var(--text-primary)'
                            : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '7px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Network
                        size={13}
                        color={
                          activeRightTab === 'localGraph'
                            ? 'var(--accent-primary)'
                            : 'var(--text-muted)'
                        }
                      />
                      <span>Local Graph</span>
                    </button>
                  </div>

                  {/* Panel Content */}
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {activeRightTab === 'backlinks' ? (
                      <ErrorBoundary fallbackTitle="Backlinks Error">
                        <BacklinksPanel />
                      </ErrorBoundary>
                    ) : (
                      <ErrorBoundary fallbackTitle="Local Graph Error">
                        <LocalGraphPanel />
                      </ErrorBoundary>
                    )}
                  </div>
                </div>
              </Panel>
            </>
          )}
        </Group>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}
