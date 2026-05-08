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
import { Loader2, Trophy, Users, Wallet, ChevronRight, RotateCcw, SkipForward, LayoutGrid, Zap, Volume2, VolumeX, BarChart3 } from "lucide-react";

// ─── Web Audio Sound Effects ──────────────────────────────────────────────────
function playTone(freq: number, duration: number, volume = 0.2, type: OscillatorType = "sine") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
    setTimeout(() => ctx.close(), (duration + 0.2) * 1000);
  } catch { /* Web Audio not available */ }
}

function playBidSound() {
  playTone(660, 0.08, 0.15, "sine");
  setTimeout(() => playTone(880, 0.1, 0.18, "sine"), 70);
}

function playSoldSound() {
  [440, 550, 660, 880].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 0.25, "triangle"), i * 90);
  });
  setTimeout(() => playTone(1100, 0.35, 0.22, "sine"), 380);
}

function playTimerWarning(isLastSecond: boolean) {
  playTone(isLastSecond ? 1320 : 990, 0.07, 0.14, "square");
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  Batsman:       { bg: "bg-blue-500/10",   text: "text-blue-300",   border: "border-blue-500/30",   glow: "#3b82f6" },
  Bowler:        { bg: "bg-green-500/10",  text: "text-green-300",  border: "border-green-500/30",  glow: "#22c55e" },
  "All-rounder": { bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/30", glow: "#a855f7" },
  Wicketkeeper:  { bg: "bg-amber-500/10",  text: "text-amber-300",  border: "border-amber-500/30",  glow: "#f59e0b" },
};

function getRatingConfig(rating: number) {
  if (rating >= 95) return { label: "LEGEND", color: "#ef4444", glow: "#ef444466", emoji: "🔥" };
  if (rating >= 90) return { label: "ELITE",  color: "#f97316", glow: "#f9731666", emoji: "⭐" };
  if (rating >= 85) return { label: "STAR",   color: "#eab308", glow: "#eab30866", emoji: "💫" };
  if (rating >= 80) return { label: "GREAT",  color: "#22c55e", glow: "#22c55e66", emoji: "✅" };
  if (rating >= 75) return { label: "GOOD",   color: "#3b82f6", glow: "#3b82f666", emoji: "💙" };
  return { label: "SOLID", color: "#8b5cf6", glow: "#8b5cf666", emoji: "🟣" };
}

const BID_INCREMENTS = [0.2, 0.5, 1, 2, 5];

// ─── Circular Timer ───────────────────────────────────────────────────────────
function CircularTimer({ timer, maxTimer = 5 }: { timer: number; maxTimer?: number }) {
  const pct = Math.max(0, timer / maxTimer);
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - pct);
  const color = timer <= 1 ? "#ef4444" : timer <= 2 ? "#f97316" : timer <= 3 ? "#eab308" : "#22c55e";

  return (
    <div className="relative flex items-center justify-center">
      <svg width={108} height={108} className="-rotate-90" style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}>
        <circle cx={54} cy={54} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={7} />
        <circle
          cx={54} cy={54} r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black font-mono leading-none" style={{ color }}>{timer}</span>
        <span className="text-[9px] text-white/25 uppercase tracking-widest mt-0.5">sec</span>
      </div>
    </div>
  );
}

// ─── Rating Badge ─────────────────────────────────────────────────────────────
function RatingBadge({ rating }: { rating: number }) {
  const cfg = getRatingConfig(rating);
  return (
    <div
      className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}08)`,
        border: `1.5px solid ${cfg.color}40`,
        boxShadow: `0 0 18px ${cfg.glow}`,
      }}
    >
      <span className="text-2xl font-black text-white leading-none">{rating}</span>
      <span className="text-[8px] font-black tracking-wider mt-0.5" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, color = "#3b82f6" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[9px] mb-1">
        <span className="text-white/35 uppercase tracking-wider">{label}</span>
        <span className="font-mono font-bold text-white/70">{value}</span>
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

// ─── Enhanced Player Card ─────────────────────────────────────────────────────
function PlayerCard({ player, currentBidder, userTeam, teams }: {
  player: Player;
  currentBidder: string | null;
  userTeam?: Team;
  teams: Team[];
}) {
  const rc = ROLE_COLORS[player.role] || ROLE_COLORS.Batsman;
  const bidTeam = teams.find(t => t.id === currentBidder);
  const accentColor = bidTeam?.color || userTeam?.color || rc.glow;
  const strengths = player.strengths ? player.strengths.split(",").slice(0, 4) : [];
  const weaknesses = player.weaknesses ? player.weaknesses.split(",").slice(0, 2) : [];
  const ratingCfg = getRatingConfig(player.skillRating);

  return (
    <div
      className="relative border rounded-2xl overflow-hidden w-full"
      style={{
        borderColor: accentColor + "28",
        background: `linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.5) 100%)`,
        backdropFilter: "blur(12px)",
        boxShadow: `0 4px 40px ${accentColor}12`,
      }}
    >
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent 60%)` }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <RatingBadge rating={player.skillRating} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-black uppercase tracking-tight text-white leading-none truncate">
                {player.name}
              </h2>
              <span className={`text-[10px] border px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${rc.bg} ${rc.text} ${rc.border}`}>
                {player.role}
              </span>
            </div>
            <p className="text-[10px] text-white/35 mt-1">
              {player.nationality} • Age {player.age} • {player.experience} IPL seasons
            </p>
            {/* Rating tier emoji */}
            <span className="text-xs">{ratingCfg.emoji} <span className="text-white/40 text-[10px]">{ratingCfg.label}</span></span>
          </div>
        </div>

        {/* Stat bars */}
        <div className="space-y-1.5 mb-3">
          <StatBar label="Batting" value={player.battingRating} color="#3b82f6" />
          <StatBar label="Bowling" value={player.bowlingRating} color="#22c55e" />
          <StatBar label="Fielding" value={player.fieldingRating} color="#f59e0b" />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="text-center p-1.5 rounded-lg bg-white/3 border border-white/5">
            <div className="text-[11px] font-mono font-bold text-white">{player.strikeRate}</div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider">S/R</div>
          </div>
          <div className="text-center p-1.5 rounded-lg bg-white/3 border border-white/5">
            <div className="text-[11px] font-mono font-bold text-white">{player.economy?.toFixed(1)}</div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider">Eco</div>
          </div>
          <div className="text-center p-1.5 rounded-lg bg-white/3 border border-white/5">
            <div className={`text-[11px] font-mono font-bold ${player.form >= 80 ? "text-green-400" : player.form >= 60 ? "text-yellow-400" : "text-red-400"}`}>
              {player.form >= 80 ? "🔥" : player.form >= 60 ? "⚡" : "❄️"} {player.form}
            </div>
            <div className="text-[8px] text-white/25 uppercase tracking-wider">Form</div>
          </div>
        </div>

        {/* Strength / weakness tags */}
        {strengths.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {strengths.map(s => (
              <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/15">
                {s.trim()}
              </span>
            ))}
          </div>
        )}
        {weaknesses.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {weaknesses.map(w => (
              <span key={w} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/15">
                {w.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Base price */}
        <div className="pt-2 border-t border-white/5 flex justify-between items-center">
          <div>
            <div className="text-[9px] text-white/25 uppercase tracking-wider">Base Price</div>
            <div className="font-mono font-black text-white text-sm">₹{player.basePrice} Cr</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-white/25 uppercase tracking-wider">Experience</div>
            <div className="font-mono font-bold text-white/70 text-xs">{player.experience} seasons</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phase Label ──────────────────────────────────────────────────────────────
function PhaseLabel({ timer, hasBidder }: { timer: number; hasBidder: boolean }) {
  if (!hasBidder) return null;
  if (timer === 2) return <div className="text-yellow-400 font-black text-sm uppercase tracking-widest animate-pulse">GOING ONCE…</div>;
  if (timer === 1) return <div className="text-orange-400 font-black text-sm uppercase tracking-widest animate-pulse">GOING TWICE…</div>;
  if (timer === 0) return <div className="text-red-400 font-black text-base uppercase tracking-widest animate-bounce">SOLD!</div>;
  return null;
}

// ─── Commentary Line ──────────────────────────────────────────────────────────
function CommentaryLine({ text, index }: { text: string; index: number }) {
  const opacity = Math.max(0.25, 1 - index * 0.12);
  return (
    <div
      className="text-[10px] py-1 border-b border-white/3 last:border-0 transition-all duration-300"
      style={{ opacity, color: index === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)" }}
    >
      {text}
    </div>
  );
}

// ─── Team Budget Chip ─────────────────────────────────────────────────────────
function TeamBudgetChip({ team, isUser, isBidding }: { team: Team; isUser: boolean; isBidding: boolean }) {
  const pct = (team.budget / team.initialBudget) * 100;
  return (
    <div
      className="flex-shrink-0 flex flex-col gap-0.5 px-2 py-1 rounded-lg border transition-all"
      style={{
        borderColor: isBidding ? team.color + "80" : "rgba(255,255,255,0.06)",
        background: isBidding ? team.color + "15" : "rgba(255,255,255,0.02)",
        boxShadow: isBidding ? `0 0 10px ${team.color}30` : "none",
        minWidth: 52,
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className="text-[9px] font-black"
          style={{ color: isUser ? team.color : "rgba(255,255,255,0.55)" }}
        >
          {team.shortName}
          {isUser && <span className="text-[7px] opacity-60 ml-0.5">★</span>}
        </span>
        {isBidding && <span className="text-[7px] font-black" style={{ color: team.color }}>BID</span>}
      </div>
      <div className="text-[9px] font-mono text-white/50">₹{team.budget.toFixed(0)}</div>
      <div className="h-0.5 bg-white/5 rounded-full overflow-hidden w-full">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: team.color }}
        />
      </div>
    </div>
  );
}

// ─── Main Auction Component ───────────────────────────────────────────────────
export default function Auction() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [commentary, setCommentary] = useState<string[]>([]);
  const prevBidRef = useRef<number>(0);
  const prevBidderRef = useRef<string | null>(null);
  const prevPlayerRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string>("");
  const prevTimerRef = useRef<number>(99);

  const { data: state, isLoading } = useGetAuctionState({
    query: {
      queryKey: getGetAuctionStateQueryKey(),
      refetchInterval: 700,
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

  // Trigger AI bids every 1.1s during bidding
  useEffect(() => {
    if (state?.status === "bidding" && state?.started) {
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = setInterval(() => {
        triggerAiBid.mutate(undefined, { onSettled: invalidate });
      }, 1100);
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

  // Commentary tracker — fires on bid/player/status changes
  useEffect(() => {
    if (!state) return;
    const newLines: string[] = [];

    // New player up for auction
    if (state.currentPlayer?.name && state.currentPlayer.name !== prevPlayerRef.current) {
      const rc = getRatingConfig(state.currentPlayer.skillRating ?? 70);
      newLines.push(`${rc.emoji} ${state.currentPlayer.name} is up for auction! Base ₹${state.currentPlayer.basePrice} Cr`);
      prevPlayerRef.current = state.currentPlayer.name;
      prevBidRef.current = state.currentBid ?? 0;
      prevBidderRef.current = null;
    }

    // Bid changed
    const bid = state.currentBid ?? 0;
    if (bid > prevBidRef.current && state.currentBidder) {
      const team = state.teams?.find((t: Team) => t.id === state.currentBidder);
      const teamName = team?.name || state.currentBidder;
      if (state.currentBidder === state.userTeamId) {
        newLines.push(`💰 YOU raise to ₹${bid.toFixed(2)} Cr — you lead the bid!`);
      } else if (state.currentBidder !== prevBidderRef.current) {
        newLines.push(`🔥 ${teamName} enters at ₹${bid.toFixed(2)} Cr!`);
      } else {
        newLines.push(`📈 ${teamName} increases to ₹${bid.toFixed(2)} Cr`);
      }
      prevBidRef.current = bid;
      prevBidderRef.current = state.currentBidder;
    }

    // Sold
    if (state.status === "sold" && prevStatusRef.current !== "sold" && state.currentBidder) {
      const team = state.teams?.find((t: Team) => t.id === state.currentBidder);
      newLines.push(`🏆 SOLD! ${state.currentPlayer?.name} → ${team?.name || state.currentBidder} for ₹${bid.toFixed(2)} Cr!`);
    }

    // Unsold
    if (state.status === "sold" && !state.currentBidder && prevStatusRef.current !== "sold") {
      newLines.push(`❌ ${state.currentPlayer?.name} goes UNSOLD`);
    }

    if (newLines.length > 0) {
      setCommentary(prev => [...newLines, ...prev].slice(0, 14));
    }
    prevStatusRef.current = state.status ?? "";
  }, [state?.currentBid, state?.currentBidder, state?.currentPlayer?.name, state?.status]);

  // Sound effects
  useEffect(() => {
    if (!soundEnabled || !state) return;
    const bid = state.currentBid ?? 0;
    const status = state.status ?? "";
    const timer = state.timer ?? 0;

    if (bid > prevBidRef.current && bid > 0 && status === "bidding") {
      playBidSound();
    }
    if (status === "sold" && prevStatusRef.current !== "sold") {
      playSoldSound();
    }
    if (prevTimerRef.current !== timer) {
      if (timer === 2 && prevTimerRef.current > 2) playTimerWarning(false);
      if (timer === 1 && prevTimerRef.current > 1) playTimerWarning(true);
    }
    prevTimerRef.current = timer;
  }, [state?.currentBid, state?.status, state?.timer, soundEnabled]);

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

  const soldTeam = state.teams?.find((t: Team) => t.id === state.currentBidder);
  const userTeam = state.teams?.find((t: Team) => t.id === state.userTeamId);
  const progress = state.totalPlayers > 0 ? (state.playerIndex / state.totalPlayers) * 100 : 0;
  const isFinished = state.status === "finished";
  const isBidding = state.status === "bidding";
  const isUserBidder = state.currentBidder === state.userTeamId;
  const userBudget = userTeam?.budget ?? 0;
  const canBid = isBidding && userBudget > (state.currentBid || 0) + 0.1 && (userTeam?.players?.length ?? 0) < 25;
  const timer = state.timer ?? 0;
  const currentBid = state.currentBid ?? 0;
  const defaultInc = BID_INCREMENTS[1]; // 0.5 Cr default for big button
  const nextBid = parseFloat((currentBid + defaultInc).toFixed(2));
  const showSoldOverlay = state.soldAnimation && state.status === "sold";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden">

      {/* ── SOLD ANIMATION OVERLAY ────────────────────────────────────────── */}
      {showSoldOverlay && soldTeam && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
          style={{ backgroundColor: soldTeam.color + "12", backdropFilter: "blur(6px)" }}
        >
          <div
            className="text-[100px] md:text-[140px] font-black uppercase tracking-tighter leading-none"
            style={{
              color: soldTeam.color,
              textShadow: `0 0 80px ${soldTeam.color}, 0 0 160px ${soldTeam.color}80`,
              animation: "soldPop 0.35s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            SOLD!
          </div>
          <div className="text-3xl md:text-5xl font-black text-white mt-2 text-center px-4">
            {state.currentPlayer?.name}
          </div>
          <div className="mt-5 flex items-center gap-4">
            <div
              className="px-6 py-2 rounded-full font-black text-white text-xl"
              style={{ backgroundColor: soldTeam.color, boxShadow: `0 0 30px ${soldTeam.color}` }}
            >
              {soldTeam.shortName}
            </div>
            <span className="text-4xl font-mono font-black text-white">
              ₹{currentBid.toFixed(2)} Cr
            </span>
          </div>
        </div>
      )}

      {/* ── FINISHED STATE ────────────────────────────────────────────────── */}
      {isFinished && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/96 backdrop-blur-sm gap-5 px-4">
          <Trophy className="h-20 w-20 text-yellow-400" style={{ filter: "drop-shadow(0 0 20px rgba(251,191,36,0.6))" }} />
          <h2 className="text-5xl font-black uppercase tracking-tighter bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent text-center">
            Auction Complete
          </h2>
          <div className="flex flex-col items-center gap-1 text-white/40 text-sm">
            <p>{state.playerIndex} players processed</p>
            {userTeam && (
              <p className="text-lg font-bold text-white">
                {userTeam.name} — {userTeam.players.length} players — ₹{userTeam.budget.toFixed(2)} Cr left
              </p>
            )}
          </div>
          <div className="border border-yellow-500/20 rounded-2xl p-5 text-center bg-yellow-500/5 max-w-sm w-full">
            <div className="text-yellow-400 font-black text-lg mb-1">Ready to play the season?</div>
            <div className="text-white/40 text-xs mb-4">Simulate all IPL matches, see standings & find the champion</div>
            <Button
              onClick={() => setLocation("/season")}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black rounded-xl"
            >
              <Zap className="h-4 w-4 mr-2" /> Simulate Season 2026
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => setLocation("/squad")} variant="outline" className="border-white/10 text-white text-sm">
              <Users className="h-3 w-3 mr-1" /> My Squad
            </Button>
            <Button onClick={() => setLocation("/teams")} variant="outline" className="border-white/10 text-white text-sm">
              All Teams
            </Button>
            <Button onClick={() => setLocation("/analytics")} variant="outline" className="border-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/10">
              <BarChart3 className="h-3 w-3 mr-1" /> Analytics
            </Button>
            <Button onClick={() => setLocation("/history")} variant="outline" className="border-white/10 text-white text-sm">
              History
            </Button>
            <Button onClick={handleReset} variant="ghost" className="text-red-400 text-sm">
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>
        </div>
      )}

      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur-md">
        {/* Row 1: Logo, progress, nav */}
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div>
              <span className="text-[10px] font-black text-white/25 uppercase tracking-widest">IPL AUCTION</span>
              <span className="text-[9px] text-yellow-400/60 ml-1.5 font-bold">2026</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-24 h-0.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                  style={{ width: `${progress}%`, transition: "width 0.6s ease" }}
                />
              </div>
              <span className="text-[9px] text-white/25 font-mono">{state.playerIndex}/{state.totalPlayers}</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setSoundEnabled(s => !s)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 transition-colors"
              title={soundEnabled ? "Mute" : "Unmute"}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <Button variant="ghost" size="sm" className="text-[10px] text-white/30 hover:text-white px-2" onClick={() => setLocation("/squad")}>
              <Users className="h-3 w-3 mr-1" /> Squad
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] text-white/30 hover:text-white px-2" onClick={() => setLocation("/teams")}>
              <LayoutGrid className="h-3 w-3 mr-1" /> Teams
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] text-cyan-400/50 hover:text-cyan-400 px-2" onClick={() => setLocation("/analytics")}>
              <BarChart3 className="h-3 w-3 mr-1" /> Stats
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] text-white/30 hover:text-white px-2" onClick={() => setLocation("/history")}>
              History
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] text-red-400/50 hover:text-red-400 px-2" onClick={handleReset}>
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* Row 2: All team budget chips */}
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
          {state.teams?.map((team: Team) => (
            <TeamBudgetChip
              key={team.id}
              team={team}
              isUser={team.id === state.userTeamId}
              isBidding={team.id === state.currentBidder}
            />
          ))}
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Teams sidebar */}
        <div className="hidden lg:flex w-48 border-r border-white/5 flex-col bg-[#0a0a0a]/60 flex-shrink-0">
          <div className="p-2.5 border-b border-white/5">
            <span className="text-[9px] uppercase tracking-widest font-bold text-white/25">Franchises</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {state.teams?.map((team: Team) => {
              const isUser = team.id === state.userTeamId;
              const isCurrent = team.id === state.currentBidder;
              const budgetPct = (team.budget / team.initialBudget) * 100;
              const roleCount = team.players.reduce(
                (acc: Record<string, number>, p: Player) => {
                  acc[p.role] = (acc[p.role] || 0) + 1;
                  return acc;
                },
                {}
              );

              return (
                <div
                  key={team.id}
                  className={`px-2.5 py-2 border-b border-white/3 transition-all ${isCurrent ? "bg-white/3" : ""}`}
                  style={{ borderLeft: `2px solid ${isUser ? team.color : "transparent"}` }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white flex-shrink-0"
                      style={{
                        backgroundColor: team.color,
                        boxShadow: isCurrent ? `0 0 8px ${team.color}` : "none",
                      }}
                    >
                      {team.shortName.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-white/70 truncate">
                          {team.shortName}
                          {isUser && <span className="text-[8px] text-white/25 ml-0.5">YOU</span>}
                        </span>
                        {isCurrent && (
                          <span className="text-[8px] font-black animate-pulse" style={{ color: team.color }}>
                            BIDDING
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-[9px] text-white/30 font-mono">
                        <span>₹{team.budget.toFixed(0)}Cr</span>
                        <span>{team.players.length}/25</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-0.5 bg-white/5 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${budgetPct}%`, backgroundColor: team.color }}
                    />
                  </div>
                  {team.players.length > 0 && (
                    <div className="flex gap-1 text-[7px] text-white/20">
                      {roleCount["Batsman"] > 0 && <span>BAT:{roleCount["Batsman"]}</span>}
                      {roleCount["Bowler"] > 0 && <span>BWL:{roleCount["Bowler"]}</span>}
                      {roleCount["All-rounder"] > 0 && <span>AR:{roleCount["All-rounder"]}</span>}
                      {roleCount["Wicketkeeper"] > 0 && <span>WK:{roleCount["Wicketkeeper"]}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* User squad shortcut */}
          {userTeam && (
            <div className="p-2.5 border-t border-white/5">
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-[10px] text-white/30 hover:text-white border border-white/5 py-1 h-auto"
                onClick={() => setLocation("/squad")}
              >
                <Wallet className="h-3 w-3 mr-1" /> My Squad ({userTeam.players.length})
              </Button>
            </div>
          )}
        </div>

        {/* CENTER: Player card + bid display + commentary */}
        <div className="flex-1 flex flex-col items-center p-3 gap-3 overflow-y-auto min-w-0">
          {state.currentPlayer ? (
            <>
              {/* Player card */}
              <div className="w-full max-w-sm">
                <PlayerCard
                  player={state.currentPlayer as Player}
                  currentBidder={state.currentBidder ?? null}
                  userTeam={userTeam}
                  teams={state.teams as Team[]}
                />
              </div>

              {/* Current bid display */}
              <div className="w-full max-w-sm text-center">
                <div className="text-[9px] uppercase tracking-widest text-white/25 mb-0.5">Current Bid</div>
                <div className="text-4xl md:text-5xl font-black font-mono tracking-tighter text-white">
                  ₹{currentBid.toFixed(2)}
                  <span className="text-xl text-white/30 ml-1">Cr</span>
                </div>
                {state.currentBidder ? (
                  <div className="mt-1.5 flex items-center justify-center gap-2">
                    <span className="text-[10px] text-white/30">Leading:</span>
                    <span
                      className="text-xs font-black px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: (state.teams?.find((t: Team) => t.id === state.currentBidder)?.color ?? "#666") + "22",
                        color: state.teams?.find((t: Team) => t.id === state.currentBidder)?.color ?? "#fff",
                        boxShadow: `0 0 10px ${(state.teams?.find((t: Team) => t.id === state.currentBidder)?.color ?? "#666")}30`,
                      }}
                    >
                      {state.currentBidder}
                    </span>
                    {isUserBidder && (
                      <span className="text-[10px] font-black text-green-400 animate-pulse">YOU ✓</span>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-[10px] text-white/25">No bids yet — be the first!</div>
                )}
              </div>

              {/* Mobile BID controls */}
              {isBidding && (
                <div className="w-full max-w-sm space-y-2 md:hidden">
                  <div className="text-center text-[10px] text-white/30">
                    Budget: <span className="text-white font-mono font-bold">₹{userBudget.toFixed(2)} Cr</span>
                  </div>
                  <button
                    onClick={() => handleBid(defaultInc)}
                    disabled={!canBid || nextBid > userBudget}
                    className="w-full py-3 rounded-2xl font-black text-lg uppercase tracking-widest transition-all active:scale-95"
                    style={{
                      background: canBid && nextBid <= userBudget
                        ? "linear-gradient(135deg, #eab308, #f97316)"
                        : "rgba(255,255,255,0.05)",
                      color: canBid && nextBid <= userBudget ? "#000" : "rgba(255,255,255,0.2)",
                      boxShadow: canBid && nextBid <= userBudget ? "0 0 25px rgba(234,179,8,0.4)" : "none",
                    }}
                  >
                    BID ₹{nextBid.toFixed(2)} Cr
                  </button>
                  <div className="grid grid-cols-5 gap-1.5">
                    {BID_INCREMENTS.map(inc => {
                      const bid = currentBid + inc;
                      const ok = canBid && bid <= userBudget;
                      return (
                        <button
                          key={inc}
                          onClick={() => handleBid(inc)}
                          disabled={!ok}
                          className={`py-2 rounded-xl text-[10px] font-black border transition-all active:scale-95 ${ok ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/5 hover:bg-yellow-500/15" : "border-white/5 text-white/15 cursor-not-allowed"}`}
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
                      className="flex-1 text-xs border-white/10 text-white/40"
                      disabled={passPlayer.isPending}
                    >
                      <SkipForward className="h-3 w-3 mr-1" /> Pass
                    </Button>
                    <Button
                      onClick={handleNext}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs border-white/10 text-white/40"
                      disabled={nextPlayer.isPending}
                    >
                      <ChevronRight className="h-3 w-3 mr-1" />
                      {state.currentBidder ? "Sell Now" : "Unsold"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Commentary feed */}
              {commentary.length > 0 && (
                <div className="w-full max-w-sm">
                  <div className="text-[8px] uppercase tracking-widest text-white/20 mb-1.5 font-bold">Live Commentary</div>
                  <div className="border border-white/5 rounded-xl p-2 bg-white/2 max-h-32 overflow-y-auto">
                    {commentary.map((line, i) => (
                      <CommentaryLine key={i} text={line} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-white/15" />
              <p className="text-white/25 text-sm">Preparing next player...</p>
            </div>
          )}
        </div>

        {/* RIGHT: Circular timer + bid controls (desktop) */}
        <div className="hidden md:flex w-52 border-l border-white/5 flex-col items-center p-3 gap-3 bg-[#0a0a0a]/60 flex-shrink-0 overflow-y-auto">
          {state.currentPlayer && isBidding && (
            <>
              {/* Timer */}
              <div className="flex flex-col items-center gap-1">
                <CircularTimer timer={timer} maxTimer={5} />
                <PhaseLabel timer={timer} hasBidder={!!state.currentBidder} />
              </div>

              {/* Budget */}
              <div className="w-full text-center py-2 rounded-xl border border-white/5 bg-white/2">
                <div className="text-[9px] text-white/25 uppercase tracking-wider">Your Budget</div>
                <div className="font-mono font-black text-white text-sm">₹{userBudget.toFixed(2)} Cr</div>
              </div>

              {/* Main BID button */}
              <button
                onClick={() => handleBid(defaultInc)}
                disabled={!canBid || nextBid > userBudget}
                className="w-full py-4 rounded-2xl font-black text-xl uppercase tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed"
                style={{
                  background: canBid && nextBid <= userBudget
                    ? "linear-gradient(135deg, #eab308 0%, #f97316 100%)"
                    : "rgba(255,255,255,0.04)",
                  color: canBid && nextBid <= userBudget ? "#000" : "rgba(255,255,255,0.15)",
                  boxShadow: canBid && nextBid <= userBudget
                    ? "0 0 30px rgba(234,179,8,0.45), 0 4px 20px rgba(249,115,22,0.3)"
                    : "none",
                }}
              >
                {canBid && nextBid <= userBudget ? (
                  <>
                    BID<br />
                    <span className="text-sm font-black">₹{nextBid.toFixed(2)} Cr</span>
                  </>
                ) : (
                  "CAN'T BID"
                )}
              </button>

              {/* Increment buttons */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {[0.2, 0.5, 1, 2, 5].map(inc => {
                  const bid = currentBid + inc;
                  const ok = canBid && bid <= userBudget;
                  return (
                    <button
                      key={inc}
                      onClick={() => handleBid(inc)}
                      disabled={!ok}
                      className={`py-2.5 rounded-xl text-[10px] font-black border transition-all active:scale-95 ${
                        ok
                          ? "border-yellow-500/25 text-yellow-400 bg-yellow-500/5 hover:bg-yellow-500/12 hover:border-yellow-500/40"
                          : "border-white/5 text-white/12 cursor-not-allowed"
                      }`}
                    >
                      +{inc}
                    </button>
                  );
                })}
              </div>

              {/* Pass / Sell Now */}
              <div className="flex flex-col gap-1.5 w-full">
                <Button
                  onClick={handlePass}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-white/8 text-white/35 hover:text-white hover:border-white/20"
                  disabled={passPlayer.isPending}
                >
                  <SkipForward className="h-3 w-3 mr-1" /> Pass
                </Button>
                <Button
                  onClick={handleNext}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-white/8 text-white/35 hover:text-white hover:border-white/20"
                  disabled={nextPlayer.isPending}
                >
                  <ChevronRight className="h-3 w-3 mr-1" />
                  {state.currentBidder ? "Sell Now" : "Mark Unsold"}
                </Button>
              </div>

              {/* To All Teams dashboard */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[10px] text-white/20 hover:text-white/60 border border-white/5 mt-auto"
                onClick={() => setLocation("/teams")}
              >
                <LayoutGrid className="h-3 w-3 mr-1" /> All Teams Dashboard
              </Button>
            </>
          )}

          {/* Non-bidding state */}
          {state.currentPlayer && !isBidding && (
            <div className="flex flex-col items-center gap-3 flex-1 justify-center">
              <div className="text-white/20 text-xs text-center">
                {state.status === "sold" ? "Player sold! Next up shortly..." : "Starting..."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/3 px-4 py-1.5 flex items-center justify-between bg-[#0a0a0a]">
        <span className="text-[9px] text-white/15 font-mono uppercase tracking-widest">IPL Auction Simulator 2026</span>
        <span className="text-[9px] text-white/15">Developed by <span className="text-yellow-400/40 font-bold">Likith</span></span>
      </div>

      <style>{`
        @keyframes soldPop {
          0%   { transform: scale(0.6) rotate(-3deg); opacity: 0; }
          60%  { transform: scale(1.08) rotate(1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
