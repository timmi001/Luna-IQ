import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getAuthRedirectUrl } from "@/lib/authRedirect";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getAuthRedirectUrl("/reset-password"),
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
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
        <button
          type="button"
          onClick={() => setLocation("/login")}
          className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </button>

        <h2 className="text-xl font-semibold text-white mb-1">Forgot password?</h2>
        <p className="text-sm text-white/70 mb-5">
          {sent
            ? "Check your inbox for a reset link."
            : "Enter your email and we'll send you a link to reset your password."}
        </p>

        {error && (
          <div
            className="rounded-2xl px-4 py-3 mb-4 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            {error}
          </div>
        )}

        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-white/80 leading-relaxed">
              If an account exists for <span className="font-semibold text-white">{email}</span>,
              you'll receive an email shortly. Open the link to set a new password.
            </p>
            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
            >
              Return to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                autoComplete="email"
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
                  Send reset link
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
