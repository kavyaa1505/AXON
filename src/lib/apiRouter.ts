import { invoke } from "@tauri-apps/api/core";
import { useProviderStore } from "../store/useProviderStore";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SendMessageOptions {
  agentRole: "planning" | "development";
  messages: ChatMessage[];
  systemPrompt?: string;
}

export interface ProviderEntry {
  id: string;
  name: string;
  endpoint: string;
  authType: string;
  authHeader: string;
  authParam: string;
  model: string;
  models: string[];
  responseFormat: string;
  customResponsePath: string;
  status: string;
}

export async function sendMessage(options: SendMessageOptions): Promise<{ text: string; raw: any }> {
  const store = useProviderStore.getState();
  const assignment = options.agentRole === "planning" ? store.planningAgent : store.developmentAgent;
  
  const provider = store.providers.find((p: any) => p.id === assignment.providerId);
  if (!provider) {
    throw new Error(`Provider not found for ${options.agentRole} agent (ID: ${assignment.providerId})`);
  }

  const providerConfig: ProviderEntry = {
    id: provider.id,
    name: provider.name,
    endpoint: provider.endpoint,
    authType: provider.authType,
    authHeader: provider.authHeader,
    authParam: provider.authParam,
    model: assignment.model || provider.model,
    models: provider.models,
    responseFormat: provider.responseFormat,
    customResponsePath: provider.customResponsePath,
    status: provider.status
  };

  const agentId = options.agentRole;
  const messages = options.messages.map(m => ({ role: m.role, content: m.content }));

  const response = await invoke<{ text: string; raw: any }>("make_llm_request", {
    providerConfig,
    agentId,
    messages,
    systemPrompt: options.systemPrompt
  });

  return response;
}
