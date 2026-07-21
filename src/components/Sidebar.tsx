import React, { useState } from "react";
import {
  FolderOpen,
  Search,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit2,
  Copy,
  RotateCw,
  LogOut
} from "lucide-react";
import { useStore } from "../store/useStore";
import { FileTree } from "./FileTree";
import { FileNode } from "../lib/fileService";

export function Sidebar() {
  const {
    repoPath,
    fileTree,
    openWorkspaceFolder,
    refreshFileTree,
    createNewFile,
    createNewFolder,
    deleteWorkspaceItem,
    renameWorkspaceItem,
    setRepoPath
  } = useStore();

  const [filter, setFilter] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleNewFile = async (targetNode?: FileNode) => {
    closeContextMenu();
    const parentPath = targetNode ? (targetNode.isDir ? targetNode.path : targetNode.path.split(/[/\\]/).slice(0, -1).join("/")) : (repoPath || "");
    const name = prompt("Enter new file name:", "index.ts");
    if (name && parentPath) {
      await createNewFile(parentPath, name);
    }
  };

  const handleNewFolder = async (targetNode?: FileNode) => {
    closeContextMenu();
    const parentPath = targetNode ? (targetNode.isDir ? targetNode.path : targetNode.path.split(/[/\\]/).slice(0, -1).join("/")) : (repoPath || "");
    const name = prompt("Enter new folder name:", "components");
    if (name && parentPath) {
      await createNewFolder(parentPath, name);
    }
  };

  const handleRename = async (node: FileNode) => {
    closeContextMenu();
    const newName = prompt("Enter new name:", node.name);
    if (newName && newName !== node.name) {
      const parent = node.path.split(/[/\\]/).slice(0, -1).join("/");
      const newPath = `${parent}/${newName}`;
      await renameWorkspaceItem(node.path, newPath);
    }
  };

  const handleDelete = async (node: FileNode) => {
    closeContextMenu();
    if (confirm(`Are you sure you want to delete ${node.name}?`)) {
      await deleteWorkspaceItem(node.path);
    }
  };

  const handleCopyPath = (node: FileNode) => {
    closeContextMenu();
    navigator.clipboard.writeText(node.path);
  };

  const folderName = repoPath ? repoPath.split(/[/\\]/).pop() || repoPath : "NO WORKSPACE";

  return (
    <div className="h-full w-full flex flex-col bg-secondary text-sm select-none relative" onClick={closeContextMenu}>
      {/* Search & Action Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between font-semibold text-xs text-muted">
          <span className="truncate uppercase tracking-wider font-bold text-accent">{folderName}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleNewFile()}
              className="p-1 rounded hover:bg-hover text-secondary hover:text-primary transition-colors"
              title="New File"
            >
              <FilePlus size={14} />
            </button>
            <button
              onClick={() => handleNewFolder()}
              className="p-1 rounded hover:bg-hover text-secondary hover:text-primary transition-colors"
              title="New Folder"
            >
              <FolderPlus size={14} />
            </button>
            <button
              onClick={() => refreshFileTree()}
              className="p-1 rounded hover:bg-hover text-secondary hover:text-primary transition-colors"
              title="Refresh File Tree"
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        {/* Filter Search Input */}
        <div className="relative">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-background border border-border rounded pl-7 pr-2 py-1 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent"
          />
          <Search size={12} className="absolute left-2 top-2 text-muted" />
        </div>
      </div>

      {/* Real Recursive File Tree Area */}
      <div className="flex-1 overflow-y-auto p-2">
        {!repoPath ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-3">
            <FolderOpen size={32} className="text-muted opacity-40" />
            <div className="text-xs text-muted">No folder open</div>
            <button
              onClick={() => openWorkspaceFolder()}
              className="px-3 py-1.5 rounded bg-accent text-white font-semibold text-xs hover:bg-opacity-80 transition-opacity"
            >
              Open Folder
            </button>
          </div>
        ) : (
          <FileTree nodes={fileTree} filter={filter} onContextMenu={handleContextMenu} />
        )}
      </div>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 bg-card border border-border rounded-md shadow-2xl py-1 text-xs space-y-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-semibold text-[10px] text-muted border-b border-border truncate">
            {contextMenu.node.name}
          </div>
          <button
            onClick={() => handleNewFile(contextMenu.node)}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2 text-primary"
          >
            <FilePlus size={13} />
            <span>New File</span>
          </button>
          <button
            onClick={() => handleNewFolder(contextMenu.node)}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2 text-primary"
          >
            <FolderPlus size={13} />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => handleRename(contextMenu.node)}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2 text-primary"
          >
            <Edit2 size={13} />
            <span>Rename</span>
          </button>
          <button
            onClick={() => handleCopyPath(contextMenu.node)}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2 text-primary"
          >
            <Copy size={13} />
            <span>Copy Path</span>
          </button>
          <div className="border-t border-border my-1"></div>
          <button
            onClick={() => handleDelete(contextMenu.node)}
            className="w-full text-left px-3 py-1.5 hover:bg-hover text-error flex items-center gap-2"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Footer Workspace Action */}
      <div className="p-3 border-t border-border flex gap-2">
        {repoPath ? (
          <button
            onClick={() => setRepoPath(null)}
            className="w-full py-1.5 px-2 rounded border border-border bg-hover hover:bg-border text-xs text-secondary hover:text-primary flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut size={13} />
            <span>Close Workspace</span>
          </button>
        ) : (
          <button
            onClick={() => openWorkspaceFolder()}
            className="w-full py-1.5 px-2 rounded border border-accent/40 bg-accent/10 hover:bg-accent/20 text-xs text-accent font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <FolderOpen size={13} />
            <span>Open Workspace</span>
          </button>
        )}
      </div>
    </div>
  );
}
