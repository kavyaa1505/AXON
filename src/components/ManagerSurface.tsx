import { useState, useEffect } from "react";
import { useTaskStore, AgentTask } from "../store/useTaskStore";
import { useStore } from "../store/useStore";
import { Cpu, Bot, CheckCircle, XCircle, AlertCircle, PlayCircle, Clock, ChevronDown, ChevronRight, Plus, Send, RefreshCcw, Wrench, FileText, Undo2, Zap } from "lucide-react";
import { ProviderFallbackModal } from "./ProviderFallbackModal";
import { useCheckpointStore } from "../store/useCheckpointStore";

export function ManagerSurface() {
  const { tasks, activeTaskId, setActiveTask, createTask, runTask, acceptAll, rejectAll } = useTaskStore();
  const { setViewMode, fileTree } = useStore();
  const { checkpoints, undoCheckpoint } = useCheckpointStore();

  const hasMemory = fileTree.some(node => node.name === ".axon" && node.children?.some(child => child.name === "memory.md"));

  const [fallbackModalTaskId, setFallbackModalTaskId] = useState<string | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    awaiting_review: true,
    running: true,
    completed: false,
    failed: true,
    rejected: false,
  });

  const [newTaskPrompt, setNewTaskPrompt] = useState("");
  const [newTaskRole, setNewTaskRole] = useState<"planning" | "development">("planning");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const tasksList = Object.values(tasks).sort((a, b) => b.createdAt - a.createdAt);

  const groups: Record<string, AgentTask[]> = {
    awaiting_review: tasksList.filter(t => t.status === "awaiting_review"),
    running: tasksList.filter(t => t.status === "running"),
    failed: tasksList.filter(t => t.status === "failed"),
    rejected: tasksList.filter(t => t.status === "rejected"),
    completed: tasksList.filter(t => t.status === "completed"),
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openTask = (taskId: string) => {
    setActiveTask(taskId);
    setViewMode("editor");
  };

  const handleCreateTask = () => {
    if (!newTaskPrompt.trim()) return;
    const id = createTask(newTaskPrompt, newTaskRole);
    // Passing empty contextStr here; AgentPanel builds it from active file. 
    // For manager surface, it's global, so empty context is fine or we can pass a basic context.
    runTask(id, newTaskPrompt, "", newTaskRole === "development");
    setNewTaskPrompt("");
  };

  const handleGenerateMemory = () => {
    const id = createTask("Generate Initial Project Memory", "planning");
    const treeStr = JSON.stringify(fileTree, ['name', 'isDir', 'children'], 2);
    const prompt = `Please scan the provided file tree of this project and propose a starter .axon/memory.md covering what you can infer (stack, obvious conventions from file structure).
Output a single edit block for .axon/memory.md.`;
    const context = `### Project Structure\n\`\`\`json\n${treeStr}\n\`\`\``;
    
    // Pass isEditMode = true so the parser looks for edit blocks even though role is 'planning'
    runTask(id, prompt, context, true);
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getElapsedSeconds = (timestamp: number) => {
    return Math.floor((now - timestamp) / 1000);
  };

  const renderGroup = (key: string, title: string, tasks: AgentTask[], Icon: any, iconColor: string) => {
    if (tasks.length === 0) return null;
    const isExpanded = expandedGroups[key];

    return (
      <div key={key} className="mb-6">
        <button 
          onClick={() => toggleGroup(key)}
          className="flex items-center gap-2 w-full text-left font-bold text-primary mb-3 hover:text-accent transition-colors select-none"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Icon size={16} className={iconColor} />
          <span>{title}</span>
          <span className="bg-secondary px-2 py-0.5 rounded-full text-[10px] text-muted font-normal ml-2">{tasks.length}</span>
        </button>
        
        {isExpanded && (
          <div className="space-y-3 pl-6">
            {tasks.map(task => {
              const RoleIcon = task.agentRole === "development" ? Cpu : Bot;
              const pendingMsgIdx = task.messages.findLastIndex(m => m.edits && m.edits.some(e => e.status === "pending"));
              const hasPending = pendingMsgIdx !== -1;
              const previewMsg = task.messages[task.messages.length - 1]?.content || "";
              const isLongRunning = task.status === "running" && getElapsedSeconds(task.createdAt) > 60;

              return (
                <div 
                  key={task.id} 
                  className={`bg-card border ${activeTaskId === task.id ? "border-accent/50" : "border-border"} rounded-lg p-4 flex flex-col gap-3 hover:border-accent/50 transition-colors shadow-sm`}
                >
                  <div className="flex items-start justify-between cursor-pointer" onClick={() => openTask(task.id)}>
                    <div className="flex-1 overflow-hidden pr-4">
                      <h3 className="font-semibold text-primary text-sm truncate" title={task.title}>{task.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                        <div className="flex items-center gap-1 capitalize">
                          <RoleIcon size={12} /> {task.agentRole}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} /> {getRelativeTime(task.createdAt)}
                        </div>
                        {isLongRunning && (
                          <div className="text-warning flex items-center gap-1">
                            <AlertCircle size={12} /> Running for {Math.floor(getElapsedSeconds(task.createdAt) / 60)}m
                          </div>
                        )}
                        {task.error && (
                          <div className="text-error truncate max-w-[200px]" title={task.error}>
                            Error: {task.error}
                          </div>
                        )}
                        {task.estimatedCost ? (
                          <div className="flex items-center gap-1 text-muted font-mono" title={`${task.tokensUsed?.input} IN / ${task.tokensUsed?.output} OUT`}>
                            <Zap size={10} className="text-warning/80" />
                            ${task.estimatedCost.toFixed(3)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                       <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                         task.status === "running" ? "bg-accent/10 text-accent animate-pulse" :
                         task.status === "awaiting_review" ? "bg-warning/10 text-warning" :
                         task.status === "failed" ? "bg-error/10 text-error" :
                         "bg-secondary text-muted"
                       }`}>
                         {task.status.replace("_", " ")}
                       </span>
                    </div>
                  </div>
                  
                  {task.status === "failed" && (
                    <div className="mt-2 pt-3 border-t border-border flex items-center justify-between">
                      <div className="text-xs text-muted truncate max-w-lg">
                        {task.error}
                      </div>
                      <div className="flex gap-2 shrink-0 pl-4">
                        {(task.errorKind === "QuotaExceeded" || task.errorKind === "AuthInvalid") ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setFallbackModalTaskId(task.id); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white hover:bg-opacity-80 rounded text-xs transition-colors"
                          >
                            <Wrench size={14} /> Fix Provider
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); runTask(task.id); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-hover hover:bg-secondary rounded text-xs transition-colors border border-border"
                          >
                            <RefreshCcw size={14} /> Retry
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {hasPending && task.status === "awaiting_review" && (
                    <div className="mt-2 pt-3 border-t border-border flex items-center justify-between">
                      <div className="text-xs text-muted">
                        {task.messages[pendingMsgIdx]?.edits?.length || 0} files modified
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); rejectAll(task.id, pendingMsgIdx); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-hover hover:bg-error/20 hover:text-error rounded text-xs transition-colors"
                        >
                          <XCircle size={14} /> Reject All
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); acceptAll(task.id, pendingMsgIdx); }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white hover:bg-opacity-80 rounded text-xs transition-colors"
                        >
                          <CheckCircle size={14} /> Accept All
                        </button>
                      </div>
                    </div>
                  )}

                  {task.status === "completed" && (
                    checkpoints.some(c => c.taskId === task.id) ? (() => {
                      const latestCp = [...checkpoints].reverse().find(c => c.taskId === task.id);
                      return latestCp && (
                        <div className="mt-2 pt-3 border-t border-border flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); undoCheckpoint(latestCp.id); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-muted/20 hover:bg-muted/30 text-primary rounded text-xs transition-colors"
                          >
                            <Undo2 size={14} /> Undo Last Edit
                          </button>
                        </div>
                      );
                    })() : null
                  )}
                  
                  {!hasPending && previewMsg && (
                    <div className="text-[11px] text-muted truncate mt-1">
                      {previewMsg.replace(/\n/g, " ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-background flex flex-col font-ui text-sm overflow-hidden">
      <div className="p-6 border-b border-border bg-card flex-shrink-0">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2 mb-4">
          <Cpu className="text-accent" /> Task Manager
        </h1>
        
        {/* Spawn New Task */}
        <div className="flex gap-2 max-w-3xl">
          <select 
            value={newTaskRole} 
            onChange={(e) => setNewTaskRole(e.target.value as "planning" | "development")}
            className="bg-secondary border border-border text-primary text-xs rounded-md px-3 focus:outline-none focus:border-accent"
          >
            <option value="planning">Ask (Plan)</option>
            <option value="development">Edit (Dev)</option>
          </select>
          <input
            type="text"
            value={newTaskPrompt}
            onChange={(e) => setNewTaskPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
            placeholder="Start a new background task..."
            className="flex-1 bg-secondary border border-border rounded-md px-4 py-2 text-primary text-sm focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleCreateTask}
            disabled={!newTaskPrompt.trim()}
            className="bg-accent text-white px-4 py-2 rounded-md hover:bg-opacity-80 disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto pb-12">
          {tasksList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-border rounded-xl bg-secondary/50">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4 text-muted">
                <Send size={24} />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">No Active Tasks</h3>
              <p className="text-muted max-w-sm text-sm mb-6">
                Tasks you spawn will appear here. They run fully in the background, allowing you to orchestrate multiple agents at once.
              </p>
              
              {!hasMemory && fileTree.length > 0 && (
                <button
                  onClick={handleGenerateMemory}
                  className="bg-secondary border border-border text-primary px-4 py-2 rounded-md hover:border-accent hover:text-accent transition-colors flex items-center gap-2"
                >
                  <FileText size={16} /> Generate Initial Project Memory
                </button>
              )}
            </div>
          ) : (
            <>
              {renderGroup("awaiting_review", "Awaiting Review", groups.awaiting_review, AlertCircle, "text-warning")}
              {renderGroup("running", "Running", groups.running, PlayCircle, "text-accent animate-pulse")}
              {renderGroup("failed", "Failed", groups.failed, XCircle, "text-error")}
              {renderGroup("rejected", "Rejected", groups.rejected, XCircle, "text-muted")}
              {renderGroup("completed", "Completed", groups.completed, CheckCircle, "text-success")}
            </>
          )}
        </div>
      </div>
      
      {fallbackModalTaskId && (
        <ProviderFallbackModal 
          taskId={fallbackModalTaskId} 
          onCancel={() => setFallbackModalTaskId(null)} 
        />
      )}
    </div>
  );
}
