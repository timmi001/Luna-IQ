import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { BottomNav } from "@/components/BottomNav";
import { AnimatePresence } from "framer-motion";

import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Mood from "@/pages/Mood";
import Cycle from "@/pages/Cycle";
import Insights from "@/pages/Insights";
import Profile from "@/pages/Profile";

const queryClient = new QueryClient();

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/chat" component={Chat} />
        <Route path="/mood" component={Mood} />
        <Route path="/cycle" component={Cycle} />
        <Route path="/insights" component={Insights} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="mobile-container">
            <Router />
            <BottomNav />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
