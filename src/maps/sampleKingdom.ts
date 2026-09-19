import { createBlankMap, type MapDocument, type PropInstance, type ActorInstance } from "../domain/map";

const WIDTH = 38;
const HEIGHT = 26;

export function createSampleKingdom(): MapDocument {
  const map = createBlankMap(WIDTH, HEIGHT, "grass");
  map.id = "sample-kingdom";
  map.name = "River Crown";

  const setTerrain = (x: number, y: number, terrainId: string): void => {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
    map.tiles[y * map.width + x] = { terrainId };
  };

  const rect = (x: number, y: number, w: number, h: number, terrainId: string): void => {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) setTerrain(xx, yy, terrainId);
    }
  };

  const prop = (catalogId: string, x: number, y: number): void => {
    const entry: PropInstance = { id: `p-${map.props.length}`, catalogId, x, y };
    map.props.push(entry);
  };

  const actor = (
    catalogId: string,
    x: number,
    y: number,
    facing: ActorInstance["facing"] = "south",
  ): void => {
    map.actors.push({ id: `a-${map.actors.length}`, catalogId, x, y, facing });
  };

  // River spine with deliberate bends.
  for (let y = 0; y < HEIGHT; y += 1) {
    const bend = y < 6 ? 11 : y < 13 ? 12 : y < 19 ? 13 : 12;
    for (let x = bend; x <= bend + 2; x += 1) setTerrain(x, y, x === bend + 1 ? "deep-water" : "water");
  }
  rect(14, 17, 24, 3, "water");
  rect(16, 18, 22, 2, "deep-water");

  // Village paths.
  for (let x = 0; x < 14; x += 1) {
    setTerrain(x, 9, "path");
    setTerrain(x, 17, "path");
  }
  for (let y = 6; y < 25; y += 1) setTerrain(6, y, "path");
  for (let x = 1; x < 11; x += 1) setTerrain(x, 21, "path");
  rect(0, 22, 11, 4, "grass-dark");

  // River crossing.
  for (let x = 11; x <= 14; x += 1) {
    setTerrain(x, 9, "path");
    prop("bridge", x, 9);
  }

  // Castle body and courtyard.
  rect(17, 1, 20, 16, "stone-floor");
  rect(18, 2, 5, 4, "wood-floor");
  rect(31, 2, 5, 4, "wood-floor");
  rect(18, 7, 5, 4, "wood-floor");
  rect(31, 7, 5, 4, "stone-floor");
  rect(24, 2, 6, 9, "stone-floor");
  rect(23, 12, 9, 4, "cobble");
  rect(26, 4, 2, 7, "rug-red");

  // Main road into the castle gate.
  for (let y = 16; y < HEIGHT; y += 1) {
    setTerrain(27, y, "cobble");
    setTerrain(28, y, "cobble");
  }

  // Castle outer walls.
  for (let x = 17; x < 37; x += 1) {
    prop("castle-wall", x, 1);
    if (x < 27 || x > 28) prop("castle-wall", x, 16);
  }
  for (let y = 2; y < 16; y += 1) {
    prop("castle-wall", 17, y);
    prop("castle-wall", 36, y);
  }
  prop("castle-tower", 16, 0);
  prop("castle-tower", 35, 0);
  prop("castle-tower", 16, 14);
  prop("castle-tower", 34, 14);
  prop("castle-gate", 27, 15);
  prop("stairs", 27, 17);

  // Interior partition suggestions.
  for (let y = 2; y < 11; y += 1) {
    if (y !== 5 && y !== 9) {
      prop("castle-wall", 23, y);
      prop("castle-wall", 30, y);
    }
  }
  for (let x = 18; x <= 22; x += 1) prop("castle-wall", x, 6);
  for (let x = 31; x <= 35; x += 1) prop("castle-wall", x, 6);

  // Throne room.
  prop("throne", 27, 2);
  prop("banner", 25, 2);
  prop("banner", 29, 2);
  prop("torch", 25, 4);
  prop("torch", 29, 4);
  prop("torch", 25, 8);
  prop("torch", 29, 8);
  for (let y = 4; y <= 10; y += 1) {
    prop("rug-red", 26, y);
    prop("rug-red", 27, y);
  }
  actor("king", 27, 3);
  actor("guard", 25, 4);
  actor("guard", 29, 4);
  actor("guard", 25, 9);
  actor("guard", 29, 9);
  actor("hero", 27, 9, "north");

  // Library, bedroom, dining room, armory.
  prop("bookshelf", 18, 2);
  prop("bookshelf", 20, 2);
  prop("table", 19, 4);
  actor("scholar", 21, 4, "west");

  prop("bed-red", 18, 7);
  prop("bed-blue", 20, 7);
  prop("barrels", 22, 9);

  prop("table", 32, 3);
  prop("torch", 31, 2);
  prop("torch", 35, 2);
  actor("villager-f", 33, 4);

  prop("weapon-rack", 31, 8);
  prop("barrels", 34, 9);
  prop("torch", 35, 8);
  actor("guard", 34, 8, "west");

  // Courtyard.
  prop("fountain", 26, 12);
  prop("statue", 23, 13);
  prop("statue", 31, 13);
  prop("flowers", 24, 12);
  prop("flowers", 30, 12);
  prop("tree-pine", 33, 12);

  // Village structures.
  prop("house-blue", 1, 3);
  prop("inn-sign", 4, 6);
  prop("house-red", 1, 12);
  prop("shop-sign", 4, 15);
  prop("house-blue", 7, 1);
  prop("house-red", 7, 12);

  // Forest framing and riverside vegetation.
  [
    [0, 0], [2, 0], [4, 1], [9, 0], [10, 3], [1, 8], [3, 10], [9, 10],
    [0, 18], [2, 19], [4, 18], [8, 18], [10, 20], [1, 23], [3, 23], [8, 23],
    [10, 6], [9, 7], [10, 14], [8, 16], [14, 3], [14, 11], [14, 21],
    [20, 21], [23, 22], [32, 21], [35, 22],
  ].forEach(([x, y], index) => prop(index % 3 === 0 ? "tree-pine" : "tree-round", x ?? 0, y ?? 0));

  [[3, 7], [5, 7], [8, 8], [2, 16], [9, 16], [5, 20], [15, 12], [21, 21], [34, 21]]
    .forEach(([x, y]) => prop("flowers", x ?? 0, y ?? 0));

  // Cliffs hug selected river bends.
  [[10, 4], [10, 5], [11, 13], [12, 14], [14, 15], [14, 16]]
    .forEach(([x, y]) => prop("cliff", x ?? 0, y ?? 0));

  // Fences and farm.
  for (let x = 0; x <= 10; x += 1) {
    if (x !== 6) prop("fence", x, 22);
  }
  rect(1, 23, 4, 3, "soil");
  rect(7, 23, 3, 2, "soil");
  for (let y = 23; y < 26; y += 1) {
    for (let x = 1; x < 5; x += 1) prop("crops", x, y);
  }
  for (let y = 23; y < 25; y += 1) {
    for (let x = 7; x < 10; x += 1) prop("crops", x, y);
  }

  // Riverside life.
  prop("boat", 35, 18);
  prop("sheep", 8, 20);
  prop("sheep", 9, 20);
  actor("farmer", 3, 24, "east");
  actor("villager-f", 2, 8, "south");
  actor("villager-m", 8, 10, "west");
  actor("guard", 14, 15, "north");
  actor("villager-f", 4, 18, "north");

  return map;
}
