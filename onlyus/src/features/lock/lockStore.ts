import { create } from 'zustand';
import { useAuth } from '@/features/auth/authStore';

/**
 * App lock = a LOCAL convenience lock (shoulder-surfing / borrowed-phone protection).
 * It is NOT server security: the Supabase session still exists on the device.
 * The PIN is stored as PBKDF2 hash + salt; the biometric option uses a WebAuthn platform
 * authenticator as a local user-presence check (no server-side verification).
 */
const KEY = 'onlyus.lock';
const ITER = 210_000;

interface Stored { salt: string; hash: string; timeoutMs: number; credId?: string; fails: number; until: number }

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin) as BufferSource, 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITER }, key, 256));
}
const load = (): Stored | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } };
const save = (s: Stored | null) => (s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY));

export type UnlockResult = 'ok' | 'bad' | 'wait' | 'wiped';

interface LockState {
  enabled: boolean; locked: boolean; timeoutMs: number; biometric: boolean;
  init: () => void; lock: () => void;
  setPin: (pin: string) => Promise<void>;
  removePin: (pin: string) => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<UnlockResult>;
  setTimeoutMs: (ms: number) => void;
  enableBiometric: () => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
}

export const useLock = create<LockState>((set, get) => ({
  enabled: false, locked: false, timeoutMs: 60_000, biometric: false,

  init() {
    const s = load();
    set({ enabled: !!s, locked: !!s, timeoutMs: s?.timeoutMs ?? 60_000, biometric: !!s?.credId });
  },
  lock() { if (get().enabled) set({ locked: true }); },

  async setPin(pin) {
    if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    save({ salt: b64(salt), hash: await derive(pin, salt), timeoutMs: get().timeoutMs, fails: 0, until: 0 });
    set({ enabled: true, locked: false, biometric: false });
  },

  async removePin(pin) {
    const s = load();
    if (!s || (await derive(pin, unb64(s.salt))) !== s.hash) return false;
    save(null); set({ enabled: false, locked: false, biometric: false });
    return true;
  },

  async unlockWithPin(pin) {
    const s = load();
    if (!s) { set({ locked: false }); return 'ok'; }
    if (Date.now() < s.until) return 'wait';
    if ((await derive(pin, unb64(s.salt))) === s.hash) { save({ ...s, fails: 0, until: 0 }); set({ locked: false }); return 'ok'; }
    const fails = s.fails + 1;
    if (fails >= 10) {                              // too many guesses: wipe lock + force full re-login
      save(null); set({ enabled: false, locked: false, biometric: false });
      await useAuth.getState().signOut();
      return 'wiped';
    }
    save({ ...s, fails, until: fails >= 5 ? Date.now() + 30_000 * 2 ** (fails - 5) : 0 });
    return 'bad';
  },

  setTimeoutMs(ms) { const s = load(); if (s) save({ ...s, timeoutMs: ms }); set({ timeoutMs: ms }); },

  async enableBiometric() {
    const s = load();
    if (!s || !window.PublicKeyCredential) return false;
    try {
      const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!ok) return false;
      const cred = (await navigator.credentials.create({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'ONLYUS' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'onlyus-local', displayName: 'ONLYUS' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60_000
      } })) as PublicKeyCredential | null;
      if (!cred) return false;
      save({ ...s, credId: b64(cred.rawId) });
      set({ biometric: true });
      return true;
    } catch { return false; }
  },

  async unlockWithBiometric() {
    const s = load();
    if (!s?.credId) return false;
    try {
      const res = await navigator.credentials.get({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: unb64(s.credId) as BufferSource }],
        userVerification: 'required', timeout: 60_000
      } });
      if (res) { set({ locked: false }); return true; }
    } catch { /* cancelled or failed: fall back to PIN */ }
    return false;
  }
}));
