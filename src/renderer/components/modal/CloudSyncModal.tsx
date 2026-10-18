import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, CloudOff, FolderSync, RefreshCw, X } from 'lucide-react';
import { formatRelativeTime } from '../../../shared/recentVaults';
import { useSyncStore } from '../../stores/syncStore';
import { useVaultStore } from '../../stores/vaultStore';

export function CloudSyncModal(): React.JSX.Element | null {
  const isSyncModalOpen = useSyncStore((s) => s.isSyncModalOpen);
  const closeModal = useSyncStore((s) => s.closeModal);
  const status = useSyncStore((s) => s.status);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const lastSummary = useSyncStore((s) => s.lastSummary);
  const settings = useSyncStore((s) => s.settings);
  const connectGoogleDrive = useSyncStore((s) => s.connectGoogleDrive);
  const disconnectGoogleDrive = useSyncStore((s) => s.disconnectGoogleDrive);
  const triggerSync = useSyncStore((s) => s.triggerSync);
  const updateSettings = useSyncStore((s) => s.updateSettings);
  const openNote = useVaultStore((s) => s.openNote);
  const currentVault = useVaultStore((s) => s.currentVault);
  const openVaultDialog = useVaultStore((s) => s.openVaultDialog);

  const [customClientId, setCustomClientId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSyncModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSyncModalOpen, closeModal]);

  if (!isSyncModalOpen) return null;

  const isConnected = status.state !== 'disconnected';
  const isDriveDesktopVault = currentVault?.path
    ? /google\s*drive/i.test(currentVault.path) || /^[g-z]:[\\/]/i.test(currentVault.path)
    : false;

  const handleConnect = async (isMock = false) => {
    setErrorMessage(null);
    setSyncFeedback(null);
    const res = await connectGoogleDrive({
      customClientId: customClientId.trim() || undefined,
      mock: isMock
    });
    if (!res.success) {
      setErrorMessage(res.error || 'Connection failed.');
    }
  };

  const handleSyncNow = async () => {
    setErrorMessage(null);
    setSyncFeedback(null);
    const res = await triggerSync();
    if (res.success && res.summary) {
      const s = res.summary;
      setSyncFeedback(
        `Sync completed: ${s.uploaded} uploaded, ${s.downloaded} downloaded, ${s.deletedLocal + s.deletedRemote} deleted, ${s.conflicts} conflicts.`
      );
    } else {
      setErrorMessage(res.error || 'Sync failed.');
    }
  };

  return (
    <div
      data-testid="cloud-sync-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-sync-title"
        style={{
          width: '520px',
          maxWidth: '92vw',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-raised)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cloud size={20} color="var(--accent-primary)" />
            <h2
              id="cloud-sync-title"
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}
            >
              Google Drive Cloud Sync
            </h2>
          </div>
          <button
            data-testid="cloud-sync-close-btn"
            onClick={closeModal}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMessage && (
            <div
              data-testid="sync-error-banner"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '13px'
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {syncFeedback && (
            <div
              data-testid="sync-feedback-banner"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '13px'
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <div>{syncFeedback}</div>
            </div>
          )}

          {isDriveDesktopVault && (
            <div
              data-testid="gdrive-desktop-active-banner"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#34d399" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#34d399' }}>
                  Google Drive for Desktop Active
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.45'
                }}
              >
                Your vault <strong>{currentVault?.name}</strong> is inside Google Drive (
                <code style={{ color: 'var(--text-primary)' }}>{currentVault?.path}</code>).
                Google Drive for Desktop automatically syncs all notes to drive.google.com and your other
                devices in real time.
              </p>
            </div>
          )}

          {!isConnected ? (
            /* Disconnected View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {!isDriveDesktopVault && (
                /* Google Drive for Desktop Option (Recommended) */
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-canvas)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FolderSync size={18} color="var(--accent-primary)" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Google Drive for Desktop (Zero Setup)
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--accent-primary)',
                        fontWeight: 700
                      }}
                    >
                      RECOMMENDED
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.45'
                    }}
                  >
                    Store or open your vault in Google Drive (e.g.{' '}
                    <code>G:\My Drive\Cairn Vault</code> or <code>Google Drive/Notes</code>). Google's
                    official desktop app automatically keeps all notes synced across all your devices and
                    the web with zero API keys or cloud console setup.
                  </p>

                  <button
                    data-testid="choose-gdrive-vault-btn"
                    onClick={async () => {
                      closeModal();
                      await openVaultDialog();
                    }}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '9px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'opacity 0.15s ease'
                    }}
                  >
                    <FolderSync size={16} />
                    Open / Choose Vault in Google Drive
                  </button>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '4px 0',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
                <span>Or direct cloud sync (API / Sandbox)</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '16px',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <button
                  data-testid="connect-google-drive-btn"
                  onClick={() => handleConnect(false)}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <Cloud size={16} color="var(--accent-primary)" />
                  Connect Google Drive (Browser OAuth)
                </button>

                <button
                  data-testid="connect-mock-drive-btn"
                  onClick={() => handleConnect(true)}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  Enable Offline / Mock Mode (Test Sandbox)
                </button>
              </div>

              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  {showAdvanced ? 'Hide Advanced Settings' : 'Configure Custom OAuth Client ID'}
                </button>

                {showAdvanced && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Google OAuth Client ID:
                    </label>
                    <input
                      data-testid="custom-client-id-input"
                      type="text"
                      placeholder="e.g. 12345-abc.apps.googleusercontent.com"
                      value={customClientId}
                      onChange={(e) => setCustomClientId(e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontFamily: 'var(--font-mono)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Connected View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Account Status Card */}
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span
                      data-testid="sync-account-email"
                      style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
                    >
                      {status.userEmail || 'Connected Account'}
                    </span>
                    {status.isMock && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(99, 102, 241, 0.2)',
                          color: 'var(--accent-primary)',
                          fontWeight: 700
                        }}
                      >
                        MOCK
                      </span>
                    )}
                  </div>
                  <span
                    data-testid="sync-status-badge"
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      color: isSyncing ? 'var(--accent-primary)' : '#34d399'
                    }}
                  >
                    {isSyncing ? 'Syncing...' : 'Connected'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span>Remote Folder: <strong>{status.remoteFolderName || 'Cairn Vault'}</strong></span>
                  <span>
                    Last Synced: <strong>{status.lastSyncTime ? formatRelativeTime(status.lastSyncTime) : 'Never'}</strong>
                  </span>
                </div>
              </div>

              {/* Sync Controls */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  data-testid="sync-now-btn"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--accent-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSyncing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isSyncing ? 0.7 : 1
                  }}
                >
                  <RefreshCw
                    size={15}
                    style={{
                      animation: isSyncing ? 'spin 1s linear infinite' : 'none'
                    }}
                  />
                  {isSyncing ? 'Synchronizing...' : 'Sync Now'}
                </button>

                <button
                  data-testid="disconnect-sync-btn"
                  onClick={disconnectGoogleDrive}
                  disabled={isSyncing}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 14px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CloudOff size={15} />
                  Disconnect
                </button>
              </div>

              {/* Auto Sync Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}
              >
                <span>Automatic 5-minute background sync</span>
                <input
                  type="checkbox"
                  data-testid="auto-sync-checkbox"
                  checked={settings.autoSync}
                  onChange={(e) => updateSettings({ autoSync: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
              </div>

              {/* Active Conflicts List */}
              {status.activeConflicts && status.activeConflicts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#f59e0b'
                    }}
                  >
                    <AlertTriangle size={14} />
                    <span>Preserved Merge Conflicts ({status.activeConflicts.length})</span>
                  </div>
                  <div
                    data-testid="sync-conflicts-list"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      maxHeight: '140px',
                      overflowY: 'auto'
                    }}
                  >
                    {status.activeConflicts.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '12px',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {c.conflictPath}
                        </span>
                        <button
                          onClick={() => {
                            void openNote(c.conflictPath);
                            closeModal();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Sync Stats */}
              {lastSummary && (
                <div
                  data-testid="sync-last-summary"
                  style={{
                    display: 'flex',
                    gap: '12px',
                    fontSize: '11px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span>Uploaded: {lastSummary.uploaded}</span>
                  <span>Downloaded: {lastSummary.downloaded}</span>
                  <span>Deleted: {lastSummary.deletedLocal + lastSummary.deletedRemote}</span>
                  <span>Conflicts: {lastSummary.conflicts}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
