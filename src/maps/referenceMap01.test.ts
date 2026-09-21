import { describe, expect, it } from "vitest";
import { createReferenceMap01RoadsOnly } from "./referenceMap01";

describe("Reference Map 01 roads-only default", () => {
  it("preserves the imported terrain while clearing props and actors", () => {
    const map = createReferenceMap01RoadsOnly();

    expect(map.id).toBe("reference-map-01");
    expect(map.width).toBe(40);
    expect(map.height).toBe(30);
    expect(map.tiles).toHaveLength(40 * 30);
    expect(map.tiles.filter((tile) => tile.terrainId === undefined)).toHaveLength(1088);
    expect(map.tiles.filter((tile) => tile.terrainId === "path")).toHaveLength(94);
    expect(map.tiles.filter((tile) => tile.terrainId === "cobble")).toHaveLength(18);
    expect(map.tiles.some((tile) => tile.terrainId === "grass")).toBe(false);
    expect(map.props).toEqual([]);
    expect(map.actors).toEqual([]);
  });
});
