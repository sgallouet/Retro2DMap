import type { WorldCommand } from "../domain/commands";
import { worldCatalog } from "../domain/catalog";
import { WorldCommandExecutor } from "../editor/WorldCommandExecutor";
import { prefabCatalog } from "../prefabs/catalog";
import { createBlankMap, type ActorInstance, type MapDocument, type PropInstance } from "../domain/map";

const WIDTH = 40;
const HEIGHT = 30;
type Coord = Readonly<{ x: number; y: number }>;

const rect = (terrainId: string, x: number, y: number, width: number, height: number): WorldCommand => ({
  type: "paint-terrain-rect",
  terrainId,
  from: { x, y },
  to: { x: x + width - 1, y: y + height - 1 },
});

const path = (terrainId: string, points: readonly Coord[], width: 1 | 3 | 5 = 1): WorldCommand => ({
  type: "paint-terrain-path",
  terrainId,
  points,
  width,
});

const prop = (catalogId: string, x: number, y: number, rotation?: PropInstance["rotation"]): WorldCommand => ({
  type: "place-prop",
  catalogId,
  coord: { x, y },
  ...(rotation === undefined ? {} : { rotation }),
});

const network = (catalogId: string, points: readonly Coord[]): WorldCommand => ({
  type: "place-network-path",
  catalogId,
  points,
  overlapPolicy: "reject",
});

const actor = (catalogId: string, x: number, y: number, facing: ActorInstance["facing"] = "south"): WorldCommand => ({
  type: "place-actor",
  catalogId,
  coord: { x, y },
  facing,
});

const describeCommand = (command: WorldCommand): string => {
  switch (command.type) {
    case "paint-terrain-rect":
      return `${command.type} '${command.terrainId}' ${command.from.x},${command.from.y}→${command.to.x},${command.to.y}`;
    case "paint-terrain-path":
      return `${command.type} '${command.terrainId}' ${command.points.map((point) => `${point.x},${point.y}`).join(" → ")}`;
    case "place-network-path":
      return `${command.type} '${command.catalogId}' ${command.points.map((point) => `${point.x},${point.y}`).join(" → ")}`;
    case "place-prop":
      return `${command.type} '${command.catalogId}' at ${command.coord.x},${command.coord.y}`;
    case "place-actor":
      return `${command.type} '${command.catalogId}' at ${command.coord.x},${command.coord.y}`;
    case "place-prefab":
      return `${command.type} '${command.prefabId}' at ${command.anchor.x},${command.anchor.y}`;
  }
};

/** Editable semantic composition for Reference Map 01. */
export function createSampleKingdom(): MapDocument {
  const map = createBlankMap(WIDTH, HEIGHT, "grass");
  map.id = "reference-map-01";
  map.name = "Reference Map 01 · River Castle";

  const executor = new WorldCommandExecutor(worldCatalog, prefabCatalog);
  const runSection = (name: string, commands: readonly WorldCommand[]): void => {
    const result = executor.executeAtomic(map, commands);
    if (result.ok) return;
    const index = result.failedAt ?? 0;
    const command = commands[index];
    const detail = command ? describeCommand(command) : "unknown command";
    const reason = result.results[index]?.reason ?? "unknown failure";
    throw new Error(`Reference map section '${name}' failed at command ${index}: ${detail} (${reason})`);
  };

  // Terrain first: all semantic surfaces exist before entity placement.
  runSection("terrain/base", [
    // Forest/meadow substrate follows the visible wooded banks and south edge.
    rect("grass-dark", 0, 0, 5, 4),
    rect("grass-dark", 7, 0, 5, 4),
    rect("grass-dark", 0, 22, 16, 8),
    rect("grass-dark", 31, 23, 9, 7),

    // Castle ground footprint. Walls and towers remain frozen props over this.
    rect("cobble", 12, 0, 28, 1),
    rect("cobble", 12, 1, 3, 18),
    rect("cobble", 38, 1, 2, 19),
    rect("stone-floor", 15, 1, 23, 11),
    rect("wood-floor", 15, 2, 6, 5),
    rect("wood-floor", 15, 7, 6, 4),
    rect("wood-floor", 32, 2, 6, 5),
    rect("wood-floor", 32, 7, 6, 4),
    rect("cobble", 12, 11, 28, 2),
    rect("cobble", 14, 13, 5, 4),
    rect("cobble", 24, 13, 6, 4),
    rect("cobble", 35, 13, 5, 4),
    rect("grass", 19, 13, 5, 4),
    rect("grass", 30, 13, 5, 4),
    rect("cobble", 14, 17, 24, 3),
    rect("cobble", 24, 19, 6, 1),

    // Water is deliberately stepped: source, bend, narrow south channel, then moat.
    rect("deep-water", 5, 0, 2, 3),
    rect("water", 5, 3, 9, 2),
    rect("deep-water", 7, 3, 5, 2),
    rect("water", 8, 5, 5, 8),
    rect("deep-water", 9, 5, 3, 8),
    rect("water", 8, 13, 4, 2),
    rect("deep-water", 9, 13, 2, 2),
    rect("water", 8, 15, 3, 5),
    rect("deep-water", 9, 15, 1, 5),
    rect("water", 15, 15, 2, 5),
    rect("water", 8, 20, 32, 3),
    rect("deep-water", 10, 21, 29, 2),
  ]);

  runSection("terrain/routes", [
    path("path", [{ x: 2, y: 7 }, { x: 2, y: 23 }]),
    path("path", [{ x: 0, y: 9 }, { x: 7, y: 9 }]),
    path("path", [{ x: 0, y: 14 }, { x: 7, y: 14 }]),
    path("path", [{ x: 0, y: 19 }, { x: 7, y: 19 }]),
    path("path", [{ x: 0, y: 23 }, { x: 14, y: 23 }]),
    path("path", [{ x: 0, y: 24 }, { x: 39, y: 24 }]),
    path("path", [{ x: 5, y: 23 }, { x: 5, y: 29 }]),
    rect("path", 25, 23, 3, 7),
    rect("soil", 1, 25, 4, 5),
    rect("soil", 6, 25, 2, 5),
  ]);

  // Structural networks and openings.
  runSection("structure/castle", [
    network("castle-wall", [{ x: 16, y: 1 }, { x: 37, y: 1 }]),
    network("castle-wall", [{ x: 16, y: 2 }, { x: 16, y: 11 }]),
    network("castle-wall", [{ x: 16, y: 13 }, { x: 16, y: 17 }]),
    network("castle-wall", [{ x: 37, y: 2 }, { x: 37, y: 18 }]),
    network("castle-wall", [{ x: 16, y: 18 }, { x: 22, y: 18 }]),
    network("castle-wall", [{ x: 32, y: 18 }, { x: 37, y: 18 }]),
    network("castle-wall", [{ x: 23, y: 2 }, { x: 23, y: 4 }]),
    network("castle-wall", [{ x: 23, y: 6 }, { x: 23, y: 8 }]),
    network("castle-wall", [{ x: 23, y: 10 }, { x: 23, y: 10 }]),
    network("castle-wall", [{ x: 31, y: 2 }, { x: 31, y: 4 }]),
    network("castle-wall", [{ x: 31, y: 6 }, { x: 31, y: 8 }]),
    network("castle-wall", [{ x: 31, y: 10 }, { x: 31, y: 10 }]),
    network("castle-wall", [{ x: 17, y: 7 }, { x: 19, y: 7 }]),
    network("castle-wall", [{ x: 21, y: 7 }, { x: 22, y: 7 }]),
    network("castle-wall", [{ x: 32, y: 7 }, { x: 33, y: 7 }]),
    network("castle-wall", [{ x: 35, y: 7 }, { x: 36, y: 7 }]),
    network("castle-wall", [{ x: 17, y: 11 }, { x: 21, y: 11 }]),
    network("castle-wall", [{ x: 23, y: 11 }, { x: 23, y: 11 }]),
    network("castle-wall", [{ x: 31, y: 11 }, { x: 31, y: 11 }]),
    network("castle-wall", [{ x: 33, y: 11 }, { x: 36, y: 11 }]),
    prop("castle-tower", 14, 0),
    prop("castle-tower", 38, 0),
    prop("castle-tower", 14, 17),
    prop("castle-tower", 38, 17),
    prop("castle-tower", 23, 17),
    prop("castle-tower", 30, 17),
    prop("castle-gate", 26, 17),
    prop("stairs", 26, 19),
    network("bridge", [{ x: 10, y: 12 }, { x: 13, y: 12 }]),
    network("bridge", [{ x: 26, y: 20 }, { x: 26, y: 22 }]),
    network("bridge", [{ x: 27, y: 20 }, { x: 27, y: 22 }]),
    network("garden-border", [{ x: 20, y: 13 }, { x: 24, y: 13 }]),
    network("garden-border", [{ x: 20, y: 16 }, { x: 24, y: 16 }]),
    network("garden-border", [{ x: 20, y: 13 }, { x: 20, y: 16 }]),
    network("garden-border", [{ x: 24, y: 13 }, { x: 24, y: 16 }]),
    network("garden-border", [{ x: 31, y: 13 }, { x: 35, y: 13 }]),
    network("garden-border", [{ x: 31, y: 16 }, { x: 35, y: 16 }]),
    network("garden-border", [{ x: 31, y: 13 }, { x: 31, y: 16 }]),
    network("garden-border", [{ x: 35, y: 13 }, { x: 35, y: 16 }]),
  ]);

  runSection("structure/farm", [
    network("fence", [{ x: 0, y: 24 }, { x: 4, y: 24 }]),
    network("fence", [{ x: 6, y: 24 }, { x: 7, y: 24 }]),
    network("fence", [{ x: 9, y: 24 }, { x: 14, y: 24 }]),
    network("fence", [{ x: 9, y: 28 }, { x: 14, y: 28 }]),
    network("fence", [{ x: 9, y: 24 }, { x: 9, y: 26 }]),
    network("fence", [{ x: 9, y: 28 }, { x: 9, y: 28 }]),
    network("fence", [{ x: 14, y: 24 }, { x: 14, y: 28 }]),
  ]);

  runSection("props/landmarks", [
    prop("waterfall", 11, 2),
    prop("fountain", 26, 14),
    prop("dock", 35, 20),
    prop("boat", 38, 20, 0),
    prop("house-blue", 5, 2),
    prop("house-blue", 1, 5),
    prop("house-blue", 1, 11),
    prop("house-red", 1, 16),
  ]);

  runSection("props/castle-interiors", [
    prop("throne", 26, 2),
    prop("banner", 25, 2),
    prop("banner", 30, 2),
    prop("pillar", 25, 5),
    prop("pillar", 29, 5),
    prop("pillar", 25, 8),
    prop("pillar", 29, 8),
    prop("torch", 24, 3),
    prop("torch", 30, 3),
    prop("torch", 24, 10),
    prop("torch", 30, 10),
    prop("candelabra", 25, 7),
    prop("candelabra", 29, 7),
    prop("bookshelf", 17, 2),
    prop("bookshelf", 20, 2),
    prop("table", 18, 4),
    prop("potted-flowers", 17, 5),
    prop("bed-red", 18, 8),
    prop("bed-blue", 20, 8),
    prop("potted-flowers", 22, 8),
    prop("barrels", 21, 10),
    prop("painting", 33, 2),
    prop("table", 33, 4),
    prop("candelabra", 34, 5),
    prop("torch", 32, 2),
    prop("torch", 36, 2),
    prop("weapon-rack", 32, 8),
    prop("barrels", 36, 9),
    prop("torch", 35, 8),
    prop("banner", 22, 12),
    prop("banner", 33, 12),
  ]);

  runSection("props/royal-surface", [
    ...Array.from({ length: 7 }, (_, index) => network("rug-red", [{ x: 26, y: 4 + index }, { x: 27, y: 4 + index }])),
    prop("stairs", 26, 11),
    prop("tree-pine", 21, 14),
    prop("statue", 23, 15),
    prop("flowers", 22, 14),
    prop("flowers", 22, 15),
    prop("flowers", 23, 14),
    prop("tree-pine", 34, 14),
    prop("statue", 32, 15),
    prop("flowers", 32, 14),
    prop("flowers", 33, 14),
    prop("flowers", 33, 15),
  ]);

  runSection("props/village-and-forest", [
    prop("inn-sign", 3, 8),
    prop("shop-sign", 3, 19),
    prop("cliff", 9, 4),
    prop("cliff", 14, 4),
    prop("cliff", 9, 7),
    prop("cliff", 14, 7),
    prop("cliff", 9, 16),
    prop("cliff", 14, 16),
    prop("cliff", 9, 18),
    prop("tree-round", 0, 0),
    prop("tree-round", 2, 0),
    prop("tree-pine", 4, 0),
    prop("tree-round", 7, 0),
    prop("tree-round", 8, 3),
    prop("tree-round", 4, 8),
    prop("tree-pine", 8, 8),
    prop("tree-round", 4, 15),
    prop("tree-round", 8, 15),
    prop("tree-pine", 0, 22),
    prop("tree-round", 15, 24),
    prop("tree-pine", 17, 24),
    prop("tree-round", 19, 23),
    prop("tree-pine", 21, 25),
    prop("tree-round", 23, 24),
    prop("tree-round", 24, 27),
    prop("tree-round", 30, 24),
    prop("tree-pine", 32, 25),
    prop("tree-round", 34, 24),
    prop("tree-round", 36, 25),
    prop("tree-pine", 38, 24),
    prop("tree-round", 31, 27),
    prop("tree-round", 33, 28),
    prop("tree-round", 35, 27),
    prop("tree-pine", 37, 28),
    prop("flowers", 3, 9),
    prop("flowers", 5, 9),
    prop("flowers", 7, 9),
    prop("flowers", 8, 10),
    prop("flowers", 4, 14),
    prop("flowers", 7, 14),
    prop("flowers", 7, 16),
    prop("flowers", 9, 17),
    prop("flowers", 3, 20),
    prop("flowers", 7, 20),
    prop("flowers", 8, 21),
    prop("flowers", 12, 23),
    prop("flowers", 16, 23),
    prop("flowers", 18, 25),
    prop("flowers", 20, 24),
    prop("flowers", 22, 26),
    prop("flowers", 24, 24),
    prop("flowers", 29, 23),
    prop("flowers", 31, 23),
    prop("flowers", 33, 23),
    prop("flowers", 35, 23),
    prop("flowers", 37, 23),
  ]);

  runSection("props/farm", [
    ...Array.from({ length: 5 }, (_, y) => Array.from({ length: 4 }, (_, x) => prop("crops", 1 + x, 25 + y))).flat(),
    ...Array.from({ length: 5 }, (_, y) => Array.from({ length: 2 }, (_, x) => prop("crops", 6 + x, 25 + y))).flat(),
    prop("sheep", 11, 25),
    prop("sheep", 12, 26),
  ]);

  runSection("actors", [
    actor("king", 27, 4, "south"),
    actor("guard", 24, 4, "east"),
    actor("guard", 30, 4, "west"),
    actor("guard", 24, 10, "east"),
    actor("guard", 30, 10, "west"),
    actor("hero", 27, 10, "north"),
    actor("scholar", 21, 5, "west"),
    actor("villager-f", 35, 3, "south"),
    actor("guard", 34, 9, "west"),
    actor("villager-f", 2, 9, "south"),
    actor("villager-m", 8, 11, "west"),
    actor("guard", 9, 17, "north"),
    actor("villager-f", 4, 19, "north"),
    actor("farmer", 5, 27, "east"),
    actor("guard", 25, 19, "east"),
    actor("guard", 28, 19, "west"),
  ]);

  return map;
}
