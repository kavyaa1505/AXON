import { create } from 'zustand';
import { FileNode, readDirTree, readFileContent, writeFileContent, createFile, createFolder, deleteItem, renameItem, selectFolder } from '../lib/fileService';
import { useTaskStore } from './useTaskStore';
import { useCheckpointStore } from './useCheckpointStore';

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}

interface StoreState {
  // Provider settings
  activeProvider: string;
  setActiveProvider: (provider: string) => void;
  activeModel: string;
  setActiveModel: (model: string) => void;

  // Github / Workspace settings
  repoPath: string | null;
  setRepoPath: (path: string | null) => void;
  branch: string | null;
  setBranch: (branch: string | null) => void;

  // Filesystem & Editor Tab state
  fileTree: FileNode[];
  setFileTree: (tree: FileNode[]) => void;
  openFiles: OpenFile[];
  activeFilePath: string | null;
  cursorPos: { line: number; col: number };
  setCursorPos: (pos: { line: number; col: number }) => void;

  // File Actions
  openWorkspaceFolder: (customPath?: string) => Promise<string | null>;
  refreshFileTree: () => Promise<void>;
  openFile: (filePath: string, fileName?: string) => Promise<void>;
  closeFile: (filePath: string) => void;
  setActiveFilePath: (filePath: string) => void;
  updateActiveFileContent: (content: string) => void;
  syncFileContent: (path: string, content: string) => void;
  saveActiveFile: () => Promise<void>;
  createNewFile: (parentPath: string, name: string) => Promise<void>;
  createNewFolder: (parentPath: string, name: string) => Promise<void>;
  deleteWorkspaceItem: (path: string) => Promise<void>;
  renameWorkspaceItem: (oldPath: string, newPath: string) => Promise<void>;
  handleWriteWithSafety: (path: string, newContent: string) => Promise<boolean>;

  // Layout state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  viewMode: "editor" | "manager";
  setViewMode: (mode: "editor" | "manager") => void;

  memorySizeWarning: boolean;
  setMemorySizeWarning: (warn: boolean) => void;

  resetAllUserState: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  activeProvider: 'Anthropic',
  setActiveProvider: (provider) => set({ activeProvider: provider }),
  activeModel: 'Claude 3.5 Sonnet',
  setActiveModel: (model) => set({ activeModel: model }),

  repoPath: null,
  setRepoPath: (path) => {
    set({ repoPath: path });
    if (path) {
      get().refreshFileTree();
    }
  },
  branch: 'main',
  setBranch: (branch) => set({ branch }),

  fileTree: [],
  setFileTree: (fileTree) => set({ fileTree }),
  openFiles: [],
  activeFilePath: null,
  cursorPos: { line: 1, col: 1 },
  setCursorPos: (cursorPos) => set({ cursorPos }),

  openWorkspaceFolder: async (customPath) => {
    const targetPath = customPath || (await selectFolder());
    if (!targetPath) return null;

    set({ repoPath: targetPath });
    const folderName = targetPath.split(/[/\\]/).pop() || targetPath;
    
    // Save to recents
    try {
      const saved = localStorage.getItem("axon:recents");
      const list = saved ? JSON.parse(saved) : [];
      const updated = [
        { path: targetPath, name: folderName, lastOpened: Date.now(), pinned: false, stack: "local" },
        ...list.filter((r: any) => r.path !== targetPath)
      ].slice(0, 20);
      localStorage.setItem("axon:recents", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recents", e);
    }

    await get().refreshFileTree();
    return targetPath;
  },

  refreshFileTree: async () => {
    const { repoPath } = get();
    if (!repoPath) return;
    try {
      const tree = await readDirTree(repoPath);
      set({ fileTree: tree });
    } catch (e) {
      console.error("Failed to read file tree", e);
    }
  },

  openFile: async (filePath, fileName) => {
    const name = fileName || filePath.split(/[/\\]/).pop() || "Untitled";
    const { openFiles } = get();
    const existing = openFiles.find(f => f.path === filePath);

    if (existing) {
      set({ activeFilePath: filePath });
      return;
    }

    try {
      const content = await readFileContent(filePath);
      const newFile: OpenFile = {
        path: filePath,
        name,
        content,
        isDirty: false
      };
      set({
        openFiles: [...openFiles, newFile],
        activeFilePath: filePath
      });
    } catch (e) {
      console.error("Failed to open file", e);
    }
  },

  closeFile: (filePath) => {
    const { openFiles, activeFilePath } = get();
    const remaining = openFiles.filter(f => f.path !== filePath);
    let nextActive = activeFilePath;

    if (activeFilePath === filePath) {
      nextActive = remaining.length > 0 ? remaining[remaining.length - 1].path : null;
    }

    set({ openFiles: remaining, activeFilePath: nextActive });
  },

  setActiveFilePath: (filePath) => set({ activeFilePath: filePath }),

  updateActiveFileContent: (content) => {
    const { openFiles, activeFilePath } = get();
    if (!activeFilePath) return;

    set({
      openFiles: openFiles.map(f => f.path === activeFilePath ? { ...f, content, isDirty: true } : f)
    });
  },

  syncFileContent: (path, content) => {
    const { openFiles } = get();
    set({
      openFiles: openFiles.map(f => f.path === path ? { ...f, content, isDirty: false } : f)
    });
  },

  saveActiveFile: async () => {
    const { openFiles, activeFilePath } = get();
    if (!activeFilePath) return;

    const file = openFiles.find(f => f.path === activeFilePath);
    if (!file) return;

    try {
      await writeFileContent(file.path, file.content);
      set({
        openFiles: openFiles.map(f => f.path === activeFilePath ? { ...f, isDirty: false } : f)
      });
    } catch (e) {
      console.error("Failed to save file to disk", e);
    }
  },

  createNewFile: async (parentPath, name) => {
    const fullPath = `${parentPath}/${name}`.replace(/\/+/g, "/");
    await createFile(fullPath);
    await get().refreshFileTree();
    await get().openFile(fullPath, name);
  },

  createNewFolder: async (parentPath, name) => {
    const fullPath = `${parentPath}/${name}`.replace(/\/+/g, "/");
    await createFolder(fullPath);
    await get().refreshFileTree();
  },

  deleteWorkspaceItem: async (path) => {
    await deleteItem(path);
    get().closeFile(path);
    await get().refreshFileTree();
  },

  renameWorkspaceItem: async (oldPath, newPath) => {
    await renameItem(oldPath, newPath);
    get().closeFile(oldPath);
    await get().refreshFileTree();
  },

  handleWriteWithSafety: async (path, newContent) => {
    const { repoPath, syncFileContent } = get();
    if (repoPath && !path.startsWith(repoPath)) {
      if (!window.confirm(`AXON wants to write to ${path} which is outside your workspace. Allow?`)) {
        return false;
      }
    } else {
      const confirmed = sessionStorage.getItem("axon:write_confirmed");
      if (!confirmed) {
         if (!window.confirm(`AXON wants to write to ${path}. Allow AXON to modify files on disk?`)) {
           return false;
         }
         sessionStorage.setItem("axon:write_confirmed", "true");
      }
    }
    try {
      await writeFileContent(path, newContent);
      syncFileContent(path, newContent);
      return true;
    } catch (e) {
      console.error("Failed to write file", e);
      alert("Failed to write file");
      return false;
    }
  },

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  terminalOpen: true,
  setTerminalOpen: (open) => set({ terminalOpen: open }),
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  viewMode: "editor",
  setViewMode: (mode) => set({ viewMode: mode }),

  memorySizeWarning: false,
  setMemorySizeWarning: (warn) => set({ memorySizeWarning: warn }),

  resetAllUserState: () => {
    useTaskStore.getState().resetTasks();
    useCheckpointStore.getState().resetCheckpoints();
    set({
      repoPath: null,
      fileTree: [],
      openFiles: [],
      activeFilePath: null,
      memorySizeWarning: false,
    });
  }
}));

