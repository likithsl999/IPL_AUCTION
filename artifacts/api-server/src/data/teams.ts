// IPL Teams configuration with brand colors and initial settings
export interface TeamConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  maxSquadSize: number;
}

export const IPL_TEAMS: TeamConfig[] = [
  { id: "CSK", name: "Chennai Super Kings", shortName: "CSK", color: "#F9CD1B", maxSquadSize: 25 },
  { id: "MI", name: "Mumbai Indians", shortName: "MI", color: "#004BA0", maxSquadSize: 25 },
  { id: "RCB", name: "Royal Challengers Bengaluru", shortName: "RCB", color: "#EC1C24", maxSquadSize: 25 },
  { id: "KKR", name: "Kolkata Knight Riders", shortName: "KKR", color: "#3A225D", maxSquadSize: 25 },
  { id: "DC", name: "Delhi Capitals", shortName: "DC", color: "#0078BC", maxSquadSize: 25 },
  { id: "RR", name: "Rajasthan Royals", shortName: "RR", color: "#EA1A85", maxSquadSize: 25 },
  { id: "SRH", name: "Sunrisers Hyderabad", shortName: "SRH", color: "#F26522", maxSquadSize: 25 },
  { id: "PBKS", name: "Punjab Kings", shortName: "PBKS", color: "#ED1B24", maxSquadSize: 25 },
  { id: "LSG", name: "Lucknow Super Giants", shortName: "LSG", color: "#00B4D8", maxSquadSize: 25 },
  { id: "GT", name: "Gujarat Titans", shortName: "GT", color: "#1C6DB5", maxSquadSize: 25 },
];
