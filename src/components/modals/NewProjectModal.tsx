import { useState } from "react";
import { X, Folder, Plus, Check } from "lucide-react";
import { useStore } from "../../store/useStore";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEMPLATES = [
  { id: "blank", name: "Blank Project", desc: "Empty workspace" },
  { id: "node", name: "Node / Express", desc: "package.json & index.js" },
  { id: "react", name: "React / Vite", desc: "package.json & App.tsx" },
  { id: "python", name: "Python", desc: "main.py & requirements.txt" },
  { id: "rust", name: "Rust", desc: "Cargo.toml & src/main.rs" },
  { id: "go", name: "Go", desc: "go.mod & main.go" },
  { id: "next", name: "Next.js", desc: "Next App Router setup" },
];

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const { setRepoPath, setBranch } = useStore();
  const [projectName, setProjectName] = useState("my-axon-app");
  const [location, setLocation] = useState("C:\\Projects");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");

  if (!isOpen) return null;

  const handleBrowse = async () => {
    try {
      // @ts-ignore
      if (window.__TAURI__) {
        // @ts-ignore
        const selected = await window.__TAURI__.dialog.open({ directory: true });
        if (selected) setLocation(selected as string);
      }
    } catch (e) {
      console.warn("Tauri dialog unavailable, fallback to manual path.");
    }
  };

  const handleCreate = () => {
    const slug = projectName.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    const fullPath = `${location.replace(/[/\\]$/, "")}\\${slug}`;

    // Set workspace path in store
    setRepoPath(fullPath);
    setBranch("main");

    // Add to recents
    const recents = JSON.parse(localStorage.getItem("axon:recents") || "[]");
    const newRecent = {
      path: fullPath,
      name: slug,
      lastOpened: Date.now(),
      stack: selectedTemplate,
      pinned: false,
    };
    const updated = [newRecent, ...recents.filter((r: any) => r.path !== fullPath)].slice(0, 20);
    localStorage.setItem("axon:recents", JSON.stringify(updated));

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-[540px] bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col text-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base">
            <Plus size={18} className="text-accent" />
            <span>Create New Project</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-hover text-secondary hover:text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-secondary">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent"
              placeholder="my-axon-app"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-secondary">Location</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleBrowse}
                className="px-3 py-1 bg-hover border border-border rounded hover:bg-border flex items-center gap-1.5"
              >
                <Folder size={14} />
                <span>Browse</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-secondary">Template (Optional)</label>
            <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
              {TEMPLATES.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`p-2.5 rounded border cursor-pointer transition-colors flex items-start justify-between ${
                    selectedTemplate === t.id
                      ? "border-accent bg-accent/10"
                      : "border-border bg-background hover:bg-hover"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">{t.name}</div>
                    <div className="text-[11px] text-muted">{t.desc}</div>
                  </div>
                  {selectedTemplate === t.id && <Check size={14} className="text-accent flex-shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-border bg-secondary flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 rounded border border-border bg-hover hover:bg-border text-xs">
            Cancel
          </button>
          <button onClick={handleCreate} className="px-4 py-1.5 rounded bg-accent text-white hover:bg-opacity-80 text-xs font-semibold">
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
