// src/firebase.ts
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// إعدادات Firebase – استبدل القيم بالقيم الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyDhbHlWT-gfVfA24TCR8CAPLy66Km1BmJQ",
  authDomain: "adaptive-collaborative-learn.firebaseapp.com",
  projectId: "adaptive-collaborative-learn",
  storageBucket: "adaptive-collaborative-learn.firebasestorage.app",
  messagingSenderId:"770860071379",
  appId: "1:770860071379:web:75c337ab37dfdb10631726",
  measurementId: "G-VQLJ8HRNHB",
};

// تهيئة Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// تهيئة Auth
export const auth: Auth = getAuth(app);

export default app;