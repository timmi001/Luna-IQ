import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Crown, Palette, FileText, Shield, AlertCircle, LogOut, Check, Pencil, Mail } from "lucide-react";
import { storage } from "@/utils/storage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const AVATARS = [
  { emoji: "🌸", bg: "#FFF0F9", label: "Blossom" },
  { emoji: "🦋", bg: "#F5F3FF", label: "Butterfly" },
  { emoji: "", bg: "#EEF2FF", label: "Luna", image: "/luna-icon.jpg" },
  { emoji: "🌺", bg: "#FFF7ED", label: "Hibiscus" },
  { emoji: "✨", bg: "#FEFCE8", label: "Sparkle" },
  { emoji: "🌷", bg: "#FFF0F6", label: "Tulip" },
  { emoji: "💫", bg: "#EFF6FF", label: "Cosmic" },
  { emoji: "🌻", bg: "#FEFCE8", label: "Sunny" },
];

type SheetType = "privacy" | "policy" | "disclaimer" | "premium" | "theme" | null;

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, profile, refreshProfile, signOut } = useAuth();

  const [avatarIndex, setAvatarIndex] = useState(profile?.avatar_index ?? 0);
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.full_name ?? "");
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [savingName, setSavingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);


  const avatar = AVATARS[avatarIndex] ?? AVATARS[0]!;

  const handleAvatarSelect = async (i: number) => {
    setAvatarIndex(i);
    storage.saveProfile({ nickname: profile?.first_name ?? "", avatarIndex: i });
    if (user) {
      await supabase.from("profiles").update({ avatar_index: i }).eq("id", user.id);
      await refreshProfile();
    }
  };

  const saveName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    const first = displayName.trim().split(/\s+/)[0] ?? displayName.trim();
    await supabase
      .from("profiles")
      .update({ full_name: displayName.trim(), first_name: first })
      .eq("id", user.id);
    await refreshProfile();
    setSavingName(false);
    setEditingName(false);
  };

  const handleSignOut = () => {
    if (signingOut) return;
    setSigningOut(true);
    signOut(); // optimistic — clears auth state immediately, background Supabase call
  };


  const lunaPoints = profile?.luna_points ?? 0;

  const menuItems = [
    { icon: Crown, label: "Premium", sub: "Unlock all features", color: "#F59E0B", sheet: "premium" as SheetType },
    { icon: Palette, label: "Theme", sub: "Customize your space", color: "#A78BFA", sheet: "theme" as SheetType },
    { icon: Shield, label: "Privacy Policy", sub: "How we protect your data", color: "#60A5FA", sheet: "privacy" as SheetType },
    { icon: FileText, label: "Terms of Service", sub: "Our usage agreement", color: "#34D399", sheet: "policy" as SheetType },
    { icon: AlertCircle, label: "Disclaimer", sub: "Important information", color: "#F472B6", sheet: "disclaimer" as SheetType },
  ];

  return (
    <PageTransition className="flex flex-col min-h-screen pb-28">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <button
          onClick={() => setLocation("/")}
          className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-xl font-semibold text-foreground">My Profile</h1>
      </header>

      <main className="flex-1 px-5 flex flex-col gap-5">
        {/* Avatar + Name card */}
        <div className="luna-glass rounded-3xl p-6 shadow-sm flex flex-col items-center gap-4">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-md"
            style={{ background: avatar.bg, fontSize: 48 }}
          >
            {avatar.emoji}
          </div>

          {/* Name */}
          {editingName ? (
            <div className="flex items-center gap-2 w-full max-w-[240px]">
              <input
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                maxLength={40}
                className="flex-1 text-center text-lg font-semibold border-b-2 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                style={{ borderColor: "#C3898E" }}
              />
              <button
                onClick={saveName}
                disabled={savingName}
                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50"
                style={{ background: "rgba(180,232,224,0.40)" }}
              >
                <Check className="w-4 h-4" style={{ color: "#4A3644" }} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} className="flex items-center gap-2 group">
              <span className="text-xl font-semibold text-foreground">
                {profile?.full_name || "Add your name"}
              </span>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-luna-rose transition-colors" />
            </button>
          )}

          {/* Email */}
          {user?.email && (
            <div className="flex items-center gap-1.5 -mt-2">
              <Mail className="w-3 h-3 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}

          {/* Luna Points inline badge — only shown when user has earned points */}
          {lunaPoints > 0 && (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-2" style={{ background: "rgba(230,197,127,0.20)", border: "1px solid rgba(230,197,127,0.40)" }}>
              <span className="text-lg">✨</span>
              <div>
                <p className="text-xs font-semibold text-foreground">{lunaPoints} Luna Points</p>
                <p className="text-[10px] text-muted-foreground">Keep going, you're doing great</p>
              </div>
            </div>
          )}
        </div>

        {/* Avatar picker */}
        <div className="luna-glass rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Choose your avatar</p>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((av, i) => (
              <button
                key={i}
                onClick={() => handleAvatarSelect(i)}
                className="flex flex-col items-center gap-1 focus:outline-none"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all overflow-hidden"
                  style={{
                    background: av.bg,
                    fontSize: 28,
                    border: avatarIndex === i ? "2.5px solid #C3898E" : "2px solid transparent",
                    boxShadow: avatarIndex === i ? "0 0 12px rgba(195,137,142,0.45)" : "none",
                    transform: avatarIndex === i ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  {(av as any).image
                    ? <img src={(av as any).image} alt={av.label} className="w-full h-full object-cover" />
                    : av.emoji}
                </div>
                <span className="text-[9px] text-muted-foreground">{av.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Luna Points navigation card */}
        <button
          onClick={() => setLocation("/luna-points")}
          className="w-full rounded-3xl p-5 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all text-left overflow-hidden relative luna-glass"
        >
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
            <img src="/luna-icon.jpg" alt="Luna" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Luna Points</p>
            <p className="text-xs text-muted-foreground">View rewards & activity</p>
          </div>
          <div className="flex items-center gap-2">
            {lunaPoints > 0 && (
              <div className="bg-white/60 rounded-xl px-2.5 py-1">
                <p className="text-xs font-bold text-foreground">{lunaPoints} pts</p>
              </div>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>

        {/* Menu items */}
        <div className="luna-glass rounded-3xl shadow-sm overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => setActiveSheet(item.sheet)}
              className={`w-full flex items-center gap-3 px-5 py-4 active:bg-muted/30 transition-colors text-left ${i < menuItems.length - 1 ? "border-b border-border/40" : ""}`}
            >
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: item.color + "20" }}
              >
                <item.icon className="w-4 h-4" style={{ color: item.color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full rounded-3xl px-5 py-4 flex items-center justify-center gap-2.5 font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)",
            border: "1.5px solid #FECDD3",
            color: "#E11D48",
          }}
        >
          {signingOut ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Signing out…
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              Sign out
            </>
          )}
        </button>
      </main>

      {/* Info sheets */}
      <Sheet open={activeSheet !== null} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto pb-10" style={{ background: "linear-gradient(180deg, #F5E1E3 0%, #ECD5DC 100%)" }}>
          <SheetHeader>
            <SheetTitle>
              {activeSheet === "premium" && "Luna Premium 👑"}
              {activeSheet === "theme" && "Themes 🎨"}
              {activeSheet === "privacy" && "Privacy Policy 🔒"}
              {activeSheet === "policy" && "Terms of Service 📄"}
              {activeSheet === "disclaimer" && "Disclaimer ⚠️"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {activeSheet === "premium" && (
              <div className="flex flex-col gap-4">
                <p>Unlock the full Luna experience with Premium:</p>
                <ul className="flex flex-col gap-2">
                  {["Unlimited mood history", "Advanced cycle insights", "AI personalization", "Custom themes", "Priority support"].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-yellow-400">★</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button className="mt-2 w-full py-3 rounded-2xl font-semibold text-white" style={{ background: "linear-gradient(135deg, #F59E0B, #F472B6)" }}>
                  Coming Soon ✨
                </button>
              </div>
            )}
            {activeSheet === "theme" && (
              <p>Custom themes are coming soon! We're crafting beautiful new color palettes just for you. 🎨</p>
            )}
            {activeSheet === "privacy" && (
              <p>Luna IQ respects your privacy. Your wellness data is protected with Supabase Row Level Security — only you can access your profile and data. We do not sell or share your personal information.</p>
            )}
            {activeSheet === "policy" && (
              <p>By using Luna IQ, you agree to use the app for personal wellness purposes only. The content and features are provided as-is. Luna IQ reserves the right to update these terms at any time.</p>
            )}
            {activeSheet === "disclaimer" && (
              <p>Luna IQ is a wellness companion app and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or qualified health provider with any questions you may have regarding a medical condition.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PageTransition>
  );
}
