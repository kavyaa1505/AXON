import { create } from "zustand";
import { ChatMessage, sendMessage, TokenUsage } from "../lib/apiRouter";
import { parseAgentEdits, ParsedEdit } from "../lib/parseAgentEdits";
import { readFileContent } from "../lib/fileService";
import { useStore } from "./useStore";
import { useProviderStore } from "./useProviderStore";
import { useCheckpointStore } from "./useCheckpointStore";

export type TaskStatus = "running" | "awaiting_review" | "completed" | "failed" | "rejected";

export interface AgentTask {
  id: string;
  title: string;
  agentRole: "planning" | "development";
  status: TaskStatus;
  createdAt: number;
  messages: ChatMessage[];
  error?: string;
  errorKind?: string;
  tokensUsed?: TokenUsage;
  estimatedCost?: number;
}

interface TaskStoreState {
  tasks: Record<string, AgentTask>;
  activeTaskId: string | null;

  createTask: (title: string, agentRole: "planning" | "development") => string;
  setActiveTask: (id: string) => void;
  removeTask: (id: string) => void;
  resetTasks: () => void;
  
  sessionTotalCost: number;
  sessionTotalTokens: TokenUsage;
  accumulateUsage: (taskId: string, usage: TokenUsage | null, cost: number) => void;

  runTask: (id: string, userText?: string, contextStr?: string, isEditMode?: boolean) => Promise<void>;
  
  acceptEdit: (taskId: string, msgIndex: number, editIndex: number, skipWalkthrough?: boolean) => Promise<void>;
  rejectEdit: (taskId: string, msgIndex: number, editIndex: number) => void;
  acceptAll: (taskId: string, msgIndex: number) => Promise<void>;
  rejectAll: (taskId: string, msgIndex: number) => void;
  markEditReverted: (taskId: string, msgIndex: number, editIndex?: number) => void;
  
  generateWalkthrough: (taskId: string, msgIndex: number, acceptedEdits: { path: string, oldContent: string, newContent: string }[]) => Promise<void>;
  generateMemoryUpdate: (taskId: string, acceptedEdits: { path: string, oldContent: string, newContent: string }[]) => Promise<void>;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: {},
  activeTaskId: null,
  sessionTotalCost: 0,
  sessionTotalTokens: { input: 0, output: 0 },

  accumulateUsage: (taskId, usage, cost) => {
    if (!usage && cost === 0) return;
    set(state => {
      const task = state.tasks[taskId];
      if (!task) return state;

      const currentInput = task.tokensUsed?.input || 0;
      const currentOutput = task.tokensUsed?.output || 0;
      const currentCost = task.estimatedCost || 0;
      
      const newTokensUsed = usage ? {
        input: currentInput + usage.input,
        output: currentOutput + usage.output
      } : task.tokensUsed;

      return {
        tasks: {
          ...state.tasks,
          [taskId]: {
            ...task,
            tokensUsed: newTokensUsed,
            estimatedCost: currentCost + cost
          }
        },
        sessionTotalCost: state.sessionTotalCost + cost,
        sessionTotalTokens: usage ? {
          input: state.sessionTotalTokens.input + usage.input,
          output: state.sessionTotalTokens.output + usage.output
        } : state.sessionTotalTokens
      };
    });
  },

  createTask: (title, agentRole) => {
    const id = "task_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    set(state => ({
      tasks: {
        ...state.tasks,
        [id]: {
          id,
          title: title.length > 40 ? title.substring(0, 40) + "..." : title,
          agentRole,
          status: "completed", // starts empty/completed until runTask is called
          createdAt: Date.now(),
          messages: []
        }
      }
    }));
    return id;
  },

  setActiveTask: (id) => set({ activeTaskId: id }),

  removeTask: (id) => set(state => {
    const newTasks = { ...state.tasks };
    delete newTasks[id];
    let newActive = state.activeTaskId;
    if (newActive === id) {
      const keys = Object.keys(newTasks).sort((a, b) => newTasks[b].createdAt - newTasks[a].createdAt);
      newActive = keys.length > 0 ? keys[0] : null;
    }
    return { tasks: newTasks, activeTaskId: newActive };
  }),

  resetTasks: () => set({ tasks: {}, activeTaskId: null, sessionTotalCost: 0, sessionTotalTokens: { input: 0, output: 0 } }),

  runTask: async (id, userText, contextStr, isEditMode) => {
    const task = get().tasks[id];
    if (!task) return;

    let updatedMessages = [...task.messages];
    let modeIsEdit = isEditMode ?? task.agentRole === "development";
    let memoryContext = "";

    const { repoPath, setMemorySizeWarning } = useStore.getState();
    if (repoPath) {
      try {
        const memPath = `${repoPath}/.axon/memory.md`.replace(/\\/g, "/");
        const memContent = await readFileContent(memPath);
        if (memContent && memContent.trim().length > 0) {
          memoryContext = `### Project memory\n${memContent}\n\n`;
          setMemorySizeWarning(memContent.length > 4000);
        } else {
          setMemorySizeWarning(false);
        }
      } catch (e) {
        setMemorySizeWarning(false);
      }
    }

    if (userText) {
      let fullUserText = userText;
      if (contextStr || memoryContext) {
        fullUserText = `${memoryContext}${contextStr || ""}\n${userText}`;
      }
      const userMessage: ChatMessage = { role: "user", content: fullUserText };
      updatedMessages.push(userMessage);
    }

    set(state => ({
      tasks: {
        ...state.tasks,
        [id]: {
          ...state.tasks[id],
          status: "running",
          error: undefined,
          errorKind: undefined,
          messages: updatedMessages
        }
      }
    }));

    try {
      let systemPrompt = "You are AXON, an elite AI software engineer. Output a structured plan card for user tasks.";
      if (modeIsEdit) {
        systemPrompt = "You are AXON, an elite AI software engineer. You must output proposed code changes in a strict format. Do not rely on free prose for edits. Use fenced blocks tagged with an explicit file path exactly like this:\n```edit:/absolute/path/to/file.ts\n<full new file content>\n```\nYou can output multiple edit blocks. Anything outside edit blocks is treated as commentary.";
      }

      const res = await sendMessage({
        agentRole: task.agentRole,
        messages: updatedMessages,
        systemPrompt,
      });

      get().accumulateUsage(id, res.usage, res.cost);

      let assistantMessage: ChatMessage;
      let newStatus: TaskStatus = "completed";

      if (modeIsEdit) {
        const parsed = parseAgentEdits(res.text);
        const edits = parsed.edits.map(e => ({ ...e, status: "pending" as const }));
        assistantMessage = {
          role: "assistant",
          content: parsed.cleanText,
          edits
        };
        if (edits.length > 0) {
          newStatus = "awaiting_review";
        }
      } else {
        assistantMessage = { role: "assistant", content: res.text };
      }

      set(state => ({
        tasks: {
          ...state.tasks,
          [id]: {
            ...state.tasks[id],
            status: newStatus,
            messages: [...updatedMessages, assistantMessage]
          }
        }
      }));

    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || "Failed to reach AI provider.";
      let errorKind = err.kind || "Other";
      
      if (err.name === "ProviderError" && (err.kind === "QuotaExceeded" || err.kind === "AuthInvalid")) {
        useProviderStore.getState().setProviderStatus(err.provider, "invalid");
        errorMsg = err.detail || err.message;
      }

      set(state => ({
        tasks: {
          ...state.tasks,
          [id]: {
            ...state.tasks[id],
            status: "failed",
            error: errorMsg,
            errorKind
          }
        }
      }));
    }
  },

  acceptEdit: async (taskId, msgIndex, editIndex, skipWalkthrough = false) => {
    const task = get().tasks[taskId];
    if (!task) return;
    const msg = task.messages[msgIndex];
    const edit = msg.edits?.[editIndex];
    if (!edit || edit.status !== "pending") return;

    const success = await useStore.getState().handleWriteWithSafety(edit.path, edit.newContent);
    if (success) {
      set(state => {
        const newTasks = { ...state.tasks };
        const newMsgs = [...newTasks[taskId].messages];
        const newMsg = { ...newMsgs[msgIndex] };
        if (newMsg.edits) {
          newMsg.edits = [...newMsg.edits];
          newMsg.edits[editIndex] = { ...newMsg.edits[editIndex], status: "accepted" };
        }
        newMsgs[msgIndex] = newMsg;
        
        // Update status if all edits are resolved
        const allResolved = !newMsgs.some(m => m.edits?.some(e => e.status === "pending"));
        
        newTasks[taskId] = { 
          ...newTasks[taskId], 
          messages: newMsgs,
          status: allResolved ? "completed" : newTasks[taskId].status
        };
        return { tasks: newTasks };
      });

      if (!skipWalkthrough) {
        let oldContent = "";
        try { oldContent = await readFileContent(edit.path); } catch (e) { }
        const acceptedEdits = [{ path: edit.path, oldContent, newContent: edit.newContent }];
        
        // Add checkpoint
        useCheckpointStore.getState().addCheckpoint({
          id: `${taskId}-${msgIndex}-${editIndex}`,
          taskId,
          msgIndex,
          timestamp: Date.now(),
          files: acceptedEdits
        });

        get().generateWalkthrough(taskId, msgIndex, acceptedEdits);
        
        // Also trigger memory update check
        get().generateMemoryUpdate(taskId, acceptedEdits);
      }
    }
  },

  rejectEdit: (taskId, msgIndex, editIndex) => {
    set(state => {
      const newTasks = { ...state.tasks };
      const newMsgs = [...newTasks[taskId].messages];
      const newMsg = { ...newMsgs[msgIndex] };
      if (newMsg.edits) {
        newMsg.edits = [...newMsg.edits];
        newMsg.edits[editIndex] = { ...newMsg.edits[editIndex], status: "rejected" };
      }
      newMsgs[msgIndex] = newMsg;
      
      const allResolved = !newMsgs.some(m => m.edits?.some(e => e.status === "pending"));
      
      newTasks[taskId] = { 
        ...newTasks[taskId], 
        messages: newMsgs,
        status: allResolved ? "completed" : newTasks[taskId].status
      };
      return { tasks: newTasks };
    });
  },

  acceptAll: async (taskId, msgIndex) => {
    const task = get().tasks[taskId];
    if (!task) return;
    const msg = task.messages[msgIndex];
    if (!msg.edits) return;
    
    const acceptedList: { path: string, oldContent: string, newContent: string }[] = [];
    
    for (let i = 0; i < msg.edits.length; i++) {
      if (msg.edits[i].status === "pending") {
        let oldContent = "";
        try { oldContent = await readFileContent(msg.edits[i].path); } catch (e) { }
        
        const edit = msg.edits[i];
        const success = await useStore.getState().handleWriteWithSafety(edit.path, edit.newContent);
        if (success) {
          acceptedList.push({ path: edit.path, oldContent, newContent: edit.newContent });
          // Update status synchronously to avoid race conditions
          set(state => {
            const newTasks = { ...state.tasks };
            const newMsgs = [...newTasks[taskId].messages];
            const newMsg = { ...newMsgs[msgIndex] };
            if (newMsg.edits) {
              newMsg.edits = [...newMsg.edits];
              newMsg.edits[i] = { ...newMsg.edits[i], status: "accepted" };
            }
            newMsgs[msgIndex] = newMsg;
            newTasks[taskId] = { ...newTasks[taskId], messages: newMsgs };
            return { tasks: newTasks };
          });
        }
      }
    }

    set(state => {
      const newTasks = { ...state.tasks };
      const allResolved = !newTasks[taskId].messages.some(m => m.edits?.some(e => e.status === "pending"));
      newTasks[taskId] = { ...newTasks[taskId], status: allResolved ? "completed" : newTasks[taskId].status };
      return { tasks: newTasks };
    });

    if (acceptedList.length > 0) {
      useCheckpointStore.getState().addCheckpoint({
        id: `${taskId}-${msgIndex}-all`,
        taskId,
        msgIndex,
        timestamp: Date.now(),
        files: acceptedList
      });

      get().generateWalkthrough(taskId, msgIndex, acceptedList);
      get().generateMemoryUpdate(taskId, acceptedList);
    }
  },

  rejectAll: (taskId, msgIndex) => {
    const task = get().tasks[taskId];
    if (!task) return;
    const msg = task.messages[msgIndex];
    if (!msg.edits) return;
    for (let i = 0; i < msg.edits.length; i++) {
      if (msg.edits[i].status === "pending") {
        get().rejectEdit(taskId, msgIndex, i);
      }
    }
  },

  markEditReverted: (taskId, msgIndex, editIndex) => {
    set(state => {
      const newTasks = { ...state.tasks };
      const task = newTasks[taskId];
      if (!task) return { tasks: newTasks };
      
      const newMsgs = [...task.messages];
      const newMsg = { ...newMsgs[msgIndex] };
      if (newMsg.edits) {
        newMsg.edits = [...newMsg.edits];
        if (editIndex !== undefined) {
          if (newMsg.edits[editIndex].status === "accepted") {
            newMsg.edits[editIndex] = { ...newMsg.edits[editIndex], status: "reverted" as const };
          }
        } else {
          // Revert all accepted
          for (let i = 0; i < newMsg.edits.length; i++) {
            if (newMsg.edits[i].status === "accepted") {
              newMsg.edits[i] = { ...newMsg.edits[i], status: "reverted" as const };
            }
          }
        }
      }
      newMsgs[msgIndex] = newMsg;
      newTasks[taskId] = { ...task, messages: newMsgs };
      return { tasks: newTasks };
    });
  },

  generateWalkthrough: async (taskId, msgIndex, acceptedEdits) => {
    if (acceptedEdits.length === 0) return;

    set(state => {
      const newTasks = { ...state.tasks };
      const newMsgs = [...newTasks[taskId].messages];
      newMsgs[msgIndex] = { ...newMsgs[msgIndex], walkthroughStatus: "loading" };
      newTasks[taskId] = { ...newTasks[taskId], messages: newMsgs };
      return { tasks: newTasks };
    });

    try {
      const contextBlocks = acceptedEdits.map(e => `### File: ${e.path}\n**Old Content:**\n\`\`\`\n${e.oldContent}\n\`\`\`\n\n**New Content:**\n\`\`\`\n${e.newContent}\n\`\`\``).join("\n\n");
      const userText = `Please summarize the following accepted edits:\n\n${contextBlocks}`;
      
      const systemPrompt = `You are AXON. You must produce a short structured summary of the changes just applied to the codebase.
Your output must strictly follow this format:
## What changed
<2-4 sentences describing the technical changes>
## Why
<1-2 sentences explaining the rationale>
## To verify
- <concrete check 1>
- <concrete check 2>

Do NOT output anything else. Do not propose further edits.`;

      const res = await sendMessage({
        agentRole: "development",
        messages: [{ role: "user", content: userText }],
        systemPrompt,
      });

      get().accumulateUsage(taskId, res.usage, res.cost);

      set(state => {
        const newTasks = { ...state.tasks };
        const newMsgs = [...newTasks[taskId].messages];
        newMsgs[msgIndex] = { ...newMsgs[msgIndex], walkthrough: res.text, walkthroughStatus: "done" };
        newTasks[taskId] = { ...newTasks[taskId], messages: newMsgs };
        return { tasks: newTasks };
      });
    } catch (err) {
      console.error("Failed to generate walkthrough", err);
      set(state => {
        const newTasks = { ...state.tasks };
        const newMsgs = [...newTasks[taskId].messages];
        newMsgs[msgIndex] = { ...newMsgs[msgIndex], walkthrough: "Failed to generate walkthrough.", walkthroughStatus: "done" };
        newTasks[taskId] = { ...newTasks[taskId], messages: newMsgs };
        return { tasks: newTasks };
      });
    }
  },

  generateMemoryUpdate: async (taskId, acceptedEdits) => {
    // Only check if there are non-memory files edited
    const nonMemoryEdits = acceptedEdits.filter(e => !e.path.replace(/\\/g, "/").endsWith(".axon/memory.md"));
    if (nonMemoryEdits.length === 0) return;

    const { repoPath } = useStore.getState();
    if (!repoPath) return;

    const memPath = `${repoPath}/.axon/memory.md`.replace(/\\/g, "/");
    let currentMemory = "";
    try {
      currentMemory = await readFileContent(memPath);
    } catch (e) {
      currentMemory = "No existing memory file.";
    }

    const contextBlocks = nonMemoryEdits.map(e => `### File: ${e.path}\n**Old Content:**\n\`\`\`\n${e.oldContent}\n\`\`\`\n\n**New Content:**\n\`\`\`\n${e.newContent}\n\`\`\``).join("\n\n");
    const userText = `Here are the accepted edits:\n\n${contextBlocks}\n\nCurrent .axon/memory.md:\n\`\`\`\n${currentMemory}\n\`\`\``;
    
    const systemPrompt = `You are AXON. The user just applied some code changes.
Review these changes and decide whether they reveal a durable project convention, architectural decision, or domain rule worth remembering for future sessions.
Most changes are NOT memory-worthy. Only propose an update for genuinely durable decisions, not routine fixes or feature additions.
If NOTHING qualifies, respond with NO edit block at all. Do not say anything else.
If something DOES qualify, propose an update to .axon/memory.md. Use the following format EXACTLY:

\`\`\`edit:${memPath}
# Project Memory
## Conventions
...
\`\`\`

IMPORTANT: NEVER write API keys, tokens, credentials, or secrets into the memory file.`;

    try {
      const res = await sendMessage({
        agentRole: "planning",
        messages: [{ role: "user", content: userText }],
        systemPrompt,
      });

      get().accumulateUsage(taskId, res.usage, res.cost);

      const parsed = parseAgentEdits(res.text);
      if (parsed.edits.length > 0) {
        const edits = parsed.edits.map(e => ({ ...e, status: "pending" as const }));
        
        set(state => {
          const newTasks = { ...state.tasks };
          const task = newTasks[taskId];
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: parsed.cleanText || "I've noticed a new project pattern and proposed an update to the project memory.",
            edits
          };
          newTasks[taskId] = { 
            ...task, 
            status: "awaiting_review",
            messages: [...task.messages, assistantMessage]
          };
          return { tasks: newTasks };
        });
      }
    } catch (err) {
      console.error("Failed to check for memory update", err);
    }
  }

}));
