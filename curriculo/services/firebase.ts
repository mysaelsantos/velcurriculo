import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Debug: Verifica se as chaves estão sendo carregadas corretamente
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
if (!apiKey) {
  console.error("⚠️ ERRO CRÍTICO FIREBASE: A chave API_KEY não foi encontrada. Verifique se as variáveis de ambiente no Netlify começam com 'VITE_'.");
} else {
  console.log("✅ Firebase Config: Chave API detectada.");
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inicialização segura
let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Erro fatal ao inicializar Firebase:", error);
}

export { db, auth };
