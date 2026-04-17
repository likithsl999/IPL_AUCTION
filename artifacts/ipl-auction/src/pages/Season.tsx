import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Trophy, Zap, Users, TrendingUp, TrendingDown,
  Star, Target, Play, ChevronRight, Award
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

async function fetchCareerState() {
  const r = await fetch(`${API_BASE}/career/state`);
  if (!r.ok) throw new Error("Failed to load career state");
  return r.json();
}
async function postSimulate() {
  const r = await fetch(`${API_BASE}/career/simulate`, { method: "POST" });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: "Server error" }));
    throw new Error(err.error || "Simulation failed");
  }
  return r.json();
}
async function postNextSeason() {
  const r = await fetch(`${API_BASE}/career/next-season`, { method: "POST" });
  return r.json();
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  league: "League",
  qualifier1: "Qualifier 1",
  qualifier2: "Qualifier 2",
  eliminator: "Eliminator",
  final: "FINAL",
};

export default function Season() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [activeTab, setActiveTab] = useState<"standings" | "matches" | "playoffs">("standings");

  const { data: careerData, isLoading } = useQuery({
    queryKey: ["career-state"],
    queryFn: fetchCareerState,
    refetchInterval: false,
  });

  const simulateMut = useMutation({
    mutationFn: postSimulate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-state"] });
    },
  });

  const nextSeasonMut = useMutation({
    mutationFn: postNextSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-state"] });
    },
  });

  const result = careerData?.result;
  const seasonNumber = careerData?.seasonNumber ?? 1;
  const simulated = careerData?.simulated ?? false;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-3 bg-black/80 sticky top-0 z-10">
        <Button
          variant="ghost" size="sm"
          className="text-white/40 hover:text-white"
          onClick={() => setLocation("/auction")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" />
          <span className="text-xs font-black text-white/40 uppercase tracking-widest">
            IPL Season {seasonNumber} — 2026
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Champion Banner (if simulated) */}
        {simulated && result?.champion && (
          <div
            className="relative mb-6 rounded-2xl overflow-hidden border"
            style={{
              borderColor: result.championColor + "40",
              background: `linear-gradient(135deg, ${result.championColor}12, transparent)`,
              boxShadow: `0 0 40px ${result.championColor}20`,
            }}
          >
            <div className="p-6 text-center">
              <div className="text-yellow-400 text-3xl mb-2">🏆</div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                IPL Season {seasonNumber} Champion
              </div>
              <div
                className="text-4xl font-black"
                style={{ color: result.championColor, filter: `drop-shadow(0 0 20px ${result.championColor}60)` }}
              >
                {result.champion}
              </div>
            </div>
          </div>
        )}

        {/* Not started state */}
        {!simulated && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-6 text-4xl">
              🏏
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Season {seasonNumber} Awaits</h2>
            <p className="text-white/30 text-sm mb-8 max-w-md mx-auto">
              Complete your auction and simulate the full IPL season to see match results,
              standings and the champion.
            </p>
            <Button
              onClick={() => simulateMut.mutate()}
              disabled={simulateMut.isPending}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black px-8 py-3 rounded-xl hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-all"
            >
              {simulateMut.isPending ? (
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 animate-pulse" /> Simulating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="h-4 w-4" /> Simulate Season {seasonNumber}
                </span>
              )}
            </Button>
            {simulateMut.isError && (
              <p className="mt-4 text-red-400 text-sm">{(simulateMut.error as Error).message}</p>
            )}
          </div>
        )}

        {/* Season Results */}
        {simulated && result && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="border border-white/5 rounded-xl p-3 text-center bg-yellow-500/5">
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Matches</div>
                <div className="text-2xl font-black text-yellow-400">{result.matches.length}</div>
              </div>
              <div className="border border-white/5 rounded-xl p-3 text-center bg-blue-500/5">
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Top Scorer</div>
                <div className="text-xs font-bold text-blue-400 truncate">{result.topRunScorer.name}</div>
                <div className="text-lg font-black text-white/60 font-mono">{result.topRunScorer.runs}</div>
              </div>
              <div className="border border-white/5 rounded-xl p-3 text-center bg-green-500/5">
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Top Wickets</div>
                <div className="text-xs font-bold text-green-400 truncate">{result.topWicketTaker.name}</div>
                <div className="text-lg font-black text-white/60 font-mono">{result.topWicketTaker.wickets} wkts</div>
              </div>
              <div className="border border-white/5 rounded-xl p-3 text-center bg-purple-500/5">
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Teams</div>
                <div className="text-2xl font-black text-purple-400">{result.standings.length}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 border border-white/5 rounded-xl p-1 bg-white/2">
              {(["standings", "playoffs", "matches"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab
                      ? "bg-yellow-400 text-black"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Standings Tab */}
            {activeTab === "standings" && (
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/30">#</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/30">Team</th>
                      <th className="text-center px-3 py-3 text-[10px] uppercase tracking-widest text-white/30">P</th>
                      <th className="text-center px-3 py-3 text-[10px] uppercase tracking-widest text-white/30">W</th>
                      <th className="text-center px-3 py-3 text-[10px] uppercase tracking-widest text-white/30">L</th>
                      <th className="text-center px-3 py-3 text-[10px] uppercase tracking-widest text-white/30">NRR</th>
                      <th className="text-center px-3 py-3 text-[10px] uppercase tracking-widest text-white/30">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.standings.map((s, i) => (
                      <tr key={s.teamId} className={`border-b border-white/3 hover:bg-white/2 transition-colors ${i < 4 ? "bg-green-500/3" : ""}`}>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-mono font-bold ${i < 4 ? "text-green-400" : "text-white/20"}`}>
                            {i < 4 ? "✓" : ""} {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                              style={{ backgroundColor: s.color }}
                            >
                              {s.shortName.slice(0, 2)}
                            </div>
                            <span className={`text-sm font-bold ${s.teamName === result.champion ? "text-yellow-400" : "text-white/70"}`}>
                              {s.teamName}
                              {s.teamName === result.champion && " 🏆"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-white/50 text-xs font-mono">{s.played}</td>
                        <td className="px-3 py-2.5 text-center text-green-400 text-xs font-mono font-bold">{s.won}</td>
                        <td className="px-3 py-2.5 text-center text-red-400/60 text-xs font-mono">{s.lost}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-xs">
                          <span className={s.nrr >= 0 ? "text-green-400" : "text-red-400"}>
                            {s.nrr >= 0 ? "+" : ""}{s.nrr.toFixed(3)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-black text-sm text-white">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2 bg-white/1 border-t border-white/3">
                  <span className="text-[10px] text-white/20">✓ Top 4 qualify for playoffs</span>
                </div>
              </div>
            )}

            {/* Playoffs Tab */}
            {activeTab === "playoffs" && (
              <div className="space-y-3">
                {result.playoffs.map((m) => (
                  <MatchCard key={m.id} match={m} champColor={result.championColor} />
                ))}
              </div>
            )}

            {/* Matches Tab */}
            {activeTab === "matches" && (
              <div className="space-y-2">
                {(showAllMatches ? result.matches : result.matches.slice(0, 15)).map((m) => (
                  <MatchCard key={m.id} match={m} compact />
                ))}
                {!showAllMatches && result.matches.length > 15 && (
                  <button
                    onClick={() => setShowAllMatches(true)}
                    className="w-full py-3 border border-white/5 rounded-xl text-white/30 text-xs hover:text-white/60 hover:border-white/10 transition-all"
                  >
                    Show all {result.matches.length} matches
                  </button>
                )}
              </div>
            )}

            {/* Next Season Button */}
            <div className="mt-8 flex items-center justify-between border border-white/5 rounded-xl p-4">
              <div>
                <div className="text-sm font-bold text-white/60">Ready for next season?</div>
                <div className="text-xs text-white/30 mt-0.5">
                  Reset the auction and run a new mega auction for Season {seasonNumber + 1}
                </div>
              </div>
              <Button
                onClick={() => {
                  nextSeasonMut.mutate();
                  setLocation("/");
                }}
                className="bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                Next Season <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 py-4 text-center">
        <span className="text-[10px] text-white/15 uppercase tracking-widest">Developed by Likith</span>
      </div>
    </div>
  );
}

function MatchCard({ match, compact, champColor }: {
  match: any;
  compact?: boolean;
  champColor?: string;
}) {
  const isFinal = match.matchType === "final";
  const isPlayoff = match.matchType !== "league";

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isFinal ? "border-yellow-500/30" : "border-white/5"
      }`}
      style={isFinal ? { boxShadow: `0 0 20px ${champColor ?? "#facc15"}20` } : undefined}
    >
      {isPlayoff && (
        <div className={`px-4 py-1 text-[10px] font-black uppercase tracking-widest ${isFinal ? "bg-yellow-500/10 text-yellow-400" : "bg-white/3 text-white/30"}`}>
          {MATCH_TYPE_LABELS[match.matchType]}
        </div>
      )}
      <div className={`px-4 ${compact ? "py-2.5" : "py-4"}`}>
        <div className="flex items-center justify-between gap-3">
          {/* Team A */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
              style={{ backgroundColor: match.teamAColor }}>
              {match.teamAShort.slice(0, 3)}
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-bold truncate ${match.winner === match.teamA ? "text-white" : "text-white/40"}`}>
                {compact ? match.teamAShort : match.teamA}
              </div>
              {!compact && <div className="text-xs text-white/25 font-mono">{match.teamAScore}</div>}
            </div>
          </div>

          {/* Result */}
          <div className="text-center flex-shrink-0 px-3">
            {compact ? (
              <div className="text-[10px] text-white/20 font-bold">vs</div>
            ) : (
              <div className="text-xs text-white/30 text-center max-w-28">{match.resultText}</div>
            )}
          </div>

          {/* Team B */}
          <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
              style={{ backgroundColor: match.teamBColor }}>
              {match.teamBShort.slice(0, 3)}
            </div>
            <div className="min-w-0 text-right">
              <div className={`text-sm font-bold truncate ${match.winner === match.teamB ? "text-white" : "text-white/40"}`}>
                {compact ? match.teamBShort : match.teamB}
              </div>
              {!compact && <div className="text-xs text-white/25 font-mono">{match.teamBScore}</div>}
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mt-3 flex items-center gap-4 text-[11px] text-white/30 border-t border-white/5 pt-3">
            <span>🏏 {match.topBatsman} — {match.topBatsmanRuns} runs</span>
            <span>⚡ {match.topBowler} — {match.topBowlerWickets}/{match.topBowlerEconomy}</span>
            <span className="ml-auto text-yellow-400/60">MOM: {match.manOfMatch}</span>
          </div>
        )}
      </div>
    </div>
  );
}
