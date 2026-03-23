"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";

interface AuthContextValue {
  ready: boolean;
  userId: string | null;
}

const AuthContext = createContext<AuthContextValue>({ ready: false, userId: null });

export function useAuthContext() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    // In the new architecture, API client handles auth via Clerk JWT.
    // Storage adapters are no longer used — backend is the source of truth.
    setReady(true);
  }, [isLoaded, userId]);

  return (
    <AuthContext.Provider value={{ ready, userId: userId ?? null }}>
      {children}
    </AuthContext.Provider>
  );
}
