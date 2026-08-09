import { useState, useRef, useEffect } from "react";
import { Send, Cpu, Sparkles, X, Check, CheckCheck, XCircle } from "lucide-react";
import { sendMessage, ChatMessage } from "../lib/apiRouter";
import { useProviderStore } from "../store/useProviderStore";
import { useStore } from "../store/useStore";
import { FileNode, readFileContent } from "../lib/fileService";
import { useTaskStore } from "../store/useTaskStore";
import { EditProposal } from "./EditProposal";
import { ProviderFallbackModal } from "./ProviderFallbackModal";
import { TaskMessageList } from "./TaskMessageList";

function flattenFileTree(nodes: FileNode[], prefix = ""): { path: string; name: string }[] {
  let result: { path: string; name: string }[] = [];
  for (const node of nodes) {
    if (node.isDir && node.children) {
      result = result.concat(flattenFileTree(node.children, prefix));
    } else if (!node.isDir) {
      result.push({ path: node.path, name: node.name });
    }
  }
  return result;
}

export function AgentPanel() {
  const { planningAgent, developmentAgent, providers } = useProviderStore();
  const { fileTree, openFiles, activeFilePath, repoPath, syncFileContent } = useStore();
  const { tasks, activeTaskId, createTask, runTask, acceptEdit, rejectEdit, acceptAll, rejectAll } = useTaskStore();

  const [mode, setMode] = useState<"ask" | "edit">("ask");
  const [prompt, setPrompt] = useState("");
  
  const [fallbackModalTaskId, setFallbackModalTaskId] = useState<string | null>(null);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeAgent = mode === "ask" ? planningAgent : developmentAgent;
  const activeTask = activeTaskId ? tasks[activeTaskId] : null;
  const messages = activeTask?.messages || [];
  const isLoading = activeTask?.status === "running";
  const error = activeTask?.error || null;
  const errorKind = activeTask?.errorKind || null;

  const allFiles = flattenFileTree(fileTree);
  const filteredFiles = mentionQuery !== null
    ? allFiles.filter(f => f.name.toLowerCase().includes(mentionQuery.toLowerCase()) || f.path.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 10)
    : [];

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPrompt(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\-\./\\]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (path: string) => {
    if (!textareaRef.current || mentionQuery === null) return;
    const cursor = textareaRef.current.selectionStart;
    const val = prompt;
    const textBeforeCursor = val.slice(0, cursor);
    const textAfterCursor = val.slice(cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\-\./\\]*)$/);
    if (match) {
      const start = cursor - match[0].length;
      const newPrompt = val.slice(0, start) + `@${path} ` + textAfterCursor;
      setPrompt(newPrompt);
      setMentionQuery(null);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = start + path.length + 2;
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredFiles.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredFiles.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredFiles[mentionIndex].path);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const buildContextString = async (userText: string) => {
    let contextStr = "";
    const matches = userText.match(/@([a-zA-Z0-9_\-\./\\]+)/g) || [];
    const mentionedPaths = new Set(matches.map(m => m.slice(1)));

    if (mode === "edit" && activeFilePath && !mentionedPaths.has(activeFilePath)) {
      mentionedPaths.add(activeFilePath);
    }

    if (mentionedPaths.size > 0) {
      for (const path of mentionedPaths) {
        let content = "";
        const openFile = openFiles.find(f => f.path === path);
        if (openFile) {
          content = openFile.content;
        } else {
          try {
            content = await readFileContent(path);
          } catch (err) {
            content = "// File not found or unreadable";
          }
        }
        contextStr += `### Open file: ${path}\n\`\`\`\n${content}\n\`\`\`\n\n`;
      }
    }
    return contextStr;
  };

  const handleSend = async (runInBackground = false) => {
    if (!prompt.trim() || isLoading) return;
    const userText = prompt;
    setPrompt("");
    setMentionQuery(null);

    let contextStr = "";
    try {
      contextStr = await buildContextString(userText);
    } catch (e) {
      console.warn("Failed to build context", e);
    }

    let taskId = activeTaskId;
    
    // Create new task if running in background or if no active task exists
    if (runInBackground || !taskId) {
      const newTaskId = createTask(userText, mode === "ask" ? "planning" : "development");
      if (!runInBackground) {
        useTaskStore.getState().setActiveTask(newTaskId);
      }
      taskId = newTaskId;
    }

    runTask(taskId, userText, contextStr, mode === "edit");
  };


  return (
    <div className="h-full flex flex-col bg-secondary text-sm select-none relative">
      {fallbackModalTaskId && (
        <ProviderFallbackModal
          taskId={fallbackModalTaskId}
          onCancel={() => setFallbackModalTaskId(null)}
        />
      )}

      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between font-semibold">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span>AXON AGENT</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-normal bg-card rounded p-1 border border-border">
          <button
            onClick={() => setMode("ask")}
            className={`px-3 py-1 rounded ${mode === "ask" ? "bg-accent text-white" : "hover:bg-hover text-muted"}`}
          >
            Ask
          </button>
          <button
            onClick={() => setMode("edit")}
            className={`px-3 py-1 rounded ${mode === "edit" ? "bg-accent text-white" : "hover:bg-hover text-muted"}`}
          >
            Edit
          </button>
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative">
        <TaskMessageList 
          messages={messages}
          taskId={activeTaskId}
          onAcceptAll={acceptAll}
          onRejectAll={rejectAll}
          onAcceptEdit={acceptEdit}
          onRejectEdit={rejectEdit}
        />

        {error && (
          <div className="p-3 rounded bg-error/10 border border-error/30 text-error flex flex-col gap-3">
            <div className="text-xs">
              <strong>Agent Error:</strong> {error}
            </div>
            {(errorKind === "QuotaExceeded" || errorKind === "AuthInvalid") ? (
              <button
                onClick={() => activeTaskId && setFallbackModalTaskId(activeTaskId)}
                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-accent text-white hover:bg-opacity-80 rounded text-xs transition-colors"
              >
                <XCircle size={14} /> Fix Provider
              </button>
            ) : (
              <button
                onClick={() => activeTaskId && runTask(activeTaskId)}
                className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-hover hover:bg-secondary rounded text-xs transition-colors border border-border"
              >
                <XCircle size={14} /> Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="p-3 border-t border-border bg-secondary relative">
        {/* Mention Popup */}
        {mentionQuery !== null && (
          <div className="absolute bottom-full left-3 mb-2 w-64 bg-card border border-border rounded shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
            {filteredFiles.length === 0 ? (
              <div className="p-2 text-xs text-muted">No files found.</div>
            ) : (
              filteredFiles.map((f, i) => (
                <div
                  key={f.path}
                  onClick={() => insertMention(f.path)}
                  onMouseEnter={() => setMentionIndex(i)}
                  className={`p-2 text-xs cursor-pointer flex items-center justify-between ${i === mentionIndex ? "bg-accent/20 text-accent font-semibold" : "text-primary hover:bg-hover"}`}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="text-[10px] text-muted truncate max-w-[100px] ml-2">{f.path}</span>
                </div>
              ))
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={handleKeyDown}
            placeholder={mode === "ask" ? "Ask a question..." : "Describe a change to make..."}
            className="w-full bg-card border border-border rounded-md px-3 py-2 pr-9 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent resize-none min-h-[70px]"
          />
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
            <button
              onClick={() => handleSend(true)}
              disabled={isLoading || !prompt.trim()}
              title="Run in Background"
              className="p-1.5 rounded bg-card border border-border text-primary hover:bg-hover disabled:opacity-50 transition-colors"
            >
              <Cpu size={13} />
            </button>
            <button
              onClick={() => handleSend(false)}
              disabled={isLoading || !prompt.trim()}
              className="p-1.5 rounded bg-accent text-white hover:bg-opacity-80 disabled:opacity-50 transition-opacity"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
