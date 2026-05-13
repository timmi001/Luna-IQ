import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  full_name: string;
  first_name: string;
  date_of_birth: string | null;
  avatar_index: number;
  luna_points: number;
  birthday_last_shown_at: string | null;
  created_at: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(
  userId: string,
  userEmail?: string,
  userMeta?: Record<string, string>,
): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[Luna Auth] fetchProfile error:", error.message);
      return null;
    }

    if (data) {
      const existing = data as Profile;

      // Backfill first_name if missing — from metadata or email prefix
      if (!existing.first_name) {
        const metaFull   = userMeta?.full_name?.trim()  ?? "";
        const metaFirst  = userMeta?.first_name?.trim() ?? "";
        const emailFirst = userEmail ? (userEmail.split("@")[0] ?? "") : "";
        const fullName   = metaFull || existing.full_name || "";
        const firstName  = metaFirst || (metaFull ? metaFull.split(/\s+/)[0]! : "") || emailFirst;

        if (firstName) {
          await supabase
            .from("profiles")
            .update({ full_name: fullName || firstName, first_name: firstName })
            .eq("id", userId);
          return { ...existing, full_name: fullName || firstName, first_name: firstName };
        }
      }
      return existing;
    }

    // No profile row yet — auto-create from auth metadata
    const metaFull   = userMeta?.full_name?.trim()  ?? "";
    const metaFirst  = userMeta?.first_name?.trim() ?? "";
    const emailFirst = userEmail ? (userEmail.split("@")[0] ?? "") : "";
    const firstName  = metaFirst || (metaFull ? metaFull.split(/\s+/)[0]! : "") || emailFirst;

    const defaultProfile = {
      id: userId,
      full_name: metaFull || firstName,
      first_name: firstName,
      avatar_index: 0,
      luna_points: 0,
      date_of_birth: null,
      birthday_last_shown_at: null,
    };

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert(defaultProfile)
      .select()
      .single();

    if (insertError) {
      console.warn("[Luna Auth] Profile create error:", insertError.message);
      return { ...defaultProfile, created_at: new Date().toISOString() } as Profile;
    }
    return created as Profile;
  } catch (err) {
    console.warn("[Luna Auth] fetchProfile exception:", err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);

  const initializedRef    = useRef(false);
  const currentUserIdRef  = useRef<string | null>(null);
  // Prevents duplicate signOut calls. Does NOT gate incoming auth events —
  // only TOKEN_REFRESHED is blocked during signout (see guard below).
  const signingOutRef     = useRef(false);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;

        const incomingUserId = newSession?.user?.id ?? null;

        console.log(
          "[Luna Auth]", event,
          "| user:", incomingUserId ?? "null",
          "| signingOut:", signingOutRef.current,
        );

        // Narrow guard: only block automatic token refreshes while a signOut is
        // in flight. SIGNED_IN and SIGNED_UP must always be processed so login
        // and signup work correctly even immediately after a logout.
        if (signingOutRef.current && event === "TOKEN_REFRESHED") {
          console.log("[Luna Auth] Ignoring TOKEN_REFRESHED during signout");
          return;
        }

        setSession(newSession);
        currentUserIdRef.current = incomingUserId;

        // Unblock the loading screen exactly once — on the very first auth event
        if (!initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
          console.log("[Luna Auth] Auth initialized, loading=false");
        }

        if (incomingUserId && newSession?.user) {
          const meta = (newSession.user.user_metadata ?? {}) as Record<string, string>;
          const p = await fetchProfile(incomingUserId, newSession.user.email, meta);
          // Guard: only apply if the user hasn't changed during the async fetch
          if (mounted && currentUserIdRef.current === incomingUserId) {
            setProfile(p);
          }
        } else {
          // Null session (SIGNED_OUT, or no stored session on initial load)
          setProfile(null);
        }
      },
    );

    // Safety: unblock UI after 5 s if Supabase never fires the first event
    const fallback = setTimeout(() => {
      if (!initializedRef.current && mounted) {
        console.warn("[Luna Auth] Fallback timeout — forcing loading=false");
        initializedRef.current = true;
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  const refreshProfile = async () => {
    const { data: { session: current } } = await supabase.auth.getSession();
    if (current?.user) {
      const p = await fetchProfile(current.user.id);
      if (p) setProfile(p);
    }
  };

  /**
   * Optimistic sign-out:
   * 1. Prevent duplicate calls via signingOutRef.
   * 2. Clear local auth state immediately → ProtectedRoute redirects to /login.
   * 3. Call supabase.auth.signOut() in the background — no await, no UI block.
   *    The resulting SIGNED_OUT event is just a no-op (state already null).
   */
  const signOut = () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;

    console.log("[Luna Auth] signOut: clearing local state");
    setSession(null);
    setProfile(null);
    currentUserIdRef.current = null;

    supabase.auth.signOut()
      .catch((err) => console.warn("[Luna Auth] signOut background error:", err))
      .finally(() => {
        signingOutRef.current = false;
        console.log("[Luna Auth] signOut: Supabase call complete");
      });
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
