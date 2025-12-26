"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });
  const didValidateUserRef = useRef(false);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setState((prev) => ({ ...prev, loading: true }));

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!active) return;

      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        error: sessionError?.message ?? null,
        loading: true,
      }));

      if (session?.access_token && !didValidateUserRef.current) {
        didValidateUserRef.current = true;
        // Validate once on boot to avoid calling /auth/v1/user on every navigation.
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!active) return;

        setState((prev) => ({
          ...prev,
          user: user ?? null,
          error: userError?.message ?? prev.error ?? null,
          loading: false,
        }));
        return;
      }

      setState((prev) => ({ ...prev, loading: false }));
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(() => state, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider />");
  }
  return ctx;
}

export function getUserDisplayName(user: User | null): string | null {
  if (!user) return null;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fromMetadata =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    (typeof metadata.user_name === "string" && metadata.user_name.trim()) ||
    (typeof metadata.username === "string" && metadata.username.trim()) ||
    "";

  const fromEmail = user.email?.trim() ?? "";
  return (fromMetadata || fromEmail || "User").trim();
}
