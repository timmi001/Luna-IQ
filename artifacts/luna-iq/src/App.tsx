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
import PrivateSpace from "@/pages/PrivateSpace";
import LunaPoints from "@/pages/LunaPoints";

const queryClient = new QueryClient();

// ── Loading screen ────────────────────────────────────────────────────────────

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

// ── Navigation helper — only redirects AFTER auth is initialized ──────────────

function AuthRedirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    console.log("[Luna Router] Redirecting to", to);
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

// ── Protected route — shows loading, then redirects or renders ────────────────
// IMPORTANT: Only renders children after loading=false AND user is confirmed.
// Never redirects while loading is still true.

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    console.log("[Luna Router] No user after init — redirecting to /login");
    return <AuthRedirect to="/login" />;
  }

  return <>{children}</>;
}

// ── Public route — redirects logged-in users to home ─────────────────────────

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <AuthRedirect to="/" />;
  return <>{children}</>;
}

// ── Route tree ────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/login">
          <PublicRoute><Login /></PublicRoute>
        </Route>
        <Route path="/signup">
          <PublicRoute><Signup /></PublicRoute>
        </Route>

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
        <Route path="/private-space">
          <ProtectedRoute><PrivateSpace /></ProtectedRoute>
        </Route>
        <Route path="/luna-points">
          <ProtectedRoute><LunaPoints /></ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

// ── App shell — nav visibility ────────────────────────────────────────────────

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

// ── Root ──────────────────────────────────────────────────────────────────────

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
