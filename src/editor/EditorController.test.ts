import { describe, expect, it } from "vitest";
import { worldCatalog } from "../domain/catalog";
import { createBlankMap } from "../domain/map";
import { prefabCatalog } from "../prefabs/catalog";
import { EditorController } from "./EditorController";

describe("EditorController semantic gestures", () => {
  it("paints filled terrain rectangles without storing visual variants", () => {
    const editor = new EditorController(createBlankMap(6, 6, "grass"), worldCatalog);
    editor.select("terrain", "water");
    editor.setStrokeMode("rect");

    editor.beginStroke();
    editor.applyRect({ x: 1, y: 1 }, { x: 3, y: 2 });
    editor.endStroke();

    const map = editor.state.document;
    for (let y = 1; y <= 2; y += 1) {
      for (let x = 1; x <= 3; x += 1) {
        expect(map.tiles[y * map.width + x]?.terrainId).toBe("water");
      }
    }
  });

  it("draws connected prop lines through the same semantic placement service", () => {
    const editor = new EditorController(createBlankMap(7, 7, "grass"), worldCatalog);
    editor.select("prop", "castle-wall");
    editor.setStrokeMode("line");

    editor.beginStroke();
    editor.applyLine({ x: 1, y: 3 }, { x: 5, y: 3 });
    editor.endStroke();

    expect(editor.state.document.props).toHaveLength(5);
    expect(
      editor.state.document.props.every((prop) => prop.catalogId === "castle-wall"),
    ).toBe(true);
  });

  it("forces unsupported shape tools back to freehand for actors", () => {
    const editor = new EditorController(createBlankMap(5, 5, "grass"), worldCatalog);
    editor.select("terrain", "path");
    editor.setStrokeMode("rect");
    expect(editor.state.selection.strokeMode).toBe("rect");

    editor.select("actor", "guard");
    expect(editor.state.selection.strokeMode).toBe("brush");
  });

  it("undoes one whole semantic line as a single stroke checkpoint", () => {
    const editor = new EditorController(createBlankMap(7, 7, "grass"), worldCatalog);
    editor.select("prop", "fence");
    editor.setStrokeMode("line");

    editor.beginStroke();
    editor.applyLine({ x: 1, y: 1 }, { x: 5, y: 1 });
    editor.endStroke();
    expect(editor.state.document.props).toHaveLength(5);

    editor.undo();
    expect(editor.state.document.props).toHaveLength(0);
  });

  it("places and undoes a prefab as one semantic editor action", () => {
    const editor = new EditorController(
      createBlankMap(20, 20, "grass"),
      worldCatalog,
      prefabCatalog,
    );
    editor.selectPrefab("village-cottage-yard");

    editor.beginStroke();
    editor.applyAt({ x: 2, y: 2 });
    editor.endStroke();

    expect(editor.state.selectedPrefabId).toBe("village-cottage-yard");
    expect(editor.state.document.props.some((prop) => prop.catalogId === "house-blue")).toBe(true);

    editor.undo();
    expect(editor.state.document.props).toHaveLength(0);
    expect(editor.state.document.actors).toHaveLength(0);
  });

  it("returns to normal palette mode when a catalog layer is selected", () => {
    const editor = new EditorController(
      createBlankMap(20, 20, "grass"),
      worldCatalog,
      prefabCatalog,
    );

    editor.selectPrefab("castle-guard-room");
    expect(editor.state.selectedPrefabId).toBe("castle-guard-room");

    editor.select("terrain", "water");
    expect(editor.state.selectedPrefabId).toBeNull();
  });
  it("selects and moves a multi-tile prop with undo", () => {
    const map = createBlankMap(12, 12, "grass");
    map.props.push({ id: "house", catalogId: "house-blue", x: 1, y: 1 });
    const editor = new EditorController(map, worldCatalog);

    editor.setTool("select");
    editor.selectEntityAt({ x: 2, y: 2 });
    expect(editor.state.entitySelection).toEqual({ kind: "prop", id: "house" });

    editor.beginStroke();
    editor.moveSelectedEntity({ x: 6, y: 6 });
    editor.endStroke();

    const moved = editor.state.document.props.find((prop) => prop.id === "house");
    expect(moved?.x).toBe(6);
    expect(moved?.y).toBe(6);

    editor.undo();
    const restored = editor.state.document.props.find((prop) => prop.id === "house");
    expect(restored?.x).toBe(1);
    expect(restored?.y).toBe(1);
  });

  it("rotates selected actor facing semantically", () => {
    const map = createBlankMap(5, 5, "grass");
    map.actors.push({
      id: "guard-1",
      catalogId: "guard",
      x: 2,
      y: 2,
      facing: "south",
    });
    const editor = new EditorController(map, worldCatalog);

    editor.setTool("select");
    editor.selectEntityAt({ x: 2, y: 2 });
    editor.beginStroke();
    editor.rotateSelectedEntity(true);
    editor.endStroke();

    expect(editor.state.document.actors[0]?.facing).toBe("west");
  });

  it("builds a route preview from derived navigation", () => {
    const map = createBlankMap(5, 3, "grass");
    for (let y = 0; y < 3; y += 1) {
      map.tiles[y * map.width + 2] = { terrainId: "water" };
    }
    map.props.push({ id: "bridge", catalogId: "bridge", x: 2, y: 1 });

    const editor = new EditorController(map, worldCatalog);
    editor.setTool("route");
    editor.routeClick({ x: 0, y: 1 });
    editor.routeClick({ x: 4, y: 1 });

    expect(editor.state.routePreview?.found).toBe(true);
    expect(editor.state.routePreview?.path).toContainEqual({ x: 2, y: 1 });
  });

  it("validates the map and clears stale diagnostics after an edit", () => {
    const map = createBlankMap(5, 5, "grass");
    map.tiles[2 * map.width + 2] = { terrainId: "water" };
    map.actors.push({
      id: "hero",
      catalogId: "hero",
      x: 2,
      y: 2,
      facing: "south",
    });

    const editor = new EditorController(map, worldCatalog);
    expect(
      editor.validateMap().some((issue) => issue.code === "actor-on-blocked-cell"),
    ).toBe(true);
    expect(editor.state.validationIssues.length).toBeGreaterThan(0);

    editor.select("terrain", "grass");
    editor.beginStroke();
    editor.applyAt({ x: 2, y: 2 });
    editor.endStroke();

    expect(editor.state.validationIssues).toEqual([]);
    expect(editor.validateMap()).toEqual([]);
  });

});
