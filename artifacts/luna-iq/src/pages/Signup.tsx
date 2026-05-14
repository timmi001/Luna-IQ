import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

function extractFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName.trim();
}

export default function Signup() {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const firstName = extractFirstName(fullName);
  const showPreview = fullName.trim().length > 0;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (dob) {
      const dobDate = new Date(dob);
      const now = new Date();
      const age = now.getFullYear() - dobDate.getFullYear();
      if (age < 10 || age > 120) {
        setError("Please enter a valid date of birth.");
        return;
      }
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const first = extractFirstName(fullName);

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim(), first_name: first },
      },
    });

    if (signUpErr) {
      setLoading(false);
      if (signUpErr.message.toLowerCase().includes("already registered")) {
        setError("An account with this email already exists. Please sign in.");
      } else {
        setError(signUpErr.message);
      }
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        first_name: first,
        date_of_birth: dob || null,
        avatar_index: 0,
        luna_points: 0,
      });
    }

    setLoading(false);
    setLocation("/");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "linear-gradient(160deg, #C3898E 0%, #A57480 50%, #5E4352 100%)" }}
    >
      {/* Logo */}
      <motion.div
        className="flex flex-col items-center gap-3 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg, #B4E8E0, #C3898E)" }}
        >
          <span className="text-3xl">🌙</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Luna IQ</h1>
          <p className="text-sm text-white/70 mt-0.5">Your wellness companion</p>
        </div>
      </motion.div>

      {/* Card */}
      <motion.div
        className="w-full max-w-sm backdrop-blur-xl rounded-3xl p-7 shadow-2xl border border-white/30"
        style={{ background: "rgba(255,255,255,0.18)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
        <p className="text-sm text-white/70 mb-6">Begin your wellness journey today</p>

        {error && (
          <div className="bg-white/20 border border-white/30 rounded-2xl px-4 py-3 mb-5 text-sm text-white">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
          {/* Full name */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-white/30 bg-white/15 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/60 focus:bg-white/25 transition-all"
            />
          </div>

          {/* Preview */}
          {showPreview && (
            <motion.p
              className="text-xs text-white/80 pl-1 -mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              We'll call you <span className="font-semibold">{firstName}</span> 🌸
            </motion.p>
          )}

          {/* Date of birth */}
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-white/30 bg-white/15 text-sm text-white outline-none focus:border-white/60 focus:bg-white/25 transition-all"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <p className="text-[11px] text-white/60 pl-1 -mt-2">
            Date of birth — used for personalised care 🌙
          </p>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-white/30 bg-white/15 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/60 focus:bg-white/25 transition-all"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min. 6 characters)"
              required
              className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-white/30 bg-white/15 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/60 focus:bg-white/25 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
            style={{
              background: loading ? "rgba(180,232,224,0.6)" : "#B4E8E0",
              color: "#4A3644",
            }}
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
                Create account
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-white/70 mt-6">
          Already have an account?{" "}
          <button
            onClick={() => setLocation("/login")}
            className="text-white font-semibold hover:text-white/80 transition-colors underline underline-offset-2"
          >
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
