import { describe, expect, it } from "vitest";
import { worldCatalog } from "./catalog";
import { createBlankMap } from "./map";
import { NavigationGridBuilder } from "./navigation";

describe("NavigationGridBuilder", () => {
  it("blocks the complete footprint of blocking multi-tile props", () => {
    const map = createBlankMap(8, 8, "grass");
    map.props = [
      { id: "house", catalogId: "house-blue", x: 2, y: 2 },
    ];

    const grid = new NavigationGridBuilder(worldCatalog).build(map);

    expect(grid.at({ x: 2, y: 2 })?.walkable).toBe(false);
    expect(grid.at({ x: 4, y: 4 })?.walkable).toBe(false);
    expect(grid.at({ x: 5, y: 5 })?.walkable).toBe(true);
  });

  it("makes semantic bridge cells traversable over water", () => {
    const map = createBlankMap(5, 3, "grass");
    map.tiles[1 * map.width + 1] = { terrainId: "water" };
    map.tiles[1 * map.width + 2] = { terrainId: "water" };
    map.tiles[1 * map.width + 3] = { terrainId: "water" };
    map.props = [
      { id: "b1", catalogId: "bridge", x: 1, y: 1 },
      { id: "b2", catalogId: "bridge", x: 2, y: 1 },
      { id: "b3", catalogId: "bridge", x: 3, y: 1 },
    ];

    const grid = new NavigationGridBuilder(worldCatalog).build(map);

    expect(grid.at({ x: 0, y: 1 })?.walkable).toBe(true);
    expect(grid.at({ x: 1, y: 1 })?.walkable).toBe(true);
    expect(grid.at({ x: 2, y: 1 })?.walkable).toBe(true);
    expect(grid.at({ x: 3, y: 1 })?.walkable).toBe(true);
  });

  it("can optionally treat actors as dynamic blockers", () => {
    const map = createBlankMap(3, 3, "grass");
    map.actors = [
      {
        id: "guard",
        catalogId: "guard",
        x: 1,
        y: 1,
        facing: "south",
      },
    ];

    const builder = new NavigationGridBuilder(worldCatalog);
    expect(builder.build(map).at({ x: 1, y: 1 })?.walkable).toBe(true);
    expect(
      builder.build(map, { actorsBlockMovement: true }).at({ x: 1, y: 1 })?.walkable,
    ).toBe(false);
  });
  it("blocks the rotated footprint of oriented props", () => {
    const map = createBlankMap(7, 7, "grass");
    map.props = [
      {
        id: "table",
        catalogId: "table",
        x: 2,
        y: 1,
        rotation: 90,
      },
    ];

    const grid = new NavigationGridBuilder(worldCatalog).build(map);
    expect(grid.at({ x: 2, y: 1 })?.walkable).toBe(false);
    expect(grid.at({ x: 2, y: 3 })?.walkable).toBe(false);
    expect(grid.at({ x: 4, y: 1 })?.walkable).toBe(true);
  });

});
