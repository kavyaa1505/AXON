import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface ProviderEntry {
  id: string;
  name: string;
  endpoint: string;
  authType: "bearer" | "x-api-key" | "query-param";
  authHeader: string;
  authParam: string;
  model: string;
  models: string[];
  responseFormat: "openai" | "anthropic" | "gemini" | "custom";
  customResponsePath: string;
  status: "connected" | "invalid" | "untested";
}

export interface AgentAssignment {
  providerId: string;
  model: string;
}

interface ProviderStoreState {
  providers: ProviderEntry[];
  planningAgent: AgentAssignment;
  developmentAgent: AgentAssignment;

  addProvider: (provider: Omit<ProviderEntry, "id" | "status">, apiKey?: string) => Promise<void>;
  updateProvider: (id: string, updates: Partial<ProviderEntry>, apiKey?: string) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  resetToDefaultProviders: () => void;
  
  setPlanningAgent: (assignment: AgentAssignment) => void;
  setDevelopmentAgent: (assignment: AgentAssignment) => void;

  getApiKey: (id: string, agentId?: string) => Promise<string | null>;
  setApiKey: (id: string, apiKey: string, agentId?: string) => Promise<void>;
  hasApiKey: (id: string, agentId?: string) => Promise<boolean>;
  deleteApiKey: (id: string, agentId?: string) => Promise<void>;
}

export const DEFAULT_PROVIDERS: ProviderEntry[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    authType: "x-api-key",
    authHeader: "x-api-key",
    authParam: "",
    model: "claude-3-5-sonnet-20241022",
    models: ["claude-3-5-sonnet-20241022", "claude-3-7-sonnet-20250219", "claude-3-5-haiku-20241022"],
    responseFormat: "anthropic",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "openai",
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini", "gpt-4-turbo"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "anthropic/claude-3.5-sonnet",
    models: [
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "deepseek/deepseek-r1",
      "meta-llama/llama-3.3-70b-instruct",
      "google/gemini-2.0-flash-001",
      "qwen/qwen-2.5-coder-32b-instruct"
    ],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "meta/llama-3.3-70b-instruct",
    models: [
      "meta/llama-3.3-70b-instruct",
      "deepseek-ai/deepseek-r1",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "mistralai/mistral-large-2-instruct"
    ],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "groq",
    name: "Groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "deepseek-r1-distill-llama-70b"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "gemini",
    name: "Google Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    authType: "query-param",
    authHeader: "",
    authParam: "key",
    model: "gemini-1.5-pro",
    models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
    responseFormat: "gemini",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "mistral",
    name: "Mistral AI",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "mistral-large-latest",
    models: ["mistral-large-latest", "pixtral-large-latest", "codestral-latest", "mistral-small-latest"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "together",
    name: "Together AI",
    endpoint: "https://api.together.xyz/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "deepseek-ai/DeepSeek-R1", "Qwen/Qwen2.5-Coder-32B-Instruct"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "perplexity",
    name: "Perplexity AI",
    endpoint: "https://api.perplexity.ai/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "sonar-pro",
    models: ["sonar-pro", "sonar", "sonar-reasoning-pro", "sonar-reasoning"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    endpoint: "https://api.x.ai/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "grok-2-latest",
    models: ["grok-2-latest", "grok-2-vision-latest", "grok-beta"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    endpoint: "https://api.fireworks.ai/inference/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "accounts/fireworks/models/deepseek-r1",
    models: ["accounts/fireworks/models/deepseek-r1", "accounts/fireworks/models/llama-v3p3-70b-instruct"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "cerebras",
    name: "Cerebras",
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "llama-3.3-70b",
    models: ["llama-3.3-70b", "llama3.1-8b"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    endpoint: "http://localhost:11434/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "llama3.3",
    models: ["llama3.3", "qwen2.5-coder", "deepseek-r1", "mistral"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  },
  {
    id: "lmstudio",
    name: "LM Studio (Local)",
    endpoint: "http://localhost:1234/v1/chat/completions",
    authType: "bearer",
    authHeader: "",
    authParam: "",
    model: "local-model",
    models: ["local-model"],
    responseFormat: "openai",
    customResponsePath: "",
    status: "untested"
  }
];

const loadInitialProviders = (): ProviderEntry[] => {
  const saved = localStorage.getItem("gravity:provider-registry");
  if (saved) {
    try {
      const parsed: ProviderEntry[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map(p => p.id));
      const missingDefaults = DEFAULT_PROVIDERS.filter(p => !existingIds.has(p.id));
      if (missingDefaults.length > 0) {
        const merged = [...parsed, ...missingDefaults];
        localStorage.setItem("gravity:provider-registry", JSON.stringify(merged));
        return merged;
      }
      return parsed;
    } catch (e) {
      console.error(e);
    }
  }
  return DEFAULT_PROVIDERS;
};

const loadInitialAssignment = (key: string, defaultAssignment: AgentAssignment): AgentAssignment => {
  const saved = localStorage.getItem("gravity:agent-assignments");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed[key]) return parsed[key];
    } catch (e) { console.error(e); }
  }
  return defaultAssignment;
};

export const useProviderStore = create<ProviderStoreState>((set, get) => ({
  providers: loadInitialProviders(),
  planningAgent: loadInitialAssignment("planningAgent", { providerId: "anthropic", model: "claude-3-5-sonnet-20241022" }),
  developmentAgent: loadInitialAssignment("developmentAgent", { providerId: "groq", model: "llama-3.3-70b-versatile" }),

  getApiKey: async (id: string, agentId?: string) => {
    try {
      const result = await invoke<string | null>("get_api_key", { providerId: id, agentId });
      return result;
    } catch (e) {
      console.error("Failed to get API key:", e);
      return null;
    }
  },

  setApiKey: async (id: string, apiKey: string, agentId?: string) => {
    try {
      await invoke("save_api_key", { providerId: id, key: apiKey, agentId });
    } catch (e) {
      console.error("Failed to save API key:", e);
      throw e;
    }
  },

  hasApiKey: async (id: string, agentId?: string) => {
    try {
      const result = await invoke<boolean>("has_api_key", { providerId: id, agentId });
      return result;
    } catch (e) {
      console.error("Failed to check API key:", e);
      return false;
    }
  },

  deleteApiKey: async (id: string, agentId?: string) => {
    try {
      await invoke("delete_api_key", { providerId: id, agentId });
    } catch (e) {
      console.error("Failed to delete API key:", e);
      throw e;
    }
  },

  addProvider: async (providerData, apiKey) => {
    const newId = "provider_" + Date.now();
    const newEntry: ProviderEntry = {
      ...providerData,
      id: newId,
      status: "untested"
    };
    if (apiKey) {
      await get().setApiKey(newId, apiKey);
      newEntry.status = "connected";
    }
    const updated = [...get().providers, newEntry];
    set({ providers: updated });
    localStorage.setItem("gravity:provider-registry", JSON.stringify(updated));
  },

  updateProvider: async (id, updates, apiKey) => {
    if (apiKey !== undefined) {
      await get().setApiKey(id, apiKey);
    }
    const updated = get().providers.map(p => p.id === id ? { ...p, ...updates } : p);
    set({ providers: updated });
    localStorage.setItem("gravity:provider-registry", JSON.stringify(updated));
  },

  deleteProvider: async (id) => {
    await get().deleteApiKey(id);
    const updated = get().providers.filter(p => p.id !== id);
    set({ providers: updated });
    localStorage.setItem("gravity:provider-registry", JSON.stringify(updated));
  },

  resetToDefaultProviders: () => {
    set({ providers: DEFAULT_PROVIDERS });
    localStorage.setItem("gravity:provider-registry", JSON.stringify(DEFAULT_PROVIDERS));
  },

  setPlanningAgent: (assignment) => {
    set({ planningAgent: assignment });
    const current = JSON.parse(localStorage.getItem("gravity:agent-assignments") || "{}");
    localStorage.setItem("gravity:agent-assignments", JSON.stringify({ ...current, planningAgent: assignment }));
  },

  setDevelopmentAgent: (assignment) => {
    set({ developmentAgent: assignment });
    const current = JSON.parse(localStorage.getItem("gravity:agent-assignments") || "{}");
    localStorage.setItem("gravity:agent-assignments", JSON.stringify({ ...current, developmentAgent: assignment }));
  }
}));

