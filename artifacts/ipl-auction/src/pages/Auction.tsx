import React, { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAuctionState,
  usePlaceBid,
  useNextPlayer,
  usePassPlayer,
  useResetAuction,
  useTriggerAiBid,
  getGetAuctionStateQueryKey,
  getGetTeamsQueryKey,
  type Team,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Users, Wallet, ChevronRight, RotateCcw, SkipForward } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  Batsman: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Bowler: "bg-green-500/20 text-green-400 border-green-500/30",
  "All-rounder": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Wicketkeeper: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const BID_INCREMENTS = [0.2, 0.5, 1, 2, 5];

export default function Auction() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: state, isLoading } = useGetAuctionState({
    query: {
      queryKey: getGetAuctionStateQueryKey(),
      refetchInterval: 2000,
    },
  });

  const placeBid = usePlaceBid();
  const nextPlayer = useNextPlayer();
  const passPlayer = usePassPlayer();
  const resetAuction = useResetAuction();
  const triggerAiBid = useTriggerAiBid();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetAuctionStateQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTeamsQueryKey() });
  }, [queryClient]);

  // Trigger AI bids every 3 seconds during bidding
  useEffect(() => {
    if (state?.status === "bidding" && state?.started) {
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = setInterval(() => {
        triggerAiBid.mutate(undefined, { onSettled: invalidate });
      }, 3000);
    } else {
      if (aiIntervalRef.current) {
        clearInterval(aiIntervalRef.current);
        aiIntervalRef.current = null;
      }
    }
    return () => {
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    };
  }, [state?.status, state?.started]);

  const handleBid = (increment: number) => {
    if (!state || !state.userTeamId || !state.currentPlayer) return;
    const newBid = parseFloat(((state.currentBid || 0) + increment).toFixed(2));
    placeBid.mutate(
      { data: { teamId: state.userTeamId, amount: newBid } },
      { onSettled: invalidate }
    );
  };

  const handleNext = () => {
    nextPlayer.mutate(undefined, { onSettled: invalidate });
  };

  const handlePass = () => {
    passPlayer.mutate(undefined, { onSettled: invalidate });
  };

  const handleReset = () => {
    resetAuction.mutate(undefined, {
      onSuccess: () => {
        invalidate();
        setLocation("/");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!state?.started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">No auction in progress.</p>
        <Button onClick={() => setLocation("/")}>Go to Setup</Button>
      </div>
    );
  }

  // SOLD / UNSOLD animation overlay
  const showSoldOverlay = state.soldAnimation && state.status === "sold";
  const soldTeam = state.teams?.find((t: Team) => t.id === state.currentBidder);

  const userTeam = state.teams?.find((t: Team) => t.id === state.userTeamId);
  const progress = state.totalPlayers > 0 ? (state.playerIndex / state.totalPlayers) * 100 : 0;
  const isFinished = state.status === "finished";
  const isBidding = state.status === "bidding";
  const isUserBidder = state.currentBidder === state.userTeamId;

  const userBudget = userTeam?.budget ?? 0;
  const canBid = isBidding && userBudget > (state.currentBid || 0) + 0.1 && (userTeam?.players?.length ?? 0) < 25;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* SOLD ANIMATION OVERLAY */}
      {showSoldOverlay && soldTeam && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ backgroundColor: soldTeam.color + "22", backdropFilter: "blur(4px)" }}
        >
          <div
            className="text-[120px] md:text-[180px] font-black uppercase tracking-tighter leading-none animate-bounce"
            style={{ color: soldTeam.color, textShadow: `0 0 60px ${soldTeam.color}88` }}
          >
            SOLD!
          </div>
          <div className="text-2xl md:text-4xl font-bold text-white mt-4">{state.currentPlayer?.name}</div>
          <div className="mt-2 flex items-center gap-3">
            <div
              className="px-4 py-2 rounded-full font-black text-lg text-white"
              style={{ backgroundColor: soldTeam.color }}
            >
              {soldTeam.shortName}
            </div>
            <span className="text-3xl font-mono font-bold text-white">
              ₹{state.currentBid?.toFixed(2)} Cr
            </span>
          </div>
        </div>
      )}

      {/* FINISHED STATE */}
      {isFinished && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm gap-6">
          <Trophy className="h-20 w-20 text-yellow-400" />
          <h2 className="text-4xl font-black uppercase tracking-tighter">Auction Complete</h2>
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <p>{state.playerIndex} players processed</p>
            {userTeam && (
              <p className="text-lg font-bold text-foreground">
                {userTeam.name} — {userTeam.players.length} players — ₹{userTeam.budget.toFixed(2)} Cr remaining
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setLocation("/squad")} variant="default">View My Squad</Button>
            <Button onClick={() => setLocation("/history")} variant="outline">Auction History</Button>
            <Button onClick={handleReset} variant="ghost" className="text-destructive">Reset</Button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">IPL AUCTION</span>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-32 h-1" />
            <span className="text-xs text-muted-foreground font-mono">
              {state.playerIndex + 1}/{state.totalPlayers}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLocation("/squad")}>
            <Users className="h-3 w-3 mr-1" /> My Squad
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLocation("/history")}>
            History
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 gap-6">
          {state.currentPlayer ? (
            <>
              {/* PLAYER CARD */}
              <div className="w-full max-w-sm">
                <div className="relative border border-border rounded-xl bg-card overflow-hidden shadow-2xl">
                  {/* Color accent bar */}
                  <div
                    className="h-1 w-full"
                    style={{
                      background: isUserBidder && userTeam
                        ? `linear-gradient(90deg, ${userTeam.color}, transparent)`
                        : soldTeam
                        ? `linear-gradient(90deg, ${soldTeam.color}, transparent)`
                        : "transparent"
                    }}
                  />
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">{state.currentPlayer.name}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{state.currentPlayer.nationality}</p>
                      </div>
                      <span className={`text-xs border px-2 py-1 rounded-full font-medium ${ROLE_COLORS[state.currentPlayer.role] || ""}`}>
                        {state.currentPlayer.role}
                      </span>
                    </div>

                    {/* Skill rating */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5 text-muted-foreground">
                        <span>SKILL RATING</span>
                        <span className="font-mono font-bold text-foreground">{state.currentPlayer.skillRating}/100</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${state.currentPlayer.skillRating}%`,
                            background: `linear-gradient(90deg, #3b82f6, #8b5cf6)`
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-border">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Base Price</div>
                        <div className="font-mono font-bold">₹{state.currentPlayer.basePrice} Cr</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Player #</div>
                        <div className="font-mono text-muted-foreground">{state.playerIndex + 1}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CURRENT BID */}
              <div className="text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Current Bid</div>
                <div className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-foreground">
                  ₹{state.currentBid?.toFixed(2)}
                  <span className="text-2xl text-muted-foreground ml-1">Cr</span>
                </div>
                {state.currentBidder && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">Leading bid by</span>
                    <span
                      className="text-sm font-bold px-3 py-0.5 rounded-full"
                      style={{
                        backgroundColor: (state.teams?.find((t: Team) => t.id === state.currentBidder)?.color ?? "#666") + "33",
                        color: state.teams?.find((t: Team) => t.id === state.currentBidder)?.color ?? "#fff",
                      }}
                    >
                      {state.currentBidder}
                    </span>
                    {isUserBidder && <span className="text-xs text-green-400">(YOU)</span>}
                  </div>
                )}
              </div>

              {/* TIMER */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`text-4xl font-mono font-black transition-colors ${
                    (state.timer ?? 0) <= 5 ? "text-red-400 animate-pulse" : "text-foreground"
                  }`}
                >
                  {String(state.timer ?? 0).padStart(2, "0")}s
                </div>
                <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      (state.timer ?? 0) <= 5 ? "bg-red-500" : "bg-primary"
                    }`}
                    style={{ width: `${((state.timer ?? 0) / 15) * 100}%` }}
                  />
                </div>
              </div>

              {/* BID CONTROLS */}
              {isBidding && (
                <div className="w-full max-w-sm space-y-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground text-center">
                    Your Budget: <span className="text-foreground font-mono font-bold">₹{userBudget.toFixed(2)} Cr</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {BID_INCREMENTS.map((inc) => {
                      const newBid = (state.currentBid || 0) + inc;
                      const canAfford = newBid <= userBudget;
                      return (
                        <button
                          key={inc}
                          onClick={() => handleBid(inc)}
                          disabled={!canBid || !canAfford || placeBid.isPending}
                          className={`py-2.5 rounded-lg text-xs font-bold font-mono border transition-all ${
                            canBid && canAfford
                              ? "border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground active:scale-95"
                              : "border-border text-muted-foreground opacity-40 cursor-not-allowed"
                          }`}
                        >
                          +{inc}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handlePass}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={passPlayer.isPending}
                    >
                      <SkipForward className="h-3 w-3 mr-1" /> Pass
                    </Button>
                    <Button
                      onClick={handleNext}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={nextPlayer.isPending}
                    >
                      <ChevronRight className="h-3 w-3 mr-1" />
                      {state.currentBidder ? "Sell Now" : "Unsold"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground text-sm">Preparing next player...</p>
            </div>
          )}
        </div>

        {/* SIDEBAR — Teams */}
        <div className="hidden md:flex w-64 border-l border-border flex-col bg-card/30">
          <div className="p-3 border-b border-border">
            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Teams</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {state.teams?.map((team: Team) => {
              const isUser = team.id === state.userTeamId;
              const isCurrent = team.id === state.currentBidder;
              return (
                <div
                  key={team.id}
                  className={`px-3 py-2.5 border-b border-border/50 transition-colors ${
                    isCurrent ? "bg-white/5" : ""
                  } ${isUser ? "border-l-2" : ""}`}
                  style={isUser ? { borderLeftColor: team.color } : {}}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.shortName.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">
                          {team.shortName}
                          {isUser && <span className="ml-1 text-[10px] text-muted-foreground">(YOU)</span>}
                          {isCurrent && <span className="ml-1 text-[10px]" style={{ color: team.color }}>BIDDING</span>}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">₹{team.budget.toFixed(1)} Cr</span>
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-0.5">
                          <Users className="h-2.5 w-2.5" />{team.players.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Budget bar */}
                  <div className="mt-1.5 h-0.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(team.budget / team.initialBudget) * 100}%`,
                        backgroundColor: team.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* User team summary */}
          {userTeam && (
            <div className="p-3 border-t border-border bg-card/50">
              <div className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: userTeam.color }}>
                {userTeam.shortName}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Budget Left</div>
                  <div className="font-mono font-bold">₹{userTeam.budget.toFixed(2)} Cr</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Players</div>
                  <div className="font-mono font-bold">{userTeam.players.length}/25</div>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="w-full mt-2 text-xs" onClick={() => setLocation("/squad")}>
                View Squad
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
