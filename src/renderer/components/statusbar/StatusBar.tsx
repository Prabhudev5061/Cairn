import { AlertTriangle, Check, Circle, Cloud, CloudOff, RefreshCw, X } from 'lucide-react';
import { getFormatPlugin } from '@shared/formats/registry';
import { useLayoutStore } from '../../stores/layoutStore';
import { useSyncStore } from '../../stores/syncStore';
import { useVaultStore } from '../../stores/vaultStore';

export function StatusBar() {
  const currentVault = useVaultStore((s) => s.currentVault);
  const activeNotePath = useVaultStore((s) => s.activeNotePath);
  const activeNoteMetadata = useVaultStore((s) => s.activeNoteMetadata);
  const isDirty = useVaultStore((s) => s.isDirty);
  const wordCount = useVaultStore((s) => s.wordCount);
  const cursorPosition = useVaultStore((s) => s.cursorPosition);
  const watcherAlert = useVaultStore((s) => s.watcherAlert);
  const dismissAlert = useVaultStore((s) => s.dismissAlert);
  const setVaultSwitcherOpen = useVaultStore((s) => s.setVaultSwitcherOpen);

  const syncStatus = useSyncStore((s) => s.status);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const openSyncModal = useSyncStore((s) => s.openModal);

  const isVimMode = useLayoutStore((s) => s.isVimMode);
  const vimMode = useLayoutStore((s) => s.vimMode);

  const formatPlugin = activeNotePath ? getFormatPlugin(activeNotePath) : null;


  return (
    <footer
      style={{
        height: 'var(--statusbar-height)',
        backgroundColor: 'var(--bg-panel)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        userSelect: 'none',
        flexShrink: 0
      }}
      data-testid="status-bar"
    >
      {/* Left section: Watcher alerts, Vault path & Vim Mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isVimMode && (
          <span data-testid="status-vim-mode" className="cairn-vim-badge">
            {vimMode}
          </span>
        )}
        {watcherAlert ? (

          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-warning)',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <AlertTriangle size={12} />
            <span>{watcherAlert.message}</span>
            <button
              onClick={dismissAlert}
              title="Dismiss alert"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          currentVault && (
            <button
              onClick={() => setVaultSwitcherOpen(true)}
              title="Switch Vault (Mod+Shift+O)"
              aria-label="Switch Vault"
              data-testid="status-vault-path"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'color 0.12s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              <span>{currentVault.name}</span>
            </button>
          )
        )}
        {currentVault && (() => {
          const isDriveDesktopVault =
            /google\s*drive/i.test(currentVault.path) || /^[g-z]:[\\/]/i.test(currentVault.path);
          const isDisconnected = syncStatus.state === 'disconnected';

          return (
            <button
              data-testid="status-sync-indicator"
              onClick={openSyncModal}
              title={
                isDisconnected
                  ? isDriveDesktopVault
                    ? `Google Drive for Desktop: Active (${currentVault.path})`
                    : 'Google Drive: Disconnected (Click to connect)'
                  : isSyncing
                  ? 'Google Drive: Syncing...'
                  : syncStatus.state === 'error'
                  ? `Google Drive Sync Error: ${syncStatus.error || 'Unknown error'}`
                  : syncStatus.activeConflicts.length > 0
                  ? `Google Drive: ${syncStatus.activeConflicts.length} conflict(s)`
                  : `Google Drive: Synced (${syncStatus.userEmail || 'Connected'})`
              }
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: isDisconnected
                  ? isDriveDesktopVault
                    ? '#34d399'
                    : 'var(--text-muted)'
                  : syncStatus.state === 'error' || syncStatus.activeConflicts.length > 0
                  ? '#f59e0b'
                  : isSyncing
                  ? 'var(--accent-primary)'
                  : '#34d399'
              }}
            >
              {isDisconnected ? (
                isDriveDesktopVault ? (
                  <Cloud size={11} />
                ) : (
                  <CloudOff size={11} />
                )
              ) : isSyncing ? (
                <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
              ) : syncStatus.state === 'error' || syncStatus.activeConflicts.length > 0 ? (
                <AlertTriangle size={11} />
              ) : (
                <Cloud size={11} />
              )}
              <span style={{ fontSize: '10px' }}>
                {isDisconnected
                  ? isDriveDesktopVault
                    ? 'Drive Active'
                    : 'Cloud'
                  : isSyncing
                  ? 'Syncing'
                  : syncStatus.activeConflicts.length > 0
                  ? `${syncStatus.activeConflicts.length} Conflict`
                  : 'Synced'}
              </span>
            </button>
          );
        })()}
      </div>

      {/* Right section: Note stats, save state, EOL, cursor */}
      {activeNotePath && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Dirty / Saved State */}
          <span
            data-testid="status-dirty-state"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: isDirty ? 'var(--color-warning)' : 'var(--text-muted)'
            }}
          >
            {isDirty ? (
              <>
                <Circle size={8} fill="currentColor" />
                <span>Unsaved</span>
              </>
            ) : (
              <>
                <Check size={11} />
                <span>Saved</span>
              </>
            )}
          </span>

          {/* Note Format Badge */}
          {formatPlugin && (
            <span
              data-testid="status-format-badge"
              title={formatPlugin.name}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--accent-primary)',
                letterSpacing: '0.5px'
              }}
            >
              {formatPlugin.badgeLabel}
            </span>
          )}

          {/* EOL and BOM format */}
          {activeNoteMetadata && (
            <span data-testid="status-eol" style={{ color: 'var(--text-secondary)' }}>
              {activeNoteMetadata.eol === '\r\n' ? 'CRLF' : 'LF'}
              {activeNoteMetadata.hasBom ? ' (BOM)' : ''}
            </span>
          )}

          {/* Word count */}
          <span data-testid="status-word-count">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>

          {/* Cursor Position */}
          <span data-testid="status-cursor-position">
            Ln {cursorPosition.line}, Col {cursorPosition.col}
          </span>
        </div>
      )}
    </footer>
  );
}
