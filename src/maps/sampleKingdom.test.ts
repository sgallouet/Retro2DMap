import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import { rotatedFootprint } from "../domain/geometry";
import { NavigationGridBuilder } from "../domain/navigation";
import { tileAt } from "../domain/map";
import { GridPathfinder } from "../domain/pathfinding";
import { MapValidator } from "../domain/validation";
import { createSampleKingdom } from "./sampleKingdom";

const reviewedTerrainMask = [
  "FFFFFDDFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  "FFFFFDDFFFFFCCCSSSSSSSSSSSSSSSSSSSSSSSCC",
  "FFFFFDDFFFFFCCCOOOOOOSSSSSSSSSSSOOOOOOCC",
  "FFFFFWWDDDDDWWCOOOOOOSSSSSSSSSSSOOOOOOCC",
  ".....WWDDDDDWWCOOOOOOSSSSSSSSSSSOOOOOOCC",
  "........WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC",
  "........WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC",
  "..P.....WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC",
  "..P.....WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC",
  "PPPPPPPPWDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC",
  "..P.....WDDDWCCOOOOOOSSSSSSSSSSSOOOOOOCC",
  "..P.....WDDDWCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  "..P.....WDDDWCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  "..P.....WDDWCCCCCCC.....CCCCCC.....CCCCC",
  "PPPPPPPPWDDWCCCCCCC.....CCCCCC.....CCCCC",
  "..P.....WDW.CCCWWCC.....CCCCCC.....CCCCC",
  "..P.....WDW.CCCWWCC.....CCCCCC.....CCCCC",
  "..P.....WDW.CCCWWCCCCCCCCCCCCCCCCCCCCCCC",
  "..P.....WDW.CCCWWCCCCCCCCCCCCCCCCCCCCCCC",
  "PPPPPPPPWDW...CWWCCCCCCCCCCCCCCCCCCCCCCC",
  "..P.....WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "..P.....WWDDDDDDDDDDDDDDDDDDDDDDDDDDDDDW",
  "FFPFFFFFWWDDDDDDDDDDDDDDDDDDDDDDDDDDDDDW",
  "PPPPPPPPPPPPPPPF.........PPP...FFFFFFFFF",
  "PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP",
  "FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF",
  "FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF",
  "FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF",
  "FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF",
  "FTTTTPTTFFFFFFFF.........PPP...FFFFFFFFF",
] as const;

const terrainBySymbol: Readonly<Record<string, string>> = {
  ".": "grass",
  F: "grass-dark",
  P: "path",
  C: "cobble",
  S: "stone-floor",
  O: "wood-floor",
  W: "water",
  D: "deep-water",
  T: "soil",
};

const isWater = (terrainId: string): boolean => terrainId === "water" || terrainId === "deep-water";

const terrainConnected = (
  map: ReturnType<typeof createSampleKingdom>,
  terrainId: string,
): boolean => {
  const cells = new Set<string>();
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (map.tiles[y * map.width + x]?.terrainId === terrainId) cells.add(`${x},${y}`);
    }
  }
  const first = cells.values().next().value as string | undefined;
  if (!first) return true;

  const queue = [first];
  const visited = new Set([first]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const [xText, yText] = current.split(",");
    if (xText === undefined || yText === undefined) continue;
    const x = Number(xText);
    const y = Number(yText);
    const neighbours: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of neighbours) {
      const next = `${x + dx},${y + dy}`;
      if (cells.has(next) && !visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited.size === cells.size;
};

describe("Reference Map 01", () => {
  it("matches the independently reviewed 40x30 terrain mask", () => {
    const map = createSampleKingdom();
    const mismatches: string[] = [];

    expect(reviewedTerrainMask).toHaveLength(30);
    reviewedTerrainMask.forEach((row, y) => {
      expect(row).toHaveLength(40);
      [...row].forEach((symbol, x) => {
        const expected = terrainBySymbol[symbol];
        const actual = map.tiles[y * map.width + x]?.terrainId;
        if (actual !== expected && mismatches.length < 20) {
          mismatches.push(`(${x},${y}) ${actual ?? "missing"} != ${expected ?? symbol}`);
        }
      });
    });

    expect(mismatches).toEqual([]);
    expect(map.tiles).toHaveLength(40 * 30);
    expect(map.tiles.every((tile) => tile.terrainId !== undefined && worldCatalog.get(tile.terrainId)?.layer === "terrain")).toBe(true);
  });

  it("keeps the reviewed river silhouette, room materials, and path connectivity", () => {
    const map = createSampleKingdom();
    const tile = (x: number, y: number): string => map.tiles[y * map.width + x]?.terrainId ?? "missing";

    expect(isWater(tile(5, 0))).toBe(true);
    expect(isWater(tile(13, 4))).toBe(true);
    expect(isWater(tile(8, 5))).toBe(true);
    expect(isWater(tile(12, 12))).toBe(true);
    expect(isWater(tile(15, 19))).toBe(true);
    expect(isWater(tile(39, 22))).toBe(true);
    expect(isWater(tile(4, 4))).toBe(false);
    expect(isWater(tile(7, 5))).toBe(false);
    expect(isWater(tile(14, 20))).toBe(true);

    expect(tile(15, 2)).toBe("wood-floor");
    expect(tile(21, 2)).toBe("stone-floor");
    expect(tile(32, 7)).toBe("wood-floor");
    expect(tile(19, 14)).toBe("grass");
    expect(tile(24, 14)).toBe("cobble");
    expect(tile(2, 9)).toBe("path");
    expect(tile(5, 27)).toBe("path");
    expect(tile(2, 25)).toBe("soil");
    expect(terrainConnected(map, "path")).toBe(true);
  });

  it("contains the landmark composition from the supplied target", () => {
    const map = createSampleKingdom();

    expect(map.width).toBe(40);
    expect(map.height).toBe(30);

    expect(map.props.some((prop) => prop.catalogId === "waterfall")).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "castle-gate")).toBe(true);
    expect(
      map.props.filter((prop) => prop.catalogId === "castle-tower").length,
    ).toBeGreaterThanOrEqual(6);
    expect(map.props.some((prop) => prop.catalogId === "fountain")).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "dock")).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "boat")).toBe(true);
    expect(map.props.filter((prop) => prop.catalogId === "sheep").length).toBeGreaterThanOrEqual(2);
    expect(map.actors.some((actor) => actor.catalogId === "king")).toBe(true);
  });

  it("has no semantic errors or placement warnings", () => {
    const issues = new MapValidator(worldCatalog).validate(createSampleKingdom());
    expect(issues).toEqual([]);
  });

  it("keeps the royal axis, crossings and actors on supporting cells", () => {
    const map = createSampleKingdom();
    const navigation = new NavigationGridBuilder(worldCatalog).build(map);
    const pathfinder = new GridPathfinder();

    const reachable = (from: { x: number; y: number }, to: { x: number; y: number }): void => {
      const result = pathfinder.findPath(navigation, from, to);
      expect(result.found, `No route from ${from.x},${from.y} to ${to.x},${to.y}`).toBe(true);
    };

    reachable({ x: 27, y: 29 }, { x: 27, y: 16 });
    reachable({ x: 27, y: 16 }, { x: 27, y: 10 });
    reachable({ x: 27, y: 16 }, { x: 25, y: 14 });
    reachable({ x: 27, y: 16 }, { x: 28, y: 14 });
    reachable({ x: 22, y: 5 }, { x: 27, y: 5 });
    reachable({ x: 22, y: 9 }, { x: 27, y: 9 });
    reachable({ x: 31, y: 5 }, { x: 27, y: 5 });
    reachable({ x: 31, y: 9 }, { x: 27, y: 9 });
    reachable({ x: 9, y: 12 }, { x: 14, y: 12 });
    reachable({ x: 2, y: 8 }, { x: 6, y: 8 });
    reachable({ x: 5, y: 27 }, { x: 10, y: 27 });

    const axisProps = ["castle-gate", "fountain", "throne"]
      .map((catalogId) => map.props.find((prop) => prop.catalogId === catalogId));
    expect(axisProps.every((prop) => prop?.x === 26)).toBe(true);
    expect(map.props.find((prop) => prop.catalogId === "castle-gate")?.x).toBe(26);
    expect(map.props.filter((prop) => prop.catalogId === "rug-red")).toHaveLength(14);

    const bridgeCells = map.props.filter((prop) => prop.catalogId === "bridge");
    expect(bridgeCells).toHaveLength(10);
    expect(bridgeCells.every((prop) => tileAt(map, prop)?.terrainId?.includes("water"))).toBe(true);

    const waterSupported = new Set(["waterfall", "bridge", "boat", "dock"]);
    for (const prop of map.props) {
      const definition = worldCatalog.get(prop.catalogId);
      if (!definition || definition.layer !== "prop" || waterSupported.has(prop.catalogId)) continue;
      const footprint = rotatedFootprint(definition.footprint, definition.rotatable ? prop.rotation : 0);
      for (let y = prop.y; y < prop.y + footprint.height; y += 1) {
        for (let x = prop.x; x < prop.x + footprint.width; x += 1) {
        expect(tileAt(map, { x, y })?.terrainId ?? "", `${prop.catalogId} at ${x},${y}`).not.toMatch(/water/);
        }
      }
    }

    for (const actor of map.actors) {
      expect(navigation.at(actor)?.walkable).toBe(true);
    }
  });
});
