import { createBlankMap, type MapDocument } from "../domain/map";

/**
 * Focused meadow-grass mapping study inspired by the target screenshot's
 * bottom-right section.
 *
 * This is intentionally NOT a miniature finished map. It is a diagnostic
 * terrain board for one material family only: meadow grass. Path/cobble/soil
 * exist merely to expose straight edges, outer corners, inner corners, notches
 * and an isolated grass tile.
 */
export function createGrassStudy(): MapDocument {
  const map = createBlankMap(18, 12, "grass");
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

  // Main castle approach: grass against a strong vertical cobble boundary.
  rect(8, 0, 3, 12, "cobble");

  // Warm horizontal paths, like the target's lower-right village roads.
  rect(0, 5, 8, 1, "path");
  rect(11, 5, 7, 1, "path");

  // Two terrace cut-outs create clean outer corners.
  rect(2, 8, 4, 4, "soil");
  rect(13, 8, 3, 4, "soil");

  // Concave diagonal bite: all cardinal neighbours around the relevant grass
  // corners remain grass, but the diagonal cell is different.
  set(15, 2, "soil");

  // A small rectangular notch tests two inner corners in one readable shape.
  rect(1, 1, 2, 2, "soil");

  // Isolated 1x1 grass tile in a neutral substrate pocket.
  rect(15, 9, 3, 3, "soil");
  set(16, 10, "grass");

  return map;
}
