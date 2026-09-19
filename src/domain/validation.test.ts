import { describe, expect, it } from "vitest";
import { worldCatalog } from "./catalog";
import { createBlankMap } from "./map";
import { MapValidator } from "./validation";

describe("MapValidator", () => {
  it("accepts a simple clean semantic map", () => {
    const map = createBlankMap(5, 5, "grass");
    expect(new MapValidator(worldCatalog).validate(map)).toEqual([]);
  });

  it("finds overlapping multi-tile props", () => {
    const map = createBlankMap(10, 10, "grass");
    map.props = [
      { id: "house", catalogId: "house-blue", x: 2, y: 2 },
      { id: "rock", catalogId: "rock", x: 3, y: 3 },
    ];

    const issues = new MapValidator(worldCatalog).validate(map);
    expect(issues.some((issue) => issue.code === "prop-overlap")).toBe(true);
  });

  it("finds actors standing on blocked semantic cells", () => {
    const map = createBlankMap(5, 5, "grass");
    map.tiles[2 * map.width + 2] = { terrainId: "water" };
    map.actors.push({
      id: "hero",
      catalogId: "hero",
      x: 2,
      y: 2,
      facing: "south",
    });

    const issues = new MapValidator(worldCatalog).validate(map);
    expect(
      issues.some((issue) => issue.code === "actor-on-blocked-cell"),
    ).toBe(true);
  });

  it("finds out-of-bounds multi-tile props", () => {
    const map = createBlankMap(5, 5, "grass");
    map.props.push({
      id: "house",
      catalogId: "house-blue",
      x: 4,
      y: 4,
    });

    const issues = new MapValidator(worldCatalog).validate(map);
    expect(
      issues.some((issue) => issue.code === "prop-out-of-bounds"),
    ).toBe(true);
  });
});
