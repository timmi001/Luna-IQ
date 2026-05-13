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
      console.warn("[Luna Auth] Profile fetch error:", error.message);
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
    const fullName   = metaFull || "";
    const firstName  = metaFirst || (metaFull ? metaFull.split(/\s+/)[0]! : "") || emailFirst;

    const defaultProfile = {
      id: userId,
      full_name: fullName || firstName,
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

  // Refs — stable across renders, no re-render side effects
  const initializedRef    = useRef(false);
  const currentUserIdRef  = useRef<string | null>(null);
  const signingOutRef     = useRef(false);   // guard against duplicate signOut calls

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;

        const incomingUserId = newSession?.user?.id ?? null;

        // While a signOut is in progress, ignore any events that try to restore
        // the session (e.g. a TOKEN_REFRESHED that races with signOut).
        if (signingOutRef.current && incomingUserId) return;

        setSession(newSession);
        currentUserIdRef.current = incomingUserId;

        // Unblock the loading screen exactly once — on the first auth event
        if (!initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
        }

        if (incomingUserId && newSession?.user) {
          const meta = (newSession.user.user_metadata ?? {}) as Record<string, string>;
          const p = await fetchProfile(incomingUserId, newSession.user.email, meta);
          // Guard: only apply the result if the user hasn't changed during the async fetch
          if (mounted && currentUserIdRef.current === incomingUserId) {
            setProfile(p);
          }
        } else {
          // Clear profile on SIGNED_OUT or any null-session event
          setProfile(null);
        }
      },
    );

    // Safety: unblock UI after 5 s if Supabase never fires the first event
    const fallback = setTimeout(() => {
      if (!initializedRef.current && mounted) {
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
   * 1. Clear local auth state immediately → ProtectedRoute redirects to /login instantly.
   * 2. Call supabase.auth.signOut() in the background — don't await, don't block the UI.
   *
   * This prevents logout freezing and makes the UI respond instantly regardless of
   * network speed. Supabase will still invalidate the server token in the background.
   */
  const signOut = () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;

    // Immediately wipe local auth state — triggers ProtectedRoute → /login redirect
    setSession(null);
    setProfile(null);
    currentUserIdRef.current = null;

    // Background Supabase call — invalidates the server-side token
    supabase.auth.signOut()
      .catch((err) => console.warn("[Luna Auth] signOut background error:", err))
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
