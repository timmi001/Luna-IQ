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

// ── Profile fetch ──────────────────────────────────────────────────────────

async function fetchProfile(
  userId: string,
  userEmail?: string,
  userMeta?: Record<string, string>,
): Promise<Profile | null> {
  try {
    console.log("[Luna Profile] fetchProfile start | userId:", userId);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[Luna Profile] SELECT error:", error.code, error.message);
      return null;
    }

    console.log("[Luna Profile] SELECT result:", {
      found: !!data,
      full_name: data?.full_name ?? "(none)",
      first_name: data?.first_name ?? "(empty)",
    });

    if (data) {
      const existing = data as Profile;

      // Backfill first_name if missing.
      // Priority: metadata first_name → metadata full_name split →
      //           profile full_name split (covers old accounts) → email prefix.
      if (!existing.first_name) {
        const metaFirst  = userMeta?.first_name?.trim()  ?? "";
        const metaFull   = userMeta?.full_name?.trim()   ?? "";
        const emailFirst = userEmail ? (userEmail.split("@")[0] ?? "") : "";
        const fullName   = metaFull || existing.full_name || "";
        const firstName  =
          metaFirst ||
          (metaFull   ? metaFull.trim().split(/\s+/)[0]!   : "") ||
          (existing.full_name ? existing.full_name.trim().split(/\s+/)[0]! : "") ||
          emailFirst;

        console.log("[Luna Profile] first_name empty — backfilling:", {
          metaFirst, metaFull, emailFirst, derivedFirstName: firstName,
        });

        if (firstName) {
          const { error: updateErr } = await supabase
            .from("profiles")
            .update({ full_name: fullName || firstName, first_name: firstName })
            .eq("id", userId);

          if (updateErr) {
            console.warn("[Luna Profile] UPDATE error:", updateErr.code, updateErr.message);
            // Return with client-side backfill even if DB write fails
          } else {
            console.log("[Luna Profile] UPDATE success — first_name:", firstName);
          }

          return { ...existing, full_name: fullName || firstName, first_name: firstName };
        }
      }

      console.log("[Luna Profile] Returning existing profile | first_name:", existing.first_name);
      return existing;
    }

    // ── No row yet — auto-create from auth metadata ──────────────────────
    const metaFirst  = userMeta?.first_name?.trim()  ?? "";
    const metaFull   = userMeta?.full_name?.trim()   ?? "";
    const emailFirst = userEmail ? (userEmail.split("@")[0] ?? "") : "";
    const firstName  = metaFirst || (metaFull ? metaFull.split(/\s+/)[0]! : "") || emailFirst;

    console.log("[Luna Profile] No row found — inserting | first_name:", firstName);

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
      console.warn("[Luna Profile] INSERT error:", insertError.code, insertError.message);
      return { ...defaultProfile, created_at: new Date().toISOString() } as Profile;
    }

    console.log("[Luna Profile] INSERT success | first_name:", (created as Profile).first_name);
    return created as Profile;

  } catch (err) {
    console.warn("[Luna Profile] fetchProfile exception:", err);
    return null;
  }
}

// ── AuthProvider ───────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);

  const initializedRef    = useRef(false);
  const currentUserIdRef  = useRef<string | null>(null);

  /**
   * signingOutRef — prevents double-tap on the Sign Out button.
   * Cleared when supabase.auth.signOut({ scope: 'local' }) resolves.
   */
  const signingOutRef = useRef(false);

  /**
   * didSignOutRef — set true when the user explicitly signs out.
   * Blocks any automatic session-restoration event (INITIAL_SESSION,
   * TOKEN_REFRESHED) until a deliberate SIGNED_IN arrives.
   *
   * Why needed: after signOut() clears localStorage, the Supabase client's
   * in-memory session can still fire TOKEN_REFRESHED if the refresh timer
   * happened to tick in the gap. This guard prevents that stale event from
   * restoring the old session in React state.
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
        // Block automatic session-restoration events after explicit logout.
        // Only a deliberate SIGNED_IN clears this flag and allows a new session.
        if (didSignOutRef.current && incomingUserId && event !== "SIGNED_IN") {
          console.log("[Luna Auth] Suppressing", event, "after logout — waiting for SIGNED_IN");
          return;
        }

        // ── New deliberate login ─────────────────────────────────────────────
        if (event === "SIGNED_IN") {
          didSignOutRef.current  = false;
          signingOutRef.current  = false;
          console.log("[Luna Auth] SIGNED_IN — logout guards cleared");
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
          // ── Skip profile fetch on TOKEN_REFRESHED ────────────────────────
          // TOKEN_REFRESHED just rotates the access token — the profile data
          // hasn't changed. Fetching the profile again wastes a DB round-trip
          // and, crucially, the parallel fetch would have raced with the first
          // SIGNED_IN fetch (both awaiting the same DB query, both writing to
          // currentUserIdRef), causing the guard below to fail sporadically.
          if (event === "TOKEN_REFRESHED") {
            console.log("[Luna Auth] TOKEN_REFRESHED — skipping profile re-fetch");
            return;
          }

          const meta = (newSession.user.user_metadata ?? {}) as Record<string, string>;
          const p = await fetchProfile(incomingUserId, newSession.user.email, meta);

          // Only apply the result if the same user is still active.
          // (Guards against a logout racing with a slow DB response.)
          if (mounted && currentUserIdRef.current === incomingUserId) {
            console.log("[Luna Auth] setProfile | first_name:", p?.first_name ?? "(null)");
            setProfile(p);
          } else {
            console.log("[Luna Auth] Profile fetch result discarded — user changed during fetch");
          }
        } else {
          // Null session → SIGNED_OUT or no stored session on initial load
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
   * Optimistic sign-out — instant UI, zero hang risk.
   *
   * Step 1: Clear localStorage["luna-iq-auth"] synchronously.
   *         Prevents getSession() from finding the stale token if the
   *         component remounts (e.g. HMR) before the sign-out resolves.
   *
   * Step 2: Wipe React state → ProtectedRoute redirects to /login immediately.
   *
   * Step 3: supabase.auth.signOut({ scope: 'local' }) — NO network request.
   *         This clears the Supabase JS client's in-memory session and, crucially,
   *         STOPS THE AUTO-REFRESH TIMER. Without this step the in-memory session
   *         would keep firing TOKEN_REFRESHED events that could race with a
   *         subsequent login and corrupt the new session's JWT.
   *         Because there is no network call, this resolves in < 1 ms and
   *         CANNOT interfere with a new login that the user initiates later.
   */
  const signOut = () => {
    if (signingOutRef.current) {
      console.log("[Luna Auth] signOut: duplicate call ignored");
      return;
    }

    console.log("[Luna Auth] signOut: start");
    signingOutRef.current = true;
    didSignOutRef.current = true;

    // Step 1 — wipe localStorage so any remount sees no token
    try {
      localStorage.removeItem("luna-iq-auth");
    } catch {
      // Ignore if localStorage is unavailable
    }

    // Step 2 — clear React state → instant UI redirect
    setSession(null);
    setProfile(null);
    currentUserIdRef.current = null;
    console.log("[Luna Auth] signOut: local state cleared");

    // Step 3 — clear Supabase client memory + stop refresh timer (no network)
    supabase.auth.signOut({ scope: "local" })
      .then(() => console.log("[Luna Auth] signOut: client memory cleared, refresh timer stopped"))
      .catch((err) => console.warn("[Luna Auth] signOut: local signOut error:", err))
      .finally(() => { signingOutRef.current = false; });
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
