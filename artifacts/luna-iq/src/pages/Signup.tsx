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
      options: { data: { full_name: fullName.trim(), first_name: first } },
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
      style={{ background: "linear-gradient(160deg, #B66A78 0%, #8E5264 45%, #6E3D56 100%)" }}
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
        <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
        <p className="text-sm text-white/70 mb-5">Begin your wellness journey today</p>

        {error && (
          <div
            className="rounded-2xl px-4 py-3 mb-4 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          {/* Full name */}
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/50 outline-none transition-all"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {showPreview && (
            <motion.p
              className="text-xs text-white/75 pl-1 -mt-1"
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
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white outline-none transition-all"
              style={{ ...inputStyle, colorScheme: "dark" }}
              onFocus={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
              onBlur={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            />
          </div>
          <p className="text-[11px] text-white/55 pl-1 -mt-1.5">
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
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder:text-white/50 outline-none transition-all"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
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
            style={{ background: "#B66A78", color: "#ffffff" }}
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

        <p className="text-center text-sm text-white/65 mt-5">
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
