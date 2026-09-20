import { describe, expect, it } from "vitest";
import {
  ISO_PADDING,
  ISO_TILE_HEIGHT,
  ISO_TILE_WIDTH,
  projectCellCenter,
  projectedBounds,
  worldToGrid,
} from "./projection";

const document = { width: 12, height: 8 };

describe("editor projection math", () => {
  it("round-trips top-down cell centers through pointer picking", () => {
    const center = projectCellCenter(document, { x: 5, y: 3 }, "top-down");
    expect(worldToGrid(document, center, "top-down")).toEqual({ x: 5, y: 3 });
  });

  it("round-trips isometric cell centers through pointer picking", () => {
    for (const coord of [
      { x: 0, y: 0 },
      { x: 5, y: 3 },
      { x: 11, y: 7 },
    ]) {
      const center = projectCellCenter(document, coord, "isometric");
      expect(worldToGrid(document, center, "isometric")).toEqual(coord);
    }
  });

  it("includes projection padding in isometric camera bounds", () => {
    expect(projectedBounds(document, "isometric")).toEqual({
      width: (document.width + document.height) * (ISO_TILE_WIDTH / 2) + ISO_PADDING * 2,
      height:
        (document.width + document.height) * (ISO_TILE_HEIGHT / 2) +
        ISO_PADDING * 2,
    });
  });
});
