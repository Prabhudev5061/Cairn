import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Command, commandRegistry } from '../../commands/registry';
import { useLayoutStore } from '../../stores/layoutStore';
import { Search } from 'lucide-react';

function CommandPaletteDialog(): React.JSX.Element {
  const closeCommandPalette = useLayoutStore((s) => s.closeCommandPalette);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => {
    return commandRegistry.getAll();
  }, []);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => {
      const titleMatch = cmd.title.toLowerCase().includes(q);
      const catMatch = cmd.category?.toLowerCase().includes(q);
      const idMatch = cmd.id.toLowerCase().includes(q);
      const descMatch = cmd.description?.toLowerCase().includes(q);
      return titleMatch || catMatch || idMatch || descMatch;
    });
  }, [commands, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleExecute = (cmd: Command) => {
    closeCommandPalette();
    void cmd.run();
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandPalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length ? (prev + 1) % filteredCommands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredCommands.length ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      if (target) {
        handleExecute(target);
      }
    }
  };

  const formatKeyString = (keys?: string) => {
    if (!keys) return null;
    return keys
      .replace(/Mod/gi, 'Ctrl')
      .split('+')
      .map((part) => part.trim());
  };

  return (
    <div
      data-testid="command-palette-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 9999
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCommandPalette();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        style={{
          width: '560px',
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
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-raised)'
          }}
        >
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)'
            }}
          />
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          data-testid="command-palette-list"
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            padding: '6px'
          }}
        >
          {filteredCommands.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px'
              }}
            >
              No commands found matching "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const keyParts = formatKeyString(cmd.keys);

              return (
                <div
                  key={cmd.id}
                  data-testid="command-palette-item"
                  data-selected={isSelected}
                  onClick={() => handleExecute(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cmd.category && (
                      <span
                        style={{
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 600,
                          padding: '2px 5px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSelected ? 'var(--border-muted)' : 'var(--bg-raised)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {cmd.category}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? 'var(--text-primary)' : 'inherit'
                      }}
                    >
                      {cmd.title}
                    </span>
                  </div>

                  {keyParts && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {keyParts.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-surface-raised)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}
        >
          <span>
            Navigate with <kbd>↑</kbd> <kbd>↓</kbd> · Select with <kbd>↵</kbd>
          </span>
          <span>
            Dismiss with <kbd>esc</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteModal(): React.JSX.Element | null {
  const isCommandPaletteOpen = useLayoutStore((s) => s.isCommandPaletteOpen);
  if (!isCommandPaletteOpen) return null;
  return <CommandPaletteDialog />;
}
