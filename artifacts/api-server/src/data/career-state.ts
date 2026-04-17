// ─── Career / Season State ────────────────────────────────────────────────────
// In-memory singleton tracking current season simulation results

import type { SeasonResult } from "./match-engine.js";

export interface CareerState {
  seasonNumber: number;
  simulated: boolean;
  result: SeasonResult | null;
}

let careerState: CareerState = {
  seasonNumber: 1,
  simulated: false,
  result: null,
};

export function getCareerState(): CareerState {
  return careerState;
}

export function setCareerResult(result: SeasonResult): void {
  careerState = {
    ...careerState,
    simulated: true,
    result,
  };
}

export function advanceSeason(): void {
  careerState = {
    seasonNumber: careerState.seasonNumber + 1,
    simulated: false,
    result: null,
  };
}

export function resetCareerState(): void {
  careerState = {
    seasonNumber: 1,
    simulated: false,
    result: null,
  };
}
