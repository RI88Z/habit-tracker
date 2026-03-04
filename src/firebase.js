import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD9PEW5Ka18VMkNHFZqLhdUnI7SLnXrTlA",
  authDomain: "habit-tracker-184bd.firebaseapp.com",
  projectId: "habit-tracker-184bd",
  storageBucket: "habit-tracker-184bd.firebasestorage.app",
  messagingSenderId: "533279044254",
  appId: "1:533279044254:web:b27f84dbaff378e534818f"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);