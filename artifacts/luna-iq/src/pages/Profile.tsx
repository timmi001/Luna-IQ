import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight, Crown, Palette, FileText, Shield, AlertCircle, LogOut, Check, Pencil } from "lucide-react";
import { storage } from "@/utils/storage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageTransition } from "@/components/PageTransition";

const AVATARS = [
  { emoji: "🌸", bg: "#FFF0F9", label: "Blossom" },
  { emoji: "🦋", bg: "#F5F3FF", label: "Butterfly" },
  { emoji: "🌙", bg: "#EEF2FF", label: "Luna" },
  { emoji: "🌺", bg: "#FFF7ED", label: "Hibiscus" },
  { emoji: "✨", bg: "#FEFCE8", label: "Sparkle" },
  { emoji: "🌷", bg: "#FFF0F6", label: "Tulip" },
  { emoji: "💫", bg: "#EFF6FF", label: "Cosmic" },
  { emoji: "🌻", bg: "#FEFCE8", label: "Sunny" },
];

type SheetType = "privacy" | "policy" | "disclaimer" | "premium" | "theme" | null;

export default function Profile() {
  const [, setLocation] = useLocation();
  const profile = storage.getProfile();
  const [nickname, setNickname] = useState(profile.nickname || "");
  const [avatarIndex, setAvatarIndex] = useState(profile.avatarIndex ?? 0);
  const [editing, setEditing] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  const save = () => {
    storage.saveProfile({ nickname, avatarIndex });
    setEditing(false);
  };

  const handleAvatarSelect = (i: number) => {
    setAvatarIndex(i);
    storage.saveProfile({ nickname, avatarIndex: i });
  };

  const handleLogout = () => {
    localStorage.clear();
    setLocation("/");
  };

  const avatar = AVATARS[avatarIndex] ?? AVATARS[0];

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
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border flex flex-col items-center gap-4">
          {/* Large avatar */}
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-md"
            style={{ background: avatar.bg, fontSize: 48 }}
          >
            {avatar.emoji}
          </div>

          {/* Nickname */}
          {editing ? (
            <div className="flex items-center gap-2 w-full max-w-[200px]">
              <input
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Your nickname"
                maxLength={20}
                className="flex-1 text-center text-lg font-semibold border-b-2 border-purple-200 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              />
              <button onClick={save} className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-purple-600" />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 group">
              <span className="text-xl font-semibold text-foreground">
                {nickname || "Add a nickname"}
              </span>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
            </button>
          )}
          <p className="text-xs text-muted-foreground -mt-2">Tap name to edit</p>
        </div>

        {/* Avatar picker */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Choose your avatar</p>
          <div className="grid grid-cols-4 gap-3">
            {AVATARS.map((av, i) => (
              <button
                key={i}
                onClick={() => handleAvatarSelect(i)}
                className="flex flex-col items-center gap-1 focus:outline-none"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                  style={{
                    background: av.bg,
                    fontSize: 28,
                    border: avatarIndex === i ? "2.5px solid #A78BFA" : "2px solid transparent",
                    boxShadow: avatarIndex === i ? "0 0 12px rgba(167,139,250,0.4)" : "none",
                    transform: avatarIndex === i ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  {av.emoji}
                </div>
                <span className="text-[9px] text-muted-foreground">{av.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu items */}
        <div className="bg-white rounded-3xl shadow-sm border border-card-border overflow-hidden">
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

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-3xl px-5 py-4 shadow-sm border border-rose-100 flex items-center gap-3 active:scale-[0.98] transition-all"
        >
          <div className="w-9 h-9 rounded-2xl bg-rose-50 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-sm font-medium text-rose-500">Log out</span>
        </button>
      </main>

      {/* Info sheets */}
      <Sheet open={activeSheet !== null} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto pb-10" style={{ background: "linear-gradient(180deg, #FFF7FB 0%, #F6F0FF 100%)" }}>
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
              <p>Luna Chat respects your privacy. All your data is stored locally on your device. We do not collect, share, or sell your personal information. Your wellness journey is yours alone.</p>
            )}
            {activeSheet === "policy" && (
              <p>By using Luna Chat, you agree to use the app for personal wellness purposes only. The content and features are provided as-is. Luna Chat reserves the right to update these terms at any time.</p>
            )}
            {activeSheet === "disclaimer" && (
              <p>Luna Chat is a wellness companion app and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or qualified health provider with any questions you may have regarding a medical condition.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PageTransition>
  );
}
