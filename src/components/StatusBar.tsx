import { useState } from "react";
import { GitBranch, Copy, Check, Terminal, FileCode } from "lucide-react";
import { useStore } from "../store/useStore";
import { useProviderStore } from "../store/useProviderStore";

export function StatusBar() {
  const { repoPath, branch, activeFilePath, openFiles, cursorPos } = useStore();
  const { planningAgent, developmentAgent, providers } = useProviderStore();
  const [copied, setCopied] = useState(false);

  const planProvider = providers.find((p) => p.id === planningAgent.providerId);
  const devProvider = providers.find((p) => p.id === developmentAgent.providerId);

  const displayPath = activeFilePath || repoPath;

  const handleCopyPath = () => {
    if (!displayPath) return;
    navigator.clipboard.writeText(displayPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="h-6 w-full bg-card border-t border-border flex items-center justify-between px-3 text-[11px] text-secondary select-none font-ui">
      {/* Left: Path */}
      <div className="flex items-center gap-2 overflow-hidden">
        {displayPath ? (
          <button
            onClick={handleCopyPath}
            className="flex items-center gap-1.5 hover:text-primary transition-colors truncate max-w-[340px]"
            title="Click to copy path"
          >
            <span className="truncate">{displayPath}</span>
            {copied ? <Check size={11} className="text-success flex-shrink-0" /> : <Copy size={11} className="text-muted flex-shrink-0" />}
          </button>
        ) : (
          <span className="text-muted">No active workspace</span>
        )}
      </div>

      {/* Center: Open Tabs & Git */}
      <div className="flex items-center gap-3">
        {openFiles.length > 0 && (
          <span className="px-1.5 py-0.2 rounded bg-hover border border-border text-[10px] text-muted flex items-center gap-1">
            <FileCode size={10} />
            <span>{openFiles.length} tabs open</span>
          </span>
        )}

        {branch ? (
          <div className="flex items-center gap-1 text-accent font-semibold">
            <GitBranch size={11} />
            <span>{branch}</span>
          </div>
        ) : (
          <span className="text-muted flex items-center gap-1 cursor-pointer hover:text-primary">
            <Terminal size={11} />
            <span>Init Git</span>
          </span>
        )}
      </div>

      {/* Right: Dual Agents & Line:Col */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-primary">
            <span className="text-muted font-bold">P:</span>
            <span className="text-accent">{planProvider?.name || "Anthropic"}</span>
            <span className="text-muted font-code">({planningAgent.model})</span>
          </div>

          <span className="text-muted">|</span>

          <div className="flex items-center gap-1 text-primary">
            <span className="text-muted font-bold">D:</span>
            <span className="text-success">{devProvider?.name || "Groq"}</span>
            <span className="text-muted font-code">({developmentAgent.model})</span>
          </div>
        </div>

        <span className="text-muted">|</span>

        <span className="font-code text-muted">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </span>
      </div>
    </div>
  );
}
