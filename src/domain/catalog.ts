import type { LayerKind } from "./map";

export interface CatalogBase {
  id: string;
  label: string;
  category: string;
  layer: LayerKind;
  tags: readonly string[];
}

export interface TerrainDefinition extends CatalogBase {
  layer: "terrain";
  walkable: boolean;
  movementCost: number;
}

export interface PropDefinition extends CatalogBase {
  layer: "prop";
  footprint: Readonly<{ width: number; height: number }>;
  blocksMovement: boolean;
  depthBias: number;
}

export interface ActorDefinition extends CatalogBase {
  layer: "actor";
  faction: "neutral" | "kingdom";
}

export type CatalogEntry = TerrainDefinition | PropDefinition | ActorDefinition;

export interface IWorldCatalog {
  readonly terrains: readonly TerrainDefinition[];
  readonly props: readonly PropDefinition[];
  readonly actors: readonly ActorDefinition[];
  get(id: string): CatalogEntry | undefined;
  forLayer(layer: LayerKind): readonly CatalogEntry[];
}

const terrain = (
  id: string,
  label: string,
  category: string,
  walkable: boolean,
  movementCost = 1,
): TerrainDefinition => ({ id, label, category, layer: "terrain", tags: [], walkable, movementCost });

const prop = (
  id: string,
  label: string,
  category: string,
  width = 1,
  height = 1,
  blocksMovement = true,
  depthBias = 0,
): PropDefinition => ({
  id,
  label,
  category,
  layer: "prop",
  tags: [],
  footprint: { width, height },
  blocksMovement,
  depthBias,
});

const actor = (id: string, label: string, category: string, faction: ActorDefinition["faction"]): ActorDefinition => ({
  id,
  label,
  category,
  layer: "actor",
  tags: [],
  faction,
});

export const terrains = [
  terrain("grass", "Meadow Grass", "Nature", true),
  terrain("grass-dark", "Forest Grass", "Nature", true),
  terrain("path", "Warm Dirt Path", "Roads", true),
  terrain("cobble", "Castle Cobble", "Roads", true),
  terrain("stone-floor", "Stone Floor", "Interior", true),
  terrain("wood-floor", "Wood Floor", "Interior", true),
  terrain("water", "River Water", "Water", false, 99),
  terrain("deep-water", "Deep Water", "Water", false, 99),
  terrain("soil", "Farm Soil", "Nature", true),
] as const satisfies readonly TerrainDefinition[];

export const props = [
  prop("tree-round", "Round Tree", "Nature", 1, 2, true, 12),
  prop("tree-pine", "Pine Tree", "Nature", 1, 2, true, 12),
  prop("flowers", "Wild Flowers", "Nature", 1, 1, false, -2),
  prop("rock", "Rock", "Nature"),
  prop("cliff", "Cliff Edge", "Nature", 1, 1, true, 4),
  prop("fence", "Wood Fence", "Village"),
  prop("bridge", "Wood Bridge", "Village", 1, 1, false, 3),
  prop("house-blue", "Blue Roof House", "Village", 3, 3, true, 8),
  prop("house-red", "Red Roof House", "Village", 3, 3, true, 8),
  prop("shop-sign", "Shop Sign", "Village", 1, 1, false, 9),
  prop("inn-sign", "Inn Sign", "Village", 1, 1, false, 9),
  prop("crops", "Golden Crops", "Village", 1, 1, false, 2),
  prop("sheep", "Sheep", "Village", 1, 1, true, 10),
  prop("boat", "River Boat", "Village", 2, 1, true, 6),
  prop("castle-wall", "Castle Wall", "Castle", 1, 1, true, 20),
  prop("castle-tower", "Round Tower", "Castle", 2, 3, true, 30),
  prop("castle-gate", "Castle Gate", "Castle", 2, 2, true, 24),
  prop("stairs", "Stone Stairs", "Castle", 2, 1, false, 5),
  prop("banner", "Royal Banner", "Castle", 1, 1, false, 22),
  prop("torch", "Wall Torch", "Castle", 1, 1, false, 23),
  prop("fountain", "Blue Fountain", "Castle", 2, 2, true, 8),
  prop("statue", "Lion Statue", "Castle", 1, 1, true, 12),
  prop("bookshelf", "Bookshelf", "Interior", 2, 1, true, 8),
  prop("table", "Long Table", "Interior", 3, 1, true, 8),
  prop("bed-red", "Red Bed", "Interior", 1, 2, true, 8),
  prop("bed-blue", "Blue Bed", "Interior", 1, 2, true, 8),
  prop("throne", "Royal Throne", "Interior", 1, 2, true, 14),
  prop("weapon-rack", "Weapon Rack", "Interior", 2, 1, true, 9),
  prop("barrels", "Barrels", "Interior", 1, 1, true, 7),
  prop("rug-red", "Red Rug", "Interior", 1, 1, false, -1),
] as const satisfies readonly PropDefinition[];

export const actors = [
  actor("hero", "Adventurer", "People", "neutral"),
  actor("villager-f", "Villager", "People", "neutral"),
  actor("villager-m", "Villager", "People", "neutral"),
  actor("farmer", "Farmer", "People", "neutral"),
  actor("guard", "Royal Guard", "Kingdom", "kingdom"),
  actor("king", "King", "Kingdom", "kingdom"),
  actor("scholar", "Scholar", "People", "neutral"),
] as const satisfies readonly ActorDefinition[];

const all: readonly CatalogEntry[] = [...terrains, ...props, ...actors];
const byId = new Map(all.map((entry) => [entry.id, entry]));

export const worldCatalog: IWorldCatalog = {
  terrains,
  props,
  actors,
  get: (id) => byId.get(id),
  forLayer: (layer) => all.filter((entry) => entry.layer === layer),
};
