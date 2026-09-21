import { createBlankMap, type MapDocument } from "../domain/map";

/**
 * Compact disposable terrain study for Gate B.
 *
 * The layout is semantic on purpose: the renderer must derive all edge,
 * corner and junction art from terrain neighbors rather than stored frame
 * names. It is small enough to inspect at native 48px cells.
 */
export function createTerrainStudy(): MapDocument {
  const map = createBlankMap(24, 18, "grass");
  map.id = "terrain-topology-study";
  map.name = "Terrain Topology Study · 1:1";

  const set = (x: number, y: number, terrainId: string): void => {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
    map.tiles[y * map.width + x] = { terrainId };
  };

  const rect = (
    x: number,
    y: number,
    width: number,
    height: number,
    terrainId: string,
  ): void => {
    for (let yy = y; yy < y + height; yy += 1) {
      for (let xx = x; xx < x + width; xx += 1) set(xx, yy, terrainId);
    }
  };

  // 4×4 grass interior patch inside soil: center repeat plus grass/soil edge.
  rect(0, 0, 7, 6, "soil");
  rect(1, 1, 4, 4, "grass");

  // Isolated cell, horizontal end-cap strip, and vertical straight strip.
  set(8, 1, "path");
  rect(10, 1, 5, 1, "path");
  rect(17, 1, 1, 5, "path");

  // Grass/soil and grass/cobble boundaries with distinct outer corners.
  rect(19, 0, 5, 6, "soil");
  rect(20, 1, 3, 3, "cobble");

  // L, T and cross path junctions.
  rect(1, 8, 4, 1, "path");
  rect(1, 7, 1, 2, "path");
  rect(6, 8, 5, 1, "path");
  rect(8, 7, 1, 2, "path");
  rect(12, 8, 5, 1, "path");
  rect(14, 7, 1, 3, "path");

  // Two-cell-wide corridor beside a soil pocket with a concave grass hole.
  rect(18, 7, 2, 5, "path");
  rect(21, 7, 3, 5, "soil");
  set(22, 9, "grass");

  // Material contacts: cobble, wood/stone, and land-facing water.
  rect(0, 12, 4, 3, "cobble");
  rect(5, 12, 4, 3, "wood-floor");
  rect(9, 12, 4, 3, "stone-floor");
  rect(15, 12, 4, 5, "water");
  rect(16, 13, 2, 3, "deep-water");

  return map;
}
