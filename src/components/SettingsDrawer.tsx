import { useState, useEffect } from "react";
import { X, Plus, Trash2, Cpu, Bot, Key, RotateCcw } from "lucide-react";
import { useStore } from "../store/useStore";
import { useProviderStore } from "../store/useProviderStore";

const PRESET_TEMPLATES = [
  { id: "custom", name: "-- Select Preset Template --" },
  { id: "openrouter", name: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "anthropic/claude-3.5-sonnet, openai/gpt-4o, deepseek/deepseek-r1, meta-llama/llama-3.3-70b-instruct, google/gemini-2.0-flash-001" },
  { id: "nvidia", name: "NVIDIA NIM", endpoint: "https://integrate.api.nvidia.com/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "meta/llama-3.3-70b-instruct, deepseek-ai/deepseek-r1, nvidia/llama-3.1-nemotron-70b-instruct" },
  { id: "deepseek", name: "DeepSeek", endpoint: "https://api.deepseek.com/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "deepseek-chat, deepseek-reasoner" },
  { id: "mistral", name: "Mistral AI", endpoint: "https://api.mistral.ai/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "mistral-large-latest, pixtral-large-latest, codestral-latest" },
  { id: "together", name: "Together AI", endpoint: "https://api.together.xyz/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "meta-llama/Llama-3.3-70B-Instruct-Turbo, deepseek-ai/DeepSeek-R1, Qwen/Qwen2.5-Coder-32B-Instruct" },
  { id: "perplexity", name: "Perplexity AI", endpoint: "https://api.perplexity.ai/chat/completions", authType: "bearer", responseFormat: "openai", models: "sonar-pro, sonar, sonar-reasoning-pro" },
  { id: "xai", name: "xAI (Grok)", endpoint: "https://api.x.ai/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "grok-2-latest, grok-2-vision-latest" },
  { id: "fireworks", name: "Fireworks AI", endpoint: "https://api.fireworks.ai/inference/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "accounts/fireworks/models/deepseek-r1, accounts/fireworks/models/llama-v3p3-70b-instruct" },
  { id: "cerebras", name: "Cerebras", endpoint: "https://api.cerebras.ai/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "llama-3.3-70b, llama3.1-8b" },
  { id: "ollama", name: "Ollama (Local)", endpoint: "http://localhost:11434/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "llama3.3, qwen2.5-coder, deepseek-r1" },
  { id: "lmstudio", name: "LM Studio (Local)", endpoint: "http://localhost:1234/v1/chat/completions", authType: "bearer", responseFormat: "openai", models: "local-model" }
];

export function SettingsDrawer() {
  const { settingsOpen, setSettingsOpen } = useStore();
  const {
    providers,
    planningAgent,
    developmentAgent,
    setPlanningAgent,
    setDevelopmentAgent,
    addProvider,
    deleteProvider,
    resetToDefaultProviders,
    getApiKey,
    setApiKey
  } = useProviderStore();

  const [activeTab, setActiveTab] = useState<"providers" | "agents">("providers");
  const [showAddModal, setShowAddModal] = useState(false);

  // State to track masked keys for each provider
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});
  const [keyVisibility, setKeyVisibility] = useState<Record<string, boolean>>({});

  // New Provider Form State
  const [selectedPreset, setSelectedPreset] = useState("custom");
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [authType, setAuthType] = useState<"bearer" | "x-api-key" | "query-param">("bearer");
  const [apiKey, setApiKeyInput] = useState("");
  const [responseFormat, setResponseFormat] = useState<"openai" | "anthropic" | "gemini" | "custom">("openai");
  const [modelsInput, setModelsInput] = useState("gpt-4o, gpt-4o-mini");

  if (!settingsOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const template = PRESET_TEMPLATES.find(p => p.id === presetId);
    if (template && template.id !== "custom") {
      setName(template.name);
      setEndpoint(template.endpoint || "");
      setAuthType((template.authType as any) || "bearer");
      setResponseFormat((template.responseFormat as any) || "openai");
      setModelsInput(template.models || "");
    }
  };

  const handleSaveNewProvider = async () => {
    if (!name.trim() || !endpoint.trim()) return;
    if (!apiKey.trim()) {
      alert("API key is required");
      return;
    }

    const modelsList = modelsInput.split(",").map((m: string) => m.trim()).filter(Boolean);
    await addProvider(
      {
        name,
        endpoint,
        authType,
        authHeader: "x-api-key",
        authParam: "key",
        model: modelsList[0] || "default",
        models: modelsList,
        responseFormat,
        customResponsePath: ""
      },
      apiKey
    );

    // Reset Form
    setName("");
    setEndpoint("");
    setApiKeyInput("");
    setMaskedKey("");
    setSelectedPreset("custom");
    setShowAddModal(false);
  };

  // Mask API key for display (show only last 4 chars)
  const maskKey = (key: string) => {
    if (!key || key.length <= 4) return "••••";
    return `••••${key.substring(key.length - 4)}`;
  };

  // Load masked keys for all providers
  useEffect(() => {
    const loadAllProviderKeys = async () => {
      const keysMap: Record<string, string> = {};
      for (const provider of providers) {
        const key = await getApiKey(provider.id);
        if (key) {
          keysMap[provider.id] = maskKey(key);
        }
      }
      setProviderKeys(keysMap);
    };
    loadAllProviderKeys();
  }, [providers, getApiKey]);

  const planProvider = providers.find((p: any) => p.id === planningAgent.providerId);
  const devProvider = providers.find((p: any) => p.id === developmentAgent.providerId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/50 backdrop-blur-sm">
      <div className="w-[500px] h-full bg-card border-l border-border shadow-2xl flex flex-col text-sm">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center gap-2">
            <span>AXON Settings</span>
          </h2>
          <button onClick={() => setSettingsOpen(false)} className="p-1 rounded hover:bg-hover text-secondary">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-secondary px-6">
          <button
            onClick={() => setActiveTab("providers")}
            className={`px-4 py-2.5 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "providers" ? "border-accent text-accent" : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            <Key size={14} />
            <span>AI Providers ({providers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("agents")}
            className={`px-4 py-2.5 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "agents" ? "border-accent text-accent" : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            <Bot size={14} />
            <span>Agent Assignments</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "providers" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-primary">Provider Registry</h3>
                  <p className="text-xs text-muted">Manage LLM API endpoints and authentication credentials</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetToDefaultProviders}
                    title="Restore default provider configurations"
                    className="p-1.5 rounded border border-border bg-card text-muted hover:text-primary hover:bg-hover text-xs font-semibold flex items-center gap-1"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-3 py-1.5 rounded bg-accent text-white hover:bg-opacity-80 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add Provider</span>
                  </button>
                </div>
              </div>

              {/* Provider Rows */}
              <div className="space-y-3">
                {providers.map((p) => (
                  <div key={p.id} className="p-4 rounded-lg bg-background border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-primary">{p.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-hover border border-border text-[10px] text-muted">
                          {p.responseFormat}
                        </span>
                      </div>
                      <button
                        onClick={async () => await deleteProvider(p.id)}
                        className="p-1 rounded hover:bg-hover text-muted hover:text-error transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="text-xs text-muted truncate font-code">{p.endpoint}</div>

                    <div className="space-y-2 pt-1">
                      <label className="block text-[11px] font-semibold text-secondary">API Key</label>
                      <div className="flex gap-2">
                        <input
                          type={keyVisibility[p.id] ? "text" : "password"}
                          defaultValue={providerKeys[p.id] || ""}
                          onBlur={async (e) => {
                            const newValue = e.target.value;
                            if (newValue && newValue !== providerKeys[p.id]) {
                              await setApiKey(p.id, newValue);
                              setProviderKeys(prev => ({ ...prev, [p.id]: maskKey(newValue) }));
                            }
                          }}
                          placeholder="sk-..."
                          className="flex-1 bg-card border border-border rounded p-1.5 text-xs text-primary focus:outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={() => setKeyVisibility(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className="px-2 py-1 rounded bg-hover border border-border text-muted hover:text-primary text-xs"
                        >
                          {keyVisibility[p.id] ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-muted">Available Models:</span>
                      <span className="text-primary font-code">{p.models.length} models</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "agents" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-sm text-primary">Independent Agent Setup</h3>
                <p className="text-xs text-muted">Assign separate providers and models for Planning vs Development tasks</p>
              </div>

              {/* Planning Agent Card */}
              <div className="p-4 rounded-lg bg-background border border-border space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-accent">
                  <Cpu size={16} />
                  <span>Planning Agent</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-secondary">Provider</label>
                    <select
                      value={planningAgent.providerId}
                      onChange={(e) => {
                        const newProv = providers.find((p) => p.id === e.target.value);
                        setPlanningAgent({
                          providerId: e.target.value,
                          model: newProv?.models[0] || "",
                        });
                      }}
                      className="w-full bg-card border border-border rounded p-2 text-xs text-primary focus:outline-none focus:border-accent"
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-secondary">Model</label>
                    <select
                      value={planningAgent.model}
                      onChange={(e) => setPlanningAgent({ ...planningAgent, model: e.target.value })}
                      className="w-full bg-card border border-border rounded p-2 text-xs text-primary focus:outline-none focus:border-accent"
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

              {/* Development Agent Card */}
              <div className="p-4 rounded-lg bg-background border border-border space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-success">
                  <Bot size={16} />
                  <span>Development Agent</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-secondary">Provider</label>
                    <select
                      value={developmentAgent.providerId}
                      onChange={(e) => {
                        const newProv = providers.find((p) => p.id === e.target.value);
                        setDevelopmentAgent({
                          providerId: e.target.value,
                          model: newProv?.models[0] || "",
                        });
                      }}
                      className="w-full bg-card border border-border rounded p-2 text-xs text-primary focus:outline-none focus:border-accent"
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-secondary">Model</label>
                    <select
                      value={developmentAgent.model}
                      onChange={(e) => setDevelopmentAgent({ ...developmentAgent, model: e.target.value })}
                      className="w-full bg-card border border-border rounded p-2 text-xs text-primary focus:outline-none focus:border-accent"
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
            </div>
          )}
        </div>

        {/* Add Custom Provider Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="w-[460px] bg-card border border-border rounded-lg shadow-2xl p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-bold text-sm text-primary">Add LLM Provider</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-hover">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-muted font-semibold mb-1">Preset Template</label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent font-semibold"
                  >
                    {PRESET_TEMPLATES.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-semibold mb-1">Provider Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Together AI"
                    className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-muted font-semibold mb-1">Endpoint URL</label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://api.together.xyz/v1/chat/completions"
                    className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent font-code"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted font-semibold mb-1">Auth Type</label>
                    <select
                      value={authType}
                      onChange={(e) => setAuthType(e.target.value as any)}
                      className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="bearer">Bearer Token</option>
                      <option value="x-api-key">Custom Header</option>
                      <option value="query-param">Query Parameter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-muted font-semibold mb-1">Response Format</label>
                    <select
                      value={responseFormat}
                      onChange={(e) => setResponseFormat(e.target.value as any)}
                      className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="openai">OpenAI Compatible</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="gemini">Gemini</option>
                      <option value="custom">Custom Path</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-muted font-semibold mb-1">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-muted font-semibold mb-1">Models (Comma separated)</label>
                  <input
                    type="text"
                    value={modelsInput}
                    onChange={(e) => setModelsInput(e.target.value)}
                    placeholder="model-1, model-2"
                    className="w-full bg-background border border-border rounded p-2 text-primary focus:outline-none focus:border-accent font-code"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button onClick={() => setShowAddModal(false)} className="px-3 py-1.5 rounded border border-border bg-hover">
                  Cancel
                </button>
                <button onClick={handleSaveNewProvider} className="px-3 py-1.5 rounded bg-accent text-white font-semibold">
                  Save Provider
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

