import { create } from "zustand";
import { useStore } from "./useStore";
import { useTaskStore } from "./useTaskStore";

export interface Checkpoint {
  id: string; // e.g. "taskId-msgIndex-editIndex" or "taskId-msgIndex-all"
  taskId: string;
  msgIndex: number;
  timestamp: number;
  files: {
    path: string;
    oldContent: string;
  }[];
}

interface CheckpointState {
  checkpoints: Checkpoint[];
  addCheckpoint: (checkpoint: Checkpoint) => void;
  undoCheckpoint: (id: string) => Promise<boolean>;
  resetCheckpoints: () => void;
}

export const useCheckpointStore = create<CheckpointState>((set, get) => ({
  checkpoints: [],
  
  addCheckpoint: (checkpoint) => {
    set(state => {
      const newCheckpoints = [...state.checkpoints, checkpoint];
      // Keep only the last 50 checkpoints (FIFO eviction)
      if (newCheckpoints.length > 50) {
        newCheckpoints.shift();
      }
      return { checkpoints: newCheckpoints };
    });
  },

  undoCheckpoint: async (id) => {
    const cp = get().checkpoints.find(c => c.id === id);
    if (!cp) return false;

    // Ask user for confirmation
    const confirmed = window.confirm(
      "Are you sure you want to undo this edit/batch?\n\nNote: This will not affect any walkthrough or memory updates already generated from this change."
    );
    if (!confirmed) return false;

    // Restore files
    let success = true;
    for (const file of cp.files) {
      const writeSuccess = await useStore.getState().handleWriteWithSafety(file.path, file.oldContent);
      if (!writeSuccess) success = false;
    }
    
    if (success) {
      // Mark as reverted in TaskStore
      useTaskStore.getState().markEditReverted(cp.taskId, cp.msgIndex, cp.id.endsWith("-all") ? undefined : parseInt(cp.id.split("-")[2]));

      // Remove checkpoint
      set(state => ({
        checkpoints: state.checkpoints.filter(c => c.id !== id)
      }));
    }
    
    return success;
  },

  resetCheckpoints: () => set({ checkpoints: [] })
}));
