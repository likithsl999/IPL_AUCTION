// ─── IPL Match Simulation Engine ─────────────────────────────────────────────
// Uses team squad strength + realistic randomness to simulate matches

import type { TeamState } from "./auction-state.js";
import type { Player } from "@workspace/db";

export interface MatchResult {
  id: number;
  teamA: string;
  teamAShort: string;
  teamAColor: string;
  teamB: string;
  teamBShort: string;
  teamBColor: string;
  winner: string;
  winnerShort: string;
  loser: string;
  resultText: string;
  teamAScore: string;
  teamBScore: string;
  topBatsman: string;
  topBatsmanRuns: number;
  topBowler: string;
  topBowlerWickets: number;
  topBowlerEconomy: number;
  manOfMatch: string;
  matchType: "league" | "qualifier1" | "qualifier2" | "eliminator" | "final";
  round?: number;
}

export interface StandingEntry {
  teamId: string;
  teamName: string;
  shortName: string;
  color: string;
  played: number;
  won: number;
  lost: number;
  nrr: number;
  points: number;
}

export interface SeasonResult {
  matches: MatchResult[];
  standings: StandingEntry[];
  playoffs: MatchResult[];
  champion: string;
  championColor: string;
  topRunScorer: { name: string; runs: number; team: string };
  topWicketTaker: { name: string; wickets: number; team: string };
}

// Calculate team strength from squad
function getTeamStrength(team: TeamState): number {
  const squad = team.players;
  if (squad.length === 0) return 55; // default weak team
  const avgRating = squad.reduce((s, p) => s + p.skillRating, 0) / squad.length;
  // Role diversity bonus (max +6)
  const roles = new Set(squad.map((p) => p.role));
  const diversityBonus = roles.size * 1.5;
  // Depth bonus (having 15+ players gives +2)
  const depthBonus = squad.length >= 15 ? 2 : squad.length >= 10 ? 1 : 0;
  // Star player bonus (any 90+ rated player)
  const starBonus = squad.some((p) => p.skillRating >= 90) ? 3 : squad.some((p) => p.skillRating >= 85) ? 1 : 0;
  return avgRating + diversityBonus + depthBonus + starBonus;
}

// Pick top batsman from squad (highest battingRating)
function getTopBatsman(squad: Player[]): Player | null {
  if (squad.length === 0) return null;
  return squad.reduce((best, p) => p.battingRating > best.battingRating ? p : best, squad[0]);
}

// Pick top bowler from squad (highest bowlingRating)
function getTopBowler(squad: Player[]): Player | null {
  if (squad.length === 0) return null;
  return squad.reduce((best, p) => p.bowlingRating > best.bowlingRating ? p : best, squad[0]);
}

// Generate a realistic T20 score string (e.g. "182/4 (20.0 ov)")
function genScore(base: number): string {
  const runs = Math.floor(base + (Math.random() - 0.5) * 30);
  const wickets = Math.floor(2 + Math.random() * 7);
  const overs = Math.random() < 0.3 ? (15 + Math.random() * 4.9).toFixed(1) : "20.0";
  return `${Math.max(80, runs)}/${Math.min(10, wickets)} (${overs} ov)`;
}

// Simulate a single match between two teams
function simulateMatch(
  teamA: TeamState,
  teamB: TeamState,
  matchId: number,
  matchType: MatchResult["matchType"],
  round?: number
): MatchResult {
  const strengthA = getTeamStrength(teamA);
  const strengthB = getTeamStrength(teamB);

  // Add 15% randomness to make upsets possible
  const randomA = strengthA * (0.87 + Math.random() * 0.26);
  const randomB = strengthB * (0.87 + Math.random() * 0.26);

  const teamAWins = randomA > randomB;
  const winner = teamAWins ? teamA : teamB;
  const loser = teamAWins ? teamB : teamA;

  // Generate scores
  const winnerBase = 155 + strengthA * 0.5 + Math.random() * 40;
  const loserBase = winnerBase - 5 - Math.random() * 50;
  const winnerScore = genScore(winnerBase);
  const loserScore = genScore(loserBase);

  // Result description
  let resultText: string;
  if (Math.random() > 0.45) {
    const wickets = 2 + Math.floor(Math.random() * 7);
    resultText = `${winner.shortName} won by ${wickets} wickets`;
  } else {
    const runs = 5 + Math.floor(Math.random() * 55);
    resultText = `${winner.shortName} won by ${runs} runs`;
  }

  // Top performers — pick from squads if available, else use team name
  const topBatPlayer = getTopBatsman(winner.players);
  const topBatName = topBatPlayer?.name ?? `${winner.shortName} Batsman`;
  const topBatRuns = 35 + Math.floor(topBatPlayer ? topBatPlayer.battingRating * 0.7 * Math.random() : Math.random() * 50);

  const topBowlPlayer = getTopBowler(loser.players.length > 0 ? loser.players : winner.players);
  const topBowlName = topBowlPlayer?.name ?? `${winner.shortName} Bowler`;
  const topBowlWickets = 1 + Math.floor(Math.random() * 4);
  const topBowlEco = +(6 + Math.random() * 4).toFixed(1);

  const momIsPlayer = Math.random() > 0.3;
  const manOfMatch = momIsPlayer && topBatPlayer ? topBatPlayer.name : topBowlName;

  return {
    id: matchId,
    teamA: teamA.name,
    teamAShort: teamA.shortName,
    teamAColor: teamA.color,
    teamB: teamB.name,
    teamBShort: teamB.shortName,
    teamBColor: teamB.color,
    winner: winner.name,
    winnerShort: winner.shortName,
    loser: loser.name,
    resultText,
    teamAScore: teamAWins ? winnerScore : loserScore,
    teamBScore: teamAWins ? loserScore : winnerScore,
    topBatsman: topBatName,
    topBatsmanRuns: topBatRuns,
    topBowler: topBowlName,
    topBowlerWickets: topBowlWickets,
    topBowlerEconomy: topBowlEco,
    manOfMatch,
    matchType,
    round,
  };
}

// Run full IPL season simulation
export function simulateSeason(teams: TeamState[]): SeasonResult {
  const matches: MatchResult[] = [];
  let matchId = 1;

  // League phase: each team plays every other team once (double round-robin = 2x)
  // Simplified: single round-robin (9 games per team = 45 total)
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const round = Math.floor(matchId / 2) + 1;
      matches.push(simulateMatch(teams[i], teams[j], matchId++, "league", round));
    }
  }

  // Calculate standings
  const points: Record<string, StandingEntry> = {};
  for (const t of teams) {
    points[t.id] = {
      teamId: t.id,
      teamName: t.name,
      shortName: t.shortName,
      color: t.color,
      played: 0, won: 0, lost: 0, nrr: 0, points: 0,
    };
  }

  for (const m of matches) {
    const winnerEntry = teams.find((t) => t.name === m.winner);
    const loserEntry = teams.find((t) => t.name === m.loser);
    if (winnerEntry && points[winnerEntry.id]) {
      points[winnerEntry.id].won++;
      points[winnerEntry.id].points += 2;
      points[winnerEntry.id].played++;
      points[winnerEntry.id].nrr += +(0.1 + Math.random() * 0.4).toFixed(3);
    }
    if (loserEntry && points[loserEntry.id]) {
      points[loserEntry.id].lost++;
      points[loserEntry.id].played++;
      points[loserEntry.id].nrr -= +(0.1 + Math.random() * 0.35).toFixed(3);
    }
  }

  // Sort standings: points desc, then NRR
  const standings = Object.values(points).sort((a, b) =>
    b.points !== a.points ? b.points - a.points : b.nrr - a.nrr
  );

  // Top 4 go to playoffs
  const top4 = standings.slice(0, 4).map((s) => teams.find((t) => t.id === s.teamId)!).filter(Boolean);

  const playoffs: MatchResult[] = [];

  // Qualifier 1: 1 vs 2
  const q1 = simulateMatch(top4[0], top4[1], matchId++, "qualifier1");
  playoffs.push(q1);

  // Eliminator: 3 vs 4
  const elim = simulateMatch(top4[2], top4[3], matchId++, "eliminator");
  playoffs.push(elim);

  // Qualifier 2: Q1 loser vs Elim winner
  const q1Loser = teams.find((t) => t.name === q1.loser)!;
  const elimWinner = teams.find((t) => t.name === elim.winner)!;
  const q2 = q1Loser && elimWinner
    ? simulateMatch(q1Loser, elimWinner, matchId++, "qualifier2")
    : simulateMatch(top4[1], top4[2], matchId++, "qualifier2");
  playoffs.push(q2);

  // Final: Q1 winner vs Q2 winner
  const finalTeamA = teams.find((t) => t.name === q1.winner)!;
  const finalTeamB = teams.find((t) => t.name === q2.winner)!;
  const final = finalTeamA && finalTeamB
    ? simulateMatch(finalTeamA, finalTeamB, matchId++, "final")
    : simulateMatch(top4[0], top4[1], matchId++, "final");
  playoffs.push(final);

  const champion = final.winner;
  const championTeam = teams.find((t) => t.name === champion);

  // Top run scorer and wicket taker — aggregate from match results
  const batterTotals: Record<string, { runs: number; team: string }> = {};
  const bowlerTotals: Record<string, { wickets: number; team: string }> = {};

  for (const t of teams) {
    for (const p of t.players) {
      const runs = Math.floor(p.battingRating * 4.5 + Math.random() * 100);
      if (!batterTotals[p.name] || runs > batterTotals[p.name].runs) {
        batterTotals[p.name] = { runs, team: t.shortName };
      }
      const wkts = Math.floor(p.bowlingRating * 0.3 + Math.random() * 12);
      if (!bowlerTotals[p.name] || wkts > bowlerTotals[p.name].wickets) {
        bowlerTotals[p.name] = { wickets: wkts, team: t.shortName };
      }
    }
  }

  // If no players were bought, fall back to match-level performers
  const allMatchPerformers = [...matches, ...playoffs];
  if (Object.keys(batterTotals).length === 0) {
    for (const m of allMatchPerformers) {
      if (!batterTotals[m.topBatsman]) batterTotals[m.topBatsman] = { runs: m.topBatsmanRuns, team: m.winnerShort };
      else batterTotals[m.topBatsman].runs += Math.floor(m.topBatsmanRuns * 0.6);
    }
  }
  if (Object.keys(bowlerTotals).length === 0) {
    for (const m of allMatchPerformers) {
      if (!bowlerTotals[m.topBowler]) bowlerTotals[m.topBowler] = { wickets: m.topBowlerWickets, team: m.winnerShort };
      else bowlerTotals[m.topBowler].wickets += m.topBowlerWickets;
    }
  }

  let bestBatter: { name: string; runs: number; team: string } = { name: "—", runs: 0, team: "—" };
  let bestBowler: { name: string; wickets: number; team: string } = { name: "—", wickets: 0, team: "—" };

  for (const [name, data] of Object.entries(batterTotals)) {
    if (data.runs > bestBatter.runs) bestBatter = { name, runs: data.runs, team: data.team };
  }
  for (const [name, data] of Object.entries(bowlerTotals)) {
    if (data.wickets > bestBowler.wickets) bestBowler = { name, wickets: data.wickets, team: data.team };
  }

  return {
    matches,
    standings,
    playoffs,
    champion,
    championColor: championTeam?.color ?? "#facc15",
    topRunScorer: bestBatter,
    topWicketTaker: bestBowler,
  };
}
