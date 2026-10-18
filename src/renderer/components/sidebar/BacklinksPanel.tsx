import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Link2 } from 'lucide-react';
import { useVaultStore } from '../../stores/vaultStore';
import { groupBacklinks } from '@shared/ipc';

export function BacklinksPanel() {
  const activeNotePath = useVaultStore((s) => s.activeNotePath);
  const backlinks = useVaultStore((s) => s.backlinks);
  const openNote = useVaultStore((s) => s.openNote);

  // Collapsed groups state
  const [collapsedPaths, setCollapsedPaths] = useState<Record<string, boolean>>({});

  const activeTitle = activeNotePath
    ? activeNotePath.split('/').pop()?.replace(/\.md$/i, '') || ''
    : null;

  const groups = useMemo(() => groupBacklinks(backlinks), [backlinks]);

  const toggleGroup = (sourcePath: string) => {
    setCollapsedPaths((prev) => ({
      ...prev,
      [sourcePath]: !prev[sourcePath]
    }));
  };

  return (
    <aside
      aria-label="Backlinks Panel"
      data-testid="backlinks-panel"
      style={{
        backgroundColor: 'var(--bg-panel)',
        height: '100%',
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '36px',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          flexShrink: 0,
          minWidth: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <Link2 size={15} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            Backlinks
          </span>
        </div>
        {activeTitle && (
          <span
            data-testid="backlinks-count"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-raised)',
              color: 'var(--text-muted)',
              flexShrink: 0,
              marginLeft: '6px'
            }}
          >
            {backlinks.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px',
          minWidth: 0
        }}
      >
        {!activeTitle ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-faint)',
              fontSize: '12px'
            }}
          >
            Open a note to see incoming references.
          </div>
        ) : backlinks.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-faint)',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}
            data-testid="backlinks-empty"
          >
            <Link2 size={24} color="var(--border-muted)" />
            <span>No incoming backlinks</span>
            <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
              Links to [[{activeTitle}]] from other notes will appear here.
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            {groups.map((group) => {
              const isCollapsed = Boolean(collapsedPaths[group.sourcePath]);

              return (
                <div
                  key={group.sourcePath}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-raised)',
                    overflow: 'hidden',
                    minWidth: 0
                  }}
                >
                  {/* Note Group Header */}
                  <div
                    role="button"
                    tabIndex={0}
                    data-testid={`backlink-item-${group.sourceTitle}`}
                    onClick={() => void openNote(group.sourcePath)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      backgroundColor: 'transparent',
                      minWidth: 0,
                      gap: '6px',
                      transition: 'background-color 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: 0,
                        flex: 1
                      }}
                    >
                      <button
                        title={isCollapsed ? 'Expand references' : 'Collapse references'}
                        aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(group.sourcePath);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <FileText size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                      <span
                        title={group.sourcePath}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                          flex: 1
                        }}
                      >
                        {group.sourceTitle}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-panel)',
                        color: 'var(--text-muted)',
                        flexShrink: 0
                      }}
                    >
                      {group.items.length}
                    </span>
                  </div>

                  {/* References List with tree guide line */}
                  {!isCollapsed && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '4px 8px 8px 14px',
                        borderTop: '1px solid var(--border-subtle)',
                        backgroundColor: 'rgba(0, 0, 0, 0.15)',
                        minWidth: 0
                      }}
                    >
                      {group.items.map((item, idx) => (
                        <div
                          key={`${item.sourcePath}-${item.line}-${idx}`}
                          onClick={() => void openNote(item.sourcePath)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            padding: '4px 6px',
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: '2px solid var(--border-muted)',
                            cursor: 'pointer',
                            minWidth: 0,
                            transition: 'background-color 0.12s ease, border-color 0.12s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                            e.currentTarget.style.borderLeftColor = 'var(--accent-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderLeftColor = 'var(--border-muted)';
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '10px',
                              color: 'var(--text-faint)',
                              fontFamily: 'var(--font-mono)',
                              minWidth: 0
                            }}
                          >
                            <span
                              style={{
                                padding: '1px 4px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--bg-panel)',
                                color: 'var(--text-muted)'
                              }}
                            >
                              L{item.line}
                            </span>
                            {item.subpath && (
                              <span
                                style={{
                                  color: 'var(--accent-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '80px'
                                }}
                              >
                                #{item.subpath}
                              </span>
                            )}
                          </div>
                          {item.snippet && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.4,
                                fontFamily: 'var(--font-mono)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                minWidth: 0
                              }}
                            >
                              {item.snippet}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
