import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FirebaseCustomConfig } from '../types.ts';

const FIREBASE_CONFIG_STORAGE_KEY = 'smarttest_firebase_config';

// Cấu hình Firebase mặc định tích hợp trực tiếp trong ứng dụng
// Dự án: esp32-test-36152
export const DEFAULT_FIREBASE_CONFIG: FirebaseCustomConfig = {
  apiKey: 'AIzaSyCsacFzgeLzuM8hXzEV-dzVECpDqPJ76NE',
  authDomain: 'esp32-test-36152.firebaseapp.com',
  projectId: 'esp32-test-36152',
  storageBucket: 'esp32-test-36152.firebasestorage.app',
  messagingSenderId: '816661796884',
  appId: '1:816661796884:web:9e8f3e4071a4bc329cef01',
};

// Retrieve stored custom Firebase config or fallback to built-in default
export function getSavedFirebaseConfig(): FirebaseCustomConfig {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Cannot read stored Firebase config, using default:', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
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

// Check if config is present (always true due to DEFAULT_FIREBASE_CONFIG)
const activeConfig = getSavedFirebaseConfig();

if (activeConfig && activeConfig.apiKey && activeConfig.projectId) {
  try {
    if (!getApps().length) {
      appInstance = initializeApp(activeConfig);
    } else {
      appInstance = getApp();
    }
    authInstance = getAuth(appInstance);
    firestoreInstance = getFirestore(appInstance);
    isConfigured = true;
    console.log('Firebase initialized successfully with project:', activeConfig.projectId);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    isConfigured = false;
  }
}

export const auth = authInstance;
export const db = firestoreInstance;
export const isFirebaseActive = isConfigured;
export const activeProjectId = activeConfig?.projectId || null;
