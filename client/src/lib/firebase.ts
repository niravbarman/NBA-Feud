import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { env } from "./env";

const firebaseConfig = {
  apiKey: env.apiKey,
  authDomain: env.authDomain,
  projectId: env.projectId,
  appId: env.appId,
  messagingSenderId: env.messagingSenderId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function setAuthPersistence(remember: boolean) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

// Ensure a Firebase user exists so scores can be saved.
export async function ensureUser(): Promise<string> {
  const current = auth.currentUser;
  if (current?.uid) return current.uid;

  // Attempt anonymous sign-in so players can save scores without an explicit login
  await signInAnonymously(auth);

  return new Promise<string>((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (u: User | null) => {
        if (u?.uid) {
          resolve(u.uid);
          unsub();
        }
      },
      (err) => reject(err)
    );
  });
}