import { createBlankMap, type MapDocument } from "../domain/map";

/**
 * Disposable proof field for the first grass/road boundary pass. It is
 * intentionally separate from the imported working map so visual QA cannot
 * replace or reload user-painted cells.
 */
export function createGrassTransitionStudy(): MapDocument {
  const map = createBlankMap(14, 10, "grass");
  map.id = "grass-road-transition-proof";
  map.name = "Grass / Road Transition Proof";

  const set = (x: number, y: number, terrainId?: string): void => {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
    map.tiles[y * map.width + x] = terrainId ? { terrainId } : {};
  };

  // Three-cell straight, elbow, and concave dirt-road contacts.
  set(1, 1, "path");
  set(2, 1, "path");
  set(3, 1, "path");

  set(6, 1, "path");
  set(7, 1, "path");
  set(8, 1, "path");
  set(8, 2, "path");
  set(8, 3, "path");

  set(2, 5, "path");
  set(3, 5, "path");
  set(2, 6, "path");
  set(2, 7, "path");
  set(3, 7, "path");

  // One short cobble contact and one intentionally empty road neighbor.
  set(9, 6, "cobble");
  set(10, 6, "cobble");
  set(11, 6);
  set(12, 5);

  // Keep a small empty diagonal and an empty map-edge cell in the proof.
  set(0, 0);
  set(4, 0);

  return map;
}
