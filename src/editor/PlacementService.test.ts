import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import { createBlankMap } from "../domain/map";
import { EntityPlacementService } from "./PlacementService";

describe("EntityPlacementService", () => {
  it("respects multi-tile footprints at map boundaries", () => {
    const map = createBlankMap(6, 6, "grass");
    const placement = new EntityPlacementService(worldCatalog);

    expect(
      placement.placeProp(map, {
        catalogId: "house-blue",
        coord: { x: 4, y: 4 },
      }),
    ).toBe(false);

    expect(
      placement.placeProp(map, {
        catalogId: "house-blue",
        coord: { x: 3, y: 3 },
      }),
    ).toBe(true);
  });

  it("replaces overlapping props using one centralized rule", () => {
    const map = createBlankMap(8, 8, "grass");
    const placement = new EntityPlacementService(worldCatalog);

    expect(
      placement.placeProp(map, {
        catalogId: "house-blue",
        coord: { x: 2, y: 2 },
      }),
    ).toBe(true);

    expect(
      placement.placeProp(map, {
        catalogId: "rock",
        coord: { x: 3, y: 3 },
        overlapPolicy: "replace",
      }),
    ).toBe(true);

    expect(map.props).toHaveLength(1);
    expect(map.props[0]?.catalogId).toBe("rock");
  });

  it("can reject overlap for generator-safe placement", () => {
    const map = createBlankMap(8, 8, "grass");
    const placement = new EntityPlacementService(worldCatalog);

    placement.placeProp(map, {
      catalogId: "house-blue",
      coord: { x: 2, y: 2 },
    });

    expect(
      placement.placeProp(map, {
        catalogId: "rock",
        coord: { x: 3, y: 3 },
        overlapPolicy: "reject",
      }),
    ).toBe(false);

    expect(map.props[0]?.catalogId).toBe("house-blue");
  });

  it("paints a semantic connected-network path without storing visual variants", () => {
    const map = createBlankMap(8, 8, "grass");
    const placement = new EntityPlacementService(worldCatalog);

    expect(
      placement.paintNetworkPath(map, {
        catalogId: "fence",
        points: [
          { x: 1, y: 2 },
          { x: 5, y: 2 },
          { x: 5, y: 5 },
        ],
      }),
    ).toBe(true);

    expect(map.props).toHaveLength(8);
    expect(new Set(map.props.map((prop) => prop.catalogId))).toEqual(new Set(["fence"]));
  });
});
