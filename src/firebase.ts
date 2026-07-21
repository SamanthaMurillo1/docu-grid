import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
 // private firebase setup add code below this!
    apiKey: "AIzaSyCo6kEHOrdWNNZBiJIT1TI0lJsDmMqaQao",
    authDomain: "docu-signup.firebaseapp.com",
    projectId: "docu-signup",
    storageBucket: "docu-signup.firebasestorage.app",
    messagingSenderId: "909147596709",
    appId: "1:909147596709:web:fef2889d707a8105dfea4c",


};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
