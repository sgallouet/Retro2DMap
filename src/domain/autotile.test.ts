import { describe, expect, it } from "vitest";
import { worldCatalog } from "./catalog";
import {
  ALL_CARDINAL,
  EAST,
  NORTH,
  NORTH_EAST,
  SOUTH,
  WEST,
  PropTopologyResolver,
  TerrainTopologyResolver,
  classifyNetwork,
  innerCornerMaskOf,
} from "./autotile";
import { createBlankMap } from "./map";

describe("terrain topology", () => {
  it("detects an inner corner when cardinal neighbors connect but the diagonal does not", () => {
    const mask = NORTH | EAST;
    expect(innerCornerMaskOf(mask) & NORTH_EAST).toBe(NORTH_EAST);
  });

  it("does not create an inner corner when the matching diagonal connects", () => {
    const mask = NORTH | EAST | NORTH_EAST;
    expect(innerCornerMaskOf(mask) & NORTH_EAST).toBe(0);
  });

  it("maps a single exposed north side to the NORTH open-edge bit", () => {
    const map = createBlankMap(3, 3, "grass");
    map.tiles[0 * map.width + 1] = { terrainId: "path" };

    const grass = worldCatalog.get("grass");
    if (!grass || grass.layer !== "terrain") throw new Error("grass definition missing");

    const topology = new TerrainTopologyResolver(worldCatalog).resolve(
      map,
      { x: 1, y: 1 },
      grass,
    );

    expect(topology.openMask).toBe(NORTH);
  });

  it("maps an outer north-west corner to two exposed cardinal sides", () => {
    const map = createBlankMap(3, 3, "path");
    map.tiles[1 * map.width + 1] = { terrainId: "grass" };
    map.tiles[1 * map.width + 2] = { terrainId: "grass" };
    map.tiles[2 * map.width + 1] = { terrainId: "grass" };

    const grass = worldCatalog.get("grass");
    if (!grass || grass.layer !== "terrain") throw new Error("grass definition missing");

    const topology = new TerrainTopologyResolver(worldCatalog).resolve(
      map,
      { x: 1, y: 1 },
      grass,
    );

    expect(topology.openMask).toBe(NORTH | WEST);
  });

  it("keeps cardinal sides closed while mapping a missing diagonal as an inner corner", () => {
    const map = createBlankMap(3, 3, "grass");
    map.tiles[0 * map.width + 2] = { terrainId: "path" };

    const grass = worldCatalog.get("grass");
    if (!grass || grass.layer !== "terrain") throw new Error("grass definition missing");

    const topology = new TerrainTopologyResolver(worldCatalog).resolve(
      map,
      { x: 1, y: 1 },
      grass,
    );

    expect(topology.openMask).toBe(0);
    expect(topology.cardinalMask).toBe(ALL_CARDINAL);
    expect(topology.innerCornerMask & NORTH_EAST).toBe(NORTH_EAST);
  });

  it("connects different terrain IDs that share a semantic connect group", () => {
    const map = createBlankMap(3, 3, "grass");
    map.tiles[1 * map.width + 1] = { terrainId: "water" };
    map.tiles[0 * map.width + 1] = { terrainId: "deep-water" };

    const water = worldCatalog.get("water");
    if (!water || water.layer !== "terrain") throw new Error("water definition missing");

    const topology = new TerrainTopologyResolver(worldCatalog).resolve(map, { x: 1, y: 1 }, water);
    expect(topology.cardinalMask & NORTH).toBe(NORTH);
  });
});

describe("connected prop topology", () => {
  it.each([
    [0, "isolated", 0],
    [NORTH, "end", 0],
    [EAST, "end", 90],
    [NORTH | SOUTH, "straight", 0],
    [EAST | WEST, "straight", 90],
    [NORTH | EAST, "corner", 0],
    [EAST | SOUTH, "corner", 90],
    [NORTH | EAST | WEST, "tee", 0],
    [NORTH | EAST | SOUTH | WEST, "cross", 0],
  ] as const)("classifies mask %i as %s", (mask, role, rotation) => {
    const topology = classifyNetwork(mask);
    expect(topology.role).toBe(role);
    expect(topology.rotation).toBe(rotation);
  });

  it("derives fence connectivity from neighboring semantic props", () => {
    const map = createBlankMap(5, 5, "grass");
    map.props = [
      { id: "center", catalogId: "fence", x: 2, y: 2 },
      { id: "north", catalogId: "fence", x: 2, y: 1 },
      { id: "east", catalogId: "fence", x: 3, y: 2 },
    ];

    const definition = worldCatalog.get("fence");
    if (!definition || definition.layer !== "prop") throw new Error("fence definition missing");

    const topology = new PropTopologyResolver(worldCatalog).resolve(
      map,
      map.props[0]!,
      definition,
    );

    expect(topology?.neighborMask).toBe(NORTH | EAST);
    expect(topology?.role).toBe("corner");
  });

  it("does not connect unrelated prop network groups", () => {
    const map = createBlankMap(5, 5, "grass");
    map.props = [
      { id: "wall", catalogId: "castle-wall", x: 2, y: 2 },
      { id: "fence", catalogId: "fence", x: 3, y: 2 },
    ];

    const definition = worldCatalog.get("castle-wall");
    if (!definition || definition.layer !== "prop") throw new Error("wall definition missing");

    const topology = new PropTopologyResolver(worldCatalog).resolve(
      map,
      map.props[0]!,
      definition,
    );

    expect(topology?.neighborMask).toBe(0);
    expect(topology?.role).toBe("isolated");
  });
});
