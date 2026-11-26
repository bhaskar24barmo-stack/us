import { supabase } from '@/lib/supabase';
import type { CallKind, UserRole } from '@/types/models';

export type CallSignalPayload =
  | { type: 'call:ring'; callId: string; kind: CallKind; fromRole: UserRole }
  | { type: 'call:accept'; callId: string; fromRole: UserRole }
  | { type: 'call:decline'; callId: string; fromRole: UserRole }
  | { type: 'call:end'; callId: string; fromRole: UserRole };

const activeChannels = new Map<string, ReturnType<NonNullable<typeof supabase>['channel']>>();

export function broadcastCallSignal(pairCode: string, payload: CallSignalPayload): void {
  const topic = `onlyus-call-${pairCode}`;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(topic);
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    // Ignore BroadcastChannel restriction
  }

  if (supabase) {
    const ch = activeChannels.get(topic);
    if (ch) {
      void ch.send({ type: 'broadcast', event: 'call-signal', payload });
    } else {
      const temp = supabase.channel(topic);
      temp.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void temp.send({ type: 'broadcast', event: 'call-signal', payload }).finally(() => {
            void supabase?.removeChannel(temp);
          });
        }
      });
    }
  }
}

export function subscribeCallSignals(
  pairCode: string,
  myRole: UserRole,
  onSignal: (payload: CallSignalPayload) => void,
): () => void {
  const topic = `onlyus-call-${pairCode}`;
  let bc: BroadcastChannel | null = null;

  const handle = (payload: CallSignalPayload | undefined) => {
    if (!payload || payload.fromRole === myRole) return;
    onSignal(payload);
  };

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(topic);
      bc.onmessage = (ev) => handle(ev.data as CallSignalPayload);
    }
  } catch {
    // Ignore BroadcastChannel restriction
  }

  let sbChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  if (supabase) {
    sbChannel = supabase
      .channel(topic)
      .on('broadcast', { event: 'call-signal' }, ({ payload }) => {
        handle(payload as CallSignalPayload);
      })
      .subscribe();
    activeChannels.set(topic, sbChannel);
  }

  return () => {
    bc?.close();
    if (sbChannel && supabase) {
      activeChannels.delete(topic);
      void supabase.removeChannel(sbChannel);
    }
  };
}
