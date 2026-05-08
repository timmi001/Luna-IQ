import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { BottomNav } from "@/components/BottomNav";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";

import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Mood from "@/pages/Mood";
import Cycle from "@/pages/Cycle";
import Profile from "@/pages/Profile";
import Breathe from "@/pages/Breathe";
import Water from "@/pages/Water";
import Routine from "@/pages/Routine";
import Notifications from "@/pages/Notifications";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #FFF7FB 0%, #F3EEFF 50%, #FFF0F6 100%)" }}
    >
      <motion.div
        className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg"
        style={{ background: "linear-gradient(135deg, #E9E4FF, #F7D6E0)" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-3xl">🌙</span>
      </motion.div>
    </div>
  );
}

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to); }, [to, setLocation]);
  return null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <AnimatePresence mode="wait">
      <Switch>
        {/* Public routes */}
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />

        {/* Protected routes */}
        <Route path="/">
          <ProtectedRoute><Home /></ProtectedRoute>
        </Route>
        <Route path="/chat">
          <ProtectedRoute><Chat /></ProtectedRoute>
        </Route>
        <Route path="/mood">
          <ProtectedRoute><Mood /></ProtectedRoute>
        </Route>
        <Route path="/cycle">
          <ProtectedRoute><Cycle /></ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute><Profile /></ProtectedRoute>
        </Route>
        <Route path="/breathe">
          <ProtectedRoute><Breathe /></ProtectedRoute>
        </Route>
        <Route path="/water">
          <ProtectedRoute><Water /></ProtectedRoute>
        </Route>
        <Route path="/routine">
          <ProtectedRoute><Routine /></ProtectedRoute>
        </Route>
        <Route path="/notifications">
          <ProtectedRoute><Notifications /></ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const isAuthPage = location === "/login" || location === "/signup";
  const showNav = !loading && !!user && !isAuthPage;

  return (
    <div className="mobile-container">
      <AppRoutes />
      {showNav && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
