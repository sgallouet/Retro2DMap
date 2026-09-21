import { describe, expect, it } from "vitest";
import { createPathSeamStudy } from "./pathSeamStudy";

describe("Path center seam study", () => {
  it("repeats a 10x10 interior path field with no other terrain", () => {
    const map = createPathSeamStudy();

    expect(map.width).toBe(10);
    expect(map.height).toBe(10);
    expect(map.tiles).toHaveLength(100);
    expect(map.tiles.every((tile) => tile.terrainId === "path")).toBe(true);
    expect(map.props).toEqual([]);
    expect(map.actors).toEqual([]);
  });
});
