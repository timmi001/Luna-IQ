// @refresh reset
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
  signOut: () => Promise<void>;
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
      console.warn("[Luna Auth] Profile fetch error:", error.message, error.code);
      return null;
    }

    // Row exists
    if (data) {
      const existing = data as Profile;
      console.log("[Luna Auth] Profile loaded — first_name:", JSON.stringify(existing.first_name), "| meta full_name:", JSON.stringify(userMeta?.full_name));

      // If first_name is empty, try to backfill from:
      //  1. auth metadata (set during signup via options.data)
      //  2. email prefix as last-resort fallback
      if (!existing.first_name) {
        const metaFull  = userMeta?.full_name?.trim()  ?? "";
        const metaFirst = userMeta?.first_name?.trim() ?? "";
        const emailFirst = userEmail ? userEmail.split("@")[0] ?? "" : "";

        const fullName  = metaFull  || existing.full_name || "";
        const firstName = metaFirst || (metaFull ? metaFull.split(/\s+/)[0]! : "") || emailFirst;

        if (firstName) {
          console.log("[Luna Auth] Backfilling first_name:", firstName);
          await supabase
            .from("profiles")
            .update({ full_name: fullName || firstName, first_name: firstName })
            .eq("id", userId);
          return { ...existing, full_name: fullName || firstName, first_name: firstName };
        }
      }
      return existing;
    }

    // No row yet — auto-create using auth metadata (set during signup) so the
    // name is available immediately without waiting for the Signup page upsert.
    const metaFull  = userMeta?.full_name?.trim()  ?? "";
    const metaFirst = userMeta?.first_name?.trim() ?? "";
    const emailFirst = userEmail ? userEmail.split("@")[0] ?? "" : "";
    const fullName  = metaFull || "";
    const firstName = metaFirst || (metaFull ? metaFull.split(/\s+/)[0]! : "") || emailFirst;

    console.log("[Luna Auth] No profile found — creating row for", userId, "| name:", firstName || "(none)");
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
      console.warn("[Luna Auth] Profile auto-create error:", insertError.message);
      return { ...defaultProfile, created_at: new Date().toISOString() } as Profile;
    }
    return created as Profile;
  } catch (err) {
    console.warn("[Luna Auth] Profile fetch exception:", err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // loading stays true until the FIRST auth state event fires
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        console.log(
          "[Luna Auth] event:", event,
          "| user:", newSession?.user?.id ?? "null",
          "| initialized:", initializedRef.current,
        );

        if (!mounted) return;

        // Always update session from the event — this is the canonical state
        setSession(newSession);

        // Mark auth as initialized after the very first event (INITIAL_SESSION)
        // Only set loading=false ONCE to prevent flickering on subsequent events
        if (!initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
          console.log("[Luna Auth] Initialization complete, loading=false");
        }

        if (newSession?.user) {
          // Load profile in the background — don't block auth state
          // Pass user_metadata so auto-creation uses the name from signup
          const meta = (newSession.user.user_metadata ?? {}) as Record<string, string>;
          const p = await fetchProfile(newSession.user.id, newSession.user.email, meta);
          if (mounted) setProfile(p);
        } else {
          // Only clear profile on explicit sign-out events, not token refresh gaps
          if (event === "SIGNED_OUT") {
            setProfile(null);
            console.log("[Luna Auth] Cleared profile on", event);
          }
        }
      },
    );

    // Safety fallback: if onAuthStateChange never fires (e.g. network issues),
    // unblock the UI after 5 seconds so users aren't stuck on the loading screen.
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

  const signOut = async () => {
    console.log("[Luna Auth] signOut: started");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("[Luna Auth] signOut: Supabase error (still clearing state):", error.message);
      } else {
        console.log("[Luna Auth] signOut: Supabase completed OK");
      }
    } catch (err) {
      console.warn("[Luna Auth] signOut: threw (still clearing state):", err);
    } finally {
      // Always clear state regardless of whether Supabase succeeded.
      console.log("[Luna Auth] signOut: clearing session + profile, then navigating to /login");
      setSession(null);
      setProfile(null);
      // Use a hard redirect instead of relying on React state + wouter useEffect
      // inside AnimatePresence, which can race/block the navigation.
      window.location.replace("/login");
    }
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
