import { create } from 'zustand';
import {
  chooseVault,
  createNoteFile,
  deleteNoteFile,
  getAllIndexEntries,
  getAppSettings,
  getBacklinks,
  getCurrentVault,
  listVaultTree,
  openVaultPath,
  readNoteFile,
  removeRecentVault,
  renameNoteRefactor,
  searchVault,
  subscribeVaultSwitched,
  subscribeWatcherAlerts,
  subscribeWatcherEvents,
  writeNoteFile
} from '../ipc';
import { resolveWikilink } from '@shared/linking/resolver';
import { isSupportedNotePath } from '@shared/formats/registry';
import {
  BacklinkItem,
  FileMetadata,
  NoteIndexEntry,
  RecentVault,
  SearchResultItem,
  VaultTreeNode,
  WatcherAlert,
  WatcherEvent
} from '@shared/ipc';

function computeWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

interface VaultState {
  currentVault: { path: string; name: string } | null;
  tree: VaultTreeNode | null;
  activeNotePath: string | null;
  activeNoteContent: string;
  activeNoteMetadata: FileMetadata | null;
  isDirty: boolean;
  conflictBanner: string | null;
  watcherAlert: WatcherAlert | null;
  wordCount: number;
  cursorPosition: { line: number; col: number };
  isLoading: boolean;
  backlinks: BacklinkItem[];
  searchQuery: string;
  searchResults: SearchResultItem[];
  isSearching: boolean;
  recentVaults: RecentVault[];
  isVaultSwitcherOpen: boolean;

  init: () => Promise<void>;
  openVaultDialog: () => Promise<void>;
  openVaultByPath: (path: string) => Promise<void>;
  refreshTree: () => Promise<void>;
  openNote: (path: string) => Promise<void>;
  openNoteByLink: (target: string, subpath?: string | null) => Promise<void>;
  updateContent: (content: string) => void;
  setCursorPosition: (line: number, col: number) => void;
  saveActiveNote: () => Promise<void>;
  createNote: (relPath: string) => Promise<void>;
  renameNote: (oldRelPath: string, newRelPath: string) => Promise<void>;
  deleteNote: (relPath: string) => Promise<void>;
  refreshBacklinks: () => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  dismissConflict: () => void;
  dismissAlert: () => void;
  reloadFromDisk: () => Promise<void>;
  closeActiveNote: () => void;
  setVaultSwitcherOpen: (open: boolean) => void;
  loadRecentVaults: () => Promise<void>;
  openRecentVault: (path: string) => Promise<void>;
  removeRecentVaultFromRecents: (path: string) => Promise<void>;
}


let isSubscribed = false;

export const useVaultStore = create<VaultState>((set, get) => ({
  currentVault: null,
  tree: null,
  activeNotePath: null,
  activeNoteContent: '',
  activeNoteMetadata: null,
  isDirty: false,
  conflictBanner: null,
  watcherAlert: null,
  wordCount: 0,
  cursorPosition: { line: 1, col: 1 },
  isLoading: false,
  backlinks: [],
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  recentVaults: [],
  isVaultSwitcherOpen: false,

  init: async () => {
    if (!isSubscribed) {
      isSubscribed = true;

      // Listen for custom link navigation events from wikilink widgets
      window.addEventListener('cairn:navigate-link', (e: Event) => {
        const custom = e as CustomEvent<{ target: string; subpath: string | null }>;
        if (custom.detail) {
          void get().openNoteByLink(custom.detail.target, custom.detail.subpath);
        }
      });

      subscribeWatcherEvents(async (event: WatcherEvent) => {
        const { activeNotePath, isDirty, refreshTree, refreshBacklinks } = get();
        await refreshTree();
        await refreshBacklinks();

        if (event.path === activeNotePath) {
          if (event.type === 'delete') {
            set({
              activeNotePath: null,
              activeNoteContent: '',
              isDirty: false,
              conflictBanner: 'Active note was deleted on disk'
            });
          } else if (event.type === 'update') {
            if (!isDirty) {
              const res = await readNoteFile(activeNotePath);
              if (res.ok) {
                set({
                  activeNoteContent: res.value.content,
                  activeNoteMetadata: res.value.metadata,
                  wordCount: computeWordCount(res.value.content)
                });
              }
            } else {
              set({
                conflictBanner:
                  'Note was modified externally on disk. Save to overwrite or reload to discard changes.'
              });
            }
          }
        }
      });

      subscribeWatcherAlerts((alert: WatcherAlert) => {
        set({ watcherAlert: alert });
      });

      subscribeVaultSwitched(async (vault) => {
        set({
          currentVault: vault,
          activeNotePath: null,
          activeNoteContent: '',
          activeNoteMetadata: null,
          isDirty: false,
          conflictBanner: null,
          backlinks: []
        });
        await get().refreshTree();
        await get().loadRecentVaults();
      });
    }

    const res = await getCurrentVault();
    if (res.ok && res.value) {
      set({ currentVault: res.value });
      await get().refreshTree();
    }
    await get().loadRecentVaults();
  },

  openVaultDialog: async () => {
    const res = await chooseVault();
    if (res.ok && res.value) {
      set({
        currentVault: res.value,
        activeNotePath: null,
        activeNoteContent: '',
        activeNoteMetadata: null,
        isDirty: false,
        conflictBanner: null,
        backlinks: []
      });
      await get().refreshTree();
      await get().loadRecentVaults();
    }
  },

  openVaultByPath: async (vaultPath: string) => {
    const res = await openVaultPath(vaultPath);
    if (res.ok && res.value) {
      set({
        currentVault: res.value,
        activeNotePath: null,
        activeNoteContent: '',
        activeNoteMetadata: null,
        isDirty: false,
        conflictBanner: null,
        backlinks: []
      });
      await get().refreshTree();
      await get().loadRecentVaults();
    }
  },

  refreshTree: async () => {
    const res = await listVaultTree();
    if (res.ok) {
      set({ tree: res.value });
    }
  },

  openNote: async (notePath: string) => {
    const { isDirty, saveActiveNote } = get();
    if (isDirty) {
      await saveActiveNote();
    }

    set({ isLoading: true });
    const res = await readNoteFile(notePath);
    set({ isLoading: false });

    if (res.ok) {
      set({
        activeNotePath: notePath,
        activeNoteContent: res.value.content,
        activeNoteMetadata: res.value.metadata,
        isDirty: false,
        conflictBanner: null,
        wordCount: computeWordCount(res.value.content),
        cursorPosition: { line: 1, col: 1 }
      });
      void get().refreshBacklinks();
    }
  },

  openNoteByLink: async (target: string, subpath?: string | null) => {
    const { activeNotePath, openNote, createNote } = get();
    const entriesRes = await getAllIndexEntries();
    const entries = entriesRes.ok ? entriesRes.value : [];
    const allFiles = entries.map((e) => e.path);
    const indexMap = new Map<string, NoteIndexEntry>();
    for (const e of entries) {
      indexMap.set(e.path, e);
    }

    const link = {
      raw: `[[${target}]]`,
      target,
      subpath: subpath ?? null,
      subpathType: null,
      alias: null,
      isEmbed: false,
      from: 0,
      to: 0
    };

    const resolved = resolveWikilink(link, activeNotePath || '', allFiles, indexMap);

    if (resolved.exists && resolved.resolvedPath) {
      await openNote(resolved.resolvedPath);
    } else if (resolved.resolvedPath) {
      await createNote(resolved.resolvedPath);
    }
  },

  refreshBacklinks: async () => {
    const { activeNotePath } = get();
    if (!activeNotePath) {
      set({ backlinks: [] });
      return;
    }
    const res = await getBacklinks(activeNotePath);
    if (res.ok) {
      set({ backlinks: res.value });
    }
  },

  setSearchQuery: async (query: string) => {
    set({ searchQuery: query });
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    set({ isSearching: true });
    const res = await searchVault(query);
    if (res.ok) {
      set({ searchResults: res.value, isSearching: false });
    } else {
      set({ searchResults: [], isSearching: false });
    }
  },

  updateContent: (content: string) => {
    set({
      activeNoteContent: content,
      isDirty: true,
      wordCount: computeWordCount(content)
    });
  },

  setCursorPosition: (line: number, col: number) => {
    set({ cursorPosition: { line, col } });
  },

  saveActiveNote: async () => {
    const { activeNotePath, activeNoteContent, activeNoteMetadata, refreshBacklinks } = get();
    if (!activeNotePath) return;

    const res = await writeNoteFile(
      activeNotePath,
      activeNoteContent,
      activeNoteMetadata ?? undefined
    );
    if (res.ok) {
      set({ isDirty: false, conflictBanner: null });
      await refreshBacklinks();
    }
  },

  createNote: async (relPath: string) => {
    const normalized = isSupportedNotePath(relPath) ? relPath : `${relPath}.md`;
    const res = await createNoteFile(normalized);
    if (res.ok) {
      await get().refreshTree();
      await get().openNote(normalized);
    }
  },

  renameNote: async (oldRelPath: string, newRelPath: string) => {
    const normalized = isSupportedNotePath(newRelPath) ? newRelPath : `${newRelPath}.md`;
    const res = await renameNoteRefactor(oldRelPath, normalized);
    if (res.ok) {
      const { activeNotePath } = get();
      if (activeNotePath === oldRelPath) {
        set({ activeNotePath: normalized });
      }
      await get().refreshTree();
      await get().refreshBacklinks();
    }
  },

  deleteNote: async (relPath: string) => {
    const res = await deleteNoteFile(relPath);
    if (res.ok) {
      const { activeNotePath } = get();
      if (activeNotePath === relPath) {
        set({
          activeNotePath: null,
          activeNoteContent: '',
          activeNoteMetadata: null,
          isDirty: false
        });
      }
      await get().refreshTree();
    }
  },

  dismissConflict: () => set({ conflictBanner: null }),
  dismissAlert: () => set({ watcherAlert: null }),

  reloadFromDisk: async () => {
    const { activeNotePath } = get();
    if (!activeNotePath) return;
    const res = await readNoteFile(activeNotePath);
    if (res.ok) {
      set({
        activeNoteContent: res.value.content,
        activeNoteMetadata: res.value.metadata,
        isDirty: false,
        conflictBanner: null,
        wordCount: computeWordCount(res.value.content)
      });
    }
  },

  closeActiveNote: () => {
    set({
      activeNotePath: null,
      activeNoteContent: '',
      activeNoteMetadata: null,
      isDirty: false,
      conflictBanner: null
    });
  },

  setVaultSwitcherOpen: (open: boolean) => set({ isVaultSwitcherOpen: open }),

  loadRecentVaults: async () => {
    const res = await getAppSettings();
    if (res.ok && res.value && res.value.recentVaults) {
      set({ recentVaults: res.value.recentVaults });
    }
  },

  openRecentVault: async (vaultPath: string) => {
    await get().openVaultByPath(vaultPath);
    set({ isVaultSwitcherOpen: false });
    await get().loadRecentVaults();
  },

  removeRecentVaultFromRecents: async (vaultPath: string) => {
    const res = await removeRecentVault(vaultPath);
    if (res.ok) {
      set({ recentVaults: res.value });
    }
  }
}));

