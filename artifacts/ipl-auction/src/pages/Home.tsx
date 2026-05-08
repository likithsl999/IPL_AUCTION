import React, { useEffect } from "react";
import { useGetTeams, useStartAuction, type Team } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Loader2, Zap, Shield, Swords, Trophy, ChevronRight,
  Eye, Target, BarChart3, BookOpen, Save, Upload,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFFICULTIES = [
  { id: "easy",    label: "ROOKIE",   desc: "AI bids slowly and gives up early",                        icon: Shield,  color: "text-green-400",  border: "border-green-500/40",  bg: "bg-green-500/5",  glow: "shadow-[0_0_15px_rgba(34,197,94,0.15)]" },
  { id: "medium",  label: "PRO",      desc: "Balanced bidding with realistic logic",                     icon: Trophy,  color: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/5",   glow: "shadow-[0_0_15px_rgba(59,130,246,0.15)]" },
  { id: "hard",    label: "VETERAN",  desc: "Smart targeting & squad-aware bidding",                    icon: Swords,  color: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/5", glow: "shadow-[0_0_15px_rgba(249,115,22,0.15)]" },
  { id: "extreme", label: "EXTREME",  desc: "Real IPL logic — saves budget, outbids you strategically", icon: Zap,     color: "text-red-400",    border: "border-red-500/40",    bg: "bg-red-500/5",    glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]" },
];

const PLAYER_COUNT_OPTIONS = [
  { value: 100, label: "100",  desc: "Top stars" },
  { value: 200, label: "200",  desc: "Elite pool" },
  { value: 300, label: "300",  desc: "Extended" },
  { value: 0,   label: "FULL", desc: "All players" },
];

type GameMode = "standard" | "watch" | "challenge";

const CHALLENGE_MODES = [
  { id: "low_budget",  label: "Low Budget",    desc: "Only ₹60 Cr — build a squad on a shoestring",      emoji: "💸", budget: 60  },
  { id: "youth_only",  label: "Youth Focus",   desc: "₹80 Cr — prioritise players under 26",              emoji: "🌟", budget: 80  },
  { id: "underdog",   label: "Underdog",       desc: "₹70 Cr — weakest team, maximum difficulty",         emoji: "🔥", budget: 70  },
];

const SAVE_KEY = "ipl_auction_saves";

interface SaveSlot {
  label: string;
  teamId: string;
  teamName: string;
  budget: number;
  difficulty: string;
  playerCount: number;
  savedAt: string;
}

function loadSaves(): (SaveSlot | null)[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return [null, null, null];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [null, null, null];
  } catch {
    return [null, null, null];
  }
}

function persistSaves(saves: (SaveSlot | null)[]) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [, setLocation] = useLocation();
  const { data: teams, isLoading: isLoadingTeams } = useGetTeams();
  const startAuction = useStartAuction();

  const [gameMode,        setGameMode]        = React.useState<GameMode>("standard");
  const [selectedTeamId,  setSelectedTeamId]  = React.useState<string | null>(null);
  const [budget,          setBudget]          = React.useState<number>(100);
  const [difficulty,      setDifficulty]      = React.useState<"easy" | "medium" | "hard" | "extreme">("medium");
  const [playerCount,     setPlayerCount]     = React.useState<number>(0);
  const [challengeId,     setChallengeId]     = React.useState<string>("low_budget");
  const [showSaves,       setShowSaves]       = React.useState(false);
  const [saves,           setSaves]           = React.useState<(SaveSlot | null)[]>([null, null, null]);

  useEffect(() => {
    setSaves(loadSaves());
  }, []);

  // Apply challenge preset when switching to challenge mode
  useEffect(() => {
    if (gameMode === "challenge") {
      const ch = CHALLENGE_MODES.find(c => c.id === challengeId);
      if (ch) setBudget(ch.budget);
      if (challengeId === "underdog") setDifficulty("extreme");
    }
  }, [gameMode, challengeId]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSave = (slot: number) => {
    if (!selectedTeamId || !teams) return;
    const team = (teams as Team[]).find((t: Team) => t.id === selectedTeamId);
    const newSave: SaveSlot = {
      label: `Slot ${slot + 1}`,
      teamId: selectedTeamId,
      teamName: team?.name ?? selectedTeamId,
      budget,
      difficulty,
      playerCount,
      savedAt: new Date().toLocaleString(),
    };
    const updated = [...saves];
    updated[slot] = newSave;
    setSaves(updated);
    persistSaves(updated);
  };

  const handleLoad = (slot: number) => {
    const save = saves[slot];
    if (!save) return;
    setSelectedTeamId(save.teamId);
    setBudget(save.budget);
    setDifficulty(save.difficulty as any);
    setPlayerCount(save.playerCount);
    setShowSaves(false);
  };

  const handleStart = () => {
    if (gameMode === "watch") {
      // AI Watch mode — no user team, all AI
      startAuction.mutate(
        { data: { userTeamId: "WATCH_MODE", budget: 100, difficulty, playerCount } as any },
        { onSuccess: () => setLocation("/auction") }
      );
      return;
    }
    if (!selectedTeamId) return;

    const activeBudget = gameMode === "challenge"
      ? (CHALLENGE_MODES.find(c => c.id === challengeId)?.budget ?? budget)
      : budget;

    startAuction.mutate(
      { data: { userTeamId: selectedTeamId, budget: activeBudget, difficulty, playerCount } as any },
      { onSuccess: () => setLocation("/auction") }
    );
  };

  if (isLoadingTeams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
      </div>
    );
  }

  const canStart = gameMode === "watch" || (selectedTeamId !== null);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              IPL AUCTION
            </h1>
            <p className="text-xs text-white/30 uppercase tracking-widest mt-0.5">2026 Mega Auction Simulator</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLocation("/analytics")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cyan-400/60 hover:text-cyan-400 border border-cyan-500/10 hover:border-cyan-500/30 transition-all">
              <BarChart3 className="h-3 w-3" /> Analytics
            </button>
            <button onClick={() => setLocation("/season")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-purple-400/60 hover:text-purple-400 border border-purple-500/10 hover:border-purple-500/30 transition-all">
              <BookOpen className="h-3 w-3" /> Career
            </button>
            <button onClick={() => setShowSaves(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all">
              <Save className="h-3 w-3" /> Saves
            </button>
          </div>
        </div>
      </div>

      {/* Save Slots Panel */}
      {showSaves && (
        <div className="border-b border-white/5 bg-white/2 backdrop-blur">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Save className="h-3 w-3 text-white/40" />
              <span className="text-xs uppercase tracking-wider text-white/40">Save Slots</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {saves.map((save, i) => (
                <div key={i} className="border border-white/10 rounded-xl p-3 bg-white/3">
                  {save ? (
                    <>
                      <div className="text-xs font-bold text-white/80 mb-1">{save.teamName}</div>
                      <div className="text-[10px] text-white/30 mb-2">
                        ₹{save.budget}Cr · {save.difficulty.toUpperCase()} · {save.savedAt}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleLoad(i)}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] text-green-400 border border-green-500/20 rounded-lg py-1 hover:bg-green-500/10 transition-all">
                          <Upload className="h-3 w-3" /> Load
                        </button>
                        <button onClick={() => handleSave(i)}
                          className="flex-1 flex items-center justify-center gap-1 text-[10px] text-white/40 border border-white/10 rounded-lg py-1 hover:bg-white/5 transition-all">
                          <Save className="h-3 w-3" /> Overwrite
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-white/20 mb-2">Empty Slot {i + 1}</div>
                      <button onClick={() => handleSave(i)}
                        disabled={!selectedTeamId}
                        className="w-full flex items-center justify-center gap-1 text-[10px] text-yellow-400/60 border border-yellow-500/20 rounded-lg py-1.5 hover:bg-yellow-500/10 transition-all disabled:opacity-30">
                        <Save className="h-3 w-3" /> Save Current
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">

        {/* ── GAME MODE SELECTOR ─────────────────────────────────────────── */}
        <div className="mb-6">
          <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-3">Game Mode</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "standard",  label: "Standard Auction",   desc: "Pick your team and bid",              icon: Trophy,  color: "text-yellow-400", border: "border-yellow-500/40", bg: "bg-yellow-500/5"  },
              { id: "watch",     label: "AI Watch Mode",      desc: "Sit back — all 10 teams are AI",      icon: Eye,     color: "text-cyan-400",   border: "border-cyan-500/40",   bg: "bg-cyan-500/5"    },
              { id: "challenge", label: "Challenge Mode",     desc: "Tough constraints, maximum glory",    icon: Target,  color: "text-red-400",    border: "border-red-500/40",    bg: "bg-red-500/5"     },
            ].map(m => (
              <button key={m.id} onClick={() => setGameMode(m.id as GameMode)}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                  gameMode === m.id ? `${m.border} ${m.bg}` : "border-white/5 hover:border-white/10 bg-white/2"
                }`}>
                <m.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${gameMode === m.id ? m.color : "text-white/20"}`} />
                <div>
                  <div className={`text-sm font-black ${gameMode === m.id ? m.color : "text-white/50"}`}>{m.label}</div>
                  <div className="text-[11px] text-white/30 mt-0.5 leading-tight">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── CHALLENGE MODE OPTIONS ─────────────────────────────────────── */}
        {gameMode === "challenge" && (
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-3">Choose Challenge</h2>
            <div className="grid grid-cols-3 gap-3">
              {CHALLENGE_MODES.map(ch => (
                <button key={ch.id} onClick={() => setChallengeId(ch.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    challengeId === ch.id ? "border-red-500/40 bg-red-500/10" : "border-white/5 bg-white/2 hover:border-white/10"
                  }`}>
                  <div className="text-2xl mb-2">{ch.emoji}</div>
                  <div className={`text-sm font-black ${challengeId === ch.id ? "text-red-400" : "text-white/60"}`}>{ch.label}</div>
                  <div className="text-[11px] text-white/30 mt-1 leading-tight">{ch.desc}</div>
                  <div className="mt-2 text-xs font-bold text-yellow-400/60">Budget: ₹{ch.budget} Cr</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── AI WATCH INFO ──────────────────────────────────────────────── */}
        {gameMode === "watch" && (
          <div className="mb-6 border border-cyan-500/20 bg-cyan-500/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-cyan-400">AI Watch Mode</p>
                <p className="text-xs text-white/40 mt-0.5">
                  All 10 IPL franchises will bid autonomously. Watch the auction unfold and see who builds the strongest squad.
                  You can still set difficulty below.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* LEFT — Franchise + Difficulty */}
          <div className="lg:col-span-2 space-y-6">
            {/* Franchise Selection (not needed in Watch mode) */}
            {gameMode !== "watch" && (
              <div>
                <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">
                  Select Your Franchise
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {(teams as Team[])?.map((team: Team) => {
                    const isSelected = selectedTeamId === team.id;
                    return (
                      <button key={team.id} onClick={() => setSelectedTeamId(team.id)}
                        className={`group relative flex flex-col items-center p-4 rounded-xl border transition-all duration-200 ${
                          isSelected ? "border-white/20 scale-105" : "border-white/5 hover:border-white/10"
                        }`}
                        style={{
                          backgroundColor: isSelected ? team.color + "18" : "rgba(255,255,255,0.02)",
                          boxShadow: isSelected ? `0 0 20px ${team.color}30` : "none",
                          borderColor: isSelected ? team.color + "60" : undefined,
                        }}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                        )}
                        <div className="w-12 h-12 rounded-full mb-2 flex items-center justify-center text-xs font-black text-white shadow-lg"
                          style={{ backgroundColor: team.color }}>
                          {team.shortName.slice(0, 3)}
                        </div>
                        <span className="text-[11px] font-bold text-center text-white/80 leading-tight">{team.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Difficulty */}
            <div>
              <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">AI Difficulty</h2>
              <div className="grid grid-cols-2 gap-3">
                {DIFFICULTIES.map((d) => {
                  const Icon = d.icon;
                  const isSelected = difficulty === d.id;
                  return (
                    <button key={d.id} onClick={() => setDifficulty(d.id as any)}
                      className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                        isSelected ? `${d.border} ${d.bg} ${d.glow}` : "border-white/5 hover:border-white/10 bg-white/2"
                      }`}>
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSelected ? d.color : "text-white/30"}`} />
                      <div>
                        <div className={`text-sm font-black ${isSelected ? d.color : "text-white/60"}`}>{d.label}</div>
                        <div className="text-[11px] text-white/40 mt-0.5 leading-tight">{d.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — Settings */}
          <div className="space-y-5">
            {/* Budget (hidden in challenge mode — preset) */}
            {gameMode !== "challenge" ? (
              <Card className="border-white/5 bg-white/2 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-widest text-white/40">Auction Budget</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-black font-mono text-yellow-400">
                    ₹{budget}<span className="text-lg text-white/30 ml-1">Cr</span>
                  </div>
                  <Slider value={[budget]} onValueChange={v => setBudget(v[0])}
                    min={50} max={200} step={5} className="py-2" />
                  <div className="flex justify-between text-xs text-white/30 font-mono">
                    <span>₹50 Cr</span><span>₹200 Cr</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="border border-red-500/20 bg-red-500/10 rounded-xl p-4">
                <p className="text-xs text-red-400/60 uppercase tracking-wider mb-1">Challenge Budget</p>
                <p className="text-4xl font-black text-red-400">
                  ₹{CHALLENGE_MODES.find(c => c.id === challengeId)?.budget ?? 60}
                  <span className="text-lg text-white/30 ml-1">Cr</span>
                </p>
                <p className="text-xs text-white/30 mt-2">Fixed for this challenge — make every rupee count.</p>
              </div>
            )}

            {/* Player Pool */}
            <Card className="border-white/5 bg-white/2 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-white/40">Player Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {PLAYER_COUNT_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setPlayerCount(opt.value)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-bold transition-all ${
                        playerCount === opt.value
                          ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                          : "border-white/5 text-white/50 hover:border-white/10"
                      }`}>
                      <span>{opt.label} Players</span>
                      <span className="text-xs font-normal text-white/30">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fast Mode Badge */}
            <div className="flex items-center gap-3 px-4 py-3 border border-green-500/20 rounded-xl bg-green-500/5">
              <Zap className="h-4 w-4 text-green-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-green-400">FAST MODE</div>
                <div className="text-[10px] text-white/30">5s timer · 3s reset on bid · Panic mode active</div>
              </div>
            </div>

            {/* Start Button */}
            <Button size="lg"
              className={`w-full h-14 text-base font-black uppercase tracking-widest rounded-xl transition-all duration-200 ${
                canStart
                  ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:from-yellow-300 hover:to-orange-400 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
              disabled={!canStart || startAuction.isPending}
              onClick={handleStart}
            >
              {startAuction.isPending ? (
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
              ) : gameMode === "watch" ? (
                <><Eye className="h-5 w-5 mr-2" /> WATCH AUCTION</>
              ) : gameMode === "challenge" ? (
                <><Target className="h-5 w-5 mr-2" /> ACCEPT CHALLENGE</>
              ) : (
                <><ChevronRight className="h-5 w-5 mr-2" /> ENTER AUCTION ROOM</>
              )}
            </Button>

            {!canStart && gameMode !== "watch" && (
              <p className="text-center text-xs text-white/20">Select a franchise to continue</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <span className="text-[10px] text-white/15 uppercase tracking-widest">IPL Auction Simulator 2026</span>
          <span className="text-[10px] text-white/15 uppercase tracking-widest">Developed by Likith</span>
        </div>
      </div>
    </div>
  );
}
