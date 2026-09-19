import type { ActorInstance, GridCoord, OverlapPolicy } from "./map";

export interface PrefabTerrainPatch {
  terrainId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrefabPropStamp {
  catalogId: string;
  x: number;
  y: number;
}

export interface PrefabNetworkStroke {
  catalogId: string;
  points: readonly GridCoord[];
}

export interface PrefabActorStamp {
  catalogId: string;
  x: number;
  y: number;
  facing?: ActorInstance["facing"];
}

export interface PrefabDefinition {
  id: string;
  label: string;
  category: string;
  width: number;
  height: number;
  tags: readonly string[];
  terrain: readonly PrefabTerrainPatch[];
  props: readonly PrefabPropStamp[];
  networks: readonly PrefabNetworkStroke[];
  actors: readonly PrefabActorStamp[];
  overlapPolicy: OverlapPolicy;
}

export interface IPrefabCatalog {
  readonly all: readonly PrefabDefinition[];
  get(id: string): PrefabDefinition | undefined;
  byCategory(category: string): readonly PrefabDefinition[];
}
