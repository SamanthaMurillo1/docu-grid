import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0683452547",
  appId: "1:585959295586:web:b42b97ac959a55d2101f3b",
  apiKey: "AIzaSyDefCqiKn4_Z_L6JDjAiIeH1teiBsnEEO4",
  authDomain: "gen-lang-client-0683452547.firebaseapp.com",
  storageBucket: "gen-lang-client-0683452547.firebasestorage.app",
  messagingSenderId: "585959295586",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-174df047-6480-4de5-86b9-fd61580406e2");
export const googleProvider = new GoogleAuthProvider();
