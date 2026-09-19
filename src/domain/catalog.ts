import type { LayerKind } from "./map";

export interface CatalogBase {
  id: string;
  label: string;
  category: string;
  layer: LayerKind;
  tags: readonly string[];
}

export type TerrainEdgeStyle = "none" | "soft" | "shore" | "hard";

export interface TerrainDefinition extends CatalogBase {
  layer: "terrain";
  walkable: boolean;
  movementCost: number;
  /**
   * Terrains in the same group visually connect for autotiling.
   * Example: shallow/deep water share the "water" group.
   */
  connectGroup: string;
  edgeStyle: TerrainEdgeStyle;
}

export type PropNetworkKind = "wall" | "fence" | "bridge" | "cliff";

export interface PropNetworkDefinition {
  group: string;
  kind: PropNetworkKind;
}

export interface PropDefinition extends CatalogBase {
  layer: "prop";
  footprint: Readonly<{ width: number; height: number }>;
  blocksMovement: boolean;
  depthBias: number;
  /**
   * Optional logical connectivity. Connected props derive straight/corner/
   * T/cross/end visuals from neighboring instances instead of storing variants.
   */
  network?: Readonly<PropNetworkDefinition>;
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
  connectGroup = id,
  edgeStyle: TerrainEdgeStyle = "soft",
): TerrainDefinition => ({
  id,
  label,
  category,
  layer: "terrain",
  tags: [],
  walkable,
  movementCost,
  connectGroup,
  edgeStyle,
});

const prop = (
  id: string,
  label: string,
  category: string,
  width = 1,
  height = 1,
  blocksMovement = true,
  depthBias = 0,
  network?: Readonly<PropNetworkDefinition>,
): PropDefinition => ({
  id,
  label,
  category,
  layer: "prop",
  tags: [],
  footprint: { width, height },
  blocksMovement,
  depthBias,
  ...(network ? { network } : {}),
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
  terrain("grass", "Meadow Grass", "Nature", true, 1, "grass", "none"),
  terrain("grass-dark", "Forest Grass", "Nature", true, 1, "grass-dark", "soft"),
  terrain("path", "Warm Dirt Path", "Roads", true, 1, "path", "soft"),
  terrain("cobble", "Castle Cobble", "Roads", true, 1, "cobble", "hard"),
  terrain("stone-floor", "Stone Floor", "Interior", true, 1, "stone-floor", "hard"),
  terrain("wood-floor", "Wood Floor", "Interior", true, 1, "wood-floor", "hard"),
  terrain("water", "River Water", "Water", false, 99, "water", "shore"),
  terrain("deep-water", "Deep Water", "Water", false, 99, "water", "shore"),
  terrain("soil", "Farm Soil", "Nature", true, 1, "soil", "soft"),
] as const satisfies readonly TerrainDefinition[];

export const props = [
  prop("tree-round", "Round Tree", "Nature", 1, 2, true, 12),
  prop("tree-pine", "Pine Tree", "Nature", 1, 2, true, 12),
  prop("flowers", "Wild Flowers", "Nature", 1, 1, false, -2),
  prop("rock", "Rock", "Nature"),
  prop("cliff", "Cliff Edge", "Nature", 1, 1, true, 4, { group: "cliff", kind: "cliff" }),
  prop("fence", "Wood Fence", "Village", 1, 1, true, 0, { group: "fence", kind: "fence" }),
  prop("bridge", "Wood Bridge", "Village", 1, 1, false, 3, { group: "bridge", kind: "bridge" }),
  prop("house-blue", "Blue Roof House", "Village", 3, 3, true, 8),
  prop("house-red", "Red Roof House", "Village", 3, 3, true, 8),
  prop("shop-sign", "Shop Sign", "Village", 1, 1, false, 9),
  prop("inn-sign", "Inn Sign", "Village", 1, 1, false, 9),
  prop("crops", "Golden Crops", "Village", 1, 1, false, 2),
  prop("sheep", "Sheep", "Village", 1, 1, true, 10),
  prop("boat", "River Boat", "Village", 2, 1, true, 6),
  prop("castle-wall", "Castle Wall", "Castle", 1, 1, true, 20, { group: "castle-wall", kind: "wall" }),
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
