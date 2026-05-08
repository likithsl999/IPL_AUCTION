// ─── IPL Stadium System ────────────────────────────────────────────────────────
// Real IPL venues with pitch types, weather tendencies, and match modifiers

export type PitchType = "batting" | "pace" | "spin" | "balanced";
export type BoundarySize = "large" | "medium" | "small";
export type WeatherCondition = "sunny" | "cloudy" | "humid" | "overcast" | "dew";

export interface Stadium {
  id: string;
  name: string;
  shortName: string;
  city: string;
  homeTeam: string; // IPL team short name
  capacity: number;
  pitchType: PitchType;
  boundarySize: BoundarySize;
  avgFirstInnings: number; // typical first innings score
  dewFactor: boolean; // evening dew advantages chasing team
  description: string;
}

export interface WeatherModifiers {
  battingBonus: number;    // score multiplier
  swingBonus: number;      // swing bowling effectiveness
  spinBonus: number;       // spin bowling effectiveness
  chasingAdvantage: number; // runs advantage for chasing team
  injuryRisk: number;      // 0-1 chance of an injury
}

// ─── Real IPL Stadiums ───────────────────────────────────────────────────────
export const IPL_STADIUMS: Stadium[] = [
  {
    id: "wankhede",
    name: "Wankhede Stadium",
    shortName: "Wankhede",
    city: "Mumbai",
    homeTeam: "MI",
    capacity: 33108,
    pitchType: "batting",
    boundarySize: "small",
    avgFirstInnings: 178,
    dewFactor: true,
    description: "High-scoring venue — small boundaries and heavy dew favour chasers",
  },
  {
    id: "chinnaswamy",
    name: "M. Chinnaswamy Stadium",
    shortName: "Chinnaswamy",
    city: "Bangalore",
    homeTeam: "RCB",
    capacity: 40000,
    pitchType: "batting",
    boundarySize: "small",
    avgFirstInnings: 182,
    dewFactor: false,
    description: "Highest-scoring IPL venue — altitude and short straight boundaries",
  },
  {
    id: "chepauk",
    name: "MA Chidambaram Stadium",
    shortName: "Chepauk",
    city: "Chennai",
    homeTeam: "CSK",
    capacity: 50000,
    pitchType: "spin",
    boundarySize: "medium",
    avgFirstInnings: 158,
    dewFactor: true,
    description: "Spin paradise — humid conditions and slow surface help wrist spinners",
  },
  {
    id: "eden_gardens",
    name: "Eden Gardens",
    shortName: "Eden Gardens",
    city: "Kolkata",
    homeTeam: "KKR",
    capacity: 66349,
    pitchType: "balanced",
    boundarySize: "large",
    avgFirstInnings: 165,
    dewFactor: true,
    description: "India's largest ground — raucous atmosphere and evening dew test teams",
  },
  {
    id: "kotla",
    name: "Arun Jaitley Stadium",
    shortName: "Kotla",
    city: "Delhi",
    homeTeam: "DC",
    capacity: 41820,
    pitchType: "pace",
    boundarySize: "medium",
    avgFirstInnings: 170,
    dewFactor: false,
    description: "Pace and seam movement early — dry Delhi heat dries out pitch quickly",
  },
  {
    id: "uppal",
    name: "Rajiv Gandhi Int. Cricket Stadium",
    shortName: "Uppal",
    city: "Hyderabad",
    homeTeam: "SRH",
    capacity: 55000,
    pitchType: "batting",
    boundarySize: "large",
    avgFirstInnings: 170,
    dewFactor: true,
    description: "Flat decks with large outfield — bowlers need discipline to defend here",
  },
  {
    id: "mohali",
    name: "Punjab Cricket Association Stadium",
    shortName: "Mohali",
    city: "Mohali",
    homeTeam: "PBKS",
    capacity: 26950,
    pitchType: "pace",
    boundarySize: "large",
    avgFirstInnings: 164,
    dewFactor: false,
    description: "Pace and bounce in Punjab — cold evenings don't produce dew",
  },
  {
    id: "sawai_mansingh",
    name: "Sawai Mansingh Stadium",
    shortName: "SMS Stadium",
    city: "Jaipur",
    homeTeam: "RR",
    capacity: 23185,
    pitchType: "spin",
    boundarySize: "medium",
    avgFirstInnings: 161,
    dewFactor: false,
    description: "Spin-friendly track in the desert city — slowness keeps scores down",
  },
  {
    id: "narendra_modi",
    name: "Narendra Modi Stadium",
    shortName: "NM Stadium",
    city: "Ahmedabad",
    homeTeam: "GT",
    capacity: 132000,
    pitchType: "balanced",
    boundarySize: "large",
    avgFirstInnings: 166,
    dewFactor: false,
    description: "World's largest stadium — dry climate produces pace and carry off the surface",
  },
  {
    id: "ekana",
    name: "BRSABV Ekana Cricket Stadium",
    shortName: "Ekana",
    city: "Lucknow",
    homeTeam: "LSG",
    capacity: 50000,
    pitchType: "balanced",
    boundarySize: "medium",
    avgFirstInnings: 163,
    dewFactor: true,
    description: "Modern multi-purpose venue — even contest between bat and ball, evening dew helps",
  },
];

// ─── Stadium Helpers ─────────────────────────────────────────────────────────
export function getRandomStadium(): Stadium {
  return IPL_STADIUMS[Math.floor(Math.random() * IPL_STADIUMS.length)];
}

export function getStadiumForTeam(teamShort: string): Stadium {
  return IPL_STADIUMS.find(s => s.homeTeam === teamShort) ?? getRandomStadium();
}

// ─── Weather System ──────────────────────────────────────────────────────────
export function getMatchWeather(stadium: Stadium): WeatherCondition {
  const { city } = stadium;
  const r = Math.random();
  if (city === "Mumbai" || city === "Chennai" || city === "Kolkata") {
    return r < 0.30 ? "humid" : r < 0.55 ? "cloudy" : r < 0.75 ? "overcast" : "sunny";
  }
  if (city === "Bangalore") {
    return r < 0.20 ? "overcast" : r < 0.40 ? "cloudy" : "sunny";
  }
  // Dry cities (Delhi, Mohali, Ahmedabad, Jaipur)
  if (stadium.dewFactor && r < 0.25) return "dew";
  return r < 0.65 ? "sunny" : r < 0.80 ? "cloudy" : "overcast";
}

export function getWeatherModifiers(weather: WeatherCondition, stadium: Stadium): WeatherModifiers {
  switch (weather) {
    case "sunny":
      return { battingBonus: 1.05, swingBonus: 0.90, spinBonus: 1.00, chasingAdvantage: 0, injuryRisk: 0.04 };
    case "cloudy":
      return { battingBonus: 0.97, swingBonus: 1.18, spinBonus: 0.95, chasingAdvantage: 0, injuryRisk: 0.03 };
    case "humid":
      return { battingBonus: 0.95, swingBonus: 1.12, spinBonus: 1.15, chasingAdvantage: stadium.dewFactor ? 6 : 0, injuryRisk: 0.05 };
    case "overcast":
      return { battingBonus: 0.92, swingBonus: 1.25, spinBonus: 0.90, chasingAdvantage: 0, injuryRisk: 0.03 };
    case "dew":
      return { battingBonus: 1.08, swingBonus: 0.70, spinBonus: 0.80, chasingAdvantage: 12, injuryRisk: 0.02 };
    default:
      return { battingBonus: 1.0, swingBonus: 1.0, spinBonus: 1.0, chasingAdvantage: 0, injuryRisk: 0.03 };
  }
}

export const WEATHER_EMOJI: Record<WeatherCondition, string> = {
  sunny:    "☀️",
  cloudy:   "⛅",
  humid:    "💧",
  overcast: "☁️",
  dew:      "🌙",
};

export const WEATHER_LABEL: Record<WeatherCondition, string> = {
  sunny:    "Sunny",
  cloudy:   "Cloudy",
  humid:    "Humid",
  overcast: "Overcast",
  dew:      "Heavy Dew",
};

export const PITCH_LABEL: Record<PitchType, string> = {
  batting:  "🏏 Batting Paradise",
  pace:     "💨 Pace Friendly",
  spin:     "🌀 Spin Friendly",
  balanced: "⚖️ Balanced",
};
