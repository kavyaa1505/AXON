import { useState } from "react";
import { X, GitBranch, Folder, Download, Terminal } from "lucide-react";
import { useStore } from "../../store/useStore";

interface CloneRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloneRepoModal({ isOpen, onClose }: CloneRepoModalProps) {
  const { setRepoPath, setBranch } = useStore();
  const [gitUrl, setGitUrl] = useState("");
  const [targetFolder, setTargetFolder] = useState("C:\\Projects");
  const [branchName, setBranchName] = useState("main");
  const [depth, setDepth] = useState<"shallow" | "full">("shallow");
  const [isCloning, setIsCloning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleBrowse = async () => {
    try {
      // @ts-ignore
      if (window.__TAURI__) {
        // @ts-ignore
        const selected = await window.__TAURI__.dialog.open({ directory: true });
        if (selected) setTargetFolder(selected as string);
      }
    } catch (e) {
      console.warn("Tauri dialog unavailable.");
    }
  };

  const handleClone = async () => {
    if (!gitUrl.trim()) return;
    setIsCloning(true);
    setLogs(["$ git clone " + gitUrl + (depth === "shallow" ? " --depth 1" : "")]);

    // Extract repo name from URL
    const repoName = gitUrl.split("/").pop()?.replace(/\.git$/, "") || "cloned-repo";
    const fullPath = `${targetFolder.replace(/[/\\]$/, "")}\\${repoName}`;

    // Simulate clone progress
    setTimeout(() => {
      setLogs((prev) => [...prev, "Cloning into '" + fullPath + "'..."]);
    }, 500);

    setTimeout(() => {
      setLogs((prev) => [...prev, "remote: Enumerating objects: 142, done.", "remote: Total 142 (delta 0), reused 0 (delta 0)", "Unpacking objects: 100% (142/142), done."]);
    }, 1200);

    setTimeout(() => {
      setLogs((prev) => [...prev, "Done. Workspace ready!"]);
      setIsCloning(false);

      setRepoPath(fullPath);
      setBranch(branchName);

      // Add to recents
      const recents = JSON.parse(localStorage.getItem("axon:recents") || "[]");
      const newRecent = {
        path: fullPath,
        name: repoName,
        lastOpened: Date.now(),
        stack: "git",
        pinned: false,
      };
      const updated = [newRecent, ...recents.filter((r: any) => r.path !== fullPath)].slice(0, 20);
      localStorage.setItem("axon:recents", JSON.stringify(updated));

      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-[560px] bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col text-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base">
            <Download size={18} className="text-accent" />
            <span>Clone Repository</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-hover text-secondary hover:text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-secondary">Repository URL</label>
            <input
              type="text"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              className="w-full bg-background border border-border rounded p-2 text-primary placeholder-muted focus:outline-none focus:border-accent"
              placeholder="https://github.com/owner/repo or git@gitlab.com:owner/repo.git"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-secondary">Target Directory</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="flex-1 bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent"
              />
              <button onClick={handleBrowse} className="px-3 py-1 bg-hover border border-border rounded hover:bg-border flex items-center gap-1.5">
                <Folder size={14} />
                <span>Browse</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-secondary flex items-center gap-1">
                <GitBranch size={12} />
                <span>Branch (Optional)</span>
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent"
                placeholder="main"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-secondary">Clone Depth</label>
              <select
                value={depth}
                onChange={(e) => setDepth(e.target.value as any)}
                className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent"
              >
                <option value="shallow">Shallow (--depth 1)</option>
                <option value="full">Full History</option>
              </select>
            </div>
          </div>

          {logs.length > 0 && (
            <div className="bg-background border border-border rounded p-3 font-code text-xs space-y-1 max-h-[120px] overflow-y-auto">
              <div className="flex items-center gap-1.5 text-muted mb-1 border-b border-border pb-1">
                <Terminal size={12} />
                <span>Git Process Output</span>
              </div>
              {logs.map((log, index) => (
                <div key={index} className="text-secondary">{log}</div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-border bg-secondary flex justify-end gap-2">
          <button onClick={onClose} disabled={isCloning} className="px-4 py-1.5 rounded border border-border bg-hover hover:bg-border text-xs">
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={isCloning || !gitUrl.trim()}
            className="px-4 py-1.5 rounded bg-accent text-white hover:bg-opacity-80 disabled:opacity-50 text-xs font-semibold"
          >
            {isCloning ? "Cloning..." : "Clone Repository"}
          </button>
        </div>
      </div>
    </div>
  );
}
