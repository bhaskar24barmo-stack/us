import { supabase } from '@/lib/supabase';
import type { Message, MessageKind, OutboxItem } from '@/types/models';

function mapRowToMessage(row: Record<string, unknown>): Message {
  const payload = (row.payload as Record<string, unknown>) || {};
  const media = (payload.media as Message['media']) || null;

  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    sender_id: String(row.sender_id),
    client_id: String(row.client_id),
    kind: (row.kind as MessageKind) ?? 'text',
    body: (row.body as string | null) ?? null,
    media,
    sticker_id: (payload.sticker_id as string) || null,
    gif_id: (payload.gif_id as string) || null,
    gif_url: (payload.gif_url as string) || null,
    gif_title: (payload.gif_title as string) || null,
    poll: (payload.poll as Message['poll']) || null,
    song: (payload.song as Message['song']) || null,
    saved_in_chat: Boolean(payload.saved_in_chat),
    is_snap: Boolean(payload.is_snap),
    snap_viewed: Boolean(payload.snap_viewed),
    revealed: Boolean(payload.revealed),
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
}

export async function fetchConversationMessages(
  conversationId: string,
  limit = 40,
  beforeIso?: string
): Promise<Message[]> {
  if (!supabase) return [];
  let q = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (beforeIso) {
    q = q.lt('created_at', beforeIso);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  return (data as Array<Record<string, unknown>>).reverse().map(mapRowToMessage);
}

export async function sendOutboxMessageToSupabase(
  item: OutboxItem
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: true };
  const allowedKinds = ['text', 'image', 'video', 'voice', 'file', 'sticker', 'gif', 'love_note', 'system', 'poll', 'whisper', 'song'];
  const safeKind = allowedKinds.includes(item.kind) ? item.kind : 'text';

  const { error } = await supabase.from('messages').upsert(
    {
      conversation_id: item.conversation_id,
      sender_id: item.sender_id,
      client_id: item.client_id,
      kind: safeKind,
      body: item.body,
      reply_to_id: item.reply_to_id,
      expires_at: item.expires_at,
      payload: item.payload || {},
    },
    { onConflict: 'sender_id,client_id', ignoreDuplicates: true }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markConversationDeliveredRpc(
  conversationId: string,
  upToIso?: string
): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('mark_delivered', {
    cid: conversationId,
    up_to: upToIso ?? new Date().toISOString(),
  });
}

export async function markConversationReadRpc(
  conversationId: string,
  upToIso?: string
): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('mark_read', {
    cid: conversationId,
    up_to: upToIso ?? new Date().toISOString(),
  });
}

export async function toggleMessagePinRpc(messageId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc('toggle_message_pin', { mid: messageId });
  return (data as string | null) ?? null;
}

export async function searchMessagesRpc(
  conversationId: string,
  query: string,
  limit = 30
): Promise<Message[]> {
  if (!supabase || !query.trim()) return [];
  const { data, error } = await supabase.rpc('search_messages', {
    cid: conversationId,
    search_query: query.trim(),
    result_limit: limit,
  });
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map(mapRowToMessage);
}

export function subscribeToConversation(
  conversationId: string,
  onInsertOrUpdate: (msg: Message) => void
): () => void {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(`conv:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown> | undefined;
        if (!row?.id) return;
        onInsertOrUpdate(mapRowToMessage(row));
      }
    )
    .subscribe();

  return () => {
    if (supabase) void supabase.removeChannel(ch);
  };
}
