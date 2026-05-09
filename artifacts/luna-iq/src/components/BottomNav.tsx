import { Link, useLocation } from "wouter";
import { Home, MessageCircleHeart, HeartPulse, CalendarHeart, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: Home,               label: "Home",    href: "/" },
  { icon: MessageCircleHeart, label: "Chat",    href: "/chat" },
  { icon: PenLine,            label: "Space",   href: "/private-space" },
  { icon: HeartPulse,         label: "Mood",    href: "/mood" },
  { icon: CalendarHeart,      label: "Cycle",   href: "/cycle" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center w-full pointer-events-none">
      <nav className="glass-nav w-full max-w-[430px] h-20 px-4 flex items-center justify-between pb-safe pointer-events-auto rounded-t-3xl">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex flex-col items-center justify-center w-14 h-14 cursor-pointer relative"
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl -z-10 animate-in zoom-in duration-300" />
                )}
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-all duration-300",
                    isActive ? "text-primary scale-110" : "text-muted-foreground scale-100"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={cn(
                  "text-[9px] mt-1 font-medium transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
