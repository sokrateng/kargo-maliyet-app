import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase konsolundan aldığınız bilgileri buraya yapıştırın
const firebaseConfig = {
  apiKey: "AIzaSyAroQr11QOlWsU1s6get53kHBompbb9YFA",
  authDomain: "lojistiktasimamaliyet.firebaseapp.com",
  projectId: "lojistiktasimamaliyet",
  storageBucket: "lojistiktasimamaliyet.firebasestorage.app",
  messagingSenderId: "336344002390",
  appId: "1:336344002390:web:6f881845c5ea2dbfdf70f7",
  measurementId: "G-0P4Y0LYVSR"
};

const app = initializeApp(firebaseConfig);

// Aşağıdaki 'export' kelimeleri çok önemlidir. 
// Bunlar olmadan App.jsx bu değişkenlere ulaşamaz.
export const auth = getAuth(app);
export const db = getFirestore(app);