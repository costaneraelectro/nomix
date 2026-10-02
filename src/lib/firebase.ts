import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Sin credenciales la app funciona en modo local (localStorage) para poder probarla. */
export const firebaseEnabled = Boolean(cfg.apiKey && cfg.projectId);
export const db = firebaseEnabled ? getFirestore(initializeApp(cfg)) : null;
