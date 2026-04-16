import { Link } from "wouter";
import { MessageCircleHeart, HeartPulse, CalendarHeart, Sparkles } from "lucide-react";
import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseColor } from "@/utils/cycle";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { useEffect, useState } from "react";

export default function Home() {
  const [greeting, setGreeting] = useState("");
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const latestMood = storage.getLatestMood();
  const cycleData = storage.getCycle();
  const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <AppHeader 
        title={
          <span className="flex items-center gap-2">
            {greeting} <Sparkles className="w-5 h-5 text-luna-peach" />
          </span>
        }
        subtitle="Ready for a moment of mindfulness?"
      />
      
      <main className="flex-1 px-6 pt-4 pb-28 flex flex-col gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-luna-lavender/30 rounded-full blur-2xl -mr-10 -mt-10" />
          <h2 className="text-lg font-medium mb-4 text-foreground">Today's Check-in</h2>
          
          <div className="flex gap-4">
            <div className="flex-1 bg-luna-blush/20 rounded-2xl p-4 border border-luna-blush/30">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Mood</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{latestMood ? latestMood.mood.split(' ')[0] : '🤍'}</span>
                <span className="text-sm font-medium">{latestMood ? latestMood.mood.split(' ')[1] : 'Not logged'}</span>
              </div>
            </div>
            
            <div className={`flex-1 rounded-2xl p-4 border ${phase !== 'Unknown' ? getPhaseColor(phase).replace('text-', 'border-').replace('bg-', 'bg-opacity-20 bg-') : 'bg-gray-50 border-gray-100'}`}>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Cycle</p>
              <div className="flex flex-col">
                <span className="text-sm font-semibold truncate">{phase !== 'Unknown' ? phase : 'Not logged'}</span>
                <span className="text-xs opacity-80">{phase !== 'Unknown' ? `Day ${currentDay}` : '--'}</span>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-medium mt-2 px-1">Your Spaces</h3>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/chat">
            <div className="bg-luna-lavender/40 hover:bg-luna-lavender/60 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-purple-500">
                <MessageCircleHeart className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-purple-900">Luna Chat</h3>
              <p className="text-xs text-purple-700/70 mt-1">Talk to your AI companion</p>
            </div>
          </Link>

          <Link href="/mood">
            <div className="bg-luna-peach/40 hover:bg-luna-peach/60 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-orange-500">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-orange-900">Mood</h3>
              <p className="text-xs text-orange-700/70 mt-1">Track how you feel</p>
            </div>
          </Link>

          <Link href="/cycle">
            <div className="bg-rose-100/60 hover:bg-rose-100/80 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-rose-500">
                <CalendarHeart className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-rose-900">Cycle</h3>
              <p className="text-xs text-rose-700/70 mt-1">Understand your rhythm</p>
            </div>
          </Link>

          <Link href="/insights">
            <div className="bg-luna-mint/40 hover:bg-luna-mint/60 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-emerald-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-emerald-900">Insights</h3>
              <p className="text-xs text-emerald-700/70 mt-1">Discover patterns</p>
            </div>
          </Link>
        </div>
      </main>
    </PageTransition>
  );
}
