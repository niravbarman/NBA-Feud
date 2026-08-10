import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
  signInAnonymously,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      signup: async (email, password) => {
        await createUserWithEmailAndPassword(auth, email, password);
      },
      login: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      loginWithGoogle: async () => {
        await signInWithPopup(auth, googleProvider);
      },
      loginAsGuest: async () => {
        await signInAnonymously(auth);
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email);
      },
      logout: async () => {
        await signOut(auth);
        // Invalidate any game tickets on logout
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith("game.ticket."))
          .forEach((k) => sessionStorage.removeItem(k));
      },
      getIdToken: async () => {
        const u = auth.currentUser;
        if (!u) return null;
        return u.getIdToken(false);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}