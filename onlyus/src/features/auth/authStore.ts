import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  ready: boolean;
  recovering: boolean;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
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

export const useAuth = create<AuthState>((set) => ({
  session: null, user: null, ready: false, recovering: false,

  init() {
    if (!supabase) { set({ ready: true }); return () => {}; }
    supabase.auth.getSession().then(({ data }) =>
      set({ session: data.session, user: data.session?.user ?? null, ready: true }));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null, ready: true, ...(event === 'PASSWORD_RECOVERY' ? { recovering: true } : {}) });
    });
    return () => sub.subscription.unsubscribe();
  },

  async signIn(email, password) {
    if (!supabase) return 'Supabase is not configured in Prototype Mode.';
    const b = backoff();
    if (Date.now() < b.until) return `Too many attempts. Try again in ${Math.ceil((b.until - Date.now()) / 1000)}s.`;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      const n = b.n + 1;
      const wait = WAIT_MS[Math.min(n, WAIT_MS.length - 1)];
      localStorage.setItem(FAIL_KEY, JSON.stringify({ n, until: Date.now() + wait }));
      return 'Incorrect email or password.';           // deliberately generic
    }
    localStorage.removeItem(FAIL_KEY);
    return null;
  },

  async signOut() { if (supabase) await supabase.auth.signOut({ scope: 'local' }); },
  async signOutEverywhere() { if (supabase) await supabase.auth.signOut({ scope: 'global' }); },

  async sendReset(email) {
    if (!supabase) return;
    // Always resolves the same way so the form can't be used to probe which emails exist.
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reset` });
  },

  async setNewPassword(password) {
    if (!supabase) return 'Supabase is not configured in Prototype Mode.';
    if (password.length < 12) return 'Use at least 12 characters.';
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return 'Could not update password. Open the reset link again.';
    set({ recovering: false });
    return null;
  }
}));
