import { useState, useEffect } from "react";
import { Plus, FolderOpen, Download, Pin, Trash2, Clock, Code2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { NewProjectModal } from "./modals/NewProjectModal";
import { CloneRepoModal } from "./modals/CloneRepoModal";

interface RecentItem {
  path: string;
  name: string;
  lastOpened: number;
  stack?: string;
  pinned?: boolean;
}

export function WelcomeScreen() {
  const { openWorkspaceFolder } = useStore();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [cloneRepoOpen, setCloneRepoOpen] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);

  useEffect(() => {
    loadRecents();
  }, []);

  const loadRecents = () => {
    const currentUser = localStorage.getItem("axon:last-session");
    if (!currentUser) return;
    const saved = localStorage.getItem(`axon:${currentUser}:recents`);
    if (saved) {
      try {
        setRecents(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recents", e);
      }
    } else {
      setRecents([]);
    }
  };

  const saveRecents = (items: RecentItem[]) => {
    const currentUser = localStorage.getItem("axon:last-session");
    if (!currentUser) return;
    setRecents(items);
    localStorage.setItem(`axon:${currentUser}:recents`, JSON.stringify(items));
  };

  const handleOpenFolder = async () => {
    await openWorkspaceFolder();
    loadRecents();
  };

  const openPath = async (path: string) => {
    await openWorkspaceFolder(path);
    loadRecents();
  };

  const togglePin = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recents.map((r) => (r.path === path ? { ...r, pinned: !r.pinned } : r));
    saveRecents(updated);
  };

  const deleteRecent = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recents.filter((r) => r.path !== path);
    saveRecents(updated);
  };

  // Sort pinned first, then by lastOpened
  const sortedRecents = [...recents].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.lastOpened - a.lastOpened;
  });

  return (
    <div className="h-full w-full bg-background flex flex-col items-center justify-center p-8 overflow-y-auto select-none">
      <div className="max-w-4xl w-full space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-accent/20">
              A
            </div>
            <h1 className="text-3xl font-extrabold tracking-wider text-primary">AXON IDE</h1>
          </div>
          <p className="text-secondary text-sm">Elite AI-Native Software Development Environment</p>
        </div>

        {/* 3 Entry Point Cards */}
        <div className="grid grid-cols-3 gap-5">
          {/* Card 1: New Project */}
          <div
            onClick={() => setNewProjectOpen(true)}
            className="group bg-card border border-border hover:border-accent p-6 rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/5 flex flex-col justify-between h-48"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors mb-4">
                <Plus size={20} />
              </div>
              <h3 className="font-bold text-base text-primary mb-1">New Project</h3>
              <p className="text-xs text-secondary leading-relaxed">Start from scratch with instant project templates</p>
            </div>
            <span className="text-[11px] text-accent font-semibold tracking-wide flex items-center gap-1 group-hover:underline">
              Scaffold project &rarr;
            </span>
          </div>

          {/* Card 2: Open Folder */}
          <div
            onClick={handleOpenFolder}
            className="group bg-card border border-border hover:border-accent p-6 rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/5 flex flex-col justify-between h-48"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors mb-4">
                <FolderOpen size={20} />
              </div>
              <h3 className="font-bold text-base text-primary mb-1">Open Folder</h3>
              <p className="text-xs text-secondary leading-relaxed">Open an existing local directory or drag & drop</p>
            </div>
            <span className="text-[11px] text-accent font-semibold tracking-wide flex items-center gap-1 group-hover:underline">
              Browse filesystem &rarr;
            </span>
          </div>

          {/* Card 3: Clone Repo */}
          <div
            onClick={() => setCloneRepoOpen(true)}
            className="group bg-card border border-border hover:border-accent p-6 rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/5 flex flex-col justify-between h-48"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors mb-4">
                <Download size={20} />
              </div>
              <h3 className="font-bold text-base text-primary mb-1">Clone Repo</h3>
              <p className="text-xs text-secondary leading-relaxed">Clone from GitHub, GitLab, Bitbucket or any git URL</p>
            </div>
            <span className="text-[11px] text-accent font-semibold tracking-wide flex items-center gap-1 group-hover:underline">
              Clone from remote &rarr;
            </span>
          </div>
        </div>

        {/* Recent Workspaces */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Clock size={14} />
              <span>Recent Workspaces</span>
            </h2>
            <span className="text-[11px] text-muted">{sortedRecents.length} projects</span>
          </div>

          {sortedRecents.length === 0 ? (
            <div className="bg-card/50 border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted">
              No recent projects yet. Create a project or open a folder to get started.
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {sortedRecents.map((item) => (
                <div
                  key={item.path}
                  onClick={() => openPath(item.path)}
                  className="group bg-card border border-border hover:border-accent/40 p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-hover flex items-center justify-center text-secondary group-hover:text-accent flex-shrink-0">
                      <Code2 size={16} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-primary truncate">{item.name}</span>
                        {item.stack && (
                          <span className="px-1.5 py-0.5 rounded bg-hover border border-border text-[10px] text-muted">
                            {item.stack}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted truncate">{item.path}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => togglePin(item.path, e)}
                      className={`p-1.5 rounded hover:bg-hover transition-colors ${
                        item.pinned ? "text-accent" : "text-muted hover:text-secondary"
                      }`}
                      title={item.pinned ? "Unpin project" : "Pin project to top"}
                    >
                      <Pin size={13} className={item.pinned ? "fill-accent" : ""} />
                    </button>
                    <button
                      onClick={(e) => deleteRecent(item.path, e)}
                      className="p-1.5 rounded hover:bg-hover text-muted hover:text-error transition-colors"
                      title="Remove from recents"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NewProjectModal isOpen={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
      <CloneRepoModal isOpen={cloneRepoOpen} onClose={() => setCloneRepoOpen(false)} />
    </div>
  );
}
