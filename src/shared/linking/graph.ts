import type { GraphData, GraphFilterOptions, GraphLink, GraphNode } from './types';

/**
 * Curated color palette matching tokens.css dark-first creative suite theme.
 */
export const GRAPH_PALETTE = [
  '#8b5cf6', // Accent violet
  '#3b82f6', // Sapphire blue
  '#10b981', // Emerald green
  '#f59e0b', // Amber yellow
  '#ec4899', // Rose pink
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1'  // Indigo
];

/**
 * Extracts the node identifier string from either a raw string ID, an object reference, or null/undefined.
 */
export function getLinkId(endpoint?: string | GraphNode | { id?: string } | null): string {
  if (typeof endpoint === 'string') {
    return endpoint;
  }
  return endpoint?.id || '';
}

/**
 * Simple deterministic string hashing for consistent color assignment.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Assigns deterministic color accents to nodes based on primary tag or top-level folder.
 */
export function assignNodeColors(nodes: GraphNode[]): Record<string, string> {
  const colorMap: Record<string, string> = {};

  for (const node of nodes) {
    if (node.tags && node.tags.length > 0 && node.tags[0]) {
      const primaryTag = node.tags[0].replace(/^#/, '').toLowerCase();
      const colorIndex = hashString(primaryTag) % GRAPH_PALETTE.length;
      colorMap[node.id] = GRAPH_PALETTE[colorIndex]!;
    } else if (node.path.includes('/')) {
      const topFolder = node.path.split('/')[0]!.toLowerCase();
      const colorIndex = hashString(topFolder) % GRAPH_PALETTE.length;
      colorMap[node.id] = GRAPH_PALETTE[colorIndex]!;
    } else {
      colorMap[node.id] = '#8b5cf6'; // Default primary accent
    }
  }

  return colorMap;
}

/**
 * Filters graph data based on search text, selected tags, selected folders, and orphan state.
 */
export function filterGraph(data: GraphData, filters: GraphFilterOptions): GraphData {
  const query = filters.searchQuery?.trim().toLowerCase() || '';
  const selectedTags = (filters.selectedTags || []).map((t) => t.replace(/^#/, '').toLowerCase());
  const selectedFolders = (filters.selectedFolders || []).map((f) => f.toLowerCase());
  const hideOrphans = Boolean(filters.hideOrphans);

  const matchedNodes: GraphNode[] = [];
  const matchedNodeIds = new Set<string>();

  for (const node of data.nodes) {
    // 1. Orphan filter
    if (hideOrphans && (node.isOrphan || node.degree === 0)) {
      continue;
    }

    // 2. Tag filter: must match at least one selected tag
    if (selectedTags.length > 0) {
      const nodeTags = (node.tags || []).map((t) => t.replace(/^#/, '').toLowerCase());
      const hasMatchingTag = selectedTags.some((tag) => nodeTags.includes(tag));
      if (!hasMatchingTag) {
        continue;
      }
    }

    // 3. Folder filter: path must start with one of the selected folders
    if (selectedFolders.length > 0) {
      const nodePathLower = node.path.toLowerCase();
      const matchesFolder = selectedFolders.some((folder) =>
        nodePathLower.startsWith(folder.endsWith('/') ? folder : `${folder}/`)
      );
      if (!matchesFolder) {
        continue;
      }
    }

    // 4. Search query: title, path, or tags
    if (query) {
      const titleMatches = node.title.toLowerCase().includes(query);
      const pathMatches = node.path.toLowerCase().includes(query);
      const tagMatches = (node.tags || []).some((t) => t.toLowerCase().includes(query));
      if (!titleMatches && !pathMatches && !tagMatches) {
        continue;
      }
    }

    matchedNodes.push(node);
    matchedNodeIds.add(node.id);
  }

  // Filter links: both endpoints must be in matchedNodeIds
  const matchedLinks: GraphLink[] = [];
  for (const link of data.links) {
    const sourceId = getLinkId(link.source);
    const targetId = getLinkId(link.target);
    if (matchedNodeIds.has(sourceId) && matchedNodeIds.has(targetId)) {
      matchedLinks.push(link);
    }
  }

  return {
    nodes: matchedNodes,
    links: matchedLinks
  };
}

/**
 * Extracts an induced local subgraph containing rootPath and neighbors up to depth (1, 2, or 3).
 */
export function extractLocalSubgraph(
  data: GraphData,
  rootPath: string,
  depth: number = 1
): GraphData {
  if (!rootPath || !data.nodes.length) {
    return { nodes: [], links: [] };
  }

  const rootNode = data.nodes.find((n) => n.id === rootPath || n.path === rootPath);
  if (!rootNode) {
    return { nodes: [], links: [] };
  }

  // Build undirected adjacency list
  const adj = new Map<string, Set<string>>();
  for (const node of data.nodes) {
    adj.set(node.id, new Set<string>());
  }

  for (const link of data.links) {
    const s = getLinkId(link.source);
    const t = getLinkId(link.target);
    if (adj.has(s) && adj.has(t)) {
      adj.get(s)!.add(t);
      adj.get(t)!.add(s);
    }
  }

  // BFS traversal up to `depth` hops
  const visited = new Set<string>([rootNode.id]);
  let currentFrontier = [rootNode.id];

  const maxHops = Math.max(1, Math.min(depth, 3));
  for (let d = 0; d < maxHops; d++) {
    const nextFrontier: string[] = [];
    for (const nodeId of currentFrontier) {
      const neighbors = adj.get(nodeId);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            nextFrontier.push(neighbor);
          }
        }
      }
    }
    currentFrontier = nextFrontier;
    if (currentFrontier.length === 0) break;
  }

  const subgraphNodes = data.nodes.filter((n) => visited.has(n.id));
  const subgraphLinks = data.links.filter((l) => {
    const s = getLinkId(l.source);
    const t = getLinkId(l.target);
    return visited.has(s) && visited.has(t);
  });

  return {
    nodes: subgraphNodes,
    links: subgraphLinks
  };
}
