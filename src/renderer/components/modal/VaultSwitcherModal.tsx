import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Folder, FolderOpen, Search, X } from 'lucide-react';
import { useVaultStore } from '../../stores/vaultStore';
import { formatRelativeTime, isSameVaultPath } from '@shared/ipc';

function VaultSwitcherDialog() {
  const setVaultSwitcherOpen = useVaultStore((s) => s.setVaultSwitcherOpen);
  const recentVaults = useVaultStore((s) => s.recentVaults);
  const currentVault = useVaultStore((s) => s.currentVault);
  const openRecentVault = useVaultStore((s) => s.openRecentVault);
  const removeRecentVaultFromRecents = useVaultStore(
    (s) => s.removeRecentVaultFromRecents
  );
  const openVaultDialog = useVaultStore((s) => s.openVaultDialog);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter vaults according to search query
  const filteredVaults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentVaults;
    return recentVaults.filter(
      (v) =>
        v.name.toLowerCase().includes(q) || v.path.toLowerCase().includes(q)
    );
  }, [recentVaults, searchQuery]);

  // Focus input on mount and handle global Escape while open
  useEffect(() => {
    inputRef.current?.focus();

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setVaultSwitcherOpen(false);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [setVaultSwitcherOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setVaultSwitcherOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredVaults.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredVaults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredVaults.length > 0) {
        setSelectedIndex((prev) =>
          prev <= 0 ? filteredVaults.length - 1 : prev - 1
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredVaults[selectedIndex];
      if (target) {
        void openRecentVault(target.path);
      }
    }
  };

  return (
    <div
      role="presentation"
      onClick={() => setVaultSwitcherOpen(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 1000,
        animation: 'fadeIn 0.1s ease-out'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Vault Switcher"
        data-testid="vault-switcher-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: '560px',
          maxWidth: '92vw',
          maxHeight: '75vh',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header / Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '10px'
          }}
        >
          <Search size={18} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            data-testid="vault-switcher-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search recent vaults or switch..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit'
            }}
          />
          <button
            onClick={() => setVaultSwitcherOpen(false)}
            title="Close (Esc)"
            aria-label="Close Vault Switcher"
            data-testid="vault-switcher-close"
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
            <X size={16} />
          </button>
        </div>

        {/* Vault List */}
        <div
          ref={listRef}
          data-testid="vault-switcher-list"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px'
          }}
        >
          {filteredVaults.length === 0 ? (
            <div
              style={{
                padding: '36px 16px',
                textAlign: 'center',
                color: 'var(--text-faint)',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
              data-testid="vault-switcher-empty"
            >
              <Folder size={28} color="var(--border-muted)" />
              <span>
                {searchQuery
                  ? `No vaults matching "${searchQuery}"`
                  : 'No recent vaults recorded yet.'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredVaults.map((vault, idx) => {
                const isSelected = idx === selectedIndex;
                const isCurrent =
                  currentVault && isSameVaultPath(vault.path, currentVault.path);

                return (
                  <div
                    key={vault.path}
                    role="button"
                    tabIndex={0}
                    data-testid={`recent-vault-${vault.name}`}
                    onClick={() => void openRecentVault(vault.path)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected
                        ? 'var(--bg-hover)'
                        : isCurrent
                          ? 'var(--bg-raised)'
                          : 'transparent',
                      border: isSelected
                        ? '1px solid var(--border-muted)'
                        : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.12s ease, border-color 0.12s ease'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: 0,
                        flex: 1
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isCurrent
                            ? 'var(--accent-subtle)'
                            : 'var(--bg-raised)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isCurrent
                            ? 'var(--accent-primary)'
                            : 'var(--text-secondary)',
                          flexShrink: 0
                        }}
                      >
                        <Folder size={18} />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          minWidth: 0,
                          flex: 1
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {vault.name}
                          </span>
                          {isCurrent && (
                            <span
                              data-testid="current-vault-badge"
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--accent-subtle)',
                                color: 'var(--accent-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Check size={10} />
                              Current
                            </span>
                          )}
                        </div>
                        <span
                          title={vault.path}
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {vault.path}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginLeft: '12px',
                        flexShrink: 0
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-faint)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatRelativeTime(vault.lastOpened)}
                      </span>
                      <button
                        title="Remove from recents"
                        aria-label={`Remove ${vault.name} from recents`}
                        data-testid={`remove-recent-vault-${vault.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeRecentVaultFromRecents(vault.path);
                          inputRef.current?.focus();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-faint)',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: isSelected ? 1 : 0.6
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-danger)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-faint)';
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}
        >
          <button
            onClick={() => {
              setVaultSwitcherOpen(false);
              void openVaultDialog();
            }}
            data-testid="vault-switcher-open-disk"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FolderOpen size={14} color="var(--accent-primary)" />
            <span>Open Folder from Disk...</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>
              <kbd style={{ padding: '2px 4px', background: 'var(--bg-app)', borderRadius: '3px' }}>
                ↑↓
              </kbd>{' '}
              navigate
            </span>
            <span>·</span>
            <span>
              <kbd style={{ padding: '2px 4px', background: 'var(--bg-app)', borderRadius: '3px' }}>
                ↵
              </kbd>{' '}
              select
            </span>
            <span>·</span>
            <span>
              <kbd style={{ padding: '2px 4px', background: 'var(--bg-app)', borderRadius: '3px' }}>
                esc
              </kbd>{' '}
              close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VaultSwitcherModal() {
  const isVaultSwitcherOpen = useVaultStore((s) => s.isVaultSwitcherOpen);

  if (!isVaultSwitcherOpen) {
    return null;
  }

  return <VaultSwitcherDialog />;
}
