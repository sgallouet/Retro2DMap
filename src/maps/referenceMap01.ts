import sourceMap from "./reference-map-01-river-castle.json";
import { cloneMap, validateMapDocument, type MapDocument } from "../domain/map";

const importedReferenceMap = validateMapDocument(sourceMap);

/**
 * Default working map: keep imported roads/cobble, clear the grass substrate,
 * and start with both object layers empty so the map can be redrawn in the
 * editor over the visible target.
 */
export function createReferenceMap01RoadsOnly(): MapDocument {
  const map = cloneMap(importedReferenceMap);
  map.tiles.forEach((tile) => {
    if (tile.terrainId === "grass") delete tile.terrainId;
  });
  map.props = [];
  map.actors = [];
  return map;
}
