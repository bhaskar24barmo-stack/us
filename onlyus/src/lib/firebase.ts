import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration for Firebase project onlyus-2026
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA_ONLYUS_REPLACE_WITH_WEB_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'onlyus-2026.firebaseapp.com',
  projectId: 'onlyus-2026',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'onlyus-2026.appspot.com',
  messagingSenderId: '873044245775',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:873044245775:web:onlyus-client',
};

// Singleton pattern to prevent re-initialization during HMR
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);
