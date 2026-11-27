import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/useAppStore';
import type { UserRole } from '@/types/models';

interface AuthState {
  session: Session | null;
  user: User | null;
  ready: boolean;
  recovering: boolean;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  setNewPassword: (password: string) => Promise<string | null>;
}

const FAIL_KEY = 'onlyus.loginFails';
const WAIT_MS = [0, 0, 0, 5_000, 15_000, 30_000, 60_000, 300_000];

function backoff() {
  const raw = JSON.parse(localStorage.getItem(FAIL_KEY) ?? '{"n":0,"until":0}') as { n: number; until: number };
  return raw;
}

function syncAppStoreUser(session: Session | null) {
  if (session?.user?.email) {
    const email = session.user.email.toLowerCase();
    const role: UserRole = email.includes('gnbhaskar') ? 'me' : 'partner';
    useAppStore.getState().signInAsRole(role);
    useAppStore.getState().completeOnboarding();
  }
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  ready: false,
  recovering: false,

  init() {
    if (!supabase) {
      set({ ready: true });
      return () => {};
    }

    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true });
      syncAppStoreUser(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      set({
        session,
        user: session?.user ?? null,
        ready: true,
        ...(event === 'PASSWORD_RECOVERY' ? { recovering: true } : {}),
      });

      if (event === 'SIGNED_OUT') {
        useAppStore.setState({ currentUserRole: null, onboarded: false, activeCall: null });
      } else {
        syncAppStoreUser(session);
      }
    });

    return () => sub.subscription.unsubscribe();
  },

  async signIn(email, password) {
    if (!supabase) return 'Supabase is not configured in Prototype Mode.';
    const b = backoff();
    if (Date.now() < b.until) return `Too many attempts. Try again in ${Math.ceil((b.until - Date.now()) / 1000)}s.`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      const n = b.n + 1;
      const wait = WAIT_MS[Math.min(n, WAIT_MS.length - 1)];
      localStorage.setItem(FAIL_KEY, JSON.stringify({ n, until: Date.now() + wait }));
      return error.message || 'Incorrect email or password.';
    }
    localStorage.removeItem(FAIL_KEY);
    if (data.session) {
      set({ session: data.session, user: data.session.user, ready: true });
      syncAppStoreUser(data.session);
    }
    return null;
  },

  async signInWithOtp(email) {
    if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },

  async verifyOtp(email, token) {
    if (!supabase) return { ok: false, error: 'Supabase is not configured.' };
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: token.trim(),
      type: 'email',
    });
    if (error) return { ok: false, error: error.message };
    if (data.session) {
      set({ session: data.session, user: data.session.user, ready: true });
      syncAppStoreUser(data.session);
    }
    return { ok: true };
  },

  async signOut() {
    if (supabase) await supabase.auth.signOut({ scope: 'local' });
    useAppStore.setState({ currentUserRole: null, onboarded: false, activeCall: null });
  },

  async signOutEverywhere() {
    if (supabase) await supabase.auth.signOut({ scope: 'global' });
    useAppStore.setState({ currentUserRole: null, onboarded: false, activeCall: null });
  },

  async sendReset(email) {
    if (!supabase) return;
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset`,
    });
  },

  async setNewPassword(password) {
    if (!supabase) return 'Supabase is not configured in Prototype Mode.';
    if (password.length < 8) return 'Use at least 8 characters.';
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message || 'Could not update password.';
    set({ recovering: false });
    return null;
  },
}));
