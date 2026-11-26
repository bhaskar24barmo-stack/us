import { openDB, type IDBPDatabase } from 'idb';
import type { OutboxItem } from '@/types/models';

const DB_NAME = 'onlyus-chat-db';
const STORE_NAME = 'outbox';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

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

export async function flushOutbox(
  sendFn: (item: OutboxItem) => Promise<{ ok: boolean; error?: string }>
): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const items = await getOutboxItems();
  for (const item of items) {
    if (item.status === 'sending') continue;
    await updateOutboxItem(item.client_id, { status: 'sending' });
    const res = await sendFn(item);
    if (res.ok) {
      await removeOutboxItem(item.client_id);
    } else {
      const attempts = item.attempts + 1;
      await updateOutboxItem(item.client_id, {
        status: 'failed',
        attempts,
        lastError: res.error ?? 'Network error',
      });
    }
  }
}
