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

function getNestedProperty(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

export async function sendMessage(options: SendMessageOptions): Promise<{ text: string; raw: any }> {
  const store = useProviderStore.getState();
  const assignment = options.agentRole === "planning" ? store.planningAgent : store.developmentAgent;
  
  const provider = store.providers.find(p => p.id === assignment.providerId);
  if (!provider) {
    throw new Error(`Provider not found for ${options.agentRole} agent (ID: ${assignment.providerId})`);
  }

  const apiKey = store.getApiKey(provider.id);
  if (!apiKey) {
    throw new Error(`API key missing for provider '${provider.name}'. Add it in Settings → Providers.`);
  }

  const model = assignment.model || provider.model;

  let url = provider.endpoint;
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  // Auth & Provider Specific Headers
  if (provider.authType === "bearer") {
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (provider.authType === "x-api-key") {
    const headerName = provider.authHeader || "x-api-key";
    headers[headerName] = apiKey;
  } else if (provider.authType === "query-param") {
    const paramName = provider.authParam || "key";
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}${paramName}=${encodeURIComponent(apiKey)}`;
  }

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
      if (provider.authType === "query-param") {
        const paramName = provider.authParam || "key";
        url += `?${paramName}=${encodeURIComponent(apiKey)}`;
      }
    }

    body = { contents };
    if (options.systemPrompt) {
      body.systemInstruction = { parts: [{ text: options.systemPrompt }] };
    }
  } else {
    // Custom format fallback
    body = {
      model: model,
      messages: options.messages,
      system: options.systemPrompt
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Provider '${provider.name}' HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();

  let text = "";

  if (provider.responseFormat === "openai") {
    const choice = data.choices?.[0];
    if (choice?.message?.content) {
      text = typeof choice.message.content === "string" ? choice.message.content : JSON.stringify(choice.message.content);
    } else if (choice?.text) {
      text = choice.text;
    } else if (choice?.message?.reasoning_content) {
      text = choice.message.reasoning_content;
    } else {
      text = "";
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

  return { text, raw: data };
}
