import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useProviderStore } from "./useProviderStore";
import { useStore } from "./useStore";

export interface ProfileMeta {
  username: string;
  display_name: string;
  created_at: string;
}

interface AuthStoreState {
  currentUser: string | null;
  isInitializing: boolean;

  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (username: string, password: string, displayName: string) => Promise<void>;
  listProfiles: () => Promise<ProfileMeta[]>;

  migrationToastVisible: boolean;
  hideMigrationToast: () => void;
}

const performLegacyMigrationIfNeeded = async (username: string, set: any) => {
  const oldReg = localStorage.getItem("gravity:provider-registry");
  const newReg = localStorage.getItem(`gravity:${username}:provider-registry`);
  
  if (oldReg && !newReg) {
    localStorage.setItem(`gravity:${username}:provider-registry`, oldReg);
    const oldAssign = localStorage.getItem("gravity:agent-assignments");
    if (oldAssign) {
      localStorage.setItem(`gravity:${username}:agent-assignments`, oldAssign);
    }

    try {
      const parsed = JSON.parse(oldReg);
      const providerIds = parsed.map((p: any) => p.id);
      await invoke("migrate_legacy_keys", { username, providerIds });
    } catch (e) {
      console.error("Migration failed", e);
    }

    set({ migrationToastVisible: true });
  }
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  currentUser: null,
  isInitializing: true,
  migrationToastVisible: false,
  hideMigrationToast: () => set({ migrationToastVisible: false }),

  init: async () => {
    try {
      const lastSession = localStorage.getItem("axon:last-session");
      if (lastSession) {
        await performLegacyMigrationIfNeeded(lastSession, set);
        set({ currentUser: lastSession });
        useProviderStore.getState().initForUser(lastSession);
      }
    } catch (e) {
      console.error("Auth init failed", e);
    } finally {
      set({ isInitializing: false });
    }
  },

  login: async (username, password) => {
    const success = await invoke<boolean>("verify_login", { username, password });
    if (success) {
      await performLegacyMigrationIfNeeded(username, set);
      localStorage.setItem("axon:last-session", username);
      set({ currentUser: username });
      useProviderStore.getState().initForUser(username);
    } else {
      throw new Error("Incorrect username or password");
    }
  },

  logout: () => {
    localStorage.removeItem("axon:last-session");
    useStore.getState().resetAllUserState();
    set({ currentUser: null });
  },

  signup: async (username, password, displayName) => {
    await invoke("create_profile", { username, password, displayName });
    // Automatically log in after signup
    localStorage.setItem("axon:last-session", username);
    set({ currentUser: username });
    useProviderStore.getState().initForUser(username);
  },

  listProfiles: async () => {
    return await invoke<ProfileMeta[]>("list_profiles");
  }
}));
