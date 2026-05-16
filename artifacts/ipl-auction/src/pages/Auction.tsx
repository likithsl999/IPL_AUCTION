import React, { useEffect, useRef, useCallback, useState, useMemo, memo } from "react";
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
function playTone(freq: number, duration: number, volume = 0.15, type: OscillatorType = "sine") {
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

const playBidSound = () => {
  playTone(660, 0.08, 0.12, "sine");
  setTimeout(() => playTone(880, 0.1, 0.14, "sine"), 70);
};
const playSoldSound = () => {
  [440, 550, 660, 880].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.18, 0.2, "triangle"), i * 90);
  });
  setTimeout(() => playTone(1100, 0.3, 0.18, "sine"), 380);
};
const playTimerWarning = (isLast: boolean) => playTone(isLast ? 1320 : 990, 0.06, 0.12, "square");

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Batsman:       { bg: "bg-blue-500/10",   text: "text-blue-300",   border: "border-blue-500/20" },
  Bowler:        { bg: "bg-emerald-500/10",text: "text-emerald-300",border: "border-emerald-500/20" },
  "All-rounder": { bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/20" },
  Wicketkeeper:  { bg: "bg-amber-500/10",  text: "text-amber-300",  border: "border-amber-500/20" },
};

function getRatingConfig(rating: number) {
  if (rating >= 95) return { label: "LEGEND", color: "#ef4444", emoji: "🔥" };
  if (rating >= 90) return { label: "ELITE",  color: "#f97316", emoji: "⭐" };
  if (rating >= 85) return { label: "STAR",   color: "#eab308", emoji: "💫" };
  if (rating >= 80) return { label: "GREAT",  color: "#22c55e", emoji: "✅" };
  if (rating >= 75) return { label: "GOOD",   color: "#3b82f6", emoji: "💙" };
  return                   { label: "SOLID",  color: "#8b5cf6", emoji: "🟣" };
}

const BID_INCREMENTS = [0.2, 0.5, 1, 2, 5];

// ─── Sub-components (all memoized to prevent unnecessary re-renders) ──────────

const CircularTimer = memo(function CircularTimer({ timer, maxTimer = 5 }: { timer: number; maxTimer?: number }) {
  const pct = Math.max(0, timer / maxTimer);
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - pct);
  const color = timer <= 1 ? "#ef4444" : timer <= 2 ? "#f97316" : timer <= 3 ? "#eab308" : "#22c55e";
  return (
    <div className="relative flex items-center justify-center">
      <svg width={96} height={96} className="-rotate-90">
        <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={48} cy={48} r={r} fill="none" stroke={color}
          strokeWidth={6} strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black font-mono leading-none" style={{ color }}>{timer}</span>
        <span className="text-[8px] text-white/20 uppercase tracking-widest">sec</span>
      </div>
    </div>
  );
});

const RatingBadge = memo(function RatingBadge({ rating }: { rating: number }) {
  const cfg = getRatingConfig(rating);
  return (
    <div
      className="flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0"
      style={{
        background: `${cfg.color}18`,
        border: `1.5px solid ${cfg.color}30`,
      }}
    >
      <span className="text-xl font-black text-white leading-none">{rating}</span>
      <span className="text-[7px] font-black tracking-wider mt-0.5" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
});

const StatBar = memo(function StatBar({ label, value, color = "#3b82f6" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[9px] mb-1">
        <span className="text-white/30 uppercase tracking-wider">{label}</span>
        <span className="font-mono font-bold text-white/60">{value}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
});

const PlayerCard = memo(function PlayerCard({ player, accentColor }: {
  player: Player;
  accentColor: string;
}) {
  const rc = ROLE_COLORS[player.role] ?? ROLE_COLORS.Batsman;
  const strengths = useMemo(() => player.strengths?.split(",").slice(0, 3).map(s => s.trim()) ?? [], [player.strengths]);
  const weaknesses = useMemo(() => player.weaknesses?.split(",").slice(0, 2).map(w => w.trim()) ?? [], [player.weaknesses]);
  const ratingCfg = useMemo(() => getRatingConfig(player.skillRating), [player.skillRating]);

  return (
    <div
      className="relative border rounded-xl overflow-hidden w-full"
      style={{
        borderColor: `${accentColor}22`,
        background: "linear-gradient(145deg,rgba(255,255,255,0.03) 0%,rgba(0,0,0,0.4) 100%)",
      }}
    >
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg,${accentColor}80,transparent 70%)` }} />
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-2.5 mb-2.5">
          <RatingBadge rating={player.skillRating} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1.5 mb-0.5">
              <h2 className="text-base font-black uppercase tracking-tight text-white leading-none truncate">
                {player.name}
              </h2>
              <span className={`text-[9px] border px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${rc.bg} ${rc.text} ${rc.border}`}>
                {player.role}
              </span>
            </div>
            <p className="text-[9px] text-white/30 mt-0.5">
              {player.nationality} · Age {player.age} · {player.experience} seasons
            </p>
            <span className="text-[10px]">{ratingCfg.emoji}</span>
          </div>
        </div>

        {/* Stat bars */}
        <div className="space-y-1.5 mb-2.5">
          <StatBar label="Bat" value={player.battingRating} color="#3b82f6" />
          <StatBar label="Bowl" value={player.bowlingRating} color="#22c55e" />
          <StatBar label="Field" value={player.fieldingRating} color="#f59e0b" />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-1 mb-2.5">
          {[
            { v: player.strikeRate, l: "S/R" },
            { v: player.economy?.toFixed(1), l: "Eco" },
            { v: player.form, l: "Form", color: player.form >= 80 ? "#22c55e" : player.form >= 60 ? "#eab308" : "#ef4444" },
          ].map(({ v, l, color }) => (
            <div key={l} className="text-center p-1 rounded-lg bg-white/3 border border-white/5">
              <div className="text-[10px] font-mono font-bold text-white" style={color ? { color } : undefined}>{v}</div>
              <div className="text-[7px] text-white/20 uppercase tracking-wider">{l}</div>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {strengths.map(s => (
            <span key={s} className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">{s}</span>
          ))}
          {weaknesses.map(w => (
            <span key={w} className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/15">{w}</span>
          ))}
        </div>

        <div className="pt-2 border-t border-white/5 flex justify-between items-center">
          <div>
            <div className="text-[8px] text-white/20 uppercase tracking-wider">Base Price</div>
            <div className="font-mono font-black text-white text-sm">₹{player.basePrice} Cr</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] text-white/20 uppercase tracking-wider">Experience</div>
            <div className="font-mono font-bold text-white/50 text-xs">{player.experience} seasons</div>
          </div>
        </div>
      </div>
    </div>
  );
});

const PhaseLabel = memo(function PhaseLabel({ timer, hasBidder }: { timer: number; hasBidder: boolean }) {
  if (!hasBidder) return null;
  if (timer === 2) return <div className="text-yellow-400 font-black text-xs uppercase tracking-widest animate-pulse">GOING ONCE…</div>;
  if (timer === 1) return <div className="text-orange-400 font-black text-xs uppercase tracking-widest animate-pulse">GOING TWICE…</div>;
  if (timer === 0) return <div className="text-red-400 font-black text-sm uppercase tracking-widest">SOLD!</div>;
  return null;
});

const CommentaryLine = memo(function CommentaryLine({ text, index }: { text: string; index: number }) {
  const opacity = Math.max(0.2, 1 - index * 0.14);
  return (
    <div
      className="text-[10px] py-0.5 leading-relaxed"
      style={{ opacity, color: index === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)" }}
    >
      {text}
    </div>
  );
});

const TeamBudgetChip = memo(function TeamBudgetChip({ team, isUser, isBidding }: { team: Team; isUser: boolean; isBidding: boolean }) {
  const pct = (team.budget / team.initialBudget) * 100;
  return (
    <div
      className="flex-shrink-0 flex flex-col gap-0.5 px-2 py-1 rounded-lg border transition-colors"
      style={{
        borderColor: isBidding ? `${team.color}60` : "rgba(255,255,255,0.06)",
        background: isBidding ? `${team.color}12` : "rgba(255,255,255,0.02)",
        minWidth: 48,
      }}
    >
      <div className="flex items-center justify-between gap-0.5">
        <span className="text-[8px] font-black" style={{ color: isUser ? team.color : "rgba(255,255,255,0.5)" }}>
          {team.shortName}{isUser && <span className="text-[6px] opacity-50 ml-0.5">★</span>}
        </span>
        {isBidding && <span className="text-[6px] font-black" style={{ color: team.color }}>▲</span>}
      </div>
      <div className="text-[8px] font-mono text-white/40">₹{team.budget.toFixed(0)}</div>
      <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: team.color }} />
      </div>
    </div>
  );
});

const TeamSidebarItem = memo(function TeamSidebarItem({ team, isUser, isCurrent }: { team: Team; isUser: boolean; isCurrent: boolean }) {
  const budgetPct = (team.budget / team.initialBudget) * 100;
  const roleCount = useMemo(() => team.players.reduce((acc: Record<string, number>, p: Player) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1; return acc;
  }, {}), [team.players]);

  return (
    <div
      className={`px-2 py-1.5 border-b border-white/3 ${isCurrent ? "bg-white/3" : ""}`}
      style={{ borderLeft: `2px solid ${isUser ? team.color : "transparent"}` }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black text-white flex-shrink-0" style={{ backgroundColor: team.color }}>
          {team.shortName.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-white/70 truncate">
              {team.shortName}{isUser && <span className="text-[7px] text-white/25 ml-0.5"> YOU</span>}
            </span>
            {isCurrent && <span className="text-[7px] font-black animate-pulse" style={{ color: team.color }}>BID</span>}
          </div>
          <div className="flex justify-between text-[8px] text-white/25 font-mono">
            <span>₹{team.budget.toFixed(0)}</span>
            <span>{team.players.length}/25</span>
          </div>
        </div>
      </div>
      <div className="h-0.5 bg-white/5 rounded-full overflow-hidden mb-1">
        <div className="h-full rounded-full" style={{ width: `${budgetPct}%`, backgroundColor: team.color }} />
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
});

// ─── Main Auction Component ───────────────────────────────────────────────────
export default function Auction() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [commentary, setCommentary] = useState<string[]>([]);
  const prevBidRef = useRef(0);
  const prevBidderRef = useRef<string | null>(null);
  const prevPlayerRef = useRef<string | null>(null);
  const prevStatusRef = useRef("");
  const prevTimerRef = useRef(99);

  const { data: state, isLoading } = useGetAuctionState({
    query: {
      queryKey: getGetAuctionStateQueryKey(),
      refetchInterval: 950,
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

  // AI bid trigger
  useEffect(() => {
    if (state?.status === "bidding" && state?.started) {
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
      aiIntervalRef.current = setInterval(() => {
        triggerAiBid.mutate(undefined, { onSettled: invalidate });
      }, 1200);
    } else {
      if (aiIntervalRef.current) { clearInterval(aiIntervalRef.current); aiIntervalRef.current = null; }
    }
    return () => { if (aiIntervalRef.current) clearInterval(aiIntervalRef.current); };
  }, [state?.status, state?.started]);

  // Commentary tracker
  useEffect(() => {
    if (!state) return;
    const newLines: string[] = [];
    if (state.currentPlayer?.name && state.currentPlayer.name !== prevPlayerRef.current) {
      const rc = getRatingConfig(state.currentPlayer.skillRating ?? 70);
      newLines.push(`${rc.emoji} ${state.currentPlayer.name} up for auction! Base ₹${state.currentPlayer.basePrice} Cr`);
      prevPlayerRef.current = state.currentPlayer.name;
      prevBidRef.current = state.currentBid ?? 0;
      prevBidderRef.current = null;
    }
    const bid = state.currentBid ?? 0;
    if (bid > prevBidRef.current && state.currentBidder) {
      const team = state.teams?.find((t: Team) => t.id === state.currentBidder);
      if (state.currentBidder === state.userTeamId) {
        newLines.push(`💰 YOU raise to ₹${bid.toFixed(2)} Cr!`);
      } else if (state.currentBidder !== prevBidderRef.current) {
        newLines.push(`🔥 ${team?.shortName ?? state.currentBidder} enters at ₹${bid.toFixed(2)} Cr!`);
      } else {
        newLines.push(`📈 ${team?.shortName ?? state.currentBidder} → ₹${bid.toFixed(2)} Cr`);
      }
      prevBidRef.current = bid;
      prevBidderRef.current = state.currentBidder;
    }
    if (state.status === "sold" && prevStatusRef.current !== "sold") {
      const team = state.teams?.find((t: Team) => t.id === state.currentBidder);
      if (state.currentBidder) {
        newLines.push(`🏆 SOLD! ${state.currentPlayer?.name} → ${team?.shortName ?? state.currentBidder} ₹${bid.toFixed(2)} Cr`);
      } else {
        newLines.push(`❌ ${state.currentPlayer?.name} goes UNSOLD`);
      }
    }
    if (newLines.length > 0) setCommentary(prev => [...newLines, ...prev].slice(0, 12));
    prevStatusRef.current = state.status ?? "";
  }, [state?.currentBid, state?.currentBidder, state?.currentPlayer?.name, state?.status]);

  // Sound effects
  useEffect(() => {
    if (!soundEnabled || !state) return;
    const bid = state.currentBid ?? 0;
    if (bid > prevBidRef.current && bid > 0 && state.status === "bidding") playBidSound();
    if (state.status === "sold" && prevStatusRef.current !== "sold") playSoldSound();
    if (prevTimerRef.current !== state.timer) {
      if (state.timer === 2 && prevTimerRef.current > 2) playTimerWarning(false);
      if (state.timer === 1 && prevTimerRef.current > 1) playTimerWarning(true);
      prevTimerRef.current = state.timer ?? 99;
    }
  }, [state?.currentBid, state?.status, state?.timer, soundEnabled]);

  // ─── Memoized derived values ───────────────────────────────────────────────
  const userTeam = useMemo(() => state?.teams?.find((t: Team) => t.id === state.userTeamId), [state?.teams, state?.userTeamId]);
  const soldTeam = useMemo(() => state?.teams?.find((t: Team) => t.id === state?.currentBidder), [state?.teams, state?.currentBidder]);
  const currentBidderTeam = soldTeam; // same reference
  const progress = useMemo(() => {
    if (!state?.totalPlayers) return 0;
    return ((state.playerIndex ?? 0) / state.totalPlayers) * 100;
  }, [state?.playerIndex, state?.totalPlayers]);
  const isFinished = state?.status === "finished";
  const isBidding = state?.status === "bidding";
  const isUserBidder = state?.currentBidder === state?.userTeamId;
  const userBudget = userTeam?.budget ?? 0;
  const currentBid = state?.currentBid ?? 0;
  const timer = state?.timer ?? 0;
  const canBid = useMemo(() =>
    isBidding && userBudget > currentBid + 0.1 && (userTeam?.players?.length ?? 0) < 25,
    [isBidding, userBudget, currentBid, userTeam?.players?.length]
  );
  const nextBid = useMemo(() => parseFloat((currentBid + 0.5).toFixed(2)), [currentBid]);
  const accentColor = useMemo(() => currentBidderTeam?.color ?? userTeam?.color ?? "#3b82f6", [currentBidderTeam?.color, userTeam?.color]);

  // ─── Memoized handlers ─────────────────────────────────────────────────────
  const handleBid = useCallback((increment: number) => {
    if (!state?.userTeamId || !state?.currentPlayer) return;
    const amt = parseFloat(((state.currentBid ?? 0) + increment).toFixed(2));
    placeBid.mutate({ data: { teamId: state.userTeamId, amount: amt } }, { onSettled: invalidate });
  }, [state?.userTeamId, state?.currentPlayer, state?.currentBid, placeBid, invalidate]);

  const handleBidDefault = useCallback(() => handleBid(0.5), [handleBid]);
  const handleNext = useCallback(() => nextPlayer.mutate(undefined, { onSettled: invalidate }), [nextPlayer, invalidate]);
  const handlePass = useCallback(() => passPlayer.mutate(undefined, { onSettled: invalidate }), [passPlayer, invalidate]);
  const handleReset = useCallback(() => {
    resetAuction.mutate(undefined, { onSuccess: () => { invalidate(); setLocation("/"); } });
  }, [resetAuction, invalidate, setLocation]);
  const toggleSound = useCallback(() => setSoundEnabled(s => !s), []);

  // ─── Memoized BID increment buttons (don't change each render) ─────────────
  const bidIncrementButtons = useMemo(() => BID_INCREMENTS.map(inc => {
    const bid = currentBid + inc;
    const ok = canBid && bid <= userBudget;
    return (
      <button
        key={inc} onClick={() => handleBid(inc)} disabled={!ok}
        className={`py-2 rounded-xl text-[9px] font-black border transition-colors ${ok ? "border-yellow-500/25 text-yellow-400 bg-yellow-500/5 hover:bg-yellow-500/10" : "border-white/5 text-white/10 cursor-not-allowed"}`}
      >
        +{inc}
      </button>
    );
  }), [currentBid, canBid, userBudget, handleBid]);

  // ─── Loading / not started ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    );
  }
  if (!state?.started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] gap-4">
        <p className="text-white/40 text-sm">No auction in progress.</p>
        <Button onClick={() => setLocation("/")} className="bg-yellow-400 text-black font-bold">Go to Setup</Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">

      {/* ── SOLD ANIMATION OVERLAY ──────────────────────────────────────────── */}
      {state.soldAnimation && state.status === "sold" && soldTeam && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
          style={{ backgroundColor: `${soldTeam.color}0e` }}>
          <div className="text-[80px] md:text-[120px] font-black uppercase tracking-tighter leading-none"
            style={{ color: soldTeam.color, animation: "soldPop 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}>
            SOLD!
          </div>
          <div className="text-2xl md:text-4xl font-black text-white mt-2 text-center px-4 max-w-xs truncate">
            {state.currentPlayer?.name}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="px-5 py-1.5 rounded-full font-black text-white text-lg"
              style={{ backgroundColor: soldTeam.color }}>
              {soldTeam.shortName}
            </div>
            <span className="text-3xl font-mono font-black text-white">₹{currentBid.toFixed(2)} Cr</span>
          </div>
        </div>
      )}

      {/* ── FINISHED STATE ──────────────────────────────────────────────────── */}
      {isFinished && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 gap-4 px-4 overflow-y-auto py-8">
          <Trophy className="h-16 w-16 text-yellow-400" />
          <h2 className="text-4xl font-black uppercase tracking-tighter bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent text-center">
            Auction Complete
          </h2>
          <div className="text-white/40 text-sm text-center">
            <p>{state.playerIndex} players processed</p>
            {userTeam && (
              <p className="text-base font-bold text-white mt-1">
                {userTeam.name} — {userTeam.players.length} players · ₹{userTeam.budget.toFixed(2)} Cr left
              </p>
            )}
          </div>
          <div className="border border-yellow-500/20 rounded-xl p-4 text-center bg-yellow-500/5 max-w-xs w-full">
            <div className="text-yellow-400 font-black mb-1">Ready to play the season?</div>
            <div className="text-white/30 text-xs mb-3">Simulate IPL 2026 — see who wins the title</div>
            <Button onClick={() => setLocation("/season")}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black rounded-xl">
              <Zap className="h-4 w-4 mr-2" /> Simulate Season
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { label: "My Squad", icon: <Users className="h-3 w-3" />, path: "/squad" },
              { label: "All Teams", icon: <LayoutGrid className="h-3 w-3" />, path: "/teams" },
              { label: "Analytics", icon: <BarChart3 className="h-3 w-3" />, path: "/analytics" },
              { label: "History", icon: null, path: "/history" },
            ].map(({ label, icon, path }) => (
              <Button key={path} onClick={() => setLocation(path)} variant="outline" className="border-white/10 text-white text-xs">
                {icon && <span className="mr-1">{icon}</span>}{label}
              </Button>
            ))}
            <Button onClick={handleReset} variant="ghost" className="text-red-400 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>
        </div>
      )}

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/5 bg-[#0a0a0a]">
        <div className="px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest hidden sm:block">IPL 2026</span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-0.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                  style={{ width: `${progress}%`, transition: "width 0.5s ease" }} />
              </div>
              <span className="text-[8px] text-white/20 font-mono">{state.playerIndex}/{state.totalPlayers}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
            <button onClick={toggleSound} className="p-1.5 text-white/25 hover:text-white/60 transition-colors shrink-0">
              {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </button>
            {[
              { label: "Squad", icon: <Users className="h-2.5 w-2.5" />, path: "/squad" },
              { label: "Teams", icon: <LayoutGrid className="h-2.5 w-2.5" />, path: "/teams" },
              { label: "Stats", icon: <BarChart3 className="h-2.5 w-2.5" />, path: "/analytics", cls: "text-cyan-400/50 hover:text-cyan-400" },
            ].map(({ label, icon, path, cls }) => (
              <Button key={path} variant="ghost" size="sm"
                className={`text-[9px] px-1.5 h-6 shrink-0 ${cls ?? "text-white/25 hover:text-white"}`}
                onClick={() => setLocation(path)}>
                {icon}<span className="ml-0.5 hidden sm:inline">{label}</span>
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="text-[9px] px-1.5 h-6 text-red-400/40 hover:text-red-400 shrink-0" onClick={handleReset}>
              <RotateCcw className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
        {/* Team budget chips row */}
        <div className="px-2 pb-1.5 flex gap-1 overflow-x-auto scrollbar-none">
          {state.teams?.map((team: Team) => (
            <TeamBudgetChip key={team.id} team={team} isUser={team.id === state.userTeamId} isBidding={team.id === state.currentBidder} />
          ))}
        </div>
      </div>

      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT: Teams sidebar (large screens only) */}
        <div className="hidden lg:flex w-44 border-r border-white/5 flex-col bg-[#0a0a0a] shrink-0">
          <div className="px-2.5 py-1.5 border-b border-white/5">
            <span className="text-[8px] uppercase tracking-widest font-bold text-white/20">Teams</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {state.teams?.map((team: Team) => (
              <TeamSidebarItem
                key={team.id}
                team={team}
                isUser={team.id === state.userTeamId}
                isCurrent={team.id === state.currentBidder}
              />
            ))}
          </div>
          {userTeam && (
            <div className="p-2 border-t border-white/5 shrink-0">
              <Button size="sm" variant="ghost"
                className="w-full text-[9px] text-white/25 hover:text-white border border-white/5 py-1 h-auto"
                onClick={() => setLocation("/squad")}>
                <Wallet className="h-2.5 w-2.5 mr-1" /> Squad ({userTeam.players.length})
              </Button>
            </div>
          )}
        </div>

        {/* CENTER: Player card + bid display + commentary */}
        <div className="flex-1 flex flex-col overflow-y-auto min-w-0 p-2.5 gap-2.5">
          {state.currentPlayer ? (
            <>
              <div className="w-full max-w-sm mx-auto">
                <PlayerCard
                  player={state.currentPlayer as Player}
                  accentColor={accentColor}
                />
              </div>

              {/* Current bid */}
              <div className="w-full max-w-sm mx-auto text-center">
                <div className="text-[8px] uppercase tracking-widest text-white/20 mb-0.5">Current Bid</div>
                <div className="text-4xl font-black font-mono tracking-tighter text-white">
                  ₹{currentBid.toFixed(2)}<span className="text-lg text-white/25 ml-1">Cr</span>
                </div>
                {currentBidderTeam ? (
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="text-[9px] text-white/25">Leading:</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background: `${currentBidderTeam.color}18`, color: currentBidderTeam.color }}>
                      {currentBidderTeam.shortName}
                    </span>
                    {isUserBidder && <span className="text-[9px] font-black text-emerald-400">YOU ✓</span>}
                  </div>
                ) : (
                  <div className="mt-1 text-[9px] text-white/20">No bids yet — be the first!</div>
                )}
              </div>

              {/* Mobile bid controls */}
              {isBidding && (
                <div className="w-full max-w-sm mx-auto space-y-2 md:hidden">
                  <div className="text-center text-[9px] text-white/25">
                    Budget: <span className="text-white font-mono font-bold">₹{userBudget.toFixed(2)} Cr</span>
                  </div>
                  <button onClick={handleBidDefault} disabled={!canBid || nextBid > userBudget}
                    className="w-full py-3 rounded-2xl font-black text-base uppercase tracking-widest transition-colors active:scale-95 disabled:cursor-not-allowed"
                    style={{
                      background: canBid && nextBid <= userBudget ? "linear-gradient(135deg,#eab308,#f97316)" : "rgba(255,255,255,0.05)",
                      color: canBid && nextBid <= userBudget ? "#000" : "rgba(255,255,255,0.2)",
                    }}>
                    BID ₹{nextBid.toFixed(2)} Cr
                  </button>
                  <div className="grid grid-cols-5 gap-1">{bidIncrementButtons}</div>
                  <div className="flex gap-2">
                    <Button onClick={handlePass} variant="outline" size="sm"
                      className="flex-1 text-xs border-white/10 text-white/40" disabled={passPlayer.isPending}>
                      <SkipForward className="h-3 w-3 mr-1" /> Pass
                    </Button>
                    <Button onClick={handleNext} variant="outline" size="sm"
                      className="flex-1 text-xs border-white/10 text-white/40" disabled={nextPlayer.isPending}>
                      <ChevronRight className="h-3 w-3 mr-1" />
                      {state.currentBidder ? "Sell" : "Unsold"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Commentary */}
              {commentary.length > 0 && (
                <div className="w-full max-w-sm mx-auto">
                  <div className="text-[7px] uppercase tracking-widest text-white/15 mb-1 font-bold">Live Commentary</div>
                  <div className="border border-white/5 rounded-xl p-2 bg-white/[0.02] max-h-28 overflow-y-auto space-y-0.5">
                    {commentary.map((line, i) => <CommentaryLine key={i} text={line} index={i} />)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-white/15" />
              <p className="text-white/20 text-sm">Preparing next player…</p>
            </div>
          )}
        </div>

        {/* RIGHT: Timer + bid controls (desktop) */}
        <div className="hidden md:flex w-48 border-l border-white/5 flex-col items-center p-2.5 gap-2 bg-[#0a0a0a] shrink-0 overflow-y-auto">
          {state.currentPlayer && isBidding ? (
            <>
              <div className="flex flex-col items-center gap-0.5">
                <CircularTimer timer={timer} />
                <PhaseLabel timer={timer} hasBidder={!!state.currentBidder} />
              </div>

              <div className="w-full text-center py-1.5 rounded-xl border border-white/5 bg-white/[0.02]">
                <div className="text-[8px] text-white/20 uppercase tracking-wider">Budget</div>
                <div className="font-mono font-black text-white text-sm">₹{userBudget.toFixed(2)} Cr</div>
              </div>

              <button onClick={handleBidDefault} disabled={!canBid || nextBid > userBudget}
                className="w-full py-3.5 rounded-xl font-black text-lg uppercase tracking-widest transition-colors active:scale-95 disabled:cursor-not-allowed"
                style={{
                  background: canBid && nextBid <= userBudget ? "linear-gradient(135deg,#eab308 0%,#f97316 100%)" : "rgba(255,255,255,0.04)",
                  color: canBid && nextBid <= userBudget ? "#000" : "rgba(255,255,255,0.12)",
                }}>
                {canBid && nextBid <= userBudget ? (
                  <><span className="block text-xs font-black leading-none">BID</span>₹{nextBid.toFixed(2)} Cr</>
                ) : "CAN'T BID"}
              </button>

              <div className="grid grid-cols-3 gap-1 w-full">{bidIncrementButtons}</div>

              <div className="flex flex-col gap-1 w-full mt-auto">
                <Button onClick={handlePass} variant="outline" size="sm"
                  className="w-full text-[9px] border-white/8 text-white/30 hover:text-white" disabled={passPlayer.isPending}>
                  <SkipForward className="h-3 w-3 mr-1" /> Pass
                </Button>
                <Button onClick={handleNext} variant="outline" size="sm"
                  className="w-full text-[9px] border-white/8 text-white/30 hover:text-white" disabled={nextPlayer.isPending}>
                  <ChevronRight className="h-3 w-3 mr-1" />
                  {state.currentBidder ? "Sell Now" : "Unsold"}
                </Button>
                <Button variant="ghost" size="sm"
                  className="w-full text-[8px] text-white/15 hover:text-white/50 border border-white/5"
                  onClick={() => setLocation("/teams")}>
                  <LayoutGrid className="h-2.5 w-2.5 mr-1" /> All Teams
                </Button>
              </div>
            </>
          ) : state.currentPlayer && !isBidding ? (
            <div className="flex items-center justify-center flex-1 text-white/15 text-xs text-center">
              {state.status === "sold" ? "Sold! Next up…" : "Starting…"}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/3 px-3 py-1 flex items-center justify-between bg-[#0a0a0a]">
        <span className="text-[8px] text-white/10 uppercase tracking-widest">IPL Auction Simulator 2026</span>
        <span className="text-[8px] text-white/10">Developed by <span className="text-yellow-400/30 font-bold">Likith</span></span>
      </div>

      <style>{`
        @keyframes soldPop {
          0%   { transform: scale(0.7) rotate(-2deg); opacity:0; }
          60%  { transform: scale(1.06) rotate(1deg); }
          100% { transform: scale(1) rotate(0deg); opacity:1; }
        }
      `}</style>
    </div>
  );
}
