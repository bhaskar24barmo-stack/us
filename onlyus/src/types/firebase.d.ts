declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: Record<string, unknown>;
  }
  export function initializeApp(config: Record<string, unknown>): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(name?: string): FirebaseApp;
}

declare module 'firebase/auth' {
  import { FirebaseApp } from 'firebase/app';

  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }

  export interface UserCredential {
    user: User;
  }

  export interface Auth {
    app: FirebaseApp;
    currentUser: User | null;
  }

  export function getAuth(app?: FirebaseApp): Auth;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, pass: string): Promise<UserCredential>;
  export function signInWithEmailAndPassword(auth: Auth, email: string, pass: string): Promise<UserCredential>;
  export function signOut(auth: Auth): Promise<void>;
  export function sendPasswordResetEmail(auth: Auth, email: string): Promise<void>;
  export function updateProfile(user: User, profile: { displayName?: string; photoURL?: string }): Promise<void>;
  export function onAuthStateChanged(auth: Auth, nextOrObserver: (user: User | null) => void): () => void;
}

declare module 'firebase/firestore' {
  import { FirebaseApp } from 'firebase/app';

  export interface Firestore {
    app: FirebaseApp;
  }

  export interface DocumentData {
    [field: string]: any;
  }

  export interface DocumentReference<T = DocumentData> {
    id: string;
    path: string;
  }

  export interface CollectionReference<T = DocumentData> {
    id: string;
    path: string;
  }

  export interface Query<T = DocumentData> {
    [key: string]: any;
  }

  export interface QueryDocumentSnapshot<T = DocumentData> {
    id: string;
    data(): T;
    exists(): boolean;
  }

  export interface QuerySnapshot<T = DocumentData> {
    docs: QueryDocumentSnapshot<T>[];
    empty: boolean;
    size: number;
  }

  export interface DocumentSnapshot<T = DocumentData> {
    id: string;
    data(): T | undefined;
    exists(): boolean;
  }

  export function getFirestore(app?: FirebaseApp): Firestore;
  export function collection(firestore: Firestore, ...pathSegments: string[]): CollectionReference;
  export function doc(firestore: Firestore, ...pathSegments: string[]): DocumentReference;
  export function addDoc(reference: CollectionReference, data: DocumentData): Promise<DocumentReference>;
  export function setDoc(reference: DocumentReference, data: DocumentData, options?: { merge?: boolean }): Promise<void>;
  export function updateDoc(reference: DocumentReference, data: DocumentData): Promise<void>;
  export function query(query: CollectionReference, ...queryConstraints: any[]): Query;
  export function orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): any;
  export function limit(limitNum: number): any;
  export function onSnapshot(reference: any, observer: (snapshot: any) => void): () => void;
  export function serverTimestamp(): any;
  export function getDocs(query: Query): Promise<QuerySnapshot>;
}
