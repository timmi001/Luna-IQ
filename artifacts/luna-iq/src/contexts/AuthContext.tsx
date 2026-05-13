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

  /**
   * signingOutRef — set true on the FIRST signOut() call so duplicate taps
   * are silently ignored. Cleared when the Supabase call finishes (or a fresh
   * SIGNED_IN arrives). Stored in a ref so it survives re-renders.
   */
  const signingOutRef = useRef(false);

  /**
   * didSignOutRef — set true when the user explicitly signs out. While true,
   * automatic session-restoration events (INITIAL_SESSION, TOKEN_REFRESHED)
   * are suppressed. Only a deliberate SIGNED_IN or SIGNED_UP from the user
   * clears it. This prevents the race where supabase.auth.signOut() hasn't
   * finished clearing localStorage when HMR remounts the provider, causing
   * Supabase to fire INITIAL_SESSION with the stale token and restore the
   * session the user just ended.
   */
  const didSignOutRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;

        const incomingUserId = newSession?.user?.id ?? null;

        console.log(
          "[Luna Auth]", event,
          "| user:", incomingUserId ?? "null",
          "| didSignOut:", didSignOutRef.current,
        );

        // ── Post-logout guard ────────────────────────────────────────────────
        // After an explicit logout, suppress any automatic event that tries to
        // restore the session. Only a deliberate SIGNED_IN / SIGNED_UP from
        // the user themselves should bring a session back.
        if (
          didSignOutRef.current &&
          incomingUserId &&
          event !== "SIGNED_IN"
        ) {
          console.log("[Luna Auth] Suppressing", event, "— user has signed out, awaiting fresh login");
          return;
        }

        // ── New deliberate login ─────────────────────────────────────────────
        // Reset both guards so the new session flows through normally.
        // Note: Supabase fires SIGNED_IN for both login and signup.
        if (event === "SIGNED_IN") {
          didSignOutRef.current  = false;
          signingOutRef.current  = false;
          console.log("[Luna Auth] Fresh login — logout guards cleared");
        }

        setSession(newSession);
        currentUserIdRef.current = incomingUserId;

        // Unblock the loading screen on the very first auth event
        if (!initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
          console.log("[Luna Auth] Auth initialized, loading=false");
        }

        if (incomingUserId && newSession?.user) {
          const meta = (newSession.user.user_metadata ?? {}) as Record<string, string>;
          const p = await fetchProfile(incomingUserId, newSession.user.email, meta);
          // Only apply if the user hasn't changed during the async fetch
          if (mounted && currentUserIdRef.current === incomingUserId) {
            setProfile(p);
            console.log("[Luna Auth] Profile loaded for", incomingUserId);
          }
        } else {
          // Null session — SIGNED_OUT or no stored session on initial load
          setProfile(null);
          console.log("[Luna Auth] Session cleared — no active user");
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
   * Optimistic sign-out — instant UI response, zero hang risk.
   *
   * Step 1: Clear localStorage["luna-iq-auth"] SYNCHRONOUSLY.
   *         This is the critical step. If the component remounts (HMR or
   *         otherwise) before the background network call finishes, the new
   *         onAuthStateChange subscription will call getSession() internally.
   *         getSession() reads from localStorage first. With an empty key it
   *         returns null immediately — no server round-trip, no 5-second wait.
   *         Without this step, getSession() finds the stale token, tries to
   *         validate it against Supabase's servers, which can stall for 5+ s
   *         on Replit's network, causing the fallback timeout to fire.
   *
   * Step 2: Wipe React state → ProtectedRoute sees user=null → /login redirect.
   *
   * Step 3: Background supabase.auth.signOut() — revokes the server-side token
   *         so the old session can't be replayed elsewhere. Fire and forget.
   */
  const signOut = () => {
    if (signingOutRef.current) {
      console.log("[Luna Auth] signOut: already in progress, ignoring duplicate call");
      return;
    }

    console.log("[Luna Auth] signOut: start");
    signingOutRef.current = true;
    didSignOutRef.current = true;

    // 1. Wipe localStorage synchronously — prevents INITIAL_SESSION from
    //    restoring the session if AuthProvider remounts before the network
    //    call completes (the exact HMR race that caused the 5 s stall).
    try {
      localStorage.removeItem("luna-iq-auth");
    } catch {
      // Ignore — localStorage unavailable in some environments
    }

    // 2. Wipe React state — ProtectedRoute immediately redirects to /login
    setSession(null);
    setProfile(null);
    currentUserIdRef.current = null;
    console.log("[Luna Auth] signOut: local state cleared — UI redirecting now");

    // 3. Background server-side token revocation — don't await
    supabase.auth.signOut()
      .then(() => console.log("[Luna Auth] signOut: Supabase server revocation complete"))
      .catch((err) => console.warn("[Luna Auth] signOut: revocation error (non-fatal):", err))
      .finally(() => {
        signingOutRef.current = false;
        console.log("[Luna Auth] signOut: guard released");
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
