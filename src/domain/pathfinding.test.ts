import { describe, expect, it } from "vitest";
import { worldCatalog } from "./catalog";
import { createBlankMap } from "./map";
import { NavigationGridBuilder } from "./navigation";
import { GridPathfinder } from "./pathfinding";

describe("GridPathfinder", () => {
  it("routes through a semantic bridge over otherwise blocked water", () => {
    const map = createBlankMap(5, 3, "grass");
    for (let y = 0; y < 3; y += 1) {
      map.tiles[y * map.width + 2] = { terrainId: "water" };
    }
    map.props.push({ id: "bridge", catalogId: "bridge", x: 2, y: 1 });

    const grid = new NavigationGridBuilder(worldCatalog).build(map);
    const result = new GridPathfinder().findPath(
      grid,
      { x: 0, y: 1 },
      { x: 4, y: 1 },
    );

    expect(result.found).toBe(true);
    expect(result.path).toContainEqual({ x: 2, y: 1 });
  });

  it("reports no route across an unbridged water barrier", () => {
    const map = createBlankMap(5, 3, "grass");
    for (let y = 0; y < 3; y += 1) {
      map.tiles[y * map.width + 2] = { terrainId: "water" };
    }

    const grid = new NavigationGridBuilder(worldCatalog).build(map);
    const result = new GridPathfinder().findPath(
      grid,
      { x: 0, y: 1 },
      { x: 4, y: 1 },
    );

    expect(result.found).toBe(false);
  });

  it("detours around blocking multi-tile props", () => {
    const map = createBlankMap(7, 7, "grass");
    map.props.push({ id: "house", catalogId: "house-blue", x: 2, y: 2 });

    const grid = new NavigationGridBuilder(worldCatalog).build(map);
    const result = new GridPathfinder().findPath(
      grid,
      { x: 0, y: 3 },
      { x: 6, y: 3 },
    );

    expect(result.found).toBe(true);
    expect(
      result.path.some(
        (coord) =>
          coord.x >= 2 &&
          coord.x <= 4 &&
          coord.y >= 2 &&
          coord.y <= 4,
      ),
    ).toBe(false);
  });
});
