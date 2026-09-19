import { createBlankMap, type MapDocument } from "../domain/map";

/**
 * Diagnostic field for the authored grass-center material.
 *
 * A solid grass rectangle has no topology edges (map bounds count as
 * connected), so this is a 10×10 repeat of the 48×48 center tile.
 */
export function createGrassSeamStudy(): MapDocument {
  const map = createBlankMap(10, 10, "grass");
  map.id = "grass-center-seam";
  map.name = "Grass Center Seam · 10×10";
  return map;
}
