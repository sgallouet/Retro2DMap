import { describe, expect, it } from "vitest";
import { createGrassSeamStudy } from "./grassSeamStudy";

describe("Grass center seam study", () => {
  it("repeats a 10x10 interior grass field with no other terrain", () => {
    const map = createGrassSeamStudy();

    expect(map.width).toBe(10);
    expect(map.height).toBe(10);
    expect(map.tiles).toHaveLength(100);
    expect(map.tiles.every((tile) => tile.terrainId === "grass")).toBe(true);
    expect(map.props).toEqual([]);
    expect(map.actors).toEqual([]);
  });
});
