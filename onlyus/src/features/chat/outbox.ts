import { openDB, type IDBPDatabase } from 'idb';
import type { OutboxItem } from '@/types/models';

export type OutboxStatus = 'queued' | 'sending' | 'sent' | 'failed';
export type OutboxListener = (clientId: string, status: OutboxStatus, error?: string) => void;

const DB_NAME = 'onlyus-chat-db';
const STORE_NAME = 'outbox';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;
const listeners = new Set<OutboxListener>();

export function subscribeOutbox(listener: OutboxListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(clientId: string, status: OutboxStatus, error?: string) {
  for (const listener of listeners) {
    try {
      listener(clientId, status, error);
    } catch (err) {
      console.warn('Outbox listener error:', err);
    }
  }
}

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'client_id' });
          store.createIndex('created_at', 'created_at');
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueOutbox(item: OutboxItem): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, item);
  notify(item.client_id, 'queued');
}

export async function getOutboxItems(): Promise<OutboxItem[]> {
  const db = await getDb();
  const all = (await db.getAllFromIndex(STORE_NAME, 'created_at')) as OutboxItem[];
  return all;
}

export async function updateOutboxItem(
  clientId: string,
  patch: Partial<OutboxItem>
): Promise<void> {
  const db = await getDb();
  const existing = (await db.get(STORE_NAME, clientId)) as OutboxItem | undefined;
  if (!existing) return;
  await db.put(STORE_NAME, { ...existing, ...patch });
}

export async function removeOutboxItem(clientId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, clientId);
}

export async function retryOutboxItem(
  clientId: string,
  sendFn: (item: OutboxItem) => Promise<{ ok: boolean; error?: string }>
): Promise<void> {
  const db = await getDb();
  const item = (await db.get(STORE_NAME, clientId)) as OutboxItem | undefined;
  if (!item) return;

  notify(clientId, 'sending');
  await updateOutboxItem(clientId, { status: 'sending' });

  const res = await sendFn(item);
  if (res.ok) {
    await removeOutboxItem(clientId);
    notify(clientId, 'sent');
  } else {
    const attempts = (item.attempts || 0) + 1;
    const lastError = res.error ?? 'Network error';
    await updateOutboxItem(clientId, {
      status: 'failed',
      attempts,
      lastError,
    });
    notify(clientId, 'failed', lastError);
  }
}

export async function flushOutbox(
  sendFn: (item: OutboxItem) => Promise<{ ok: boolean; error?: string }>
): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }
  const items = await getOutboxItems();
  for (const item of items) {
    if (item.status === 'sending') continue;
    notify(item.client_id, 'sending');
    await updateOutboxItem(item.client_id, { status: 'sending' });
    const res = await sendFn(item);
    if (res.ok) {
      await removeOutboxItem(item.client_id);
      notify(item.client_id, 'sent');
    } else {
      const attempts = (item.attempts || 0) + 1;
      const lastError = res.error ?? 'Network error';
      await updateOutboxItem(item.client_id, {
        status: 'failed',
        attempts,
        lastError,
      });
      notify(item.client_id, 'failed', lastError);
    }
  }
}
