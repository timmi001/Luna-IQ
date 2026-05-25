import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Sparkles, ArrowLeft } from "lucide-react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    const hash = window.location.hash;
    const isRecoveryLink =
      hash.includes("type=recovery") || hash.includes("access_token");

    const finishInvalid = () => {
      if (!mounted) return;
      setChecking(false);
      setError("This reset link is invalid or has expired. Request a new one.");
    };

    const activateForm = () => {
      if (!mounted) return;
      setReady(true);
      setChecking(false);
      setError("");
    };

    const verifyRecoverySession = async () => {
      if (isRecoveryLink) {
        await new Promise((r) => setTimeout(r, 300));
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        activateForm();
        return;
      }

      if (!isRecoveryLink) {
        finishInvalid();
      }
    };

    void verifyRecoverySession();

    const timeoutId = window.setTimeout(() => {
      if (mounted && isRecoveryLink) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!mounted) return;
          if (session) activateForm();
          else finishInvalid();
        });
      }
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent) => {
        if (!mounted) return;
        if (event === "PASSWORD_RECOVERY") {
          activateForm();
        }
      },
    );

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    setSuccess(true);
    window.history.replaceState(null, "", window.location.pathname);
    setTimeout(() => setLocation("/login"), 2000);
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.28)",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.background = "rgba(255,255,255,0.22)");
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.background = "rgba(255,255,255,0.12)");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: "linear-gradient(160deg, #4C1D95 0%, #7C3AED 50%, #BE185D 100%)" }}
    >
      <motion.div
        className="flex flex-col items-center gap-3 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="w-24 h-24 rounded-full overflow-hidden shadow-xl"
          style={{ border: "2px solid rgba(255,255,255,0.4)" }}
        >
          <img src="/luna-icon.jpg" alt="Luna IQ" className="w-full h-full object-cover" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Luna IQ</h1>
          <p className="text-sm text-white/70">Your wellness companion</p>
        </div>
      </motion.div>

      <motion.div
        className="w-full max-w-sm backdrop-blur-2xl rounded-3xl p-7 shadow-2xl"
        style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.30)" }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold text-white mb-1">Set new password</h2>
        <p className="text-sm text-white/70 mb-5">
          {success
            ? "Password updated! Redirecting you to sign in…"
            : "Choose a strong password for your account."}
        </p>

        {error && (
          <div
            className="rounded-2xl px-4 py-3 mb-4 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            {error}
            {!ready && !checking && (
              <button
                type="button"
                onClick={() => setLocation("/forgot-password")}
                className="block mt-2 text-white font-semibold underline underline-offset-2"
              >
                Request a new link
              </button>
            )}
          </div>
        )}

        {checking ? (
          <div className="flex justify-center py-8">
            <motion.div
              className="w-6 h-6 rounded-full border-2 border-white/40 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : success ? (
          <p className="text-sm text-white/80 text-center py-4">
            You can now sign in with your new password.
          </p>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full pl-11 pr-12 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/50 outline-none transition-all"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type={showPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/50 outline-none transition-all"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#ffffff" }}
            >
              {loading ? (
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-current border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Update password
                </>
              )}
            </button>
          </form>
        ) : null}

        {!checking && !success && (
          <button
            type="button"
            onClick={() => setLocation("/login")}
            className="flex items-center justify-center gap-1.5 text-sm text-white/65 hover:text-white mt-5 w-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>
        )}
      </motion.div>
    </div>
  );
}
