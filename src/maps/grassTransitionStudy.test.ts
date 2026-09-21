import { describe, expect, it } from "vitest";
import { createGrassTransitionStudy } from "./grassTransitionStudy";

describe("grass transition study", () => {
  it("keeps the proof disposable and includes grass, road, cobble, and empty cells", () => {
    const map = createGrassTransitionStudy();
    expect(map.id).toBe("grass-road-transition-proof");
    expect(map.tiles.some((tile) => tile.terrainId === "grass")).toBe(true);
    expect(map.tiles.some((tile) => tile.terrainId === "path")).toBe(true);
    expect(map.tiles.some((tile) => tile.terrainId === "cobble")).toBe(true);
    expect(map.tiles.some((tile) => !tile.terrainId)).toBe(true);
  });
});
