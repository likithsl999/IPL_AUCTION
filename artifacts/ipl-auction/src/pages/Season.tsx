import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Trophy, Zap, Users, TrendingUp, Star, Target,
  Play, ChevronRight, Award, Activity, BarChart3, Wind, MapPin,
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

type SeasonTab = "standings" | "playoffs" | "matches" | "awards" | "atmosphere";

export default function Season() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [activeTab, setActiveTab] = useState<SeasonTab>("standings");
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  const { data: careerData, isLoading } = useQuery({
    queryKey: ["career-state"],
    queryFn: fetchCareerState,
    refetchInterval: false,
  });

  const simulateMut = useMutation({
    mutationFn: postSimulate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-state"] });
      queryClient.invalidateQueries({ queryKey: ["career-records"] });
      queryClient.invalidateQueries({ queryKey: ["career-youth"] });
      queryClient.invalidateQueries({ queryKey: ["career-finance"] });
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

  const tabs: { id: SeasonTab; label: string; icon: React.ElementType }[] = [
    { id: "standings",   label: "Standings",  icon: BarChart3  },
    { id: "playoffs",    label: "Playoffs",   icon: Trophy     },
    { id: "matches",     label: "Matches",    icon: Activity   },
    { id: "awards",      label: "Awards",     icon: Award      },
    { id: "atmosphere",  label: "Venues",     icon: MapPin     },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-3 bg-black/90 sticky top-0 z-10 backdrop-blur">
        <Button variant="ghost" size="sm" className="text-white/40 hover:text-white"
          onClick={() => setLocation("/auction")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" />
          <span className="text-xs font-black text-white/40 uppercase tracking-widest">
            IPL Season {seasonNumber} — 2026
          </span>
        </div>
        <button onClick={() => setLocation("/analytics")}
          className="ml-auto flex items-center gap-1.5 text-xs text-cyan-400/60 hover:text-cyan-400 border border-cyan-500/10 hover:border-cyan-500/30 rounded-lg px-2.5 py-1.5 transition-all">
          <BarChart3 className="h-3 w-3" /> Analytics
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Champion Banner */}
        {simulated && result?.champion && (
          <div className="relative mb-6 rounded-2xl overflow-hidden border"
            style={{
              borderColor: result.championColor + "40",
              background: `linear-gradient(135deg, ${result.championColor}12, transparent)`,
              boxShadow: `0 0 40px ${result.championColor}20`,
            }}>
            <div className="p-6 text-center">
              <div className="text-yellow-400 text-3xl mb-2">🏆</div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                IPL Season {seasonNumber} Champion
              </div>
              <div className="text-4xl font-black"
                style={{ color: result.championColor, filter: `drop-shadow(0 0 20px ${result.championColor}60)` }}>
                {result.champion}
              </div>
              {result.manOfTheSeries && (
                <div className="mt-3 text-xs text-white/30">
                  Man of the Series: <span className="text-white/60 font-bold">{result.manOfTheSeries.name}</span>
                  <span className="text-white/30"> ({result.manOfTheSeries.team}) — {result.manOfTheSeries.contribution}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pre-simulation state */}
        {!simulated && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-6 text-4xl">🏏</div>
            <h2 className="text-2xl font-black text-white mb-2">Season {seasonNumber} Awaits</h2>
            <p className="text-white/30 text-sm mb-8 max-w-md mx-auto">
              Simulate the full IPL season across real stadiums with dynamic weather, team chemistry,
              and injury events. 45 league matches + 4 playoff games.
            </p>
            <Button onClick={() => simulateMut.mutate()} disabled={simulateMut.isPending}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black px-8 py-3 rounded-xl hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] transition-all">
              {simulateMut.isPending ? (
                <span className="flex items-center gap-2"><Zap className="h-4 w-4 animate-pulse" /> Simulating…</span>
              ) : (
                <span className="flex items-center gap-2"><Play className="h-4 w-4" /> Simulate Season {seasonNumber}</span>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MiniStat icon="🏏" label="Matches" value={result.matches.length} color="text-yellow-400" />
              <MiniStat icon="🧡" label="Orange Cap" value={`${result.topRunScorer.runs} runs`} sub={result.topRunScorer.name} color="text-orange-400" />
              <MiniStat icon="💜" label="Purple Cap" value={`${result.topWicketTaker.wickets} wkts`} sub={result.topWicketTaker.name} color="text-purple-400" />
              <MiniStat icon="💥" label="Most Sixes" value={`${result.mostSixes?.sixes ?? 0} sixes`} sub={result.mostSixes?.name ?? "—"} color="text-blue-400" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 border border-white/5 rounded-xl p-1 bg-white/2 overflow-x-auto scrollbar-none">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-max flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                    activeTab === tab.id ? "bg-yellow-400 text-black" : "text-white/30 hover:text-white/60"
                  }`}>
                  <tab.icon className="h-3 w-3 shrink-0" /><span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ── STANDINGS ───────────────────────────────────────────────── */}
            {activeTab === "standings" && (
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <div className="overflow-x-auto scrollbar-none">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                      {["#", "Team", "P", "W", "L", "NRR", "Pts"].map(h => (
                        <th key={h} className={`${h === "Team" ? "text-left" : "text-center"} px-3 py-3 text-[10px] uppercase tracking-widest text-white/30`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.standings.map((s: any, i: number) => (
                      <tr key={s.teamId} className={`border-b border-white/3 hover:bg-white/2 transition-colors ${i < 4 ? "bg-green-500/3" : ""}`}>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-mono font-bold ${i < 4 ? "text-green-400" : "text-white/20"}`}>{i + 1}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                              style={{ backgroundColor: s.color }}>{s.shortName.slice(0, 2)}</div>
                            <span className={`text-sm font-bold ${s.teamName === result.champion ? "text-yellow-400" : "text-white/70"}`}>
                              {s.teamName}{s.teamName === result.champion ? " 🏆" : ""}
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
                </div>
                <div className="px-4 py-2 bg-white/1 border-t border-white/3">
                  <span className="text-[10px] text-white/20">✓ Top 4 qualify for playoffs · Qualifier 1, Eliminator, Qualifier 2, Final</span>
                </div>
              </div>
            )}

            {/* ── PLAYOFFS ────────────────────────────────────────────────── */}
            {activeTab === "playoffs" && (
              <div className="space-y-3">
                {result.playoffs.map((m: any) => (
                  <MatchCard key={m.id} match={m} champColor={result.championColor}
                    expanded={expandedMatch === m.id}
                    onToggle={() => setExpandedMatch(expandedMatch === m.id ? null : m.id)} />
                ))}
              </div>
            )}

            {/* ── MATCHES ──────────────────────────────────────────────────── */}
            {activeTab === "matches" && (
              <div className="space-y-2">
                {(showAllMatches ? result.matches : result.matches.slice(0, 15)).map((m: any) => (
                  <MatchCard key={m.id} match={m} compact
                    expanded={expandedMatch === m.id}
                    onToggle={() => setExpandedMatch(expandedMatch === m.id ? null : m.id)} />
                ))}
                {!showAllMatches && result.matches.length > 15 && (
                  <button onClick={() => setShowAllMatches(true)}
                    className="w-full py-3 border border-white/5 rounded-xl text-white/30 text-xs hover:text-white/60 hover:border-white/10 transition-all">
                    Show all {result.matches.length} matches
                  </button>
                )}
              </div>
            )}

            {/* ── AWARDS ──────────────────────────────────────────────────── */}
            {activeTab === "awards" && (
              <div className="space-y-4">
                {/* Season Awards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AwardCard emoji="🧡" title="Orange Cap" label="Most Runs"
                    name={result.topRunScorer.name} team={result.topRunScorer.team}
                    value={`${result.topRunScorer.runs} runs`} color="border-orange-500/30 bg-orange-500/10" />
                  <AwardCard emoji="💜" title="Purple Cap" label="Most Wickets"
                    name={result.topWicketTaker.name} team={result.topWicketTaker.team}
                    value={`${result.topWicketTaker.wickets} wickets`} color="border-purple-500/30 bg-purple-500/10" />
                  <AwardCard emoji="💥" title="Six Machine" label="Most Sixes"
                    name={result.mostSixes?.name ?? "—"} team={result.mostSixes?.team ?? "—"}
                    value={`${result.mostSixes?.sixes ?? 0} sixes`} color="border-blue-500/30 bg-blue-500/10" />
                  <AwardCard emoji="⭐" title="Man of the Series"
                    name={result.manOfTheSeries?.name ?? "—"} team={result.manOfTheSeries?.team ?? "—"}
                    value={result.manOfTheSeries?.contribution ?? "—"} color="border-yellow-500/30 bg-yellow-500/10" />
                </div>

                {/* Best Bowling */}
                {result.bestBowling?.name && result.bestBowling.name !== "—" && (
                  <div className="border border-green-500/20 bg-green-500/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-green-400" />
                      <span className="text-xs font-bold text-green-400">Best Bowling Performance</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{result.bestBowling.name}</p>
                        <p className="text-xs text-white/40">{result.bestBowling.team}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-green-400">{result.bestBowling.figures}</p>
                        <p className="text-xs text-white/30">Eco: {result.bestBowling.economy}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chemistry Rankings */}
                {result.teamChemistryRankings?.length > 0 && (
                  <div className="border border-white/5 rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                      <Users className="h-3 w-3" /> Team Chemistry Rankings
                    </h3>
                    <div className="space-y-2">
                      {result.teamChemistryRankings.map((t: any, i: number) => (
                        <div key={t.team} className="flex items-center gap-3">
                          <span className="text-xs text-white/25 w-4">{i + 1}</span>
                          <span className="text-xs font-bold text-white/70 w-10">{t.team}</span>
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                              style={{ width: `${t.chemistry}%` }} />
                          </div>
                          <span className="text-xs text-white/50 w-8 text-right">{t.chemistry}</span>
                          <span className="text-xs text-white/25">{t.bonus}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ATMOSPHERE / VENUES ─────────────────────────────────────── */}
            {activeTab === "atmosphere" && (
              <div className="space-y-4">
                {/* Stadium Highlights */}
                {result.stadiumHighlights?.length > 0 && (
                  <div className="border border-white/5 rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> Highest Scoring Venues
                    </h3>
                    <div className="space-y-2">
                      {result.stadiumHighlights.map((h: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-xs font-bold text-white/80">{h.stadium}</p>
                            <p className="text-[10px] text-white/30">{h.weather}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-yellow-400 font-bold">{h.highScore}</p>
                            <p className="text-[10px] text-white/30">{h.team}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Injury Report */}
                {result.injuryReport?.length > 0 && (
                  <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-red-400/70 mb-3 flex items-center gap-2">
                      <Activity className="h-3 w-3" /> Injury Report
                    </h3>
                    <div className="space-y-1.5">
                      {result.injuryReport.map((line: string, i: number) => (
                        <p key={i} className="text-xs text-white/50">{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Match Commentary */}
                {result.matches?.length > 0 && (
                  <div className="border border-white/5 rounded-xl p-4">
                    <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                      <Wind className="h-3 w-3" /> Match Commentary Highlights
                    </h3>
                    <div className="space-y-3">
                      {result.matches.slice(0, 3).map((m: any, i: number) => (
                        m.commentary && (
                          <div key={i} className="bg-white/3 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                                style={{ backgroundColor: m.teamAColor }}>{m.teamAShort.slice(0, 1)}</div>
                              <span className="text-xs text-white/40 font-bold">vs</span>
                              <div className="w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                                style={{ backgroundColor: m.teamBColor }}>{m.teamBShort.slice(0, 1)}</div>
                              <span className="text-xs text-white/30 ml-1">{m.resultText}</span>
                            </div>
                            <div className="space-y-1">
                              {(m.commentary as string[]).map((line: string, j: number) => (
                                <p key={j} className="text-[11px] text-white/50 leading-relaxed">{line}</p>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Next Season */}
            <div className="mt-8 flex items-center justify-between border border-white/5 rounded-xl p-4">
              <div>
                <div className="text-sm font-bold text-white/60">Ready for next season?</div>
                <div className="text-xs text-white/30 mt-0.5">
                  Reset auction and run Season {seasonNumber + 1} — player ratings will evolve.
                </div>
              </div>
              <Button onClick={() => { nextSeasonMut.mutate(); setLocation("/"); }}
                className="bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl font-bold text-sm flex items-center gap-2">
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

// ─── Helper Components ────────────────────────────────────────────────────────
function MiniStat({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="border border-white/5 rounded-xl p-3 text-center bg-white/2">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-sm font-black ${color} truncate`}>{value}</div>
      {sub && <div className="text-[10px] text-white/30 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function AwardCard({ emoji, title, label, name, team, value, color }: {
  emoji: string; title: string; label?: string; name: string; team: string; value: string; color: string;
}) {
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <div>
          <p className="text-xs font-black text-white/80">{title}</p>
          {label && <p className="text-[10px] text-white/30">{label}</p>}
        </div>
      </div>
      <p className="text-base font-black text-white truncate">{name}</p>
      <p className="text-xs text-white/40">{team}</p>
      <p className="text-sm font-bold text-yellow-400 mt-2">{value}</p>
    </div>
  );
}

function MatchCard({ match, compact, champColor, expanded, onToggle }: {
  match: any; compact?: boolean; champColor?: string; expanded?: boolean; onToggle?: () => void;
}) {
  const isFinal   = match.matchType === "final";
  const isPlayoff = match.matchType !== "league";

  return (
    <div className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${isFinal ? "border-yellow-500/30" : "border-white/5 hover:border-white/10"}`}
      style={isFinal ? { boxShadow: `0 0 20px ${champColor ?? "#facc15"}20` } : undefined}
      onClick={onToggle}>
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
              style={{ backgroundColor: match.teamAColor }}>{match.teamAShort.slice(0, 3)}</div>
            <div className="min-w-0">
              <div className={`text-sm font-bold truncate ${match.winner === match.teamA ? "text-white" : "text-white/40"}`}>
                {compact ? match.teamAShort : match.teamA}
              </div>
              {!compact && <div className="text-xs text-white/25 font-mono">{match.teamAScore}</div>}
            </div>
          </div>

          {/* Score / vs */}
          <div className="text-center flex-shrink-0 px-2">
            {compact ? (
              <div className="text-[10px] text-white/20 font-bold">vs</div>
            ) : (
              <div className="text-xs text-white/30 text-center max-w-32">{match.resultText}</div>
            )}
          </div>

          {/* Team B */}
          <div className="flex items-center gap-2 min-w-0 flex-row-reverse">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
              style={{ backgroundColor: match.teamBColor }}>{match.teamBShort.slice(0, 3)}</div>
            <div className="min-w-0 text-right">
              <div className={`text-sm font-bold truncate ${match.winner === match.teamB ? "text-white" : "text-white/40"}`}>
                {compact ? match.teamBShort : match.teamB}
              </div>
              {!compact && <div className="text-xs text-white/25 font-mono">{match.teamBScore}</div>}
            </div>
          </div>
        </div>

        {/* Venue / weather row */}
        {match.stadium && (
          <div className="mt-2 flex items-center gap-3 text-[10px] text-white/25">
            <span>📍 {match.stadium}</span>
            <span>{match.weatherLabel}</span>
            {match.teamASixes !== undefined && (
              <span className="ml-auto">💥 {match.teamASixes + match.teamBSixes} sixes</span>
            )}
          </div>
        )}

        {!compact && (
          <div className="mt-2 flex items-center gap-4 text-[11px] text-white/30 border-t border-white/5 pt-2">
            <span>🏏 {match.topBatsman} — {match.topBatsmanRuns} runs</span>
            <span>⚡ {match.topBowler} — {match.topBowlerWickets}/{match.topBowlerEconomy}</span>
            <span className="ml-auto text-yellow-400/60">MOM: {match.manOfMatch}</span>
          </div>
        )}

        {/* Expanded commentary */}
        {expanded && match.commentary && (
          <div className="mt-3 border-t border-white/5 pt-3 space-y-1">
            {(match.commentary as string[]).map((line: string, i: number) => (
              <p key={i} className="text-[11px] text-white/40 leading-relaxed">{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
