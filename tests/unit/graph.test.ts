import { describe, expect, it } from 'vitest';
import {
  assignNodeColors,
  extractLocalSubgraph,
  filterGraph,
  getLinkId,
  hashString
} from '../../src/shared/linking/graph';
import type { GraphData, GraphNode } from '../../src/shared/linking/types';

describe('Graph pure utilities', () => {
  const sampleGraph: GraphData = {
    nodes: [
      {
        id: 'index.md',
        path: 'index.md',
        title: 'Index',
        val: 2,
        tags: ['#hub', '#moc'],
        degree: 2,
        isOrphan: false
      },
      {
        id: 'notes/react.md',
        path: 'notes/react.md',
        title: 'React',
        val: 2,
        tags: ['#frontend'],
        degree: 2,
        isOrphan: false
      },
      {
        id: 'notes/typescript.md',
        path: 'notes/typescript.md',
        title: 'TypeScript',
        val: 1,
        tags: ['#language'],
        degree: 1,
        isOrphan: false
      },
      {
        id: 'notes/electron.md',
        path: 'notes/electron.md',
        title: 'Electron',
        val: 1,
        tags: ['#desktop'],
        degree: 1,
        isOrphan: false
      },
      {
        id: 'isolated.md',
        path: 'isolated.md',
        title: 'Isolated',
        val: 1,
        tags: ['#draft'],
        degree: 0,
        isOrphan: true
      }
    ],
    links: [
      { source: 'index.md', target: 'notes/react.md' },
      { source: 'notes/react.md', target: 'notes/typescript.md' },
      { source: 'notes/typescript.md', target: 'notes/electron.md' }
    ]
  };

  describe('getLinkId', () => {
    it('handles string identifiers, object references, and empty values', () => {
      expect(getLinkId('note.md')).toBe('note.md');
      expect(getLinkId({ id: 'note.md' })).toBe('note.md');
      expect(getLinkId(null)).toBe('');
      expect(getLinkId(undefined)).toBe('');
    });
  });

  describe('filterGraph', () => {
    it('returns all nodes when no filters are active', () => {
      const filtered = filterGraph(sampleGraph, {});
      expect(filtered.nodes).toHaveLength(5);
      expect(filtered.links).toHaveLength(3);
    });

    it('filters out orphans when hideOrphans is true', () => {
      const filtered = filterGraph(sampleGraph, { hideOrphans: true });
      expect(filtered.nodes.find((n) => n.id === 'isolated.md')).toBeUndefined();
      expect(filtered.nodes).toHaveLength(4);
      expect(filtered.links).toHaveLength(3);
    });

    it('filters by search query matching title', () => {
      const filtered = filterGraph(sampleGraph, { searchQuery: 'script' });
      expect(filtered.nodes).toHaveLength(1);
      expect(filtered.nodes[0]?.title).toBe('TypeScript');
      expect(filtered.links).toHaveLength(0); // Adjacent nodes filtered out
    });

    it('filters by search query matching tag', () => {
      const filtered = filterGraph(sampleGraph, { searchQuery: 'hub' });
      expect(filtered.nodes).toHaveLength(1);
      expect(filtered.nodes[0]?.id).toBe('index.md');
    });

    it('filters by selected tags', () => {
      const filtered = filterGraph(sampleGraph, { selectedTags: ['frontend'] });
      expect(filtered.nodes).toHaveLength(1);
      expect(filtered.nodes[0]?.id).toBe('notes/react.md');
    });

    it('filters by folder path', () => {
      const filtered = filterGraph(sampleGraph, { selectedFolders: ['notes'] });
      expect(filtered.nodes).toHaveLength(3);
      expect(filtered.nodes.map((n) => n.id).sort()).toEqual([
        'notes/electron.md',
        'notes/react.md',
        'notes/typescript.md'
      ]);
      expect(filtered.links).toHaveLength(2);
    });
  });

  describe('extractLocalSubgraph', () => {
    it('extracts depth 1 neighbors of root node', () => {
      // index.md -> notes/react.md (hop 1)
      const sub = extractLocalSubgraph(sampleGraph, 'index.md', 1);
      expect(sub.nodes.map((n) => n.id).sort()).toEqual(['index.md', 'notes/react.md']);
      expect(sub.links).toHaveLength(1);
    });

    it('extracts depth 2 neighbors of root node', () => {
      // index.md -> notes/react.md (hop 1) -> notes/typescript.md (hop 2)
      const sub = extractLocalSubgraph(sampleGraph, 'index.md', 2);
      expect(sub.nodes.map((n) => n.id).sort()).toEqual([
        'index.md',
        'notes/react.md',
        'notes/typescript.md'
      ]);
      expect(sub.links).toHaveLength(2);
    });

    it('extracts depth 3 neighbors of root node', () => {
      // index -> react -> ts -> electron
      const sub = extractLocalSubgraph(sampleGraph, 'index.md', 3);
      expect(sub.nodes.map((n) => n.id).sort()).toEqual([
        'index.md',
        'notes/electron.md',
        'notes/react.md',
        'notes/typescript.md'
      ]);
      expect(sub.links).toHaveLength(3);
    });

    it('returns empty subgraph if root node is not found', () => {
      const sub = extractLocalSubgraph(sampleGraph, 'nonexistent.md', 1);
      expect(sub.nodes).toHaveLength(0);
      expect(sub.links).toHaveLength(0);
    });

    it('returns only root node for an orphan note', () => {
      const sub = extractLocalSubgraph(sampleGraph, 'isolated.md', 2);
      expect(sub.nodes).toHaveLength(1);
      expect(sub.nodes[0]?.id).toBe('isolated.md');
      expect(sub.links).toHaveLength(0);
    });
  });

  describe('assignNodeColors', () => {
    it('produces deterministic color assignments', () => {
      const colors1 = assignNodeColors(sampleGraph.nodes);
      const colors2 = assignNodeColors(sampleGraph.nodes);
      expect(colors1).toEqual(colors2);
      expect(colors1['index.md']).toBeDefined();
      expect(colors1['notes/react.md']).toBeDefined();
    });

    it('assigns same color to nodes sharing the same primary tag', () => {
      const nodes: GraphNode[] = [
        { id: 'a.md', path: 'a.md', title: 'A', tags: ['#book'], degree: 1, isOrphan: false, val: 1 },
        { id: 'b.md', path: 'b.md', title: 'B', tags: ['#book'], degree: 1, isOrphan: false, val: 1 }
      ];
      const colors = assignNodeColors(nodes);
      expect(colors['a.md']).toBe(colors['b.md']);
    });

    it('hashString computes consistent non-negative integer', () => {
      expect(hashString('test')).toBe(hashString('test'));
      expect(hashString('test')).toBeGreaterThanOrEqual(0);
    });
  });
});
