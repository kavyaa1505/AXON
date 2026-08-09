import React, { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface WalkthroughCardProps {
  content: string;
  filesChangedCount: number;
  isLoading: boolean;
}

export function WalkthroughCard({ content, filesChangedCount, isLoading }: WalkthroughCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 border border-success/30 bg-success/5 rounded-lg overflow-hidden text-primary text-xs">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2.5 hover:bg-success/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 size={16} className="text-success animate-spin" />
          ) : (
            <CheckCircle2 size={16} className="text-success" />
          )}
          <span className="font-semibold text-success">
            {isLoading ? "Summarizing applied changes..." : `✓ Applied — ${filesChangedCount} file${filesChangedCount !== 1 ? 's' : ''} changed`}
          </span>
        </div>
        <div className="text-muted">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 border-t border-success/20 bg-background/50">
          {isLoading && !content ? (
            <div className="text-muted animate-pulse">Generating summary...</div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-[11px] leading-relaxed 
                            prose-headings:text-primary prose-headings:font-bold prose-headings:mb-2 prose-headings:mt-4 
                            first:prose-headings:mt-0 prose-p:text-primary/90 prose-p:mb-3 
                            prose-ul:my-2 prose-li:my-0.5">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
