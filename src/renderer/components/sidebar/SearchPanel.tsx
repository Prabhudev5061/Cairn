import { useState } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { useVaultStore } from '../../stores/vaultStore';

export function SearchPanel() {
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const searchResults = useVaultStore((s) => s.searchResults);
  const isSearching = useVaultStore((s) => s.isSearching);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const openNote = useVaultStore((s) => s.openNote);

  const [inputVal, setInputVal] = useState(searchQuery);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    void setSearchQuery(val);
  };

  const handleClear = () => {
    setInputVal('');
    void setSearchQuery('');
  };

  return (
    <div
      aria-label="Search Panel"
      data-testid="search-panel"
      style={{
        backgroundColor: 'var(--bg-panel)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header & Search Bar */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={14} color="var(--accent-primary)" />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)'
            }}
          >
            Search Vault
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-app)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            gap: '6px'
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            value={inputVal}
            onChange={handleInputChange}
            placeholder="Search notes or text..."
            data-testid="vault-search-input"
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'var(--font-sans)'
            }}
          />
          {inputVal && (
            <button
              onClick={handleClear}
              title="Clear search"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {isSearching ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            Searching...
          </div>
        ) : !inputVal.trim() ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px' }}>
            Type to search notes, headings, and markdown text.
          </div>
        ) : searchResults.length === 0 ? (
          <div
            data-testid="search-empty"
            style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '12px' }}
          >
            No matches found for &quot;{inputVal}&quot;
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-faint)', padding: '0 4px' }}>
              {searchResults.length} {searchResults.length === 1 ? 'file' : 'files'} matched
            </div>
            {searchResults.map((res) => (
              <button
                key={res.path}
                onClick={() => void openNote(res.path)}
                data-testid={`search-result-${res.title}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-raised)',
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
                  e.currentTarget.style.backgroundColor = 'var(--bg-raised)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={13} color="var(--accent-primary)" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{res.title}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>
                    {res.matches.length} {res.matches.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>

                {res.matches.slice(0, 3).map((m, idx) => (
                  <div
                    key={`${res.path}-${m.line}-${idx}`}
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1.4,
                      backgroundColor: 'rgba(0, 0, 0, 0.15)',
                      padding: '2px 4px',
                      borderRadius: '2px'
                    }}
                  >
                    <span style={{ color: 'var(--text-faint)', marginRight: '4px' }}>L{m.line}:</span>
                    {m.snippet}
                  </div>
                ))}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
