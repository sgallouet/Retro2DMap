import type { QuarterTurn } from "./geometry";
import type {
  ActorInstance,
  BrushSize,
  GridCoord,
  OverlapPolicy,
} from "./map";

export interface PaintTerrainRectCommand {
  type: "paint-terrain-rect";
  terrainId: string;
  from: GridCoord;
  to: GridCoord;
}

export interface PaintTerrainPathCommand {
  type: "paint-terrain-path";
  terrainId: string;
  points: readonly GridCoord[];
  width: BrushSize;
}

export interface PlacePropCommand {
  type: "place-prop";
  catalogId: string;
  coord: GridCoord;
  rotation?: QuarterTurn;
  overlapPolicy?: OverlapPolicy;
}

export interface PlaceNetworkPathCommand {
  type: "place-network-path";
  catalogId: string;
  points: readonly GridCoord[];
  overlapPolicy?: OverlapPolicy;
}

export interface PlaceActorCommand {
  type: "place-actor";
  catalogId: string;
  coord: GridCoord;
  facing?: ActorInstance["facing"];
}

export interface PlacePrefabCommand {
  type: "place-prefab";
  prefabId: string;
  anchor: GridCoord;
}

export type WorldCommand =
  | PaintTerrainRectCommand
  | PaintTerrainPathCommand
  | PlacePropCommand
  | PlaceNetworkPathCommand
  | PlaceActorCommand
  | PlacePrefabCommand;

export interface CommandExecutionResult {
  ok: boolean;
  changed: boolean;
  reason?: string;
}

export interface CommandBatchResult {
  ok: boolean;
  changed: boolean;
  results: readonly CommandExecutionResult[];
  failedAt?: number;
}
