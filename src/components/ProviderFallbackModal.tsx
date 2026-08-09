import React, { useState } from "react";
import { AlertCircle, Key, RefreshCcw } from "lucide-react";
import { useProviderStore } from "../store/useProviderStore";
import { useTaskStore } from "../store/useTaskStore";

export interface ProviderFallbackModalProps {
  taskId: string;
  onCancel: () => void;
}

export function ProviderFallbackModal({ taskId, onCancel }: ProviderFallbackModalProps) {
  const { providers, setApiKey, setPlanningAgent, setDevelopmentAgent, planningAgent, developmentAgent } = useProviderStore();
  const task = useTaskStore(state => state.tasks[taskId]);
  const runTask = useTaskStore(state => state.runTask);

  const [newKey, setNewKey] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [mode, setMode] = useState<"switch" | "key">("switch");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!task) return null;

  const agentRole = task.agentRole;
  const assignment = agentRole === "planning" ? planningAgent : developmentAgent;
  const providerId = assignment.providerId;
  const errorKind = task.errorKind;

  const provider = providers.find(p => p.id === providerId);
  const otherProviders = providers.filter(p => p.id !== providerId && p.status === "connected");

  const title = errorKind === "QuotaExceeded" 
    ? `${provider?.name || providerId} isn't working — looks like this account is out of credits.`
    : `${provider?.name || providerId} isn't working — this key looks invalid or was revoked.`;

  const handleSwitchProvider = async () => {
    if (!selectedProviderId) return;
    setIsSubmitting(true);
    
    const targetProvider = providers.find(p => p.id === selectedProviderId);
    if (targetProvider) {
      if (agentRole === "planning") {
        setPlanningAgent({ ...planningAgent, providerId: selectedProviderId, model: targetProvider.model });
      } else {
        setDevelopmentAgent({ ...developmentAgent, providerId: selectedProviderId, model: targetProvider.model });
      }
      runTask(taskId);
      onCancel(); // Close modal immediately as task is now running
    }
  };

  const handleUpdateKey = async () => {
    if (!newKey.trim() || newKey.includes("••••")) return;
    setIsSubmitting(true);
    try {
      await setApiKey(providerId, newKey.trim());
      runTask(taskId);
      onCancel(); // Close modal immediately as task is now running
    } catch (e) {
      setIsSubmitting(false);
      alert("Failed to save API key.");
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-card border border-border w-[400px] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-border bg-error/10 flex items-start gap-3">
          <AlertCircle className="text-error mt-0.5 flex-shrink-0" size={18} />
          <div>
            <h3 className="font-semibold text-primary text-sm leading-tight">{title}</h3>
          </div>
        </div>

        <div className="p-4 space-y-4 text-xs text-primary">
          <div className="flex bg-secondary p-1 rounded-md">
            <button
              onClick={() => setMode("switch")}
              className={`flex-1 py-1.5 rounded text-center ${mode === "switch" ? "bg-accent text-white shadow" : "text-muted hover:text-primary"}`}
            >
              Use different provider
            </button>
            <button
              onClick={() => setMode("key")}
              className={`flex-1 py-1.5 rounded text-center ${mode === "key" ? "bg-accent text-white shadow" : "text-muted hover:text-primary"}`}
            >
              Enter a new key
            </button>
          </div>

          {mode === "switch" && (
            <div className="space-y-3">
              {otherProviders.length > 0 ? (
                <>
                  <p className="text-muted">Select another connected provider to automatically retry your message.</p>
                  <select
                    value={selectedProviderId}
                    onChange={e => setSelectedProviderId(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="" disabled>Select a provider...</option>
                    {otherProviders.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleSwitchProvider}
                    disabled={!selectedProviderId || isSubmitting}
                    className="w-full bg-accent text-white py-2 rounded font-medium hover:bg-opacity-90 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? <RefreshCcw size={14} className="animate-spin" /> : "Switch & Retry"}
                  </button>
                </>
              ) : (
                <div className="text-center py-4 text-muted">
                  <p>You don't have any other connected providers.</p>
                  <p className="mt-2 text-[10px]">Add more in Settings → Providers.</p>
                </div>
              )}
            </div>
          )}

          {mode === "key" && (
            <div className="space-y-3">
              <p className="text-muted">Enter a new, working API key for {provider?.name} to retry your message.</p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key size={14} className="text-muted" />
                </div>
                <input
                  type="password"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="Paste new API key..."
                  className="w-full bg-background border border-border rounded pl-9 pr-3 py-2 text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <button
                onClick={handleUpdateKey}
                disabled={!newKey.trim() || newKey.includes("••••") || isSubmitting}
                className="w-full bg-accent text-white py-2 rounded font-medium hover:bg-opacity-90 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isSubmitting ? <RefreshCcw size={14} className="animate-spin" /> : "Save & Retry"}
              </button>
            </div>
          )}
        </div>

        <div className="p-3 bg-secondary border-t border-border flex justify-end">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-1.5 rounded bg-background border border-border text-xs font-medium text-primary hover:bg-hover disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
