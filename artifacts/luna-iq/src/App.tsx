import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { BottomNav } from "@/components/BottomNav";
import { motion } from "framer-motion";
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFF7FB" }}>
      <motion.div
        className="w-3 h-3 rounded-full"
        style={{ background: "#A78BFA" }}
        animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ── Redirect helper ───────────────────────────────────────────────────────────
// Shows the loading screen while the wouter navigation fires in useEffect.
// This prevents a blank frame that would otherwise appear when AuthRedirect
// returned null inside AnimatePresence.

function AuthRedirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return <LoadingScreen />;
}

// ── Protected route ───────────────────────────────────────────────────────────
// Renders children only after auth has initialized AND a user is present.
// While loading → loading screen. No user → redirect to /login.

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)  return <LoadingScreen />;
  if (!user)    return <AuthRedirect to="/login" />;
  return <>{children}</>;
}

// ── Public route ──────────────────────────────────────────────────────────────
// Redirects logged-in users away from /login and /signup.

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user)    return <AuthRedirect to="/" />;
  return <>{children}</>;
}

// ── Route tree ────────────────────────────────────────────────────────────────
// AnimatePresence is intentionally NOT wrapping Switch here — it doesn't
// actually drive route transitions (each page uses its own PageTransition
// component). Wrapping Switch caused blank frames during auth redirects.

function AppRoutes() {
  return (
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
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const isAuthPage = location === "/login" || location === "/signup";
  const isFullscreenPage = location === "/chat";
  const showNav = !loading && !!user && !isAuthPage && !isFullscreenPage;

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
