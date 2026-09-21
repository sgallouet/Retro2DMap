import { createBlankMap, type MapDocument } from "../domain/map";

/**
 * Diagnostic field for the authored wood-floor center material.
 *
 * A solid wood rectangle has no topology edges (map bounds count as
 * connected), so this is a 10×10 repeat of the 48×48 center tile.
 */
export function createWoodFloorSeamStudy(): MapDocument {
  const map = createBlankMap(10, 10, "wood-floor");
  map.id = "wood-floor-center-seam";
  map.name = "Wood Floor Center Seam · 10×10";
  return map;
}
