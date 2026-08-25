import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import fileConfig from '../../firebase-applet-config.json';

// Read runtime environment variables if provided (e.g. on Vercel deployment)
const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env
    : {};

// Firebase configuration for project 'spark-gen-technology'
export const activeFirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || fileConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || 'spark-gen-technology.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || fileConfig.projectId || 'spark-gen-technology',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || 'spark-gen-technology.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId || '1068481200061',
  appId: env.VITE_FIREBASE_APP_ID || fileConfig.appId || '1:1068481200061:web:468b6712839ff721155cd4',
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || fileConfig.firestoreDatabaseId || '',
};

export const isFirebaseConfigured = Boolean(
  activeFirebaseConfig.apiKey &&
  activeFirebaseConfig.apiKey !== '' &&
  activeFirebaseConfig.projectId &&
  activeFirebaseConfig.projectId !== ''
);

// Initialize Firebase App
const app = !getApps().length ? initializeApp(activeFirebaseConfig) : getApp();

// Log Firebase runtime initialization status for diagnostics
if (typeof window !== 'undefined') {
  console.log('[Firebase Runtime Init]', {
    projectId: app.options.projectId,
    authDomain: app.options.authDomain,
    appId: app.options.appId,
    messagingSenderId: app.options.messagingSenderId,
    apiKeyConfigured: Boolean(app.options.apiKey),
    apiKeyPrefix: app.options.apiKey ? `${String(app.options.apiKey).substring(0, 8)}...` : 'None',
  });
}

export const auth = getAuth(app);
export const db =
  activeFirebaseConfig.firestoreDatabaseId &&
  activeFirebaseConfig.firestoreDatabaseId !== '(default)' &&
  activeFirebaseConfig.firestoreDatabaseId !== ''
    ? getFirestore(app, activeFirebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export default app;
