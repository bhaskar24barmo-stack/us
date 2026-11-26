import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchConversationMessages } from '@/services/chatSync';
import type { Message, PingKind } from '@/types/models';

export interface RealtimeCallbacks {
  onMessage?: (msg: Message) => void;
  onTyping?: (userId: string, typing: boolean) => void;
  onPresenceSync?: (onlineUserIds: string[]) => void;
  onPing?: (kind: PingKind, senderId: string) => void;
  onGapFill?: (messages: Message[]) => void;
}

/**
 * Single Realtime subscription manager for ONLYUS.
 * Uses private conversation channels (`conv:<id>`), auto-resubscribes on
 * app resume / network reconnect, and gap-fills missed messages.
 */
class RealtimeManager {
  private channel: RealtimeChannel | null = null;
  private conversationId: string | null = null;
  private userId: string | null = null;
  private lastKnownCreatedAt: string | null = null;
  private callbacks: RealtimeCallbacks = {};
  private cleanupListeners: (() => void) | null = null;

  start(conversationId: string, userId: string, callbacks: RealtimeCallbacks, lastCreatedAt?: string) {
    this.stop();
    this.conversationId = conversationId;
    this.userId = userId;
    this.callbacks = callbacks;
    this.lastKnownCreatedAt = lastCreatedAt ?? null;

    this.subscribe();

    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        void this.resyncAndGapFill();
      }
    };
    const handleOnline = () => {
      void this.resyncAndGapFill();
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('online', handleOnline);

    this.cleanupListeners = () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('online', handleOnline);
    };
  }

  updateLastCreatedAt(iso: string) {
    if (!this.lastKnownCreatedAt || iso > this.lastKnownCreatedAt) {
      this.lastKnownCreatedAt = iso;
    }
  }

  private subscribe() {
    if (!supabase || !this.conversationId || !this.userId) return;
    const cid = this.conversationId;
    const uid = this.userId;

    const ch = supabase.channel(`conv:${cid}`, {
      config: {
        presence: { key: uid },
      },
    });

    ch.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${cid}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown> | undefined;
        if (!row?.id) return;
        const msg: Message = {
          id: String(row.id),
          conversation_id: String(row.conversation_id),
          sender_id: String(row.sender_id),
          client_id: String(row.client_id),
          kind: (row.kind as Message['kind']) ?? 'text',
          body: (row.body as string | null) ?? null,
          reply_to_id: (row.reply_to_id as string | null) ?? null,
          reactions: [],
          edited_at: (row.edited_at as string | null) ?? null,
          deleted_at: (row.deleted_at as string | null) ?? null,
          pinned_at: (row.pinned_at as string | null) ?? null,
          delivered_at: (row.delivered_at as string | null) ?? null,
          read_at: (row.read_at as string | null) ?? null,
          expires_at: (row.expires_at as string | null) ?? null,
          created_at: String(row.created_at),
        };
        this.updateLastCreatedAt(msg.created_at);
        this.callbacks.onMessage?.(msg);
      }
    )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId && payload.userId !== uid) {
          this.callbacks.onTyping?.(String(payload.userId), Boolean(payload.typing));
        }
      })
      .on('broadcast', { event: 'ping' }, ({ payload }) => {
        if (payload?.senderId && payload.senderId !== uid && payload?.kind) {
          this.callbacks.onPing?.(payload.kind as PingKind, String(payload.senderId));
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState();
        this.callbacks.onPresenceSync?.(Object.keys(state));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void ch.track({ user_id: uid, online_at: new Date().toISOString() });
        }
      });

    this.channel = ch;
  }

  async sendTyping(typing: boolean) {
    if (!this.channel || !this.userId) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: this.userId, typing },
    });
  }

  async sendPingBroadcast(kind: PingKind) {
    if (!this.channel || !this.userId) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'ping',
      payload: { senderId: this.userId, kind },
    });
  }

  async resyncAndGapFill() {
    if (!supabase || !this.conversationId) return;
    const latest = await fetchConversationMessages(this.conversationId, 40);
    const missed = this.lastKnownCreatedAt
      ? latest.filter((m) => m.created_at > this.lastKnownCreatedAt!)
      : latest;
    if (missed.length > 0) {
      this.updateLastCreatedAt(missed[missed.length - 1].created_at);
      this.callbacks.onGapFill?.(missed);
    }
    if (!this.channel) {
      this.subscribe();
    }
  }

  stop() {
    this.cleanupListeners?.();
    this.cleanupListeners = null;
    if (this.channel && supabase) {
      void supabase.removeChannel(this.channel);
    }
    this.channel = null;
  }
}

export const realtimeManager = new RealtimeManager();
