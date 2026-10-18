import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Sliders,
  X
} from 'lucide-react';
import { filterGraph } from '@shared/linking/graph';
import type { GraphNode } from '@shared/linking/types';
import { useGraphStore } from '../../stores/graphStore';
import { useLayoutStore } from '../../stores/layoutStore';
import { useVaultStore } from '../../stores/vaultStore';
import { ForceGraphCanvas } from './ForceGraphCanvas';

export function GlobalGraphView() {
  const graphData = useGraphStore((s) => s.graphData);
  const isLoading = useGraphStore((s) => s.isLoading);
  const searchQuery = useGraphStore((s) => s.searchQuery);
  const selectedTags = useGraphStore((s) => s.selectedTags);
  const selectedFolders = useGraphStore((s) => s.selectedFolders);
  const hideOrphans = useGraphStore((s) => s.hideOrphans);
  const showLabels = useGraphStore((s) => s.showLabels);
  const nodeSizeMultiplier = useGraphStore((s) => s.nodeSizeMultiplier);
  const linkDistance = useGraphStore((s) => s.linkDistance);

  const fetchGraphData = useGraphStore((s) => s.fetchGraphData);
  const setSearchQuery = useGraphStore((s) => s.setSearchQuery);
  const toggleTag = useGraphStore((s) => s.toggleTag);
  const setHideOrphans = useGraphStore((s) => s.setHideOrphans);
  const setShowLabels = useGraphStore((s) => s.setShowLabels);
  const setNodeSizeMultiplier = useGraphStore((s) => s.setNodeSizeMultiplier);
  const setLinkDistance = useGraphStore((s) => s.setLinkDistance);
  const resetFilters = useGraphStore((s) => s.resetFilters);

  const openNote = useVaultStore((s) => s.openNote);
  const activeNotePath = useVaultStore((s) => s.activeNotePath);
  const setActiveCenterView = useLayoutStore((s) => s.setActiveCenterView);

  const [isControlsOpen, setIsControlsOpen] = useState(true);

  // Fetch initial graph data on mount
  useEffect(() => {
    void fetchGraphData();
  }, [fetchGraphData]);

  // Extract all distinct tags present across vault nodes
  const allVaultTags = useMemo(() => {
    if (!graphData) return [];
    const tags = new Set<string>();
    for (const node of graphData.nodes) {
      for (const t of node.tags || []) {
        tags.add(t.replace(/^#/, ''));
      }
    }
    return Array.from(tags).sort();
  }, [graphData]);

  // Compute filtered graph data
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    return filterGraph(graphData, {
      searchQuery,
      selectedTags,
      selectedFolders,
      hideOrphans
    });
  }, [graphData, searchQuery, selectedTags, selectedFolders, hideOrphans]);

  const handleNodeClick = (node: GraphNode) => {
    void openNote(node.id);
    setActiveCenterView('editor');
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedTags.length > 0 || hideOrphans || selectedFolders.length > 0
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column'
      }}
      data-testid="global-graph-view"
    >
      {/* Top Header Bar */}
      <div
        style={{
          height: '38px',
          backgroundColor: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 10,
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Graph View
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {filteredData.nodes.length} nodes · {filteredData.links.length} links
          </span>
          {isLoading && (
            <span style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>Loading...</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => void fetchGraphData()}
            title="Refresh graph data"
            aria-label="Refresh graph"
            data-testid="graph-refresh-btn"
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
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setIsControlsOpen(!isControlsOpen)}
            title={isControlsOpen ? 'Hide controls' : 'Show controls'}
            aria-label="Toggle Controls"
            data-testid="graph-toggle-controls"
            style={{
              background: 'none',
              border: '1px solid var(--border-subtle)',
              color: isControlsOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sliders size={12} />
            <span>Filters</span>
          </button>
          <button
            onClick={() => setActiveCenterView('editor')}
            title="Back to editor (Escape / Mod+G)"
            aria-label="Back to Editor"
            data-testid="graph-close-btn"
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
      </div>

      {/* Main Canvas Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <ForceGraphCanvas
          data={filteredData}
          activeNodeId={activeNotePath}
          onNodeClick={handleNodeClick}
          showLabels={showLabels}
          nodeSizeMultiplier={nodeSizeMultiplier}
          linkDistance={linkDistance}
          isLocal={false}
          testId="graph-canvas"
        />

        {/* Floating Controls HUD Panel */}
        {isControlsOpen && (
          <div
            data-testid="graph-controls-hud"
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              width: '280px',
              maxHeight: 'calc(100% - 32px)',
              overflowY: 'auto',
              backgroundColor: 'rgba(20, 22, 27, 0.94)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Search Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  gap: '6px'
                }}
              >
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Filter by note title or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="graph-search-input"
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    width: '100%'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Orphan Nodes Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 0'
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Hide orphans</span>
              <button
                onClick={() => setHideOrphans(!hideOrphans)}
                data-testid="graph-orphan-toggle"
                style={{
                  padding: '3px 8px',
                  backgroundColor: hideOrphans ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                  border: `1px solid ${hideOrphans ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: hideOrphans ? 'var(--accent-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 500
                }}
              >
                {hideOrphans ? 'Hidden' : 'Visible'}
              </button>
            </div>

            {/* Display Labels Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 0'
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Text labels</span>
              <button
                onClick={() => setShowLabels(!showLabels)}
                data-testid="graph-label-toggle"
                style={{
                  padding: '3px 8px',
                  backgroundColor: showLabels ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                  border: `1px solid ${showLabels ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: showLabels ? 'var(--accent-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {showLabels ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>{showLabels ? 'On' : 'Off'}</span>
              </button>
            </div>

            {/* Node Sizing Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-secondary)'
                }}
              >
                <span>Node size</span>
                <span>{nodeSizeMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={nodeSizeMultiplier}
                onChange={(e) => setNodeSizeMultiplier(parseFloat(e.target.value))}
                data-testid="graph-node-size-slider"
                style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Link Distance Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-secondary)'
                }}
              >
                <span>Link distance</span>
                <span>{linkDistance}px</span>
              </div>
              <input
                type="range"
                min="25"
                max="120"
                step="5"
                value={linkDistance}
                onChange={(e) => setLinkDistance(parseInt(e.target.value, 10))}
                data-testid="graph-link-distance-slider"
                style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Tag Filter Pills */}
            {allVaultTags.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Tags
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    maxHeight: '90px',
                    overflowY: 'auto'
                  }}
                >
                  {allVaultTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        data-testid="graph-tag-filter"
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-surface)',
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                data-testid="graph-reset-filters"
                style={{
                  marginTop: '4px',
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  textAlign: 'center'
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
