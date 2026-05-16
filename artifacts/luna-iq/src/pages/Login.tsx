import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      if (err.message.toLowerCase().includes("invalid")) {
        setError("Incorrect email or password. Please try again.");
      } else {
        setError(err.message);
      }
    } else {
      setShowSplash(true);
      setTimeout(() => setLocation("/"), 1800);
    }
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
    <>
      {/* ── Post-login splash ── */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{
              backgroundImage: "url('/luna-splash.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center top",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <motion.p
              className="text-white/80 text-sm font-medium tracking-wide mt-auto mb-12"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              Welcome back ✨
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page ── */}
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
        style={{ background: "linear-gradient(160deg, #C3898E 0%, #A57480 45%, #5E4352 100%)" }}
      >
        {/* Logo */}
        <motion.div
          className="flex flex-col items-center gap-3 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 rounded-full overflow-hidden shadow-xl" style={{ border: "2px solid rgba(255,255,255,0.4)" }}>
            <img src="/luna-icon.jpg" alt="Luna IQ" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Luna IQ</h1>
            <p className="text-sm text-white/70">Your wellness companion</p>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          className="w-full max-w-sm backdrop-blur-2xl rounded-3xl p-7 shadow-2xl"
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.30)" }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-white/70 mb-5">Sign in to continue your journey</p>

          {error && (
            <div
              className="rounded-2xl px-4 py-3 mb-4 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/50 outline-none transition-all"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              style={{ background: "#B4E8E0", color: "#4A3644" }}
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
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-white/65 mt-5">
            New to Luna?{" "}
            <button
              onClick={() => setLocation("/signup")}
              className="text-white font-semibold hover:text-white/80 transition-colors underline underline-offset-2"
            >
              Create an account
            </button>
          </p>
        </motion.div>
      </div>
    </>
  );
}
