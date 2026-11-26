import { supabase } from '@/lib/supabase';
import type { Message, UserRole } from '@/types/models';

export interface PresenceSnapshot {
  online: boolean;
  lastSeen: string;
  typing: boolean;
  inChat: boolean;
  source: 'supabase' | 'broadcast';
}

export function formatWhatsAppLastSeen(online: boolean, lastSeenIso: string): string {
  if (online) return 'online';
  const d = new Date(lastSeenIso);
  if (Number.isNaN(d.getTime())) return 'offline';
  const now = new Date();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) {
    return `last seen today at ${timeStr}`;
  }
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) {
    return `last seen yesterday at ${timeStr}`;
  }
  return `last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

export function generatePairCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `ONLYUS-${num}`;
}

/**
 * Open-source dual-layer presence & live message sync adapter scoped by a private Pairing Code:
 * 1) Uses Supabase Realtime Presence + Broadcast on `onlyus-room-<pairCode>` when configured.
 * 2) Mirrors via BroadcastChannel on the same device for instant local testing.
 */
export class OpenPresenceClient {
  private role: UserRole;
  private roomCode: string;
  private onPartnerUpdate: (snap: PresenceSnapshot) => void;
  private onIncomingMessage?: (msg: Message) => void;
  private bc: BroadcastChannel | null = null;
  private channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  private invisible = false;

  constructor(
    role: UserRole,
    roomCode: string,
    onPartnerUpdate: (snap: PresenceSnapshot) => void,
    onIncomingMessage?: (msg: Message) => void
  ) {
    this.role = role;
    this.roomCode = (roomCode || 'ONLYUS-849210').trim().toUpperCase();
    this.onPartnerUpdate = onPartnerUpdate;
    this.onIncomingMessage = onIncomingMessage;
  }

  start(inChat = true): void {
    const partnerRole: UserRole = this.role === 'me' ? 'partner' : 'me';
    const topic = `onlyus-room-${this.roomCode}`;

    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel(topic);
      this.bc.onmessage = (ev) => {
        const data = ev.data as
          | { type?: 'presence' | 'message'; role?: UserRole; snap?: PresenceSnapshot; msg?: Message }
          | undefined;
        if (!data || data.role === this.role) return;
        if (data.type === 'message' && data.msg) {
          this.onIncomingMessage?.(data.msg);
        } else if (data.role === partnerRole && data.snap) {
          this.onPartnerUpdate({ ...data.snap, source: 'broadcast' });
        }
      };
      this.publishBroadcast(inChat, false);
    }

    if (supabase) {
      try {
        this.channel = supabase.channel(topic, {
          config: { presence: { key: this.role } },
        });
        this.channel
          .on('presence', { event: 'sync' }, () => {
            if (!this.channel) return;
            const state = this.channel.presenceState<{
              online: boolean;
              lastSeen: string;
              typing: boolean;
              inChat: boolean;
            }>();
            const entries = state[partnerRole];
            if (entries && entries.length > 0) {
              const latest = entries[entries.length - 1];
              this.onPartnerUpdate({
                online: Boolean(latest.online),
                lastSeen: latest.lastSeen || new Date().toISOString(),
                typing: Boolean(latest.typing),
                inChat: Boolean(latest.inChat),
                source: 'supabase',
              });
            }
          })
          .on('broadcast', { event: 'chat_message' }, (payload) => {
            const p = payload.payload as { role?: UserRole; msg?: Message } | undefined;
            if (p?.role && p.role !== this.role && p.msg) {
              this.onIncomingMessage?.(p.msg);
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && this.channel) {
              await this.channel.track({
                online: !this.invisible,
                lastSeen: new Date().toISOString(),
                typing: false,
                inChat,
              });
            }
          });
      } catch {
        // Fallback to BroadcastChannel
      }
    }
  }

  broadcastMessage(msg: Message): void {
    this.bc?.postMessage({ type: 'message', role: this.role, msg });
    if (this.channel) {
      void this.channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: { role: this.role, msg },
      });
    }
  }

  setInvisible(invisible: boolean, inChat = true): void {
    this.invisible = invisible;
    this.publishBroadcast(inChat, false);
    if (this.channel) {
      void this.channel.track({
        online: !invisible,
        lastSeen: new Date().toISOString(),
        typing: false,
        inChat,
      });
    }
  }

  setTyping(typing: boolean, inChat = true): void {
    this.publishBroadcast(inChat, typing);
    if (this.channel) {
      void this.channel.track({
        online: !this.invisible,
        lastSeen: new Date().toISOString(),
        typing,
        inChat,
      });
    }
  }

  private publishBroadcast(inChat: boolean, typing: boolean): void {
    this.bc?.postMessage({
      type: 'presence',
      role: this.role,
      snap: {
        online: !this.invisible,
        lastSeen: new Date().toISOString(),
        typing,
        inChat,
        source: 'broadcast',
      } satisfies PresenceSnapshot,
    });
  }

  stop(): void {
    this.bc?.close();
    this.bc = null;
    if (this.channel && supabase) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
