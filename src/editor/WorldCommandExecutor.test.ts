import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import type { WorldCommand } from "../domain/commands";
import { createBlankMap } from "../domain/map";
import { prefabCatalog } from "../prefabs/catalog";
import { WorldCommandExecutor } from "./WorldCommandExecutor";

describe("WorldCommandExecutor", () => {
  it("executes semantic commands without visual asset knowledge", () => {
    const map = createBlankMap(12, 12, "grass");
    const executor = new WorldCommandExecutor(worldCatalog, prefabCatalog);

    const commands: WorldCommand[] = [
      {
        type: "paint-terrain-rect",
        terrainId: "water",
        from: { x: 2, y: 2 },
        to: { x: 4, y: 4 },
      },
      {
        type: "place-network-path",
        catalogId: "bridge",
        points: [
          { x: 2, y: 3 },
          { x: 4, y: 3 },
        ],
        overlapPolicy: "reject",
      },
      {
        type: "place-actor",
        catalogId: "hero",
        coord: { x: 1, y: 3 },
        facing: "east",
      },
    ];

    const result = executor.executeAtomic(map, commands);

    expect(result.ok).toBe(true);
    expect(map.tiles[3 * map.width + 3]?.terrainId).toBe("water");
    expect(map.props.filter((prop) => prop.catalogId === "bridge")).toHaveLength(3);
    expect(map.actors[0]?.facing).toBe("east");
  });

  it("rolls back an atomic batch when any command fails", () => {
    const map = createBlankMap(10, 10, "grass");
    map.props.push({ id: "rock", catalogId: "rock", x: 5, y: 5 });
    const before = structuredClone(map);
    const executor = new WorldCommandExecutor(worldCatalog, prefabCatalog);

    const result = executor.executeAtomic(map, [
      {
        type: "paint-terrain-rect",
        terrainId: "path",
        from: { x: 0, y: 0 },
        to: { x: 4, y: 0 },
      },
      {
        type: "place-prop",
        catalogId: "house-blue",
        coord: { x: 4, y: 4 },
        overlapPolicy: "reject",
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.failedAt).toBe(1);
    expect(map).toEqual(before);
  });

  it("can place a semantic prefab through the command boundary", () => {
    const map = createBlankMap(20, 20, "grass");
    const executor = new WorldCommandExecutor(worldCatalog, prefabCatalog);

    const result = executor.execute(map, {
      type: "place-prefab",
      prefabId: "castle-guard-room",
      anchor: { x: 2, y: 2 },
    });

    expect(result.ok).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "castle-wall")).toBe(true);
    expect(map.actors.filter((actor) => actor.catalogId === "guard")).toHaveLength(2);
  });

  it("keeps reject-overlap network commands atomic", () => {
    const map = createBlankMap(8, 8, "grass");
    map.props.push({ id: "rock", catalogId: "rock", x: 4, y: 2 });
    const executor = new WorldCommandExecutor(worldCatalog, prefabCatalog);

    const result = executor.execute(map, {
      type: "place-network-path",
      catalogId: "fence",
      points: [
        { x: 1, y: 2 },
        { x: 6, y: 2 },
      ],
      overlapPolicy: "reject",
    });

    expect(result.ok).toBe(false);
    expect(result.changed).toBe(false);
    expect(map.props.filter((prop) => prop.catalogId === "fence")).toHaveLength(0);
  });
});
