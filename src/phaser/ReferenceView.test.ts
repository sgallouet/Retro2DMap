import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import { terrainComparisonColors } from "./ReferenceView";

describe("terrain comparison colors", () => {
  it("covers every catalog terrain used by the editor legend", () => {
    for (const terrain of worldCatalog.terrains) {
      expect(terrainComparisonColors[terrain.id]).toBeDefined();
    }
  });
});
