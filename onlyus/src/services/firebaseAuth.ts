import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';

export interface FirebaseUserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Register a new user with email and password
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential.user;
}

/**
 * Sign in existing user with email and password
 */
export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, pass);
  return userCredential.user;
}

/**
 * Sign out from Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  await signOut(firebaseAuth);
}

/**
 * Send password reset email
 */
export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email);
}

/**
 * Listen to real-time Firebase Auth state changes
 */
export function subscribeToFirebaseAuthState(
  callback: (user: FirebaseUserSession | null) => void
): () => void {
  return onAuthStateChanged(firebaseAuth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      callback(null);
    }
  });
}
