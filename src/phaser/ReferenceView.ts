/** Editor-only comparison settings; never serialized into a map. */
export interface ReferenceView {
  mapAlpha: number;
  terrainOnly: boolean;
  colorCells: boolean;
}

export const terrainComparisonColors: Readonly<Record<string, number>> = {
  grass: 0x75b843,
  "grass-plain": 0x6f9f59,
  "grass-dark": 0x285d35,
  path: 0xefbd65,
  "road-layered": 0xd19a58,
  cobble: 0xb7b9c5,
  "stone-floor": 0x757c99,
  "wood-floor": 0xab6740,
  water: 0x35b4eb,
  "deep-water": 0x2455b9,
  soil: 0x69452c,
};
