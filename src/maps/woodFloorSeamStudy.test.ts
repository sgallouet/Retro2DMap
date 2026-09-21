import { describe, expect, it } from "vitest";
import { createWoodFloorSeamStudy } from "./woodFloorSeamStudy";

describe("Wood floor center seam study", () => {
  it("repeats a 10x10 interior wood-floor field with no other terrain", () => {
    const map = createWoodFloorSeamStudy();

    expect(map.width).toBe(10);
    expect(map.height).toBe(10);
    expect(map.tiles).toHaveLength(100);
    expect(map.tiles.every((tile) => tile.terrainId === "wood-floor")).toBe(true);
    expect(map.props).toEqual([]);
    expect(map.actors).toEqual([]);
  });
});
