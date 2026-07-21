import { useState } from "react";
import { Send, Cpu, Sparkles } from "lucide-react";
import { sendMessage, ChatMessage } from "../lib/apiRouter";
import { useProviderStore } from "../store/useProviderStore";

export function AgentPanel() {
  const { planningAgent, providers } = useProviderStore();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planProvider = providers.find((p) => p.id === planningAgent.providerId);

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;
    const userText = prompt;
    setPrompt("");
    setError(null);

    const userMessage: ChatMessage = { role: "user", content: userText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await sendMessage({
        agentRole: "planning",
        messages: updatedMessages,
        systemPrompt:
          "You are AXON, an elite AI software engineer. Output a structured plan card for user tasks.",
      });

      const assistantMessage: ChatMessage = { role: "assistant", content: res.text };
      setMessages([...updatedMessages, assistantMessage]);
    } catch (err: any) {
      setError(err.message || "Failed to reach AI provider.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-secondary text-sm select-none">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between font-semibold">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span>AXON AGENT</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-normal">
          <span className="text-muted">Active:</span>
          <span className="text-accent font-semibold">{planProvider?.name || "Anthropic"}</span>
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-accent flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <div className="text-primary space-y-2 w-full text-xs">
                <p>Welcome to <strong>AXON IDE</strong>. I am ready to plan and execute software engineering tasks.</p>

                {/* Sample Plan Block */}
                <div className="border border-border rounded bg-card overflow-hidden my-3 text-xs w-full">
                  <div className="bg-hover px-3 py-1.5 font-bold border-b border-border flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Cpu size={13} className="text-accent" />
                      <span>PLAN PHASE</span>
                    </span>
                    <span className="text-[10px] text-accent font-semibold">CONFIDENCE: HIGH</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div><span className="text-muted">Objective:</span> Workspace ready for development</div>
                    <div><span className="text-muted">Active Agent:</span> {planProvider?.name} ({planningAgent.model})</div>
                    <div><span className="text-muted">Approach:</span> Full dynamic LLM router integrated across providers.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
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
              <div className="text-primary space-y-1 w-full text-xs whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ))
        )}

        {error && (
          <div className="p-3 rounded bg-error/10 border border-error/30 text-error text-xs">
            <strong>Agent Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Input Footer */}
      <div className="p-3 border-t border-border bg-secondary">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe a task to start planning..."
            className="w-full bg-card border border-border rounded-md px-3 py-2 pr-9 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent resize-none min-h-[70px]"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !prompt.trim()}
            className="absolute bottom-2.5 right-2.5 p-1.5 rounded bg-accent text-white hover:bg-opacity-80 disabled:opacity-50 transition-opacity"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
