import { CheckCheck, XCircle, Undo2 } from "lucide-react";
import { ChatMessage } from "../lib/apiRouter";
import { EditProposal } from "./EditProposal";
import { WalkthroughCard } from "./WalkthroughCard";
import { useCheckpointStore } from "../store/useCheckpointStore";

interface TaskMessageListProps {
  messages: ChatMessage[];
  taskId: string | null;
  onAcceptAll: (taskId: string, msgIndex: number) => void;
  onRejectAll: (taskId: string, msgIndex: number) => void;
  onAcceptEdit: (taskId: string, msgIndex: number, editIndex: number) => void;
  onRejectEdit: (taskId: string, msgIndex: number, editIndex: number) => void;
}

export function TaskMessageList({ 
  messages, 
  taskId, 
  onAcceptAll, 
  onRejectAll, 
  onAcceptEdit, 
  onRejectEdit 
}: TaskMessageListProps) {
  
  const displayContent = (content: string) => {
    return content.replace(/### Open file: [^\n]+\n```[\s\S]*?\n```\n\n/g, "");
  };

  const { checkpoints, undoCheckpoint } = useCheckpointStore();

  if (messages.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded bg-accent flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <div className="text-primary w-full text-xs">
            <p>Welcome to <strong>AXON IDE</strong>.</p>
            <p className="text-muted mt-2">
              Toggle between <strong>Ask</strong> (Planning) and <strong>Edit</strong> (Development) mode.<br />
              In Edit mode, I can propose direct code modifications.<br />
              Type <code className="bg-hover px-1 rounded">@</code> to mention files contextually.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {messages.map((m, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <div
            className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold ${
              m.role === "user"
                ? "bg-card border border-border text-primary"
                : "bg-accent text-white"
            }`}
          >
            {m.role === "user" ? "U" : "A"}
          </div>
          <div className="text-primary w-full text-xs">
            {m.content && <div className="whitespace-pre-wrap leading-relaxed">{displayContent(m.content)}</div>}
            
            {m.edits && m.edits.length > 0 && (
              <div className="mt-4 space-y-3">
                {m.edits.length > 1 && m.edits.some(e => e.status === "pending") && (
                  <div className="flex justify-end gap-2 mb-2">
                    <button 
                      onClick={() => taskId && onRejectAll(taskId, idx)} 
                      className="flex items-center gap-1 px-2 py-1 bg-hover hover:bg-error/20 hover:text-error rounded text-[11px] transition-colors"
                    >
                      <XCircle size={12} /> Reject All
                    </button>
                    <button 
                      onClick={() => taskId && onAcceptAll(taskId, idx)} 
                      className="flex items-center gap-1 px-2 py-1 bg-accent text-white hover:bg-opacity-80 rounded text-[11px] transition-colors"
                    >
                      <CheckCheck size={12} /> Accept All
                    </button>
                  </div>
                )}

                {taskId && checkpoints.some(c => c.id === `${taskId}-${idx}-all`) && m.edits.every(e => e.status !== "pending") && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => undoCheckpoint(`${taskId}-${idx}-all`)}
                      className="flex items-center gap-1 px-2 py-1 bg-muted/20 hover:bg-muted/30 text-primary rounded text-[11px] transition-colors"
                    >
                      <Undo2 size={12} /> Undo this batch
                    </button>
                  </div>
                )}

                {m.edits.map((edit, eIdx) => {
                  const hasCheckpoint = taskId && checkpoints.some(c => c.id === `${taskId}-${idx}-${eIdx}`);
                  return (
                    <div key={eIdx} className="relative group">
                      <EditProposal
                        path={edit.path}
                        newContent={edit.newContent}
                        status={edit.status}
                        onAccept={() => taskId && onAcceptEdit(taskId, idx, eIdx)}
                        onReject={() => taskId && onRejectEdit(taskId, idx, eIdx)}
                      />
                      {edit.status === "accepted" && hasCheckpoint && (
                        <button
                          onClick={() => undoCheckpoint(`${taskId}-${idx}-${eIdx}`)}
                          className="absolute top-2 right-2 p-1.5 rounded bg-background border border-border text-muted hover:text-primary hover:bg-hover transition-colors opacity-0 group-hover:opacity-100 z-10"
                          title="Undo this edit"
                        >
                          <Undo2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {m.walkthroughStatus && (
                <WalkthroughCard 
                  content={m.walkthrough || ""} 
                  filesChangedCount={m.edits?.filter(e => e.status === "accepted").length || 0}
                  isLoading={m.walkthroughStatus === "loading"}
                />
            )}
          </div>
        </div>
      ))}
    </>
  );
}
