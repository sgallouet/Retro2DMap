import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import {
  EAST,
  NORTH,
  SOUTH,
  WEST,
  TerrainTopologyResolver,
} from "../domain/autotile";
import { tileAt } from "../domain/map";
import { createTerrainStudy } from "./terrainStudy";

describe("Terrain topology study", () => {
  it("contains the required semantic materials and no entities", () => {
    const map = createTerrainStudy();
    const validTerrainIds = new Set(worldCatalog.terrains.map((terrain) => terrain.id));

    expect(map.width).toBe(24);
    expect(map.height).toBe(18);
    expect(map.tiles).toHaveLength(24 * 18);
    expect(map.tiles.every((tile) => tile.terrainId !== undefined && validTerrainIds.has(tile.terrainId))).toBe(true);
    expect(map.props).toEqual([]);
    expect(map.actors).toEqual([]);

    expect(tileAt(map, { x: 2, y: 2 })?.terrainId).toBe("grass");
    expect(tileAt(map, { x: 8, y: 1 })?.terrainId).toBe("path");
    expect(tileAt(map, { x: 20, y: 1 })?.terrainId).toBe("cobble");
    expect(tileAt(map, { x: 6, y: 12 })?.terrainId).toBe("wood-floor");
    expect(tileAt(map, { x: 10, y: 12 })?.terrainId).toBe("stone-floor");
    expect(tileAt(map, { x: 16, y: 14 })?.terrainId).toBe("deep-water");
  });

  it("exposes junction, corridor, concave-hole, and shared-water topology", () => {
    const map = createTerrainStudy();
    const resolver = new TerrainTopologyResolver(worldCatalog);
    const resolve = (x: number, y: number) => {
      const cell = tileAt(map, { x, y });
      if (!cell) throw new Error(`Missing study cell at ${x},${y}`);
      const terrain = cell.terrainId ? worldCatalog.get(cell.terrainId) : undefined;
      if (!terrain || terrain.layer !== "terrain") throw new Error(`Invalid terrain at ${x},${y}`);
      return resolver.resolve(map, { x, y }, terrain);
    };

    expect(resolve(1, 8).cardinalMask).toBe(NORTH | EAST);
    expect(resolve(8, 8).cardinalMask).toBe(NORTH | EAST | WEST);
    expect(resolve(14, 8).cardinalMask).toBe(NORTH | EAST | SOUTH | WEST);
    expect(resolve(18, 8).cardinalMask).toBe(NORTH | EAST | SOUTH);
    expect(resolve(10, 1).cardinalMask & WEST).toBe(0);
    expect(resolve(17, 3).cardinalMask).toBe(NORTH | SOUTH);

    expect(resolve(21, 8).innerCornerMask).not.toBe(0);
    expect(resolve(16, 14).cardinalMask & (NORTH | SOUTH)).toBe(NORTH | SOUTH);
    expect(resolve(16, 14).openMask & (NORTH | SOUTH)).toBe(0);
  });
});
