import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FirebaseCustomConfig } from '../types.ts';

const FIREBASE_CONFIG_STORAGE_KEY = 'smarttest_firebase_config';

// Retrieve stored custom Firebase config or defaults
export function getSavedFirebaseConfig(): FirebaseCustomConfig | null {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Cannot read stored Firebase config:', e);
  }
  return null;
}

export function saveFirebaseConfig(config: FirebaseCustomConfig) {
  localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
}

export function clearFirebaseConfig() {
  localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  window.location.reload();
}

let appInstance: any = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let isConfigured = false;

// Check if config is present
const customConfig = getSavedFirebaseConfig();

if (customConfig && customConfig.apiKey && customConfig.projectId) {
  try {
    if (!getApps().length) {
      appInstance = initializeApp(customConfig);
    } else {
      appInstance = getApp();
    }
    authInstance = getAuth(appInstance);
    firestoreInstance = getFirestore(appInstance);
    isConfigured = true;
    console.log('Firebase initialized successfully with project:', customConfig.projectId);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    isConfigured = false;
  }
}

export const auth = authInstance;
export const db = firestoreInstance;
export const isFirebaseActive = isConfigured;
export const activeProjectId = customConfig?.projectId || null;
