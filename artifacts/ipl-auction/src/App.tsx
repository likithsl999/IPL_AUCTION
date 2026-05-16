import React, { useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Auction from "@/pages/Auction";
import Squad from "@/pages/Squad";
import History from "@/pages/History";
import Teams from "@/pages/Teams";
import Season from "@/pages/Season";
import Analytics from "@/pages/Analytics";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import Leaderboard from "@/pages/Leaderboard";
import MultiplayerLobby from "@/pages/MultiplayerLobby";
import LoadingScreen from "@/components/LoadingScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/"              component={Home} />
      <Route path="/auction"       component={Auction} />
      <Route path="/squad"         component={Squad} />
      <Route path="/history"       component={History} />
      <Route path="/teams"         component={Teams} />
      <Route path="/season"        component={Season} />
      <Route path="/analytics"     component={Analytics} />
      <Route path="/login"         component={Login} />
      <Route path="/register"      component={Register} />
      <Route path="/leaderboard"   component={Leaderboard} />
      <Route path="/multiplayer"   component={MultiplayerLobby} />
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
            {loading && <LoadingScreen onDone={() => setLoading(false)} />}
            <div className={loading ? "opacity-0 pointer-events-none" : "opacity-100 transition-opacity duration-500"}>
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
