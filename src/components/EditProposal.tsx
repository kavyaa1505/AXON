import React, { useEffect, useState } from "react";
import { diffLines, Change } from "diff";
import { Check, X, ChevronDown, ChevronRight, FileCode, Undo2 } from "lucide-react";
import { readFileContent } from "../lib/fileService";
import { useStore } from "../store/useStore";

export interface EditProposalProps {
  path: string;
  newContent: string;
  status: "pending" | "accepted" | "rejected" | "reverted";
  onAccept: () => void;
  onReject: () => void;
}

export function EditProposal({ path, newContent, status, onAccept, onReject }: EditProposalProps) {
  const [oldContent, setOldContent] = useState<string | null>(null);
  const [differences, setDifferences] = useState<Change[]>([]);
  const [expanded, setExpanded] = useState(status === "pending");
  const { openFiles } = useStore();

  const statusColors = {
    pending: "border-warning/50 bg-warning/5",
    accepted: "border-success/50 bg-success/5",
    rejected: "border-error/50 bg-error/5",
    reverted: "border-muted/50 bg-muted/5 opacity-75",
  };

  const StatusIcon = {
    pending: null,
    accepted: <Check size={14} className="text-success" />,
    rejected: <X size={14} className="text-error" />,
    reverted: <Undo2 size={14} className="text-muted" />,
  }[status];

  useEffect(() => {
    let isMounted = true;
    const loadOldContent = async () => {
      try {
        const openFile = openFiles.find(f => f.path === path);
        if (openFile) {
          if (isMounted) setOldContent(openFile.content);
        } else {
          const content = await readFileContent(path);
          if (isMounted) setOldContent(content);
        }
      } catch (e) {
        if (isMounted) setOldContent(""); // new file
      }
    };
    loadOldContent();
    return () => { isMounted = false; };
  }, [path]);

  useEffect(() => {
    if (oldContent !== null) {
      setDifferences(diffLines(oldContent, newContent));
    }
  }, [oldContent, newContent]);

  if (oldContent === null) {
    return <div className="text-xs p-2 text-muted">Loading diff for {path}...</div>;
  }

  const isNewFile = oldContent === "";

  return (
    <div className={`my-3 border rounded-lg overflow-hidden ${statusColors[status]}`}>
      <div 
        className="flex items-center justify-between bg-card px-3 py-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <FileCode size={14} className="text-accent" />
          <span className="truncate max-w-[200px]" title={path}>{path}</span>
          {isNewFile && <span className="px-1.5 py-0.5 rounded bg-success/20 text-success text-[10px]">NEW</span>}
        </div>
        {status === "pending" ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={onReject}
              className="p-1 rounded text-muted hover:text-error hover:bg-error/10 transition-colors"
              title="Reject edit"
            >
              <X size={14} />
            </button>
            <button 
              onClick={onAccept}
              className="p-1 rounded text-muted hover:text-success hover:bg-success/10 transition-colors"
              title="Accept edit"
            >
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
              status === "accepted" ? "text-success" : 
              status === "rejected" ? "text-error" : "text-muted"
            }`}>
              {status}
            </span>
            {StatusIcon}
          </div>
        )}
      </div>

      {expanded && (
        <div className={`border-t border-border p-3 overflow-x-auto text-[11px] leading-relaxed font-mono ${status === "reverted" ? "line-through opacity-70" : ""}`}>
        {differences.map((part, i) => {
          const bgColor = part.added ? "bg-success/20" : part.removed ? "bg-error/20" : "bg-transparent";
          const textColor = part.added ? "text-success" : part.removed ? "text-error" : "text-primary";
          const prefix = part.added ? "+" : part.removed ? "-" : " ";
          
          if (!part.added && !part.removed) {
             return <div key={i} className={`whitespace-pre-wrap ${textColor}`}>{part.value}</div>;
          }

          const lines = part.value.replace(/\n$/, "").split("\n");
          return lines.map((line, j) => (
             <div key={`${i}-${j}`} className={`whitespace-pre-wrap ${bgColor} ${textColor} px-1 rounded-sm`}>
               <span className="opacity-50 select-none mr-2">{prefix}</span>
               {line}
             </div>
          ));
        })}
      </div>
    </div>
  );
}
