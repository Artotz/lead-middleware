"use client";

import {
  createContext,
  useCallback,
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
  role: UserRole;
  loading: boolean;
  error: string | null;
};

export type UserRole = "admin" | "standard";

type AuthContextValue = AuthState;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: "standard",
    loading: true,
    error: null,
  });
  const didValidateUserRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const resolveUserRole = useCallback(
    async (userId: string | undefined): Promise<UserRole> => {
      if (!userId) return "standard";
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error(error);
        return "standard";
      }
      const role = data?.role;
      return role === "admin" ? "admin" : "standard";
    },
    [supabase],
  );

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setState((prev) => ({ ...prev, loading: true }));

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      const role = await resolveUserRole(session?.user?.id);

      if (!active) return;

      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        role,
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
        const validatedRole = await resolveUserRole(user?.id);

        if (!active) return;

        setState((prev) => ({
          ...prev,
          user: user ?? null,
          role: validatedRole,
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      const currentUserId = stateRef.current.user?.id ?? null;
      const nextUserId = session?.user?.id ?? null;
      const sameUser = currentUserId !== null && currentUserId === nextUserId;

      // Token refresh on focus should not blank authenticated screens.
      if (event === "TOKEN_REFRESHED" && sameUser) {
        setState((prev) => ({
          ...prev,
          session,
          error: null,
        }));
        return;
      }

      setState((prev) => {
        if (!session) {
          return {
            user: null,
            session: null,
            role: "standard",
            loading: false,
            error: null,
          };
        }

        return {
          ...prev,
          user: session.user,
          session,
          loading: sameUser ? prev.loading : true,
          error: null,
        };
      });

      void (async () => {
        if (!active) return;
        const role = await resolveUserRole(session?.user?.id);
        if (!active) return;
        setState({
          user: session?.user ?? null,
          session,
          role,
          loading: false,
          error: null,
        });
      })();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [resolveUserRole, supabase]);

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

export function getUserDisplayName(
  user: User | null,
  fallback: string = "User",
): string | null {
  if (!user) return null;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fromMetadata =
    (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    (typeof metadata.user_name === "string" && metadata.user_name.trim()) ||
    (typeof metadata.username === "string" && metadata.username.trim()) ||
    "";

  const fromEmail = user.email?.trim() ?? "";
  const fallbackValue = fallback?.trim() || "User";
  return (fromMetadata || fromEmail || fallbackValue).trim();
}
