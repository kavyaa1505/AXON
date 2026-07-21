import { useState, useEffect } from "react";
import {
  Settings,
  Sidebar as SidebarIcon,
  Terminal as TerminalIcon,
  Cpu,
  Bot,
  ChevronDown,
  FolderOpen,
  Save,
  Clock,
  Code2
} from "lucide-react";
import { useStore } from "../store/useStore";
import { useProviderStore } from "../store/useProviderStore";

interface RecentItem {
  path: string;
  name: string;
  lastOpened: number;
}

export function Topbar() {
  const {
    branch,
    repoPath,
    openWorkspaceFolder,
    saveActiveFile,
    openFiles,
    activeFilePath,
    sidebarOpen,
    setSidebarOpen,
    terminalOpen,
    setTerminalOpen,
    setSettingsOpen,
  } = useStore();

  const { providers, planningAgent, developmentAgent, setPlanningAgent, setDevelopmentAgent } = useProviderStore();

  const [showPlanPopover, setShowPlanPopover] = useState(false);
  const [showDevPopover, setShowDevPopover] = useState(false);
  const [showFolderPopover, setShowFolderPopover] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);

  const activeFile = openFiles.find((f) => f.path === activeFilePath);
  const planProvider = providers.find((p) => p.id === planningAgent.providerId);
  const devProvider = providers.find((p) => p.id === developmentAgent.providerId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("axon:recents");
      if (saved) setRecents(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, [repoPath, showFolderPopover]);

  const folderName = repoPath ? repoPath.split(/[/\\]/).pop() || repoPath : "Open Workspace...";

  return (
    <div className="h-12 w-full bg-background border-b border-border flex items-center px-4 justify-between select-none relative z-30 font-ui">
      {/* Left Branding & Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-1.5 rounded-md hover:bg-hover transition-colors ${sidebarOpen ? "text-accent" : "text-secondary"}`}
          title="Toggle Explorer Sidebar (Ctrl+B)"
        >
          <SidebarIcon size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-accent/20">
            A
          </div>
          <span className="font-extrabold text-sm tracking-wider text-primary">AXON</span>
        </div>
      </div>

      {/* Center Workspace Path & Quick Workspace Switcher Popover */}
      <div className="relative">
        <button
          onClick={() => {
            setShowFolderPopover(!showFolderPopover);
            setShowPlanPopover(false);
            setShowDevPopover(false);
          }}
          className="flex items-center gap-2 px-3 py-1 rounded-md bg-card border border-border hover:border-accent text-xs font-semibold text-primary transition-colors max-w-[340px]"
        >
          <FolderOpen size={14} className="text-accent flex-shrink-0" />
          <span className="truncate">{folderName}</span>
          {branch && <span className="text-muted font-normal">• {branch}</span>}
          <ChevronDown size={12} className="text-muted flex-shrink-0 ml-1" />
        </button>

        {/* Workspace Dropdown Popover */}
        {showFolderPopover && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 bg-card border border-border rounded-lg shadow-2xl p-3 z-50 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold text-primary">Workspace Manager</span>
              <button
                onClick={async () => {
                  setShowFolderPopover(false);
                  await openWorkspaceFolder();
                }}
                className="px-2.5 py-1 rounded bg-accent text-white font-semibold text-[11px] hover:bg-opacity-80 flex items-center gap-1"
              >
                <FolderOpen size={12} />
                <span>Open Folder</span>
              </button>
            </div>

            {/* Current Workspace Details */}
            {repoPath ? (
              <div className="p-2 rounded bg-background border border-border space-y-1 text-[11px]">
                <div className="text-muted">Active Workspace:</div>
                <div className="font-code text-primary truncate">{repoPath}</div>
              </div>
            ) : (
              <div className="text-muted text-[11px] italic">No workspace open. Select a folder below.</div>
            )}

            {/* Recent Workspaces */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold uppercase text-muted tracking-wider flex items-center gap-1">
                <Clock size={11} />
                <span>Recent Workspaces</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {recents.length === 0 ? (
                  <div className="text-muted text-[11px] p-2">No recent workspaces</div>
                ) : (
                  recents.map((item) => (
                    <button
                      key={item.path}
                      onClick={async () => {
                        setShowFolderPopover(false);
                        await openWorkspaceFolder(item.path);
                      }}
                      className="w-full text-left p-1.5 rounded hover:bg-hover flex items-center gap-2 transition-colors group"
                    >
                      <Code2 size={13} className="text-muted group-hover:text-accent flex-shrink-0" />
                      <div className="overflow-hidden">
                        <div className="font-semibold text-primary truncate text-[11px]">{item.name}</div>
                        <div className="text-[10px] text-muted truncate">{item.path}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Save Button, Dual Agents, Settings */}
      <div className="flex items-center gap-2.5">
        {/* Quick Save Button */}
        {activeFile && (
          <button
            onClick={() => saveActiveFile()}
            disabled={!activeFile.isDirty}
            className={`p-1.5 rounded-md border text-xs font-semibold flex items-center gap-1 transition-all ${
              activeFile.isDirty
                ? "bg-accent text-white border-accent shadow-md shadow-accent/20 animate-pulse"
                : "bg-card border-border text-muted hover:text-primary"
            }`}
            title="Save Active File (Ctrl+S)"
          >
            <Save size={14} />
          </button>
        )}

        {/* Planning Agent Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPlanPopover(!showPlanPopover);
              setShowDevPopover(false);
              setShowFolderPopover(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border hover:border-accent text-xs transition-colors"
          >
            <Cpu size={13} className="text-accent" />
            <span className="font-bold text-accent">P:</span>
            <span className="text-primary truncate max-w-[90px]">{planProvider?.name || "Anthropic"}</span>
            <ChevronDown size={12} className="text-muted" />
          </button>

          {showPlanPopover && (
            <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-2xl p-3 z-50 text-xs space-y-2">
              <div className="font-bold text-accent border-b border-border pb-1">Planning Agent</div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-muted mb-1">Provider</label>
                  <select
                    value={planningAgent.providerId}
                    onChange={(e) => {
                      const newProv = providers.find((p) => p.id === e.target.value);
                      setPlanningAgent({ providerId: e.target.value, model: newProv?.models[0] || "" });
                    }}
                    className="w-full bg-background border border-border rounded p-1.5 text-primary"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">Model</label>
                  <select
                    value={planningAgent.model}
                    onChange={(e) => setPlanningAgent({ ...planningAgent, model: e.target.value })}
                    className="w-full bg-background border border-border rounded p-1.5 text-primary"
                  >
                    {planProvider?.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Development Agent Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setShowDevPopover(!showDevPopover);
              setShowPlanPopover(false);
              setShowFolderPopover(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border hover:border-success text-xs transition-colors"
          >
            <Bot size={13} className="text-success" />
            <span className="font-bold text-success">D:</span>
            <span className="text-primary truncate max-w-[90px]">{devProvider?.name || "Groq"}</span>
            <ChevronDown size={12} className="text-muted" />
          </button>

          {showDevPopover && (
            <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-2xl p-3 z-50 text-xs space-y-2">
              <div className="font-bold text-success border-b border-border pb-1">Development Agent</div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-muted mb-1">Provider</label>
                  <select
                    value={developmentAgent.providerId}
                    onChange={(e) => {
                      const newProv = providers.find((p) => p.id === e.target.value);
                      setDevelopmentAgent({ providerId: e.target.value, model: newProv?.models[0] || "" });
                    }}
                    className="w-full bg-background border border-border rounded p-1.5 text-primary"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">Model</label>
                  <select
                    value={developmentAgent.model}
                    onChange={(e) => setDevelopmentAgent({ ...developmentAgent, model: e.target.value })}
                    className="w-full bg-background border border-border rounded p-1.5 text-primary"
                  >
                    {devProvider?.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-border"></div>

        <button
          onClick={() => setTerminalOpen(!terminalOpen)}
          className={`p-1.5 rounded-md hover:bg-hover transition-colors ${terminalOpen ? "text-accent" : "text-secondary"}`}
          title="Toggle Terminal (Ctrl+`)"
        >
          <TerminalIcon size={18} />
        </button>

        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-md hover:bg-hover transition-colors text-secondary hover:text-primary"
          title="Open Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
