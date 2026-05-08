// ─── IPL Match Simulation Engine ─────────────────────────────────────────────
// Enhanced with stadiums, weather, team chemistry, dynamic commentary, injuries

import type { TeamState } from "./auction-state.js";
import type { Player } from "@workspace/db";
import {
  IPL_STADIUMS,
  type Stadium,
  type WeatherCondition,
  getMatchWeather,
  getWeatherModifiers,
  getStadiumForTeam,
  WEATHER_LABEL,
  PITCH_LABEL,
} from "./stadiums.js";

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
  // Enhanced fields
  stadium: string;
  stadiumCity: string;
  weather: WeatherCondition;
  weatherLabel: string;
  pitchLabel: string;
  teamASixes: number;
  teamBSixes: number;
  commentary: string[];
  injuryEvent: string | null;
  teamAChemistry: number;
  teamBChemistry: number;
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
  // Enhanced
  mostSixes: { name: string; sixes: number; team: string };
  bestBowling: { name: string; figures: string; economy: number; team: string };
  manOfTheSeries: { name: string; team: string; contribution: string };
  injuryReport: string[];
  teamChemistryRankings: Array<{ team: string; chemistry: number; bonus: string }>;
  stadiumHighlights: Array<{ stadium: string; weather: string; highScore: string; team: string }>;
}

// ─── Commentary Templates ─────────────────────────────────────────────────────
const BATTING_LINES = [
  "Massive six over long-on! The crowd erupts!",
  "Pulled away in style — that's going into the stands!",
  "Creamed through the covers for four!",
  "Elegant stroke play from the right-hander!",
  "Slog-swept brilliantly over midwicket for six!",
  "Flicked off the pads for a boundary!",
  "What a shot — straight back down the ground!",
  "Ramps it over the keeper for a stunning six!",
  "Upper-cut for four — exquisite timing!",
  "Inside-out over extra cover — sensational!",
];

const BOWLING_LINES = [
  "Unplayable yorker — clean bowled!",
  "Beats the bat with sheer pace — top edge and gone!",
  "Slower ball deceives the batter — caught in the deep!",
  "Googly spins through the gate — bowled him!",
  "Perfect inswinger traps him LBW!",
  "Short ball, mistimed pull — caught at fine leg!",
  "Brilliant comeback — wicket maiden over!",
  "Outfoxed by the change of pace!",
  "That's a peach of a delivery — top of off-stump!",
];

const CROWD_LINES = [
  "The stadium is electric tonight!",
  "Incredible atmosphere — fans on their feet!",
  "Chants ring around the ground!",
  "The home crowd is going absolutely berserk!",
  "You could hear a pin drop as he walks in…",
  "The roar of the crowd sends shivers down the spine!",
  "Unbelievable scenes here at the ground!",
];

const MATCH_SITUATION_LINES = [
  "This is a crucial moment in the game.",
  "The asking rate has climbed — pressure is building!",
  "They need this wicket to turn the match around.",
  "The powerplay sets up the innings perfectly.",
  "Death bowling master-class on display here!",
  "Brilliant captaincy — that bowling change works!",
  "The momentum has completely shifted!",
  "Tactical masterclass from the captain!",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomStadium(): Stadium {
  return IPL_STADIUMS[Math.floor(Math.random() * IPL_STADIUMS.length)];
}

// ─── Match Commentary Generator ───────────────────────────────────────────────
function generateMatchCommentary(
  stadium: Stadium,
  weather: WeatherCondition,
  topBatsmanName: string,
  topBowlerName: string
): string[] {
  const lines: string[] = [];
  lines.push(`📍 ${stadium.name}, ${stadium.city} | ${WEATHER_LABEL[weather]} conditions`);
  lines.push(`🏟️ ${PITCH_LABEL[stadium.pitchType]}. ${stadium.description}`);
  lines.push(`🏏 ${topBatsmanName}: ${randomPick(BATTING_LINES)}`);
  lines.push(`⚡ ${topBowlerName}: ${randomPick(BOWLING_LINES)}`);
  lines.push(randomPick(CROWD_LINES));
  lines.push(randomPick(MATCH_SITUATION_LINES));

  if (weather === "dew") {
    lines.push("🌙 Heavy dew made the ball slippery — chasing became much easier tonight!");
  } else if (weather === "overcast") {
    lines.push("☁️ Overcast skies helped the seamers swing it throughout the day.");
  } else if (weather === "humid") {
    lines.push("💧 Humidity caused the ball to grip — spinners enjoyed the conditions.");
  }
  return lines;
}

// ─── Team Chemistry ───────────────────────────────────────────────────────────
function calculateChemistry(team: TeamState): number {
  const players = team.players;
  if (!players.length) return 50;

  const natCounts: Record<string, number> = {};
  for (const p of players) {
    natCounts[p.nationality] = (natCounts[p.nationality] ?? 0) + 1;
  }

  const maxGroup = Math.max(...Object.values(natCounts));
  const groupRatio = maxGroup / players.length;
  const starCount = players.filter(p => p.skillRating >= 90).length;
  const starBonus = Math.min(starCount * 3, 15);
  const diversityPenalty = Object.keys(natCounts).length > 6 ? 5 : 0;

  return Math.min(100, Math.floor(50 + groupRatio * 30 + starBonus - diversityPenalty));
}

// ─── Team Strength ────────────────────────────────────────────────────────────
function getTeamStrength(team: TeamState, chemistry: number = 50): number {
  const squad = team.players;
  if (!squad.length) return 55;
  const avgRating = squad.reduce((s, p) => s + p.skillRating, 0) / squad.length;
  const roles = new Set(squad.map(p => p.role));
  const diversityBonus = roles.size * 1.5;
  const depthBonus = squad.length >= 15 ? 2 : squad.length >= 10 ? 1 : 0;
  const starBonus = squad.some(p => p.skillRating >= 90) ? 3 : squad.some(p => p.skillRating >= 85) ? 1 : 0;
  const chemBonus = (chemistry - 50) * 0.05; // -2.5 to +2.5
  return avgRating + diversityBonus + depthBonus + starBonus + chemBonus;
}

// ─── Player Pickers ───────────────────────────────────────────────────────────
function getTopBatsman(squad: Player[]): Player | null {
  if (!squad.length) return null;
  return squad.reduce((best, p) => p.battingRating > best.battingRating ? p : best, squad[0]);
}

function getTopBowler(squad: Player[]): Player | null {
  if (!squad.length) return null;
  return squad.reduce((best, p) => p.bowlingRating > best.bowlingRating ? p : best, squad[0]);
}

// ─── Score Generator ──────────────────────────────────────────────────────────
function genScore(base: number, pitchType: string, battingBonus: number): string {
  const pitchMod =
    pitchType === "batting" ? 1.06 :
    pitchType === "spin"    ? 0.94 :
    pitchType === "pace"    ? 0.97 : 1.0;
  const runs = Math.floor(base * pitchMod * battingBonus + (Math.random() - 0.5) * 28);
  const wickets = Math.floor(2 + Math.random() * 7);
  const overs = Math.random() < 0.3 ? (15 + Math.random() * 4.9).toFixed(1) : "20.0";
  return `${Math.max(85, runs)}/${Math.min(10, wickets)} (${overs} ov)`;
}

// ─── Injury System ────────────────────────────────────────────────────────────
const INJURY_TYPES = [
  "hamstring strain", "knee discomfort", "shoulder niggle",
  "back spasm", "side strain", "ankle twist", "calf tightness",
];

function generateInjuryEvent(
  teams: TeamState[],
  injuryRisk: number
): string | null {
  if (Math.random() > injuryRisk * 3) return null;
  const allPlayers = teams.flatMap(t =>
    t.players.map(p => ({ name: p.name, team: t.shortName }))
  );
  if (!allPlayers.length) return null;
  const victim = randomPick(allPlayers);
  const injury = randomPick(INJURY_TYPES);
  return `🏥 ${victim.name} (${victim.team}) left the field with a ${injury} — to be assessed.`;
}

// ─── Single Match Simulation ──────────────────────────────────────────────────
function simulateMatch(
  teamA: TeamState,
  teamB: TeamState,
  matchId: number,
  matchType: MatchResult["matchType"],
  round?: number,
  stadium?: Stadium,
  weather?: WeatherCondition,
): MatchResult {
  const venue = stadium ?? randomStadium();
  const matchWeather = weather ?? getMatchWeather(venue);
  const weatherMods = getWeatherModifiers(matchWeather, venue);

  const chemA = calculateChemistry(teamA);
  const chemB = calculateChemistry(teamB);

  const strengthA = getTeamStrength(teamA, chemA);
  const strengthB = getTeamStrength(teamB, chemB);

  // 15% randomness to allow upsets
  const randomA = strengthA * (0.87 + Math.random() * 0.26);
  const randomB = strengthB * (0.87 + Math.random() * 0.26) + weatherMods.chasingAdvantage * 0.2;

  const teamAWins = randomA > randomB;
  const winner = teamAWins ? teamA : teamB;
  const loser = teamAWins ? teamB : teamA;

  // Score generation based on venue + weather
  const winnerBase = venue.avgFirstInnings + strengthA * 0.35 + Math.random() * 30;
  const loserBase = winnerBase - 5 - Math.random() * 45;
  const winnerScore = genScore(winnerBase, venue.pitchType, weatherMods.battingBonus);
  const loserScore = genScore(loserBase, venue.pitchType, weatherMods.battingBonus * 0.92);

  // Result text
  let resultText: string;
  if (Math.random() > 0.45) {
    const wickets = 2 + Math.floor(Math.random() * 7);
    resultText = `${winner.shortName} won by ${wickets} wickets`;
  } else {
    const runs = 5 + Math.floor(Math.random() * 60);
    resultText = `${winner.shortName} won by ${runs} runs`;
  }

  // Top performers
  const topBatPlayer = getTopBatsman(winner.players);
  const topBatName = topBatPlayer?.name ?? `${winner.shortName} Batsman`;
  const topBatRuns = 35 + Math.floor(
    topBatPlayer ? topBatPlayer.battingRating * 0.65 * Math.random() : Math.random() * 50
  );

  const bowlPool = loser.players.length > 0 ? loser.players : winner.players;
  const topBowlPlayer = getTopBowler(bowlPool);
  const topBowlName = topBowlPlayer?.name ?? `${winner.shortName} Bowler`;
  const topBowlWickets = 1 + Math.floor(Math.random() * 4);
  const topBowlEco = +(6 + Math.random() * 4).toFixed(1);

  const manOfMatch = Math.random() > 0.35 && topBatPlayer ? topBatPlayer.name : topBowlName;

  // Sixes — more on batting pitches + sunny conditions
  const sixesMult =
    venue.pitchType === "batting" ? 1.4 :
    venue.pitchType === "spin"    ? 0.7 : 1.0;
  const teamASixes = Math.floor((4 + Math.random() * 8) * sixesMult * weatherMods.battingBonus);
  const teamBSixes = Math.floor((3 + Math.random() * 7) * sixesMult * weatherMods.battingBonus);

  // Injury event
  const injuryEvent = generateInjuryEvent([teamA, teamB], weatherMods.injuryRisk);

  // Commentary
  const commentary = generateMatchCommentary(venue, matchWeather, topBatName, topBowlName);

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
    stadium: venue.name,
    stadiumCity: venue.city,
    weather: matchWeather,
    weatherLabel: WEATHER_LABEL[matchWeather],
    pitchLabel: PITCH_LABEL[venue.pitchType],
    teamASixes,
    teamBSixes,
    commentary,
    injuryEvent,
    teamAChemistry: chemA,
    teamBChemistry: chemB,
  };
}

// ─── Full Season Simulation ───────────────────────────────────────────────────
export function simulateSeason(teams: TeamState[]): SeasonResult {
  const matches: MatchResult[] = [];
  const injuryReport: string[] = [];
  let matchId = 1;

  // Map home stadiums
  const teamStadiumMap: Record<string, Stadium> = {};
  for (const t of teams) {
    teamStadiumMap[t.id] = getStadiumForTeam(t.shortName);
  }

  // League phase: single round-robin (9 games × 10 teams = 45 matches total)
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const round = Math.floor(matchId / 2) + 1;
      const homeStadium = teamStadiumMap[teams[i].id];
      const weather = getMatchWeather(homeStadium);
      const match = simulateMatch(teams[i], teams[j], matchId++, "league", round, homeStadium, weather);
      matches.push(match);
      if (match.injuryEvent) injuryReport.push(match.injuryEvent);
    }
  }

  // ─── Standings ────────────────────────────────────────────────────────────
  const pointsMap: Record<string, StandingEntry> = {};
  for (const t of teams) {
    pointsMap[t.id] = {
      teamId: t.id, teamName: t.name, shortName: t.shortName, color: t.color,
      played: 0, won: 0, lost: 0, nrr: 0, points: 0,
    };
  }

  for (const m of matches) {
    const winnerT = teams.find(t => t.name === m.winner);
    const loserT  = teams.find(t => t.name === m.loser);
    if (winnerT && pointsMap[winnerT.id]) {
      pointsMap[winnerT.id].won++;
      pointsMap[winnerT.id].points += 2;
      pointsMap[winnerT.id].played++;
      pointsMap[winnerT.id].nrr += +(0.1 + Math.random() * 0.4).toFixed(3);
    }
    if (loserT && pointsMap[loserT.id]) {
      pointsMap[loserT.id].lost++;
      pointsMap[loserT.id].played++;
      pointsMap[loserT.id].nrr -= +(0.1 + Math.random() * 0.35).toFixed(3);
    }
  }

  const standings = Object.values(pointsMap).sort((a, b) =>
    b.points !== a.points ? b.points - a.points : b.nrr - a.nrr
  );

  // ─── Playoffs ─────────────────────────────────────────────────────────────
  const top4 = standings.slice(0, 4)
    .map(s => teams.find(t => t.id === s.teamId)!)
    .filter(Boolean);

  const playoffs: MatchResult[] = [];
  const neutralVenue = randomStadium();

  const q1   = simulateMatch(top4[0], top4[1], matchId++, "qualifier1",  undefined, neutralVenue, "sunny");
  playoffs.push(q1);
  if (q1.injuryEvent) injuryReport.push(q1.injuryEvent);

  const elim = simulateMatch(top4[2], top4[3], matchId++, "eliminator",  undefined, randomStadium(), "sunny");
  playoffs.push(elim);
  if (elim.injuryEvent) injuryReport.push(elim.injuryEvent);

  const q1Loser    = teams.find(t => t.name === q1.loser)   ?? top4[1];
  const elimWinner = teams.find(t => t.name === elim.winner) ?? top4[2];
  const q2 = simulateMatch(q1Loser, elimWinner, matchId++, "qualifier2", undefined, randomStadium(), "sunny");
  playoffs.push(q2);
  if (q2.injuryEvent) injuryReport.push(q2.injuryEvent);

  const finTeamA = teams.find(t => t.name === q1.winner)  ?? top4[0];
  const finTeamB = teams.find(t => t.name === q2.winner)  ?? top4[1];
  const final    = simulateMatch(finTeamA, finTeamB, matchId++, "final", undefined, randomStadium(), "sunny");
  playoffs.push(final);
  if (final.injuryEvent) injuryReport.push(final.injuryEvent);

  const champion     = final.winner;
  const championTeam = teams.find(t => t.name === champion);

  // ─── Season-wide player stats ─────────────────────────────────────────────
  const batterTotals:  Record<string, { runs: number; team: string; sixes: number }> = {};
  const bowlerTotals:  Record<string, { wickets: number; team: string; economy: number }> = {};

  for (const t of teams) {
    for (const p of t.players) {
      const matchesPlayed = 12 + Math.floor(Math.random() * 4);
      const totalRuns = Math.floor(
        (p.battingRating * 0.85 + Math.random() * 60) * (matchesPlayed / 14) * (p.form / 100 + 0.5)
      );
      const sixes = Math.max(0, Math.floor(totalRuns / 18 * Math.random() * 1.4));
      batterTotals[p.name] = { runs: totalRuns, team: t.shortName, sixes };

      const wickets = Math.floor(p.bowlingRating * 0.25 + Math.random() * 14);
      const economy = +(6.5 + Math.random() * 3.5 - p.bowlingRating * 0.02).toFixed(2);
      bowlerTotals[p.name] = { wickets, team: t.shortName, economy };
    }
  }

  // Fallback to match-level data if no squad data
  const allMatchResults = [...matches, ...playoffs];
  if (Object.keys(batterTotals).length === 0) {
    for (const m of allMatchResults) {
      batterTotals[m.topBatsman] ??= { runs: 0, team: m.winnerShort, sixes: 0 };
      batterTotals[m.topBatsman].runs += Math.floor(m.topBatsmanRuns * 0.6);
    }
  }
  if (Object.keys(bowlerTotals).length === 0) {
    for (const m of allMatchResults) {
      bowlerTotals[m.topBowler] ??= { wickets: 0, team: m.winnerShort, economy: m.topBowlerEconomy };
      bowlerTotals[m.topBowler].wickets += m.topBowlerWickets;
    }
  }

  // Compute awards
  let orangeCap = { name: "—", runs: 0, team: "—" };
  let purpleCap = { name: "—", wickets: 0, team: "—" };
  let mostSixesWinner = { name: "—", sixes: 0, team: "—" };
  let bestBowlingFigs = { name: "—", figures: "—", economy: 99, team: "—" };

  for (const [name, d] of Object.entries(batterTotals)) {
    if (d.runs   > orangeCap.runs)           orangeCap = { name, runs: d.runs, team: d.team };
    if (d.sixes  > mostSixesWinner.sixes)    mostSixesWinner = { name, sixes: d.sixes, team: d.team };
  }
  for (const [name, d] of Object.entries(bowlerTotals)) {
    if (d.wickets > purpleCap.wickets)        purpleCap = { name, wickets: d.wickets, team: d.team };
    if (d.wickets >= 8 && d.economy < bestBowlingFigs.economy) {
      bestBowlingFigs = { name, team: d.team, figures: `${d.wickets} wkts @ ${d.economy}`, economy: d.economy };
    }
  }

  // Man of the Series
  const mosName = orangeCap.runs >= 300 ? orangeCap.name : purpleCap.name;
  const mosTeam = orangeCap.runs >= 300 ? orangeCap.team : purpleCap.team;
  const mosContrib = orangeCap.runs >= 300
    ? `${orangeCap.runs} runs in the season`
    : `${purpleCap.wickets} wickets in the season`;

  // Stadium highlights (top 3 highest-scoring matches)
  const stadiumHighlights = [...matches]
    .sort((a, b) => {
      const sa = parseInt(a.teamAScore) + parseInt(a.teamBScore);
      const sb = parseInt(b.teamAScore) + parseInt(b.teamBScore);
      return sb - sa;
    })
    .slice(0, 3)
    .map(m => ({
      stadium: m.stadium,
      weather: m.weatherLabel,
      highScore: m.teamAScore,
      team: m.teamAShort,
    }));

  // Chemistry rankings
  const chemRankings = teams
    .map(t => ({
      team: t.shortName,
      chemistry: calculateChemistry(t),
      bonus: calculateChemistry(t) >= 75 ? "+3% perf" : calculateChemistry(t) >= 60 ? "+1% perf" : "None",
    }))
    .sort((a, b) => b.chemistry - a.chemistry);

  return {
    matches,
    standings,
    playoffs,
    champion,
    championColor: championTeam?.color ?? "#facc15",
    topRunScorer: orangeCap,
    topWicketTaker: purpleCap,
    mostSixes: mostSixesWinner,
    bestBowling: bestBowlingFigs,
    manOfTheSeries: { name: mosName, team: mosTeam, contribution: mosContrib },
    injuryReport: injuryReport.slice(0, 10),
    teamChemistryRankings: chemRankings,
    stadiumHighlights,
  };
}
