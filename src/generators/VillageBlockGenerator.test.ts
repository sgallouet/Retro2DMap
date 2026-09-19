import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import { createBlankMap } from "../domain/map";
import { MapValidator } from "../domain/validation";
import { WorldCommandExecutor } from "../editor/WorldCommandExecutor";
import { prefabCatalog } from "../prefabs/catalog";
import { VillageBlockGenerator } from "./VillageBlockGenerator";

describe("VillageBlockGenerator", () => {
  it("produces deterministic semantic command plans", () => {
    const generator = new VillageBlockGenerator();
    const request = {
      region: {
        origin: { x: 2, y: 3 },
        width: 20,
        height: 14,
      },
      seed: 42,
    };

    expect(generator.plan(request)).toEqual(generator.plan(request));
  });

  it("executes through the shared command boundary into a valid map", () => {
    const map = createBlankMap(24, 18, "grass");
    const generator = new VillageBlockGenerator();
    const plan = generator.plan({
      region: {
        origin: { x: 2, y: 2 },
        width: 20,
        height: 14,
      },
      seed: 7,
    });

    const result = new WorldCommandExecutor(
      worldCatalog,
      prefabCatalog,
    ).executeAtomic(map, plan.commands);

    expect(result.ok).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "house-blue")).toBe(true);
    expect(map.tiles.some((tile) => tile.terrainId === "path")).toBe(true);

    const errors = new MapValidator(worldCatalog)
      .validate(map)
      .filter((issue) => issue.severity === "error");
    expect(errors).toEqual([]);
  });

  it("rejects regions too small for its compound layout", () => {
    expect(() =>
      new VillageBlockGenerator().plan({
        region: {
          origin: { x: 0, y: 0 },
          width: 10,
          height: 8,
        },
        seed: 1,
      }),
    ).toThrow(/16×12/);
  });
});
