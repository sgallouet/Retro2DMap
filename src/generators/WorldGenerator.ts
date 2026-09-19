import type { GridCoord } from "../domain/map";
import type { WorldCommand } from "../domain/commands";

export interface GenerationRegion {
  origin: GridCoord;
  width: number;
  height: number;
}

export interface GenerationRequest {
  region: GenerationRegion;
  seed: number;
}

export interface GenerationPlan {
  id: string;
  label: string;
  commands: readonly WorldCommand[];
}

export interface IWorldGenerator {
  plan(request: GenerationRequest): GenerationPlan;
}
