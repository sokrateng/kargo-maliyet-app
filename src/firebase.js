// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAroQr11QOlWsU1s6get53kHBompbb9YFA",
  authDomain: "lojistiktasimamaliyet.firebaseapp.com",
  projectId: "lojistiktasimamaliyet",
  storageBucket: "lojistiktasimamaliyet.firebasestorage.app",
  messagingSenderId: "336344002390",
  appId: "1:336344002390:web:6f881845c5ea2dbfdf70f7",
  measurementId: "G-0P4Y0LYVSR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);