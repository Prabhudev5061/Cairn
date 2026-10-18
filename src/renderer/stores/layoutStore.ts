import { create } from 'zustand';

interface LayoutState {
  isSidebarCollapsed: boolean;
  isRightPanelCollapsed: boolean;
  isVimMode: boolean;
  vimMode: string;
  activeLeftTab: 'files' | 'search';
  activeCenterView: 'editor' | 'graph';
  activeRightTab: 'backlinks' | 'localGraph';
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setActiveLeftTab: (tab: 'files' | 'search') => void;
  setActiveCenterView: (view: 'editor' | 'graph') => void;
  toggleGlobalGraph: () => void;
  setActiveRightTab: (tab: 'backlinks' | 'localGraph') => void;
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  isTemplatePickerOpen: boolean;
  openTemplatePicker: () => void;
  closeTemplatePicker: () => void;
  toggleTemplatePicker: () => void;
  toggleVimMode: () => void;
  setVimMode: (mode: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarCollapsed: false,
  isRightPanelCollapsed: false, // Backlinks visible by default in Phase 3
  isVimMode: false,
  vimMode: 'NORMAL',
  activeLeftTab: 'files',
  activeCenterView: 'editor',
  activeRightTab: 'backlinks',
  isCommandPaletteOpen: false,
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  isTemplatePickerOpen: false,
  openTemplatePicker: () => set({ isTemplatePickerOpen: true }),
  closeTemplatePicker: () => set({ isTemplatePickerOpen: false }),
  toggleTemplatePicker: () =>
    set((state) => ({ isTemplatePickerOpen: !state.isTemplatePickerOpen })),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toggleRightPanel: () => set((state) => ({ isRightPanelCollapsed: !state.isRightPanelCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setRightPanelCollapsed: (collapsed) => set({ isRightPanelCollapsed: collapsed }),
  setActiveLeftTab: (tab) => set({ activeLeftTab: tab, isSidebarCollapsed: false }),
  setActiveCenterView: (view) => set({ activeCenterView: view }),
  toggleGlobalGraph: () =>
    set((state) => ({
      activeCenterView: state.activeCenterView === 'graph' ? 'editor' : 'graph'
    })),
  setActiveRightTab: (tab) => set({ activeRightTab: tab, isRightPanelCollapsed: false }),
  toggleVimMode: () =>
    set((state) => ({
      isVimMode: !state.isVimMode,
      vimMode: 'NORMAL'
    })),
  setVimMode: (mode) => set({ vimMode: mode })
}));

