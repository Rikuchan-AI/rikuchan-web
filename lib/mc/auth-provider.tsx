"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { setStorageAdapter } from "./storage";
import { SupabaseAdapter } from "./storage/supabase-adapter";
import { setSettingsAdapter, SupabaseSettingsAdapter } from "./storage/settings-adapter";

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

    if (userId) {
      // User is authenticated — switch to Supabase adapters
      setStorageAdapter(new SupabaseAdapter());
      setSettingsAdapter(new SupabaseSettingsAdapter());
    }
    // If no userId, keep default localStorage adapters

    setReady(true);
  }, [isLoaded, userId]);

  return (
    <AuthContext.Provider value={{ ready, userId: userId ?? null }}>
      {children}
    </AuthContext.Provider>
  );
}
