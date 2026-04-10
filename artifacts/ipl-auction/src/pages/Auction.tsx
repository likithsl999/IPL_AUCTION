import React, { useEffect, useRef, useCallback, useState } from "react";
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
  type Player,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Users, Wallet, ChevronRight, RotateCcw, SkipForward, LayoutGrid } from "lucide-react";

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  Batsman:      { bg: "bg-blue-500/10",   text: "text-blue-300",   border: "border-blue-500/30",   glow: "#3b82f6" },
  Bowler:       { bg: "bg-green-500/10",  text: "text-green-300",  border: "border-green-500/30",  glow: "#22c55e" },
  "All-rounder":{ bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/30", glow: "#a855f7" },
  Wicketkeeper: { bg: "bg-amber-500/10",  text: "text-amber-300",  border: "border-amber-500/30",  glow: "#f59e0b" },
};

const BID_INCREMENTS = [0.2, 0.5, 1, 2, 5];

// ─── Stat Bar ────────────────────────────────────────────────────────────────
function StatBar({ label, value, color = "#3b82f6" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-white/40 uppercase tracking-wider">{label}</span>
        <span className="font-mono font-bold text-white/80">{value}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
        />
      </div>
    </div>
  );
}

// ─── Player Card ─────────────────────────────────────────────────────────────
function PlayerCard({ player, currentBidder, userTeam, teams }: {
  player: Player;
  currentBidder: string | null;
  userTeam?: Team;
  teams: Team[];
}) {
  const rc = ROLE_COLORS[player.role] || ROLE_COLORS.Batsman;
  const bidTeam = teams.find(t => t.id === currentBidder);
  const accentColor = bidTeam?.color || userTeam?.color || rc.glow;

  const strengths = player.strengths ? player.strengths.split(",").slice(0, 3) : [];
  const weaknesses = player.weaknesses ? player.weaknesses.split(",").slice(0, 2) : [];

  return (
    <div
      className="relative border rounded-2xl overflow-hidden"
      style={{
        borderColor: accentColor + "30",
        background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.4) 100%)`,
        backdropFilter: "blur(10px)",
        boxShadow: `0 0 30px ${accentColor}15`,
      }}
    >
      {/* Top accent line */}
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white leading-none">
              {player.name}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {player.nationality} • Age {player.age} • {player.experience} IPL seasons
            </p>
          </div>
          <span className={`text-xs border px-2.5 py-1 rounded-full font-bold ${rc.bg} ${rc.text} ${rc.border}`}>
            {player.role}
          </span>
        </div>

        {/* Overall rating */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center font-black flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${rc.glow}22, ${rc.glow}08)`,
              border: `1px solid ${rc.glow}30`,
              boxShadow: `0 0 15px ${rc.glow}20`,
            }}
          >
            <span className="text-xl leading-none font-black text-white">{player.skillRating}</span>
            <span className="text-[8px] text-white/40 tracking-wider">OVR</span>
          </div>
          <div className="flex-1 space-y-1.5">
            <StatBar label="Batting" value={player.battingRating} color="#3b82f6" />
            <StatBar label="Bowling" value={player.bowlingRating} color="#22c55e" />
            <StatBar label="Fielding" value={player.fieldingRating} color="#f59e0b" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-white/3 border border-white/5">
            <div className="text-xs font-mono font-bold text-white">{player.strikeRate}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">SR</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/3 border border-white/5">
            <div className="text-xs font-mono font-bold text-white">{player.economy?.toFixed(1)}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Eco</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/3 border border-white/5">
            <div className="text-xs font-mono font-bold text-white">{player.form}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wider">Form</div>
          </div>
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {strengths.map(s => (
              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                {s.trim()}
              </span>
            ))}
          </div>
        )}
        {weaknesses.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {weaknesses.map(w => (
              <span key={w} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                {w.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Base price */}
        <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Base Price</div>
            <div className="font-mono font-black text-white">₹{player.basePrice} Cr</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Form</div>
            <div className={`font-mono font-bold ${player.form >= 80 ? "text-green-400" : player.form >= 60 ? "text-yellow-400" : "text-red-400"}`}>
              {player.form >= 80 ? "🔥 Hot" : player.form >= 60 ? "⚡ OK" : "❄️ Cold"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Countdown Phase Label ────────────────────────────────────────────────────
function PhaseLabel({ timer, hasBidder }: { timer: number; hasBidder: boolean }) {
  if (!hasBidder) return null;
  if (timer === 2) return (
    <div className="text-yellow-400 font-black text-lg uppercase tracking-widest animate-pulse">
      GOING ONCE...
    </div>
  );
  if (timer === 1) return (
    <div className="text-orange-400 font-black text-lg uppercase tracking-widest animate-pulse">
      GOING TWICE...
    </div>
  );
  if (timer === 0) return (
    <div className="text-red-400 font-black text-xl uppercase tracking-widest animate-bounce">
      SOLD!
    </div>
  );
  return null;
}

export default function Auction() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showTeams, setShowTeams] = useState(false);

  const { data: state, isLoading } = useGetAuctionState({
    query: {
      queryKey: getGetAuctionStateQueryKey(),
      refetchInterval: 800, // faster polling for snappier timer feel
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

  // Trigger AI bids every 1.2 seconds during bidding (fast auction)
  useEffect(() => {
    if (state?.status === "bidding" && state?.started) {
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = setInterval(() => {
        triggerAiBid.mutate(undefined, { onSettled: invalidate });
      }, 1200);
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

  const handleNext = () => nextPlayer.mutate(undefined, { onSettled: invalidate });
  const handlePass = () => passPlayer.mutate(undefined, { onSettled: invalidate });
  const handleReset = () => {
    resetAuction.mutate(undefined, {
      onSuccess: () => { invalidate(); setLocation("/"); }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (!state?.started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4">
        <p className="text-white/50">No auction in progress.</p>
        <Button onClick={() => setLocation("/")} className="bg-yellow-400 text-black font-bold">
          Go to Setup
        </Button>
      </div>
    );
  }

  const showSoldOverlay = state.soldAnimation && state.status === "sold";
  const soldTeam = state.teams?.find((t: Team) => t.id === state.currentBidder);
  const userTeam = state.teams?.find((t: Team) => t.id === state.userTeamId);
  const progress = state.totalPlayers > 0 ? (state.playerIndex / state.totalPlayers) * 100 : 0;
  const isFinished = state.status === "finished";
  const isBidding = state.status === "bidding";
  const isUserBidder = state.currentBidder === state.userTeamId;
  const userBudget = userTeam?.budget ?? 0;
  const canBid = isBidding && userBudget > (state.currentBid || 0) + 0.1 && (userTeam?.players?.length ?? 0) < 25;
  const timer = state.timer ?? 0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* SOLD ANIMATION OVERLAY */}
      {showSoldOverlay && soldTeam && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            backgroundColor: soldTeam.color + "15",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="text-[90px] md:text-[140px] font-black uppercase tracking-tighter leading-none"
            style={{
              color: soldTeam.color,
              textShadow: `0 0 80px ${soldTeam.color}`,
              animation: "soldPulse 0.3s ease-out",
            }}
          >
            SOLD!
          </div>
          <div className="text-3xl md:text-5xl font-black text-white mt-2">
            {state.currentPlayer?.name}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="px-5 py-2 rounded-full font-black text-white text-lg"
              style={{ backgroundColor: soldTeam.color, boxShadow: `0 0 20px ${soldTeam.color}` }}
            >
              {soldTeam.shortName}
            </div>
            <span className="text-4xl font-mono font-black text-white">
              ₹{state.currentBid?.toFixed(2)} Cr
            </span>
          </div>
        </div>
      )}

      {/* FINISHED STATE */}
      {isFinished && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm gap-6">
          <Trophy className="h-20 w-20 text-yellow-400" style={{ filter: "drop-shadow(0 0 20px rgba(251,191,36,0.6))" }} />
          <h2 className="text-5xl font-black uppercase tracking-tighter bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Auction Complete
          </h2>
          <div className="flex flex-col items-center gap-2 text-white/50">
            <p>{state.playerIndex} players processed</p>
            {userTeam && (
              <p className="text-xl font-bold text-white">
                {userTeam.name} — {userTeam.players.length} players — ₹{userTeam.budget.toFixed(2)} Cr remaining
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setLocation("/squad")} className="bg-yellow-400 text-black font-bold">
              View My Squad
            </Button>
            <Button onClick={() => setLocation("/teams")} variant="outline" className="border-white/10 text-white">
              All Teams
            </Button>
            <Button onClick={() => setLocation("/history")} variant="outline" className="border-white/10 text-white">
              History
            </Button>
            <Button onClick={handleReset} variant="ghost" className="text-red-400">
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="border-b border-white/5 px-4 py-2 flex items-center justify-between bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-white/30 uppercase tracking-widest">IPL AUCTION</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                style={{ width: `${progress}%`, transition: "width 0.5s ease" }}
              />
            </div>
            <span className="text-xs text-white/30 font-mono">
              {state.playerIndex + 1}/{state.totalPlayers}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white" onClick={() => setLocation("/squad")}>
            <Users className="h-3 w-3 mr-1" /> My Squad
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white" onClick={() => setLocation("/teams")}>
            <LayoutGrid className="h-3 w-3 mr-1" /> All Teams
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-white/40 hover:text-white" onClick={() => setLocation("/history")}>
            History
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-red-400/60 hover:text-red-400" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 gap-5 overflow-y-auto">
          {state.currentPlayer ? (
            <>
              {/* Player Card */}
              <div className="w-full max-w-md">
                <PlayerCard
                  player={state.currentPlayer as Player}
                  currentBidder={state.currentBidder ?? null}
                  userTeam={userTeam}
                  teams={state.teams as Team[]}
                />
              </div>

              {/* Current Bid + Timer */}
              <div className="text-center space-y-3">
                {/* Bid amount */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Current Bid</div>
                  <div className="text-5xl md:text-6xl font-black font-mono tracking-tighter text-white">
                    ₹{state.currentBid?.toFixed(2)}
                    <span className="text-2xl text-white/30 ml-1">Cr</span>
                  </div>
                  {state.currentBidder && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="text-xs text-white/30">Leading:</span>
                      <span
                        className="text-sm font-black px-3 py-0.5 rounded-full"
                        style={{
                          backgroundColor: (state.teams?.find((t: Team) => t.id === state.currentBidder)?.color ?? "#666") + "25",
                          color: state.teams?.find((t: Team) => t.id === state.currentBidder)?.color ?? "#fff",
                          boxShadow: `0 0 10px ${(state.teams?.find((t: Team) => t.id === state.currentBidder)?.color ?? "#666")}30`,
                        }}
                      >
                        {state.currentBidder}
                      </span>
                      {isUserBidder && (
                        <span className="text-xs font-bold text-green-400 animate-pulse">(YOU)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Timer */}
                <div className="flex flex-col items-center gap-1.5">
                  <PhaseLabel timer={timer} hasBidder={!!state.currentBidder} />
                  <div
                    className={`text-3xl font-mono font-black transition-colors ${
                      timer <= 2 ? "text-red-400" : timer <= 3 ? "text-orange-400" : "text-white"
                    }`}
                  >
                    {String(timer).padStart(2, "0")}s
                  </div>
                  <div className="w-40 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        timer <= 2 ? "bg-red-500" : timer <= 3 ? "bg-orange-500" : "bg-yellow-400"
                      }`}
                      style={{ width: `${(timer / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bid Controls */}
              {isBidding && (
                <div className="w-full max-w-sm space-y-3">
                  <div className="text-center text-xs text-white/30">
                    Your Budget:{" "}
                    <span className="text-white font-mono font-bold">₹{userBudget.toFixed(2)} Cr</span>
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
                          className={`py-3 rounded-xl text-xs font-black border transition-all active:scale-95 ${
                            canBid && canAfford
                              ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/5 hover:bg-yellow-500/15 hover:border-yellow-500/50"
                              : "border-white/5 text-white/20 cursor-not-allowed"
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
                      className="flex-1 text-xs border-white/10 text-white/50 hover:text-white hover:border-white/20"
                      disabled={passPlayer.isPending}
                    >
                      <SkipForward className="h-3 w-3 mr-1" /> Pass
                    </Button>
                    <Button
                      onClick={handleNext}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs border-white/10 text-white/50 hover:text-white hover:border-white/20"
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
              <Loader2 className="h-10 w-10 animate-spin text-white/20 mx-auto" />
              <p className="text-white/30 text-sm">Preparing next player...</p>
            </div>
          )}
        </div>

        {/* SIDEBAR — Teams */}
        <div className="hidden md:flex w-60 border-l border-white/5 flex-col bg-black/40">
          <div className="p-3 border-b border-white/5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Teams</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {state.teams?.map((team: Team) => {
              const isUser = team.id === state.userTeamId;
              const isCurrent = team.id === state.currentBidder;
              const budgetPct = (team.budget / team.initialBudget) * 100;
              return (
                <div
                  key={team.id}
                  className={`px-3 py-2.5 border-b border-white/3 transition-all ${isCurrent ? "bg-white/3" : ""}`}
                  style={isUser ? { borderLeft: `2px solid ${team.color}` } : { borderLeft: "2px solid transparent" }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                      style={{ backgroundColor: team.color, boxShadow: isCurrent ? `0 0 8px ${team.color}` : "none" }}
                    >
                      {team.shortName.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white/70 truncate">
                          {team.shortName}
                          {isUser && <span className="ml-1 text-[9px] text-white/30">(YOU)</span>}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-black" style={{ color: team.color }}>
                            BID
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-white/30 font-mono">₹{team.budget.toFixed(1)}</span>
                        <span className="text-[10px] text-white/30 font-mono">
                          {team.players.length}/25
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${budgetPct}%`, backgroundColor: team.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* User summary */}
          {userTeam && (
            <div className="p-3 border-t border-white/5">
              <div className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: userTeam.color }}>
                {userTeam.shortName}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <div className="text-white/30">Budget</div>
                  <div className="font-mono font-bold text-white">₹{userTeam.budget.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-white/30">Players</div>
                  <div className="font-mono font-bold text-white">{userTeam.players.length}/25</div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs text-white/40 hover:text-white border border-white/5"
                onClick={() => setLocation("/squad")}
              >
                <Wallet className="h-3 w-3 mr-1" /> View Squad
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes soldPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
