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
  Code2,
  Lock,
  ListTodo,
  AlertCircle,
  PlayCircle,
  CheckCircle,
  XCircle,
  Code,
  LayoutDashboard,
  Zap
} from "lucide-react";
import { useStore } from "../store/useStore";
import { useProviderStore } from "../store/useProviderStore";
import { useAuthStore } from "../store/useAuthStore";
import { useTaskStore } from "../store/useTaskStore";

interface RecentItem {
  path: string;
  name: string;
  lastOpened: number;
}

export function Topbar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    fileTree,
    openFiles,
    activeFilePath,
    repoPath,
    terminalOpen,
    setTerminalOpen,
    setSettingsOpen,
    viewMode,
    setViewMode,
    memorySizeWarning,
    openWorkspaceFolder,
    saveActiveFile,
  } = useStore();

  const { providers, planningAgent, developmentAgent, setPlanningAgent, setDevelopmentAgent } = useProviderStore();
  const { logout, currentUser } = useAuthStore();
  const { tasks, activeTaskId, setActiveTask, sessionTotalCost } = useTaskStore();

  const [showPlanPopover, setShowPlanPopover] = useState(false);
  const [showDevPopover, setShowDevPopover] = useState(false);
  const [showFolderPopover, setShowFolderPopover] = useState(false);
  const [showTasksPopover, setShowTasksPopover] = useState(false);
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

  const tasksList = Object.values(tasks).sort((a, b) => b.createdAt - a.createdAt);
  const awaitingReviewCount = tasksList.filter(t => t.status === "awaiting_review").length;

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
          {memorySizeWarning && (
            <span className="text-warning flex items-center gap-1 text-[10px] bg-warning/10 px-2 py-0.5 rounded-full" title="Project memory is getting large — consider trimming it">
              <AlertCircle size={10} /> Memory Full
            </span>
          )}
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

        {sessionTotalCost > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted bg-secondary/50 px-2 py-1 rounded-md border border-border" title="Session API Cost">
            <Zap size={12} className="text-warning/80" />
            <span>${sessionTotalCost.toFixed(3)}</span>
          </div>
        )}

        <button
          onClick={() => logout()}
          className="p-1.5 rounded-md hover:bg-error/20 transition-colors text-secondary hover:text-error flex items-center gap-1"
          title={`Lock Session (${currentUser})`}
        >
          <Lock size={15} />
        </button>

        {/* View Toggle */}
        <div className="flex bg-card border border-border rounded-lg p-0.5 mr-2">
          <button
            onClick={() => setViewMode("editor")}
            className={`p-1 rounded-md transition-colors ${viewMode === "editor" ? "bg-accent text-white" : "text-secondary hover:text-primary hover:bg-hover"}`}
            title="Editor View"
          >
            <Code size={14} />
          </button>
          <button
            onClick={() => setViewMode("manager")}
            className={`p-1 rounded-md transition-colors ${viewMode === "manager" ? "bg-accent text-white" : "text-secondary hover:text-primary hover:bg-hover"}`}
            title="Manager View"
          >
            <LayoutDashboard size={14} />
          </button>
        </div>

        <button
          onClick={() => setTerminalOpen(!terminalOpen)}
          className={`p-1.5 rounded-md hover:bg-hover transition-colors ${terminalOpen ? "text-accent" : "text-secondary"}`}
          title="Toggle Terminal (Ctrl+`)"
        >
          <TerminalIcon size={18} />
        </button>

        {/* Tasks Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTasksPopover(!showTasksPopover)}
            className={`p-1.5 rounded-md hover:bg-hover transition-colors flex items-center relative ${showTasksPopover ? "text-accent" : "text-secondary"}`}
            title="Background Tasks"
          >
            <ListTodo size={18} />
            {awaitingReviewCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                {awaitingReviewCount}
              </span>
            )}
          </button>
          
          {showTasksPopover && (
            <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-2xl p-2 z-50 text-xs">
              <div className="font-bold text-primary border-b border-border pb-2 mb-2 px-2 flex justify-between items-center">
                <span>Background Tasks</span>
                <span className="text-muted font-normal text-[10px]">{tasksList.length} total</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {tasksList.length === 0 ? (
                  <div className="text-muted p-2 text-center">No tasks running.</div>
                ) : (
                  tasksList.map(task => {
                    let Icon = CheckCircle;
                    let iconColor = "text-success";
                    if (task.status === "running") { Icon = PlayCircle; iconColor = "text-accent animate-pulse"; }
                    if (task.status === "awaiting_review") { Icon = AlertCircle; iconColor = "text-warning"; }
                    if (task.status === "failed") { Icon = XCircle; iconColor = "text-error"; }

                    return (
                      <button
                        key={task.id}
                        onClick={() => {
                          setViewMode("editor");
                          setActiveTask(task.id);
                          setShowTasksPopover(false);
                        }}
                        className={`w-full text-left p-2 rounded flex items-start gap-2 transition-colors ${activeTaskId === task.id && viewMode === "editor" ? "bg-accent/10 border border-accent/20" : "hover:bg-hover"}`}
                      >
                        <Icon size={14} className={`${iconColor} mt-0.5 flex-shrink-0`} />
                        <div className="overflow-hidden">
                          <div className={`font-semibold truncate ${activeTaskId === task.id ? "text-accent" : "text-primary"}`}>
                            {task.title}
                          </div>
                          <div className="text-[10px] text-muted capitalize">
                            {task.status.replace("_", " ")} • {task.agentRole}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

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
