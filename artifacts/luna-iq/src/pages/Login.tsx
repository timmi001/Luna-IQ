import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setLocation("/");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "linear-gradient(160deg, #FFF7FB 0%, #F3EEFF 50%, #FFF0F6 100%)" }}
    >
      {/* Logo */}
      <motion.div
        className="flex flex-col items-center gap-3 mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg, #E9E4FF, #F7D6E0)" }}>
          <span className="text-3xl">🌙</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-purple-900 tracking-tight">Luna IQ</h1>
          <p className="text-sm text-purple-400 mt-0.5">Your wellness companion</p>
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        className="w-full max-w-sm bg-white/80 backdrop-blur-md rounded-3xl p-7 shadow-xl border border-white/60"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold text-foreground mb-1">Welcome back</h2>
        <p className="text-sm text-muted-foreground mb-6">Sign in to continue your journey</p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-purple-100 bg-purple-50/40 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-purple-300 focus:bg-white transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-purple-100 bg-purple-50/40 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-purple-300 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
            style={{ background: loading ? "#c4b5fd" : "linear-gradient(135deg, #8B5CF6, #A855F7)" }}
          >
            {loading ? (
              <motion.div
                className="w-4 h-4 rounded-full border-2 border-white border-t-transparent"
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

        <p className="text-center text-sm text-muted-foreground mt-6">
          New to Luna?{" "}
          <button
            onClick={() => setLocation("/signup")}
            className="text-purple-600 font-semibold hover:text-purple-700 transition-colors"
          >
            Create an account
          </button>
        </p>
      </motion.div>
    </div>
  );
}
