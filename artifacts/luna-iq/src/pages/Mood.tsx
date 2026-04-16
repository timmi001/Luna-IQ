import { useState } from "react";
import { storage, MoodEntry } from "@/utils/storage";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion } from "framer-motion";

const MOODS = [
  { emoji: "😢", label: "Sad", color: "bg-blue-100/50 text-blue-700" },
  { emoji: "😐", label: "Neutral", color: "bg-gray-100/50 text-gray-700" },
  { emoji: "🙂", label: "Okay", color: "bg-emerald-100/50 text-emerald-700" },
  { emoji: "😊", label: "Good", color: "bg-luna-peach/50 text-orange-700" },
  { emoji: "😍", label: "Amazing", color: "bg-rose-100/50 text-rose-700" },
];

export default function Mood() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<MoodEntry[]>(storage.getMoods().slice(0, 7));
  const { toast } = useToast();

  const handleSave = () => {
    if (!selectedMood) return;

    const newMood = storage.addMood({
      date: new Date().toISOString(),
      mood: selectedMood,
      note,
    });

    setHistory((prev) => [newMood, ...prev].slice(0, 7));
    setSelectedMood(null);
    setNote("");
    
    toast({
      title: "Mood logged 🌸",
      description: "Your feelings have been safely recorded.",
    });
  };

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <AppHeader 
        title="How are you?" 
        subtitle="Take a deep breath and check in."
      />
      
      <main className="flex-1 px-6 pt-2 pb-28 flex flex-col gap-8">
        
        {/* Mood Selection */}
        <section>
          <div className="flex justify-between items-center gap-2 mt-4">
            {MOODS.map((m) => {
              const isSelected = selectedMood === `${m.emoji} ${m.label}`;
              return (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  key={m.label}
                  onClick={() => setSelectedMood(`${m.emoji} ${m.label}`)}
                  className={`flex flex-col items-center gap-2 flex-1 py-4 rounded-3xl transition-all duration-300
                    ${isSelected ? 'bg-white shadow-md border-primary/20 scale-105' : 'bg-transparent hover:bg-white/50 border-transparent'}
                    border
                  `}
                >
                  <span className={`text-4xl transition-transform duration-300 ${isSelected ? 'scale-110' : 'grayscale-[20%]'}`}>
                    {m.emoji}
                  </span>
                  <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                    {m.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Note Input */}
        <section className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border focus-within:ring-2 ring-primary/20 transition-all">
            <Textarea
              placeholder="Add a gentle note about your day... (optional)"
              className="min-h-[100px] border-0 focus-visible:ring-0 resize-none px-0 py-0 text-base bg-transparent placeholder:text-muted-foreground/70"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          
          <Button 
            className="w-full rounded-2xl h-14 text-base font-medium shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            disabled={!selectedMood}
            onClick={handleSave}
          >
            Save for myself
          </Button>
        </section>

        {/* History */}
        {history.length > 0 && (
          <section className="mt-4">
            <h3 className="text-lg font-medium mb-4 px-1">Recent check-ins</h3>
            <div className="flex flex-col gap-3">
              {history.map((entry) => (
                <div key={entry.id} className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white flex gap-4 items-center">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl shrink-0">
                    {entry.mood.split(' ')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-medium text-foreground">{entry.mood.split(' ')[1]}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.date), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-sm text-muted-foreground truncate">{entry.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </PageTransition>
  );
}
