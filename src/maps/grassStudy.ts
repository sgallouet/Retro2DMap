import { createBlankMap, type MapDocument } from "../domain/map";

/**
 * Focused terrain-mapping study based on the target screenshot's bottom-right
 * composition. It deliberately removes trees, cliffs, water, buildings and
 * characters so we can judge one thing only: does a square meadow-grass tile
 * map correctly around roads, cut-outs, outer corners and inner corners?
 */
export function createGrassStudy(): MapDocument {
  const map = createBlankMap(22, 16, "soil");
  map.id = "grass-tile-study";
  map.name = "Grass Tile Study · Bottom Right";

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
      for (let xx = x; xx < x + width; xx += 1) {
        set(xx, yy, terrainId);
      }
    }
  };

  // Two upper grass shelves separated by the castle approach road.
  rect(0, 0, 9, 10, "grass");
  rect(12, 0, 10, 10, "grass");

  // Lower terraces leave exposed outer edges, similar to the target's steps
  // down into the lower forest/mountain area.
  rect(0, 11, 7, 5, "grass");
  rect(13, 11, 9, 5, "grass");

  // Main vertical castle road.
  rect(9, 0, 3, 16, "cobble");

  // Warm horizontal village/field paths entering from both sides.
  rect(0, 7, 9, 1, "path");
  rect(12, 7, 10, 1, "path");

  // Small stair/terrace clearances represented only as substrate for now.
  // These produce controlled outer corners without introducing cliff art.
  rect(4, 10, 3, 2, "soil");
  rect(15, 9, 3, 3, "soil");

  // A one-cell diagonal bite creates all four concave/inner-corner cases
  // around it. This is intentionally diagnostic and easy to inspect.
  set(18, 3, "soil");

  // A tiny one-cell grass island verifies the fully exposed tile mapping.
  set(20, 13, "grass");

  return map;
}
