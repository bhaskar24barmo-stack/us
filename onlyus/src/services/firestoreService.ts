import {
  collection,
  doc,
  addDoc,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { firestoreDb } from '@/lib/firebase';

export interface FirestoreMessage {
  id?: string;
  conversationId: string;
  senderId: string;
  kind: string;
  content: string;
  mediaUrl?: string;
  reactions?: Record<string, string>;
  isWhisper?: boolean;
  expiresAt?: string;
  createdAt?: unknown;
}

/**
 * Send a message to Firestore under conversations/{convId}/messages
 */
export async function sendFirestoreMessage(
  conversationId: string,
  message: Omit<FirestoreMessage, 'id' | 'createdAt'>
) {
  const messagesRef = collection(firestoreDb, 'conversations', conversationId, 'messages');
  return await addDoc(messagesRef, {
    ...message,
    conversationId,
    createdAt: serverTimestamp(),
  });
}

/**
 * Real-time listener for messages in a conversation
 */
export function subscribeFirestoreMessages(
  conversationId: string,
  callback: (messages: FirestoreMessage[]) => void,
  messageLimit = 50
) {
  const messagesRef = collection(firestoreDb, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(messageLimit));

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const list: FirestoreMessage[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<FirestoreMessage, 'id'>),
    }));
    callback(list);
  });
}

/**
 * Sync user presence in Firestore
 */
export async function setFirestoreUserPresence(
  userId: string,
  data: {
    status?: string;
    batteryLevel?: number;
    isCharging?: boolean;
    lastSeen?: unknown;
  }
) {
  const presenceRef = doc(firestoreDb, 'user_presence', userId);
  return await setDoc(
    presenceRef,
    {
      ...data,
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Real-time listener for partner presence
 */
export function subscribeFirestorePartnerPresence(
  partnerId: string,
  callback: (presence: DocumentData | null) => void
) {
  const presenceRef = doc(firestoreDb, 'user_presence', partnerId);
  return onSnapshot(presenceRef, (docSnap: DocumentSnapshot<DocumentData>) => {
    if (docSnap.exists()) {
      callback(docSnap.data() || null);
    } else {
      callback(null);
    }
  });
}

/**
 * Save daily question answer
 */
export async function submitFirestoreDailyAnswer(
  dateStr: string,
  userId: string,
  questionId: string,
  answer: string
) {
  const answerRef = doc(firestoreDb, 'daily_answers', `${dateStr}_${userId}`);
  return await setDoc(answerRef, {
    date: dateStr,
    userId,
    questionId,
    answer,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetch daily answers for a couple
 */
export async function getFirestoreDailyAnswers(dateStr: string) {
  const answersRef = collection(firestoreDb, 'daily_answers');
  const q = query(answersRef);
  const snap = await getDocs(q);
  return snap.docs
    .map((d: QueryDocumentSnapshot<DocumentData>) => d.data())
    .filter((d: DocumentData) => d.date === dateStr);
}
