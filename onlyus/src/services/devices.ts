import { supabase } from '@/lib/supabase';

const KEY = 'onlyus.deviceId';

function label(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
    ? 'Android'
    : /Mac/.test(ua)
    ? 'macOS'
    : /Windows/.test(ua)
    ? 'Windows'
    : 'Browser';
  const br = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
    ? 'Chrome'
    : /Safari\//.test(ua)
    ? 'Safari'
    : /Firefox\//.test(ua)
    ? 'Firefox'
    : 'Browser';
  return `${br} on ${os}`;
}

/** Registers/refreshes this device. Returns false if the device was revoked. */
export async function registerDevice(userId: string): Promise<boolean> {
  if (!supabase) return true;
  const existing = localStorage.getItem(KEY);
  if (existing) {
    const { data, error } = await supabase
      .from('user_devices')
      .select('id, revoked_at')
      .eq('id', existing)
      .maybeSingle();
    if (!error && data) {
      if (data.revoked_at) return false;
      await supabase
        .from('user_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existing);
      return true;
    }
  }
  const { data, error } = await supabase
    .from('user_devices')
    .insert({ user_id: userId, label: label(), platform: navigator.platform })
    .select('id')
    .single();
  if (!error && data) {
    localStorage.setItem(KEY, data.id);
    return true;
  }
  return false;
}

/** Subscribes to live device revocation so existing sessions are signed out immediately when revoked. */
export function subscribeDeviceRevocation(userId: string, onRevoked: () => void): () => void {
  const deviceId = localStorage.getItem(KEY);
  if (!supabase || !deviceId) return () => {};

  const ch = supabase
    .channel(`device-revocation-${deviceId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_devices',
        filter: `id=eq.${deviceId}`,
      },
      (payload) => {
        const row = payload.new as { revoked_at?: string | null; user_id?: string };
        if (row.user_id === userId && row.revoked_at) {
          onRevoked();
        }
      }
    )
    .subscribe();

  return () => {
    if (supabase) void supabase.removeChannel(ch);
  };
}

export const currentDeviceId = () => localStorage.getItem(KEY);

export async function listDevices() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_devices')
    .select('*')
    .order('last_seen_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Soft-revokes a device (triggers live sign-out on that device via Realtime + AuthGate). */
export async function revokeDevice(id: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from('user_devices')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
