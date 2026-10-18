import { create } from 'zustand';
import type { GraphData } from '@shared/linking/types';
import { getGraphData } from '../ipc';

interface GraphState {
  graphData: GraphData | null;
  isLoading: boolean;
  searchQuery: string;
  selectedTags: string[];
  selectedFolders: string[];
  hideOrphans: boolean;
  showLabels: boolean;
  localDepth: number;
  nodeSizeMultiplier: number;
  linkDistance: number;
  hoveredNodeId: string | null;

  fetchGraphData: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setHideOrphans: (hideOrphans: boolean) => void;
  setShowLabels: (showLabels: boolean) => void;
  setLocalDepth: (depth: number) => void;
  setNodeSizeMultiplier: (multiplier: number) => void;
  setLinkDistance: (distance: number) => void;
  setHoveredNodeId: (id: string | null) => void;
  resetFilters: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graphData: null,
  isLoading: false,
  searchQuery: '',
  selectedTags: [],
  selectedFolders: [],
  hideOrphans: false,
  showLabels: true,
  localDepth: 1,
  nodeSizeMultiplier: 1.0,
  linkDistance: 45,
  hoveredNodeId: null,

  fetchGraphData: async () => {
    set({ isLoading: true });
    try {
      const res = await getGraphData();
      if (res.ok && res.value) {
        set({ graphData: res.value, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  toggleTag: (tag: string) => {
    const current = get().selectedTags;
    const normalized = tag.replace(/^#/, '');
    if (current.includes(normalized)) {
      set({ selectedTags: current.filter((t) => t !== normalized) });
    } else {
      set({ selectedTags: [...current, normalized] });
    }
  },

  setSelectedTags: (tags: string[]) =>
    set({ selectedTags: tags.map((t) => t.replace(/^#/, '')) }),

  setHideOrphans: (hideOrphans: boolean) => set({ hideOrphans }),

  setShowLabels: (showLabels: boolean) => set({ showLabels }),

  setLocalDepth: (depth: number) =>
    set({ localDepth: Math.max(1, Math.min(depth, 3)) }),

  setNodeSizeMultiplier: (multiplier: number) =>
    set({ nodeSizeMultiplier: Math.max(0.5, Math.min(multiplier, 3)) }),

  setLinkDistance: (distance: number) =>
    set({ linkDistance: Math.max(20, Math.min(distance, 150)) }),

  setHoveredNodeId: (id: string | null) => set({ hoveredNodeId: id }),

  resetFilters: () =>
    set({
      searchQuery: '',
      selectedTags: [],
      selectedFolders: [],
      hideOrphans: false
    })
}));
