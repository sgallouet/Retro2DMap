import { describe, expect, it } from "vitest";
import { PropTopologyResolver } from "../domain/autotile";
import { worldCatalog } from "../domain/catalog";
import { createBlankMap } from "../domain/map";
import { prefabCatalog } from "../prefabs/catalog";
import { PrefabPlacer } from "./PrefabPlacer";

describe("PrefabPlacer", () => {
  it("places a compound prefab as ordinary semantic map data", () => {
    const map = createBlankMap(20, 20, "grass");
    const prefab = prefabCatalog.get("village-cottage-yard");
    if (!prefab) throw new Error("fixture prefab missing");

    const result = new PrefabPlacer(worldCatalog).place(map, prefab, { x: 2, y: 3 });

    expect(result.placed).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "house-blue")).toBe(true);
    expect(map.props.some((prop) => prop.catalogId === "fence")).toBe(true);
    expect(map.actors.some((actor) => actor.catalogId === "villager-f")).toBe(true);

    // Prefab identity is intentionally not persisted into MapDocument.
    expect("prefabs" in map).toBe(false);
  });

  it("is atomic when the prefab is outside the map", () => {
    const map = createBlankMap(10, 10, "grass");
    const before = structuredClone(map);
    const prefab = prefabCatalog.get("castle-guard-room");
    if (!prefab) throw new Error("fixture prefab missing");

    const result = new PrefabPlacer(worldCatalog).place(map, prefab, { x: 5, y: 6 });

    expect(result.placed).toBe(false);
    expect(map).toEqual(before);
  });

  it("is atomic when reject-overlap placement collides with existing props", () => {
    const map = createBlankMap(20, 20, "grass");
    map.props.push({ id: "existing", catalogId: "rock", x: 4, y: 4 });
    const before = structuredClone(map);
    const prefab = prefabCatalog.get("village-cottage-yard");
    if (!prefab) throw new Error("fixture prefab missing");

    const result = new PrefabPlacer(worldCatalog).place(map, prefab, { x: 2, y: 3 });

    expect(result.placed).toBe(false);
    expect(map).toEqual(before);
  });

  it("creates connected wall topology from a room recipe", () => {
    const map = createBlankMap(20, 20, "grass");
    const prefab = prefabCatalog.get("castle-guard-room");
    if (!prefab) throw new Error("fixture prefab missing");

    const result = new PrefabPlacer(worldCatalog).place(map, prefab, { x: 2, y: 2 });
    expect(result.placed).toBe(true);

    const corner = map.props.find(
      (prop) => prop.catalogId === "castle-wall" && prop.x === 2 && prop.y === 2,
    );
    const definition = worldCatalog.get("castle-wall");
    if (!corner || !definition || definition.layer !== "prop") {
      throw new Error("wall corner missing");
    }

    const topology = new PropTopologyResolver(worldCatalog).resolve(
      map,
      corner,
      definition,
    );
    expect(topology?.role).toBe("corner");
  });
});
