import React, { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Auction from "@/pages/Auction";
import Squad from "@/pages/Squad";
import History from "@/pages/History";
import Teams from "@/pages/Teams";
import Season from "@/pages/Season";
import LoadingScreen from "@/components/LoadingScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auction" component={Auction} />
      <Route path="/squad" component={Squad} />
      <Route path="/history" component={History} />
      <Route path="/teams" component={Teams} />
      <Route path="/season" component={Season} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {loading && <LoadingScreen onDone={() => setLoading(false)} />}
        <div className={loading ? "opacity-0 pointer-events-none" : "opacity-100 transition-opacity duration-500"}>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
