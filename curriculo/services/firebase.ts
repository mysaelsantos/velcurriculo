import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ⚠️ COLE AQUI AS SUAS CHAVES DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCv63N0tpMtTLs2tZi_AXtfOewB-WOlvGg",
  authDomain: "velcurriculo.firebaseapp.com",
  projectId: "velcurriculo",
  storageBucket: "velcurriculo.firebasestorage.app",
  messagingSenderId: "635056463896",
  appId: "1:635056463896:web:8e378add74f518c833e36d",
  measurementId: "G-4GGLZBZXMZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
