import { createBlankMap, type MapDocument } from "../domain/map";

/**
 * Diagnostic field for the authored path-center material.
 *
 * A solid path rectangle has no topology edges (map bounds count as
 * connected), so this is a 10×10 repeat of the 48×48 center tile.
 */
export function createPathSeamStudy(): MapDocument {
  const map = createBlankMap(10, 10, "path");
  map.id = "path-center-seam";
  map.name = "Path Center Seam · 10×10";
  return map;
}
