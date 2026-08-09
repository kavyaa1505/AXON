import { invoke } from "@tauri-apps/api/core";
import { useProviderStore } from "../store/useProviderStore";
import { useAuthStore } from "../store/useAuthStore";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  edits?: {
    path: string;
    newContent: string;
    status: "pending" | "accepted" | "rejected";
  }[];
  walkthrough?: string;
  walkthroughStatus?: "loading" | "done";
}

export interface SendMessageOptions {
  agentRole: "planning" | "development";
  messages: ChatMessage[];
  systemPrompt?: string;
}

export interface TokenUsage {
  input: number;
  output: number;
}

const PRICING: Record<string, { input: number, output: number }> = {
  // $ per 1K tokens
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  "claude-3-5-sonnet-20240620": { input: 0.003, output: 0.015 },
  "claude-3-opus-20240229": { input: 0.015, output: 0.075 },
  "claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },
  "gemini-1.5-pro": { input: 0.0035, output: 0.0105 },
  "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
};

export function calculateCost(model: string, usage: TokenUsage): number {
  const price = PRICING[model];
  if (!price) return 0;
  return (usage.input / 1000) * price.input + (usage.output / 1000) * price.output;
}

export class ProviderError extends Error {
  kind: string;
  provider: string;
  detail: string;
  retryAfterSecs?: number;
  status?: number;

  constructor(data: any) {
    super(data.detail || "Provider Error");
    this.name = "ProviderError";
    this.kind = data.kind || "Other";
    this.provider = data.provider || "unknown";
    this.detail = data.detail || "";
    this.retryAfterSecs = data.retry_after_secs;
    this.status = data.status;
  }
}

function getNestedProperty(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

export async function sendMessage(options: SendMessageOptions, retryCount = 0): Promise<{ text: string; raw: any; usage: TokenUsage | null; cost: number }> {
  const store = useProviderStore.getState();
  const assignment = options.agentRole === "planning" ? store.planningAgent : store.developmentAgent;
  
  const provider = store.providers.find(p => p.id === assignment.providerId);
  if (!provider) {
    throw new Error(`Provider not found for ${options.agentRole} agent (ID: ${assignment.providerId})`);
  }

  const model = assignment.model || provider.model;

  let url = provider.endpoint;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  // Provider-specific header additions
  if (provider.id === "anthropic" || provider.name.toLowerCase().includes("anthropic")) {
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }

  if (provider.id === "openrouter" || url.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = "https://axon-ide.app";
    headers["X-Title"] = "AXON IDE";
  }

  let body: any = {};

  if (provider.responseFormat === "openai") {
    const formattedMessages = [];
    if (options.systemPrompt) {
      formattedMessages.push({ role: "system", content: options.systemPrompt });
    }
    options.messages.forEach(m => formattedMessages.push({ role: m.role, content: m.content }));

    body = {
      model: model,
      messages: formattedMessages,
      temperature: 0.7
    };
  } else if (provider.responseFormat === "anthropic") {
    const formattedMessages = options.messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    body = {
      model: model,
      max_tokens: 4096,
      system: options.systemPrompt,
      messages: formattedMessages
    };
  } else if (provider.responseFormat === "gemini") {
    const contents = options.messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    if (!url.includes(":generateContent")) {
      url = `${url}/${model}:generateContent`;
    }

    body = { contents };
    if (options.systemPrompt) {
      body.systemInstruction = { parts: [{ text: options.systemPrompt }] };
    }
  } else {
    body = {
      model: model,
      messages: options.messages,
      system: options.systemPrompt
    };
  }

  try {
    const username = useAuthStore.getState().currentUser || "";
    const data: any = await invoke("make_llm_request", {
      username,
      providerId: provider.id,
      url,
      headers,
      body,
      authType: provider.authType,
      authHeader: provider.authHeader || "",
      authParam: provider.authParam || ""
    });

    let text = "";

    if (provider.responseFormat === "openai") {
      const choice = data.choices?.[0];
      if (choice?.message?.content) {
        text = typeof choice.message.content === "string" ? choice.message.content : JSON.stringify(choice.message.content);
      } else if (choice?.text) {
        text = choice.text;
      } else if (choice?.message?.reasoning_content) {
        text = choice.message.reasoning_content;
      }
    } else if (provider.responseFormat === "anthropic") {
      text = data.content?.[0]?.text || "";
    } else if (provider.responseFormat === "gemini") {
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (provider.customResponsePath) {
      text = getNestedProperty(data, provider.customResponsePath) || JSON.stringify(data);
    } else {
      text = JSON.stringify(data);
    }

    let usage: TokenUsage | null = null;
    if (provider.responseFormat === "openai") {
      if (data.usage) {
        usage = { input: data.usage.prompt_tokens || 0, output: data.usage.completion_tokens || 0 };
      }
    } else if (provider.responseFormat === "anthropic") {
      if (data.usage) {
        usage = { input: data.usage.input_tokens || 0, output: data.usage.output_tokens || 0 };
      }
    } else if (provider.responseFormat === "gemini") {
      if (data.usageMetadata) {
        usage = { input: data.usageMetadata.promptTokenCount || 0, output: data.usageMetadata.candidatesTokenCount || 0 };
      }
    }

    const cost = usage ? calculateCost(model, usage) : 0;

    return { text, raw: data, usage, cost };

  } catch (err: any) {
    if (err && typeof err === "object" && err.kind) {
      const providerErr = new ProviderError(err);
      
      if (providerErr.kind === "RateLimited" && retryCount < 1) {
        console.log(`Rate limited. Retrying in a moment...`);
        const delay = providerErr.retryAfterSecs ? providerErr.retryAfterSecs * 1000 : 2000;
        await new Promise(r => setTimeout(r, delay));
        return sendMessage(options, retryCount + 1);
      }
      
      throw providerErr;
    }
    throw new Error(err.toString());
  }
}
