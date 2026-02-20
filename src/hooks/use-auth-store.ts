import { create } from "zustand";
import {
  clearStoredSession,
  isSessionExpiring,
  loadStoredSession,
  refreshSession,
  saveStoredSession,
  signInWithPassword,
  signOutWithToken,
  signUpWithPassword,
  type SupabaseAuthSession,
  type SupabaseAuthUser,
} from "@/lib/supabase-auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthResult {
  ok: boolean;
  message?: string;
}

interface AuthStore {
  status: AuthStatus;
  user: SupabaseAuthUser | null;
  session: SupabaseAuthSession | null;
  initialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

function applySession(
  set: (state: Partial<AuthStore>) => void,
  session: SupabaseAuthSession,
) {
  saveStoredSession(session);
  set({
    session,
    user: session.user,
    status: "authenticated",
    initialized: true,
    error: null,
  });
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: "loading",
  user: null,
  session: null,
  initialized: false,
  error: null,

  initialize: async () => {
    if (get().initialized) {
      return;
    }

    set({ status: "loading", error: null });
    const stored = loadStoredSession();

    if (!stored) {
      set({
        status: "unauthenticated",
        user: null,
        session: null,
        initialized: true,
      });
      return;
    }

    try {
      if (isSessionExpiring(stored)) {
        const refreshed = await refreshSession(stored.refresh_token);
        applySession(set, refreshed);
        return;
      }

      set({
        status: "authenticated",
        session: stored,
        user: stored.user,
        initialized: true,
        error: null,
      });
    } catch (error) {
      clearStoredSession();
      set({
        status: "unauthenticated",
        user: null,
        session: null,
        initialized: true,
        error: error instanceof Error ? error.message : "Failed to restore session.",
      });
    }
  },

  signIn: async (email: string, password: string): Promise<AuthResult> => {
    set({ status: "loading", error: null });

    try {
      const session = await signInWithPassword(email, password);
      applySession(set, session);
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Sign-in failed. Please try again.";
      clearStoredSession();
      set({
        status: "unauthenticated",
        user: null,
        session: null,
        initialized: true,
        error: message,
      });
      return { ok: false, message };
    }
  },

  signUp: async (email: string, password: string): Promise<AuthResult> => {
    set({ status: "loading", error: null });

    try {
      const result = await signUpWithPassword(email, password);
      if (result.session) {
        applySession(set, result.session);
        return { ok: true };
      }

      clearStoredSession();
      set({
        status: "unauthenticated",
        user: null,
        session: null,
        initialized: true,
        error: null,
      });

      return {
        ok: true,
        message:
          "Account created. Check your email for the confirmation link, then sign in.",
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Sign-up failed. Please try again.";
      clearStoredSession();
      set({
        status: "unauthenticated",
        user: null,
        session: null,
        initialized: true,
        error: message,
      });
      return { ok: false, message };
    }
  },

  signOut: async () => {
    const current = get().session;
    if (current?.access_token) {
      try {
        await signOutWithToken(current.access_token);
      } catch {
        // best effort: still clear local session
      }
    }

    clearStoredSession();
    set({
      status: "unauthenticated",
      user: null,
      session: null,
      initialized: true,
      error: null,
    });
  },
}));
