import { createBlankMap, type MapDocument } from "../domain/map";

/**
 * 1:1 meadow-grass tile study.
 *
 * Small on purpose: the camera can render logical 48px tiles at full size so
 * edge pixels, corners and texture density are easy to judge on a screenshot.
 * The layout borrows the target's bottom-right language (castle road + warm
 * side paths + terrace cut-outs) without pretending to be a finished scene.
 */
export function createGrassStudy(): MapDocument {
  const map = createBlankMap(12, 8, "grass");
  map.id = "grass-tile-study";
  map.name = "Grass Tile Study · 1:1";

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

  // Castle approach road.
  rect(5, 0, 2, 8, "cobble");

  // Warm dirt path entering from both sides.
  rect(0, 3, 5, 1, "path");
  rect(7, 3, 5, 1, "path");

  // Top-left rectangular cut-out: straight edges + four outer corners.
  rect(1, 1, 2, 2, "soil");

  // Top-right diagonal bite: concave/inner corner mapping.
  set(9, 1, "soil");

  // Bottom-left terrace cut-out.
  rect(1, 5, 3, 3, "soil");

  // Bottom-right 3×3 substrate pocket with one isolated grass tile.
  rect(8, 5, 3, 3, "soil");
  set(9, 6, "grass");

  return map;
}
