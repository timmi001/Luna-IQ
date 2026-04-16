import { useState } from "react";
import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseColor, getPhaseMessage, CyclePhase } from "@/utils/cycle";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarHeart } from "lucide-react";

export default function Cycle() {
  const { toast } = useToast();
  const [data, setData] = useState(storage.getCycle());
  
  const [lastPeriodInput, setLastPeriodInput] = useState(
    data.lastPeriodStart ? format(new Date(data.lastPeriodStart), "yyyy-MM-dd") : ""
  );
  const [cycleLengthInput, setCycleLengthInput] = useState(data.cycleLength.toString());

  const handleSave = () => {
    const cycleLength = parseInt(cycleLengthInput, 10);
    if (isNaN(cycleLength) || cycleLength < 20 || cycleLength > 45) {
      toast({
        title: "Invalid cycle length",
        description: "Please enter a number between 20 and 45.",
        variant: "destructive"
      });
      return;
    }

    const newData = {
      lastPeriodStart: lastPeriodInput || null,
      cycleLength
    };

    storage.saveCycle(newData);
    setData(newData);
    
    toast({
      title: "Cycle updated 📅",
      description: "Your rhythm has been recorded.",
    });
  };

  const { currentDay, phase, nextPeriodDate } = getCycleDetails(data.lastPeriodStart, data.cycleLength);

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <AppHeader 
        title="Your Rhythm" 
        subtitle="Track and understand your cycle."
      />
      
      <main className="flex-1 px-6 pt-2 pb-28 flex flex-col gap-6">
        
        {/* Phase Card */}
        {phase !== "Unknown" ? (
          <div className={`rounded-3xl p-6 shadow-sm border relative overflow-hidden ${getPhaseColor(phase as CyclePhase)} bg-opacity-20`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-sm uppercase tracking-wider font-semibold opacity-80 mb-1">Current Phase</p>
                  <h2 className="text-3xl font-semibold tracking-tight">{phase}</h2>
                </div>
                <div className="w-12 h-12 bg-white/50 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-xl font-semibold">Day {currentDay}</span>
                </div>
              </div>
              
              <div className="bg-white/60 backdrop-blur-md rounded-2xl p-4 mt-2 border border-white/40">
                <p className="text-sm font-medium leading-relaxed">{getPhaseMessage(phase as CyclePhase)}</p>
              </div>

              {nextPeriodDate && (
                <p className="text-sm mt-4 opacity-80 font-medium">
                  Next period predicted for {format(nextPeriodDate, "MMMM d")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-card-border text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-300 mb-4">
              <CalendarHeart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No cycle data yet</h3>
            <p className="text-sm text-muted-foreground">Enter your details below to start tracking your natural rhythm.</p>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border mt-2">
          <h3 className="text-lg font-medium mb-4">Update Details</h3>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-muted-foreground ml-1">First day of last period</Label>
              <Input 
                type="date" 
                value={lastPeriodInput}
                onChange={(e) => setLastPeriodInput(e.target.value)}
                className="h-12 rounded-2xl bg-gray-50 border-transparent focus-visible:bg-white focus-visible:ring-primary/20 focus-visible:border-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-muted-foreground ml-1">Average cycle length (days)</Label>
              <Input 
                type="number" 
                min="20"
                max="45"
                value={cycleLengthInput}
                onChange={(e) => setCycleLengthInput(e.target.value)}
                className="h-12 rounded-2xl bg-gray-50 border-transparent focus-visible:bg-white focus-visible:ring-primary/20 focus-visible:border-primary/30"
              />
            </div>

            <Button 
              className="w-full rounded-2xl h-14 text-base font-medium shadow-sm hover:shadow-md transition-all mt-4"
              onClick={handleSave}
            >
              Save Details
            </Button>
          </div>
        </div>

      </main>
    </PageTransition>
  );
}
