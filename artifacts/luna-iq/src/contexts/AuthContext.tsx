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

      if (!existing.first_name) {
        const metaFirst  = userMeta?.first_name?.trim()  ?? "";
        const metaFull   = userMeta?.full_name?.trim()   ?? "";
        const emailFirst = userEmail ? (userEmail.split("@")[0] ?? "") : "";
        const fullName   = metaFull || existing.full_name || "";
        const firstName  =
          metaFirst ||
          (metaFull        ? metaFull.trim().split(/\s+/)[0]!        : "") ||
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
          } else {
            console.log("[Luna Profile] UPDATE success — first_name:", firstName);
          }

          return { ...existing, full_name: fullName || firstName, first_name: firstName };
        }
      }

      console.log("[Luna Profile] Returning existing profile | first_name:", existing.first_name);
      return existing;
    }

    // No row yet — auto-create from auth metadata
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

  const initializedRef   = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  /**
   * fetchingForRef — holds the userId of any in-flight fetchProfile call.
   * Prevents duplicate concurrent fetches when React StrictMode mounts the
   * component twice or when getSession() and INITIAL_SESSION both try to
   * fetch the profile at the same time.
   */
  const fetchingForRef = useRef<string | null>(null);

  /**
   * signingOutRef — prevents double-tap on the Sign Out button.
   */
  const signingOutRef = useRef(false);

  /**
   * didSignOutRef — blocks automatic session-restoration events after logout.
   * Only a deliberate SIGNED_IN clears it.
   */
  const didSignOutRef = useRef(false);

  // Helper: fetch profile for a user, with a deduplication guard
  const loadProfile = async (
    uid: string,
    email: string | undefined,
    meta: Record<string, string>,
    mountedRef: { current: boolean },
  ) => {
    // Skip if another fetch is already running for this user
    if (fetchingForRef.current === uid) {
      console.log("[Luna Auth] Profile fetch skipped — already in flight for", uid);
      return;
    }
    fetchingForRef.current = uid;

    try {
      const p = await fetchProfile(uid, email, meta);
      if (mountedRef.current && currentUserIdRef.current === uid) {
        console.log("[Luna Auth] setProfile | first_name:", p?.first_name ?? "(null)");
        setProfile(p);
      }
    } finally {
      if (fetchingForRef.current === uid) fetchingForRef.current = null;
    }
  };

  useEffect(() => {
    // Use an object ref so the mounted flag can be shared with nested async fns
    const mountedRef = { current: true };

    // ── Fast-path initialization ─────────────────────────────────────────────
    //
    // getSession() reads the stored token from localStorage and validates it.
    // When the token is still fresh this is a pure memory read — no network
    // call — and resolves in < 50 ms.  We use this to dismiss the loading
    // spinner immediately instead of waiting for the first onAuthStateChange
    // callback (which can fire up to 100+ seconds later in Replit's dev env
    // because TOKEN_REFRESHED becomes the first event after a long idle).
    //
    supabase.auth.getSession().then(async ({ data: { session: stored } }) => {
      if (!mountedRef.current || initializedRef.current) return;

      initializedRef.current = true;
      const uid = stored?.user?.id ?? null;
      currentUserIdRef.current = uid;
      setSession(stored);
      setLoading(false);   // ← loading screen dismissed here, fast

      console.log("[Luna Auth] getSession: loading dismissed |",
        uid ? `user=${uid}` : "no session");

      if (stored?.user && uid) {
        const meta = (stored.user.user_metadata ?? {}) as Record<string, string>;
        await loadProfile(uid, stored.user.email, meta, mountedRef);
      }
    }).catch(() => {
      // getSession() failed — fall through to onAuthStateChange fallback
      if (mountedRef.current && !initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    // ── Subscribe to auth state changes ─────────────────────────────────────
    //
    // Handles all subsequent changes: new logins, logouts, token rotations.
    // Also acts as the initialization path if getSession() hasn't resolved yet
    // (rare — guards against a theoretical race on first ever page load).
    //
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mountedRef.current) return;

        const incomingUserId = newSession?.user?.id ?? null;

        console.log(
          "[Luna Auth]", event,
          "| user:", incomingUserId ?? "null",
          "| didSignOut:", didSignOutRef.current,
        );

        // ── Post-logout guard ──────────────────────────────────────────────
        if (didSignOutRef.current && incomingUserId && event !== "SIGNED_IN") {
          console.log("[Luna Auth] Suppressing", event, "after logout");
          return;
        }

        // ── New deliberate login ───────────────────────────────────────────
        if (event === "SIGNED_IN") {
          didSignOutRef.current  = false;
          signingOutRef.current  = false;
          fetchingForRef.current = null;   // clear any stale fetch lock
          console.log("[Luna Auth] SIGNED_IN — guards cleared");
        }

        // ── Update session ─────────────────────────────────────────────────
        setSession(newSession);
        currentUserIdRef.current = incomingUserId;

        // Initialize loading if getSession() hasn't resolved yet (safety net)
        if (!initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
          console.log("[Luna Auth] Initialized via onAuthStateChange");
        }

        // ── Profile fetch decision ─────────────────────────────────────────
        if (incomingUserId && newSession?.user) {
          if (event === "TOKEN_REFRESHED") {
            // Token rotation only — profile hasn't changed
            console.log("[Luna Auth] TOKEN_REFRESHED — session refreshed, no profile re-fetch");
            return;
          }

          if (event === "INITIAL_SESSION") {
            // getSession() already fetched the profile (or is fetching it now).
            // Avoid a redundant DB round-trip.
            console.log("[Luna Auth] INITIAL_SESSION — profile handled by getSession()");
            return;
          }

          // SIGNED_IN (or any other event): load the profile
          const meta = (newSession.user.user_metadata ?? {}) as Record<string, string>;
          await loadProfile(incomingUserId, newSession.user.email, meta, mountedRef);

        } else {
          // Null session → logout or no stored session
          setProfile(null);
          console.log("[Luna Auth] Session cleared — no active user");
        }
      },
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
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
   * Optimistic sign-out.
   *
   * 1. Clear localStorage — Supabase reads the refresh token from here on the
   *    next tick; removing it stops any pending token refresh from completing.
   * 2. Wipe React state — ProtectedRoute immediately redirects to /login.
   * 3. supabase.auth.signOut({ scope: 'local' }) — no network request; clears
   *    the Supabase JS client's in-memory session and STOPS THE AUTO-REFRESH
   *    TIMER.  Without this, the timer continues firing TOKEN_REFRESHED from
   *    the old in-memory session indefinitely.
   *
   * The key insight: scope:'local' resolves in < 1 ms (no HTTP), so it always
   * completes before the user can possibly navigate to /login and sign in again.
   * This eliminates the old race where the global signOut's network response
   * arrived after a new login and wiped the fresh session.
   */
  const signOut = () => {
    if (signingOutRef.current) {
      console.log("[Luna Auth] signOut: duplicate call ignored");
      return;
    }

    console.log("[Luna Auth] signOut: start");
    signingOutRef.current  = true;
    didSignOutRef.current  = true;
    fetchingForRef.current = null;

    try { localStorage.removeItem("luna-iq-auth"); } catch { /* ignore */ }

    setSession(null);
    setProfile(null);
    currentUserIdRef.current = null;
    console.log("[Luna Auth] signOut: local state cleared");

    supabase.auth.signOut({ scope: "local" })
      .then(() => console.log("[Luna Auth] signOut: client memory cleared, timer stopped"))
      .catch((e) => console.warn("[Luna Auth] signOut: local signOut error:", e))
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
