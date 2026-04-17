import React from "react";
import { useGetTeams, useStartAuction, type Team } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Zap, Shield, Swords, Trophy, Settings, ChevronRight, Volume2 } from "lucide-react";

const DIFFICULTIES = [
  {
    id: "easy",
    label: "ROOKIE",
    desc: "AI bids slowly and gives up early",
    icon: Shield,
    color: "text-green-400",
    border: "border-green-500/40",
    bg: "bg-green-500/5",
    glow: "shadow-[0_0_15px_rgba(34,197,94,0.15)]",
  },
  {
    id: "medium",
    label: "PRO",
    desc: "Balanced bidding with realistic logic",
    icon: Trophy,
    color: "text-blue-400",
    border: "border-blue-500/40",
    bg: "bg-blue-500/5",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.15)]",
  },
  {
    id: "hard",
    label: "VETERAN",
    desc: "Smart targeting & squad-aware bidding",
    icon: Swords,
    color: "text-orange-400",
    border: "border-orange-500/40",
    bg: "bg-orange-500/5",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.15)]",
  },
  {
    id: "extreme",
    label: "EXTREME",
    desc: "Real IPL logic — saves budget, outbids you strategically",
    icon: Zap,
    color: "text-red-400",
    border: "border-red-500/40",
    bg: "bg-red-500/5",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
  },
];

const PLAYER_COUNT_OPTIONS = [
  { value: 100,  label: "100",   desc: "Top stars" },
  { value: 200,  label: "200",   desc: "Elite pool" },
  { value: 300,  label: "300",   desc: "Extended" },
  { value: 0,    label: "FULL",  desc: "All players" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: teams, isLoading: isLoadingTeams } = useGetTeams();
  const startAuction = useStartAuction();

  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [budget, setBudget] = React.useState<number>(100);
  const [difficulty, setDifficulty] = React.useState<"easy" | "medium" | "hard" | "extreme">("medium");
  const [playerCount, setPlayerCount] = React.useState<number>(0);

  const handleStart = () => {
    if (!selectedTeamId) return;
    startAuction.mutate(
      {
        data: {
          userTeamId: selectedTeamId,
          budget,
          difficulty,
          playerCount,
        } as any,
      },
      {
        onSuccess: () => setLocation("/auction"),
      }
    );
  };

  if (isLoadingTeams) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
      </div>
    );
  }

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
          <div className="flex items-center gap-3 text-white/20 text-xs font-mono">
            <Volume2 className="h-3.5 w-3.5" />
            <Settings className="h-4 w-4" />
            <span>Setup</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* LEFT — Franchise Selection + AI Difficulty */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">
                Select Your Franchise
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {teams?.map((team: Team) => {
                  const isSelected = selectedTeamId === team.id;
                  return (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`group relative flex flex-col items-center p-4 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? "border-white/20 scale-105"
                          : "border-white/5 hover:border-white/10 hover:scale-102"
                      }`}
                      style={{
                        backgroundColor: isSelected ? team.color + "18" : "rgba(255,255,255,0.02)",
                        boxShadow: isSelected ? `0 0 20px ${team.color}30` : "none",
                        borderColor: isSelected ? team.color + "60" : undefined,
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute top-2 right-2 w-2 h-2 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                      )}
                      <div
                        className="w-12 h-12 rounded-full mb-2 flex items-center justify-center text-xs font-black text-white shadow-lg"
                        style={{ backgroundColor: team.color }}
                      >
                        {team.shortName.slice(0, 3)}
                      </div>
                      <span className="text-[11px] font-bold text-center text-white/80 leading-tight">
                        {team.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Difficulty */}
            <div>
              <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4">
                AI Difficulty
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {DIFFICULTIES.map((d) => {
                  const Icon = d.icon;
                  const isSelected = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id as any)}
                      className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                        isSelected ? `${d.border} ${d.bg} ${d.glow}` : "border-white/5 hover:border-white/10 bg-white/2"
                      }`}
                    >
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSelected ? d.color : "text-white/30"}`} />
                      <div>
                        <div className={`text-sm font-black ${isSelected ? d.color : "text-white/60"}`}>
                          {d.label}
                        </div>
                        <div className="text-[11px] text-white/40 mt-0.5 leading-tight">{d.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — Settings Panel */}
          <div className="space-y-5">
            {/* Budget */}
            <Card className="border-white/5 bg-white/2 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-white/40">
                  Auction Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-black font-mono text-yellow-400">
                  ₹{budget}<span className="text-lg text-white/30 ml-1">Cr</span>
                </div>
                <Slider
                  value={[budget]}
                  onValueChange={(v) => setBudget(v[0])}
                  min={50}
                  max={200}
                  step={5}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-white/30 font-mono">
                  <span>₹50 Cr</span>
                  <span>₹200 Cr</span>
                </div>
              </CardContent>
            </Card>

            {/* Player Pool Size */}
            <Card className="border-white/5 bg-white/2 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-white/40">
                  Player Pool
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {PLAYER_COUNT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPlayerCount(opt.value)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-bold transition-all ${
                        playerCount === opt.value
                          ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                          : "border-white/5 text-white/50 hover:border-white/10"
                      }`}
                    >
                      <span>{opt.label} Players</span>
                      <span className="text-xs font-normal text-white/30">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Auction Speed Info */}
            <div className="flex items-center gap-3 px-4 py-3 border border-green-500/20 rounded-xl bg-green-500/5">
              <Zap className="h-4 w-4 text-green-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-green-400">FAST MODE</div>
                <div className="text-[10px] text-white/30">5s timer • 3s reset on bid</div>
              </div>
            </div>

            {/* Start Button */}
            <Button
              size="lg"
              className={`w-full h-14 text-base font-black uppercase tracking-widest rounded-xl transition-all duration-200 ${
                selectedTeamId
                  ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:from-yellow-300 hover:to-orange-400 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
              disabled={!selectedTeamId || startAuction.isPending}
              onClick={handleStart}
            >
              {startAuction.isPending ? (
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
              ) : (
                <ChevronRight className="h-5 w-5 mr-2" />
              )}
              ENTER AUCTION ROOM
            </Button>

            {!selectedTeamId && (
              <p className="text-center text-xs text-white/20">Select a franchise to continue</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 py-3">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <span className="text-[10px] text-white/15 uppercase tracking-widest">
            IPL Auction Simulator 2026
          </span>
          <span className="text-[10px] text-white/15 uppercase tracking-widest">
            Developed by Likith
          </span>
        </div>
      </div>
    </div>
  );
}
