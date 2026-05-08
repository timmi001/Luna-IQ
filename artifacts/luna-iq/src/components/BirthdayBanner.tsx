import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/contexts/AuthContext";

type Props = {
  profile: Profile;
  onDismiss: () => void;
};

export function BirthdayBanner({ profile, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [rewarded, setRewarded] = useState(false);

  useEffect(() => {
    if (!profile.date_of_birth) return;

    const today = new Date().toISOString().split("T")[0]!;
    const dob = new Date(profile.date_of_birth);
    const now = new Date();

    const isBirthday =
      dob.getUTCMonth() === now.getUTCMonth() &&
      dob.getUTCDate() === now.getUTCDate();

    const alreadyShown = profile.birthday_last_shown_at === today;

    if (isBirthday && !alreadyShown) {
      setVisible(true);
      claimReward(today);
    }
  }, [profile]);

  const claimReward = async (today: string) => {
    await supabase
      .from("profiles")
      .update({
        birthday_last_shown_at: today,
        luna_points: (profile.luna_points ?? 0) + 50,
      })
      .eq("id", profile.id);
    setRewarded(true);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 400);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="relative rounded-3xl overflow-hidden shadow-md border border-purple-100 mx-0"
          style={{ background: "linear-gradient(135deg, #F3EEFF 0%, #FFF0F9 50%, #EEF2FF 100%)" }}
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
        >
          {/* Soft shimmer overlay */}
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 20% 50%, #E9E4FF 0%, transparent 60%)" }} />

          <div className="relative px-5 py-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #E9E4FF, #F7D6E0)" }}>
              <span className="text-2xl">🎂</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-purple-900 text-[15px] leading-snug">
                Happy Birthday, {profile.first_name} 💜
              </p>
              <p className="text-xs text-purple-600/80 mt-0.5 leading-relaxed">
                Wishing you a gentle and beautiful year ahead 🌸
              </p>

              {rewarded && (
                <motion.div
                  className="flex items-center gap-1.5 mt-2.5 bg-white/70 rounded-xl px-3 py-1.5 w-fit border border-purple-100"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Gift className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-semibold text-purple-700">
                    +50 Luna Points — Birthday reward unlocked 💜
                  </span>
                </motion.div>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0 hover:bg-white/90 transition-colors mt-0.5"
            >
              <X className="w-3.5 h-3.5 text-purple-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
