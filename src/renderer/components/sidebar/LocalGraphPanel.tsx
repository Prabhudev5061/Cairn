import { useEffect, useMemo } from 'react';
import { GitBranch, Layers } from 'lucide-react';
import { extractLocalSubgraph } from '@shared/linking/graph';
import type { GraphNode } from '@shared/linking/types';
import { ForceGraphCanvas } from '../graph/ForceGraphCanvas';
import { useGraphStore } from '../../stores/graphStore';
import { useVaultStore } from '../../stores/vaultStore';

export function LocalGraphPanel() {
  const activeNotePath = useVaultStore((s) => s.activeNotePath);
  const openNote = useVaultStore((s) => s.openNote);

  const graphData = useGraphStore((s) => s.graphData);
  const fetchGraphData = useGraphStore((s) => s.fetchGraphData);
  const localDepth = useGraphStore((s) => s.localDepth);
  const setLocalDepth = useGraphStore((s) => s.setLocalDepth);

  useEffect(() => {
    if (!graphData) {
      void fetchGraphData();
    }
  }, [graphData, fetchGraphData]);

  // Extract local subgraph for active note
  const localSubgraph = useMemo(() => {
    if (!graphData || !activeNotePath) {
      return { nodes: [], links: [] };
    }
    return extractLocalSubgraph(graphData, activeNotePath, localDepth);
  }, [graphData, activeNotePath, localDepth]);

  const handleNodeClick = (node: GraphNode) => {
    if (node.id !== activeNotePath) {
      void openNote(node.id);
    }
  };

  if (!activeNotePath) {
    return (
      <div
        data-testid="local-graph-empty"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px 16px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          gap: '8px',
          userSelect: 'none'
        }}
      >
        <GitBranch size={28} color="var(--text-faint)" />
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
          No active note
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Open a note to view its local graph
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        overflow: 'hidden'
      }}
      data-testid="local-graph-panel"
    >
      {/* Local Graph Toolbar */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={13} color="var(--accent-primary)" />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Depth
          </span>
          <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
            {[1, 2, 3].map((depth) => {
              const isActive = localDepth === depth;
              return (
                <button
                  key={depth}
                  onClick={() => setLocalDepth(depth)}
                  data-testid={`local-graph-depth-${depth}`}
                  style={{
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 500,
                    transition: 'all 0.12s ease'
                  }}
                >
                  {depth}
                </button>
              );
            })}
          </div>
        </div>

        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {localSubgraph.nodes.length} nodes · {localSubgraph.links.length} links
        </span>
      </div>

      {/* Local Graph Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <ForceGraphCanvas
          data={localSubgraph}
          activeNodeId={activeNotePath}
          onNodeClick={handleNodeClick}
          showLabels={true}
          nodeSizeMultiplier={1.0}
          linkDistance={32}
          isLocal={true}
          testId="local-graph-canvas"
        />
      </div>
    </div>
  );
}
