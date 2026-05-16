import { Link, useLocation } from "wouter";
import { Home, Smile, Sparkles, Moon, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { icon: Home,      label: "Home",    href: "/" },
  { icon: Smile,     label: "Mood",    href: "/mood" },
  { icon: Sparkles,  label: "Insight", href: "/insights", featured: true },
  { icon: Moon,      label: "Cycle",   href: "/cycle" },
  { icon: UserRound, label: "Me",      href: "/profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    /* z-40 keeps the nav below shadcn modals/dialogs which use z-50 */
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center w-full pointer-events-none">
      <div className="relative w-full max-w-[430px] pointer-events-auto">
        {/* Nav bar */}
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
            const isActive = item.featured
              ? location === item.href
              : location === item.href;

            if (item.featured) {
              return (
                <Link key={item.href} href={item.href}>
                  {/* Spacer — the actual button floats above */}
                  <div className="w-14 h-full" />
                </Link>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  className="flex flex-col items-center justify-center w-14 h-full cursor-pointer relative"
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
                      isActive
                        ? "text-[#7C3AED] scale-110"
                        : "text-[#9CA3AF] scale-100"
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

        {/* Featured center button — floats above the nav bar */}
        {(() => {
          const featuredItem = NAV_ITEMS.find((i) => i.featured)!;
          const isFeaturedActive = location === featuredItem.href;
          return (
            <Link href={featuredItem.href}>
              <motion.div
                data-testid="nav-insight"
                whileTap={{ scale: 0.90 }}
                className="absolute cursor-pointer"
                style={{
                  bottom: 24,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 58,
                  height: 58,
                  borderRadius: 20,
                  background: isFeaturedActive
                    ? "linear-gradient(135deg, #6D28D9 0%, #BE185D 100%)"
                    : "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
                  boxShadow: isFeaturedActive
                    ? "0 0 0 3px rgba(124,58,237,0.30), 0 8px 24px rgba(124,58,237,0.45)"
                    : "0 4px 20px rgba(124,58,237,0.40)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  transition: "box-shadow 0.2s, background 0.2s",
                }}
              >
                <featuredItem.icon
                  className="w-6 h-6 text-white"
                  strokeWidth={isFeaturedActive ? 2.5 : 2}
                />
                <span className="text-[9px] font-bold text-white/90 tracking-wider uppercase">
                  {featuredItem.label}
                </span>
              </motion.div>
            </Link>
          );
        })()}
      </div>
    </div>
  );
}
