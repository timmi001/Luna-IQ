import { Link, useLocation } from "wouter";
import { Home, Smile, Moon, BookHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { icon: Home,      label: "Home",  href: "/" },
  { icon: Smile,     label: "Mood",  href: "/mood" },
  { icon: Moon,      label: "Cycle", href: "/cycle" },
  { icon: BookHeart, label: "Diary", href: "/private-space" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    /* z-40 keeps the nav below shadcn modals/dialogs which use z-50 */
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center w-full pointer-events-none">
      <div className="relative w-full max-w-[430px] pointer-events-auto">
        <nav
          className="mx-3 mb-3 rounded-[28px] flex items-center justify-around px-2"
          style={{
            height: 60,
            background: "rgba(255,255,255,0.94)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(168,85,247,0.18)",
            boxShadow: "0 -2px 24px rgba(124,58,237,0.10), 0 8px 32px rgba(124,58,237,0.14)",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  className="flex flex-col items-center justify-center w-16 h-full cursor-pointer relative"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  whileTap={{ scale: 0.92 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-x-1 inset-y-1.5 rounded-2xl"
                      style={{ background: "rgba(124,58,237,0.10)" }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "w-[22px] h-[22px] transition-all duration-200",
                      isActive ? "text-[#7C3AED] scale-110" : "text-[#9CA3AF] scale-100"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  <span
                    className={cn(
                      "text-[10px] mt-0.5 font-semibold tracking-wide transition-colors duration-200",
                      isActive ? "text-[#7C3AED]" : "text-[#9CA3AF]"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
