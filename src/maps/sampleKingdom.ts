import { worldCatalog } from "../domain/catalog";
import { rotatedFootprint } from "../domain/geometry";
import {
  createBlankMap,
  type ActorInstance,
  type MapDocument,
  type PropInstance,
} from "../domain/map";

const WIDTH = 40;
const HEIGHT = 30;

/**
 * First visual target map.
 *
 * This deliberately follows the composition of the supplied reference:
 * village + farms on the left, a winding river/waterfall through the middle,
 * and a large cutaway royal castle on the right with throne hall, rooms,
 * courtyard, gate, moat, dock and boat.
 *
 * It still uses semantic IDs only. The goal is to evaluate whether the current
 * world-building system can reproduce the *structure and readability* of the
 * target before authored sprite art replaces procedural textures.
 */
export function createSampleKingdom(): MapDocument {
  const map = createBlankMap(WIDTH, HEIGHT, "grass");
  map.id = "reference-map-01";
  map.name = "Reference Map 01 · River Castle";

  const setTerrain = (x: number, y: number, terrainId: string): void => {
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
        setTerrain(xx, yy, terrainId);
      }
    }
  };

  const terrainLine = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    terrainId: string,
  ): void => {
    const dx = Math.sign(toX - fromX);
    const dy = Math.sign(toY - fromY);
    let x = fromX;
    let y = fromY;
    setTerrain(x, y, terrainId);

    while (x !== toX || y !== toY) {
      if (x !== toX) x += dx;
      if (y !== toY) y += dy;
      setTerrain(x, y, terrainId);
    }
  };

  const prop = (
    catalogId: string,
    x: number,
    y: number,
    rotation?: PropInstance["rotation"],
  ): void => {
    const entry: PropInstance = {
      id: `p-${map.props.length}`,
      catalogId,
      x,
      y,
      ...(rotation === undefined ? {} : { rotation }),
    };
    map.props.push(entry);
  };

  const tryProp = (
    catalogId: string,
    x: number,
    y: number,
  ): boolean => {
    const definition = worldCatalog.get(catalogId);
    if (!definition || definition.layer !== "prop") return false;

    const footprint = rotatedFootprint(definition.footprint, 0);
    if (
      x < 0 ||
      y < 0 ||
      x + footprint.width > map.width ||
      y + footprint.height > map.height
    ) {
      return false;
    }

    const overlapsProp = map.props.some((candidate) => {
      const candidateDefinition = worldCatalog.get(candidate.catalogId);
      if (!candidateDefinition || candidateDefinition.layer !== "prop") return false;
      const candidateFootprint = rotatedFootprint(
        candidateDefinition.footprint,
        candidateDefinition.rotatable ? candidate.rotation : 0,
      );

      return (
        x < candidate.x + candidateFootprint.width &&
        x + footprint.width > candidate.x &&
        y < candidate.y + candidateFootprint.height &&
        y + footprint.height > candidate.y
      );
    });

    if (overlapsProp) return false;

    const overlapsActor = map.actors.some(
      (candidate) =>
        candidate.x >= x &&
        candidate.x < x + footprint.width &&
        candidate.y >= y &&
        candidate.y < y + footprint.height,
    );
    if (overlapsActor) return false;

    prop(catalogId, x, y);
    return true;
  };

  const networkProp = (catalogId: string, x: number, y: number): void => {
    const duplicate = map.props.some(
      (candidate) =>
        candidate.catalogId === catalogId &&
        candidate.x === x &&
        candidate.y === y,
    );
    if (!duplicate) prop(catalogId, x, y);
  };

  const networkRect = (
    catalogId: string,
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): void => {
    for (let x = left; x <= right; x += 1) {
      networkProp(catalogId, x, top);
      networkProp(catalogId, x, bottom);
    }
    for (let y = top + 1; y < bottom; y += 1) {
      networkProp(catalogId, left, y);
      networkProp(catalogId, right, y);
    }
  };

  const actor = (
    catalogId: string,
    x: number,
    y: number,
    facing: ActorInstance["facing"] = "south",
  ): void => {
    map.actors.push({
      id: `a-${map.actors.length}`,
      catalogId,
      x,
      y,
      facing,
    });
  };

  // ---------------------------------------------------------------------------
  // LANDSCAPE: forested north-west ridge, waterfall and winding river.
  // ---------------------------------------------------------------------------

  rect(0, 0, 10, 4, "grass-dark");
  rect(0, 22, 15, 8, "grass-dark");
  rect(31, 23, 9, 7, "grass-dark");

  // River source/pool near the waterfall.
  rect(11, 0, 3, 5, "water");
  rect(12, 0, 1, 5, "deep-water");

  // Wider river below the falls, narrowing and bending toward the castle moat.
  for (let y = 5; y <= 18; y += 1) {
    const left =
      y <= 7 ? 10 :
      y <= 11 ? 11 :
      y <= 15 ? 12 :
      13;
    const width =
      y <= 7 ? 4 :
      y <= 11 ? 3 :
      y <= 15 ? 4 :
      3;

    for (let x = left; x < left + width; x += 1) {
      const center = x === left + Math.floor(width / 2);
      setTerrain(x, y, center ? "deep-water" : "water");
    }
  }

  // Castle moat / lower river, matching the reference's strong horizontal band.
  rect(14, 19, 26, 3, "water");
  rect(15, 20, 25, 2, "deep-water");

  // Waterfall and rocky banks.
  prop("waterfall", 11, 2);
  [
    [9, 1], [10, 2], [10, 3], [9, 4], [9, 5],
    [14, 3], [14, 4],
    [10, 7], [10, 8], [11, 13],
    [12, 16], [13, 17],
  ].forEach(([x, y]) => networkProp("cliff", x ?? 0, y ?? 0));

  // ---------------------------------------------------------------------------
  // VILLAGE: compact west-side settlement with roads and riverside crossing.
  // ---------------------------------------------------------------------------

  terrainLine(0, 10, 10, 10, "path");
  terrainLine(1, 18, 12, 18, "path");
  terrainLine(6, 7, 6, 11, "path");
  terrainLine(6, 11, 5, 13, "path");
  terrainLine(5, 13, 5, 17, "path");
  terrainLine(5, 17, 6, 19, "path");
  terrainLine(6, 19, 6, 23, "path");
  terrainLine(6, 23, 7, 25, "path");
  terrainLine(2, 23, 13, 23, "path");
  terrainLine(6, 10, 10, 12, "path");
  terrainLine(6, 18, 10, 16, "path");

  // Bridge crossing sits at the same visual height as the reference bridge.
  terrainLine(9, 12, 15, 12, "path");
  for (let x = 10; x <= 15; x += 1) {
    networkProp("bridge", x, 12);
  }

  // Inn / houses / shop stack down the left side.
  prop("house-blue", 0, 4);
  prop("inn-sign", 3, 6);
  prop("house-blue", 0, 11);
  prop("house-red", 0, 15);
  prop("shop-sign", 3, 17);
  prop("house-blue", 5, 2);

  // Fences, flowers and village greenery.
  [
    [4, 8], [7, 8], [8, 9], [3, 14], [7, 14], [8, 16],
    [2, 20], [5, 21], [9, 20], [10, 15],
  ].forEach(([x, y]) => prop("flowers", x ?? 0, y ?? 0));

  [
    [0, 0], [2, 0], [4, 0], [7, 0], [8, 2],
    [3, 8], [8, 6], [9, 9], [1, 20], [4, 20],
    [8, 19], [10, 21], [12, 22],
  ].forEach(([x, y], index) =>
    prop(index % 3 === 0 ? "tree-pine" : "tree-round", x ?? 0, y ?? 0),
  );

  // ---------------------------------------------------------------------------
  // CASTLE: large cutaway structure occupying the right half of the map.
  // ---------------------------------------------------------------------------

  // Castle interior slab.
  rect(16, 1, 22, 18, "stone-floor");

  // Four side rooms.
  rect(17, 2, 6, 5, "wood-floor"); // library
  rect(17, 7, 6, 4, "wood-floor"); // bedroom
  rect(32, 2, 5, 5, "wood-floor"); // dining
  rect(32, 7, 5, 4, "stone-floor"); // armory

  // Central throne hall and lower courtyard.
  rect(24, 2, 7, 10, "stone-floor");
  rect(21, 12, 14, 6, "cobble");

  // Symmetric garden beds are a major readability cue in the reference.
  rect(20, 13, 5, 4, "grass");
  rect(31, 13, 5, 4, "grass");
  rect(25, 12, 6, 6, "cobble");

  // Outer wall. Towers sit *outside* the perimeter so footprints do not overlap.
  for (let x = 16; x <= 37; x += 1) {
    networkProp("castle-wall", x, 1);

    const reservedForFrontArchitecture =
      x === 23 ||
      x === 24 ||
      x === 26 ||
      x === 27 ||
      x === 30 ||
      x === 31;
    if (!reservedForFrontArchitecture) networkProp("castle-wall", x, 18);
  }
  for (let y = 2; y <= 17; y += 1) {
    networkProp("castle-wall", 16, y);
    networkProp("castle-wall", 37, y);
  }

  prop("castle-tower", 14, 0);
  prop("castle-tower", 38, 0);
  prop("castle-tower", 14, 17);
  prop("castle-tower", 38, 17);

  // Two gate towers reproduce the strong fortified front silhouette.
  prop("castle-tower", 23, 17);
  prop("castle-tower", 30, 17);

  // Side-room partitions. Network helper prevents duplicate junction cells.
  for (let y = 2; y <= 10; y += 1) {
    if (y !== 5 && y !== 9) {
      networkProp("castle-wall", 23, y);
      networkProp("castle-wall", 31, y);
    }
  }
  for (let x = 17; x <= 22; x += 1) {
    if (x !== 20) networkProp("castle-wall", x, 7);
  }
  for (let x = 32; x <= 36; x += 1) {
    if (x !== 34) networkProp("castle-wall", x, 7);
  }

  // A strong horizontal architectural band above the courtyard.
  for (let x = 17; x <= 23; x += 1) {
    if (x !== 22) networkProp("castle-wall", x, 11);
  }
  for (let x = 31; x <= 36; x += 1) {
    if (x !== 32) networkProp("castle-wall", x, 11);
  }

  // Broad stair between the audience hall and courtyard.
  prop("stairs", 26, 11);
  prop("stairs", 28, 11);
  prop("banner", 22, 12);
  prop("banner", 33, 12);

  // Throne hall: red axial carpet, throne, banners, candelabra-like torches,
  // four columns, king, guards and the player character.
  prop("throne", 27, 2);
  prop("banner", 25, 2);
  prop("banner", 30, 2);
  for (let y = 4; y <= 10; y += 1) {
    prop("rug-red", 27, y);
    prop("rug-red", 28, y);
  }

  prop("pillar", 25, 5);
  prop("pillar", 30, 5);
  prop("pillar", 25, 8);
  prop("pillar", 30, 8);
  prop("torch", 24, 3);
  prop("torch", 30, 3);
  prop("torch", 24, 9);
  prop("torch", 29, 9);
  prop("candelabra", 26, 6);
  prop("candelabra", 29, 6);

  actor("king", 27, 4);
  actor("guard", 25, 4);
  actor("guard", 30, 4);
  actor("guard", 25, 10);
  actor("guard", 30, 10);
  actor("hero", 28, 10, "north");

  // Library.
  prop("bookshelf", 17, 2);
  prop("bookshelf", 20, 2);
  prop("table", 18, 4);
  prop("potted-flowers", 17, 5);
  actor("scholar", 21, 5, "west");

  // Bedroom.
  prop("bed-red", 18, 8);
  prop("bed-blue", 20, 8);
  prop("potted-flowers", 22, 8);
  prop("barrels", 22, 9);

  // Dining room.
  prop("painting", 33, 2);
  prop("table", 33, 4);
  prop("candelabra", 34, 5);
  prop("torch", 32, 2);
  prop("torch", 36, 2);
  actor("villager-f", 35, 3, "south");

  // Armory.
  prop("weapon-rack", 32, 8);
  prop("barrels", 36, 9);
  prop("torch", 35, 8);
  actor("guard", 34, 9, "west");

  // Courtyard: larger garden beds with trees/statues like the target.
  networkRect("garden-border", 20, 13, 24, 16);
  networkRect("garden-border", 31, 13, 35, 16);

  prop("fountain", 27, 14);

  // Left garden interior.
  prop("tree-pine", 21, 14);
  prop("statue", 23, 15);
  prop("flowers", 22, 14);
  prop("flowers", 22, 15);
  prop("flowers", 23, 14);

  // Right garden interior.
  prop("tree-pine", 34, 14);
  prop("statue", 32, 15);
  prop("flowers", 32, 14);
  prop("flowers", 33, 14);
  prop("flowers", 33, 15);

  // Gate, moat bridge and main stone road continuing toward the bottom edge.
  prop("castle-gate", 26, 17);
  for (let y = 19; y <= 21; y += 1) {
    networkProp("bridge", 26, y);
    networkProp("bridge", 27, y);
  }
  prop("stairs", 26, 22);

  for (let y = 22; y < HEIGHT; y += 1) {
    setTerrain(26, y, "cobble");
    setTerrain(27, y, "cobble");
    setTerrain(28, y, "cobble");
  }

  // Dock and boat at the south-east moat edge.
  prop("dock", 36, 20);
  prop("boat", 38, 20);

  // ---------------------------------------------------------------------------
  // SOUTH-WEST FARM + SHEEP PEN, mirroring the reference lower-left.
  // ---------------------------------------------------------------------------

  rect(1, 25, 4, 5, "soil");
  rect(5, 26, 2, 4, "soil");
  for (let y = 25; y < 30; y += 1) {
    for (let x = 1; x < 5; x += 1) prop("crops", x, y);
  }
  for (let y = 26; y < 30; y += 1) {
    for (let x = 5; x < 7; x += 1) prop("crops", x, y);
  }

  // Sheep pen.
  for (let x = 8; x <= 13; x += 1) {
    networkProp("fence", x, 24);
    networkProp("fence", x, 28);
  }
  for (let y = 25; y <= 27; y += 1) {
    networkProp("fence", 8, y);
    networkProp("fence", 13, y);
  }
  prop("sheep", 10, 25);
  prop("sheep", 12, 26);

  // Farm-side fence and remaining foliage.
  for (let x = 0; x <= 6; x += 1) {
    if (x !== 6) networkProp("fence", x, 24);
  }

  [
    [0, 22], [2, 22], [4, 22],
    [15, 23], [17, 24], [20, 24], [22, 26], [24, 28],
    [30, 24], [32, 25], [34, 24], [36, 25], [38, 24],
    [31, 27], [33, 28], [35, 27], [37, 28],
  ].forEach(([x, y], index) =>
    prop(index % 4 === 0 ? "tree-pine" : "tree-round", x ?? 0, y ?? 0),
  );

  // Life / scale references.
  actor("villager-f", 2, 9, "south");
  actor("villager-m", 8, 11, "west");
  actor("guard", 10, 17, "north");
  actor("villager-f", 4, 19, "north");
  actor("farmer", 3, 27, "east");
  actor("guard", 25, 20, "south");
  actor("guard", 29, 20, "south");

  // ---------------------------------------------------------------------------
  // DENSITY PASS: the reference is lush and intentionally crowded. These
  // candidates use semantic footprints and quietly skip occupied cells so the
  // composition gains foliage/flower density without introducing overlaps.
  // ---------------------------------------------------------------------------

  const treeCandidates: ReadonlyArray<readonly [number, number, "tree-round" | "tree-pine"]> = [
    // Village / north-west framing.
    [0, 1, "tree-round"], [2, 1, "tree-round"], [4, 1, "tree-pine"],
    [7, 1, "tree-round"], [8, 3, "tree-round"], [3, 7, "tree-round"],
    [8, 7, "tree-round"], [9, 10, "tree-pine"], [3, 12, "tree-round"],
    [8, 13, "tree-round"], [9, 15, "tree-round"], [2, 17, "tree-round"],
    [9, 18, "tree-pine"], [1, 20, "tree-round"], [4, 20, "tree-round"],
    [10, 20, "tree-round"], [12, 21, "tree-pine"],

    // South-west farm framing.
    [0, 24, "tree-round"], [2, 23, "tree-round"], [5, 23, "tree-pine"],
    [7, 25, "tree-round"], [7, 28, "tree-pine"], [14, 23, "tree-round"],

    // South / castle approach forest.
    [15, 23, "tree-round"], [17, 24, "tree-round"], [19, 23, "tree-round"],
    [21, 25, "tree-pine"], [23, 24, "tree-round"], [24, 27, "tree-round"],
    [29, 23, "tree-round"], [31, 24, "tree-pine"], [33, 23, "tree-round"],
    [35, 24, "tree-round"], [37, 23, "tree-round"], [39, 24, "tree-pine"],
    [30, 27, "tree-round"], [32, 26, "tree-round"], [34, 27, "tree-round"],
    [36, 26, "tree-round"], [38, 27, "tree-pine"],
  ];

  treeCandidates.forEach(([x, y, tree]) => {
    tryProp(tree, x, y);
  });

  const flowerCandidates: ReadonlyArray<readonly [number, number]> = [
    [3, 8], [4, 9], [8, 8], [9, 9], [2, 13], [4, 13],
    [8, 14], [10, 14], [3, 16], [5, 17], [9, 17], [1, 19],
    [3, 19], [8, 20], [11, 19], [2, 22], [5, 22], [10, 22],
    [13, 23], [16, 23], [18, 25], [20, 24], [22, 26], [24, 24],
    [29, 22], [31, 22], [33, 22], [35, 22], [37, 22],
  ];

  flowerCandidates.forEach(([x, y]) => {
    tryProp("flowers", x, y);
  });

  return map;
}
