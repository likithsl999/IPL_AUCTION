import React, { useState, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import LoadingScreen from "@/components/LoadingScreen";

// ─── Lazy-load all pages (code splitting — only load what user navigates to) ──
const Home            = lazy(() => import("@/pages/Home"));
const Auction         = lazy(() => import("@/pages/Auction"));
const Squad           = lazy(() => import("@/pages/Squad"));
const History         = lazy(() => import("@/pages/History"));
const Teams           = lazy(() => import("@/pages/Teams"));
const Season          = lazy(() => import("@/pages/Season"));
const Analytics       = lazy(() => import("@/pages/Analytics"));
const Login           = lazy(() => import("@/pages/Login"));
const Register        = lazy(() => import("@/pages/Register"));
const Profile         = lazy(() => import("@/pages/Profile"));
const Leaderboard     = lazy(() => import("@/pages/Leaderboard"));
const MultiplayerLobby = lazy(() => import("@/pages/MultiplayerLobby"));
const NotFound        = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

// ─── Minimal page-level fallback (no flash, just bg color) ───────────────────
function PageFallback() {
  return <div className="min-h-screen bg-[#0a0a0a]" />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/"            component={Home} />
        <Route path="/auction"     component={Auction} />
        <Route path="/squad"       component={Squad} />
        <Route path="/history"     component={History} />
        <Route path="/teams"       component={Teams} />
        <Route path="/season"      component={Season} />
        <Route path="/analytics"   component={Analytics} />
        <Route path="/login"       component={Login} />
        <Route path="/register"    component={Register} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/multiplayer" component={MultiplayerLobby} />
        <Route path="/profile">
          {() => <ProtectedRoute component={Profile} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [appLoading, setAppLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
            {appLoading && <LoadingScreen onDone={() => setAppLoading(false)} />}
            <div className={appLoading ? "opacity-0 pointer-events-none" : "opacity-100 transition-opacity duration-300"}>
              <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
            </div>
            <Toaster />
          </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
